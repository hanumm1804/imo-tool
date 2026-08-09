import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Priority, RAGStatus, Role, TaskStatus } from '@/types'

const ImportRowSchema = z.object({
  wbs:             z.string(),
  level:           z.number().int().min(1).max(3),
  title:           z.string().min(1).max(300),
  status:          z.string().optional(),
  rag:             z.string().optional(),
  priority:        z.string().optional(),
  startDate:       z.string().nullable().optional(),
  endDate:         z.string().nullable().optional(),
  durationDays:    z.number().nullable().optional(),
  percentDone:     z.number().min(0).max(100).optional(),
  description:     z.string().nullable().optional(),
  ownerName:       z.string().nullable().optional(),
  workstreamName:  z.string().nullable().optional(),
  dependsOnId:     z.string().nullable().optional(),
})

const ImportBodySchema = z.object({
  workstreamId: z.string().optional(),
  tasks:        z.array(ImportRowSchema).min(1).max(500),
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

  let body: z.infer<typeof ImportBodySchema>
  try {
    body = ImportBodySchema.parse(await req.json())
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid body'
    return NextResponse.json({ error: message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    const workstreams = await prisma.workstream.findMany({
      where:   { dealId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    const wsMap = new Map(workstreams.map(ws => [ws.name.toLowerCase(), ws]))

    // Auto-create any workstreams referenced in the file that don't yet exist
    const wsNamesInFile = [
      ...new Set(
        body.tasks
          .map(t => t.workstreamName?.trim())
          .filter((n): n is string => !!n)
      ),
    ]
    // Determine the next available WS code
    let wsCodeNum = workstreams.reduce((max, ws) => {
      const m = ws.code.match(/^WS(\d+)$/i)
      return m ? Math.max(max, parseInt(m[1]!, 10)) : max
    }, 0)

    for (const name of wsNamesInFile) {
      if (!wsMap.has(name.toLowerCase())) {
        wsCodeNum++
        const code  = `WS${String(wsCodeNum).padStart(2, '0')}`
        const newWs = await prisma.workstream.create({
          data: { dealId: params.id, name, code },
        })
        workstreams.push(newWs)
        wsMap.set(newWs.name.toLowerCase(), newWs)
      }
    }

    // If still no workstreams, reject
    if (!workstreams.length) {
      return NextResponse.json({ error: 'No workstreams found for this deal', code: 'NO_WORKSTREAMS' }, { status: 400 })
    }

    const defaultWs  = (body.workstreamId ? workstreams.find(ws => ws.id === body.workstreamId) : null) ?? workstreams[0]!

    const users   = await prisma.user.findMany({ select: { id: true, name: true } })
    const userMap = new Map(users.map(u => [(u.name ?? '').toLowerCase(), u.id]))

    // Generate one UUID per task by index — guaranteed unique, no WBS collision risk
    const taskIds = body.tasks.map(() => randomUUID())

    // Build wbsToId using first occurrence of each WBS (for parent resolution)
    const wbsToId = new Map<string, string>()
    body.tasks.forEach((t, i) => {
      if (t.wbs && !wbsToId.has(t.wbs)) wbsToId.set(t.wbs, taskIds[i]!)
    })

    // Nullify parentId first to avoid self-referential FK constraint on delete
    await prisma.task.updateMany({ where: { dealId: params.id }, data: { parentId: null } })
    await prisma.task.deleteMany({ where: { dealId: params.id } })

    // Build all rows in memory, then bulk-insert in one round-trip
    const rows = body.tasks.map((t, i) => {
      const ws      = (t.workstreamName ? wsMap.get(t.workstreamName.toLowerCase()) : null) ?? defaultWs
      const ownerId = t.ownerName ? (userMap.get(t.ownerName.toLowerCase()) ?? null) : null

      let parentId: string | null = null
      if (t.wbs?.includes('.')) {
        const parentWbs = t.wbs.split('.').slice(0, -1).join('.')
        parentId = wbsToId.get(parentWbs) ?? null
      }

      const status   = Object.values(TaskStatus).includes(t.status as TaskStatus)
        ? t.status as TaskStatus : TaskStatus.NOT_STARTED
      const rag      = Object.values(RAGStatus).includes(t.rag as RAGStatus)
        ? t.rag as RAGStatus     : RAGStatus.GRAY
      const priority = Object.values(Priority).includes(t.priority as Priority)
        ? t.priority as Priority : Priority.MEDIUM

      return {
        id:           taskIds[i]!,
        dealId:       params.id,
        workstreamId: ws.id,
        parentId,
        wbsNumber:    t.wbs     || null,
        level:        t.level,
        title:        t.title,
        description:  t.description  ?? null,
        ownerId,
        startDate:    t.startDate ? new Date(t.startDate) : null,
        endDate:      t.endDate   ? new Date(t.endDate)   : null,
        durationDays: t.durationDays ?? null,
        percentDone:  t.percentDone  ?? 0,
        dependsOnId:  t.dependsOnId  ?? null,
        status,
        rag,
        priority,
        sortOrder:    i,
      }
    })

    await prisma.task.createMany({ data: rows })
    const created = rows.length

    return NextResponse.json({ data: { created } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/tasks/import]', err)
    return NextResponse.json({ error: 'Failed to import tasks', code: 'IMPORT_ERROR' }, { status: 500 })
  }
}
