'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import {
  ChevronDown, ChevronRight, Trash2, MoveRight, MoveLeft,
  MoveUp, MoveDown, Plus,
} from 'lucide-react'
import { RAGChip } from '@/components/shared/RAGChip'
import { useUpdateTask, useDeleteTask, useCreateTask } from '@/hooks/useTasks'
import type { TaskWithRelations } from '@/hooks/useTasks'
import { RAGStatus, TaskStatus, Role, Priority } from '@/types'

// ─── Zoom level type (shared with GanttChart) ─────────────────────────────────
export type ZoomLevel = 'WEEK' | 'MONTH' | 'QUARTER'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskTreeProps {
  dealId:      string
  tasks:       TaskWithRelations[]
  zoom:        ZoomLevel
  onZoomChange: (z: ZoomLevel) => void
  onSelectTask?: (task: TaskWithRelations) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildHierarchy(tasks: TaskWithRelations[]) {
  const byId    = new Map<string, TaskWithRelations>(tasks.map((t) => [t.id, t]))
  const roots: TaskWithRelations[] = []
  const childrenMap = new Map<string | null, TaskWithRelations[]>()

  for (const task of tasks) {
    const parentKey = task.parentId ?? null
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, [])
    childrenMap.get(parentKey)!.push(task)
  }

  for (const [, group] of childrenMap) {
    group.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  return { childrenMap, roots: childrenMap.get(null) ?? [] }
}

function aggregateRag(tasks: TaskWithRelations[], parentId: string | null, childrenMap: Map<string | null, TaskWithRelations[]>): RAGStatus {
  const children = childrenMap.get(parentId) ?? []
  if (children.length === 0) {
    const task = tasks.find((t) => t.id === parentId)
    return (task?.rag as RAGStatus) ?? RAGStatus.GRAY
  }
  const childRags = children.map((c) => aggregateRag(tasks, c.id, childrenMap))
  if (childRags.includes(RAGStatus.RED))   return RAGStatus.RED
  if (childRags.includes(RAGStatus.AMBER)) return RAGStatus.AMBER
  if (childRags.includes(RAGStatus.GREEN)) return RAGStatus.GREEN
  return RAGStatus.GRAY
}

function wbsFromPath(path: number[]): string {
  return path.join('.')
}

// ─── Row Component ────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<number, string> = {
  1: 'bg-[var(--fsl-dark-blue)] text-white font-semibold',
  2: 'bg-blue-50 text-[var(--fsl-dark-blue)] font-medium',
  3: 'bg-white text-gray-800',
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETE:    'bg-green-100 text-green-700',
  BLOCKED:     'bg-red-100 text-red-700',
}

