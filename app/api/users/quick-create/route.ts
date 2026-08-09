import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

const Schema = z.object({
  name: z.string().min(1).max(200).trim(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role === Role.VIEWER) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: { name: string }
  try {
    body = Schema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0]!.message : 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email  = `person-${suffix}@placeholder.local`

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email, role: Role.VIEWER, isActive: true },
        select: { id: true, name: true },
      })

      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'USER_QUICK_CREATED',
          entityType: 'User',
          entityId:   created.id,
          detail:     JSON.stringify({ name: body.name }),
        },
      })

      return created
    })

    return NextResponse.json({ data: { id: user.id, name: user.name } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users/quick-create]', err)
    return NextResponse.json({ error: 'Failed to create person', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
