import {
  differenceInCalendarDays,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  format,
} from 'date-fns'
import type { TaskWithRelations } from '@/hooks/useTasks'

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROW_HEIGHT        = 28
export const GANTT_HEADER_H    = 54   // two-row time axis
export const BAR_HEIGHT        = 16
export const BAR_VERT_PAD      = (ROW_HEIGHT - BAR_HEIGHT) / 2
export const FIRSTSOURCE_ORANGE = '#F47920'

// ─── FlatTask ─────────────────────────────────────────────────────────────────

export interface FlatTask {
  task:     TaskWithRelations
  depth:    number
  wbs:      string
  seqId:    number
  rowIndex: number
}

/** Assign stable sequential IDs to ALL tasks in DFS order (ignoring collapse) */
export function computeAllSeqIds(tasks: TaskWithRelations[]): Map<string, number> {
  const result  = new Map<string, number>()
  let   counter = 0

  function walk(list: TaskWithRelations[]) {
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    for (const task of sorted) {
      result.set(task.id, ++counter)
      walk(tasks.filter(t => t.parentId === task.id))
    }
  }

  walk(tasks.filter(t => !t.parentId))
  return result
}

/** Flatten tree into visible display order, respecting collapsed nodes */
export function flattenTasks(
  tasks:     TaskWithRelations[],
  collapsed: Set<string>,
  allSeqIds: Map<string, number>,
): FlatTask[] {
  const result: FlatTask[] = []
  let rowIndex = 0

  function walk(list: TaskWithRelations[], depth: number, prefix: string) {
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    sorted.forEach((task, i) => {
      const wbs      = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
      const seqId    = allSeqIds.get(task.id) ?? 0
      const children = tasks.filter(t => t.parentId === task.id)
      result.push({ task, depth, wbs, seqId, rowIndex: rowIndex++ })
      if (children.length > 0 && !collapsed.has(task.id)) {
        walk(children, depth + 1, wbs)
      }
    })
  }

  walk(tasks.filter(t => !t.parentId), 0, '')
  return result
}

// ─── Timeline / Zoom ─────────────────────────────────────────────────────────

export type GanttZoom = 'day' | 'week' | 'month' | 'quarter'

export const ZOOM_COL_WIDTHS: Record<GanttZoom, number> = {
  day:     28,
  week:    72,
  month:   100,
  quarter: 150,
}

export interface TimelineTick {
  date:  Date
  label: string
  x:     number
}

export interface UpperTick {
  label: string
  x:     number
  width: number
}

export interface TimelineConfig {
  upperTicks: UpperTick[]
  lowerTicks: TimelineTick[]
  totalWidth: number
  colWidth:   number
  zoom:       GanttZoom
}

export function buildTimeline(tasks: TaskWithRelations[], zoom: GanttZoom): TimelineConfig {
  const colWidth = ZOOM_COL_WIDTHS[zoom]
  const now      = new Date()

  const dates: Date[] = []
  for (const t of tasks) {
    if (t.startDate) dates.push(new Date(t.startDate as unknown as string))
    if (t.endDate)   dates.push(new Date(t.endDate   as unknown as string))
  }

  const rawStart = dates.length > 0
    ? new Date(Math.min(...dates.map(d => d.getTime())))
    : addDays(now, -14)
  const rawEnd = dates.length > 0
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : addDays(now, 90)

  // For month/quarter zoom: snap directly to period start (no pre-padding) so the
  // timeline begins at Aug if the first task starts Aug 3, not July.
  const startPrepad = zoom === 'month' || zoom === 'quarter' ? 0 : 14
  const rangeStart  = snapToZoom(addDays(rawStart, -startPrepad), zoom)
  const rangeEnd    = snapToZoom(addDays(rawEnd, 14), zoom)

  // Build lower ticks
  const lowerTicks: TimelineTick[] = []
  let cur   = rangeStart
  let tickI = 0
  while (cur <= rangeEnd || tickI < 4) {
    lowerTicks.push({ date: new Date(cur), label: fmtLower(cur, zoom), x: tickI * colWidth })
    cur = advanceZoom(cur, zoom)
    tickI++
  }

  const totalWidth = lowerTicks.length * colWidth

  // Build upper ticks (grouped)
  const upperTicks: UpperTick[] = []
  if (lowerTicks.length > 0) {
    let gKey   = upperKey(lowerTicks[0]!.date, zoom)
    let gLabel = fmtUpper(lowerTicks[0]!.date, zoom)
    let gStart = 0
    let gCount = 0

    lowerTicks.forEach((tick, idx) => {
      const key = upperKey(tick.date, zoom)
      if (key === gKey) {
        gCount++
      } else {
        upperTicks.push({ label: gLabel, x: gStart * colWidth, width: gCount * colWidth })
        gKey   = key
        gLabel = fmtUpper(tick.date, zoom)
        gStart = idx
        gCount = 1
      }
    })
    upperTicks.push({ label: gLabel, x: gStart * colWidth, width: gCount * colWidth })
  }

  return { upperTicks, lowerTicks, totalWidth, colWidth, zoom }
}

