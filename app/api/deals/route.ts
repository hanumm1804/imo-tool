import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPhaseTemplates, getLensTemplates, getTaskTreeTemplates } from '@/lib/seed-templates'
import { DealStatus, Role } from '@/types'
import type { Prisma } from '@prisma/client'

// ─── Workstream seeds ─────────────────────────────────────────────────────────

const WORKSTREAM_SEEDS = [
  { code: 'WS01', name: 'People & Culture' },
  { code: 'WS02', name: 'Technology & Systems' },
  { code: 'WS03', name: 'Operations & Delivery' },
  { code: 'WS04', name: 'Finance & Synergies' },
  { code: 'WS05', name: 'Sales & Commercial' },
] as const

// ─── Zod schema ───────────────────────────────────────────────────────────────

const CreateDealSchema = z.object({
  name:                     z.string().min(1).max(200),
  acquiredCompanyName:      z.string().min(1).max(200),
  sector:                   z.string().max(100).optional(),
  description:              z.string().optional(),
  status:                   z.nativeEnum(DealStatus).optional().default('PRE_CLOSE'),
  acquisitionDate:          z.string().datetime().optional().nullable(),
  imoLeadId:                z.string().cuid().optional().nullable(),
  execSponsorId:            z.string().cuid().optional().nullable(),
  isSensitive:              z.boolean().optional().default(false),
  revenueSynergyTargetUSD:  z.number().min(0).optional(),
  costSynergyTargetUSD:     z.number().min(0).optional(),
})

type CreateDealInput = z.infer<typeof CreateDealSchema>

// ─── GET /api/deals ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status  = searchParams.get('status') as DealStatus | null
  const search  = searchParams.get('search')
  const cursor  = searchParams.get('cursor')
  const limit   = Math.min(Number(searchParams.get('limit') ?? 50), 200)

  try {
    const where: Prisma.DealWhereInput = {}

    if (status && Object.values(DealStatus).includes(status)) {
      where.status = status
    }

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { acquiredCompanyName: { contains: search.trim() } },
      ]
    }

    if (session.user.role === Role.VIEWER) {
      if (session.user.isDealTeamOnly) {
        // Deal-team-only users see only their allocated deals
        where.resourceAllocations = { some: { userId: session.user.id } }
      } else {
        where.OR = [
          { isSensitive: false },
          { sensitiveAccessList: { some: { userId: session.user.id } } },
        ]
      }
    }

    const deals = await prisma.deal.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { updatedAt: 'desc' },
      select: {
        id:                  true,
        name:                true,
        acquiredCompanyName: true,
        sector:              true,
        status:              true,
        overallRag:          true,
        currentPhase:        true,
        description:         true,
        acquisitionDate:     true,
        isSensitive:         true,
        updatedAt:           true,
        createdAt:           true,
        createdBy:           { select: { id: true, name: true, avatarUrl: true } },
        imoLead:             { select: { id: true, name: true, avatarUrl: true } },
        execSponsor:         { select: { id: true, name: true } },
        phases: {
          orderBy: { phaseNumber: 'asc' },
          select:  { phaseNumber: true, status: true, plannedStartDate: true, plannedEndDate: true },
        },
        _count: {
          select: { tasks: true, resourceAllocations: true, riskEntries: true, actionEntries: true },
        },
      },
    })

    const hasMore    = deals.length > limit
    const rawItems   = hasMore ? deals.slice(0, limit) : deals
    const nextCursor = hasMore ? rawItems[rawItems.length - 1].id : null

    const items = rawItems.map(({ phases, ...d }) => {
      const inProgress  = phases.find(p => p.status === 'IN_PROGRESS')
      const lastComplete = [...phases].reverse().find(p => p.status === 'COMPLETE')
      return {
        ...d,
        currentPhase:     inProgress?.phaseNumber ?? lastComplete?.phaseNumber ?? 1,
        projectStartDate: phases.find((p) => p.phaseNumber === 1)?.plannedStartDate ?? null,
        projectEndDate:   phases.find((p) => p.phaseNumber === 6)?.plannedEndDate   ?? null,
      }
    })

    return NextResponse.json({ data: { items, nextCursor, total: items.length } })
  } catch (err) {
    console.error('[GET /api/deals]', err)
    return NextResponse.json({ error: 'Failed to fetch deals', code: 'FETCH_ERROR' }, { status: 500 })
  }
}

