import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LensStatus, Role } from '@/types'

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const UpdateLensSchema = z.object({
  status:                  z.nativeEnum(LensStatus).optional(),
  notes:                   z.string().optional().nullable(),
  benchmarks:              z.string().optional(),
  assessedAt:              z.string().datetime().optional().nullable(),
  strategicOverrideActive: z.boolean().optional(),
  overrideNotes:           z.string().optional().nullable(),
  boardSignOffDate:        z.string().datetime().optional().nullable(),
})

type UpdateLensInput = z.infer<typeof UpdateLensSchema>

// ─── GET /api/deals/[id]/lenses ───────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const lenses = await prisma.preAcquisitionLens.findMany({
      where:   { dealId: params.id },
      orderBy: { lensNumber: 'asc' },
    })

    return NextResponse.json({ data: lenses })
  } catch (err) {
    console.error('[GET /api/deals/[id]/lenses]', err)
    return NextResponse.json({ error: 'Failed to fetch lenses', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id]/lenses?lensId= ────────────────────────────────────

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

  const lensId = req.nextUrl.searchParams.get('lensId')
  if (!lensId) {
    return NextResponse.json({ error: 'lensId query param required', code: 'MISSING_PARAM' }, { status: 400 })
  }

  let body: UpdateLensInput
  try {
    body = UpdateLensSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.preAcquisitionLens.findFirst({
      where: { id: lensId, dealId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lens not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // When setting status or explicitly providing assessedAt, record the assessor and time
      const resolvedAssessedAt = body.assessedAt
        ? new Date(body.assessedAt)
        : (body.status !== undefined && body.status !== existing.status)
          ? new Date()
          : undefined

      const lens = await tx.preAcquisitionLens.update({
        where: { id: lensId },
        data: {
          ...(body.status                  !== undefined ? { status:                  body.status }                                                               : {}),
          ...(body.notes                   !== undefined ? { notes:                   body.notes }                                                                : {}),
          ...(body.benchmarks              !== undefined ? { benchmarks:              body.benchmarks }                                                           : {}),
          ...(body.strategicOverrideActive !== undefined ? { strategicOverrideActive: body.strategicOverrideActive }                                              : {}),
          ...(body.overrideNotes           !== undefined ? { overrideNotes:           body.overrideNotes }                                                        : {}),
          ...(body.boardSignOffDate        !== undefined ? { boardSignOffDate:        body.boardSignOffDate ? new Date(body.boardSignOffDate) : null }            : {}),
          ...(resolvedAssessedAt !== undefined
            ? { assessedAt: resolvedAssessedAt, assessedById: session.user.id }
            : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'LENS_UPDATED',
          entityType: 'PreAcquisitionLens',
          entityId:   lens.id,
          detail:     JSON.stringify({ from: { status: existing.status }, to: { status: lens.status } }),
        },
      })

      return lens
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/lenses]', err)
    return NextResponse.json({ error: 'Failed to update lens', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}
