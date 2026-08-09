import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  BenefitsFunnelStage,
  RevenueBucket,
  Role,
  SynergyCategory,
  SynergyStatus,
} from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const CreateSynergySchema = z.object({
  title:               z.string().min(1),
  category:            z.nativeEnum(SynergyCategory),
  revenueBucket:       z.nativeEnum(RevenueBucket).optional(),
  ownerId:             z.string().optional(),
  baselineUSD:         z.number().min(0).default(0),
  committedUSD:        z.number().min(0).default(0),
  realisedUSD:         z.number().min(0).default(0),
  benefitsFunnelStage: z.nativeEnum(BenefitsFunnelStage).optional().default('IDENTIFIED'),
  status:              z.nativeEnum(SynergyStatus).optional().default('ON_TRACK'),
  notes:               z.string().optional(),
})

const UpdateSynergySchema = z.object({
  title:               z.string().min(1).optional(),
  ownerId:             z.string().optional().nullable(),
  baselineUSD:         z.number().min(0).optional(),
  committedUSD:        z.number().min(0).optional(),
  realisedUSD:         z.number().min(0).optional(),
  benefitsFunnelStage: z.nativeEnum(BenefitsFunnelStage).optional(),
  status:              z.nativeEnum(SynergyStatus).optional(),
  notes:               z.string().optional().nullable(),
  financeValidated:    z.boolean().optional(),
})

type CreateSynergyInput = z.infer<typeof CreateSynergySchema>
type UpdateSynergyInput = z.infer<typeof UpdateSynergySchema>

// ─── Computed summary helper ──────────────────────────────────────────────────

function computeSummary(lines: Array<{
  baselineUSD:  number | { toNumber: () => number }
  committedUSD: number | { toNumber: () => number }
  realisedUSD:  number | { toNumber: () => number }
}>) {
  const toNum = (v: number | { toNumber: () => number }) =>
    typeof v === 'number' ? v : v.toNumber()

  const totalBaseline  = lines.reduce((s, l) => s + toNum(l.baselineUSD),  0)
  const totalCommitted = lines.reduce((s, l) => s + toNum(l.committedUSD), 0)
  const totalRealised  = lines.reduce((s, l) => s + toNum(l.realisedUSD),  0)
  const variancePct    = totalBaseline > 0
    ? ((totalRealised - totalBaseline) / totalBaseline) * 100
    : 0

  return { totalBaseline, totalCommitted, totalRealised, variancePct }
}

// ─── GET /api/deals/[id]/synergy ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const lines = await prisma.synergyLine.findMany({
      where:   { dealId: params.id },
      orderBy: { createdAt: 'asc' },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
    })

    const summary = computeSummary(lines)

    return NextResponse.json({ data: { lines, summary } })
  } catch (err) {
    console.error('[GET /api/deals/[id]/synergy]', err)
    return NextResponse.json({ error: 'Failed to fetch synergy lines', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/synergy ─────────────────────────────────────────────

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

  let body: CreateSynergyInput
  try {
    body = CreateSynergySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const line = await prisma.$transaction(async (tx) => {
      const created = await tx.synergyLine.create({
        data: {
          dealId:              params.id,
          title:               body.title,
          category:            body.category,
          revenueBucket:       body.revenueBucket,
          ownerId:             body.ownerId,
          baselineUSD:         body.baselineUSD,
          committedUSD:        body.committedUSD,
          realisedUSD:         body.realisedUSD,
          benefitsFunnelStage: body.benefitsFunnelStage,
          status:              body.status,
          notes:               body.notes,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'SYNERGY_LINE_CREATED',
          entityType: 'SynergyLine',
          entityId:   created.id,
          detail:     JSON.stringify({ category: body.category, title: body.title, baselineUSD: body.baselineUSD }),
        },
      })

      return created
    })

    return NextResponse.json({ data: line }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/synergy]', err)
    return NextResponse.json({ error: 'Failed to create synergy line', code: 'CREATE_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/synergy?synergyId= ────────────────────────────────

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

  const synergyId = req.nextUrl.searchParams.get('synergyId')
  if (!synergyId) {
    return NextResponse.json({ error: 'synergyId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateSynergyInput
  try {
    body = UpdateSynergySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.synergyLine.findFirst({
      where: { id: synergyId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Synergy line not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Guard: advancing COMMITTED → REALISED requires financeValidated=true
    const advancingToRealised =
      existing.benefitsFunnelStage === BenefitsFunnelStage.COMMITTED &&
      body.benefitsFunnelStage === BenefitsFunnelStage.REALISED

    if (advancingToRealised && body.financeValidated !== true) {
      return NextResponse.json(
        { error: 'Finance validation is required before advancing to REALISED', code: 'FINANCE_VALIDATION_REQUIRED' },
        { status: 422 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const line = await tx.synergyLine.update({
        where: { id: synergyId },
        data: {
          ...(body.title               !== undefined ? { title:               body.title }               : {}),
          ...(body.ownerId             !== undefined ? { ownerId:             body.ownerId }             : {}),
          ...(body.baselineUSD         !== undefined ? { baselineUSD:         body.baselineUSD }         : {}),
          ...(body.committedUSD        !== undefined ? { committedUSD:        body.committedUSD }        : {}),
          ...(body.realisedUSD         !== undefined ? { realisedUSD:         body.realisedUSD }         : {}),
          ...(body.benefitsFunnelStage !== undefined ? { benefitsFunnelStage: body.benefitsFunnelStage } : {}),
          ...(body.status              !== undefined ? { status:              body.status }              : {}),
          ...(body.notes               !== undefined ? { notes:               body.notes }               : {}),
          ...(body.financeValidated    !== undefined ? { financeValidated:    body.financeValidated }    : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'SYNERGY_LINE_UPDATED',
          entityType: 'SynergyLine',
          entityId:   line.id,
          detail:     JSON.stringify({
            from: { benefitsFunnelStage: existing.benefitsFunnelStage, realisedUSD: existing.realisedUSD },
            to:   { benefitsFunnelStage: line.benefitsFunnelStage,     realisedUSD: line.realisedUSD },
          }),
        },
      })

      return line
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/synergy]', err)
    return NextResponse.json({ error: 'Failed to update synergy line', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id]/synergy?synergyId= ───────────────────────────────

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

  const synergyId = req.nextUrl.searchParams.get('synergyId')
  if (!synergyId) {
    return NextResponse.json({ error: 'synergyId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  try {
    const existing = await prisma.synergyLine.findFirst({
      where: { id: synergyId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Synergy line not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.synergyLine.delete({ where: { id: synergyId } })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'SYNERGY_LINE_DELETED',
          entityType: 'SynergyLine',
          entityId:   synergyId,
          detail:     JSON.stringify({ category: existing.category, title: existing.title }),
        },
      })
    })

    return NextResponse.json({ data: { deleted: true, id: synergyId } })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]/synergy]', err)
    return NextResponse.json({ error: 'Failed to delete synergy line', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
