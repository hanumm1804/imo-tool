import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const AddExistingSchema = z.object({
  mode:   z.literal('add-existing'),
  userId: z.string().min(1),
})

const CreateNewSchema = z.object({
  mode:     z.literal('create-new'),
  name:     z.string().min(1).max(200).trim(),
  email:    z.string().email().max(255).toLowerCase(),
  password: z.string().min(8),
})

const PostSchema = z.discriminatedUnion('mode', [AddExistingSchema, CreateNewSchema])

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireEditor(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { error: 'Unauthorised', status: 401 } as const
  if (session.user.role === Role.VIEWER) return { error: 'Forbidden', status: 403 } as const
  return { session } as const
}

// ─── GET /api/deals/[id]/team ─────────────────────────────────────────────────
// Returns Build Team members: ResourceAllocations with a real (non-placeholder) user

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const allocations = await prisma.resourceAllocation.findMany({
      where: {
        dealId: params.id,
        user:   { NOT: { email: { endsWith: '@placeholder.local' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id:        true,
        createdAt: true,
        user: {
          select: {
            id:            true,
            name:          true,
            email:         true,
            role:          true,
            isDealTeamOnly: true,
            isActive:      true,
          },
        },
      },
    })

    return NextResponse.json({ data: allocations })
  } catch (err) {
    console.error('[GET /api/deals/[id]/team]', err)
    return NextResponse.json({ error: 'Failed to fetch team', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/team ────────────────────────────────────────────────
// Two modes:
//   add-existing: add an existing user to this deal's team
//   create-new:   create a new deal-team-only VIEWER + add to this deal

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireEditor(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' }, { status: auth.status })
  }
  const { session } = auth

  let body: z.infer<typeof PostSchema>
  try {
    body = PostSchema.parse(await req.json())
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

    if (body.mode === 'add-existing') {
      const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, name: true, email: true } })
      if (!user) {
        return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })
      }

      const existing = await prisma.resourceAllocation.findFirst({
        where: { dealId: params.id, userId: body.userId },
      })
      if (existing) {
        return NextResponse.json({ error: 'User is already on this deal\'s team', code: 'DUPLICATE' }, { status: 409 })
      }

      const allocation = await prisma.$transaction(async (tx) => {
        const alloc = await tx.resourceAllocation.create({
          data: { dealId: params.id, userId: body.userId, allocationPct: 100 },
          select: { id: true, createdAt: true },
        })

        await tx.appAuditLog.create({
          data: {
            dealId:     params.id,
            userId:     session.user.id,
            action:     'TEAM_MEMBER_ADDED',
            entityType: 'User',
            entityId:   body.userId,
            detail:     JSON.stringify({ userId: body.userId, mode: 'existing' }),
          },
        })

        return alloc
      })

      return NextResponse.json({ data: { allocationId: allocation.id } }, { status: 201 })
    }

    // create-new mode
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json({ error: 'A user with that email already exists', code: 'DUPLICATE_EMAIL' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:           body.name,
          email:          body.email,
          passwordHash,
          role:           Role.VIEWER,
          isDealTeamOnly: true,
          isActive:       true,
        },
        select: { id: true, name: true, email: true },
      })

      const alloc = await tx.resourceAllocation.create({
        data: { dealId: params.id, userId: user.id, allocationPct: 100 },
        select: { id: true },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'TEAM_MEMBER_CREATED',
          entityType: 'User',
          entityId:   user.id,
          detail:     JSON.stringify({ name: user.name, email: user.email }),
        },
      })

      return { user, allocationId: alloc.id }
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/team]', err)
    return NextResponse.json({ error: 'Failed to add team member', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/team?allocationId= ───────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const auth = await requireEditor(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error, code: auth.status === 401 ? 'UNAUTHORISED' : 'FORBIDDEN' }, { status: auth.status })
  }
  const { session } = auth

  const allocationId = req.nextUrl.searchParams.get('allocationId')
  if (!allocationId) {
    return NextResponse.json({ error: 'allocationId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const allocation = await prisma.resourceAllocation.findUnique({
      where: { id: allocationId },
      select: { id: true, dealId: true, userId: true },
    })

    if (!allocation || allocation.dealId !== params.id) {
      return NextResponse.json({ error: 'Allocation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.resourceAllocation.delete({ where: { id: allocationId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'TEAM_MEMBER_REMOVED',
          entityType: 'ResourceAllocation',
          entityId:   allocationId,
          detail:     JSON.stringify({ userId: allocation.userId }),
        },
      })
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/team]', err)
    return NextResponse.json({ error: 'Failed to remove team member', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
