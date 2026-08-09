'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { format, isBefore, addDays, isAfter } from 'date-fns'
import { AlertTriangle, CheckSquare, TrendingUp, CheckCircle, Clock, ExternalLink, BookOpen, Download } from 'lucide-react'
import Link from 'next/link'
import { useDeal } from '@/hooks/useDeal'
import { useTasks } from '@/hooks/useTasks'
import { useRisks } from '@/hooks/useLogs'
import { useDecisions } from '@/hooks/useLogs'
import { useActions } from '@/hooks/useLogs'
import { useSynergyLines } from '@/hooks/useSynergy'
import { useHeadcount } from '@/hooks/useHeadcount'
import { RAGChip } from '@/components/shared/RAGChip'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { RAGStatus, PhaseStatus, DealStatus, LogStatus } from '@/types'

// ─── Phase Stepper ────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<PhaseStatus, string> = {
  NOT_STARTED: 'bg-gray-200 text-gray-500',
  IN_PROGRESS: 'bg-[var(--fsl-orange)] text-white',
  COMPLETE:    'bg-[var(--fsl-dark-blue)] text-white',
}

function PhaseStepper({ phases }: { phases: Array<{ phaseNumber: number; phaseName: string; status: PhaseStatus }> }) {
  if (!phases.length) return null
  const sorted = [...phases].sort((a, b) => a.phaseNumber - b.phaseNumber)

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {sorted.map((phase, idx) => (
        <div key={phase.phaseNumber} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${PHASE_COLORS[phase.status]}`}
              title={phase.phaseName}
            >
              {phase.status === PhaseStatus.COMPLETE ? (
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
              ) : phase.status === PhaseStatus.IN_PROGRESS ? (
                <span className="h-2 w-2 rounded-full bg-white" />
              ) : (
                phase.phaseNumber
              )}
            </div>
            <span className="mt-1 w-20 break-words text-center text-xs font-medium leading-tight text-gray-500 uppercase">
              {phase.phaseName}
            </span>
          </div>
          {idx < sorted.length - 1 && (
            <div
              className={`mx-1 h-0.5 w-8 flex-shrink-0 ${
                sorted[idx + 1].status !== PhaseStatus.NOT_STARTED
                  ? 'bg-[var(--fsl-dark-blue)]'
                  : 'bg-gray-200'
              }`}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon, variant = 'default' }: {
  label:    string
  value:    number | string
  icon:     React.ReactNode
  variant?: 'default' | 'warning' | 'danger'
}) {
  const variantClass = {
    default: 'border-gray-200',
    warning: 'border-amber-300 bg-amber-50',
    danger:  'border-red-300 bg-red-50',
  }[variant]

  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${variantClass}`}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-[var(--fsl-dark-blue)]">{value}</p>
    </div>
  )
}

// ─── Deal Status Badge ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DealStatus, string> = {
  PRE_CLOSE:  'bg-purple-100 text-purple-700',
  ACTIVE:     'bg-green-100 text-green-700',
  ON_HOLD:    'bg-amber-100 text-amber-700',
  CLOSED:     'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-rose-100 text-rose-700',
}

// ─── Synergy Snapshot ─────────────────────────────────────────────────────────

