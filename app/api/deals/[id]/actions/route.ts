import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LogStatus, Priority, Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateActionSchema = z.object({
  title:        z.string().min(1).max(300),
  description:  z.string().optional(),
  workstreamId: z.string().optional(),
  ownerId:      z.string().optional(),
  dueDate:      z.string().datetime().optional(),
  status:       z.nativeEnum(LogStatus).optional().default('OPEN'),
  priority:     z.nativeEnum(Priority).optional().default('MEDIUM'),
})

const UpdateActionSchema = z.object({
  title:        z.string().min(1).max(300).optional(),
  description:  z.string().optional().nullable(),
  workstreamId: z.string().optional().nullable(),
  ownerId:      z.string().optional().nullable(),
  dueDate:      z.string().datetime().optional().nullable(),
  closedAt:     z.string().datetime().optional().nullable(),
  status:       z.nativeEnum(LogStatus).optional(),
  priority:     z.nativeEnum(Priority).optional(),
})

type CreateActionInput = z.infer<typeof CreateActionSchema>
type UpdateActionInput = z.infer<typeof UpdateActionSchema>

// ─── GET /api/deals/[id]/actions ──────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status      = searchParams.get('status')      as LogStatus | null
  const ownerId     = searchParams.get('ownerId')
  const priority    = searchParams.get('priority')    as Priority | null
  const workstreamId = searchParams.get('workstreamId')

  try {
    const actions = await prisma.actionEntry.findMany({
      where: {
        dealId: params.id,
        ...(status       ? { status }       : {}),
        ...(ownerId      ? { ownerId }      : {}),
        ...(priority     ? { priority }     : {}),
        ...(workstreamId ? { workstreamId } : {}),
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return NextResponse.json({ data: actions })
  } catch (err) {
    console.error('[GET /api/deals/[id]/actions]', err)
    return NextResponse.json({ error: 'Failed to fetch actions', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/actions ─────────────────────────────────────────────

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

  let body: CreateActionInput
  try {
    body = CreateActionSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const action = await prisma.$transaction(async (tx) => {
      const created = await tx.actionEntry.create({
        data: {
          dealId:       params.id,
          title:        body.title,
          description:  body.description,
          workstreamId: body.workstreamId,
          ownerId:      body.ownerId,
          dueDate:      body.dueDate ? new Date(body.dueDate) : undefined,
          status:       body.status,
          priority:     body.priority,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'ACTION_CREATED',
          entityType: 'ActionEntry',
          entityId:   created.id,
          detail:     JSON.stringify({ title: body.title, priority: body.priority }),
        },
      })

      return created
    })

    return NextResponse.json({ data: action }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/actions]', err)
    return NextResponse.json({ error: 'Failed to create action', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/actions?actionId= ─────────────────────────────────

export async function PATCH(
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

  const actionId = req.nextUrl.searchParams.get('actionId')
  if (!actionId) {
    return NextResponse.json({ error: 'actionId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateActionInput
  try {
    body = UpdateActionSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.actionEntry.findFirst({
      where: { id: actionId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Action not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const action = await tx.actionEntry.update({
        where: { id: actionId },
        data: {
          ...(body.title        !== undefined ? { title:        body.title }                                                             : {}),
          ...(body.description  !== undefined ? { description:  body.description }                                                       : {}),
          ...(body.workstreamId !== undefined ? { workstreamId: body.workstreamId }                                                      : {}),
          ...(body.ownerId      !== undefined ? { ownerId:      body.ownerId }                                                           : {}),
          ...(body.dueDate      !== undefined ? { dueDate:      body.dueDate   ? new Date(body.dueDate)   : null }                       : {}),
          ...(body.closedAt     !== undefined ? { closedAt:     body.closedAt  ? new Date(body.closedAt)  : null }                       : {}),
          ...(body.status       !== undefined ? { status:       body.status }                                                            : {}),
          ...(body.priority     !== undefined ? { priority:     body.priority }                                                          : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'ACTION_UPDATED',
          entityType: 'ActionEntry',
          entityId:   action.id,
          detail:     JSON.stringify({ from: { status: existing.status }, to: { status: action.status } }),
        },
      })

      return action
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/actions]', err)
    return NextResponse.json({ error: 'Failed to update action', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/actions?actionId= ────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  const actionId = req.nextUrl.searchParams.get('actionId')
  if (!actionId) {
    return NextResponse.json({ error: 'actionId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.actionEntry.findFirst({
      where: { id: actionId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Action not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.actionEntry.delete({ where: { id: actionId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'ACTION_DELETED',
          entityType: 'ActionEntry',
          entityId:   actionId,
          detail:     JSON.stringify({ title: existing.title, status: existing.status }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: actionId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/actions]', err)
    return NextResponse.json({ error: 'Failed to delete action', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
