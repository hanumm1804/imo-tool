'use client'

import React, { useState, useEffect } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import type { TaskWithRelations } from '@/hooks/useTasks'
import { TaskStatus, RAGStatus, Priority } from '@/types'
import type { FlatTask } from '@/lib/projectPlanUtils'
import { weekdaysBetween, addWeekdays, parsePredecessorRefs, calcDatesFromPredecessor } from '@/lib/projectPlanUtils'
import { useWorkstreams } from '@/hooks/useWorkstreams'
import { useResources, useQuickAddResource } from '@/hooks/useResources'
import { UserCombobox } from '@/components/ui/UserCombobox'

interface Props {
  task:       TaskWithRelations
  dealId:     string
  flatTasks?: FlatTask[]
  onClose:    () => void
  onSaved:    () => void
  onDelete:   () => void
}

interface FormState {
  title:        string
  status:       string
  rag:          string
  priority:     string
  startDate:    string
  endDate:      string
  durationDays: string
  percentDone:  string
  dependsOnId:  string
  description:  string
  workstreamId: string
  ownerId:      string
}

function toDateInput(val: unknown): string {
  if (!val) return ''
  try { return new Date(val as string).toISOString().split('T')[0]! }
  catch { return '' }
}

/** Format a locally-computed Date (e.g. from addWeekdays) as YYYY-MM-DD in the browser's local timezone. */
function localDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}

