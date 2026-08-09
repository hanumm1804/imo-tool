/**
 * seed-templates.ts
 * Canonical DRIVE-framework templates for IMO Tool deal creation.
 * Created in a Prisma transaction when a new deal is provisioned.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhaseTemplate {
  phaseNumber:        number
  phaseName:          string
  driveTag:           string
  timeframeLabel:     string
  tollgateName:       string
  tollgateDescription: string
  tollgateItems:      TollgateItemTemplate[]
}

export interface TollgateItemTemplate {
  label:       string
  isMandatory: boolean
}

export interface LensTemplate {
  lensNumber:  number
  lensName:    string
  benchmarks:  string
}

export interface TaskSeedInput {
  workstreamCode: string
  level:          number
  title:          string
  description?:   string
  parentKey?:     string
  key:            string
  sortOrder:      number
}

export interface ResolvedTaskInput {
  dealId:       string
  workstreamId: string
  parentKey:    string | null
  key:          string
  level:        number
  title:        string
  description:  string
  sortOrder:    number
}

// ─── Phase Templates ──────────────────────────────────────────────────────────

export const phaseTemplates: PhaseTemplate[] = [
  {
    phaseNumber:         1,
    phaseName:           'Phase 01 — Direction',
    driveTag:            'D',
    timeframeLabel:      'T-90 to T-30',
    tollgateName:        'Phase 1 Tollgate — Direction',
    tollgateDescription: 'Integration strategy set, IMO team chartered, synergy baseline agreed, and all mandatory Phase 1 items complete.',
    tollgateItems: [
      { label: 'IMO team appointed and chartered', isMandatory: true },
      { label: 'Pre-acquisition lens review complete', isMandatory: true },
      { label: 'Synergy baseline signed off', isMandatory: true },
      { label: 'Day 1 operating model decision made', isMandatory: true },
      { label: 'Integration charter v1 published', isMandatory: true },
      { label: 'Workstream owners confirmed', isMandatory: true },
    ],
  },
  {
    phaseNumber:         2,
    phaseName:           'Phase 02 — Readiness',
    driveTag:            'R',
    timeframeLabel:      'T-30 to Close',
    tollgateName:        'Phase 2 Tollgate — Readiness',
    tollgateDescription: 'Deep-dive due diligence complete, synergy model stress-tested, and Day 1 readiness checklist finalised.',
    tollgateItems: [
      { label: 'Data room access complete', isMandatory: true },
      { label: 'Technology landscape mapped', isMandatory: true },
      { label: 'People & talent risk assessment signed off', isMandatory: true },
      { label: 'Client concentration risk reviewed', isMandatory: true },
      { label: 'Synergy model stress-tested', isMandatory: true },
      { label: 'Day 1 readiness checklist finalised', isMandatory: true },
    ],
  },
  {
    phaseNumber:         3,
    phaseName:           'Phase 03 — Integration (Day 1)',
    driveTag:            'I',
    timeframeLabel:      'Close to Day 5',
    tollgateName:        'Phase 3 Tollgate — Day 1 Complete',
    tollgateDescription: 'Legal close confirmed, employee and client communications delivered, IT systems secured, and Day 1 war room debrief complete.',
    tollgateItems: [
      { label: 'Close confirmed — legal entities signed', isMandatory: true },
      { label: 'Employee communications delivered by 09:00 Day 1', isMandatory: true },
      { label: 'Tier 1 and Tier 2 client communications sent', isMandatory: true },
      { label: 'Payroll continuity confirmed', isMandatory: true },
      { label: 'IT systems access baseline secured', isMandatory: true },
      { label: 'Day 1 war room debrief complete', isMandatory: true },
    ],
  },
  {
    phaseNumber:         4,
    phaseName:           'Phase 04 — Value (First 100 Days)',
    driveTag:            'V',
    timeframeLabel:      'Day 1 to Day 100',
    tollgateName:        'Phase 4 Tollgate — 100-Day Review',
    tollgateDescription: 'Governance cadence established, ≥20% synergy captured, integrated org structure live, and 100-day review complete.',
    tollgateItems: [
      { label: 'Governance cadence established', isMandatory: true },
      { label: '30-day operational health check complete', isMandatory: true },
      { label: 'Quick-win synergies captured (≥20% of target)', isMandatory: true },
      { label: 'Integrated org structure live', isMandatory: true },
      { label: '100-day integration review complete', isMandatory: true },
    ],
  },
  {
    phaseNumber:         5,
    phaseName:           'Phase 05 — Embed',
    driveTag:            'E',
    timeframeLabel:      'Day 100 to Day 180',
    tollgateName:        'Phase 5 Tollgate — Integration Execution',
    tollgateDescription: 'Technology roadmap approved, ≥50% synergy realised, culture pulse completed, and client retention confirmed.',
    tollgateItems: [
      { label: 'Technology integration roadmap approved', isMandatory: true },
      { label: 'Process harmonisation complete (Tier 1 processes)', isMandatory: true },
      { label: '50% synergy realisation milestone confirmed', isMandatory: true },
      { label: 'Culture integration health pulse conducted', isMandatory: true },
      { label: 'Client retention score reviewed', isMandatory: true },
    ],
  },
  {
    phaseNumber:         6,
    phaseName:           'Phase 06 — BAU & Value Close',
    driveTag:            'CLOSE',
    timeframeLabel:      'Day 180 to Day 365',
    tollgateName:        'Phase 6 Tollgate — IMO Mandate Close',
    tollgateDescription: '100% synergy realised, legacy systems decommissioned, all workstreams formally closed, and IMO mandate signed off.',
    tollgateItems: [
      { label: 'Full synergy realisation confirmed by CFO', isMandatory: true },
      { label: 'Legacy systems decommissioned', isMandatory: true },
      { label: 'IMO workstreams formally closed', isMandatory: true },
      { label: 'Integration lessons-learned published', isMandatory: true },
      { label: 'IMO mandate formally closed — final ISC sign-off', isMandatory: true },
    ],
  },
]

// ─── Lens Templates ───────────────────────────────────────────────────────────

export const lensTemplates: LensTemplate[] = [
  {
    lensNumber:  1,
    lensName:    'Financial Health',
    benchmarks:  'EBITDA >12–15%, Net Debt <3×, CAGR >5%, FCF conversion >70% of EBITDA',
  },
  {
    lensNumber:  2,
    lensName:    'Revenue Quality',
    benchmarks:  '>70% recurring revenue, no single client >25% of revenue, gross revenue churn <10% per annum',
  },
  {
    lensNumber:  3,
    lensName:    'Growth Trajectory',
    benchmarks:  '>8% CAGR over last 3 years, qualified pipeline >2× annual revenue, NRR >100%',
  },
  {
    lensNumber:  4,
    lensName:    'Operational Fitness',
    benchmarks:  'Staff attrition <20%, offshore/nearshore mix >35%, SLA breach rate <2%, CSAT/NPS positive trend',
  },
  {
    lensNumber:  5,
    lensName:    'Strategic Fit',
    benchmarks:  '3+ synergy categories identified, existing client overlap <40%, geographic expansion enablement confirmed',
  },
  {
    lensNumber:  6,
    lensName:    'Integration Complexity',
    benchmarks:  'Single ERP preferred (or clear migration path), HIPAA/URAC/ISO compliance mapped, data sovereignty understood',
  },
  {
    lensNumber:  7,
    lensName:    'Market Necessity',
    benchmarks:  'TAM >$5Bn in target segments, build vs buy timeline >18 months favours acquisition, no organic alternative within 24 months',
  },
]

// ─── Task Tree Templates ──────────────────────────────────────────────────────

const rawTaskTree: Omit<TaskSeedInput, 'sortOrder'>[] = [
  // ── PHASE 1 — Direction ───────────────────────────────────────────────────
  { key: 'P1-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — Direction', description: 'Workforce, leadership, and cultural assessment for Phase 1.' },
  { key: 'P1-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P1-WS01-L2', title: 'Define leadership retention strategy', description: 'Identify top 20 leadership roles; design retention package framework.' },
  { key: 'P1-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P1-WS01-L2', title: 'Identify cultural integration risks', description: 'Assess values, management style, and employee expectations gaps.' },
  { key: 'P1-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P1-WS01-L2', title: 'Map key talent — top 30 performers', description: 'Compile talent heatmap of top-30 individuals; flag flight risks.' },
  { key: 'P1-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P1-WS01-L2', title: 'Review HR policies and total compensation structures', description: 'Compare benefits, bonus, and grading structures; identify harmonisation cost and timeline.' },
  { key: 'P1-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P1-WS01-L2', title: 'Identify TUPE / employment law obligations', description: 'Confirm applicable transfer-of-undertaking regulations; engage employment counsel.' },

  { key: 'P1-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — Direction', description: 'Technology landscape, integration complexity, and data security for Phase 1.' },
  { key: 'P1-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P1-WS02-L2', title: 'Assess technology landscape and stack compatibility', description: 'Catalogue all production systems; identify overlaps and gaps vs Firstsource stack.' },
  { key: 'P1-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P1-WS02-L2', title: 'Identify data security and GDPR / data residency requirements', description: 'Map personal data flows; confirm data residency obligations; flag GDPR/HIPAA/ISO gaps.' },
  { key: 'P1-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P1-WS02-L2', title: 'Map integration complexity — ERP, CRM, telephony', description: 'Score each system on integration complexity; estimate migration cost range.' },
  { key: 'P1-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P1-WS02-L2', title: 'Review software licensing and vendor contracts', description: 'Identify change-of-control clauses; flag renegotiation needs.' },
  { key: 'P1-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P1-WS02-L2', title: 'Assess cybersecurity posture and open vulnerabilities', description: 'Review penetration test, vulnerability scan, and incident history.' },

  { key: 'P1-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — Direction', description: 'Operational model, service delivery, and continuity planning for Phase 1.' },
  { key: 'P1-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P1-WS03-L2', title: 'Baseline current SLA performance', description: 'Collect last 12 months of SLA performance data per client and process.' },
  { key: 'P1-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P1-WS03-L2', title: 'Map operating model and delivery locations', description: 'Document delivery network; confirm site lease obligations.' },
  { key: 'P1-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P1-WS03-L2', title: 'Identify Day 1 operational continuity risks', description: 'Compile operational dependencies that require action before or on close day.' },
  { key: 'P1-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P1-WS03-L2', title: 'Review workforce capacity and productivity benchmarks', description: 'Assess FTE capacity, utilisation rates, and productivity benchmarks vs Firstsource standard.' },
  { key: 'P1-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P1-WS03-L2', title: 'Confirm regulatory and compliance obligations', description: 'Identify industry-specific licences, certifications, and regulatory obligations.' },

  { key: 'P1-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — Direction', description: 'Financial baseline, synergy identification, and earn-out structure for Phase 1.' },
  { key: 'P1-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P1-WS04-L2', title: 'Define synergy baseline — cost and revenue', description: 'Quantify addressable cost and revenue synergies.' },
  { key: 'P1-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P1-WS04-L2', title: 'Name synergy owners per line item', description: 'Assign a named owner with P&L accountability to each synergy line.' },
  { key: 'P1-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P1-WS04-L2', title: 'Set up earn-out tracking structure', description: 'If deal includes earn-out provisions, design tracking model and reporting cadence.' },
  { key: 'P1-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P1-WS04-L2', title: 'Review management accounts and working capital position', description: 'Assess last 3 years P&L, balance sheet, and working capital cycle.' },
  { key: 'P1-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P1-WS04-L2', title: 'Assess integration one-off cost envelope', description: 'Estimate total integration cost; confirm funding source.' },

  { key: 'P1-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — Direction', description: 'Client portfolio, commercial strategy, and cross-sell opportunity mapping for Phase 1.' },
  { key: 'P1-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P1-WS05-L2', title: 'Audit client contracts and revenue concentration', description: 'Review all client MSAs; flag change-of-control clauses and revenue concentration risk.' },
  { key: 'P1-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P1-WS05-L2', title: 'Identify cross-sell pipeline opportunities', description: 'Map target client base against Firstsource service catalogue; quantify addressable revenue.' },
  { key: 'P1-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P1-WS05-L2', title: 'Confirm Tier 1 client relationships and health', description: 'Identify top 5 clients by revenue; document relationship owner, NPS, and renewal dates.' },
  { key: 'P1-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P1-WS05-L2', title: 'Design client communication strategy for close', description: 'Draft segmented client communication plan; agree messaging framework.' },
  { key: 'P1-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P1-WS05-L2', title: 'Review pricing model and gross margin by client', description: 'Analyse pricing vs cost of delivery per client; identify margin improvement opportunities.' },

  // ── PHASE 2 — Readiness ───────────────────────────────────────────────────
  { key: 'P2-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — Readiness', description: 'Deep-dive HR, leadership, and culture due diligence.' },
  { key: 'P2-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P2-WS01-L2', title: 'Complete headcount and org structure analysis', description: 'Produce current-state org chart; validate headcount vs budget; identify duplicate roles.' },
  { key: 'P2-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P2-WS01-L2', title: 'Conduct leadership capability assessments', description: 'Assess C-1 and C-2 leaders against Firstsource leadership framework.' },
  { key: 'P2-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P2-WS01-L2', title: 'Review attrition data and root cause', description: 'Analyse 24-month attrition by function and location; identify flight risk hotspots.' },
  { key: 'P2-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P2-WS01-L2', title: 'Review employment contracts — notice periods and restrictive covenants', description: 'Confirm key employee notice periods, non-compete obligations, and IP assignment clauses.' },
  { key: 'P2-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P2-WS01-L2', title: 'Finalise retention package recommendations', description: 'Propose stay bonuses and accelerated vesting for top-30 talent.' },

  { key: 'P2-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — Readiness', description: 'Technical architecture, security, and systems integration due diligence.' },
  { key: 'P2-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P2-WS02-L2', title: 'Complete full IT asset and infrastructure inventory', description: 'Document all servers, cloud accounts, network infrastructure, and end-user compute.' },
  { key: 'P2-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P2-WS02-L2', title: 'Conduct technical architecture review', description: 'Assess scalability, reliability, and security posture of core platforms.' },
  { key: 'P2-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P2-WS02-L2', title: 'Review open vulnerabilities and security incidents (24 months)', description: 'Obtain penetration test reports, CVE backlog, and breach/incident log.' },
  { key: 'P2-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P2-WS02-L2', title: 'Confirm cloud spend and contract terms', description: 'Review AWS/Azure/GCP spend profile; confirm contract terms and exit rights.' },
  { key: 'P2-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P2-WS02-L2', title: 'Produce technology integration blueprint draft', description: 'Draft technology integration blueprint with keep/consolidate/retire decisions per system.' },

  { key: 'P2-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — Readiness', description: 'Operational processes, delivery quality, and continuity risk assessment.' },
  { key: 'P2-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P2-WS03-L2', title: 'Perform process walk-throughs for Tier 1 delivery processes', description: 'Shadow operational teams on 5 highest-revenue processes; document as-is workflows.' },
  { key: 'P2-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P2-WS03-L2', title: 'Validate SLA performance with client evidence', description: 'Cross-reference SLA data with client invoicing and penalty records.' },
  { key: 'P2-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P2-WS03-L2', title: 'Assess BCP and disaster recovery readiness', description: 'Review BCP documentation; test DR recovery time objectives against Firstsource standards.' },
  { key: 'P2-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P2-WS03-L2', title: 'Review subcontractor and third-party dependencies', description: 'Map all critical third-party vendor relationships; assess financial stability.' },
  { key: 'P2-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P2-WS03-L2', title: 'Identify operational quick wins for Day 1–100', description: 'Identify 3–5 process improvements deliverable within 100 days.' },

  { key: 'P2-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — Readiness', description: 'Financial model validation, synergy stress-testing, and cost envelope sign-off.' },
  { key: 'P2-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P2-WS04-L2', title: 'Validate normalised EBITDA and working capital', description: 'Confirm EBITDA adjustments are appropriate; validate working capital peg assumptions.' },
  { key: 'P2-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P2-WS04-L2', title: 'Stress-test synergy model (base / upside / downside)', description: 'Produce three-scenario synergy waterfall; confirm break-even payback period.' },
  { key: 'P2-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P2-WS04-L2', title: 'Review tax structure and deferred liabilities', description: 'Obtain tax due diligence report; flag deferred tax and cross-border transfer pricing exposures.' },
  { key: 'P2-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P2-WS04-L2', title: 'Confirm integration cost-to-achieve estimate', description: 'Lock integration cost envelope with CFO sign-off; load into deal financial model.' },
  { key: 'P2-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P2-WS04-L2', title: 'Set up synergy tracker in SharePoint', description: 'Build synergy tracking template with owner, timeline, and % realised columns.' },

  { key: 'P2-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — Readiness', description: 'Commercial risk, pipeline quality, and client relationship deep-dive.' },
  { key: 'P2-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P2-WS05-L2', title: 'Review all client contracts for change-of-control clauses', description: 'Legal review of 100% of client MSAs; produce schedule of contracts requiring consent on close.' },
  { key: 'P2-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P2-WS05-L2', title: 'Conduct Tier 1 client relationship calls (confidential)', description: 'Informal calls with top 3 clients to gauge relationship health and intent.' },
  { key: 'P2-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P2-WS05-L2', title: 'Validate pipeline quality and close probability', description: 'Review CRM pipeline; apply Firstsource deal-scoring methodology.' },
  { key: 'P2-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P2-WS05-L2', title: 'Assess go-to-market model and sales productivity', description: 'Review GTM structure, quota attainment, and sales cycle length vs benchmarks.' },
  { key: 'P2-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P2-WS05-L2', title: 'Identify brand integration approach and timeline', description: 'Determine rebrand strategy (immediate, phased, or co-brand).' },

  // ── PHASE 3 — Integration (Day 1) ─────────────────────────────────────────
  { key: 'P3-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — Day 1 Readiness', description: 'Employee experience, communications, and HR continuity on Day 1.' },
  { key: 'P3-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P3-WS01-L2', title: 'Deliver all-hands employee announcement on Day 1', description: 'Execute global employee communication by 09:00 on close day.' },
  { key: 'P3-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P3-WS01-L2', title: 'Publish employee FAQ on company intranet', description: 'Post pre-approved FAQ covering pay, benefits, and reporting lines.' },
  { key: 'P3-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P3-WS01-L2', title: 'Confirm payroll continuity for next pay date', description: 'Verify payroll processing handover with Finance; confirm no disruption.' },
  { key: 'P3-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P3-WS01-L2', title: 'Brief line managers on Day 1 messaging', description: 'Hold mandatory line manager briefing 48 hours before close.' },
  { key: 'P3-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P3-WS01-L2', title: 'Activate retention packages for top-30 talent', description: 'Issue retention letters to top-30 individuals on Day 1.' },

  { key: 'P3-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — Day 1 Readiness', description: 'IT access, system continuity, and security controls on Day 1.' },
  { key: 'P3-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P3-WS02-L2', title: 'Revoke former owner IT access at close', description: 'Confirm all seller-side system access is revoked at legal close.' },
  { key: 'P3-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P3-WS02-L2', title: 'Confirm 100% critical system availability on Day 1', description: 'Run system health checks on all Tier 1 production systems from 06:00.' },
  { key: 'P3-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P3-WS02-L2', title: 'Issue new email domain and Firstsource credentials (wave 1)', description: 'Provision Wave 1 employees with @firstsource.com email accounts and SSO credentials.' },
  { key: 'P3-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P3-WS02-L2', title: 'Activate Firstsource security monitoring on target network', description: 'Deploy Firstsource SOC monitoring agents; confirm data ingestion in SIEM within 24 hours.' },
  { key: 'P3-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P3-WS02-L2', title: 'Stand up IT Day 1 help desk support line', description: 'Activate dedicated IT support channel for target employees.' },

  { key: 'P3-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — Day 1 Readiness', description: 'Operational continuity, client SLAs, and delivery governance on Day 1.' },
  { key: 'P3-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P3-WS03-L2', title: 'Stand up Day 1 operations war room', description: 'Activate IMO war room with workstream leads on-call from 07:00 on close day.' },
  { key: 'P3-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P3-WS03-L2', title: 'Confirm client SLA obligations carry over uninterrupted', description: 'Notify all client operations leads of legal close; confirm SLA measurement continues.' },
  { key: 'P3-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P3-WS03-L2', title: 'Activate interim governance structure', description: 'Launch daily operations stand-up with target delivery leads.' },
  { key: 'P3-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P3-WS03-L2', title: 'Verify supply chain and third-party vendor continuity', description: 'Confirm all key third-party vendor contracts have transferred or novated correctly.' },
  { key: 'P3-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P3-WS03-L2', title: 'Log and triage Day 1 issues in RAID register', description: 'Capture all Day 1 operational issues into RAID log; assign owners; escalate blockers.' },

  { key: 'P3-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — Day 1 Readiness', description: 'Financial reporting continuity and synergy tracker activation on Day 1.' },
  { key: 'P3-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P3-WS04-L2', title: 'Confirm bank accounts and payment authorities transferred', description: 'Verify all target bank accounts are under Firstsource signatory control.' },
  { key: 'P3-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P3-WS04-L2', title: 'Open synergy tracking report for Day 1 baseline capture', description: 'Capture baseline run-rate for all synergy lines on close day.' },
  { key: 'P3-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P3-WS04-L2', title: 'Confirm close accounts preparation timetable', description: 'Agree completion accounts preparation schedule with target CFO.' },
  { key: 'P3-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P3-WS04-L2', title: 'Transfer insurance and risk management policies', description: 'Confirm all insurance policies have been novated or replaced; no coverage gap.' },
  { key: 'P3-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P3-WS04-L2', title: 'Integrate target P&L into Firstsource management accounts', description: 'Agree chart-of-accounts mapping; confirm first consolidated management accounts will include target.' },

  { key: 'P3-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — Day 1 Readiness', description: 'Client communications, commercial continuity, and brand activation on Day 1.' },
  { key: 'P3-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P3-WS05-L2', title: 'Execute Tier 1 client personal calls on Day 1', description: 'Senior sponsor personally calls top-5 clients by revenue on close day.' },
  { key: 'P3-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P3-WS05-L2', title: 'Send Tier 2 client announcement letters', description: 'Dispatch pre-approved announcement letters to all Tier 2 clients before 12:00 on Day 1.' },
  { key: 'P3-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P3-WS05-L2', title: 'Update CRM with new account ownership and deal stage', description: 'Migrate target company pipeline into Firstsource CRM.' },
  { key: 'P3-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P3-WS05-L2', title: 'Issue press announcement and external communications', description: 'Publish agreed press release; update website; notify industry analysts.' },
  { key: 'P3-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P3-WS05-L2', title: 'Confirm no change-of-control client exits triggered', description: 'Verify no client has exercised exit rights post-announcement.' },

  // ── PHASE 4 — Value (First 100 Days) ─────────────────────────────────────
  { key: 'P4-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — First 100 Days', description: 'Organisation design, culture integration, and people stabilisation.' },
  { key: 'P4-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P4-WS01-L2', title: 'Launch integrated leadership team and announce org structure', description: 'Announce combined leadership structure; publish new org chart.' },
  { key: 'P4-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P4-WS01-L2', title: 'Harmonise HR policies to Firstsource standard (phase 1)', description: 'Align leave, performance management, and code-of-conduct policies.' },
  { key: 'P4-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P4-WS01-L2', title: 'Conduct culture integration workshops', description: 'Run facilitated culture workshops with leadership teams from both businesses.' },
  { key: 'P4-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P4-WS01-L2', title: 'Measure 60-day attrition against baseline', description: 'Compare 60-day post-close attrition rate against pre-close baseline.' },
  { key: 'P4-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P4-WS01-L2', title: 'Deliver leadership onboarding programme', description: 'Run structured onboarding for all target leadership joining Firstsource.' },

  { key: 'P4-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — First 100 Days', description: 'Technology stabilisation, quick-win migrations, and integration roadmap confirmation.' },
  { key: 'P4-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P4-WS02-L2', title: 'Complete email domain migration for all staff', description: 'Migrate all target employees to Firstsource email domain.' },
  { key: 'P4-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P4-WS02-L2', title: 'Finalise and publish technology integration roadmap', description: 'Publish approved technology integration roadmap with timeline.' },
  { key: 'P4-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P4-WS02-L2', title: 'Integrate collaboration tools (Teams / SharePoint)', description: 'Add target organisation tenants to Firstsource Microsoft 365 tenant.' },
  { key: 'P4-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P4-WS02-L2', title: 'Consolidate quick-win SaaS duplicates', description: 'Identify and eliminate duplicate SaaS subscriptions; confirm cost saving realised.' },
  { key: 'P4-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P4-WS02-L2', title: 'Establish unified IT support and ITSM process', description: 'Merge service desk; all target employees using Firstsource ITSM by Day 60.' },

  { key: 'P4-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — First 100 Days', description: 'Operational stabilisation, process harmonisation, and governance cadence.' },
  { key: 'P4-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P4-WS03-L2', title: 'Establish weekly integrated operations review', description: 'Launch weekly ops review cadence with combined operations leads.' },
  { key: 'P4-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P4-WS03-L2', title: 'Align quality assurance frameworks', description: 'Adopt Firstsource QA methodology across target delivery centres.' },
  { key: 'P4-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P4-WS03-L2', title: 'Identify and execute 3–5 operational quick wins', description: 'Implement rapid improvements identified in Phase 2; document KPI evidence.' },
  { key: 'P4-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P4-WS03-L2', title: 'Transfer client reporting to Firstsource MI platform', description: 'Migrate target client MI and dashboard reporting to Firstsource standard by Day 90.' },
  { key: 'P4-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P4-WS03-L2', title: 'Conduct 100-day operational health review', description: 'Formal 100-day review of SLA, attrition, NPS, and cost per transaction.' },

  { key: 'P4-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — First 100 Days', description: 'Synergy quick-win capture, financial integration, and reporting alignment.' },
  { key: 'P4-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P4-WS04-L2', title: 'Deliver first consolidated management pack', description: 'Produce first combined P&L management pack including target; present to CFO within Day 30.' },
  { key: 'P4-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P4-WS04-L2', title: 'Realise ≥20% of cost synergy target', description: 'Confirm first tranche of cost savings delivered with evidence to CFO.' },
  { key: 'P4-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P4-WS04-L2', title: 'Confirm completion accounts and working capital settlement', description: 'Finalise completion accounts; agree working capital adjustment with seller.' },
  { key: 'P4-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P4-WS04-L2', title: 'Integrate budgeting and forecasting into Firstsource FP&A cycle', description: 'Onboard target into Firstsource annual budgeting process.' },
  { key: 'P4-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P4-WS04-L2', title: 'Produce 100-day synergy realisation report', description: 'Formal 100-day synergy realisation update; compare actuals to plan.' },

  { key: 'P4-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — First 100 Days', description: 'Client retention, pipeline activation, and cross-sell programme launch.' },
  { key: 'P4-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P4-WS05-L2', title: 'Complete Tier 1 client introductory meetings with Firstsource exec', description: 'Senior Firstsource executive visits or calls every Tier 1 client within 30 days.' },
  { key: 'P4-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P4-WS05-L2', title: 'Launch cross-sell prospecting campaign (integrated portfolio)', description: 'Build and launch first cross-sell campaign presenting combined FSL capability.' },
  { key: 'P4-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P4-WS05-L2', title: 'Confirm no client churn post-announcement', description: 'Validate revenue retention at Day 60 and Day 90.' },
  { key: 'P4-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P4-WS05-L2', title: 'Integrate sales teams and agree joint quota', description: 'Merge sales functions; assign joint territories and quotas.' },
  { key: 'P4-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P4-WS05-L2', title: 'Update go-to-market materials for combined proposition', description: 'Produce new pitch deck, one-pagers, and case studies for combined capability.' },

  // ── PHASE 5 — Embed ───────────────────────────────────────────────────────
  { key: 'P5-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — Embed', description: 'Deep people integration, compensation harmonisation, and culture programme.' },
  { key: 'P5-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P5-WS01-L2', title: 'Complete full compensation and grading harmonisation', description: 'Align all job families, grades, and salary bands to Firstsource framework.' },
  { key: 'P5-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P5-WS01-L2', title: 'Launch unified performance management cycle', description: 'Run first joint performance review cycle under Firstsource framework.' },
  { key: 'P5-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P5-WS01-L2', title: 'Conduct employee engagement pulse survey', description: 'Run all-employee engagement pulse; agree action plan within 2 weeks.' },
  { key: 'P5-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P5-WS01-L2', title: 'Execute any agreed redundancy programme with full HR governance', description: 'Where headcount rationalisation agreed, execute with proper consultation and legal compliance.' },
  { key: 'P5-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P5-WS01-L2', title: 'Complete HRIS migration to Firstsource Workday/HR system', description: 'Migrate all target HR records into Firstsource HRIS; decommission legacy HR system.' },

  { key: 'P5-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — Embed', description: 'Core systems migration, infrastructure consolidation, and security uplift.' },
  { key: 'P5-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P5-WS02-L2', title: 'Execute first wave of system migrations (low-risk systems)', description: 'Migrate agreed low-complexity systems per integration roadmap.' },
  { key: 'P5-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P5-WS02-L2', title: 'Consolidate WAN and network connectivity', description: 'Connect target sites to Firstsource MPLS/SD-WAN; retire carrier contracts.' },
  { key: 'P5-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P5-WS02-L2', title: 'Complete Active Directory / Entra ID tenant merge', description: 'Merge target AD/Entra tenant; enable SSO for all core applications.' },
  { key: 'P5-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P5-WS02-L2', title: 'Achieve Firstsource security baseline on all target endpoints', description: 'Deploy Firstsource endpoint security stack to 100% of target devices.' },
  { key: 'P5-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P5-WS02-L2', title: 'Decommission first tranche of legacy systems', description: 'Retire first set of legacy systems; confirm licence costs eliminated.' },

  { key: 'P5-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — Embed', description: 'Process harmonisation, delivery model redesign, and operational excellence.' },
  { key: 'P5-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P5-WS03-L2', title: 'Harmonise Tier 1 operational processes to Firstsource standard', description: 'Redesign and deploy Firstsource standard operating procedures for top 10 processes.' },
  { key: 'P5-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P5-WS03-L2', title: 'Optimise offshore / nearshore delivery mix', description: 'Rebalance delivery locations to achieve Firstsource standard cost model.' },
  { key: 'P5-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P5-WS03-L2', title: 'Implement Firstsource robotics / automation pipeline on target processes', description: 'Identify 3–5 target processes for automation; deploy RPA/AI solutions.' },
  { key: 'P5-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P5-WS03-L2', title: 'Close out legacy operational RAID items', description: 'Review all open RAID entries from Phases 3 and 4; resolve before Phase 6.' },
  { key: 'P5-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P5-WS03-L2', title: 'Conduct 180-day operational benchmark review', description: 'Measure SLA, attrition, cost per transaction, and NPS at Day 180 vs pre-close baseline.' },

  { key: 'P5-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — Embed', description: 'Financial consolidation, synergy acceleration, and cost reduction programme.' },
  { key: 'P5-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P5-WS04-L2', title: 'Consolidate finance function and ERP instances', description: 'Integrate target finance team into Firstsource shared service.' },
  { key: 'P5-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P5-WS04-L2', title: 'Deliver ≥50% of total synergy target', description: 'Confirm at least 50% of total synergy value committed or fully realised.' },
  { key: 'P5-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P5-WS04-L2', title: 'Complete procurement category consolidation', description: 'Renegotiate key supplier contracts under Firstsource umbrella agreements.' },
  { key: 'P5-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P5-WS04-L2', title: 'Review and consolidate property footprint', description: 'Where office duplication exists, plan consolidation; issue lease break notices.' },
  { key: 'P5-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P5-WS04-L2', title: 'Produce 180-day synergy realisation investor update', description: 'Prepare CFO-level synergy realisation update for investor / board reporting at Day 180.' },

  { key: 'P5-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — Embed', description: 'Revenue synergy acceleration, cross-sell conversion, and client growth.' },
  { key: 'P5-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P5-WS05-L2', title: 'Close first cross-sell revenue deals', description: 'Confirm first integrated cross-sell contract signed; log as revenue synergy realised.' },
  { key: 'P5-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P5-WS05-L2', title: 'Complete brand migration to Firstsource', description: 'Complete all client-facing brand migration to Firstsource identity.' },
  { key: 'P5-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P5-WS05-L2', title: 'Confirm pipeline growth from integrated portfolio', description: 'Demonstrate combined sales pipeline growing at ≥15% vs pre-close baseline.' },
  { key: 'P5-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P5-WS05-L2', title: 'Review all client contract renewals due within 12 months', description: 'Build renewal dashboard; assign owners; initiate early renewal conversations.' },
  { key: 'P5-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P5-WS05-L2', title: 'Achieve NPS improvement vs pre-close baseline', description: 'Demonstrate average client NPS has improved vs pre-close baseline.' },

  // ── PHASE 6 — BAU & Value Close ───────────────────────────────────────────
  { key: 'P6-WS01-L2', workstreamCode: 'WS01', level: 2, title: 'People & Culture — BAU & Value Close', description: 'Cultural embedding, talent BAU transition, and integration closure.' },
  { key: 'P6-WS01-L3-01', workstreamCode: 'WS01', level: 3, parentKey: 'P6-WS01-L2', title: 'Confirm all HR policies fully harmonised', description: 'Validate 100% of HR policies, benefits, and procedures are aligned to Firstsource standard.' },
  { key: 'P6-WS01-L3-02', workstreamCode: 'WS01', level: 3, parentKey: 'P6-WS01-L2', title: 'Run 12-month post-close engagement survey', description: 'Conduct annual engagement survey for integrated workforce; compare to pre-close baseline.' },
  { key: 'P6-WS01-L3-03', workstreamCode: 'WS01', level: 3, parentKey: 'P6-WS01-L2', title: 'Confirm top-30 talent retention (12-month mark)', description: 'Verify all stay-bonus recipients have remained at 12-month milestone.' },
  { key: 'P6-WS01-L3-04', workstreamCode: 'WS01', level: 3, parentKey: 'P6-WS01-L2', title: 'Transition people workstream to Group HR BAU', description: 'Hand over all remaining HR integration activities to Group HR BAU; close People workstream.' },
  { key: 'P6-WS01-L3-05', workstreamCode: 'WS01', level: 3, parentKey: 'P6-WS01-L2', title: 'Document people integration lessons learned', description: 'Capture HR and culture integration lessons into IMO knowledge base.' },

  { key: 'P6-WS02-L2', workstreamCode: 'WS02', level: 2, title: 'Technology & Systems — BAU & Value Close', description: 'Final system migrations, legacy decommissions, and technology workstream closure.' },
  { key: 'P6-WS02-L3-01', workstreamCode: 'WS02', level: 3, parentKey: 'P6-WS02-L2', title: 'Complete all system migrations per integration roadmap', description: 'Confirm 100% of agreed system migrations complete or formally deferred.' },
  { key: 'P6-WS02-L3-02', workstreamCode: 'WS02', level: 3, parentKey: 'P6-WS02-L2', title: 'Decommission all agreed legacy systems', description: 'Execute final legacy system retirements; confirm licence cost savings captured.' },
  { key: 'P6-WS02-L3-03', workstreamCode: 'WS02', level: 3, parentKey: 'P6-WS02-L2', title: 'Complete security certification for integrated environment', description: 'Pass ISO 27001 / SOC 2 / HIPAA review for integrated environment.' },
  { key: 'P6-WS02-L3-04', workstreamCode: 'WS02', level: 3, parentKey: 'P6-WS02-L2', title: 'Transition technology integration to Group IT BAU', description: 'Hand over residual IT BAU activities to Group IT; close technology workstream.' },
  { key: 'P6-WS02-L3-05', workstreamCode: 'WS02', level: 3, parentKey: 'P6-WS02-L2', title: 'Document technology integration lessons learned', description: 'Capture technology integration lessons into IMO knowledge base.' },

  { key: 'P6-WS03-L2', workstreamCode: 'WS03', level: 2, title: 'Operations & Delivery — BAU & Value Close', description: 'Operations BAU handover, performance confirmation, and workstream closure.' },
  { key: 'P6-WS03-L3-01', workstreamCode: 'WS03', level: 3, parentKey: 'P6-WS03-L2', title: 'Confirm all processes fully harmonised to Firstsource standard', description: 'Final process audit; sign off 100% of Tier 1 processes operating to standard.' },
  { key: 'P6-WS03-L3-02', workstreamCode: 'WS03', level: 3, parentKey: 'P6-WS03-L2', title: 'Confirm SLA performance at or above pre-close baseline', description: 'Validate 12-month average SLA performance across all clients; confirm no regression.' },
  { key: 'P6-WS03-L3-03', workstreamCode: 'WS03', level: 3, parentKey: 'P6-WS03-L2', title: 'Transition all delivery operations to Business Unit BAU', description: 'Hand over integrated delivery operations to relevant business unit MD.' },
  { key: 'P6-WS03-L3-04', workstreamCode: 'WS03', level: 3, parentKey: 'P6-WS03-L2', title: 'Publish post-integration operational benchmark report', description: 'Document final SLA, attrition, cost, and NPS metrics vs pre-close baseline.' },
  { key: 'P6-WS03-L3-05', workstreamCode: 'WS03', level: 3, parentKey: 'P6-WS03-L2', title: 'Document operational integration lessons learned', description: 'Capture delivery and operations integration lessons into IMO knowledge base.' },

  { key: 'P6-WS04-L2', workstreamCode: 'WS04', level: 2, title: 'Finance & Synergies — BAU & Value Close', description: 'Full synergy realisation, financial close, and finance workstream handover.' },
  { key: 'P6-WS04-L3-01', workstreamCode: 'WS04', level: 3, parentKey: 'P6-WS04-L2', title: 'Confirm 100% of synergy target committed or realised', description: 'Produce final synergy waterfall; obtain CFO sign-off for board reporting.' },
  { key: 'P6-WS04-L3-02', workstreamCode: 'WS04', level: 3, parentKey: 'P6-WS04-L2', title: 'Complete earn-out measurement period (if applicable)', description: 'Calculate earn-out payment based on agreed metrics; agree result with seller.' },
  { key: 'P6-WS04-L3-03', workstreamCode: 'WS04', level: 3, parentKey: 'P6-WS04-L2', title: 'Confirm full ERP and finance system consolidation', description: 'Validate target financials are fully consolidated into Firstsource ERP.' },
  { key: 'P6-WS04-L3-04', workstreamCode: 'WS04', level: 3, parentKey: 'P6-WS04-L2', title: 'Transition finance integration to Group Finance BAU', description: 'Hand over all remaining integration accounting tasks to Group Finance BAU.' },
  { key: 'P6-WS04-L3-05', workstreamCode: 'WS04', level: 3, parentKey: 'P6-WS04-L2', title: 'Document synergy and finance integration lessons learned', description: 'Capture synergy modelling accuracy and finance integration lessons into IMO knowledge base.' },

  { key: 'P6-WS05-L2', workstreamCode: 'WS05', level: 2, title: 'Sales & Commercial — BAU & Value Close', description: 'Revenue synergy close, client growth confirmation, and commercial workstream closure.' },
  { key: 'P6-WS05-L3-01', workstreamCode: 'WS05', level: 3, parentKey: 'P6-WS05-L2', title: 'Confirm revenue synergy target fully committed', description: 'Validate all revenue synergy lines have signed contracts or firm commitments.' },
  { key: 'P6-WS05-L3-02', workstreamCode: 'WS05', level: 3, parentKey: 'P6-WS05-L2', title: 'Confirm zero unplanned client churn over 12-month period', description: 'Validate full-year revenue retention rate; document any planned exits.' },
  { key: 'P6-WS05-L3-03', workstreamCode: 'WS05', level: 3, parentKey: 'P6-WS05-L2', title: 'Confirm brand migration fully complete', description: 'Validate all client-facing materials and digital properties carry Firstsource brand only.' },
  { key: 'P6-WS05-L3-04', workstreamCode: 'WS05', level: 3, parentKey: 'P6-WS05-L2', title: 'Transition commercial operations to Group Sales BAU', description: 'Hand over all integrated sales activities to Group Sales BAU; close Commercial workstream.' },
  { key: 'P6-WS05-L3-05', workstreamCode: 'WS05', level: 3, parentKey: 'P6-WS05-L2', title: 'Document commercial integration lessons learned', description: 'Capture client communication, cross-sell, and brand migration lessons into IMO knowledge base.' },
]

// ─── Task Tree Builder ────────────────────────────────────────────────────────

export function getTaskSeedInputs(
  dealId: string,
  workstreams: Array<{ id: string; code: string }>
): ResolvedTaskInput[] {
  const wsMap = new Map(workstreams.map(w => [w.code, w.id]))

  const resolved: ResolvedTaskInput[] = rawTaskTree.map((t, idx) => {
    const workstreamId = wsMap.get(t.workstreamCode)
    if (!workstreamId) throw new Error(`Workstream code ${t.workstreamCode} not found`)
    return {
      dealId,
      workstreamId,
      parentKey: t.parentKey ?? null,
      key:       t.key,
      level:     t.level,
      title:     t.title,
      description: t.description ?? '',
      sortOrder:   idx,
    }
  })

  return [...resolved.filter(t => t.level === 2), ...resolved.filter(t => t.level === 3)]
}

// ─── Public Accessors ─────────────────────────────────────────────────────────

export function getPhaseTemplates(): PhaseTemplate[] { return phaseTemplates }
export function getLensTemplates(): LensTemplate[]   { return lensTemplates }
export function getTaskTreeTemplates(dealId: string, workstreams: Array<{ id: string; code: string }>): ResolvedTaskInput[] {
  return getTaskSeedInputs(dealId, workstreams)
}
