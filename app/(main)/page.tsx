import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { KPICard } from '@/components/dashboard/KPICard'
import { DealCard } from '@/components/dashboard/DealCard'
import { EscalationBanner } from '@/components/dashboard/EscalationBanner'
import { DealFilterClient } from '@/components/dashboard/DealFilterClient'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, Activity, TrendingUp, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { RAGStatus, DealStatus } from '@/types'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }

// Re-fetch every 60 s via ISR on the server; client revalidates via React Query
export const revalidate = 60

async function getDashboardData() {
  const [deals, synergyAgg, openRisks, tollgatesDue] = await Promise.all([
    prisma.deal.findMany({
      include: {
        imoLead: { select: { id: true, name: true, avatarUrl: true } },
        phases: {
          orderBy: { phaseNumber: 'asc' },
          select:  { phaseNumber: true, status: true, plannedStartDate: true, plannedEndDate: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.synergyLine.aggregate({
      _sum: { baselineUSD: true, realisedUSD: true },
    }),
    prisma.riskEntry.count({
      where: { status: 'OPEN' },
    }),
    prisma.dealPhase.count({
      where: {
        tollgateComplete: false,
        deal: { status: DealStatus.ACTIVE },
      },
    }),
  ])

  const totalDeals      = deals.length
  const activeDeals     = deals.filter((d) => d.status === DealStatus.ACTIVE).length
  const dealsRed        = deals.filter((d) => d.overallRag === RAGStatus.RED).length
  const synergyBaseline = synergyAgg._sum.baselineUSD ?? 0
  const synergyRealised = synergyAgg._sum.realisedUSD ?? 0

  return {
    deals,
    kpis: {
      totalDeals,
      activeDeals,
      dealsRed,
      synergyBaseline,
      synergyRealised,
      tollgatesDue,
      openRisks,
    },
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { deals, kpis } = await getDashboardData()

  const kpiCards = [
    {
      title:    'Total Deals',
      value:    kpis.totalDeals,
      subtitle: `${kpis.activeDeals} active`,
      icon:     <Activity className="h-5 w-5" aria-hidden="true" />,
      variant:  'default' as const,
    },
    {
      title:    'Synergy Baseline $M',
      value:    `$${(kpis.synergyBaseline / 1_000_000).toFixed(1)}M`,
      subtitle: `$${(kpis.synergyRealised / 1_000_000).toFixed(1)}M realised`,
      icon:     <TrendingUp className="h-5 w-5" aria-hidden="true" />,
      variant:  'default' as const,
    },
    {
      title:    'Open Risks',
      value:    kpis.openRisks,
      subtitle: 'Across all deals',
      icon:     <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
      variant:  kpis.openRisks > 10 ? 'warning' as const : 'default' as const,
    },
    {
      title:    'Tollgates Due',
      value:    kpis.tollgatesDue,
      subtitle: 'Next 7 days',
      icon:     <CheckCircle className="h-5 w-5" aria-hidden="true" />,
      variant:  kpis.tollgatesDue > 5 ? 'warning' as const : 'default' as const,
    },
    {
      title:    'RED Deals',
      value:    kpis.dealsRed,
      subtitle: 'Require attention',
      icon:     <BarChart3 className="h-5 w-5" aria-hidden="true" />,
      variant:  kpis.dealsRed > 0 ? 'danger' as const : 'default' as const,
    },
  ]

  // Serialise Decimal fields before passing to client components
  const serialisedDeals = deals.map((d) => {
    const inProgress   = d.phases.find(p => p.status === 'IN_PROGRESS')
    const lastComplete = [...d.phases].reverse().find(p => p.status === 'COMPLETE')
    return {
      id:                  d.id,
      name:                d.name,
      acquiredCompanyName: d.acquiredCompanyName,
      status:              d.status,
      overallRag:          d.overallRag,
      currentPhase:        inProgress?.phaseNumber ?? lastComplete?.phaseNumber ?? 1,
      acquisitionDate:     d.acquisitionDate?.toISOString() ?? null,
      updatedAt:           d.updatedAt.toISOString(),
      projectStartDate:    d.phases.find((p) => p.phaseNumber === 1)?.plannedStartDate?.toISOString() ?? null,
      projectEndDate:      d.phases.find((p) => p.phaseNumber === 6)?.plannedEndDate?.toISOString() ?? null,
      imoLead:             d.imoLead
        ? { id: d.imoLead.id, name: d.imoLead.name, avatarUrl: d.imoLead.avatarUrl }
        : null,
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Escalation banner */}
      {kpis.dealsRed > 0 && (
        <div className="mb-6">
          <EscalationBanner redDealCount={kpis.dealsRed} />
        </div>
      )}

      {/* Page header */}
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${session.user.name}`}
        actions={
          <Link
            href="/deals/new"
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--fsl-orange)] focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Create</span>
            New Deal
          </Link>
        }
      />

      {/* KPI row */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <h2 id="kpi-heading" className="sr-only">Key performance indicators</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {kpiCards.map((card) => (
            <KPICard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* Deal grid with client-side filter */}
      <section aria-labelledby="deals-heading">
        <DealFilterClient deals={serialisedDeals} />
      </section>
    </div>
  )
}