export function TaskEditPanel({ task, dealId, flatTasks, onClose, onSaved, onDelete }: Props) {
  const { data: workstreams } = useWorkstreams(dealId)
  const { data: resources }   = useResources(dealId)
  const quickAdd              = useQuickAddResource(dealId)

  const [form, setForm] = useState<FormState>({
    title:        task.title,
    status:       task.status,
    rag:          task.rag,
    priority:     task.priority,
    startDate:    toDateInput(task.startDate),
    endDate:      toDateInput(task.endDate),
    durationDays: task.durationDays != null ? String(task.durationDays) : '',
    percentDone:  String(task.percentDone ?? 0),
    dependsOnId:  task.dependsOnId ?? '',
    description:  task.description ?? '',
    workstreamId: task.workstream?.id ?? '',
    ownerId:      task.owner?.id ?? '',
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Reset when task changes
  useEffect(() => {
    setForm({
      title:        task.title,
      status:       task.status,
      rag:          task.rag,
      priority:     task.priority,
      startDate:    toDateInput(task.startDate),
      endDate:      toDateInput(task.endDate),
      durationDays: task.durationDays != null ? String(task.durationDays) : '',
      percentDone:  String(task.percentDone ?? 0),
      dependsOnId:  task.dependsOnId ?? '',
      description:  task.description ?? '',
      workstreamId: task.workstream?.id ?? '',
      ownerId:      task.owner?.id ?? '',
    })
    setError(null)
  }, [task.id])

  function upd(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function deriveFromPercent(pct: number, startDateStr: string, endDateStr: string): Partial<FormState> {
    const now       = new Date()
    const endDate   = endDateStr   ? new Date(endDateStr)   : null
    const startDate = startDateStr ? new Date(startDateStr) : null
    const derived: Partial<FormState> = {}

    if (pct === 100) {
      derived.status = TaskStatus.COMPLETE
      derived.rag    = RAGStatus.GREEN
    } else if (pct > 0) {
      derived.status = TaskStatus.IN_PROGRESS
      if (endDate && endDate < now) {
        derived.rag = RAGStatus.RED
      } else if (pct < 50 && endDate) {
        const diffDays = weekdaysBetween(now, endDate)
        derived.rag = diffDays <= 2 ? RAGStatus.AMBER : RAGStatus.GREEN
      } else {
        derived.rag = RAGStatus.GREEN
      }
    } else {
      if (startDate && startDate > now) {
        derived.status = TaskStatus.NOT_STARTED
        derived.rag    = RAGStatus.GRAY
      } else if (endDate && endDate < now) {
        derived.rag = RAGStatus.RED
      } else {
        derived.rag = RAGStatus.GREEN
      }
    }
    return derived
  }

  // ─── Reactive date / duration helpers ──────────────────────────────────────

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setForm(f => {
      const upd: Partial<FormState> = { startDate: val }
      if (val && f.endDate) {
        upd.durationDays = String(weekdaysBetween(new Date(val), new Date(f.endDate)))
      } else if (val && f.durationDays) {
        const dur = parseInt(f.durationDays, 10)
        if (!isNaN(dur) && dur > 0) upd.endDate = localDateStr(addWeekdays(new Date(val), dur))
      }
      const pct = parseInt(f.percentDone, 10)
      if (!isNaN(pct)) Object.assign(upd, deriveFromPercent(pct, val, upd.endDate ?? f.endDate))
      return { ...f, ...upd }
    })
  }

  function handleEndDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setForm(f => {
      const upd: Partial<FormState> = { endDate: val }
      if (val && f.startDate) {
        upd.durationDays = String(weekdaysBetween(new Date(f.startDate), new Date(val)))
      }
      const pct = parseInt(f.percentDone, 10)
      if (!isNaN(pct)) Object.assign(upd, deriveFromPercent(pct, f.startDate, val))
      return { ...f, ...upd }
    })
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setForm(f => {
      const upd: Partial<FormState> = { durationDays: val }
      const dur = parseInt(val, 10)
      if (!isNaN(dur) && dur > 0 && f.startDate) {
        upd.endDate = localDateStr(addWeekdays(new Date(f.startDate), dur))
      }
      return { ...f, ...upd }
    })
  }

  function handlePredecessorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setForm(f => {
      const upd: Partial<FormState> = { dependsOnId: val }
      if (flatTasks?.length) {
        const refs = parsePredecessorRefs(val)
        if (refs.length > 0) {
          const ref    = refs[0]!
          const predFt = flatTasks.find(ft => ft.seqId === ref.seqId)
          if (predFt) {
            const selfDays = parseInt(f.durationDays, 10)
            const result   = calcDatesFromPredecessor(predFt.task, ref, isNaN(selfDays) ? null : selfDays)
            if (result.startDate) upd.startDate = localDateStr(result.startDate)
            if (result.endDate)   upd.endDate   = localDateStr(result.endDate)
            if (result.startDate && result.endDate) {
              upd.durationDays = String(weekdaysBetween(result.startDate, result.endDate))
            }
          }
        }
      }
      return { ...f, ...upd }
    })
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const dur = parseInt(form.durationDays, 10)
      const pct = parseInt(form.percentDone, 10)
      const body: Record<string, unknown> = {
        title:        form.title.trim() || task.title,
        status:       form.status,
        rag:          form.rag,
        priority:     form.priority,
        startDate:    form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate:      form.endDate   ? new Date(form.endDate).toISOString()   : null,
        durationDays: !isNaN(dur) && dur >= 0 ? dur : null,
        percentDone:  !isNaN(pct) ? Math.min(100, Math.max(0, pct)) : 0,
        dependsOnId:  form.dependsOnId.trim() || null,
        description:  form.description.trim() || null,
        ownerId:      form.ownerId.trim() || null,
        ...(form.workstreamId.trim() ? { workstreamId: form.workstreamId.trim() } : {}),
      }
      // Strip keys whose values are undefined so Zod doesn't choke
      Object.keys(body).forEach(k => body[k] === undefined && delete body[k])
      const res = await fetch(`/api/deals/${dealId}/tasks?taskId=${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    const hasChildren = task._count.children > 0
    const msg = hasChildren
      ? `Delete "${task.title}" and all its subtasks? This cannot be undone.`
      : `Delete "${task.title}"? This cannot be undone.`
    if (!confirm(msg)) return
    setDeleting(true)
    try {
      const qs  = hasChildren ? `taskId=${task.id}&cascade=true` : `taskId=${task.id}`
      const res = await fetch(`/api/deals/${dealId}/tasks?${qs}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? 'Delete failed')
      }
      onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-10 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 z-20 flex w-80 flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#1e3a5f] px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-white">Edit Task</h3>
          <button onClick={onClose} className="rounded p-1 text-white/60 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <Field label="Task Name">
            <input
              className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              value={form.title}
              onChange={upd('title')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none" value={form.status} onChange={upd('status')}>
                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </Field>

            <Field label="RAG">
              <select className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none" value={form.rag} onChange={upd('rag')}>
                {Object.values(RAGStatus).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="Priority">
              <select className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none" value={form.priority} onChange={upd('priority')}>
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="% Done">
              <input
                type="number" min="0" max="100"
                className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                value={form.percentDone}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => {
                    const pct = parseInt(val, 10)
                    const derived = !isNaN(pct) ? deriveFromPercent(pct, f.startDate, f.endDate) : {}
                    return { ...f, percentDone: val, ...derived }
                  })
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input
                type="date"
                className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                value={form.startDate}
                onChange={handleStartDateChange}
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                value={form.endDate}
                onChange={handleEndDateChange}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Field label="Duration (working days)">
                <input
                  type="number" min="0"
                  className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  value={form.durationDays}
                  onChange={handleDurationChange}
                  placeholder="e.g. 5"
                />
              </Field>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer pt-5 shrink-0">
              <input
                type="checkbox"
                checked={form.durationDays === '0'}
                onChange={e => {
                  if (e.target.checked) {
                    setForm(f => ({ ...f, durationDays: '0', endDate: '' }))
                  } else {
                    setForm(f => ({ ...f, durationDays: '' }))
                  }
                }}
                className="h-3.5 w-3.5 rounded accent-purple-600"
              />
              <span className="text-xs text-gray-700 select-none">Milestone</span>
              <span className="text-[10px] text-purple-600" title="Milestone tasks appear as a purple diamond ◆ on the Gantt chart">◆</span>
            </label>
          </div>

          <Field label="Predecessors (e.g. 3, 3FS, 3FS+2, 2SS)">
            <input
              className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none font-mono"
              value={form.dependsOnId}
              onChange={handlePredecessorChange}
              placeholder="e.g. 3, 3FS+2"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              className="input-sm w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              value={form.description}
              onChange={upd('description')}
              placeholder="Optional notes…"
            />
          </Field>

          <Field label="Workstream">
            <select
              className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              value={form.workstreamId}
              onChange={upd('workstreamId')}
            >
              {workstreams?.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Resource (Owner)">
            <UserCombobox
              users={(resources ?? []).map(r => ({ id: r.user.id, name: r.user.name }))}
              value={form.ownerId}
              currentName={task.owner?.name ?? ''}
              onChange={userId => setForm(f => ({ ...f, ownerId: userId }))}
              onCreateNew={name => quickAdd.mutateAsync(name)}
              disabled={saving}
            />
          </Field>

          {/* Read-only info */}
          <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between"><span>WBS</span><span className="font-mono">{task.wbsNumber ?? '—'}</span></div>
            <div className="flex justify-between"><span>Level</span><span>{task.level}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded bg-[#1e3a5f] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</label>
      {children}
    </div>
  )
}
