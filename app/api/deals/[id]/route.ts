import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DealStatus, RAGStatus, Role } from '@/types'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const UpdateDealSchema = z.object({
  name:               z.string().min(1).max(200).optional(),
  acquiredCompanyName: z.string().min(1).max(200).optional(),
  sector:             z.string().max(100).optional(),
  description:        z.string().optional(),
  status:             z.nativeEnum(DealStatus).optional(),
  overallRag:         z.nativeEnum(RAGStatus).optional(),
  currentPhase:       z.number().int().min(1).max(6).optional(),
  acquisitionDate:    z.string().datetime().optional().nullable(),
  closedDate:         z.string().datetime().optional().nullable(),
  isSensitive:        z.boolean().optional(),
  imoLeadId:          z.string().cuid().optional().nullable(),
  execSponsorId:      z.string().cuid().optional().nullable(),
})

type UpdateDealInput = z.infer<typeof UpdateDealSchema>

// ─── GET /api/deals/[id] ──────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        createdBy:    { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        imoLead:      { select: { id: true, name: true, email: true, avatarUrl: true } },
        execSponsor:  { select: { id: true, name: true, email: true, avatarUrl: true } },
        sensitiveAccessList: { select: { userId: true, grantedAt: true } },
        charter:      true,
        narrative:    true,
        phases: {
          orderBy: { phaseNumber: 'asc' },
          include: { tollgateItems: true },
        },
        workstreams: {
          where:   { isActive: true },
          orderBy: { code: 'asc' },
          include: { fslLead: { select: { id: true, name: true, avatarUrl: true } } },
        },
        lensAssessments:    { orderBy: { lensNumber: 'asc' } },
        resourceAllocations: {
          include: {
            user:       { select: { id: true, name: true, email: true, avatarUrl: true } },
            workstream: { select: { id: true, name: true, code: true } },
          },
        },
        _count: {
          select: {
            tasks:          true,
            riskEntries:    true,
            actionEntries:  true,
            decisionEntries: true,
            raidEntries:    true,
            synergyLines:   true,
          },
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (session.user.role === Role.VIEWER && deal.isSensitive) {
      const hasAccess = deal.sensitiveAccessList.some(sa => sa.userId === session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: deal })
  } catch (err) {
    console.error('[GET /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch deal', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id] ────────────────────────────────────────────────────

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

  let body: UpdateDealInput
  try {
    body = UpdateDealSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.update({
        where: { id: params.id },
        data: {
          ...(body.name                !== undefined ? { name: body.name }                                                          : {}),
          ...(body.acquiredCompanyName !== undefined ? { acquiredCompanyName: body.acquiredCompanyName }                            : {}),
          ...(body.sector              !== undefined ? { sector: body.sector }                                                      : {}),
          ...(body.description         !== undefined ? { description: body.description }                                            : {}),
          ...(body.status              !== undefined ? { status: body.status }                                                      : {}),
          ...(body.overallRag          !== undefined ? { overallRag: body.overallRag }                                              : {}),
          ...(body.currentPhase        !== undefined ? { currentPhase: body.currentPhase }                                          : {}),
          ...(body.isSensitive         !== undefined ? { isSensitive: body.isSensitive }                                            : {}),
          ...(body.imoLeadId           !== undefined ? { imoLeadId: body.imoLeadId }                                                : {}),
          ...(body.execSponsorId       !== undefined ? { execSponsorId: body.execSponsorId }                                        : {}),
          ...(body.acquisitionDate     !== undefined ? { acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null } : {}),
          ...(body.closedDate          !== undefined ? { closedDate:      body.closedDate      ? new Date(body.closedDate)      : null } : {}),
        },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'DEAL_UPDATED',
          entityType: 'Deal',
          entityId:   deal.id,
          detail:     JSON.stringify({ before: { name: existing.name, status: existing.status }, after: { name: deal.name, status: deal.status } }),
        },
      })

      return deal
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Failed to update deal', code: 'UPDATE_ERROR' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden — ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const existing = await prisma.deal.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const archived = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.update({
        where: { id: params.id },
        data:  { status: DealStatus.CLOSED },
      })

      await tx.appAuditLog.create({
        data: {
          dealId:     params.id,
          userId:     session.user.id,
          action:     'DEAL_ARCHIVED',
          entityType: 'Deal',
          entityId:   deal.id,
          detail:     JSON.stringify({ previousStatus: existing.status }),
        },
      })

      return deal
    })

    return NextResponse.json({ data: archived })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Failed to archive deal', code: 'DELETE_ERROR' }, { status: 500 })
  }
}
