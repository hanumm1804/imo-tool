import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cascadeRagUpdate } from '@/lib/rag'
import { Priority, RAGStatus, Role, TaskStatus } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateTaskSchema = z.object({
  workstreamId: z.string().min(1),
  parentId:     z.string().optional().nullable(),
  wbsNumber:    z.string().optional().nullable(),
  level:        z.number().int().min(1).max(20),
  title:        z.string().min(1).max(300),
  description:  z.string().optional().nullable(),
  status:       z.nativeEnum(TaskStatus).optional().default('NOT_STARTED'),
  rag:          z.nativeEnum(RAGStatus).optional().default('GRAY'),
  priority:     z.nativeEnum(Priority).optional().default('MEDIUM'),
  ownerId:      z.string().optional().nullable(),
  startDate:    z.string().datetime().optional().nullable(),
  endDate:      z.string().datetime().optional().nullable(),
  durationDays: z.number().int().min(0).optional().nullable(),
  percentDone:  z.number().int().min(0).max(100).optional().default(0),
  phaseNumber:  z.number().int().min(1).optional().nullable(),
  dependsOnId:  z.string().optional().nullable(),
  sortOrder:    z.number().int().min(0).optional().default(0),
})

const UpdateTaskSchema = z.object({
  title:        z.string().min(1).max(300).optional(),
  description:  z.string().optional().nullable(),
  status:       z.nativeEnum(TaskStatus).optional(),
  rag:          z.nativeEnum(RAGStatus).optional(),
  priority:     z.nativeEnum(Priority).optional(),
  ownerId:      z.string().optional().nullable(),
  workstreamId: z.string().min(1).optional(),
  parentId:     z.string().optional().nullable(),
  level:        z.number().int().min(1).max(20).optional(),
  startDate:    z.string().datetime().optional().nullable(),
  endDate:      z.string().datetime().optional().nullable(),
  durationDays: z.number().int().min(0).optional().nullable(),
  percentDone:  z.number().int().min(0).max(100).optional(),
  phaseNumber:  z.number().int().min(1).optional().nullable(),
  dependsOnId:  z.string().optional().nullable(),
  completedAt:  z.string().datetime().optional().nullable(),
  sortOrder:    z.number().int().min(0).optional(),
  wbsNumber:    z.string().optional().nullable(),
})

type CreateTaskInput = z.infer<typeof CreateTaskSchema>
type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

