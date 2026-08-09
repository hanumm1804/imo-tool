import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'
import type { Prisma } from '@prisma/client'

// ─── GET /api/admin/audit ─────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const userId     = searchParams.get('userId')
  const action     = searchParams.get('action')
  const entityType = searchParams.get('entityType')
  const entityId   = searchParams.get('entityId')
  const dealId     = searchParams.get('dealId')
  const dateFrom   = searchParams.get('dateFrom')
  const dateTo     = searchParams.get('dateTo')
  const cursor     = searchParams.get('cursor')
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 200)

  try {
    const where: Prisma.AppAuditLogWhereInput = {
      ...(userId     ? { userId }     : {}),
      ...(dealId     ? { dealId }     : {}),
      ...(action     ? { action: { contains: action } } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId   ? { entityId }   : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
            },
          }
        : {}),
    }

    const logs = await prisma.appAuditLog.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    })

    const hasMore    = logs.length > limit
    const items      = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({ data: { items, nextCursor } })
  } catch (err) {
    console.error('[GET /api/admin/audit]', err)
    return NextResponse.json({ error: 'Failed to fetch audit log', code: 'FETCH_ERROR' }, { status: 500 })
  }
}
