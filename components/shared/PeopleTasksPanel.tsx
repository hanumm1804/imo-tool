'use client'

import React, { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { PersonStat } from '@/hooks/useResources'

export type { PersonStat }

type StatusFilter = 'ALL' | 'RED' | 'AMBER' | 'GREEN' | 'COMPLETED' | 'NOT_STARTED'

interface FilterPill {
  key:           StatusFilter
  label:         string
  activeClass:   string
  inactiveClass: string
  countKey?:     keyof Pick<PersonStat, 'redTasks' | 'amberTasks' | 'greenTasks' | 'completedTasks' | 'notStartedTasks'>
}

const FILTER_PILLS: FilterPill[] = [
  { key: 'ALL',         label: 'All',         activeClass: 'bg-[var(--fsl-dark-blue)] text-white', inactiveClass: 'bg-gray-100 text-gray-600' },
  { key: 'RED',         label: 'RED',         activeClass: 'bg-red-500 text-white',    inactiveClass: 'bg-red-50 text-red-700 border border-red-200',       countKey: 'redTasks' },
  { key: 'AMBER',       label: 'AMBER',       activeClass: 'bg-amber-500 text-white',  inactiveClass: 'bg-amber-50 text-amber-700 border border-amber-200', countKey: 'amberTasks' },
  { key: 'GREEN',       label: 'GREEN',       activeClass: 'bg-green-500 text-white',  inactiveClass: 'bg-green-50 text-green-700 border border-green-200', countKey: 'greenTasks' },
  { key: 'COMPLETED',   label: 'Completed',   activeClass: 'bg-[var(--fsl-dark-blue)] text-white', inactiveClass: 'bg-blue-50 text-blue-800 border border-blue-200', countKey: 'completedTasks' },
  { key: 'NOT_STARTED', label: 'Not Started', activeClass: 'bg-gray-500 text-white',   inactiveClass: 'bg-gray-100 text-gray-600 border border-gray-300',   countKey: 'notStartedTasks' },
]

interface BarSegment {
  key:       keyof PersonStat
  color:     string
  filter:    StatusFilter
  label:     string
  clickable: boolean
}

const BAR_SEGMENTS: BarSegment[] = [
  { key: 'barCompleted',  color: '#1e3a5f', filter: 'COMPLETED',   label: 'Completed',   clickable: true },
  { key: 'barNotStarted', color: '#94a3b8', filter: 'NOT_STARTED', label: 'Not Started', clickable: true },
  { key: 'barRed',        color: '#ef4444', filter: 'RED',         label: 'RED',         clickable: true },
  { key: 'barAmber',      color: '#f59e0b', filter: 'AMBER',       label: 'AMBER',       clickable: true },
  { key: 'barGreen',      color: '#22c55e', filter: 'GREEN',       label: 'GREEN',       clickable: true },
  { key: 'barOther',      color: '#d1d5db', filter: 'ALL',         label: 'Other',       clickable: false },
]

export interface PeopleTasksPanelProps {
  people:    PersonStat[]
  canEdit?:  boolean
  onEdit?:   (userId: string) => void
  onDelete?: (userId: string) => void
}

export function PeopleTasksPanel({ people, canEdit, onEdit, onDelete }: PeopleTasksPanelProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL')

  function toggleFilter(key: StatusFilter) {
    setActiveFilter(prev => prev === key ? 'ALL' : key)
  }

  const filteredPeople = activeFilter === 'ALL'
    ? people
    : people.filter(p => {
        const pill = FILTER_PILLS.find(fp => fp.key === activeFilter)
        return pill?.countKey ? (p[pill.countKey] as number) > 0 : true
      })

  const maxTasks = Math.max(...people.map(p => p.totalTasks), 1)

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Filter:</span>
        {FILTER_PILLS.map(pill => (
          <button
            key={pill.key}
            onClick={() => toggleFilter(pill.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === pill.key ? pill.activeClass : pill.inactiveClass
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* People table */}
      {filteredPeople.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No people match this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                <th className="px-4 py-3 text-xs font-medium">Person</th>
                <th className="px-4 py-3 text-xs font-medium">Total Tasks</th>
                <th className="px-4 py-3 text-xs font-medium text-red-300">RED</th>
                <th className="px-4 py-3 text-xs font-medium text-amber-300">AMBER</th>
                <th className="px-4 py-3 text-xs font-medium text-green-300">GREEN</th>
                <th className="px-4 py-3 text-xs font-medium">Completed</th>
                <th className="px-4 py-3 text-xs font-medium">Not Started</th>
                {canEdit && <th className="px-4 py-3 text-xs font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPeople.map((p, idx) => (
                <tr key={p.userId} className={idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{p.name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{p.totalTasks}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600">{p.redTasks > 0 ? p.redTasks : '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-amber-600">{p.amberTasks > 0 ? p.amberTasks : '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{p.greenTasks > 0 ? p.greenTasks : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.completedTasks > 0 ? p.completedTasks : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.notStartedTasks > 0 ? p.notStartedTasks : '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit?.(p.userId)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onDelete?.(p.userId)}
                          className="rounded-md p-1.5 text-[var(--status-red)] hover:bg-red-50"
                          aria-label={`Remove ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bar chart */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Task Distribution per Person
        </h3>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            {BAR_SEGMENTS.filter(s => s.clickable).map(seg => {
              const isActive = activeFilter === seg.filter
              const dimmed = activeFilter !== 'ALL' && !isActive
              return (
                <button
                  key={seg.key}
                  onClick={() => toggleFilter(seg.filter)}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-opacity"
                  style={{ opacity: dimmed ? 0.4 : 1 }}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  {seg.label}
                </button>
              )
            })}
          </div>

          {/* Horizontal stacked bars */}
          {people.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No data to display.</p>
          ) : (
            <div className="space-y-2.5">
              {people.map(p => {
                if (p.totalTasks === 0) return null
                const barWidthPct = (p.totalTasks / maxTasks) * 100
                return (
                  <div key={p.userId} className="flex items-center gap-3">
                    <div className="w-28 flex-shrink-0 truncate text-right text-xs text-gray-600" title={p.name}>
                      {p.name}
                    </div>
                    <div className="flex-1 h-5 rounded overflow-hidden bg-gray-50 border border-gray-100">
                      <div style={{ width: `${barWidthPct}%`, height: '100%', display: 'flex' }}>
                        {BAR_SEGMENTS.map(seg => {
                          const count = p[seg.key] as number
                          if (count <= 0) return null
                          const segWidthPct = (count / p.totalTasks) * 100
                          const isActive = activeFilter === seg.filter
                          const dimmed = activeFilter !== 'ALL' && !isActive && seg.clickable
                          return (
                            <div
                              key={String(seg.key)}
                              style={{
                                width:           `${segWidthPct}%`,
                                backgroundColor: seg.color,
                                opacity:         dimmed ? 0.2 : 1,
                                cursor:          seg.clickable ? 'pointer' : 'default',
                                flexShrink:      0,
                                transition:      'opacity 0.15s',
                              }}
                              onClick={seg.clickable ? () => toggleFilter(seg.filter) : undefined}
                              title={`${seg.label}: ${count}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                    <div className="w-8 flex-shrink-0 text-right text-xs text-gray-500">{p.totalTasks}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
