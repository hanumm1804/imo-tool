'use client'

import { useMemo, useRef } from 'react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, addDays, addWeeks, addMonths,
  differenceInDays, format, isToday, eachWeekOfInterval,
  eachMonthOfInterval, isSameMonth, isWithinInterval,
} from 'date-fns'
import type { TaskWithRelations } from '@/hooks/useTasks'
import type { PhaseWithTollgates } from '@/hooks/useDeal'
import { RAGStatus } from '@/types'
import type { ZoomLevel } from './TaskTree'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GanttChartProps {
  tasks:           TaskWithRelations[]
  phases:          PhaseWithTollgates[]
  zoom:            ZoomLevel
  onClickTollgate: (phase: PhaseWithTollgates) => void
}

// ─── Colour maps ─────────────────────────────────────────────────────────────

const RAG_BAR_COLORS: Record<RAGStatus, string> = {
  GREEN: 'bg-[var(--status-green)]',
  AMBER: 'bg-[var(--status-amber)]',
  RED:   'bg-[var(--status-red)]',
  GRAY:  'bg-gray-300',
}

const LEVEL_BAR_COLORS: Record<number, string> = {
  1: 'bg-[var(--fsl-dark-blue)]',
  2: 'bg-[var(--fsl-bright-blue)]/70',
  3: '',          // uses RAG color
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(tasks: TaskWithRelations[], zoom: ZoomLevel): { start: Date; end: Date } {
  const now = new Date()

  const dates = tasks.flatMap((t) => [
    t.startDate ? new Date(t.startDate as unknown as string) : null,
    t.endDate   ? new Date(t.endDate   as unknown as string) : null,
  ]).filter(Boolean) as Date[]

  const minDate = dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : addDays(now, -7)

  const maxDate = dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : addDays(now, 60)

  // Add padding
  if (zoom === 'WEEK')    return { start: addDays(minDate, -7),  end: addDays(maxDate, 7)   }
  if (zoom === 'MONTH')   return { start: addDays(minDate, -14), end: addDays(maxDate, 14)  }
  return                         { start: addDays(minDate, -30), end: addDays(maxDate, 30)  }
}

function dateToPercent(date: Date, rangeStart: Date, rangeDays: number): number {
  const diff = differenceInDays(date, rangeStart)
  return Math.max(0, Math.min(100, (diff / rangeDays) * 100))
}

// ─── Time axis header ─────────────────────────────────────────────────────────

function TimeAxisHeader({ start, end, zoom }: { start: Date; end: Date; zoom: ZoomLevel }) {
  const totalDays = differenceInDays(end, start) || 1

  if (zoom === 'WEEK') {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
    return (
      <div className="relative flex h-8 border-b border-gray-200">
        {weeks.map((weekStart) => {
          const left  = (differenceInDays(weekStart, start) / totalDays) * 100
          const width = (7 / totalDays) * 100
          return (
            <div
              key={weekStart.toISOString()}
              className="absolute top-0 h-full border-l border-gray-200 text-[10px] font-medium text-gray-500 pl-1 pt-1"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {format(weekStart, 'dd MMM')}
            </div>
          )
        })}
      </div>
    )
  }

  if (zoom === 'MONTH') {
    const months = eachMonthOfInterval({ start, end })
    return (
      <div className="relative flex h-8 border-b border-gray-200">
        {months.map((monthStart) => {
          const left  = (differenceInDays(monthStart, start) / totalDays) * 100
          const daysInMonth = differenceInDays(
            addDays(endOfMonth(monthStart), 1),
            startOfMonth(monthStart)
          )
          const width = (daysInMonth / totalDays) * 100
          return (
            <div
              key={monthStart.toISOString()}
              className="absolute top-0 h-full border-l border-gray-200 text-xs font-semibold text-gray-600 pl-1 pt-1.5"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {format(monthStart, 'MMM yyyy')}
            </div>
          )
        })}
      </div>
    )
  }

  // QUARTER — show months
  const months = eachMonthOfInterval({ start, end })
  return (
    <div className="relative flex h-8 border-b border-gray-200">
      {months.map((monthStart) => {
        const left  = (differenceInDays(monthStart, start) / totalDays) * 100
        const daysInMonth = differenceInDays(
          addDays(endOfMonth(monthStart), 1),
          startOfMonth(monthStart)
        )
        const width = (daysInMonth / totalDays) * 100
        return (
          <div
            key={monthStart.toISOString()}
            className="absolute top-0 h-full border-l border-gray-200 text-xs font-medium text-gray-500 pl-1 pt-1.5 truncate"
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            {format(monthStart, 'MMM')}
          </div>
        )
      })}
    </div>
  )
}

// ─── Gantt Row ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 36

function GanttRow({ task, rangeStart, totalDays }: {
  task:       TaskWithRelations
  rangeStart: Date
  totalDays:  number
}) {
  const startDate = task.startDate ? new Date(task.startDate as unknown as string) : rangeStart
  const endDate   = task.endDate   ? new Date(task.endDate   as unknown as string) : addDays(startDate, task.durationDays ?? 7)

  const leftPct  = dateToPercent(startDate, rangeStart, totalDays)
  const rightPct = dateToPercent(endDate,   rangeStart, totalDays)
  const widthPct = Math.max(0.5, rightPct - leftPct)

  const barColor = task.level === 3
    ? RAG_BAR_COLORS[task.rag]
    : LEVEL_BAR_COLORS[task.level] ?? 'bg-gray-400'

  const progressPct = task.status === 'COMPLETE' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0

  return (
    <div
      className="relative"
      style={{ height: ROW_HEIGHT }}
      aria-label={`${task.title}: ${format(startDate, 'dd MMM')} – ${format(endDate, 'dd MMM')}`}
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 rounded-sm ${barColor} overflow-hidden`}
        style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: 20 }}
      >
        {/* Progress fill (darker) */}
        <div
          className="absolute inset-y-0 left-0 bg-black/25 rounded-sm"
          style={{ width: `${progressPct}%` }}
          aria-hidden="true"
        />
        {widthPct > 5 && (
          <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-medium text-white truncate">
            {task.title}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Tollgate Diamond ────────────────────────────────────────────────────────

function TollgateDiamond({
  phase,
  rangeStart,
  totalDays,
  onClick,
}: {
  phase:      PhaseWithTollgates
  rangeStart: Date
  totalDays:  number
  onClick:    () => void
}) {
  const endDate = phase.plannedEndDate ? new Date(phase.plannedEndDate) : null
  if (!endDate) return null

  const leftPct   = dateToPercent(endDate, rangeStart, totalDays)
  const isSignedOff = phase.tollgateComplete

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
      style={{ left: `${leftPct}%` }}
      onClick={onClick}
      title={`${phase.phaseName} — click to review tollgate`}
    >
      {/* Diamond shape via CSS transform */}
      <div
        className={`h-4 w-4 rotate-45 border-2 ${
          isSignedOff
            ? 'border-[var(--fsl-dark-blue)] bg-[var(--fsl-dark-blue)]'
            : 'border-[var(--fsl-orange)] bg-[var(--fsl-orange)]'
        }`}
        aria-hidden="true"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GanttChart({ tasks, phases, zoom, onClickTollgate }: GanttChartProps) {
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getDateRange(tasks, zoom),
    [tasks, zoom]
  )

  const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart))
  const todayLeft = dateToPercent(new Date(), rangeStart, totalDays)

  // Flatten tasks in same order as TaskTree (sorted by level then sortOrder)
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.level - b.level || a.sortOrder - b.sortOrder),
    [tasks]
  )

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No tasks to display on Gantt chart.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" aria-label="Gantt chart">
      {/* Time axis */}
      <TimeAxisHeader start={rangeStart} end={rangeEnd} zoom={zoom} />

      {/* Gantt body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative" style={{ minWidth: '100%' }}>
          {/* Column grid lines */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {Array.from({ length: Math.ceil(totalDays / (zoom === 'WEEK' ? 1 : zoom === 'MONTH' ? 7 : 14)) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-y-0 border-l border-gray-100"
                style={{ left: `${(i / Math.ceil(totalDays / (zoom === 'WEEK' ? 1 : zoom === 'MONTH' ? 7 : 14))) * 100}%` }}
              />
            ))}
          </div>

          {/* Today line */}
          {todayLeft >= 0 && todayLeft <= 100 && (
            <div
              className="pointer-events-none absolute inset-y-0 z-20 w-0.5 border-l-2 border-dashed border-[var(--status-red)]"
              style={{ left: `${todayLeft}%` }}
              aria-label="Today"
            />
          )}

          {/* Phase tollgate diamonds — rendered above all rows */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10"
            style={{ height: ROW_HEIGHT }}
            aria-hidden="true"
          >
            {phases.map((phase) => (
              <div key={phase.id} className="pointer-events-auto">
                <TollgateDiamond
                  phase={phase}
                  rangeStart={rangeStart}
                  totalDays={totalDays}
                  onClick={() => onClickTollgate(phase)}
                />
              </div>
            ))}
          </div>

          {/* Task rows */}
          {sortedTasks.map((task) => (
            <GanttRow
              key={task.id}
              task={task}
              rangeStart={rangeStart}
              totalDays={totalDays}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
