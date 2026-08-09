import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

const QuickAddSchema = z.object({
  name: z.string().min(1).max(200).trim(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role === Role.VIEWER) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: { name: string }
  try {
    body = QuickAddSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0]!.message : 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const deal = await prisma.deal.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unique placeholder email — not used for login
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const email  = `resource-${suffix}@placeholder.local`

      const user = await tx.user.create({
        data: { name: body.name, email, role: Role.VIEWER },
      })

      await tx.resourceAllocation.create({
        data: { dealId: params.id, userId: user.id, allocationPct: 100 },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RESOURCE_QUICK_ADDED',
          entityType: 'User',
          entityId:   user.id,
          detail:     JSON.stringify({ name: body.name }),
        },
      })

      return user
    })

    return NextResponse.json({ data: { id: result.id, name: result.name } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/resources/quick-add]', err)
    return NextResponse.json({ error: 'Failed to create resource', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
