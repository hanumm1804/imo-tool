'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  BarChart3, Activity, Flag, Users2, TrendingUp, ChevronDown, X,
} from 'lucide-react'
import { useDeals } from '@/hooks/useDeals'
import { useCrossDealSynergy } from '@/hooks/useSynergy'
import { useCrossDealResources } from '@/hooks/useResources'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { RAGChip } from '@/components/shared/RAGChip'
import { PeopleTasksPanel } from '@/components/shared/PeopleTasksPanel'
import { DealStatus, RAGStatus } from '@/types'
import { PHASE_LABELS } from '@/components/shared/PhaseStepper'
import type { DealListItem } from '@/hooks/useDeals'

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = 'synergy' | 'health' | 'tollgate' | 'resource'

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'synergy',  label: 'Cross-Deal Synergy',  icon: TrendingUp },
  { key: 'health',   label: 'Health Dashboard',    icon: Activity   },
  { key: 'tollgate', label: 'Tollgate Tracker',    icon: Flag       },
  { key: 'resource', label: 'Resource Allocation', icon: Users2     },
]

// ─── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DealStatus, string> = {
  PRE_CLOSE:  'Pre-Close',
  ACTIVE:     'Active',
  ON_HOLD:    'On Hold',
  CLOSED:     'Closed',
  CANCELLED:  'Cancelled',
}

