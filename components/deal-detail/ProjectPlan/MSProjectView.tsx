'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Download, Upload, FileSpreadsheet, FileCode,
  ChevronDown, X, BookmarkPlus, Eye, EyeOff, CalendarDays,
  Plus, ArrowRightToLine, ArrowLeftToLine, Columns3, Trash2,
  ArrowUp, ArrowDown, Share2,
} from 'lucide-react'
import type { TaskWithRelations } from '@/hooks/useTasks'
import type { ImportTaskRow } from '@/lib/importProjectPlan'
import { parseXLSX, parseMSProjectXML } from '@/lib/importProjectPlan'
import { exportProjectPlanXLSX, exportProjectPlanXML } from '@/lib/exportProjectPlan'
import { TaskGrid, COLUMNS, DEFAULT_COL_WIDTHS } from './TaskGrid'
import { GanttPanel } from './GanttPanel'
import { TaskEditPanel } from './TaskEditPanel'
import {
  flattenTasks, computeAllSeqIds, buildTimeline,
} from '@/lib/projectPlanUtils'
import type { GanttZoom, Baseline, BaselineEntry } from '@/lib/projectPlanUtils'

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet(key: string) { try { return localStorage.getItem(key) } catch { return null } }
function lsSet(key: string, val: string) { try { localStorage.setItem(key, val) } catch { /* noop */ } }

function loadMap<V>(key: string, fallback: Map<string, V>) {
  try {
    const raw = lsGet(key); if (!raw) return new Map(fallback)
    const m   = new Map(fallback)
    for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, V>)) m.set(k, v)
    return m
  } catch { return new Map(fallback) }
}
function loadNumber(key: string, fallback: number) {
  const n = parseFloat(lsGet(key) ?? ''); return isNaN(n) ? fallback : n
}
function loadBaselines(dealId: string): Baseline[] {
  try { const r = lsGet(`imo-pp-bl-${dealId}`); return r ? (JSON.parse(r) as Baseline[]) : [] }
  catch { return [] }
}

// ─── Import modal ─────────────────────────────────────────────────────────────