function SynergySnapshot({ dealId }: { dealId: string }) {
  const { data: lines, isLoading } = useSynergyLines(dealId)

  if (isLoading) return <SkeletonLoader variant="card" />

  const baseline  = (lines ?? []).reduce((s, l) => s + (Number(l.baselineUSD)  || 0), 0)
  const committed = (lines ?? []).reduce((s, l) => s + (Number(l.committedUSD) || 0), 0)
  const realised  = (lines ?? []).reduce((s, l) => s + (Number(l.realisedUSD)  || 0), 0)

  return (
    <section aria-labelledby="es-synergy-snapshot-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id="es-synergy-snapshot-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Synergy Snapshot
        </h2>
        <Link
          href={`/deals/${dealId}/synergy-tracker`}
          className="flex items-center gap-1 text-sm text-[var(--fsl-bright-blue)] hover:underline"
        >
          View Full Tracker
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 py-4">
        {[
          { label: 'Baseline',  value: baseline,  color: 'text-[var(--fsl-dark-blue)]' },
          { label: 'Committed', value: committed, color: 'text-[var(--fsl-orange)]'     },
          { label: 'Realised',  value: realised,  color: 'text-[var(--status-green)]'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-8 py-2 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>
              ${(value / 1_000_000).toFixed(1)}M
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Headcount Snapshot ───────────────────────────────────────────────────────

function HeadcountSnapshot({ dealId }: { dealId: string }) {
  const { data: hcData, isLoading } = useHeadcount(dealId)

  if (isLoading) return <SkeletonLoader variant="card" />

  const lines       = hcData?.lines ?? []
  const totalHC     = lines.reduce((s, l) => s + l.headcountReduced, 0)
  const totalPeople = lines.reduce((s, l) => s + l.peopleExpenseUSD, 0)
  const totalOther  = lines.reduce((s, l) => s + l.otherExpenseUSD,  0)
  const totalCost   = totalPeople + totalOther
  const peoplePct   = totalCost > 0 ? Math.round((totalPeople / totalCost) * 100) : 0
  const otherPct    = totalCost > 0 ? Math.round((totalOther  / totalCost) * 100) : 0

  function fmtCost(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
    return `$${Math.round(n).toLocaleString()}`
  }

  return (
    <section aria-labelledby="es-hc-snapshot-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id="es-hc-snapshot-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Headcount Reduction Snapshot
        </h2>
        <Link
          href={`/deals/${dealId}/synergy-tracker`}
          className="flex items-center gap-1 text-sm text-[var(--fsl-bright-blue)] hover:underline"
        >
          View Headcount Tab
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4 py-4">
        {[
          { label: 'Headcount Reduced', value: String(totalHC) + ' FTEs',  color: 'text-[var(--fsl-dark-blue)]',    sub: undefined },
          { label: 'True Cost Reduction', value: fmtCost(totalCost),        color: 'text-[var(--fsl-dark-blue)]',    sub: 'People + Other' },
          { label: 'People Expense',     value: fmtCost(totalPeople),       color: 'text-[var(--fsl-bright-blue)]',  sub: `${peoplePct}% of total` },
          { label: 'Other Cost',         value: fmtCost(totalOther),        color: 'text-[var(--status-green)]',     sub: `${otherPct}% of total` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="px-6 py-2 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          </div>
        ))}
      </div>
      {lines.length === 0 && (
        <div className="px-6 pb-4 text-center text-xs text-gray-400">
          No headcount data recorded yet.
        </div>
      )}
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DealExecutiveSummaryPage() {
  const params = useParams<{ id: string }>()
  const dealId = params.id

  const { data: deal,      isLoading: dealLoading }      = useDeal(dealId)
  const { data: tasks,     isLoading: tasksLoading }     = useTasks(dealId)
  const { data: risks,     isLoading: risksLoading }     = useRisks(dealId, { status: LogStatus.OPEN })
  const { data: decisions, isLoading: decisionsLoading } = useDecisions(dealId)
  const { data: actions,   isLoading: actionsLoading }   = useActions(dealId, { status: 'OPEN' })

  const isLoading = dealLoading || tasksLoading || risksLoading || decisionsLoading || actionsLoading

  const kpis = useMemo(() => {
    if (!tasks) return { totalTasks: 0, tasksGreen: 0, tasksRed: 0 }
    const l3 = tasks.filter((t) => t.level === 3)
    return {
      totalTasks:  tasks.length,
      tasksGreen:  l3.filter((t) => t.rag === RAGStatus.GREEN).length,
      tasksRed:    l3.filter((t) => t.rag === RAGStatus.RED).length,
    }
  }, [tasks])

  const topRisks    = useMemo(() => {
    if (!risks) return []
    return [...risks]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 3)
  }, [risks])

  const recentDecisions = useMemo(() => (decisions ?? []).slice(0, 3), [decisions])

  const upcomingActions = useMemo(() => {
    if (!actions) return []
    const cutoff = addDays(new Date(), 7)
    return (actions ?? [])
      .filter((a) => a.dueDate && !isAfter(new Date(a.dueDate), cutoff))
      .sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, 5)
  }, [actions])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={4} />
      </div>
    )
  }

  if (!deal) {
    return (
      <EmptyState
        title="Deal not found"
        message="This deal does not exist or you do not have access."
      />
    )
  }

  const currentPhase = deal.phases.find((p) => p.status === PhaseStatus.IN_PROGRESS)

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Sticky Deal Header */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--fsl-dark-blue)]">{deal.name}</h1>
            <p className="text-sm text-gray-500">{deal.sector}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[deal.status]}`}>
            {deal.status.replace('_', ' ')}
          </span>
          <RAGChip rag={deal.overallRag} />
        </div>
        <div className="flex items-center gap-3">
          {currentPhase && (
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Current Phase</p>
              <p className="text-sm font-semibold text-[var(--fsl-dark-blue)]">{currentPhase.phaseName}</p>
            </div>
          )}
          <a
            href={`/api/deals/${dealId}/export`}
            download
            className="flex items-center gap-1.5 rounded-md border border-[var(--fsl-bright-blue)] px-3 py-1.5 text-sm font-medium text-[var(--fsl-bright-blue)] transition-colors hover:bg-[var(--fsl-bright-blue)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)] focus:ring-offset-2"
            aria-label="Export executive summary as PowerPoint"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export PPT
          </a>
        </div>
      </div>

      {/* Phase Stepper */}
      <section aria-labelledby="phases-heading">
        <h2 id="phases-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Integration Phases
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <PhaseStepper phases={deal.phases} />
        </div>
      </section>

      {/* KPI Cards */}
      <section aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">Key Metrics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <KPICard
            label="Total Tasks"
            value={kpis.totalTasks}
            icon={<CheckSquare className="h-5 w-5" aria-hidden="true" />}
          />
          <KPICard
            label="Tasks GREEN"
            value={kpis.tasksGreen}
            icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            variant="default"
          />
          <KPICard
            label="Tasks RED"
            value={kpis.tasksRed}
            icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            variant={kpis.tasksRed > 0 ? 'danger' : 'default'}
          />
        </div>
      </section>

      {/* Synergy Snapshot */}
      <SynergySnapshot dealId={dealId} />

      {/* Headcount Reduction Snapshot */}
      <HeadcountSnapshot dealId={dealId} />

      {/* Three-column layout: Top Open Risks | Open Actions | Recent Decisions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Risks */}
        <section aria-labelledby="top-risks-heading">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 id="top-risks-heading" className="flex items-center gap-2 text-base font-semibold text-[var(--fsl-dark-blue)]">
                <AlertTriangle className="h-4 w-4 text-[var(--status-red)]" aria-hidden="true" />
                Top Open Risks
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {topRisks.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No open risks</p>
              ) : (
                topRisks.map((risk, idx) => {
                  const score = risk.riskScore
                  const levelColor =
                    score <= 3 ? 'bg-red-100 text-red-700' :
                    score <= 6 ? 'bg-amber-100 text-amber-700' :
                                 'bg-green-100 text-green-700'
                  return (
                    <div key={risk.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--fsl-dark-blue)] truncate">{risk.description}</p>
                        {risk.mitigation && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{risk.mitigation}</p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${levelColor}`}>
                        Level: {score}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* Open Actions */}
        <section aria-labelledby="upcoming-actions-heading">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 id="upcoming-actions-heading" className="flex items-center gap-2 text-base font-semibold text-[var(--fsl-dark-blue)]">
                <Clock className="h-4 w-4 text-[var(--fsl-orange)]" aria-hidden="true" />
                Open Actions
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingActions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No actions due in the next 7 days</p>
              ) : (
                upcomingActions.map((action) => {
                  const isOverdue = action.dueDate && isBefore(new Date(action.dueDate), new Date())
                  const priorityColor = {
                    HIGH:   'bg-red-100 text-red-700',
                    MEDIUM: 'bg-amber-100 text-amber-700',
                    LOW:    'bg-green-100 text-green-700',
                  }[action.priority]

                  return (
                    <div key={action.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--fsl-dark-blue)] truncate">{action.title}</p>
                        {action.owner && (
                          <p className="mt-0.5 text-xs text-gray-500">Owner: {action.owner.name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {action.dueDate && (
                          <span className={`text-xs font-medium ${isOverdue ? 'text-[var(--status-red)]' : 'text-gray-500'}`}>
                            {format(new Date(action.dueDate), 'dd MMM')}
                          </span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityColor}`}>
                          {action.priority}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* Recent Decisions */}
        <section aria-labelledby="recent-decisions-heading">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 id="recent-decisions-heading" className="flex items-center gap-2 text-base font-semibold text-[var(--fsl-dark-blue)]">
                <BookOpen className="h-4 w-4 text-[var(--fsl-bright-blue)]" aria-hidden="true" />
                Recent Decisions
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentDecisions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No decisions logged yet</p>
              ) : (
                recentDecisions.map((dec) => (
                  <div key={dec.id} className="px-5 py-3">
                    <p className="text-sm font-medium text-[var(--fsl-dark-blue)]">{dec.title}</p>
                    {dec.context && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{dec.context}</p>
                    )}
                    {dec.decidedAt && (
                      <p className="mt-1 text-[10px] text-gray-400">
                        {format(new Date(dec.decidedAt), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
