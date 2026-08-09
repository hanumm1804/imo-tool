import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PersonStat } from '@/hooks/useResources'

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const [uniqueAllocations, taskGroups] = await Promise.all([
      prisma.resourceAllocation.findMany({
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.task.groupBy({
        by: ['ownerId', 'rag', 'status'],
        where: { ownerId: { not: null } },
        _count: { id: true },
      }),
    ])

    const userIds = uniqueAllocations.map(r => r.userId)

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    type StatAccum = Omit<PersonStat, 'userId' | 'name'>
    const statsMap = new Map<string, StatAccum>()

    function emptyStats(): StatAccum {
      return {
        totalTasks: 0, redTasks: 0, amberTasks: 0, greenTasks: 0,
        completedTasks: 0, notStartedTasks: 0,
        barRed: 0, barAmber: 0, barGreen: 0,
        barCompleted: 0, barNotStarted: 0, barOther: 0,
      }
    }

    for (const row of taskGroups) {
      if (!row.ownerId) continue
      if (!statsMap.has(row.ownerId)) statsMap.set(row.ownerId, emptyStats())
      const s = statsMap.get(row.ownerId)!
      const n = row._count.id

      s.totalTasks += n
      if (row.rag    === 'RED')          s.redTasks        += n
      if (row.rag    === 'AMBER')        s.amberTasks      += n
      if (row.rag    === 'GREEN')        s.greenTasks      += n
      if (row.status === 'COMPLETE')     s.completedTasks  += n
      if (row.status === 'NOT_STARTED')  s.notStartedTasks += n

      if      (row.status === 'COMPLETE')     s.barCompleted  += n
      else if (row.status === 'NOT_STARTED')  s.barNotStarted += n
      else if (row.rag    === 'RED')          s.barRed        += n
      else if (row.rag    === 'AMBER')        s.barAmber      += n
      else if (row.rag    === 'GREEN')        s.barGreen      += n
      else                                    s.barOther      += n
    }

    const people: PersonStat[] = users.map(u => ({
      userId: u.id,
      name:   u.name,
      ...(statsMap.get(u.id) ?? emptyStats()),
    }))

    return NextResponse.json({ data: { people } })
  } catch (err) {
    console.error('[GET /api/reports/resources]', err)
    return NextResponse.json({ error: 'Failed to fetch resource stats', code: 'FETCH_ERROR' }, { status: 500 })
  }
}
