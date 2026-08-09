import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  getPhaseTemplates,
  getLensTemplates,
  getTaskTreeTemplates,
} from '../lib/seed-templates'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding IMO Tool database...')

  const passwordHash = await bcrypt.hash('Demo1234!', 10)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@firstsource.com' },
    update: {},
    create: {
      email:      'admin@firstsource.com',
      name:       'Alex Admin',
      passwordHash,
      role:       'ADMIN',
      title:      'Head of Integration Management Office',
      department: 'Corporate Development',
      isActive:   true,
    },
  })

  const imoLead1 = await prisma.user.upsert({
    where:  { email: 'hanum.lead@firstsource.com' },
    update: {},
    create: {
      email:      'hanum.lead@firstsource.com',
      name:       'Hanum Merchant',
      passwordHash,
      role:       'IMO_LEAD',
      title:      'IMO Programme Lead',
      department: 'Corporate Development',
      isActive:   true,
    },
  })

  const imoLead2 = await prisma.user.upsert({
    where:  { email: 'deepinder.lead@firstsource.com' },
    update: {},
    create: {
      email:      'deepinder.lead@firstsource.com',
      name:       'Deepinder Singh Bhatia',
      passwordHash,
      role:       'IMO_LEAD',
      title:      'IMO Integration Lead',
      department: 'Corporate Development',
      isActive:   true,
    },
  })

  await prisma.user.upsert({
    where:  { email: 'dan.viewer@firstsource.com' },
    update: {},
    create: {
      email:      'dan.viewer@firstsource.com',
      name:       'Dan Wiernicki',
      passwordHash,
      role:       'VIEWER',
      title:      'Strategy Analyst',
      department: 'Group Strategy',
      isActive:   true,
    },
  })

  console.log('  Users created')

  const phaseTemplates = getPhaseTemplates()
  const lensTemplates  = getLensTemplates()

  type DealStatusType = 'PRE_CLOSE' | 'ACTIVE' | 'ON_HOLD' | 'CLOSED'
  type RAGStatusType  = 'GREEN' | 'AMBER' | 'RED' | 'GRAY'

  const dealDefs = [
    {
      dealData: {
        name:                'Acumen Healthcare BPO Acquisition',
        acquiredCompanyName: 'Acumen Healthcare BPO Ltd',
        sector:              'Healthcare BPO',
        description:         "Strategic acquisition to expand Firstsource's US healthcare capabilities, adding 3,200 FTEs across Phoenix, Dallas, and Manila.",
        status:              'ACTIVE' as DealStatusType,
        currentPhase:        4,
        overallRag:          'AMBER' as RAGStatusType,
        acquisitionDate:     new Date('2025-01-15'),
        imoLeadId:           imoLead1.id,
        execSponsorId:       admin.id,
        createdById:         admin.id,
        isSensitive:         false,
      },
      charter: {
        revenueSynergyTargetUSD: 18500000,
        costSynergyTargetUSD:    12000000,
        ebitdaTarget12m:         8200000,
        ebitdaTarget24m:         14500000,
        valueRealisationLead:    'Hanum Merchant',
        techLead:                'James Kirk (CTO)',
        changeCommsLead:         'Emma Davis (People)',
        execSteerCoCadence:      'Monthly - last Thursday',
        workingSteerCoCadence:   'Bi-weekly - Tuesday 14:00 GMT',
        integrationPrinciples:   'Client-first: no disruption to existing SLAs.\nPeople matter: retain top talent.\nSpeed with care: close in 60 days, integrate in 100.',
      },
      narrative: {
        valuationAndDealStructure: 'Acumen Healthcare BPO acquired for $142M EV at 8.4x EV/EBITDA. Cash acquisition with 12-month earn-out up to $18M. Financed 60% through existing Firstsource debt facilities and 40% via new $57M revolving credit facility.',
        dueDiligence: 'PwC confirmed normalised EBITDA of $16.9M on $98.4M revenue (FY2024). ServiceNow-based workflow platform identified. Migration complexity MEDIUM, estimated 18-month transition timeline.',
      },
      synergies: [
        { title: 'Headcount overlap reduction', category: 'COST' as const, baselineUSD: 2500000, committedUSD: 2200000, realisedUSD: 1100000, status: 'ON_TRACK' as const, benefitsFunnelStage: 'COMMITTED' as const, financeValidated: true, notes: 'Duplicate back-office roles removed via voluntary redundancy.' },
        { title: 'Procurement consolidation savings', category: 'COST' as const, baselineUSD: 1800000, committedUSD: 1600000, realisedUSD: 400000, status: 'ON_TRACK' as const, benefitsFunnelStage: 'COMMITTED' as const, financeValidated: true, notes: 'IT, facilities, and professional services consolidated.' },
        { title: 'Cross-sell FSL services to Acumen clients', category: 'REVENUE' as const, revenueBucket: 'BUCKET_A' as const, baselineUSD: 0, committedUSD: 3000000, realisedUSD: 800000, status: 'WATCH' as const, benefitsFunnelStage: 'IDENTIFIED' as const, financeValidated: false },
      ],
      imoLeadId: imoLead1.id,
      withActionsAndDecisions: true,
    },
    {
      dealData: {
        name:                'TechServe Financial Solutions Merger',
        acquiredCompanyName: 'TechServe Financial Solutions Inc.',
        sector:              'Financial Services BPO',
        description:         "Merger to strengthen Firstsource's US mortgage and fintech servicing capabilities with proprietary AI-driven document processing.",
        status:              'ACTIVE' as DealStatusType,
        currentPhase:        2,
        overallRag:          'GREEN' as RAGStatusType,
        acquisitionDate:     new Date('2025-04-30'),
        imoLeadId:           imoLead2.id,
        execSponsorId:       admin.id,
        createdById:         admin.id,
        isSensitive:         false,
      },
      charter: {
        revenueSynergyTargetUSD: 22000000,
        costSynergyTargetUSD:    9500000,
        ebitdaTarget12m:         11000000,
        ebitdaTarget24m:         19500000,
        valueRealisationLead:    'Deepinder Singh Bhatia',
        techLead:                'Anika Patel (VP Engineering)',
        changeCommsLead:         'Robert Walsh (HR)',
        execSteerCoCadence:      'Monthly - second Monday',
        workingSteerCoCadence:   'Weekly - Wednesday 10:00 EST',
        integrationPrinciples:   "Technology-led: leverage TechServe AI platform as combined backbone.\nRevenue first: protect client relationships before efficiency programmes.",
      },
      narrative: {
        valuationAndDealStructure: 'TechServe acquired for $185M EV at 9.2x EV/EBITDA. Three-year earnout up to $22M tied to revenue synergy delivery.',
        dueDiligence: "TechServe's MortgageAI platform achieves 94% accuracy on document classification. Three client change-of-control clauses - all clients have verbally agreed.",
      },
      synergies: [
        { title: 'AI platform infrastructure consolidation', category: 'COST' as const, baselineUSD: 1200000, committedUSD: 1100000, realisedUSD: 0, status: 'ON_TRACK' as const, benefitsFunnelStage: 'IDENTIFIED' as const, financeValidated: false },
        { title: 'Cross-sell mortgage servicing to FSL bank clients', category: 'REVENUE' as const, revenueBucket: 'BUCKET_A' as const, baselineUSD: 0, committedUSD: 5000000, realisedUSD: 0, status: 'WATCH' as const, benefitsFunnelStage: 'IDENTIFIED' as const, financeValidated: false },
      ],
      imoLeadId: imoLead2.id,
      withActionsAndDecisions: true,
    },
    {
      dealData: {
        name:                'GlobalReach Contact Centre Acquisition',
        acquiredCompanyName: 'GlobalReach Contact Centres Ltd',
        sector:              'Customer Lifecycle Management',
        description:         "Acquisition of GlobalReach to add 5,100 FTEs across South Africa, Kenya, and Poland.",
        status:              'PRE_CLOSE' as DealStatusType,
        currentPhase:        1,
        overallRag:          'GRAY' as RAGStatusType,
        acquisitionDate:     new Date('2025-09-01'),
        imoLeadId:           imoLead1.id,
        execSponsorId:       admin.id,
        createdById:         admin.id,
        isSensitive:         true,
      },
      charter:   null as null,
      narrative: null as null,
      synergies: [] as unknown[],
      imoLeadId: imoLead1.id,
      withActionsAndDecisions: false,
    },
    {
      dealData: {
        name:                'DataBridge Analytics Integration',
        acquiredCompanyName: 'DataBridge Analytics Corp.',
        sector:              'Data & Analytics',
        description:         "Completed integration of DataBridge Analytics, enhancing Firstsource's analytics and AI capabilities.",
        status:              'CLOSED' as DealStatusType,
        currentPhase:        6,
        overallRag:          'GREEN' as RAGStatusType,
        acquisitionDate:     new Date('2023-11-01'),
        closedDate:          new Date('2024-11-30'),
        imoLeadId:           imoLead2.id,
        execSponsorId:       admin.id,
        createdById:         admin.id,
        isSensitive:         false,
      },
      charter: {
        revenueSynergyTargetUSD: 8000000,
        costSynergyTargetUSD:    4200000,
        ebitdaTarget12m:         5500000,
        ebitdaTarget24m:         9800000,
        valueRealisationLead:    'Deepinder Singh Bhatia',
        techLead:                'Jenny Liu (CTO)',
        changeCommsLead:         'Tom Morris (HR)',
        execSteerCoCadence:      'Monthly - first Tuesday',
        workingSteerCoCadence:   'Bi-weekly - Thursday',
        integrationPrinciples:   "Analytics-first: embed DataBridge capability within 6 months.\nFull retention: all 180 data scientists retained.",
        isComplete:  true,
        signedOffBy: 'Deepinder Singh Bhatia',
        signedOffAt: new Date('2023-12-15'),
      },
      narrative: {
        valuationAndDealStructure: 'DataBridge acquired for $52M at 7.8x EV/EBITDA. Cash acquisition, no earnout. Funded from existing facilities. Closed 1 November 2023.',
        dueDiligence: 'Clean due diligence. All 14 analytics products proprietary. 180 data scientists, no non-compete issues.',
      },
      synergies: [
        { title: 'Analytics headcount optimisation', category: 'COST' as const, baselineUSD: 1800000, committedUSD: 1700000, realisedUSD: 1700000, status: 'ON_TRACK' as const, benefitsFunnelStage: 'REALISED' as const, financeValidated: true },
        { title: 'New analytics services revenue from FSL clients', category: 'REVENUE' as const, revenueBucket: 'BUCKET_B' as const, baselineUSD: 0, committedUSD: 5500000, realisedUSD: 5500000, status: 'ON_TRACK' as const, benefitsFunnelStage: 'REALISED' as const, financeValidated: true },
      ],
      imoLeadId: imoLead2.id,
      withActionsAndDecisions: false,
    },
  ]

  for (const def of dealDefs) {
    const existing = await prisma.deal.findFirst({ where: { name: def.dealData.name } })
    if (existing) {
      console.log('  Skipping (already exists): ' + def.dealData.name)
      continue
    }

    const { deal, workstreams } = await prisma.$transaction(async (tx) => {
      const newDeal = await tx.deal.create({ data: def.dealData })

      if (def.charter) {
        await tx.integrationCharter.create({ data: { dealId: newDeal.id, ...def.charter } })
      }
      if (def.narrative) {
        await tx.dealNarrative.create({ data: { dealId: newDeal.id, ...def.narrative } })
      }

      const wss = await Promise.all([
        tx.workstream.create({ data: { dealId: newDeal.id, code: 'WS01', name: 'People & Culture'     }, select: { id: true, code: true } }),
        tx.workstream.create({ data: { dealId: newDeal.id, code: 'WS02', name: 'Technology & Systems'  }, select: { id: true, code: true } }),
        tx.workstream.create({ data: { dealId: newDeal.id, code: 'WS03', name: 'Operations & Delivery' }, select: { id: true, code: true } }),
        tx.workstream.create({ data: { dealId: newDeal.id, code: 'WS04', name: 'Finance & Synergies'   }, select: { id: true, code: true } }),
        tx.workstream.create({ data: { dealId: newDeal.id, code: 'WS05', name: 'Sales & Commercial'    }, select: { id: true, code: true } }),
      ])

      for (const pt of phaseTemplates) {
        const isDone = newDeal.currentPhase > pt.phaseNumber
        const isNow  = newDeal.currentPhase === pt.phaseNumber
        const phase  = await tx.dealPhase.create({
          data: {
            dealId:              newDeal.id,
            phaseNumber:         pt.phaseNumber,
            phaseName:           pt.phaseName,
            driveTag:            pt.driveTag,
            timeframeLabel:      pt.timeframeLabel,
            tollgateName:        pt.tollgateName,
            tollgateDescription: pt.tollgateDescription,
            tollgateComplete:    isDone,
            status:              isDone ? 'COMPLETE' : isNow ? 'IN_PROGRESS' : 'NOT_STARTED',
          },
          select: { id: true },
        })
        await tx.tollgateItem.createMany({
          data: pt.tollgateItems.map(item => ({
            phaseId:     phase.id,
            label:       item.label,
            isMandatory: item.isMandatory,
            isComplete:  isDone,
          })),
        })
      }

      await tx.preAcquisitionLens.createMany({
        data: lensTemplates.map(lt => ({
          dealId:     newDeal.id,
          lensNumber: lt.lensNumber,
          lensName:   lt.lensName,
          benchmarks: lt.benchmarks,
          status:     newDeal.currentPhase >= 2 ? 'PASS' as const : 'TBD' as const,
        })),
      })

      if (def.synergies.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await tx.synergyLine.createMany({ data: def.synergies.map((s: any) => ({ ...s, dealId: newDeal.id })) })
      }

      await tx.appAuditLog.create({
        data: { userId: admin.id, action: 'DEAL_SEEDED', entityType: 'Deal', entityId: newDeal.id, detail: 'Seed: ' + newDeal.name },
      })

      return { deal: newDeal, workstreams: wss }
    }, { timeout: 60000, maxWait: 15000 })

    // Task creation runs outside the transaction to avoid serverless connection timeout
    const taskInputs = getTaskTreeTemplates(deal.id, workstreams)
    const keyToId    = new Map<string, string>()

    for (const t of taskInputs.filter(t => t.level === 2)) {
      const created = await prisma.task.create({
        data: { dealId: t.dealId, workstreamId: t.workstreamId, parentId: null, level: t.level, title: t.title, description: t.description, sortOrder: t.sortOrder },
        select: { id: true },
      })
      keyToId.set(t.key, created.id)
    }
    for (const t of taskInputs.filter(t => t.level === 3)) {
      const parentId = t.parentKey ? (keyToId.get(t.parentKey) ?? null) : null
      await prisma.task.create({
        data: { dealId: t.dealId, workstreamId: t.workstreamId, parentId, level: t.level, title: t.title, description: t.description, sortOrder: t.sortOrder },
      })
    }

    if (def.dealData.status !== 'CLOSED') {
      const ws01 = await prisma.workstream.findFirst({ where: { dealId: deal.id, code: 'WS01' } })
      await prisma.riskEntry.createMany({
        data: [
          {
            dealId:       deal.id,
            workstreamId: ws01?.id,
            description:  'Key talent attrition risk - critical team leads may resign post-announcement',
            likelihood:   'HIGH'   as const,
            impact:       'HIGH'   as const,
            riskScore:    9,
            mitigation:   'Retention packages issued to top-30 individuals. Stay bonus of 15% base at 12-month mark.',
            ownerId:      def.imoLeadId,
            status:       'OPEN' as const,
          },
          {
            dealId:      deal.id,
            description: 'Client change-of-control exit risk - Tier 2 clients with termination rights',
            likelihood:  'MEDIUM' as const,
            impact:      'HIGH'   as const,
            riskScore:   6,
            mitigation:  'Account manager outreach completed. Clients confirmed intent to continue. Formal consent in progress.',
            ownerId:     def.imoLeadId,
            status:      'OPEN' as const,
          },
        ],
      })
    }

    if (def.withActionsAndDecisions) {
      await prisma.decisionEntry.createMany({
        data: [
          {
            dealId:           deal.id,
            title:            'Day 1 brand: operate under Firstsource branding',
            context:          'Decision: maintain acquired company brand on Day 1 or immediately rebrand.',
            decisionMade:     'Operate under Firstsource brand from Day 1. Phased migration of physical signage over 90 days.',
            decisionMakerId:  admin.id,
            decidedAt:        new Date('2025-01-10'),
            rationale:        'Immediate brand clarity reduces client confusion and accelerates cross-sell.',
            impactWorkstream: 'WS05 Sales & Commercial, WS01 People & Culture',
          },
          {
            dealId:           deal.id,
            title:            'Maintain separate payroll for 90 days post-close',
            context:          'Options: (a) immediate Day 1 consolidation or (b) 90-day parallel run.',
            decisionMade:     'Maintain separate payroll for 90 days then migrate to Firstsource Workday in Month 4.',
            decisionMakerId:  admin.id,
            decidedAt:        new Date('2025-01-08'),
            rationale:        'Payroll consolidation risk on Day 1 unacceptable at scale. 90-day parallel run eliminates pay disruption risk.',
            impactWorkstream: 'WS01 People & Culture, WS04 Finance & Synergies',
          },
        ],
      })

      await prisma.actionEntry.createMany({
        data: [
          {
            dealId:      deal.id,
            title:       'Complete technology stack compatibility assessment',
            description: 'Detailed assessment of acquired company tech stack vs Firstsource standard.',
            ownerId:     imoLead2.id,
            dueDate:     new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            priority:    'HIGH' as const,
            status:      'IN_PROGRESS' as const,
          },
          {
            dealId:   deal.id,
            title:    'Obtain signed consent from top-3 clients on change of control',
            ownerId:  def.imoLeadId,
            dueDate:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            priority: 'HIGH' as const,
            status:   'OPEN' as const,
          },
          {
            dealId:   deal.id,
            title:    'Issue retention letters to top-30 talent list',
            ownerId:  def.imoLeadId,
            dueDate:  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            priority: 'HIGH' as const,
            status:   'OPEN' as const,
          },
        ],
      })
    }

    if (def.dealData.status !== 'PRE_CLOSE') {
      const [ws01, ws04] = await Promise.all([
        prisma.workstream.findFirst({ where: { dealId: deal.id, code: 'WS01' } }),
        prisma.workstream.findFirst({ where: { dealId: deal.id, code: 'WS04' } }),
      ])
      if (ws01) {
        await prisma.resourceAllocation.create({
          data: { dealId: deal.id, userId: imoLead1.id, workstreamId: ws01.id, roleDescription: 'People & Culture Workstream Lead', allocationPct: 60, startDate: def.dealData.acquisitionDate ?? new Date() },
        })
      }
      if (ws04) {
        await prisma.resourceAllocation.create({
          data: { dealId: deal.id, userId: imoLead2.id, workstreamId: ws04.id, roleDescription: 'Finance & Synergies Workstream Lead', allocationPct: 50, startDate: def.dealData.acquisitionDate ?? new Date() },
        })
      }
    }

    console.log('  Deal seeded: ' + def.dealData.name)
  }

  await prisma.appSetting.upsert({
    where:  { key: 'COMPANY_NAME' },
    update: {},
    create: { key: 'COMPANY_NAME', value: 'Firstsource Solutions Ltd', updatedById: admin.id },
  })
  await prisma.appSetting.upsert({
    where:  { key: 'IMO_TOOL_VERSION' },
    update: {},
    create: { key: 'IMO_TOOL_VERSION', value: '1.0.0-demo', updatedById: admin.id },
  })

  console.log('')
  console.log('Seed complete.')
  console.log('Demo credentials (password: Demo1234!):')
  console.log('  admin@firstsource.com          ADMIN')
  console.log('  hanum.lead@firstsource.com     IMO_LEAD')
  console.log('  deepinder.lead@firstsource.com IMO_LEAD')
  console.log('  dan.viewer@firstsource.com     VIEWER')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
