'use client'

import React from 'react'
import { format } from 'date-fns'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ROW_HEIGHT, GANTT_HEADER_H, rowBg, rowTextColor } from '@/lib/projectPlanUtils'
import { Priority } from '@/types'
import type { FlatTask } from '@/lib/projectPlanUtils'
import type { Baseline } from '@/lib/projectPlanUtils'

// ─── Column definitions ───────────────────────────────────────────────────────

export interface ColDef {
  key:        string
  label:      string
  defWidth:   number
  minWidth:   number
  defVisible: boolean
}

export const COLUMNS: ColDef[] = [
  { key: 'id',          label: 'ID',              defWidth: 38,  minWidth: 28,  defVisible: true  },
  { key: 'wbs',         label: 'WBS',             defWidth: 65,  minWidth: 40,  defVisible: true  },
  { key: 'taskName',    label: 'Task Name',        defWidth: 220, minWidth: 80,  defVisible: true  },
  { key: 'duration',    label: 'Duration',         defWidth: 72,  minWidth: 50,  defVisible: true  },
  { key: 'start',       label: 'Start',            defWidth: 90,  minWidth: 60,  defVisible: true  },
  { key: 'finish',      label: 'Finish',           defWidth: 90,  minWidth: 60,  defVisible: true  },
  { key: 'pct',         label: '% Done',           defWidth: 68,  minWidth: 50,  defVisible: true  },
  { key: 'resources',   label: 'Resource',         defWidth: 130, minWidth: 60,  defVisible: true  },
  { key: 'preds',       label: 'Predecessors',     defWidth: 82,  minWidth: 50,  defVisible: true  },
  { key: 'workstream',  label: 'Workstream',       defWidth: 130, minWidth: 60,  defVisible: false },
  { key: 'status',      label: 'Status',           defWidth: 95,  minWidth: 60,  defVisible: false },
  { key: 'rag',         label: 'RAG',              defWidth: 55,  minWidth: 40,  defVisible: false },
  { key: 'blStart',     label: 'BL Start',         defWidth: 90,  minWidth: 60,  defVisible: false },
  { key: 'blFinish',    label: 'BL Finish',        defWidth: 90,  minWidth: 60,  defVisible: false },
]

export const DEFAULT_COL_WIDTHS = new Map(COLUMNS.map(c => [c.key, c.defWidth]))

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskGridProps {
  flatTasks:       FlatTask[]
  collapsed:       Set<string>
  onToggle:        (id: string) => void
  colWidths:       Map<string, number>
  colVisible:      Map<string, boolean>
  onResizeCol:     (key: string, width: number) => void
  scrollRef:       React.RefObject<HTMLDivElement>
  onScroll:        (top: number) => void
  selectedTaskId:  string | null
  onSelectTask:    (id: string) => void
  activeBaseline:  Baseline | null
}

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETE:    'bg-green-100 text-green-700',
  BLOCKED:     'bg-red-100 text-red-700',
}

const RAG_DOT: Record<string, string> = {
  GREEN: 'bg-green-500',
  AMBER: 'bg-amber-400',
  RED:   'bg-red-500',
  GRAY:  'bg-gray-300',
}

// ─── TaskGrid ─────────────────────────────────────────────────────────────────

