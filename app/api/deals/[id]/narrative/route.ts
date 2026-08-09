import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const UpdateNarrativeFieldSchema = z.object({
  fieldKey: z.enum(['valuationAndDealStructure', 'dueDiligence']),
  content:  z.string(),
})

const UpsertNarrativeSchema = z.object({
  valuationAndDealStructure: z.string().optional(),
  dueDiligence:              z.string().optional(),
})

type UpdateNarrativeFieldInput = z.infer<typeof UpdateNarrativeFieldSchema>
type UpsertNarrativeInput      = z.infer<typeof UpsertNarrativeSchema>

// ─── GET /api/deals/[id]/narrative ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const narrative = await prisma.dealNarrative.findUnique({
      where: { dealId: params.id },
    })

    if (!narrative) {
      return NextResponse.json({ data: { valuationAndDealStructure: null, dueDiligence: null } })
    }

    return NextResponse.json({
      data: {
        valuationAndDealStructure: narrative.valuationAndDealStructure,
        dueDiligence:              narrative.dueDiligence,
      },
    })
  } catch (err) {
    console.error('[GET /api/deals/[id]/narrative]', err)
    return NextResponse.json({ error: 'Failed to fetch narrative', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/narrative ─────────────────────────────────────────

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

  let body: UpdateNarrativeFieldInput
  try {
    body = UpdateNarrativeFieldSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.dealNarrative.findUnique({
      where: { dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Narrative not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const narrative = await tx.dealNarrative.update({
        where: { dealId: params.id },
        data:  { [body.fieldKey]: body.content },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'NARRATIVE_UPDATED',
          entityType: 'DealNarrative',
          entityId:   narrative.id,
          detail:     JSON.stringify({ fieldKey: body.fieldKey }),
        },
      })

      return narrative
    })

    return NextResponse.json({
      data: {
        valuationAndDealStructure: updated.valuationAndDealStructure,
        dueDiligence:              updated.dueDiligence,
      },
    })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/narrative]', err)
    return NextResponse.json({ error: 'Failed to update narrative', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals/[id]/narrative — upsert (create if none exists) ─────────

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

  let body: UpsertNarrativeInput
  try {
    body = UpsertNarrativeSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const narrative = await prisma.$transaction(async (tx) => {
      const upserted = await tx.dealNarrative.upsert({
        where:  { dealId: params.id },
        create: {
          dealId:                    params.id,
          valuationAndDealStructure: body.valuationAndDealStructure,
          dueDiligence:              body.dueDiligence,
        },
        update: {
          ...(body.valuationAndDealStructure !== undefined
            ? { valuationAndDealStructure: body.valuationAndDealStructure }
            : {}),
          ...(body.dueDiligence !== undefined
            ? { dueDiligence: body.dueDiligence }
            : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'NARRATIVE_UPSERTED',
          entityType: 'DealNarrative',
          entityId:   upserted.id,
          detail:     JSON.stringify({ dealId: params.id }),
        },
      })

      return upserted
    })

    return NextResponse.json(
      {
        data: {
          valuationAndDealStructure: narrative.valuationAndDealStructure,
          dueDiligence:              narrative.dueDiligence,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/deals/[id]/narrative]', err)
    return NextResponse.json({ error: 'Failed to create narrative', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
