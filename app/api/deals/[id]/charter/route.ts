import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

const UpdateCharterSchema = z.object({
  revenueSynergyTargetUSD: z.number().min(0).optional().nullable(),
  costSynergyTargetUSD:    z.number().min(0).optional().nullable(),
  ebitdaTarget12m:         z.number().optional().nullable(),
  ebitdaTarget24m:         z.number().optional().nullable(),
  valueRealisationLead:    z.string().max(200).optional().nullable(),
  techLead:                z.string().max(200).optional().nullable(),
  changeCommsLead:         z.string().max(200).optional().nullable(),
  execSteerCoCadence:      z.string().max(200).optional().nullable(),
  workingSteerCoCadence:   z.string().max(200).optional().nullable(),
  integrationPrinciples:   z.string().optional().nullable(),
})

type UpdateCharterInput = z.infer<typeof UpdateCharterSchema>

// ─── GET /api/deals/[id]/charter ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const charter = await prisma.integrationCharter.findUnique({
      where: { dealId: params.id },
    })

    if (!charter) {
      return NextResponse.json({ error: 'Charter not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ data: charter })
  } catch (err) {
    console.error('[GET /api/deals/[id]/charter]', err)
    return NextResponse.json({ error: 'Failed to fetch charter', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/charter ───────────────────────────────────────────

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

  let body: UpdateCharterInput
  try {
    body = UpdateCharterSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.integrationCharter.findUnique({ where: { dealId: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Charter not found — create it first', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const charter = await tx.integrationCharter.update({
        where: { dealId: params.id },
        data: {
          ...(body.revenueSynergyTargetUSD !== undefined ? { revenueSynergyTargetUSD: body.revenueSynergyTargetUSD } : {}),
          ...(body.costSynergyTargetUSD    !== undefined ? { costSynergyTargetUSD:    body.costSynergyTargetUSD }    : {}),
          ...(body.ebitdaTarget12m         !== undefined ? { ebitdaTarget12m:         body.ebitdaTarget12m }         : {}),
          ...(body.ebitdaTarget24m         !== undefined ? { ebitdaTarget24m:         body.ebitdaTarget24m }         : {}),
          ...(body.valueRealisationLead    !== undefined ? { valueRealisationLead:    body.valueRealisationLead }    : {}),
          ...(body.techLead                !== undefined ? { techLead:                body.techLead }                : {}),
          ...(body.changeCommsLead         !== undefined ? { changeCommsLead:         body.changeCommsLead }         : {}),
          ...(body.execSteerCoCadence      !== undefined ? { execSteerCoCadence:      body.execSteerCoCadence }      : {}),
          ...(body.workingSteerCoCadence   !== undefined ? { workingSteerCoCadence:   body.workingSteerCoCadence }   : {}),
          ...(body.integrationPrinciples   !== undefined ? { integrationPrinciples:   body.integrationPrinciples }   : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'CHARTER_UPDATED',
          entityType: 'IntegrationCharter',
          entityId:   charter.id,
          detail:     JSON.stringify({ updatedFields: Object.keys(body) }),
        },
      })

      return charter
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/charter]', err)
    return NextResponse.json({ error: 'Failed to update charter', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/charter ────────────────────────────────────────────
// ?action=signoff to sign off; body without action to create

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

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'unlock') {
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
    }
    try {
      const existing = await prisma.integrationCharter.findUnique({ where: { dealId: params.id } })
      if (!existing) {
        return NextResponse.json({ error: 'Charter not found', code: 'NOT_FOUND' }, { status: 404 })
      }
      if (!existing.isComplete) {
        return NextResponse.json({ error: 'Charter is not signed off', code: 'NOT_SIGNED_OFF' }, { status: 409 })
      }

      const unlocked = await prisma.$transaction(async (tx) => {
        const charter = await tx.integrationCharter.update({
          where: { dealId: params.id },
          data: { isComplete: false, signedOffBy: null, signedOffAt: null },
        })

        await tx.appAuditLog.create({
          data: {
            dealId:     params.id,
            userId:     session.user.id,
            action:     'CHARTER_UNLOCKED',
            entityType: 'IntegrationCharter',
            entityId:   charter.id,
            detail:     JSON.stringify({ unlockedBy: session.user.name }),
          },
        })

        return charter
      })

      return NextResponse.json({ data: unlocked })
    } catch (err) {
      console.error('[POST /api/deals/[id]/charter?action=unlock]', err)
      return NextResponse.json({ error: 'Failed to unlock charter', code: 'UNLOCK_ERROR' }, { status: 500 })
    }
  }

  if (action === 'signoff') {
    try {
      const existing = await prisma.integrationCharter.findUnique({ where: { dealId: params.id } })
      if (!existing) {
        return NextResponse.json({ error: 'Charter not found', code: 'NOT_FOUND' }, { status: 404 })
      }
      if (existing.isComplete) {
        return NextResponse.json({ error: 'Charter already signed off', code: 'ALREADY_SIGNED_OFF' }, { status: 409 })
      }

      const signedOff = await prisma.$transaction(async (tx) => {
        const charter = await tx.integrationCharter.update({
          where: { dealId: params.id },
          data: {
            isComplete:  true,
            signedOffBy: session.user.name ?? session.user.email,
            signedOffAt: new Date(),
          },
        })

        await tx.appAuditLog.create({
          data: {
            dealId:     params.id,
            userId:     session.user.id,
            action:     'CHARTER_SIGNED_OFF',
            entityType: 'IntegrationCharter',
            entityId:   charter.id,
            detail:     JSON.stringify({ signedOffBy: session.user.name, signedOffAt: new Date().toISOString() }),
          },
        })

        return charter
      })

      return NextResponse.json({ data: signedOff })
    } catch (err) {
      console.error('[POST /api/deals/[id]/charter?action=signoff]', err)
      return NextResponse.json({ error: 'Failed to sign off charter', code: 'SIGNOFF_ERROR' }, { status: 500 })
    }
  }

  // Create new charter
  const CreateCharterSchema = UpdateCharterSchema
  let body: UpdateCharterInput
  try {
    body = CreateCharterSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.integrationCharter.findUnique({ where: { dealId: params.id } })
    if (existing) {
      return NextResponse.json({ error: 'Charter already exists — use PATCH to update', code: 'ALREADY_EXISTS' }, { status: 409 })
    }

    const charter = await prisma.$transaction(async (tx) => {
      const created = await tx.integrationCharter.create({
        data: {
          dealId: params.id,
          ...body,
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'CHARTER_CREATED',
          entityType: 'IntegrationCharter',
          entityId:   created.id,
          detail:     JSON.stringify({ dealId: params.id }),
        },
      })

      return created
    })

    return NextResponse.json({ data: charter }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals/[id]/charter]', err)
    return NextResponse.json({ error: 'Failed to create charter', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
