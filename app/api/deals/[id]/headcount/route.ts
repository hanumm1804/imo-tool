import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

const LineSchema = z.object({
  department:       z.string().min(1).max(200),
  headcountReduced: z.number().int().min(0).default(0),
  peopleExpenseUSD: z.number().min(0).default(0),
  otherExpenseUSD:  z.number().min(0).default(0),
  notes:            z.string().max(1000).optional().nullable(),
  sortOrder:        z.number().int().optional(),
})

const NotesSchema = z.object({
  headcountNotes: z.string().nullable(),
})

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any
    const [lines, deal] = await Promise.all([
      prismaAny.headcountLine.findMany({
        where:   { dealId: params.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.deal.findUnique({
        where:  { id: params.id },
        select: { id: true },
      }),
    ])
    // headcountNotes fetched separately to handle optional field safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dealWithNotes = deal ? await (prisma as any).deal.findUnique({
      where:  { id: params.id },
      select: { headcountNotes: true },
    }) : null
    return NextResponse.json({ data: { lines, notes: dealWithNotes?.headcountNotes ?? null } })
  } catch (err) {
    console.error('[GET /api/deals/[id]/headcount]', err)
    return NextResponse.json({ error: 'Failed to fetch headcount lines', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  if (session.user.role === Role.VIEWER) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  let body: z.infer<typeof LineSchema>
  try {
    body = LineSchema.parse(await req.json())
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid body'
    return NextResponse.json({ error: msg, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any
    const count = await prismaAny.headcountLine.count({ where: { dealId: params.id } })
    const line = await prismaAny.headcountLine.create({
      data: {
        dealId:           params.id,
        department:       body.department,
        headcountReduced: body.headcountReduced ?? 0,
        peopleExpenseUSD: body.peopleExpenseUSD ?? 0,
        otherExpenseUSD:  body.otherExpenseUSD  ?? 0,
        notes:            body.notes ?? null,
        sortOrder:        body.sortOrder ?? count,
      },
    })
    return NextResponse.json({ data: line }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/headcount]', err)
    return NextResponse.json({ error: 'Failed to create headcount line', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  if (session.user.role === Role.VIEWER) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const lineId = new URL(req.url).searchParams.get('lineId')

  if (!lineId) {
    // Update deal headcountNotes
    let body: z.infer<typeof NotesSchema>
    try {
      body = NotesSchema.parse(await req.json())
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid body'
      return NextResponse.json({ error: msg, code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).deal.update({
        where: { id: params.id },
        data:  { headcountNotes: body.headcountNotes },
      })
      return NextResponse.json({ data: { headcountNotes: body.headcountNotes } })
    } catch (err) {
      console.error('[PATCH notes /api/deals/[id]/headcount]', err)
      return NextResponse.json({ error: 'Failed to update notes', code: 'UPDATE_ERROR' }, { status: 500 })
    }
  }

  let body: Partial<z.infer<typeof LineSchema>>
  try {
    body = LineSchema.partial().parse(await req.json())
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message ?? 'Invalid body' : 'Invalid body'
    return NextResponse.json({ error: msg, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line = await (prisma as any).headcountLine.update({
      where: { id: lineId, dealId: params.id },
      data:  body,
    })
    return NextResponse.json({ data: line })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/headcount]', err)
    return NextResponse.json({ error: 'Failed to update headcount line', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  if (session.user.role === Role.VIEWER) return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const lineId = new URL(req.url).searchParams.get('lineId')
  if (!lineId) return NextResponse.json({ error: 'lineId required', code: 'VALIDATION_ERROR' }, { status: 400 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).headcountLine.delete({ where: { id: lineId, dealId: params.id } })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/headcount]', err)
    return NextResponse.json({ error: 'Failed to delete headcount line', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