// ─── GET /api/deals/[id]/tasks ────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const workstreamId = searchParams.get('workstreamId')
  const parentId     = searchParams.get('parentId')
  const cursor       = searchParams.get('cursor')
  const limit        = Math.min(Number(searchParams.get('limit') ?? 100), 500)

  try {
    const tasks = await prisma.task.findMany({
      where: {
        dealId:      params.id,
        ...(workstreamId ? { workstreamId } : {}),
        ...(parentId === 'null' ? { parentId: null } : parentId ? { parentId } : {}),
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      include: {
        owner:      { select: { id: true, name: true, avatarUrl: true } },
        workstream: { select: { id: true, name: true, code: true } },
        children:   { select: { id: true, title: true, status: true, rag: true, level: true } },
        _count:     { select: { children: true } },
      },
    })

    const hasMore    = tasks.length > limit
    const items      = hasMore ? tasks.slice(0, limit) : tasks
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({ data: { items, nextCursor } })
  } catch (err) {
    console.error('[GET /api/deals/[id]/tasks]', err)
    return NextResponse.json({ error: 'Failed to fetch tasks', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/tasks ───────────────────────────────────────────────

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

  let body: CreateTaskInput
  try {
    body = CreateTaskSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    // Auto-calculate sortOrder based on sibling count
    const siblingCount = await prisma.task.count({
      where: {
        dealId:       params.id,
        workstreamId: body.workstreamId,
        parentId:     body.parentId ?? null,
        level:        body.level,
      },
    })

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          dealId:       params.id,
          workstreamId: body.workstreamId,
          parentId:     body.parentId,
          wbsNumber:    body.wbsNumber,
          level:        body.level,
          title:        body.title,
          description:  body.description,
          status:       body.status,
          rag:          body.rag,
          priority:     body.priority,
          ownerId:      body.ownerId,
          startDate:    body.startDate    ? new Date(body.startDate)  : undefined,
          endDate:      body.endDate      ? new Date(body.endDate)    : undefined,
          durationDays: body.durationDays,
          percentDone:  body.percentDone,
          phaseNumber:  body.phaseNumber,
          dependsOnId:  body.dependsOnId,
          sortOrder:    body.sortOrder ?? siblingCount,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'TASK_CREATED',
          entityType: 'Task',
          entityId:   created.id,
          detail:     JSON.stringify({ title: body.title, workstreamId: body.workstreamId, level: body.level }),
        },
      })

      return created
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/tasks]', err)
    return NextResponse.json({ error: 'Failed to create task', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

function businessDaysBetween(from: Date, to: Date): number {
  const f = new Date(from); f.setHours(0, 0, 0, 0)
  const t = new Date(to);   t.setHours(0, 0, 0, 0)
  let count = 0
  const cur = new Date(f)
  while (cur < t) {
    cur.setDate(cur.getDate() + 1)
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
  }
  return count
}

// ─── PATCH /api/deals/[id]/tasks?taskId= ─────────────────────────────────────

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

  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) {
    return NextResponse.json({ error: 'taskId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateTaskInput
  try {
    body = UpdateTaskSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Auto-derive status and RAG from percentDone whenever it is included in the update
    if (body.percentDone !== undefined) {
      const pct   = body.percentDone
      const now   = new Date()
      const effEnd: Date | null = body.endDate !== undefined
        ? (body.endDate ? new Date(body.endDate) : null)
        : existing.endDate
      const effStart: Date | null = body.startDate !== undefined
        ? (body.startDate ? new Date(body.startDate) : null)
        : existing.startDate

      if (pct === 100) {
        body.status = TaskStatus.COMPLETE
        body.rag    = RAGStatus.GREEN
      } else if (pct > 0) {
        body.status = TaskStatus.IN_PROGRESS
        if (effEnd && effEnd < now) {
          body.rag = RAGStatus.RED
        } else if (pct < 50 && effEnd) {
          const diffDays = businessDaysBetween(now, effEnd)
          body.rag = diffDays <= 2 ? RAGStatus.AMBER : RAGStatus.GREEN
        } else {
          body.rag = RAGStatus.GREEN
        }
      } else {
        // pct === 0: only override if start date is in the future (NOT_STARTED exempt)
        if (effStart && effStart > now) {
          body.status = TaskStatus.NOT_STARTED
          body.rag    = RAGStatus.GRAY
        } else if (effEnd && effEnd < now) {
          body.rag = RAGStatus.RED
        } else {
          body.rag = RAGStatus.GREEN
        }
      }
    }

    // If RAG is changing, use cascadeRagUpdate (handles the whole hierarchy)
    const ragChanging = body.rag !== undefined && body.rag !== existing.rag

    if (ragChanging) {
      await cascadeRagUpdate(taskId, body.rag!)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(body.title        !== undefined ? { title:        body.title }                                                     : {}),
          ...(body.description  !== undefined ? { description:  body.description }                                               : {}),
          ...(body.status       !== undefined ? { status:       body.status }                                                    : {}),
          ...(body.rag          !== undefined && !ragChanging ? { rag: body.rag }                                                : {}),
          ...(body.priority     !== undefined ? { priority:     body.priority }                                                  : {}),
          ...(body.ownerId      !== undefined ? { ownerId:      body.ownerId }                                                   : {}),
          ...(body.workstreamId !== undefined ? { workstreamId: body.workstreamId }                                              : {}),
          ...(body.parentId     !== undefined ? { parentId:     body.parentId }                                                  : {}),
          ...(body.level        !== undefined ? { level:        body.level }                                                     : {}),
          ...(body.startDate    !== undefined ? { startDate:    body.startDate    ? new Date(body.startDate)    : null }         : {}),
          ...(body.endDate      !== undefined ? { endDate:      body.endDate      ? new Date(body.endDate)      : null }         : {}),
          ...(body.durationDays !== undefined ? { durationDays: body.durationDays }                                              : {}),
          ...(body.percentDone  !== undefined ? { percentDone:  body.percentDone }                                               : {}),
          ...(body.phaseNumber  !== undefined ? { phaseNumber:  body.phaseNumber }                                               : {}),
          ...(body.dependsOnId  !== undefined ? { dependsOnId:  body.dependsOnId }                                               : {}),
          ...(body.completedAt  !== undefined ? { completedAt:  body.completedAt  ? new Date(body.completedAt)  : null }         : {}),
          ...(body.sortOrder    !== undefined ? { sortOrder:    body.sortOrder }                                                  : {}),
          ...(body.wbsNumber    !== undefined ? { wbsNumber:    body.wbsNumber }                                                 : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'TASK_UPDATED',
          entityType: 'Task',
          entityId:   task.id,
          detail:     JSON.stringify({ from: { status: existing.status, rag: existing.rag }, to: { status: task.status, rag: task.rag } }),
        },
      })

      return task
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/tasks]', err)
    return NextResponse.json({ error: 'Failed to update task', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/tasks?taskId=&cascade=true ───────────────────────

async function collectDescendantIds(dealId: string, rootId: string): Promise<string[]> {
  const ids: string[] = [rootId]
  async function recurse(parentId: string) {
    const children = await prisma.task.findMany({
      where:  { dealId, parentId },
      select: { id: true },
    })
    for (const c of children) {
      ids.push(c.id)
      await recurse(c.id)
    }
  }
  await recurse(rootId)
  return ids
}

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

  const taskId  = req.nextUrl.searchParams.get('taskId')
  const cascade = req.nextUrl.searchParams.get('cascade') === 'true'
  if (!taskId) {
    return NextResponse.json({ error: 'taskId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.task.findFirst({
      where:   { id: taskId, dealId: params.id },
      include: { _count: { select: { children: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (existing._count.children > 0 && !cascade) {
      return NextResponse.json(
        { error: 'Task has subtasks — use cascade=true to delete all', code: 'HAS_CHILDREN' },
        { status: 409 }
      )
    }

    if (cascade && existing._count.children > 0) {
      // Collect all descendant IDs, delete leaves first (sort by depth desc)
      const allIds = await collectDescendantIds(params.id, taskId)
      // Delete in reverse order (children before parents) to satisfy FK
      const tasks = await prisma.task.findMany({
        where:  { id: { in: allIds } },
        select: { id: true, level: true },
        orderBy: { level: 'desc' },
      })
      await prisma.$transaction(async (tx) => {
        for (const t of tasks) {
          await tx.task.delete({ where: { id: t.id } })
        }
        await tx.appAuditLog.create({
          data: {
            dealId:     params.id,
            userId:     session.user.id,
            action:     'TASK_DELETED',
            entityType: 'Task',
            entityId:   taskId,
            detail:     JSON.stringify({ title: existing.title, level: existing.level, cascadeCount: tasks.length }),
          },
        })
      })
      return NextResponse.json({ data: { deleted: true, id: taskId, cascadeCount: tasks.length } })
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } })
      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'TASK_DELETED',
          entityType: 'Task',
          entityId:   taskId,
          detail:     JSON.stringify({ title: existing.title, level: existing.level }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: taskId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/tasks]', err)
    return NextResponse.json({ error: 'Failed to delete task', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
