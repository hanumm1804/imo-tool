import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// POST /api/deals/[id]/tasks/recalc-wbs
// Recomputes wbsNumber for every task in the deal (DFS) AND propagates
// parent start/end/duration from children (bottom-up).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (session.user.role === Role.VIEWER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const tasks = await prisma.task.findMany({
      where:   { dealId: params.id },
      select:  { id: true, parentId: true, sortOrder: true, startDate: true, endDate: true, durationDays: true, level: true, wbsNumber: true },
      orderBy: { sortOrder: 'asc' },
    })

    // ─── WBS recalc (DFS) ────────────────────────────────────────────────────
    const childrenOf = new Map<string | null, typeof tasks>()
    for (const t of tasks) {
      const key = t.parentId ?? null
      if (!childrenOf.has(key)) childrenOf.set(key, [])
      childrenOf.get(key)!.push(t)
    }
    for (const [, ch] of childrenOf) {
      ch.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    const wbsMap = new Map<string, string>()
    function assignWBS(parentId: string | null, prefix: string) {
      const children = childrenOf.get(parentId) ?? []
      children.forEach((t, i) => {
        const wbs = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
        wbsMap.set(t.id, wbs)
        assignWBS(t.id, wbs)
      })
    }
    assignWBS(null, '')

    const wbsUpdates = tasks.filter(t => wbsMap.get(t.id) !== t.wbsNumber)

    // ─── Parent date propagation (bottom-up) ─────────────────────────────────
    function weekdaysBetween(start: Date, end: Date): number {
      const s = new Date(start); s.setHours(0, 0, 0, 0)
      const e = new Date(end);   e.setHours(0, 0, 0, 0)
      if (s >= e) return 0
      let count = 0; const cur = new Date(s)
      while (cur < e) {
        const d = cur.getDay()
        if (d !== 0 && d !== 6) count++
        cur.setDate(cur.getDate() + 1)
      }
      return count
    }

    // Build children-by-parent map (reuse childrenOf)
    const parentsWithChildren = tasks.filter(t => childrenOf.has(t.id))
    parentsWithChildren.sort((a, b) => b.level - a.level)   // deepest first

    type DateRec = { startDate: Date | null; endDate: Date | null; durationDays: number | null }
    const currentDates = new Map<string, DateRec>(
      tasks.map(t => [t.id, { startDate: t.startDate, endDate: t.endDate, durationDays: t.durationDays }])
    )

    const dateUpdates: Array<DateRec & { id: string }> = []

    for (const parent of parentsWithChildren) {
      const children = childrenOf.get(parent.id) ?? []
      const starts = children.map(c => currentDates.get(c.id)?.startDate).filter((d): d is Date => d != null)
      const ends   = children.map(c => currentDates.get(c.id)?.endDate).filter((d): d is Date => d != null)
      if (!starts.length) continue

      const minStart = new Date(Math.min(...starts.map(d => d.getTime())))
      const maxEnd   = ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null
      const duration = maxEnd ? weekdaysBetween(minStart, maxEnd) : null
      const cur      = currentDates.get(parent.id)!

      if (minStart.getTime() !== cur.startDate?.getTime() ||
          maxEnd?.getTime()  !== cur.endDate?.getTime()   ||
          duration           !== cur.durationDays) {
        currentDates.set(parent.id, { startDate: minStart, endDate: maxEnd, durationDays: duration })
        dateUpdates.push({ id: parent.id, startDate: minStart, endDate: maxEnd, durationDays: duration })
      }
    }

    // ─── SortOrder normalization (0, 1, 2, … within each sibling group) ────────
    const sortOrderMap = new Map<string, number>()
    function assignSortOrders(parentId: string | null) {
      const children = childrenOf.get(parentId) ?? []
      children.forEach((t, i) => {
        sortOrderMap.set(t.id, i)
        assignSortOrders(t.id)
      })
    }
    assignSortOrders(null)
    const sortOrderUpdates = tasks.filter(t => sortOrderMap.has(t.id) && sortOrderMap.get(t.id) !== t.sortOrder)

    // ─── Batch DB writes ─────────────────────────────────────────────────────
    const ops = [
      ...wbsUpdates.map(t =>
        prisma.task.update({ where: { id: t.id }, data: { wbsNumber: wbsMap.get(t.id) ?? null } })
      ),
      ...dateUpdates.map(u =>
        prisma.task.update({ where: { id: u.id }, data: { startDate: u.startDate, endDate: u.endDate, durationDays: u.durationDays } })
      ),
      ...sortOrderUpdates.map(t =>
        prisma.task.update({ where: { id: t.id }, data: { sortOrder: sortOrderMap.get(t.id)! } })
      ),
    ]
    if (ops.length > 0) await prisma.$transaction(ops)

    return NextResponse.json({ data: { wbsUpdated: wbsUpdates.length, datesPropagated: dateUpdates.length, sortOrderNormalized: sortOrderUpdates.length, total: tasks.length } })
  } catch (err) {
    console.error('[POST /api/deals/[id]/tasks/recalc-wbs]', err)
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 })
  }
}