function snapToZoom(d: Date, zoom: GanttZoom): Date {
  switch (zoom) {
    case 'day':     return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    case 'week':    return startOfWeek(d, { weekStartsOn: 1 })
    case 'month':   return startOfMonth(d)
    case 'quarter': return startOfQuarter(d)
  }
}

function advanceZoom(d: Date, zoom: GanttZoom): Date {
  switch (zoom) {
    case 'day':     return addDays(d, 1)
    case 'week':    return addWeeks(d, 1)
    case 'month':   return addMonths(d, 1)
    case 'quarter': return addQuarters(d, 1)
  }
}

function fmtLower(d: Date, zoom: GanttZoom): string {
  switch (zoom) {
    case 'day':     return format(d, 'd')
    case 'week':    return format(d, 'dd MMM')
    case 'month':   return format(d, 'MMM')
    case 'quarter': return `Q${Math.ceil((d.getMonth() + 1) / 3)}`
  }
}

function fmtUpper(d: Date, zoom: GanttZoom): string {
  switch (zoom) {
    case 'day':
    case 'week':    return format(d, 'MMMM yyyy')
    case 'month':
    case 'quarter': return format(d, 'yyyy')
  }
}

function upperKey(d: Date, zoom: GanttZoom): string {
  switch (zoom) {
    case 'day':
    case 'week':    return format(d, 'yyyy-MM')
    case 'month':
    case 'quarter': return format(d, 'yyyy')
  }
}

// ─── Date → pixel X ──────────────────────────────────────────────────────────

export function dateToX(date: Date, tl: TimelineConfig): number {
  const { lowerTicks, colWidth } = tl
  if (!lowerTicks.length) return 0

  for (let i = 0; i < lowerTicks.length - 1; i++) {
    const t0 = lowerTicks[i]!.date
    const t1 = lowerTicks[i + 1]!.date
    if (date >= t0 && date < t1) {
      const span = differenceInCalendarDays(t1, t0) || 1
      const frac = differenceInCalendarDays(date, t0) / span
      return (i + frac) * colWidth
    }
  }

  // After last tick
  const lastI = lowerTicks.length - 1
  const last  = lowerTicks[lastI]!.date
  const prev  = lowerTicks[lastI - 1]?.date ?? last
  const span  = differenceInCalendarDays(last, prev) || 1
  const frac  = differenceInCalendarDays(date, last) / span
  return (lastI + frac) * colWidth
}

// ─── Styling ──────────────────────────────────────────────────────────────────

export function getBarColor(status: string, level: number, isMilestone: boolean): string {
  if (isMilestone) return '#7c3aed'
  if (level === 1)  return FIRSTSOURCE_ORANGE
  if (level === 2)  return '#1e3a5f'
  switch (status) {
    case 'COMPLETE':    return '#16a34a'
    case 'IN_PROGRESS': return '#2563eb'
    case 'BLOCKED':     return '#dc2626'
    default:            return '#64748b'
  }
}

export function rowBg(level: number): string {
  if (level === 1) return FIRSTSOURCE_ORANGE
  if (level === 2) return '#eff6ff'
  return '#ffffff'
}

export function rowTextColor(level: number): string {
  if (level === 1) return '#ffffff'
  if (level === 2) return '#1e3a5f'
  return '#374151'
}