export function TaskGrid({
  flatTasks,
  collapsed,
  onToggle,
  colWidths,
  colVisible,
  onResizeCol,
  scrollRef,
  onScroll,
  selectedTaskId,
  onSelectTask,
  activeBaseline,
}: TaskGridProps) {
  const visCols = COLUMNS.filter(c => {
    // baseline columns only if a baseline exists
    if ((c.key === 'blStart' || c.key === 'blFinish') && !activeBaseline) return false
    const vis = colVisible.get(c.key)
    return vis === undefined ? c.defVisible : vis
  })

  function cw(key: string) {
    return colWidths.get(key) ?? COLUMNS.find(c => c.key === key)!.defWidth
  }

  const totalW = visCols.reduce((s, c) => s + cw(c.key), 0)

  // ─── Column resize ──────────────────────────────────────────────────────────
  function startResize(e: React.MouseEvent, key: string) {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const startW = cw(key)
    const minW   = COLUMNS.find(c => c.key === key)!.minWidth
    const onMove = (ev: MouseEvent) => onResizeCol(key, Math.max(minW, startW + ev.clientX - startX))
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─── Cell renderer ──────────────────────────────────────────────────────────
  function cell(col: ColDef, ft: FlatTask) {
    const { task } = ft
    const tc = rowTextColor(task.level)

    switch (col.key) {
      case 'id':
        return <span style={{ color: tc, opacity: 0.6 }} className="text-[10px] font-mono">{ft.seqId}</span>

      case 'wbs':
        return <span style={{ color: tc, opacity: 0.7 }} className="text-[10px] font-mono">{ft.wbs}</span>

      case 'taskName': {
        const hasKids = task._count.children > 0
        return (
          <div className="flex min-w-0 items-center gap-0.5" style={{ paddingLeft: ft.depth * 14 }}>
            {hasKids ? (
              <button
                className="flex-shrink-0 rounded p-0.5 hover:bg-black/10"
                onClick={e => { e.stopPropagation(); onToggle(task.id) }}
              >
                {collapsed.has(task.id)
                  ? <ChevronRight className="h-3 w-3" style={{ color: tc }} />
                  : <ChevronDown  className="h-3 w-3" style={{ color: tc }} />}
              </button>
            ) : (
              <span className="flex-shrink-0 inline-block" style={{ width: 16 }} />
            )}
            <span
              title={task.title}
              style={{ color: tc, fontWeight: task.level <= 2 ? 600 : 400 }}
              className="min-w-0 truncate text-xs"
            >
              {task.priority === Priority.HIGH && (
                <span className="mr-0.5 font-bold text-orange-500" title="High priority">!</span>
              )}
              {task.title}
            </span>
          </div>
        )
      }

      case 'duration':
        return <span style={{ color: tc, opacity: 0.8 }} className="text-xs">{task.durationDays != null ? `${task.durationDays}d` : '—'}</span>

      case 'start':
        return (
          <span style={{ color: tc, opacity: 0.8 }} className="text-xs">
            {task.startDate ? format(new Date(task.startDate as unknown as string), 'dd MMM yy') : '—'}
          </span>
        )

      case 'finish':
        return (
          <span style={{ color: tc, opacity: 0.8 }} className="text-xs">
            {task.endDate ? format(new Date(task.endDate as unknown as string), 'dd MMM yy') : '—'}
          </span>
        )

      case 'pct': {
        const pct = task.percentDone ?? 0
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-1.5 flex-1 rounded-full bg-black/10 overflow-hidden" style={{ minWidth: 28 }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: task.level === 1 ? 'rgba(255,255,255,0.7)' : '#3b82f6' }}
              />
            </div>
            <span style={{ color: tc, opacity: 0.7 }} className="flex-shrink-0 text-[10px]">{pct}%</span>
          </div>
        )
      }

      case 'resources':
        return (
          <span style={{ color: tc, opacity: 0.8 }} title={task.owner?.name ?? ''} className="truncate text-xs">
            {task.owner?.name ?? '—'}
          </span>
        )

      case 'preds':
        return (
          <span style={{ color: tc, opacity: 0.8 }} className="text-xs font-mono">
            {task.dependsOnId?.trim() || '—'}
          </span>
        )

      case 'workstream':
        return (
          <span style={{ color: tc, opacity: 0.8 }} title={task.workstream?.name} className="truncate text-xs">
            {task.workstream?.name ?? '—'}
          </span>
        )

      case 'status':
        return (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${task.level === 1 ? 'bg-white/20 text-white' : (STATUS_BADGE[task.status] ?? '')}`}>
            {task.status.replace('_', ' ')}
          </span>
        )

      case 'rag':
        return <div className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[task.rag] ?? 'bg-gray-300'}`} />

      case 'blStart': {
        if (!activeBaseline) return <span className="text-xs text-gray-400">—</span>
        const entry = activeBaseline.entries.find(e => e.taskId === task.id)
        return (
          <span style={{ color: tc, opacity: 0.7 }} className="text-xs">
            {entry?.startDate ? format(new Date(entry.startDate), 'dd MMM yy') : '—'}
          </span>
        )
      }

      case 'blFinish': {
        if (!activeBaseline) return <span className="text-xs text-gray-400">—</span>
        const entry = activeBaseline.entries.find(e => e.taskId === task.id)
        return (
          <span style={{ color: tc, opacity: 0.7 }} className="text-xs">
            {entry?.endDate ? format(new Date(entry.endDate), 'dd MMM yy') : '—'}
          </span>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable area — sticky header + rows */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={e => onScroll(e.currentTarget.scrollTop)}
      >
        <div style={{ minWidth: totalW }}>
          {/* Sticky header — exactly GANTT_HEADER_H tall with two visual rows */}
          <div
            className="sticky top-0 z-10 select-none"
            style={{ height: GANTT_HEADER_H, background: '#1e3a5f' }}
          >
            {/* Top subrow — label strip (22px, matches upper tick row) */}
            <div
              className="flex items-center px-2 border-b border-white/10"
              style={{ height: 22 }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Tasks</span>
            </div>
            {/* Bottom subrow — column names (32px, matches lower tick row) */}
            <div className="flex" style={{ height: 32 }}>
              {visCols.map(col => (
                <div
                  key={col.key}
                  className="relative flex flex-shrink-0 items-center border-r border-white/10 px-2"
                  style={{ width: cw(col.key) }}
                >
                  <span className="truncate text-[11px] font-semibold text-white">{col.label}</span>
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30"
                    onMouseDown={e => startResize(e, col.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {flatTasks.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              No tasks — import an XLSX file or add tasks using the toolbar.
            </div>
          ) : (
            flatTasks.map(ft => (
              <div
                key={ft.task.id}
                className="flex border-b border-gray-100 cursor-pointer"
                style={{
                  height: ROW_HEIGHT,
                  background: ft.task.id === selectedTaskId
                    ? '#fef3c7'
                    : rowBg(ft.task.level),
                }}
                onClick={() => onSelectTask(ft.task.id)}
              >
                {visCols.map(col => (
                  <div
                    key={col.key}
                    className="flex flex-shrink-0 items-center overflow-hidden px-1.5"
                    style={{ width: cw(col.key) }}
                  >
                    {cell(col, ft)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