function ImportModal({
  tasks, parseErr, onImport, onClose, importing, importErr,
}: {
  tasks: ImportTaskRow[]; parseErr: string | null
  onImport: () => void; onClose: () => void
  importing: boolean; importErr: string | null
}) {
  const preview = tasks.slice(0, 8)
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#1e3a5f]">Import Tasks</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 px-5 py-4">
          {parseErr ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{parseErr}</div>
          ) : (
            <>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                <strong>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</strong> found. Importing will <strong>replace all existing tasks</strong>.
              </div>
              {preview.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['WBS', 'Task Name', 'Workstream', 'Duration'].map(h => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-400">{row.wbs ?? '—'}</td>
                          <td className="max-w-xs truncate px-3 py-1.5 font-medium text-gray-800">
                            <span style={{ paddingLeft: `${(row.level - 1) * 12}px` }}>{row.title}</span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{row.workstreamName ?? <span className="italic text-gray-300">auto</span>}</td>
                          <td className="px-3 py-1.5 text-gray-500">{row.durationDays != null ? `${row.durationDays}d` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tasks.length > 8 && <p className="px-3 py-1.5 text-right text-xs text-gray-400">…and {tasks.length - 8} more</p>}
                </div>
              )}
            </>
          )}
          {importErr && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{importErr}</div>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button onClick={onClose} disabled={importing} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          {!parseErr && (
            <button onClick={onImport} disabled={importing || !tasks.length} className="rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {importing ? 'Importing…' : `Replace with ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── MSProjectView ────────────────────────────────────────────────────────────

interface Props {
  dealId:   string
  tasks:    TaskWithRelations[]
  dealName: string
}

export function MSProjectView({ dealId, tasks, dealName }: Props) {
  const qc = useQueryClient()

  // ─── Persisted prefs ──────────────────────────────────────────────────────
  const [colWidths,  setColWidths]  = useState(() => loadMap<number>(`imo-pp-cw-${dealId}`, DEFAULT_COL_WIDTHS))
  const [colVisible, setColVisible] = useState(() => loadMap<boolean>(`imo-pp-cv-${dealId}`, new Map()))
  const [splitPct,   setSplitPct]   = useState(() => loadNumber(`imo-pp-sp-${dealId}`, 42))
  const [zoom,       setZoom]       = useState<GanttZoom>(() => {
    const z = lsGet(`imo-pp-zm-${dealId}`) as GanttZoom | null
    return z && ['day', 'week', 'month', 'quarter'].includes(z) ? z : 'month'
  })
  const [baselines,   setBaselines]   = useState<Baseline[]>(() => loadBaselines(dealId))
  const [workingDays, setWorkingDays] = useState(() => lsGet(`imo-pp-wd-${dealId}`) === '1')
  const [showArrows,  setShowArrows]  = useState(() => lsGet(`imo-pp-ar-${dealId}`) !== '0')

  useEffect(() => { lsSet(`imo-pp-cw-${dealId}`, JSON.stringify(Object.fromEntries(colWidths))) }, [colWidths, dealId])
  useEffect(() => { lsSet(`imo-pp-cv-${dealId}`, JSON.stringify(Object.fromEntries(colVisible))) }, [colVisible, dealId])
  useEffect(() => { lsSet(`imo-pp-sp-${dealId}`, String(splitPct)) }, [splitPct, dealId])
  useEffect(() => { lsSet(`imo-pp-zm-${dealId}`, zoom) }, [zoom, dealId])
  useEffect(() => { lsSet(`imo-pp-bl-${dealId}`, JSON.stringify(baselines)) }, [baselines, dealId])
  useEffect(() => { lsSet(`imo-pp-wd-${dealId}`, workingDays ? '1' : '0') }, [workingDays, dealId])
  useEffect(() => { lsSet(`imo-pp-ar-${dealId}`, showArrows  ? '1' : '0') }, [showArrows,  dealId])

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [collapsed,        setCollapsed]        = useState<Set<string>>(new Set())
  const [collapseLevel,    setCollapseLevel]    = useState<number | null>(null)
  const [selectedTaskId,   setSelectedTaskId]   = useState<string | null>(null)
  const [editingTaskId,    setEditingTaskId]     = useState<string | null>(null)
  const [activeBaseSlot,   setActiveBaseSlot]   = useState<1 | 2 | 3 | null>(null)
  const [showBaselineMenu, setShowBaselineMenu] = useState(false)
  const [showExportMenu,   setShowExportMenu]   = useState(false)
  const [showColsMenu,     setShowColsMenu]     = useState(false)
  const [opBusy,           setOpBusy]           = useState(false)
  const [opError,          setOpError]          = useState<string | null>(null)

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed,    setParsed]    = useState<ImportTaskRow[] | null>(null)
  const [parseErr,  setParseErr]  = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)

  // ─── Split pane ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  function startDividerDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX, startPct = splitPct
    const onMove = (ev: MouseEvent) => {
      const w = containerRef.current?.offsetWidth ?? 1000
      setSplitPct(Math.min(72, Math.max(18, startPct + ((ev.clientX - startX) / w) * 100)))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Scroll sync ──────────────────────────────────────────────────────────
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const ganttScrollRef = useRef<HTMLDivElement>(null)
  const lastTop        = useRef(0)
  function onTableScroll(top: number) {
    if (Math.abs(top - lastTop.current) < 1) return
    lastTop.current = top
    if (ganttScrollRef.current) ganttScrollRef.current.scrollTop = top
  }
  function onGanttScroll(top: number) {
    if (Math.abs(top - lastTop.current) < 1) return
    lastTop.current = top
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = top
  }

  // ─── Derived data ─────────────────────────────────────────────────────────
  const allSeqIds = useMemo(() => computeAllSeqIds(tasks), [tasks])

  const effectiveCollapsed = useMemo(() => {
    if (collapseLevel === null) return collapsed
    const auto = new Set<string>()
    tasks.forEach(t => {
      if (t.level >= collapseLevel && t._count.children > 0) auto.add(t.id)
    })
    return auto
  }, [tasks, collapseLevel, collapsed])

  const flatTasks = useMemo(() => flattenTasks(tasks, effectiveCollapsed, allSeqIds), [tasks, effectiveCollapsed, allSeqIds])
  const timeline  = useMemo(() => buildTimeline(tasks, zoom), [tasks, zoom])
  const seqToRow  = useMemo(() => {
    const m = new Map<number, number>()
    flatTasks.forEach(ft => m.set(ft.seqId, ft.rowIndex))
    return m
  }, [flatTasks])

  // Dynamic level options derived from actual task data
  const maxLevel = useMemo(() => (tasks.length ? Math.max(...tasks.map(t => t.level)) : 1), [tasks])
  const levelOptions: (number | null)[] = useMemo(
    () => [null, ...Array.from({ length: maxLevel }, (_, i) => i + 1)],
    [maxLevel]
  )

  const activeBaseline = baselines.find(b => b.slot === activeBaseSlot) ?? null
  const editingTask    = editingTaskId ? tasks.find(t => t.id === editingTaskId) ?? null : null
  const selectedTask   = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) ?? null : null

  // ─── Column helpers ───────────────────────────────────────────────────────
  function setColWidth(key: string, width: number) {
    setColWidths(prev => { const m = new Map(prev); m.set(key, width); return m })
  }
  function toggleCol(key: string) {
    setColVisible(prev => {
      const cur = prev.get(key)
      const def = COLUMNS.find(c => c.key === key)!.defVisible
      const m   = new Map(prev); m.set(key, cur === undefined ? !def : !cur); return m
    })
  }

  function colIsVisible(key: string): boolean {
    const override = colVisible.get(key)
    if (override !== undefined) return override
    return COLUMNS.find(c => c.key === key)?.defVisible ?? false
  }

  // ─── Collapse toggle ──────────────────────────────────────────────────────
  function toggleCollapse(id: string) {
    if (collapseLevel !== null) setCollapseLevel(null)
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ─── Task select ──────────────────────────────────────────────────────────
  function handleSelectTask(id: string) {
    if (selectedTaskId === id) {
      setEditingTaskId(id)
    } else {
      setSelectedTaskId(id)
      setEditingTaskId(null)
    }
  }

  // ─── Recalc WBS then refresh ──────────────────────────────────────────────
  async function recalcAndRefresh() {
    try { await fetch(`/api/deals/${dealId}/tasks/recalc-wbs`, { method: 'POST' }) }
    catch { /* best-effort */ }
    await qc.invalidateQueries({ queryKey: ['tasks', dealId] })
  }

  // ─── PATCH helper ─────────────────────────────────────────────────────────
  async function patchTask(taskId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/deals/${dealId}/tasks?taskId=${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json() as { error?: string }
      throw new Error(j.error ?? 'Update failed')
    }
  }

  // ─── Add task below selected ──────────────────────────────────────────────
  async function addTaskBelow() {
    const workstreamId = selectedTask?.workstream?.id ?? tasks[0]?.workstream?.id
    if (!workstreamId) { setOpError('No workstream available'); return }
    setOpBusy(true); setOpError(null)
    try {
      // Shift all siblings at or after the insertion point to make room
      const insertSortOrder = (selectedTask?.sortOrder ?? 0) + 1
      const parentId = selectedTask?.parentId ?? null
      const siblingsToShift = tasks
        .filter(t => (t.parentId ?? null) === parentId && (t.sortOrder ?? 0) >= insertSortOrder)
        .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))  // high → low avoids transient conflicts
      for (const sib of siblingsToShift) {
        await patchTask(sib.id, { sortOrder: (sib.sortOrder ?? 0) + 1 })
      }

      const res = await fetch(`/api/deals/${dealId}/tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workstreamId,
          parentId,
          level:     selectedTask?.level ?? 1,
          title:     'New Task',
          status:    'NOT_STARTED',
          sortOrder: insertSortOrder,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? 'Create failed')
      }
      const json = await res.json() as { data: { id: string } }
      await recalcAndRefresh()
      setSelectedTaskId(json.data.id)
      setEditingTaskId(json.data.id)
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Add failed')
    } finally { setOpBusy(false) }
  }

  // ─── Indent (make child of the task directly above in flat view) ──────────
  async function indentTask() {
    if (!selectedTaskId || !selectedTask) return
    const ft = flatTasks.find(f => f.task.id === selectedTaskId)
    if (!ft || ft.rowIndex === 0) { setOpError('No task above to indent under'); return }

    const aboveFt = flatTasks[ft.rowIndex - 1]
    if (!aboveFt) return

    const newParentId = aboveFt.task.id
    const newLevel    = aboveFt.task.level + 1
    // Place as last child of the new parent
    const siblingCount = tasks.filter(t => t.parentId === newParentId).length

    setOpBusy(true); setOpError(null)
    try {
      await patchTask(selectedTaskId, {
        parentId:  newParentId,
        level:     newLevel,
        sortOrder: siblingCount,
      })
      // Also cascade-update level of all descendants of this task
      await updateDescendantLevels(selectedTaskId, newLevel)
      await recalcAndRefresh()
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Indent failed')
    } finally { setOpBusy(false) }
  }

  // ─── Outdent (promote to parent's sibling) ────────────────────────────────
  async function outdentTask() {
    if (!selectedTaskId || !selectedTask) return
    if (!selectedTask.parentId) { setOpError('Already at top level'); return }

    const parent = tasks.find(t => t.id === selectedTask.parentId)
    if (!parent) return

    const newParentId  = parent.parentId ?? null
    const newLevel     = Math.max(1, selectedTask.level - 1)
    const newSortOrder = (parent.sortOrder ?? 0) + 1

    setOpBusy(true); setOpError(null)
    try {
      await patchTask(selectedTaskId, {
        parentId:  newParentId,
        level:     newLevel,
        sortOrder: newSortOrder,
      })
      // Cascade-update level of all descendants
      await updateDescendantLevels(selectedTaskId, newLevel)
      await recalcAndRefresh()
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Outdent failed')
    } finally { setOpBusy(false) }
  }

  // Update levels of all descendants after an indent/outdent
  async function updateDescendantLevels(taskId: string, parentLevel: number) {
    const directChildren = tasks.filter(t => t.parentId === taskId)
    for (const child of directChildren) {
      const childNewLevel = parentLevel + 1
      if (child.level !== childNewLevel) {
        await patchTask(child.id, { level: childNewLevel })
      }
      await updateDescendantLevels(child.id, childNewLevel)
    }
  }

  // ─── Delete task (with cascade) ───────────────────────────────────────────
  async function deleteSelectedTask() {
    if (!selectedTaskId || !selectedTask) return

    const hasChildren = selectedTask._count.children > 0
    const msg = hasChildren
      ? `Delete "${selectedTask.title}" and all its subtasks? This cannot be undone.`
      : `Delete "${selectedTask.title}"? This cannot be undone.`
    if (!confirm(msg)) return

    setOpBusy(true); setOpError(null)
    try {
      const qs  = hasChildren ? `taskId=${selectedTaskId}&cascade=true` : `taskId=${selectedTaskId}`
      const res = await fetch(`/api/deals/${dealId}/tasks?${qs}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? 'Delete failed')
      }
      setEditingTaskId(null)
      setSelectedTaskId(null)
      await recalcAndRefresh()
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Delete failed')
    } finally { setOpBusy(false) }
  }

  // ─── Move task up / down within its sibling group ─────────────────────────
  async function moveTaskUp() {
    if (!selectedTaskId || !selectedTask) return
    const siblings = tasks
      .filter(t => (t.parentId ?? null) === (selectedTask.parentId ?? null))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const idx = siblings.findIndex(t => t.id === selectedTaskId)
    if (idx <= 0) { setOpError('Task is already first in its group'); return }
    const above = siblings[idx - 1]!
    setOpBusy(true); setOpError(null)
    try {
      const orderA = above.sortOrder ?? 0
      const orderB = selectedTask.sortOrder ?? 0
      await patchTask(selectedTaskId, { sortOrder: orderA })
      await patchTask(above.id, { sortOrder: orderB })
      await recalcAndRefresh()
    } catch (e) { setOpError(e instanceof Error ? e.message : 'Move failed') }
    finally { setOpBusy(false) }
  }

  async function moveTaskDown() {
    if (!selectedTaskId || !selectedTask) return
    const siblings = tasks
      .filter(t => (t.parentId ?? null) === (selectedTask.parentId ?? null))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const idx = siblings.findIndex(t => t.id === selectedTaskId)
    if (idx >= siblings.length - 1) { setOpError('Task is already last in its group'); return }
    const below = siblings[idx + 1]!
    setOpBusy(true); setOpError(null)
    try {
      const orderA = selectedTask.sortOrder ?? 0
      const orderB = below.sortOrder ?? 0
      await patchTask(selectedTaskId, { sortOrder: orderB })
      await patchTask(below.id, { sortOrder: orderA })
      await recalcAndRefresh()
    } catch (e) { setOpError(e instanceof Error ? e.message : 'Move failed') }
    finally { setOpBusy(false) }
  }

  // ─── Baseline ─────────────────────────────────────────────────────────────
  function saveBaseline(slot: 1 | 2 | 3) {
    const entries: BaselineEntry[] = tasks.map(t => ({
      taskId:       t.id,
      startDate:    t.startDate ? new Date(t.startDate as unknown as string).toISOString().split('T')[0]! : null,
      endDate:      t.endDate   ? new Date(t.endDate   as unknown as string).toISOString().split('T')[0]! : null,
      durationDays: t.durationDays ?? null,
      percentDone:  t.percentDone ?? 0,
    }))
    setBaselines(prev => [
      ...prev.filter(b => b.slot !== slot),
      { slot, name: `Baseline ${slot}`, savedAt: new Date().toISOString(), entries },
    ])
    setActiveBaseSlot(slot)
    setShowBaselineMenu(false)
  }

  // ─── Import ───────────────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''; setParseErr(null); setImportErr(null)
    try {
      const rows = file.name.toLowerCase().endsWith('.xml') ? await parseMSProjectXML(file) : await parseXLSX(file)
      if (!rows.length) { setParseErr('No tasks found.'); setParsed([]) } else { setParsed(rows) }
    } catch { setParseErr('Failed to parse file.'); setParsed([]) }
  }
  async function handleImport() {
    if (!parsed?.length) return
    setImporting(true); setImportErr(null)
    try {
      const res = await fetch(`/api/deals/${dealId}/tasks/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: parsed }),
      })
      const json = await res.json() as { data?: { created: number }; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')
      await recalcAndRefresh()
      setParsed(null); setParseErr(null)
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  // ─── Column list for ribbon ───────────────────────────────────────────────
  const ribbonColList = COLUMNS.filter(c => {
    if ((c.key === 'blStart' || c.key === 'blFinish') && baselines.length === 0) return false
    return true
  })

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Toolbar row 1 ───────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <h1 className="text-base font-bold text-[#1e3a5f]">Project Plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWorkingDays(d => !d)}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm ${workingDays ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {workingDays ? 'Working Days' : 'Calendar Days'}
          </button>

          {/* Baseline */}
          <div className="relative">
            <button onClick={() => setShowBaselineMenu(m => !m)} className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <BookmarkPlus className="h-3.5 w-3.5" />Baseline<ChevronDown className="h-3 w-3" />
            </button>
            {showBaselineMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBaselineMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Save Snapshot</p>
                  {([1, 2, 3] as const).map(slot => {
                    const bl = baselines.find(b => b.slot === slot)
                    return (
                      <div key={slot} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50">
                        <button className="flex-1 text-left text-xs text-gray-700 hover:text-blue-600" onClick={() => saveBaseline(slot)}>
                          Baseline {slot}{bl ? <span className="ml-1 text-[10px] text-gray-400">({new Date(bl.savedAt).toLocaleDateString()})</span> : null}
                        </button>
                        {bl && <button className="ml-2 text-[10px] text-red-400 hover:text-red-600" onClick={() => { setBaselines(p => p.filter(b => b.slot !== slot)); if (activeBaseSlot === slot) setActiveBaseSlot(null) }}>✕</button>}
                      </div>
                    )
                  })}
                  {baselines.length > 0 && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100" />
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Show Baseline</p>
                      {baselines.map(bl => (
                        <button key={bl.slot} onClick={() => { setActiveBaseSlot(activeBaseSlot === bl.slot ? null : bl.slot); setShowBaselineMenu(false) }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${activeBaseSlot === bl.slot ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                          {activeBaseSlot === bl.slot ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                          {bl.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Import */}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xml" className="hidden" onChange={handleFile} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Upload className="h-3.5 w-3.5" />Import
          </button>

          {/* Export */}
          <div className="relative">
            <button onClick={() => setShowExportMenu(m => !m)} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <Download className="h-3.5 w-3.5" />Export<ChevronDown className="h-3 w-3" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl">
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50" onClick={() => { exportProjectPlanXLSX(tasks, dealName); setShowExportMenu(false) }}>
                    <FileSpreadsheet className="h-4 w-4 text-green-600" /><div><p className="text-sm font-medium text-gray-800">XLSX</p><p className="text-xs text-gray-400">Excel / Google Sheets</p></div>
                  </button>
                  <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50" onClick={() => { exportProjectPlanXML(tasks, dealName); setShowExportMenu(false) }}>
                    <FileCode className="h-4 w-4 text-blue-600" /><div><p className="text-sm font-medium text-gray-800">XML</p><p className="text-xs text-gray-400">Microsoft Project</p></div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Ribbon row 2 ────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-1.5">

        {/* Zoom */}
        <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Zoom</span>
        {(['day', 'week', 'month', 'quarter'] as GanttZoom[]).map(z => (
          <button key={z} onClick={() => setZoom(z)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${zoom === z ? 'bg-[#1e3a5f] text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
            {z.charAt(0).toUpperCase() + z.slice(1)}
          </button>
        ))}

        <div className="mx-2 h-5 w-px bg-gray-300" />

        {/* Level dropdown */}
        <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Level</span>
        <select
          value={collapseLevel === null ? '' : String(collapseLevel)}
          onChange={e => setCollapseLevel(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="">All Levels</option>
          {(levelOptions.filter((l): l is number => l !== null)).map(l => (
            <option key={l} value={String(l)}>
              Level {l}{l === 1 ? ' (Top)' : l === maxLevel ? ' (Deepest)' : ''}
            </option>
          ))}
        </select>

        <div className="mx-2 h-5 w-px bg-gray-300" />

        {/* Task operations */}
        <button onClick={addTaskBelow} disabled={opBusy}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 transition-colors"
          title="Add task below selected">
          <Plus className="h-3 w-3" />Add Task
        </button>

        <button onClick={indentTask} disabled={opBusy || !selectedTaskId}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          title="Indent — make child of task above">
          <ArrowRightToLine className="h-3 w-3" />Indent
        </button>

        <button onClick={outdentTask} disabled={opBusy || !selectedTaskId || !selectedTask?.parentId}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          title="Outdent — promote to parent level">
          <ArrowLeftToLine className="h-3 w-3" />Outdent
        </button>

        <button onClick={moveTaskUp} disabled={opBusy || !selectedTaskId}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          title="Move task up within its group">
          <ArrowUp className="h-3 w-3" />Up
        </button>

        <button onClick={moveTaskDown} disabled={opBusy || !selectedTaskId}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          title="Move task down within its group">
          <ArrowDown className="h-3 w-3" />Down
        </button>

        {selectedTaskId && (
          <button onClick={() => setEditingTaskId(selectedTaskId)}
            className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            Edit
          </button>
        )}

        <button onClick={deleteSelectedTask} disabled={opBusy || !selectedTaskId}
          className="flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          title="Delete selected task (and all subtasks)">
          <Trash2 className="h-3 w-3" />Delete
        </button>

        <div className="mx-2 h-5 w-px bg-gray-300" />

        {/* Columns dropdown */}
        <div className="relative">
          <button onClick={() => setShowColsMenu(m => !m)}
            className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 transition-colors">
            <Columns3 className="h-3.5 w-3.5" />Columns<ChevronDown className="h-3 w-3" />
          </button>
          {showColsMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColsMenu(false)} />
              <div className="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Show / Hide Columns</p>
                {ribbonColList.map(col => (
                  <label key={col.key} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={colIsVisible(col.key)}
                      onChange={() => toggleCol(col.key)}
                      className="h-3 w-3 rounded accent-blue-600"
                    />
                    <span className="text-xs text-gray-700">{col.label}</span>
                    {(col.key === 'blStart' || col.key === 'blFinish') && (
                      <span className="ml-auto text-[9px] text-gray-400">BL</span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Predecessor arrows toggle */}
        <button
          onClick={() => setShowArrows(a => !a)}
          className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors ${showArrows ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'}`}
          title={showArrows ? 'Hide predecessor arrows' : 'Show predecessor arrows'}
        >
          <Share2 className="h-3 w-3" />Arrows
        </button>

        {/* Inline op feedback */}
        {opError && (
          <span className="ml-2 text-xs text-red-600">
            {opError}
            <button onClick={() => setOpError(null)} className="ml-1 text-red-400 hover:text-red-600">✕</button>
          </span>
        )}
        {opBusy && <span className="ml-2 text-xs text-gray-400">Working…</span>}
      </div>

      {/* ── Split pane ──────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex flex-1 overflow-hidden">

        {/* Left: Task Grid */}
        <div style={{ width: `${splitPct}%`, minWidth: 280 }} className="overflow-hidden">
          <TaskGrid
            flatTasks={flatTasks}
            collapsed={effectiveCollapsed}
            onToggle={toggleCollapse}
            colWidths={colWidths}
            colVisible={colVisible}
            onResizeCol={setColWidth}
            scrollRef={tableScrollRef}
            onScroll={onTableScroll}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            activeBaseline={activeBaseline}
          />
        </div>

        {/* Divider */}
        <div
          className="relative flex-shrink-0 cursor-col-resize select-none group"
          style={{ width: 6, background: '#e5e7eb' }}
          onMouseDown={startDividerDrag}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-300 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Right: Gantt */}
        <div className="relative flex-1 overflow-hidden">
          <GanttPanel
            flatTasks={flatTasks}
            seqToRow={seqToRow}
            timeline={timeline}
            showBaselines={activeBaseSlot !== null}
            activeBaseline={activeBaseline}
            scrollRef={ganttScrollRef}
            onScroll={onGanttScroll}
            selectedTaskId={selectedTaskId}
            showArrows={showArrows}
          />

          {/* Task edit panel */}
          {editingTaskId && editingTask && (
            <TaskEditPanel
              task={editingTask}
              dealId={dealId}
              flatTasks={flatTasks}
              onClose={() => setEditingTaskId(null)}
              onSaved={async () => {
                await recalcAndRefresh()
                setEditingTaskId(null)
              }}
              onDelete={async () => {
                await recalcAndRefresh()
                setEditingTaskId(null)
                setSelectedTaskId(null)
              }}
            />
          )}
        </div>
      </div>

      {/* Import modal */}
      {(parsed !== null || parseErr !== null) && (
        <ImportModal
          tasks={parsed ?? []}
          parseErr={parseErr}
          onImport={handleImport}
          onClose={() => { setParsed(null); setParseErr(null); setImportErr(null) }}
          importing={importing}
          importErr={importErr}
        />
      )}
    </div>
  )
}
