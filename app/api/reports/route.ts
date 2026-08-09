import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'
import type { Prisma } from '@prisma/client'

// ─── GET /api/reports?type=synergy|health|tollgate|resources&dealIds[]= ───────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')

  const dealIdParams = searchParams.getAll('dealIds[]')
  const dealIds = dealIdParams.length > 0 ? dealIdParams : undefined

  if (!type || !['synergy', 'health', 'tollgate', 'resources'].includes(type)) {
    return NextResponse.json(
      { error: 'type must be one of: synergy, health, tollgate, resources', code: 'INVALID_PARAM' },
      { status: 400 }
    )
  }

  try {
    // Base deal filter — VIEWER only sees deals they have access to
    const dealWhere: Prisma.DealWhereInput = {
      ...(dealIds ? { id: { in: dealIds } } : {}),
      ...(session.user.role === Role.VIEWER
        ? {
            OR: [
              { sensitiveAccessList: { none: {} } },
              { sensitiveAccessList: { some: { userId: session.user.id } } },
            ],
          }
        : {}),
    }

    // ── Synergy report ──────────────────────────────────────────────────────
    if (type === 'synergy') {
      const deals = await prisma.deal.findMany({
        where: dealWhere,
        select: {
          id:                  true,
          name:                true,
          acquiredCompanyName: true,
          synergyLines: {
            select: {
              baselineUSD:         true,
              committedUSD:        true,
              realisedUSD:         true,
              benefitsFunnelStage: true,
            },
          },
        },
      })

      const report = deals.map(deal => {
        const lines = deal.synergyLines
        const toNum = (v: unknown) => (v != null && typeof (v as { toNumber?: () => number }).toNumber === 'function'
          ? (v as { toNumber: () => number }).toNumber()
          : Number(v ?? 0))

        const totalBaseline  = lines.reduce((s, l) => s + toNum(l.baselineUSD),  0)
        const totalCommitted = lines.reduce((s, l) => s + toNum(l.committedUSD), 0)
        const totalRealised  = lines.reduce((s, l) => s + toNum(l.realisedUSD),  0)
        const variancePct    = totalBaseline > 0
          ? ((totalRealised - totalBaseline) / totalBaseline) * 100
          : 0

        return {
          dealId:   deal.id,
          dealName: deal.name,
          dealCode: deal.acquiredCompanyName,
          totalBaseline,
          totalCommitted,
          totalRealised,
          variancePct: Math.round(variancePct * 100) / 100,
          lineCount:   lines.length,
        }
      })

      return NextResponse.json({ data: report })
    }

    // ── Health (RAG matrix) report ──────────────────────────────────────────
    if (type === 'health') {
      const deals = await prisma.deal.findMany({
        where: dealWhere,
        select: {
          id:                  true,
          name:                true,
          acquiredCompanyName: true,
          overallRag:          true,
          workstreams: {
            where:   { isActive: true },
            select:  { id: true, name: true, code: true, rag: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      return NextResponse.json({ data: deals })
    }

    // ── Tollgate report ─────────────────────────────────────────────────────
    if (type === 'tollgate') {
      const phases = await prisma.dealPhase.findMany({
        where: {
          deal:             dealWhere,
          tollgateComplete: false,
          plannedEndDate:   { not: null },
        },
        orderBy: { plannedEndDate: 'asc' },
        select: {
          id:           true,
          phaseNumber:  true,
          phaseName:    true,
          tollgateComplete: true,
          plannedEndDate:   true,
          actualEndDate:    true,
          dealId:           true,
          deal: {
            select: { id: true, name: true, acquiredCompanyName: true },
          },
          tollgateItems: {
            select: {
              id:          true,
              label:       true,
              isComplete:  true,
              isMandatory: true,
            },
          },
        },
      })

      const now = new Date()
      const report = phases.map(phase => {
        const isOverdue         = phase.plannedEndDate != null && phase.plannedEndDate < now
        const mandatoryTotal    = phase.tollgateItems.filter(tg => tg.isMandatory).length
        const mandatoryComplete = phase.tollgateItems.filter(tg => tg.isMandatory && tg.isComplete).length

        return {
          ...phase,
          isOverdue,
          mandatoryTotal,
          mandatoryComplete,
          completionPct: mandatoryTotal > 0
            ? Math.round((mandatoryComplete / mandatoryTotal) * 100)
            : 0,
        }
      })

      return NextResponse.json({ data: report })
    }

    // ── Resources report ────────────────────────────────────────────────────
    if (type === 'resources') {
      const deals = await prisma.deal.findMany({
        where: dealWhere,
        select: {
          id:                  true,
          name:                true,
          acquiredCompanyName: true,
          resourceAllocations: {
            select: {
              id:              true,
              roleDescription: true,
              allocationPct:   true,
              workstreamId:    true,
              user: { select: { id: true, name: true, role: true } },
            },
          },
        },
      })

      const report = deals.map(deal => ({
        dealId:          deal.id,
        dealName:        deal.name,
        dealCode:        deal.acquiredCompanyName,
        resourceCount:   deal.resourceAllocations.length,
        totalAllocation: deal.resourceAllocations.reduce((s, r) => s + (r.allocationPct ?? 0), 0),
        avgAllocation:   deal.resourceAllocations.length > 0
          ? Math.round(
              deal.resourceAllocations.reduce((s, r) => s + (r.allocationPct ?? 0), 0) /
              deal.resourceAllocations.length
            )
          : 0,
        byWorkstream: deal.resourceAllocations.reduce<Record<string, number>>((acc, r) => {
          const key = r.workstreamId ?? 'unassigned'
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      }))

      return NextResponse.json({ data: report })
    }

    return NextResponse.json({ error: 'Unhandled report type', code: 'INTERNAL_ERROR' }, { status: 500 })
  } catch (err) {
    console.error('[GET /api/reports]', err)
    return NextResponse.json({ error: 'Failed to generate report', code: 'REPORT_ERROR' }, { status: 500 })
  }
}