// ─── MultiSelect dropdown ─────────────────────────────────────────────────────

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  label,
}: {
  options:     { value: string; label: string }[]
  selected:    Set<string>
  onChange:    (next: Set<string>) => void
  placeholder: string
  label:       string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  const buttonLabel =
    selected.size === 0
      ? placeholder
      : selected.size === 1
        ? (options.find((o) => selected.has(o.value))?.label ?? `1 selected`)
        : `${selected.size} selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)] ${
          selected.size > 0
            ? 'border-[var(--fsl-dark-blue)] bg-[var(--fsl-dark-blue)] text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <span className={`text-xs font-medium ${selected.size > 0 ? 'text-white/80' : 'text-gray-400'}`}>
          {label}:
        </span>
        <span className="font-medium">{buttonLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''} ${selected.size > 0 ? 'text-white/70' : 'text-gray-400'}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => onChange(new Set())}
                className="flex items-center gap-1 text-xs text-[var(--fsl-bright-blue)] hover:underline"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--fsl-dark-blue)]"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatM(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function ragBar(value: number, max: number, rag: RAGStatus): React.ReactNode {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color =
    rag === RAGStatus.RED   ? 'bg-[var(--status-red)]'   :
    rag === RAGStatus.AMBER ? 'bg-[var(--status-amber)]' :
    rag === RAGStatus.GREEN ? 'bg-[var(--status-green)]' :
    'bg-gray-300'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-gray-500">{value}</span>
    </div>
  )
}

// ─── Tab: Cross-Deal Synergy ──────────────────────────────────────────────────

function SynergyTab({ deals }: { deals: DealListItem[] }) {
  const { data: synergySummaries = {} } = useCrossDealSynergy()

  const rows = useMemo(() =>
    deals
      .filter((d) => d.status !== DealStatus.ON_HOLD && d.status !== DealStatus.CANCELLED)
      .map((d) => {
        const s = synergySummaries[d.id]
        return {
          deal:               d,
          baseline:           s?.totalBaseline           ?? 0,
          committed:          s?.totalCommitted          ?? 0,
          realised:           s?.totalRealised           ?? 0,
          headcountReduced:   s?.headcountReduced        ?? 0,
          headcountPeople:    s?.headcountPeopleExpense  ?? 0,
          headcountOther:     s?.headcountOtherExpense   ?? 0,
        }
      })
      .sort((a, b) => a.deal.name.localeCompare(b.deal.name)),
    [deals, synergySummaries]
  )

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      baseline:         acc.baseline         + r.baseline,
      committed:        acc.committed        + r.committed,
      realised:         acc.realised         + r.realised,
      headcountReduced: acc.headcountReduced + r.headcountReduced,
      headcountCost:    acc.headcountCost    + r.headcountPeople + r.headcountOther,
    }),
    { baseline: 0, committed: 0, realised: 0, headcountReduced: 0, headcountCost: 0 }
  ), [rows])

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total Synergy Baseline', value: formatM(totals.baseline)         },
          { label: 'Total Committed',        value: formatM(totals.committed)        },
          { label: 'Total Realised',         value: formatM(totals.realised)         },
          { label: 'Total HC Reduced',       value: String(totals.headcountReduced) + ' FTEs' },
          { label: 'HC Cost Reduction',      value: formatM(totals.headcountCost)    },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-[var(--fsl-dark-blue)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-deal table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[var(--fsl-dark-blue)] text-white">
            <tr>
              {['Deal', 'Status', 'Baseline', 'Committed', 'Realised', 'Capture %', 'HC Reduced', 'HC Cost'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => {
              const capturePct = row.baseline > 0 ? Math.round((row.realised / row.baseline) * 100) : 0
              const cfg: Record<string, string> = {
                PRE_CLOSE:  'bg-gray-100 text-gray-600',
                ACTIVE:     'bg-green-100 text-green-700',
                ON_HOLD:    'bg-amber-100 text-amber-700',
                CLOSED:     'bg-blue-100 text-blue-700',
                CANCELLED:  'bg-rose-100 text-rose-700',
              }
              const statusClass = cfg[row.deal.status] ?? 'bg-gray-100 text-gray-600'

              return (
                <tr key={row.deal.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3">
                    <Link href={`/deals/${row.deal.id}/synergy-tracker`} className="font-medium text-[var(--fsl-dark-blue)] hover:underline text-sm">
                      {row.deal.name}
                    </Link>
                    <p className="text-xs text-gray-400">{row.deal.acquiredCompanyName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                      {row.deal.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatM(row.baseline)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatM(row.committed)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatM(row.realised)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="w-24 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full bg-[var(--status-green)]" style={{ width: `${capturePct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{capturePct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                    {row.headcountReduced > 0 ? row.headcountReduced : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {(row.headcountPeople + row.headcountOther) > 0 ? formatM(row.headcountPeople + row.headcountOther) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Health Dashboard ────────────────────────────────────────────────────

function HealthTab({ deals }: { deals: DealListItem[] }) {
  const maxTasks    = Math.max(...deals.map((d) => d._count.tasks), 1)
  const maxRisks    = Math.max(...deals.map((d) => d._count.riskEntries), 1)
  const maxActions  = Math.max(...deals.map((d) => d._count.actionEntries), 1)

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">RAG bars represent volume relative to portfolio maximum.</p>
      <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[var(--fsl-dark-blue)] text-white">
            <tr>
              {['Deal', 'RAG', 'Tasks', 'Open Risks', 'Open Actions', 'Last Updated'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {[...deals]
              .sort((a, b) => {
                const ro: Record<RAGStatus, number> = { RED: 0, AMBER: 1, GREEN: 2, GRAY: 3 }
                return ro[a.overallRag] - ro[b.overallRag]
              })
              .map((deal) => (
                <tr key={deal.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-[var(--fsl-dark-blue)] hover:underline text-sm">
                      {deal.name}
                    </Link>
                    <p className="text-xs text-gray-400">{deal.acquiredCompanyName}</p>
                  </td>
                  <td className="px-4 py-3"><RAGChip rag={deal.overallRag} /></td>
                  <td className="px-4 py-3 w-32">{ragBar(deal._count.tasks, maxTasks, deal.overallRag)}</td>
                  <td className="px-4 py-3 w-32">{ragBar(deal._count.riskEntries, maxRisks, deal.overallRag)}</td>
                  <td className="px-4 py-3 w-32">{ragBar(deal._count.actionEntries, maxActions, deal.overallRag)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(deal.updatedAt), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Tollgate Tracker ────────────────────────────────────────────────────

function TollgateTab({ deals }: { deals: DealListItem[] }) {
  const phaseEntries = Object.entries(PHASE_LABELS).map(([num, name]) => ({
    phaseNum: Number(num),
    name: `Phase ${num} — ${name}`,
  }))

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      {/* Header: deals as columns */}
      <div
        className="grid border-b border-gray-200 bg-[var(--fsl-dark-blue)] text-white text-xs font-medium"
        style={{ gridTemplateColumns: `220px repeat(${deals.length}, 1fr)` }}
      >
        <div className="px-4 py-3">Phase</div>
        {deals.map((d) => (
          <div key={d.id} className="px-3 py-3 truncate" title={d.name}>
            {d.name}
          </div>
        ))}
      </div>

      {/* Phase rows */}
      {phaseEntries.map(({ phaseNum, name }, idx) => (
        <div
          key={phaseNum}
          className={`grid border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-[var(--fsl-gray)]'}`}
          style={{ gridTemplateColumns: `220px repeat(${deals.length}, 1fr)` }}
        >
          <div className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{name}</div>
          {deals.map((deal) => {
            // Mirror exactly the PhaseStepper circle colours:
            //   phase < currentPhase  → dark blue (COMPLETE) → "Completed"
            //   phase === currentPhase → orange  (IN_PROGRESS) → "Active"
            //   phase > currentPhase  → gray    (NOT_STARTED) → dot
            const isTerminal = deal.status === DealStatus.CLOSED || deal.status === DealStatus.CANCELLED
            const isComplete = deal.status === DealStatus.CLOSED || phaseNum < deal.currentPhase
            const isActive   = !isTerminal && phaseNum === deal.currentPhase

            return (
              <div key={deal.id} className="flex items-center justify-center px-3 py-3">
                {isComplete ? (
                  <span className="rounded-full bg-[var(--fsl-dark-blue)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Completed
                  </span>
                ) : isActive ? (
                  <span className="rounded-full bg-[var(--fsl-orange)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Active
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" aria-label="Not started" />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Resource Allocation ─────────────────────────────────────────────────

function ResourceTab({ deals }: { deals: DealListItem[] }) {
  const totalResources = deals.reduce((s, d) => s + d._count.resourceAllocations, 0)
  const maxResources   = Math.max(...deals.map((d) => d._count.resourceAllocations), 1)
  const { data: crossDealPeople = [], isLoading: peopleLoading } = useCrossDealResources()

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total People Allocated</p>
          <p className="mt-1 text-2xl font-bold text-[var(--fsl-dark-blue)]">{totalResources}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Active Deals</p>
          <p className="mt-1 text-2xl font-bold text-[var(--fsl-dark-blue)]">
            {deals.filter((d) => d.status === DealStatus.ACTIVE).length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Avg People / Deal</p>
          <p className="mt-1 text-2xl font-bold text-[var(--fsl-dark-blue)]">
            {deals.length > 0 ? Math.round(totalResources / deals.length) : 0}
          </p>
        </div>
      </div>

      {/* Per-deal table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[var(--fsl-dark-blue)] text-white">
            <tr>
              {['Deal', 'Status', 'People', 'Allocation Bar'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {[...deals]
              .sort((a, b) => b._count.resourceAllocations - a._count.resourceAllocations)
              .map((deal) => {
                const pct = Math.min(100, (deal._count.resourceAllocations / maxResources) * 100)
                return (
                  <tr key={deal.id} className="hover:bg-blue-50">
                    <td className="px-4 py-3">
                      <Link href={`/deals/${deal.id}/resources`} className="font-medium text-[var(--fsl-dark-blue)] hover:underline text-sm">
                        {deal.name}
                      </Link>
                      <p className="text-xs text-gray-400">{deal.acquiredCompanyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{deal.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                      {deal._count.resourceAllocations}
                    </td>
                    <td className="px-4 py-3 w-64">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 rounded-full bg-gray-100">
                          <div
                            className="h-3 rounded-full bg-[var(--fsl-dark-blue)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Cross-deal people table + bar chart */}
      <section aria-labelledby="reports-people-heading">
        <h2 id="reports-people-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          People — Task Overview
        </h2>
        {peopleLoading ? (
          <SkeletonLoader variant="table" rows={4} />
        ) : crossDealPeople.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            No people allocated across any deal yet.
          </p>
        ) : (
          <PeopleTasksPanel people={crossDealPeople} />
        )}
      </section>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: deals, isLoading } = useDeals()
  const [activeTab,        setActiveTab]        = useState<TabKey>('synergy')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [selectedDealIds,  setSelectedDealIds]  = useState<Set<string>>(new Set())

  const allDeals = deals ?? []

  const statusOptions = useMemo(
    () => (Object.entries(STATUS_LABELS) as [DealStatus, string][]).map(([value, label]) => ({ value, label })),
    []
  )

  const dealOptions = useMemo(
    () => allDeals.map((d) => ({ value: d.id, label: d.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [allDeals]
  )

  const filteredDeals = useMemo(() => {
    let result = allDeals
    if (selectedStatuses.size > 0) {
      result = result.filter((d) => selectedStatuses.has(d.status))
    }
    if (selectedDealIds.size > 0) {
      result = result.filter((d) => selectedDealIds.has(d.id))
    }
    return result
  }, [allDeals, selectedStatuses, selectedDealIds])

  const hasFilters = selectedStatuses.size > 0 || selectedDealIds.size > 0

  function resetFilters() {
    setSelectedStatuses(new Set())
    setSelectedDealIds(new Set())
  }

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={6} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Portfolio-level analytics
          {hasFilters
            ? ` — ${filteredDeals.length} of ${allDeals.length} deals`
            : ` across ${allDeals.length} deals`}
        </p>
      </div>

      {/* Universal filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Filter</span>
        <MultiSelect
          label="Status"
          placeholder="All Statuses"
          options={statusOptions}
          selected={selectedStatuses}
          onChange={setSelectedStatuses}
        />
        <MultiSelect
          label="Deal"
          placeholder="All Deals"
          options={dealOptions}
          selected={selectedDealIds}
          onChange={setSelectedDealIds}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Report tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-[var(--fsl-dark-blue)] text-[var(--fsl-dark-blue)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'synergy'  && <SynergyTab  deals={filteredDeals} />}
        {activeTab === 'health'   && <HealthTab   deals={filteredDeals} />}
        {activeTab === 'tollgate' && <TollgateTab deals={filteredDeals} />}
        {activeTab === 'resource' && <ResourceTab deals={filteredDeals} />}
      </div>
    </div>
  )
}
