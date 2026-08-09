import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── GET /api/reports/synergy-summary ────────────────────────────────────────
// Returns aggregated synergy + headcount totals grouped by dealId.

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any

    const [synergyGrouped, headcountGrouped] = await Promise.all([
      prisma.synergyLine.groupBy({
        by: ['dealId'],
        _sum: { baselineUSD: true, committedUSD: true, realisedUSD: true },
      }),
      prismaAny.headcountLine.groupBy({
        by: ['dealId'],
        _sum: { headcountReduced: true, peopleExpenseUSD: true, otherExpenseUSD: true },
      }),
    ])

    const synergyMap = new Map(synergyGrouped.map((g) => [g.dealId, g]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hcMap = new Map((headcountGrouped as any[]).map((h) => [h.dealId, h]))

    const allDealIds = new Set([
      ...synergyGrouped.map((g) => g.dealId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(headcountGrouped as any[]).map((h) => h.dealId),
    ])

    const data = Array.from(allDealIds).map((dealId) => {
      const s = synergyMap.get(dealId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = hcMap.get(dealId) as any
      return {
        dealId,
        totalBaseline:          s?._sum.baselineUSD  ?? 0,
        totalCommitted:         s?._sum.committedUSD ?? 0,
        totalRealised:          s?._sum.realisedUSD  ?? 0,
        headcountReduced:       h?._sum.headcountReduced  ?? 0,
        headcountPeopleExpense: h?._sum.peopleExpenseUSD  ?? 0,
        headcountOtherExpense:  h?._sum.otherExpenseUSD   ?? 0,
      }
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/reports/synergy-summary]', err)
    return NextResponse.json({ error: 'Failed to fetch synergy summaries', code: 'FETCH_ERROR' }, { status: 500 })
  }
}
