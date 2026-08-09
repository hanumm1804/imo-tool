import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RAGStatus, Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateWorkstreamSchema = z.object({
  code:        z.string().min(1).max(10),
  name:        z.string().min(1).max(200),
  description: z.string().optional(),
  fslLeadId:   z.string().optional(),
})

const UpdateWorkstreamSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  fslLeadId:   z.string().optional().nullable(),
  isActive:    z.boolean().optional(),
  rag:         z.nativeEnum(RAGStatus).optional(),
})

type CreateWorkstreamInput = z.infer<typeof CreateWorkstreamSchema>
type UpdateWorkstreamInput = z.infer<typeof UpdateWorkstreamSchema>

// ─── GET /api/deals/[id]/workstreams ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const workstreams = await prisma.workstream.findMany({
      where:   { dealId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        fslLead: { select: { id: true, name: true, avatarUrl: true } },
        _count: {
          select: {
            tasks:     { where: { status: 'NOT_STARTED' } },
            resources: true,
          },
        },
      },
    })

    // Augment each workstream with full task count summary
    const workstreamIds = workstreams.map(w => w.id)
    const taskCounts = await prisma.task.groupBy({
      by:     ['workstreamId', 'status'],
      where:  { workstreamId: { in: workstreamIds } },
      _count: { id: true },
    })

    const countMap = new Map<string, Record<string, number>>()
    for (const row of taskCounts) {
      if (!countMap.has(row.workstreamId)) countMap.set(row.workstreamId, {})
      countMap.get(row.workstreamId)![row.status] = row._count.id
    }

    const enriched = workstreams.map(ws => ({
      ...ws,
      taskSummary: countMap.get(ws.id) ?? {},
    }))

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('[GET /api/deals/[id]/workstreams]', err)
    return NextResponse.json({ error: 'Failed to fetch workstreams', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/workstreams ─────────────────────────────────────────

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

  let body: CreateWorkstreamInput
  try {
    body = CreateWorkstreamSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const workstream = await prisma.$transaction(async (tx) => {
      const created = await tx.workstream.create({
        data: {
          dealId:      params.id,
          code:        body.code,
          name:        body.name,
          description: body.description,
          fslLeadId:   body.fslLeadId,
          isCustom:    true,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'WORKSTREAM_CREATED',
          entityType: 'Workstream',
          entityId:   created.id,
          detail:     JSON.stringify({ dealId: params.id, code: body.code, name: body.name }),
        },
      })

      return created
    })

    return NextResponse.json({ data: workstream }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/workstreams]', err)
    return NextResponse.json({ error: 'Failed to create workstream', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/workstreams?workstreamId= ─────────────────────────

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

  const workstreamId = req.nextUrl.searchParams.get('workstreamId')
  if (!workstreamId) {
    return NextResponse.json({ error: 'workstreamId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateWorkstreamInput
  try {
    body = UpdateWorkstreamSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.workstream.findFirst({
      where: { id: workstreamId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Workstream not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ws = await tx.workstream.update({
        where: { id: workstreamId },
        data: {
          ...(body.name        !== undefined ? { name:        body.name }        : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.fslLeadId   !== undefined ? { fslLeadId:   body.fslLeadId }   : {}),
          ...(body.isActive    !== undefined ? { isActive:    body.isActive }    : {}),
          ...(body.rag         !== undefined ? { rag:         body.rag }         : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'WORKSTREAM_UPDATED',
          entityType: 'Workstream',
          entityId:   ws.id,
          detail:     JSON.stringify({ from: { isActive: existing.isActive, fslLeadId: existing.fslLeadId }, to: { isActive: ws.isActive, fslLeadId: ws.fslLeadId } }),
        },
      })

      return ws
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/workstreams]', err)
    return NextResponse.json({ error: 'Failed to update workstream', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/workstreams?workstreamId= ─────────────────────────

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

  const workstreamId = req.nextUrl.searchParams.get('workstreamId')
  if (!workstreamId) {
    return NextResponse.json({ error: 'workstreamId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.workstream.findFirst({
      where: { id: workstreamId, dealId: params.id },
      include: {
        _count: { select: { tasks: true, resources: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Workstream not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (existing._count.tasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete workstream with existing tasks', code: 'HAS_TASKS' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.workstream.delete({ where: { id: workstreamId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'WORKSTREAM_DELETED',
          entityType: 'Workstream',
          entityId:   workstreamId,
          detail:     JSON.stringify({ code: existing.code, name: existing.name }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: workstreamId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/workstreams]', err)
    return NextResponse.json({ error: 'Failed to delete workstream', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
