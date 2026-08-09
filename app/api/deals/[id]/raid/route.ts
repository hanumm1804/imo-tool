import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LogStatus, Priority, RAIDType, Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateRAIDSchema = z.object({
  type:         z.nativeEnum(RAIDType),
  title:        z.string().min(1).max(300),
  description:  z.string().optional(),
  workstreamId: z.string().optional(),
  status:       z.nativeEnum(LogStatus).optional().default('OPEN'),
  priority:     z.nativeEnum(Priority).optional().default('MEDIUM'),
  ownerId:      z.string().optional(),
  dueDate:      z.string().datetime().optional(),
})

const UpdateRAIDSchema = z.object({
  type:         z.nativeEnum(RAIDType).optional(),
  title:        z.string().min(1).max(300).optional(),
  description:  z.string().optional().nullable(),
  workstreamId: z.string().optional().nullable(),
  status:       z.nativeEnum(LogStatus).optional(),
  priority:     z.nativeEnum(Priority).optional(),
  ownerId:      z.string().optional().nullable(),
  dueDate:      z.string().datetime().optional().nullable(),
  resolvedAt:   z.string().datetime().optional().nullable(),
})

type CreateRAIDInput = z.infer<typeof CreateRAIDSchema>
type UpdateRAIDInput = z.infer<typeof UpdateRAIDSchema>

// ─── GET /api/deals/[id]/raid ─────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type         = searchParams.get('type')    as RAIDType | null
  const status       = searchParams.get('status')  as LogStatus | null
  const ownerId      = searchParams.get('ownerId')
  const workstreamId = searchParams.get('workstreamId')

  try {
    const entries = await prisma.rAIDEntry.findMany({
      where: {
        dealId: params.id,
        ...(type         ? { type }         : {}),
        ...(status       ? { status }       : {}),
        ...(ownerId      ? { ownerId }      : {}),
        ...(workstreamId ? { workstreamId } : {}),
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return NextResponse.json({ data: entries })
  } catch (err) {
    console.error('[GET /api/deals/[id]/raid]', err)
    return NextResponse.json({ error: 'Failed to fetch RAID entries', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/raid ────────────────────────────────────────────────

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

  let body: CreateRAIDInput
  try {
    body = CreateRAIDSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.rAIDEntry.create({
        data: {
          dealId:       params.id,
          type:         body.type,
          title:        body.title,
          description:  body.description,
          workstreamId: body.workstreamId,
          status:       body.status,
          priority:     body.priority,
          ownerId:      body.ownerId,
          dueDate:      body.dueDate ? new Date(body.dueDate) : undefined,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RAID_ENTRY_CREATED',
          entityType: 'RAIDEntry',
          entityId:   created.id,
          detail:     JSON.stringify({ type: body.type, title: body.title }),
        },
      })

      return created
    })

    return NextResponse.json({ data: entry }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/raid]', err)
    return NextResponse.json({ error: 'Failed to create RAID entry', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/raid?raidId= ──────────────────────────────────────

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

  const raidId = req.nextUrl.searchParams.get('raidId')
  if (!raidId) {
    return NextResponse.json({ error: 'raidId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateRAIDInput
  try {
    body = UpdateRAIDSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.rAIDEntry.findFirst({
      where: { id: raidId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'RAID entry not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const entry = await tx.rAIDEntry.update({
        where: { id: raidId },
        data: {
          ...(body.type         !== undefined ? { type:         body.type }                                                          : {}),
          ...(body.title        !== undefined ? { title:        body.title }                                                         : {}),
          ...(body.description  !== undefined ? { description:  body.description }                                                   : {}),
          ...(body.workstreamId !== undefined ? { workstreamId: body.workstreamId }                                                  : {}),
          ...(body.status       !== undefined ? { status:       body.status }                                                        : {}),
          ...(body.priority     !== undefined ? { priority:     body.priority }                                                      : {}),
          ...(body.ownerId      !== undefined ? { ownerId:      body.ownerId }                                                       : {}),
          ...(body.dueDate      !== undefined ? { dueDate:      body.dueDate    ? new Date(body.dueDate)    : null }                  : {}),
          ...(body.resolvedAt   !== undefined ? { resolvedAt:   body.resolvedAt ? new Date(body.resolvedAt) : null }                  : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RAID_ENTRY_UPDATED',
          entityType: 'RAIDEntry',
          entityId:   entry.id,
          detail:     JSON.stringify({ from: { status: existing.status }, to: { status: entry.status } }),
        },
      })

      return entry
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/raid]', err)
    return NextResponse.json({ error: 'Failed to update RAID entry', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/raid?raidId= ─────────────────────────────────────

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

  const raidId = req.nextUrl.searchParams.get('raidId')
  if (!raidId) {
    return NextResponse.json({ error: 'raidId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.rAIDEntry.findFirst({
      where: { id: raidId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'RAID entry not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.rAIDEntry.delete({ where: { id: raidId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RAID_ENTRY_DELETED',
          entityType: 'RAIDEntry',
          entityId:   raidId,
          detail:     JSON.stringify({ type: existing.type, title: existing.title }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: raidId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/raid]', err)
    return NextResponse.json({ error: 'Failed to delete RAID entry', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
