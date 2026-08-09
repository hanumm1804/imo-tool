import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateDecisionSchema = z.object({
  title:           z.string().min(1).max(300),
  context:         z.string().optional(),
  decisionMade:    z.string().min(1),
  decisionMakerId: z.string().optional(),
  decidedAt:       z.string().datetime().optional(),
  rationale:       z.string().optional(),
  impactWorkstream: z.string().optional(),
})

const UpdateDecisionSchema = z.object({
  title:           z.string().min(1).max(300).optional(),
  context:         z.string().optional().nullable(),
  decisionMade:    z.string().min(1).optional(),
  decisionMakerId: z.string().optional().nullable(),
  decidedAt:       z.string().datetime().optional().nullable(),
  rationale:       z.string().optional().nullable(),
  impactWorkstream: z.string().optional().nullable(),
})

type CreateDecisionInput = z.infer<typeof CreateDecisionSchema>
type UpdateDecisionInput = z.infer<typeof UpdateDecisionSchema>

// ─── GET /api/deals/[id]/decisions ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const decisions = await prisma.decisionEntry.findMany({
      where:   { dealId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        decisionMaker: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return NextResponse.json({ data: decisions })
  } catch (err) {
    console.error('[GET /api/deals/[id]/decisions]', err)
    return NextResponse.json({ error: 'Failed to fetch decisions', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/decisions ───────────────────────────────────────────

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

  let body: CreateDecisionInput
  try {
    body = CreateDecisionSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const decision = await prisma.$transaction(async (tx) => {
      const created = await tx.decisionEntry.create({
        data: {
          dealId:          params.id,
          title:           body.title,
          context:         body.context,
          decisionMade:    body.decisionMade,
          decisionMakerId: body.decisionMakerId,
          decidedAt:       body.decidedAt ? new Date(body.decidedAt) : undefined,
          rationale:       body.rationale,
          impactWorkstream: body.impactWorkstream,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'DECISION_CREATED',
          entityType: 'DecisionEntry',
          entityId:   created.id,
          detail:     JSON.stringify({ title: body.title }),
        },
      })

      return created
    })

    return NextResponse.json({ data: decision }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/decisions]', err)
    return NextResponse.json({ error: 'Failed to create decision', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/decisions?decisionId= ─────────────────────────────

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

  const decisionId = req.nextUrl.searchParams.get('decisionId')
  if (!decisionId) {
    return NextResponse.json({ error: 'decisionId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateDecisionInput
  try {
    body = UpdateDecisionSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.decisionEntry.findFirst({
      where: { id: decisionId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Decision not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const decision = await tx.decisionEntry.update({
        where: { id: decisionId },
        data: {
          ...(body.title            !== undefined ? { title:            body.title }                                                      : {}),
          ...(body.context          !== undefined ? { context:          body.context }                                                    : {}),
          ...(body.decisionMade     !== undefined ? { decisionMade:     body.decisionMade }                                               : {}),
          ...(body.decisionMakerId  !== undefined ? { decisionMakerId:  body.decisionMakerId }                                            : {}),
          ...(body.decidedAt        !== undefined ? { decidedAt:        body.decidedAt ? new Date(body.decidedAt) : null }                : {}),
          ...(body.rationale        !== undefined ? { rationale:        body.rationale }                                                  : {}),
          ...(body.impactWorkstream !== undefined ? { impactWorkstream: body.impactWorkstream }                                           : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'DECISION_UPDATED',
          entityType: 'DecisionEntry',
          entityId:   decision.id,
          detail:     JSON.stringify({ title: decision.title }),
        },
      })

      return decision
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/decisions]', err)
    return NextResponse.json({ error: 'Failed to update decision', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/decisions?decisionId= ────────────────────────────

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

  const decisionId = req.nextUrl.searchParams.get('decisionId')
  if (!decisionId) {
    return NextResponse.json({ error: 'decisionId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.decisionEntry.findFirst({
      where: { id: decisionId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Decision not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.decisionEntry.delete({ where: { id: decisionId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'DECISION_DELETED',
          entityType: 'DecisionEntry',
          entityId:   decisionId,
          detail:     JSON.stringify({ title: existing.title }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: decisionId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/decisions]', err)
    return NextResponse.json({ error: 'Failed to delete decision', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
