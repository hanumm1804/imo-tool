import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PhaseStatus, Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const UpdatePhaseSchema = z.object({
  status:           z.nativeEnum(PhaseStatus).optional(),
  plannedStartDate: z.string().datetime().optional().nullable(),
  plannedEndDate:   z.string().datetime().optional().nullable(),
  actualStartDate:  z.string().datetime().optional().nullable(),
  actualEndDate:    z.string().datetime().optional().nullable(),
})

type UpdatePhaseInput = z.infer<typeof UpdatePhaseSchema>

// ─── GET /api/deals/[id]/phases ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const phases = await prisma.dealPhase.findMany({
      where:   { dealId: params.id },
      orderBy: { phaseNumber: 'asc' },
      include: {
        tollgateItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ data: phases })
  } catch (err) {
    console.error('[GET /api/deals/[id]/phases]', err)
    return NextResponse.json({ error: 'Failed to fetch phases', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/phases?phaseId= ────────────────────────────────────

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

  const phaseId = req.nextUrl.searchParams.get('phaseId')
  if (!phaseId) {
    return NextResponse.json({ error: 'phaseId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdatePhaseInput
  try {
    body = UpdatePhaseSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.dealPhase.findFirst({
      where: { id: phaseId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Phase not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Immutable after COMPLETE — reject changes (except by ADMIN)
    if (existing.status === PhaseStatus.COMPLETE && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Phase is complete and cannot be modified', code: 'PHASE_COMPLETE' },
        { status: 409 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const phase = await tx.dealPhase.update({
        where: { id: phaseId },
        data: {
          ...(body.status           !== undefined ? { status:           body.status }                                                             : {}),
          ...(body.plannedStartDate !== undefined ? { plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : null }           : {}),
          ...(body.plannedEndDate   !== undefined ? { plannedEndDate:   body.plannedEndDate   ? new Date(body.plannedEndDate)   : null }           : {}),
          ...(body.actualStartDate  !== undefined ? { actualStartDate:  body.actualStartDate  ? new Date(body.actualStartDate)  : null }           : {}),
          ...(body.actualEndDate    !== undefined ? { actualEndDate:    body.actualEndDate    ? new Date(body.actualEndDate)    : null }            : {}),
        },
      })

      // Keep Deal.currentPhase in sync with the active phase
      if (body.status === PhaseStatus.IN_PROGRESS) {
        await tx.deal.update({
          where: { id: params.id },
          data:  { currentPhase: phase.phaseNumber },
        })
      }

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'PHASE_UPDATED',
          entityType: 'DealPhase',
          entityId:   phase.id,
          detail:     JSON.stringify({ from: { status: existing.status }, to: { status: phase.status } }),
        },
      })

      return phase
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/phases]', err)
    return NextResponse.json({ error: 'Failed to update phase', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/phases?action=signoff&phaseId= ─────────────────────

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

  const { searchParams } = req.nextUrl
  const action  = searchParams.get('action')
  const phaseId = searchParams.get('phaseId')

  if (action !== 'signoff') {
    return NextResponse.json({ error: 'Invalid action — use ?action=signoff', code: 'INVALID_ACTION' }, { status: 400 })
  }
  if (!phaseId) {
    return NextResponse.json({ error: 'phaseId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const phase = await prisma.dealPhase.findFirst({
      where:   { id: phaseId, dealId: params.id },
      include: { tollgateItems: true },
    })

    if (!phase) {
      return NextResponse.json({ error: 'Phase not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Immutable after signoff
    if (phase.tollgateComplete) {
      return NextResponse.json(
        { error: 'Phase tollgate already signed off', code: 'ALREADY_SIGNED_OFF' },
        { status: 409 }
      )
    }

    // Validate all mandatory tollgate items are complete
    const incompleteMandatory = phase.tollgateItems.filter(tg => tg.isMandatory && !tg.isComplete)
    if (incompleteMandatory.length > 0) {
      return NextResponse.json(
        {
          error: `${incompleteMandatory.length} mandatory tollgate item(s) are not yet complete`,
          code:  'INCOMPLETE_TOLLGATES',
          data:  { incompleteMandatory: incompleteMandatory.map(tg => ({ id: tg.id, label: tg.label })) },
        },
        { status: 422 }
      )
    }

    const signedOffAt = new Date()

    const signed = await prisma.$transaction(async (tx) => {
      const updated = await tx.dealPhase.update({
        where: { id: phaseId },
        data: {
          status:               PhaseStatus.COMPLETE,
          actualEndDate:        signedOffAt,
          tollgateComplete:     true,
          tollgateSignedOffById: session.user.id,
          tollgateSignedOffAt:  signedOffAt,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'PHASE_TOLLGATE_SIGNED_OFF',
          entityType: 'DealPhase',
          entityId:   phaseId,
          detail:     JSON.stringify({
            signedOffById: session.user.id,
            signedOffAt:   signedOffAt.toISOString(),
            phaseNumber:   phase.phaseNumber,
          }),
        },
      })

      return updated
    })

    return NextResponse.json({ data: signed })
  } catch (err) {
    console.error('[POST /api/deals/[id]/phases?action=signoff]', err)
    return NextResponse.json({ error: 'Failed to sign off phase', code: 'SIGNOFF_ERROR' }, { status: 500 })
  }
}