// ─── Weekday utilities ────────────────────────────────────────────────────────

/** Count working days (Mon–Fri) between start (inclusive) and end (exclusive). */
export function weekdaysBetween(start: Date, end: Date): number {
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end);   e.setHours(0, 0, 0, 0)
  if (s >= e) return 0
  let count = 0
  const cur = new Date(s)
  while (cur < e) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Add (or subtract when negative) N working days to a date. */
export function addWeekdays(start: Date, days: number): Date {
  const result = new Date(start); result.setHours(0, 0, 0, 0)
  if (days === 0) return result
  const step = days > 0 ? 1 : -1
  let remaining = Math.abs(days)
  while (remaining > 0) {
    result.setDate(result.getDate() + step)
    const d = result.getDay()
    if (d !== 0 && d !== 6) remaining--
  }
  return result
}

// ─── Predecessor helpers ──────────────────────────────────────────────────────

export interface PredecessorRef {
  seqId: number
  type:  'FS' | 'SS' | 'SF' | 'FF'
  lag:   number   // working-day offset (can be negative)
}

/**
 * Parse predecessor string like "3", "3FS", "3FS+2", "2SS-1" into structured refs.
 * Comma-separated, invalid tokens silently dropped.
 */
export function parsePredecessorRefs(raw: string | null | undefined): PredecessorRef[] {
  if (!raw?.trim()) return []
  return raw.split(',').flatMap(s => {
    const m = s.trim().match(/^(\d+)(FS|SS|SF|FF)?([+-]\d+)?$/i)
    if (!m) return []
    return [{
      seqId: parseInt(m[1]!, 10),
      type:  (m[2]?.toUpperCase() as 'FS' | 'SS' | 'SF' | 'FF') ?? 'FS',
      lag:   m[3] ? parseInt(m[3], 10) : 0,
    }]
  })
}

export function parsePredecessors(dependsOnId: string | null | undefined): number[] {
  return parsePredecessorRefs(dependsOnId).map(r => r.seqId)
}

/**
 * Given a predecessor task, a dependency ref, and the current task's duration,
 * return the auto-calculated start/end dates.
 */
export function calcDatesFromPredecessor(
  predTask: { startDate?: unknown; endDate?: unknown },
  ref: PredecessorRef,
  selfDays: number | null,
): { startDate?: Date; endDate?: Date } {
  const predStart = predTask.startDate ? new Date(predTask.startDate as string) : null
  const predEnd   = predTask.endDate   ? new Date(predTask.endDate   as string) : null
  const lag = (d: Date) => ref.lag !== 0 ? addWeekdays(d, ref.lag) : new Date(d)

  switch (ref.type) {
    case 'FS': {
      if (!predEnd) return {}
      // Successor starts the next working day after predecessor ends, then apply lag
      const start = addWeekdays(predEnd, 1 + ref.lag)
      const end   = selfDays != null ? addWeekdays(start, selfDays) : undefined
      return { startDate: start, ...(end ? { endDate: end } : {}) }
    }
    case 'SS': {
      if (!predStart) return {}
      const start = lag(predStart)
      const end   = selfDays != null ? addWeekdays(start, selfDays) : undefined
      return { startDate: start, ...(end ? { endDate: end } : {}) }
    }
    case 'FF': {
      if (!predEnd) return {}
      const end   = lag(predEnd)
      const start = selfDays != null ? addWeekdays(end, -selfDays) : undefined
      return { endDate: end, ...(start ? { startDate: start } : {}) }
    }
    case 'SF': {
      if (!predStart) return {}
      const end   = lag(predStart)
      const start = selfDays != null ? addWeekdays(end, -selfDays) : undefined
      return { endDate: end, ...(start ? { startDate: start } : {}) }
    }
    default: return {}
  }
}

// ─── Baselines ────────────────────────────────────────────────────────────────

export interface BaselineEntry {
  taskId:       string
  startDate:    string | null
  endDate:      string | null
  durationDays: number | null
  percentDone:  number
}

export interface Baseline {
  slot:    1 | 2 | 3
  name:    string
  savedAt: string
  entries: BaselineEntry[]
}
