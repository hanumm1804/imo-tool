'use client'

import React, { useRef } from 'react'
import {
  ROW_HEIGHT,
  GANTT_HEADER_H,
  BAR_HEIGHT,
  BAR_VERT_PAD,
  dateToX,
  getBarColor,
  parsePredecessorRefs,
} from '@/lib/projectPlanUtils'
import type { FlatTask, TimelineConfig, Baseline } from '@/lib/projectPlanUtils'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttPanelProps {
  flatTasks:      FlatTask[]
  seqToRow:       Map<number, number>
  timeline:       TimelineConfig
  showBaselines:  boolean
  activeBaseline: Baseline | null
  scrollRef:      React.RefObject<HTMLDivElement>
  onScroll:       (top: number) => void
  selectedTaskId: string | null
  showArrows?:    boolean
}

// ─── GanttPanel ───────────────────────────────────────────────────────────────

export function GanttPanel({
  flatTasks,
  seqToRow,
  timeline,
  showBaselines,
  activeBaseline,
  scrollRef,
  onScroll,
  selectedTaskId,
  showArrows = true,
}: GanttPanelProps) {
  const axisRef = useRef<HTMLDivElement>(null)
  const { lowerTicks, upperTicks, totalWidth, colWidth } = timeline
  const totalH  = Math.max(flatTasks.length * ROW_HEIGHT, 1)
  const todayX  = dateToX(new Date(), timeline)

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    onScroll(el.scrollTop)
    if (axisRef.current) axisRef.current.scrollLeft = el.scrollLeft
  }

  // ─── Task bars ──────────────────────────────────────────────────────────────
  function renderBars() {
    return flatTasks.map(ft => {
      const { task } = ft
      const isMilestone = task.durationDays === 0
      const isSelected  = task.id === selectedTaskId

      const startDate = task.startDate ? new Date(task.startDate as unknown as string) : null
      const endDate   = task.endDate   ? new Date(task.endDate   as unknown as string) : null
      if (!startDate && !endDate) return null

      const x0 = startDate ? dateToX(startDate, timeline) : 0
      const x1 = endDate   ? dateToX(endDate,   timeline) : x0 + colWidth * 0.5

      const barColor = getBarColor(task.status, task.level, isMilestone)
      const pct      = task.percentDone ?? 0

      // Baseline bar
      let blBar: React.ReactNode = null
      if (showBaselines && activeBaseline) {
        const entry = activeBaseline.entries.find(e => e.taskId === task.id)
        if (entry?.startDate && entry?.endDate) {
          const bx0 = dateToX(new Date(entry.startDate), timeline)
          const bx1 = dateToX(new Date(entry.endDate),   timeline)
          blBar = (
            <div
              className="absolute rounded-sm pointer-events-none"
              style={{
                left:       Math.min(bx0, bx1),
                width:      Math.max(3, Math.abs(bx1 - bx0)),
                top:        ft.rowIndex * ROW_HEIGHT + ROW_HEIGHT - 7,
                height:     4,
                background: 'rgba(100,116,139,0.45)',
                zIndex:     2,
              }}
            />
          )
        }
      }

      if (isMilestone) {
        const S = 12
        return (
          <React.Fragment key={task.id}>
            {blBar}
            <div
              title={task.title}
              className="absolute"
              style={{
                left:      x0 - S / 2,
                top:       ft.rowIndex * ROW_HEIGHT + (ROW_HEIGHT - S) / 2,
                width:     S,
                height:    S,
                background: barColor,
                transform: 'rotate(45deg)',
                zIndex:    3,
                outline:   isSelected ? '2px solid #f59e0b' : 'none',
                outlineOffset: 2,
              }}
            />
          </React.Fragment>
        )
      }

      const barW = Math.max(2, x1 - x0)
      return (
        <React.Fragment key={task.id}>
          {blBar}
          <div
            title={task.title}
            className="absolute overflow-hidden rounded-sm"
            style={{
              left:    x0,
              top:     ft.rowIndex * ROW_HEIGHT + BAR_VERT_PAD,
              width:   barW,
              height:  BAR_HEIGHT,
              background: barColor,
              zIndex:  3,
              boxShadow: isSelected ? '0 0 0 2px #f59e0b' : 'none',
            }}
          >
            <div className="absolute inset-y-0 left-0 bg-black/20" style={{ width: `${pct}%` }} />
            {barW > 40 && (
              <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-medium text-white/90 truncate pointer-events-none">
                {task.title}
              </span>
            )}
          </div>
        </React.Fragment>
      )
    })
  }

  // ─── Dependency arrows ──────────────────────────────────────────────────────
  // Routing by type (matches standard PM dependency diagrams):
  //   FS  pred-END   → succ-START  (exit right, enter left)
  //   SS  pred-START → succ-START  (exit left,  enter left)
  //   FF  pred-END   → succ-END    (exit right, enter right)
  //   SF  pred-START → succ-END    (exit left,  enter right)
  function renderArrows() {
    const paths: React.ReactNode[] = []
    const ELBOW = 10

    flatTasks.forEach(ft => {
      const refs = parsePredecessorRefs(ft.task.dependsOnId)
      if (!refs.length) return

      const succStartDate = ft.task.startDate ? new Date(ft.task.startDate as unknown as string) : null
      const succEndDate   = ft.task.endDate   ? new Date(ft.task.endDate   as unknown as string) : null
      const succStart = succStartDate ? dateToX(succStartDate, timeline) : null
      const succEnd   = succEndDate   ? dateToX(succEndDate,   timeline) : null
      const succRowCenter = ft.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

      refs.forEach(ref => {
        const predRowIdx = seqToRow.get(ref.seqId)
        if (predRowIdx === undefined) return
        const predFt = flatTasks[predRowIdx]
        if (!predFt) return

        const predStartDate = predFt.task.startDate ? new Date(predFt.task.startDate as unknown as string) : null
        const predEndDate   = predFt.task.endDate   ? new Date(predFt.task.endDate   as unknown as string) : predStartDate
        const predStart = predStartDate ? dateToX(predStartDate, timeline) : null
        const predEnd   = predEndDate   ? dateToX(predEndDate,   timeline) : null
        const predRowCenter = predFt.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

        const sameRow = Math.abs(predRowCenter - succRowCenter) < 2
        let pts: string | null = null

        switch (ref.type) {
          case 'FS': {
            if (predEnd === null || succStart === null) return
            const ex = predEnd + ELBOW
            pts = sameRow
              ? `${predEnd},${predRowCenter} ${succStart},${succRowCenter}`
              : `${predEnd},${predRowCenter} ${ex},${predRowCenter} ${ex},${succRowCenter} ${succStart},${succRowCenter}`
            break
          }
          case 'SS': {
            if (predStart === null || succStart === null) return
            const ex = Math.min(predStart, succStart) - ELBOW
            pts = sameRow
              ? `${predStart},${predRowCenter} ${succStart},${succRowCenter}`
              : `${predStart},${predRowCenter} ${ex},${predRowCenter} ${ex},${succRowCenter} ${succStart},${succRowCenter}`
            break
          }
          case 'FF': {
            if (predEnd === null || succEnd === null) return
            const ex = Math.max(predEnd, succEnd) + ELBOW
            pts = sameRow
              ? `${predEnd},${predRowCenter} ${succEnd},${succRowCenter}`
              : `${predEnd},${predRowCenter} ${ex},${predRowCenter} ${ex},${succRowCenter} ${succEnd},${succRowCenter}`
            break
          }
          case 'SF': {
            if (predStart === null || succEnd === null) return
            const ex = predStart - ELBOW
            if (ex > succEnd) {
              // Clean left-exit: last segment approaches succEnd from the right → arrowhead ←
              pts = `${predStart},${predRowCenter} ${ex},${predRowCenter} ${ex},${succRowCenter} ${succEnd},${succRowCenter}`
            } else {
              // Bars overlap: wrap around the right side so arrowhead still enters from right
              const rex = Math.max(predStart, succEnd) + ELBOW
              pts = `${predStart},${predRowCenter} ${ex},${predRowCenter} ${ex},${succRowCenter} ${rex},${succRowCenter} ${succEnd},${succRowCenter}`
            }
            break
          }
        }

        if (!pts) return
        paths.push(
          <polyline
            key={`${ft.task.id}-${ref.seqId}-${ref.type}`}
            points={pts}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            markerEnd="url(#pp-arrow)"
          />
        )
      })
    })

    return paths
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Time axis — height exactly GANTT_HEADER_H to align with TaskGrid header */}
      <div
        ref={axisRef}
        className="flex-shrink-0 overflow-x-hidden border-b border-gray-200 bg-gray-50"
        style={{ height: GANTT_HEADER_H }}
      >
        <div className="relative" style={{ width: totalWidth, height: GANTT_HEADER_H }}>
          {upperTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute flex items-center overflow-hidden border-r border-gray-200 px-2 text-[11px] font-semibold text-gray-600"
              style={{ left: tick.x, width: tick.width, top: 0, height: 22 }}
            >
              {tick.label}
            </div>
          ))}
          {lowerTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center overflow-hidden border-l border-r border-gray-200 text-[10px] text-gray-500"
              style={{ left: tick.x, width: colWidth, bottom: 0, height: 32 }}
            >
              {tick.label}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div className="relative" style={{ width: totalWidth, height: totalH }}>

          {/* Grid lines */}
          {lowerTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-gray-100"
              style={{ left: tick.x, zIndex: 0 }}
            />
          ))}

          {/* Row backgrounds */}
          {flatTasks.map(ft => (
            <div
              key={ft.task.id}
              className="absolute left-0 right-0"
              style={{
                top:    ft.rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                zIndex: 1,
                background: ft.task.id === selectedTaskId
                  ? 'rgba(251,191,36,0.15)'
                  : ft.task.level === 1
                  ? 'rgba(244,121,32,0.12)'
                  : ft.task.level === 2
                  ? 'rgba(219,234,254,0.35)'
                  : ft.rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
              }}
            />
          ))}

          {/* Today line */}
          {todayX >= 0 && todayX <= totalWidth && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 border-l-2 border-dashed border-red-400"
              style={{ left: todayX, zIndex: 4 }}
            />
          )}

          {/* Bars */}
          {renderBars()}

          {/* SVG arrows — above everything, toggled by showArrows */}
          {showArrows && (
            <svg
              className="pointer-events-none absolute inset-0"
              style={{ width: totalWidth, height: totalH, zIndex: 5 }}
              aria-hidden="true"
            >
              <defs>
                <marker id="pp-arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                </marker>
              </defs>
              {renderArrows()}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