// ─── POST /api/deals ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorised', code: 'UNAUTHORISED' }, { status: 401 })
  }
  if (session.user.role === Role.VIEWER) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  let body: CreateDealInput
  try {
    body = CreateDealSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues[0].message : 'Invalid request body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const deal = await prisma.$transaction(async (tx) => {
      // 1. Create the deal
      const newDeal = await tx.deal.create({
        data: {
          name:               body.name,
          acquiredCompanyName: body.acquiredCompanyName,
          sector:             body.sector,
          description:        body.description,
          status:             body.status,
          acquisitionDate:    body.acquisitionDate ? new Date(body.acquisitionDate) : undefined,
          isSensitive:        body.isSensitive ?? false,
          createdById:        session.user.id,
          imoLeadId:          body.imoLeadId,
          execSponsorId:      body.execSponsorId,
        },
      })

      // 2. Create charter with synergy targets
      if (body.revenueSynergyTargetUSD !== undefined || body.costSynergyTargetUSD !== undefined) {
        await tx.integrationCharter.create({
          data: {
            dealId:                  newDeal.id,
            revenueSynergyTargetUSD: body.revenueSynergyTargetUSD,
            costSynergyTargetUSD:    body.costSynergyTargetUSD,
          },
        })
      }

      // 3. Create workstreams
      const workstreams = await Promise.all(
        WORKSTREAM_SEEDS.map(ws =>
          tx.workstream.create({
            data: { dealId: newDeal.id, code: ws.code, name: ws.name },
            select: { id: true, code: true },
          })
        )
      )

      // 4. Create 6 DRIVE phases + tollgate items
      const phaseTemplates = getPhaseTemplates()
      for (const pt of phaseTemplates) {
        const phase = await tx.dealPhase.create({
          data: {
            dealId:              newDeal.id,
            phaseNumber:         pt.phaseNumber,
            phaseName:           pt.phaseName,
            driveTag:            pt.driveTag,
            timeframeLabel:      pt.timeframeLabel,
            tollgateName:        pt.tollgateName,
            tollgateDescription: pt.tollgateDescription,
          },
          select: { id: true },
        })

        if (pt.tollgateItems.length > 0) {
          await tx.tollgateItem.createMany({
            data: pt.tollgateItems.map(item => ({
              phaseId:     phase.id,
              label:       item.label,
              isMandatory: item.isMandatory,
            })),
          })
        }
      }

      // 5. Create 7 pre-acquisition lenses
      const lensTemplates = getLensTemplates()
      await tx.preAcquisitionLens.createMany({
        data: lensTemplates.map(lt => ({
          dealId:    newDeal.id,
          lensNumber: lt.lensNumber,
          lensName:  lt.lensName,
          benchmarks: lt.benchmarks,
        })),
      })

      // 6. Create task tree (two-pass: L2 then L3)
      const taskInputs = getTaskTreeTemplates(newDeal.id, workstreams)
      const l2Inputs   = taskInputs.filter(t => t.level === 2)
      const l3Inputs   = taskInputs.filter(t => t.level === 3)

      const keyToId = new Map<string, string>()
      for (const t of l2Inputs) {
        const created = await tx.task.create({
          data: {
            dealId:      t.dealId,
            workstreamId: t.workstreamId,
            parentId:    null,
            level:       t.level,
            title:       t.title,
            description: t.description,
            sortOrder:   t.sortOrder,
          },
          select: { id: true },
        })
        keyToId.set(t.key, created.id)
      }
      for (const t of l3Inputs) {
        const parentId = t.parentKey ? (keyToId.get(t.parentKey) ?? null) : null
        await tx.task.create({
          data: {
            dealId:      t.dealId,
            workstreamId: t.workstreamId,
            parentId,
            level:       t.level,
            title:       t.title,
            description: t.description,
            sortOrder:   t.sortOrder,
          },
        })
      }

      // 7. Audit log
      await tx.appAuditLog.create({
        data: {
          userId:     session.user.id,
          action:     'DEAL_CREATED',
          entityType: 'Deal',
          entityId:   newDeal.id,
          detail:     JSON.stringify({ name: newDeal.name, status: newDeal.status }),
        },
      })

      return newDeal
    })

    return NextResponse.json({ data: deal }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals]', err)
    return NextResponse.json({ error: 'Failed to create deal', code: 'CREATE_ERROR' }, { status: 500 })
  }
}
