import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LogStatus, RiskLevel, Role } from '@/types'

// ─── Risk score helpers ───────────────────────────────────────────────────────

const RISK_MATRIX: Record<RiskLevel, Record<RiskLevel, number>> = {
  HIGH:   { LOW: 4, MEDIUM: 2, HIGH: 1 },
  MEDIUM: { LOW: 8, MEDIUM: 5, HIGH: 3 },
  LOW:    { LOW: 9, MEDIUM: 7, HIGH: 6 },
}

function computeRiskScore(likelihood: RiskLevel, impact: RiskLevel): number {
  return RISK_MATRIX[likelihood][impact]
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateRiskSchema = z.object({
  description:  z.string().min(1),
  workstreamId: z.string().optional(),
  likelihood:   z.nativeEnum(RiskLevel).optional().default('MEDIUM'),
  impact:       z.nativeEnum(RiskLevel).optional().default('MEDIUM'),
  mitigation:   z.string().optional(),
  ownerId:      z.string().optional(),
  status:       z.nativeEnum(LogStatus).optional().default('OPEN'),
})

const UpdateRiskSchema = z.object({
  description:  z.string().min(1).optional(),
  workstreamId: z.string().optional().nullable(),
  likelihood:   z.nativeEnum(RiskLevel).optional(),
  impact:       z.nativeEnum(RiskLevel).optional(),
  mitigation:   z.string().optional().nullable(),
  ownerId:      z.string().optional().nullable(),
  status:       z.nativeEnum(LogStatus).optional(),
})

type CreateRiskInput = z.infer<typeof CreateRiskSchema>
type UpdateRiskInput = z.infer<typeof UpdateRiskSchema>

// ─── GET /api/deals/[id]/risks ────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status      = searchParams.get('status')     as LogStatus | null
  const likelihood  = searchParams.get('likelihood') as RiskLevel | null
  const impact      = searchParams.get('impact')     as RiskLevel | null
  const workstreamId = searchParams.get('workstreamId')

  try {
    const risks = await prisma.riskEntry.findMany({
      where: {
        dealId: params.id,
        ...(status       ? { status }       : {}),
        ...(likelihood   ? { likelihood }   : {}),
        ...(impact       ? { impact }       : {}),
        ...(workstreamId ? { workstreamId } : {}),
      },
      orderBy: [{ riskScore: 'asc' }, { createdAt: 'desc' }],
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return NextResponse.json({ data: risks })
  } catch (err) {
    console.error('[GET /api/deals/[id]/risks]', err)
    return NextResponse.json({ error: 'Failed to fetch risks', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/risks ───────────────────────────────────────────────

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

  let body: CreateRiskInput
  try {
    body = CreateRiskSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const riskScore = computeRiskScore(body.likelihood, body.impact)

  try {
    const risk = await prisma.$transaction(async (tx) => {
      const created = await tx.riskEntry.create({
        data: {
          dealId:       params.id,
          workstreamId: body.workstreamId,
          description:  body.description,
          likelihood:   body.likelihood,
          impact:       body.impact,
          riskScore,
          mitigation:   body.mitigation,
          ownerId:      body.ownerId,
          status:       body.status,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RISK_CREATED',
          entityType: 'RiskEntry',
          entityId:   created.id,
          detail:     JSON.stringify({ likelihood: body.likelihood, impact: body.impact, riskScore }),
        },
      })

      return created
    })

    return NextResponse.json({ data: risk }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/risks]', err)
    return NextResponse.json({ error: 'Failed to create risk', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/risks?riskId= ─────────────────────────────────────

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

  const riskId = req.nextUrl.searchParams.get('riskId')
  if (!riskId) {
    return NextResponse.json({ error: 'riskId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateRiskInput
  try {
    body = UpdateRiskSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.riskEntry.findFirst({
      where: { id: riskId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Risk not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Recalculate riskScore if likelihood or impact changed
    const newLikelihood = body.likelihood ?? existing.likelihood
    const newImpact     = body.impact     ?? existing.impact
    const newRiskScore  = computeRiskScore(newLikelihood, newImpact)

    const updated = await prisma.$transaction(async (tx) => {
      const risk = await tx.riskEntry.update({
        where: { id: riskId },
        data: {
          ...(body.description  !== undefined ? { description:  body.description }  : {}),
          ...(body.workstreamId !== undefined ? { workstreamId: body.workstreamId } : {}),
          ...(body.likelihood   !== undefined ? { likelihood:   body.likelihood }   : {}),
          ...(body.impact       !== undefined ? { impact:       body.impact }       : {}),
          riskScore: newRiskScore,
          ...(body.mitigation   !== undefined ? { mitigation:   body.mitigation }   : {}),
          ...(body.ownerId      !== undefined ? { ownerId:      body.ownerId }      : {}),
          ...(body.status       !== undefined ? { status:       body.status }       : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RISK_UPDATED',
          entityType: 'RiskEntry',
          entityId:   risk.id,
          detail:     JSON.stringify({
            from: { likelihood: existing.likelihood, impact: existing.impact, riskScore: existing.riskScore, status: existing.status },
            to:   { likelihood: risk.likelihood,     impact: risk.impact,     riskScore: risk.riskScore,     status: risk.status },
          }),
        },
      })

      return risk
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/risks]', err)
    return NextResponse.json({ error: 'Failed to update risk', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/risks?riskId= ────────────────────────────────────

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

  const riskId = req.nextUrl.searchParams.get('riskId')
  if (!riskId) {
    return NextResponse.json({ error: 'riskId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.riskEntry.findFirst({
      where: { id: riskId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Risk not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.riskEntry.delete({ where: { id: riskId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'RISK_DELETED',
          entityType: 'RiskEntry',
          entityId:   riskId,
          detail:     JSON.stringify({ likelihood: existing.likelihood, impact: existing.impact, riskScore: existing.riskScore }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: riskId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/risks]', err)
    return NextResponse.json({ error: 'Failed to delete risk', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
