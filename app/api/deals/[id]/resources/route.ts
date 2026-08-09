import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateResourceSchema = z.object({
  userId:          z.string().min(1),
  workstreamId:    z.string().optional(),
  roleDescription: z.string().optional(),
  allocationPct:   z.number().int().min(0).max(100).default(100),
  startDate:       z.string().datetime().optional(),
  endDate:         z.string().datetime().optional(),
})

const UpdateResourceSchema = z.object({
  workstreamId:    z.string().optional().nullable(),
  roleDescription: z.string().optional().nullable(),
  allocationPct:   z.number().int().min(0).max(100).optional(),
  startDate:       z.string().datetime().optional().nullable(),
  endDate:         z.string().datetime().optional().nullable(),
})

type CreateResourceInput = z.infer<typeof CreateResourceSchema>
type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>

// ─── GET /api/deals/[id]/resources ───────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const workstreamId = req.nextUrl.searchParams.get('workstreamId')

  try {
    const resources = await prisma.resourceAllocation.findMany({
      where: {
        dealId: params.id,
        ...(workstreamId ? { workstreamId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user:       { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        workstream: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ data: resources })
  } catch (err) {
    console.error('[GET /api/deals/[id]/resources]', err)
    return NextResponse.json({ error: 'Failed to fetch resources', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/resources ──────────────────────────────────────────

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

  let body: CreateResourceInput
  try {
    body = CreateResourceSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resourceAllocation.create({
        data: {
          dealId:          params.id,
          userId:          body.userId,
          workstreamId:    body.workstreamId,
          roleDescription: body.roleDescription,
          allocationPct:   body.allocationPct,
          startDate:       body.startDate ? new Date(body.startDate) : undefined,
          endDate:         body.endDate   ? new Date(body.endDate)   : undefined,
        },
        include: {
          user:       { select: { id: true, name: true, email: true, avatarUrl: true } },
          workstream: { select: { id: true, name: true, code: true } },
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RESOURCE_ADDED',
          entityType: 'ResourceAllocation',
          entityId:   created.id,
          detail:     JSON.stringify({ userId: body.userId, dealId: params.id, allocationPct: body.allocationPct }),
        },
      })

      return created
    })

    return NextResponse.json({ data: resource }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/resources]', err)
    return NextResponse.json({ error: 'Failed to add resource', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/resources?resourceId= ─────────────────────────────

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

  const resourceId = req.nextUrl.searchParams.get('resourceId')
  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateResourceInput
  try {
    body = UpdateResourceSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.resourceAllocation.findFirst({
      where: { id: resourceId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Resource allocation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resource = await tx.resourceAllocation.update({
        where: { id: resourceId },
        data: {
          ...(body.workstreamId    !== undefined ? { workstreamId:    body.workstreamId }                                             : {}),
          ...(body.roleDescription !== undefined ? { roleDescription: body.roleDescription }                                          : {}),
          ...(body.allocationPct   !== undefined ? { allocationPct:   body.allocationPct }                                            : {}),
          ...(body.startDate       !== undefined ? { startDate:       body.startDate ? new Date(body.startDate) : null }              : {}),
          ...(body.endDate         !== undefined ? { endDate:         body.endDate   ? new Date(body.endDate)   : null }              : {}),
        },
        include: {
          user:       { select: { id: true, name: true, email: true, avatarUrl: true } },
          workstream: { select: { id: true, name: true, code: true } },
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RESOURCE_UPDATED',
          entityType: 'ResourceAllocation',
          entityId:   resource.id,
          detail:     JSON.stringify({
            from: { allocationPct: existing.allocationPct },
            to:   { allocationPct: resource.allocationPct },
          }),
        },
      })

      return resource
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/resources]', err)
    return NextResponse.json({ error: 'Failed to update resource', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/resources?resourceId= ────────────────────────────

export async function DELETE(
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

  const resourceId = req.nextUrl.searchParams.get('resourceId')
  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.resourceAllocation.findFirst({
      where:   { id: resourceId, dealId: params.id },
      include: { user: { select: { name: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Resource allocation not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.resourceAllocation.delete({ where: { id: resourceId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RESOURCE_REMOVED',
          entityType: 'ResourceAllocation',
          entityId:   resourceId,
          detail:     JSON.stringify({ userId: existing.userId, dealId: params.id }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: resourceId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/resources]', err)
    return NextResponse.json({ error: 'Failed to remove resource', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