function TaskRow({
  task,
  depth,
  wbs,
  isCollapsed,
  hasChildren,
  onToggle,
  onSelect,
  aggregateRagStatus,
  canEdit,
  level,
}: {
  task:              TaskWithRelations
  depth:             number
  wbs:               string
  isCollapsed:       boolean
  hasChildren:       boolean
  onToggle:          () => void
  onSelect?:         (task: TaskWithRelations) => void
  aggregateRagStatus: RAGStatus
  canEdit:           boolean
  level:             number
}) {
  const textClass = level === 1 ? 'text-white' : 'text-[var(--fsl-dark-blue)]'

  return (
    <tr
      className={`border-b border-gray-100 ${LEVEL_STYLES[level]} cursor-pointer hover:opacity-90`}
      onClick={() => onSelect?.(task)}
    >
      <td className="px-3 py-2 text-xs font-mono whitespace-nowrap" style={{ paddingLeft: `${12 + depth * 20}px` }}>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={`mr-1.5 rounded p-0.5 ${level === 1 ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed
              ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              : <ChevronDown  className="h-3.5 w-3.5" aria-hidden="true" />
            }
          </button>
        )}
        <span className={`text-[10px] ${textClass} opacity-60`}>{wbs}</span>
      </td>
      <td className="max-w-[200px] truncate px-3 py-2 text-sm" title={task.title}>
        {task.priority === Priority.HIGH && (
          <span className="mr-0.5 font-bold text-orange-500" title="High priority">!</span>
        )}
        {task.title}
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap">
        {task.workstream?.name ?? <span className="text-gray-400">—</span>}
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap">
        {task.startDate ? format(new Date(task.startDate as unknown as string), 'dd MMM yy') : '—'}
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap">
        {task.endDate ? format(new Date(task.endDate as unknown as string), 'dd MMM yy') : '—'}
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap">
        {task.durationDays != null ? `${task.durationDays}d` : '—'}
      </td>
      <td className="px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-14 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-[var(--fsl-dark-blue)]"
              style={{ width: `${task.percentDone ?? 0}%` }}
              role="progressbar"
              aria-valuenow={task.percentDone ?? 0}
            />
          </div>
          <span className="text-[10px] text-gray-500">{task.percentDone ?? 0}%</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[task.status as TaskStatus]}`}>
          {task.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-3 py-2">
        <RAGChip rag={level === 3 ? task.rag as RAGStatus : aggregateRagStatus} />
      </td>
    </tr>
  )
}

// ─── Recursive render ─────────────────────────────────────────────────────────

function renderTasks(
  taskList:    TaskWithRelations[],
  allTasks:    TaskWithRelations[],
  childrenMap: Map<string | null, TaskWithRelations[]>,
  collapsed:   Set<string>,
  onToggle:    (id: string) => void,
  onSelect?:   (t: TaskWithRelations) => void,
  depth = 0,
  wbsPath: number[] = [],
): React.ReactNode[] {
  const rows: React.ReactNode[] = []

  taskList.forEach((task, idx) => {
    const path         = [...wbsPath, idx + 1]
    const wbs          = wbsFromPath(path)
    const children     = childrenMap.get(task.id) ?? []
    const isCollapsed  = collapsed.has(task.id)
    const aggRag       = aggregateRag(allTasks, task.id, childrenMap)

    rows.push(
      <TaskRow
        key={task.id}
        task={task}
        depth={depth}
        wbs={wbs}
        isCollapsed={isCollapsed}
        hasChildren={children.length > 0}
        onToggle={() => onToggle(task.id)}
        onSelect={onSelect}
        aggregateRagStatus={aggRag}
        canEdit={false}
        level={task.level}
      />
    )

    if (children.length > 0 && !isCollapsed) {
      rows.push(
        ...renderTasks(children, allTasks, childrenMap, collapsed, onToggle, onSelect, depth + 1, path)
      )
    }
  })

  return rows
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskTree({ dealId, tasks, zoom, onZoomChange, onSelectTask }: TaskTreeProps) {
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const canEdit = session?.user.role !== Role.VIEWER

  const { childrenMap, roots } = useMemo(() => buildHierarchy(tasks), [tasks])

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rows = useMemo(
    () => renderTasks(roots, tasks, childrenMap, collapsed, toggleCollapse, onSelectTask),
    [roots, tasks, childrenMap, collapsed, onSelectTask]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button className="flex items-center gap-1 rounded-md bg-[var(--fsl-orange)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Task
              </button>
              <button className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Indent">
                <MoveRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Outdent">
                <MoveLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Move Up">
                <MoveUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" title="Move Down">
                <MoveDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button className="rounded-md border border-gray-200 p-1.5 text-[var(--status-red)] hover:bg-red-50" title="Delete">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        {/* Zoom controls */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          {(['WEEK', 'MONTH', 'QUARTER'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                zoom === z
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {z.charAt(0) + z.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left" aria-label="Task tree">
          <thead className="sticky top-0 bg-[var(--fsl-dark-blue)] text-white">
            <tr>
              <th className="px-3 py-2 text-xs font-medium">WBS#</th>
              <th className="px-3 py-2 text-xs font-medium">Task Name</th>
              <th className="px-3 py-2 text-xs font-medium">Workstream</th>
              <th className="px-3 py-2 text-xs font-medium">Start</th>
              <th className="px-3 py-2 text-xs font-medium">Finish</th>
              <th className="px-3 py-2 text-xs font-medium">Duration</th>
              <th className="px-3 py-2 text-xs font-medium">% Done</th>
              <th className="px-3 py-2 text-xs font-medium">Status</th>
              <th className="px-3 py-2 text-xs font-medium">RAG</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-400">
                  No tasks found. Add tasks to get started.
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
