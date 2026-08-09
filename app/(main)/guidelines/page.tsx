'use client'

import { useEffect, useRef, useState } from 'react'
import type { Metadata } from 'next'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id:    string
  label: string
  sub?:  { id: string; label: string }[]
}

// ─── TOC structure ────────────────────────────────────────────────────────────

const TOC: Section[] = [
  { id: 'overview',       label: 'Tool Overview' },
  { id: 'roles',          label: 'Roles & Permissions' },
  { id: 'navigation',     label: 'Navigation' },
  { id: 'dashboard',      label: 'Dashboard' },
  {
    id: 'deals', label: 'Deals',
    sub: [
      { id: 'deals-list',     label: 'Deals List' },
      { id: 'deal-create',    label: 'Creating a Deal' },
      { id: 'deal-summary',   label: 'Deal Summary' },
      { id: 'project-plan',   label: 'Project Plan' },
      { id: 'synergy',        label: 'Synergy Tracker' },
      { id: 'actions',        label: 'Actions Log' },
      { id: 'decisions',      label: 'Decisions Log' },
      { id: 'risks',          label: 'Risks Log' },
      { id: 'resources',      label: 'Resources' },
      { id: 'documents',      label: 'Documents' },
      { id: 'deal-settings',  label: 'Deal Settings' },
    ],
  },
  { id: 'reports',        label: 'Reports' },
  { id: 'framework',      label: 'Framework' },
  { id: 'admin',          label: 'Admin Settings' },
  { id: 'account',        label: 'Your Account' },
]

// ─── Helper components ────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: 'ADMIN' | 'IMO_LEAD' | 'VIEWER' | 'ALL' }) {
  const styles: Record<string, string> = {
    ADMIN:    'bg-purple-100 text-purple-700 border-purple-200',
    IMO_LEAD: 'bg-blue-100 text-blue-700 border-blue-200',
    VIEWER:   'bg-gray-100 text-gray-600 border-gray-200',
    ALL:      'bg-green-100 text-green-700 border-green-200',
  }
  const labels: Record<string, string> = {
    ADMIN: 'Admin', IMO_LEAD: 'IMO Lead', VIEWER: 'Viewer', ALL: 'All Roles',
  }
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}

function PermRow({ action, roles }: { action: string; roles: ('ADMIN' | 'IMO_LEAD' | 'VIEWER' | 'ALL')[] }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4 text-sm text-gray-700">{action}</td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => <RoleBadge key={r} role={r} />)}
        </div>
      </td>
    </tr>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="mt-0.5 text-base">💡</span>
      <p className="text-sm text-blue-800">{children}</p>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="mt-0.5 text-base">⚠️</span>
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  )
}

function SectionHead({ id, title, sub }: { id: string; title: string; sub?: string }) {
  return (
    <div id={id} className="scroll-mt-20 pt-2 pb-1">
      <h2 className="text-xl font-bold text-[var(--fsl-dark-blue)]">{title}</h2>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

function SubHead({ id, title }: { id: string; title: string }) {
  return (
    <h3 id={id} className="scroll-mt-20 mt-6 mb-2 text-base font-semibold text-[var(--fsl-dark-blue)]">{title}</h3>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidelinesPage() {
  const [activeId, setActiveId] = useState<string>('overview')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const allIds = TOC.flatMap((s) => [s.id, ...(s.sub?.map((x) => x.id) ?? [])])
    const elements = allIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          )
          setActiveId(topmost.target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    elements.forEach((el) => observerRef.current!.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* ── Sticky sidebar TOC ─────────────────────────────────────────────── */}
      <aside className="hidden xl:block w-64 shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-200 bg-white py-6 px-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Contents</p>
        <nav className="space-y-0.5">
          {TOC.map((s) => (
            <div key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); setActiveId(s.id) }}
                className={`block rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  activeId === s.id
                    ? 'bg-[var(--fsl-dark-blue)] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </a>
              {s.sub?.map((sub) => (
                <a
                  key={sub.id}
                  href={`#${sub.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(sub.id)?.scrollIntoView({ behavior: 'smooth' }); setActiveId(sub.id) }}
                  className={`block ml-3 rounded px-2 py-1 text-xs transition-colors ${
                    activeId === sub.id
                      ? 'bg-[var(--fsl-orange)]/10 text-[var(--fsl-orange)] font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {sub.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* Page header */}
        <div className="rounded-xl bg-[var(--fsl-dark-blue)] px-8 py-7 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📖</span>
            <h1 className="text-2xl font-bold">User Guidelines</h1>
          </div>
          <p className="text-white/75 text-sm max-w-2xl">
            A complete reference guide for the Firstsource IMO Tool — covering every section, role, and action available in the platform.
          </p>
        </div>

        {/* ── 1. Overview ──────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="overview" title="Tool Overview" />
          <p className="text-sm text-gray-700 leading-relaxed">
            The <strong>Firstsource IMO Tool</strong> (Integration Management Office Tool) is a centralised platform for managing mergers and acquisitions from pre-close through full integration. It provides deal teams with a single source of truth for tracking tasks, synergies, risks, actions, decisions, and resources across every deal in the portfolio.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            The tool is built around the <strong>DRIVE Framework</strong> — Firstsource's proprietary six-phase integration methodology: <strong>D</strong>iagnose, <strong>R</strong>esponse, <strong>I</strong>mplement, <strong>V</strong>alidate, <strong>E</strong>mbed. Every deal progresses through these phases from Day 1 planning through to full capability embedding.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { phase: 'D — Diagnose',   desc: 'Pre-close intelligence & readiness' },
              { phase: 'R — Response',   desc: 'Day 1 operations & quick wins' },
              { phase: 'I — Implement',  desc: 'Full integration execution' },
              { phase: 'V — Validate',   desc: 'Synergy verification & assurance' },
              { phase: 'E — Embed',      desc: 'Business as usual transition' },
              { phase: '+ Governance',   desc: 'Tollgates at every phase boundary' },
            ].map((p) => (
              <div key={p.phase} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-bold text-[var(--fsl-dark-blue)]">{p.phase}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 2. Roles ─────────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="roles" title="Roles & Permissions"
            sub="Every user is assigned one of three global roles, each with different levels of access." />

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                role: 'ADMIN' as const,
                label: 'Admin',
                color: 'border-purple-200 bg-purple-50',
                desc: 'Full control over the entire platform. Can create and manage deals, invite and delete users, change roles, configure app-wide settings, and view the audit log.',
                can: ['Create / edit / delete deals','Invite, deactivate & delete users','Change user roles','View audit log','Override deal sensitivity','Access all deals including sensitive ones'],
              },
              {
                role: 'IMO_LEAD' as const,
                label: 'IMO Lead',
                color: 'border-blue-200 bg-blue-50',
                desc: 'Operational deal managers. Can create and edit deals, manage all content inside deals, and build deal teams. Cannot manage global users.',
                can: ['Create / edit deals','Manage tasks, risks, actions, decisions','Add resources to deals','Build deal teams (invite deal-only users)','Export deal data'],
              },
              {
                role: 'VIEWER' as const,
                label: 'Viewer',
                color: 'border-gray-200 bg-gray-50',
                desc: 'Read-only access. Can view all non-sensitive deals. Deal-team Viewers only see the specific deals they have been added to and cannot export data.',
                can: ['View all non-sensitive deals (global Viewers)','View only allocated deals (deal-team Viewers)','Read all sections within accessible deals','Cannot edit, create, or delete anything','Cannot export data (deal-team Viewers only)'],
              },
            ].map((r) => (
              <div key={r.role} className={`rounded-lg border p-4 ${r.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <RoleBadge role={r.role} />
                  <span className="text-sm font-semibold text-gray-800">{r.label}</span>
                </div>
                <p className="text-xs text-gray-600 mb-3">{r.desc}</p>
                <ul className="space-y-1">
                  {r.can.map((c) => (
                    <li key={c} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="mt-0.5 text-green-500">✓</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Tip>
            Deal-team Viewers are users added directly inside a deal's <strong>Settings → Build Team</strong> section. They can log in but only see the specific deal(s) they were added to, and export is disabled for them.
          </Tip>
        </Card>

        {/* ── 3. Navigation ────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="navigation" title="Navigation" sub="The top bar provides access to all major areas of the tool." />

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Access</th>
              </tr>
            </thead>
            <tbody>
              {[
                { item: 'Dashboard',        desc: 'Portfolio KPIs and deal card grid', access: 'ALL' as const },
                { item: 'Deals',            desc: 'List and search all deals', access: 'ALL' as const },
                { item: 'Reports',          desc: 'Cross-deal analytics — synergy, health, tollgates, resources', access: 'ALL' as const },
                { item: 'Framework',        desc: 'IMO Master Framework PDF reference', access: 'ALL' as const },
                { item: 'User Guidelines',  desc: 'This page — full documentation for all roles', access: 'ALL' as const },
                { item: '⚙ Settings icon',  desc: 'Global admin panel (users, app settings, audit log)', access: 'ADMIN' as const },
                { item: 'Avatar / name',    desc: 'Dropdown for Profile and Sign Out', access: 'ALL' as const },
              ].map((r) => (
                <tr key={r.item} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-[var(--fsl-dark-blue)]">{r.item}</td>
                  <td className="py-2 pr-4 text-gray-600">{r.desc}</td>
                  <td className="py-2"><RoleBadge role={r.access} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ── 4. Dashboard ─────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="dashboard" title="Dashboard"
            sub="The landing page after login. Gives a real-time portfolio-level snapshot." />

          <p className="text-sm text-gray-700">The Dashboard shows five KPI cards at the top, followed by a filterable grid of all accessible deals.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Total Deals',          desc: 'Count of all deals with an "active" sub-count in brackets.' },
              { title: 'Synergy Baseline $',   desc: 'Sum of all baseline synergy targets across deals, with realised $ shown below.' },
              { title: 'Open Risks',           desc: 'Total open risks across the portfolio. Turns amber if over 10.' },
              { title: 'Tollgates Due (7d)',   desc: 'Tollgates falling due in the next 7 days. Turns amber if over 5.' },
              { title: 'RED Deals',            desc: 'Deals with an overall RAG of RED. Card turns red if any exist. An escalation banner appears at the top of the page.' },
            ].map((k) => (
              <div key={k.title} className="flex gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-[var(--fsl-dark-blue)]">{k.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-700 mt-1">
            Below the KPIs, deal cards can be filtered by status (<em>Pre-Close, Active, On Hold, Closed</em>) and searched by name. Clicking any deal card opens that deal. The <strong>+ New Deal</strong> button opens the deal creation form.
          </p>
          <div className="mt-1">
            <table className="w-full text-sm">
              <tbody>
                <PermRow action="View dashboard and deal cards" roles={['ALL']} />
                <PermRow action="Create a new deal" roles={['ADMIN', 'IMO_LEAD']} />
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── 5. Deals ─────────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="deals" title="Deals" sub="The Deals section covers the full lifecycle of each integration from list to deep-dive." />

          <SubHead id="deals-list" title="5.1  Deals List" />
          <p className="text-sm text-gray-700">
            The Deals page shows a searchable, filterable table of all deals you have access to. Use the search bar to find a deal by name or acquired company, and the status chips to filter by lifecycle stage. Click any row to open that deal.
          </p>
          <table className="w-full text-sm mt-2">
            <tbody>
              <PermRow action="View deals list" roles={['ALL']} />
              <PermRow action="Create a new deal via + New Deal" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="deal-create" title="5.2  Creating a Deal" />
          <p className="text-sm text-gray-700">
            Click <strong>+ New Deal</strong> from either the Dashboard or the Deals page. Fill in:
          </p>
          <ul className="mt-1 space-y-1 text-sm text-gray-700 list-disc pl-5">
            <li><strong>Deal Name</strong> — the internal name for this integration programme.</li>
            <li><strong>Acquired Company Name</strong> — the target company being acquired.</li>
            <li><strong>Sector</strong> — optional industry sector.</li>
            <li><strong>Status</strong> — initial lifecycle stage (defaults to Pre-Close).</li>
            <li><strong>Acquisition Date</strong> — expected or actual closing date.</li>
            <li><strong>IMO Lead</strong> — the person running the integration (picked from global users).</li>
            <li><strong>Exec Sponsor</strong> — senior executive accountable for the deal.</li>
            <li><strong>Sensitive Deal</strong> — toggle on to restrict visibility to invited users only.</li>
            <li><strong>Synergy Targets</strong> — optional revenue and cost synergy targets in USD.</li>
          </ul>
          <Tip>When a deal is created, the system automatically provisions all 5 workstreams, 6 DRIVE phases with tollgate items, 7 pre-acquisition lenses, and the full task tree — no manual setup required.</Tip>

          <SubHead id="deal-summary" title="5.3  Deal Summary" />
          <p className="text-sm text-gray-700">
            The Deal Summary is the executive-level view of a deal. It has six sections:
          </p>
          <div className="space-y-2 mt-2">
            {[
              { name: 'Integration Charter', desc: 'Defines the programme scope: synergy targets, EBITDA milestones at 12m/24m, IMO and Exec Sponsor names, governance cadence (e.g. weekly steering, fortnightly board), and integration principles. A "Sign Off" button locks the charter; Admins can override the lock.' },
              { name: 'Valuation & Deal Structure', desc: 'Rich-text narrative describing the deal rationale, transaction value, and structural considerations.' },
              { name: 'Due Diligence', desc: 'Rich-text narrative summarising due diligence findings and key risk areas identified pre-close.' },
              { name: 'Pre-Acquisition Intelligence — 7 Lenses', desc: 'A structured assessment across seven lenses (e.g. Financial Health, Technology, People & Culture). Each lens is rated PASS / FAIL / TBD with supporting notes and KPI thresholds.' },
              { name: 'Synergy Snapshot', desc: 'A read-only summary of Baseline, Committed, and Realised synergy totals pulled live from the Synergy Tracker.' },
              { name: 'Headcount Reduction Snapshot', desc: 'A summary of FTEs reduced and associated cost impact, pulled from the Headcount Reduction tab in the Synergy Tracker.' },
            ].map((s) => (
              <div key={s.name} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold text-[var(--fsl-dark-blue)]">{s.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View all summary sections" roles={['ALL']} />
              <PermRow action="Edit charter, narratives, lenses" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Sign off / unlock the charter" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Override a signed-off charter" roles={['ADMIN']} />
            </tbody>
          </table>

          <SubHead id="project-plan" title="5.4  Project Plan" />
          <p className="text-sm text-gray-700">
            The Project Plan provides a Gantt-style task management view modelled on MS Project. Tasks are organised in a two-level hierarchy:
          </p>
          <ul className="mt-1 space-y-1 text-sm text-gray-700 list-disc pl-5">
            <li><strong>Level 2 tasks</strong> — major workstreams or workpackages (bold rows, collapsible).</li>
            <li><strong>Level 3 tasks</strong> — individual work items with owner, dates, and RAG status.</li>
          </ul>
          <p className="text-sm text-gray-700 mt-2">Each task has: Title, WBS number, Workstream, Owner, Start Date, End Date, Duration, % Complete, Status (Not Started / In Progress / Completed / On Hold), RAG (Red / Amber / Green / Gray), Priority (Low / Medium / High), and Phase.</p>
          <p className="text-sm text-gray-700 mt-1">The Gantt bar area shows each task's timeline. Bars can be dragged to change dates. The view supports zoom levels and filtering by workstream, status, owner, and RAG.</p>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View all tasks and Gantt" roles={['ALL']} />
              <PermRow action="Create, edit, reorder tasks" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Drag to change task dates" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Mark tasks complete, update RAG" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="synergy" title="5.5  Synergy Tracker" />
          <p className="text-sm text-gray-700">Tracks all financial value creation across three tabs:</p>
          <div className="space-y-2 mt-2">
            {[
              { tab: 'Cost Savings', desc: 'Operational cost reduction lines. Each line has: Title, Baseline $ (identified savings), Committed $ (approved savings), Realised $ (banked savings), % Captured, Status (On Track / Watch / At Risk), and Finance Validation toggle. A Benefits Funnel bar chart shows the funnel across all lines.' },
              { tab: 'Revenue Upside', desc: 'Revenue growth opportunities. Same structure as Cost Savings — Baseline, Committed, Realised, Status, and Finance Validation.' },
              { tab: 'Headcount Reduction', desc: 'FTE reduction tracking split by department. Tracks headcount reduced and associated people / other cost savings. Includes an Additional Considerations free-text field for context.' },
            ].map((t) => (
              <div key={t.tab} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold text-[var(--fsl-dark-blue)]">{t.tab}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View all synergy lines and charts" roles={['ALL']} />
              <PermRow action="Add / edit / delete synergy lines" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Toggle Finance Validation" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Export synergy data to CSV" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="actions" title="5.6  Actions Log" />
          <p className="text-sm text-gray-700">Tracks time-bound work items — specific tasks that someone is accountable for completing outside the project plan. Actions split into Active and Closed sections.</p>
          <p className="text-sm text-gray-700 mt-1">
            Each action has: <strong>Title</strong>, Description, <strong>Owner</strong> (from the deal's resource pool), <strong>Priority</strong> (Low / Medium / High), <strong>Due Date</strong>, and <strong>Status</strong> (Open / In Progress / Closed). Overdue open actions are highlighted in red.
          </p>
          <p className="text-sm text-gray-700 mt-1">A header strip shows a live count of <strong>Overdue</strong> and <strong>Due This Week</strong> actions at a glance.</p>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View all actions" roles={['ALL']} />
              <PermRow action="Create new actions" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Edit, close, delete actions" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="decisions" title="5.7  Decisions Log" />
          <p className="text-sm text-gray-700">A permanent, immutable record of key decisions made during the integration. Once logged, decisions form part of the audit trail and cannot be silently erased.</p>
          <p className="text-sm text-gray-700 mt-1">Each decision has: <strong>Title</strong>, <strong>Background / Context</strong>, <strong>Decision Made</strong>, <strong>Rationale</strong>, <strong>Decision Maker</strong>, <strong>Workstream Impact</strong>, and <strong>Decision Date</strong>. Click any row to expand the full detail inline.</p>
          <Warn>Decisions are audit-trail records. Avoid editing a logged decision; if a decision is reversed, log a new decision explaining the reversal instead.</Warn>
          <table className="w-full text-sm mt-1">
            <tbody>
              <PermRow action="View all decisions" roles={['ALL']} />
              <PermRow action="Log new decisions" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Edit existing decisions" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="risks" title="5.8  Risks Log" />
          <p className="text-sm text-gray-700">A structured log for integration risks with a 3×3 likelihood-vs-impact heatmap to visualise the risk landscape at a glance.</p>
          <p className="text-sm text-gray-700 mt-1">Each risk has: <strong>Description</strong>, <strong>Owner</strong>, <strong>Likelihood</strong> (High / Medium / Low), <strong>Impact</strong> (High / Medium / Low), <strong>Risk Score</strong> (1–9, auto-calculated), <strong>Status</strong> (Open / In Progress / Resolved / Closed), and <strong>Mitigation Plan</strong>.</p>
          <p className="text-sm text-gray-700 mt-1">Risks are sorted by score (highest first). Active and Resolved/Closed risks are in separate collapsible sections. Use the search bar and status filter chips to narrow the list.</p>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View heatmap and all risks" roles={['ALL']} />
              <PermRow action="Log and edit risks" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Resolve or close risks" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>

          <SubHead id="resources" title="5.9  Resources" />
          <p className="text-sm text-gray-700">Shows all people allocated to this deal and their workload. Four KPI cards at the top show total people, active workstreams, tasks assigned, and red tasks.</p>
          <p className="text-sm text-gray-700 mt-1">The <strong>Workstream Overview</strong> table lists each workstream with its FSL Lead, task counts by RAG colour, and an overall RAG chip. The <strong>People</strong> section shows each person's task distribution as a colour-coded bar, making workload imbalances immediately visible.</p>
          <p className="text-sm text-gray-700 mt-1">Adding a person here does <em>not</em> give them login access — it makes them available as an owner/assignee in tasks, actions, risks, and decisions within this deal. To give someone login access to this deal, use <strong>Deal Settings → Build Team</strong>.</p>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View resources and workload" roles={['ALL']} />
              <PermRow action="Add people to the deal" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Set workstream assignment and allocation %" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Export resources to CSV" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>
          <Tip>People added here can also be used as quick-pick owners in the section owner pickers. To add a placeholder person (no login needed), type their name in any owner field and select "Add [name]".</Tip>

          <SubHead id="documents" title="5.10  Documents" />
          <p className="text-sm text-gray-700">The Documents section provides a SharePoint-connected file library for each deal. Files uploaded or linked here are stored in the deal's designated SharePoint document library, keeping all deal artefacts in one place.</p>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="Browse and download documents" roles={['ALL']} />
              <PermRow action="Upload and organise files" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Connect / disconnect SharePoint" roles={['ADMIN']} />
            </tbody>
          </table>

          <SubHead id="deal-settings" title="5.11  Deal Settings" />
          <p className="text-sm text-gray-700">The configuration hub for a deal. Contains eight sections:</p>
          <div className="space-y-2 mt-2">
            {[
              { name: 'Deal Information',   desc: 'Edit the deal name, acquired company, sector, description, and acquisition date.' },
              { name: 'Deal Status',        desc: 'Set the lifecycle stage: Pre-Close, Active, On Hold, or Closed. One stage is active at a time.' },
              { name: 'Deal Stage (DRIVE)', desc: 'Advance through the 6 DRIVE phases. Clicking a phase marks it as the current active phase; previous phases show as complete.' },
              { name: 'Overall RAG Status', desc: 'Manually override the deal\'s top-line RAG colour shown on dashboard cards and reports. Choices: Green (on track), Amber (at risk), Red (critical), Gray (not set).' },
              { name: 'Data Sensitivity',   desc: 'Toggle a deal as "sensitive". When on, only users explicitly granted access can view the deal. Admins and IMO Leads who created the deal always retain access.' },
              { name: 'Build Team',         desc: 'Add people who need login access to this specific deal. Two modes: (1) Add Existing User — pick from global tool users; (2) Invite New Member — create a new user with a name, email, and temporary password. These users get deal-team Viewer access: read-only, no export, no other deals visible. Removing a person revokes their access to this deal immediately.' },
              { name: 'Workstreams',        desc: 'View and manage the deal\'s workstreams. The five standard DRIVE workstreams are pre-created and cannot be deleted. Custom workstreams can be added (name + code) or deactivated. Each workstream can have an FSL Lead assigned.' },
              { name: 'Danger Zone',        desc: 'Irreversible status changes: "Put on Hold" pauses active work, and "Close Deal" marks the integration as complete. Both require confirmation.' },
            ].map((s) => (
              <div key={s.name} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold text-[var(--fsl-dark-blue)]">{s.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View deal settings" roles={['ALL']} />
              <PermRow action="Edit deal information, status, RAG, workstreams" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Build Team — add / remove deal members" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Toggle data sensitivity" roles={['ADMIN', 'IMO_LEAD']} />
              <PermRow action="Use Danger Zone (hold / close deal)" roles={['ADMIN', 'IMO_LEAD']} />
            </tbody>
          </table>
        </Card>

        {/* ── 6. Reports ───────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="reports" title="Reports" sub="Portfolio-level analytics across all deals you have access to." />
          <div className="space-y-3">
            {[
              {
                tab: 'Cross-Deal Synergy',
                desc: 'Aggregates synergy data across all deals. A summary strip shows total Baseline $, Committed $, Realised $, Headcount Reduced, and HC Cost Reduction. A per-deal table shows each deal\'s individual totals and % Capture rate.',
              },
              {
                tab: 'Health Dashboard',
                desc: 'A portfolio health overview sorted by RAG severity. Shows each deal\'s RAG chip, task count, open risks, open actions, and last updated date. Use this to quickly spot deals needing attention.',
              },
              {
                tab: 'Tollgate Tracker',
                desc: 'A matrix of all DRIVE phases (rows) against all deals (columns). Each cell shows whether the tollgate is Complete, Active, or Not Started. Use this to see which deals are lagging in the integration lifecycle.',
              },
              {
                tab: 'Resource Allocation',
                desc: 'Cross-deal people analytics. KPI cards show total people across the portfolio, active deals, and average team size. A per-deal breakdown shows team sizes, and a cross-deal People Task Overview table shows each person\'s workload across all deals they\'re on.',
              },
            ].map((t) => (
              <div key={t.tab} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold text-[var(--fsl-dark-blue)]">{t.tab}</p>
                <p className="text-xs text-gray-600 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View all Reports tabs" roles={['ALL']} />
            </tbody>
          </table>
          <Tip>Reports only include deals you have access to. Deal-team Viewers will see data for their assigned deals only.</Tip>
        </Card>

        {/* ── 7. Framework ─────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="framework" title="Framework" sub="Reference material for the Firstsource DRIVE integration methodology." />
          <p className="text-sm text-gray-700">
            The Framework page embeds the <strong>Firstsource IMO Master Framework PDF</strong> — the full DRIVE playbook used across all integrations. Use the toolbar to zoom in/out, navigate pages, and open the PDF in a separate browser tab for full-screen reading or printing.
          </p>
          <p className="text-sm text-gray-700 mt-1">
            This is a read-only reference section. All roles have access. No data is written here.
          </p>
          <table className="w-full text-sm mt-2">
            <tbody>
              <PermRow action="View the DRIVE Framework PDF" roles={['ALL']} />
            </tbody>
          </table>
        </Card>

        {/* ── 8. Admin Settings ────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="admin" title="Admin Settings"
            sub="Accessible via the ⚙ Settings icon in the top navigation bar. Admin role only." />

          <div className="mb-1">
            <RoleBadge role="ADMIN" />
            <span className="ml-2 text-xs text-gray-500">Only users with the Admin role can access this section.</span>
          </div>

          <SubHead id="admin-users" title="User Management" />
          <p className="text-sm text-gray-700">Manage all global tool users — people who have login access to the full platform (not to be confused with deal-team members added per deal).</p>
          <div className="space-y-1.5 mt-2">
            {[
              { action: 'Invite User',        desc: 'Create a new login user with a name, email, role, and temporary password. The user must reset their password on first login.' },
              { action: 'Change Role',        desc: 'Change a user\'s role inline via the Role dropdown in the table. The last active Admin cannot be demoted.' },
              { action: 'Deactivate / Reactivate', desc: 'Disable or re-enable a user\'s login access without deleting their data.' },
              { action: 'Delete',             desc: 'Permanently remove a user and all their login credentials. Their tasks, decisions, and log entries are unassigned but preserved. Deals they created are re-attributed. Cannot delete yourself or the last active Admin.' },
              { action: 'Bulk Role Update',   desc: 'Select multiple users via checkboxes and set them to the same role in one action.' },
              { action: 'Search & Filter',    desc: 'Search by name or email; filter by role using the chip buttons.' },
            ].map((a) => (
              <div key={a.action} className="flex gap-2 text-sm">
                <span className="font-semibold text-[var(--fsl-dark-blue)] shrink-0 w-44">{a.action}</span>
                <span className="text-gray-600">{a.desc}</span>
              </div>
            ))}
          </div>

          <SubHead id="admin-settings" title="App Settings" />
          <p className="text-sm text-gray-700">Configure platform-wide settings such as the organisation name, default synergy currency, and other global defaults. Changes take effect immediately across all deals.</p>

          <SubHead id="admin-audit" title="Audit Log" />
          <p className="text-sm text-gray-700">A tamper-proof log of every significant action taken in the system — user created/updated/deleted, deals created, exports, charter sign-offs, and more. Each entry shows the acting user, action type, target entity, timestamp, and a detail payload. Filter by user, action type, entity type, or date range.</p>
          <Warn>The audit log cannot be edited or cleared. It is the authoritative record of all platform activity.</Warn>
        </Card>

        {/* ── 9. Account ───────────────────────────────────────────────────── */}
        <Card>
          <SectionHead id="account" title="Your Account" sub="Manage your personal profile and session." />
          <p className="text-sm text-gray-700">
            Click your <strong>name / avatar</strong> in the top-right corner to open the user menu. From here you can:
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700 list-disc pl-5">
            <li><strong>Profile</strong> — view and update your name, title, and department. If your admin set a temporary password, you will be prompted to change it here on first login.</li>
            <li><strong>Sign Out</strong> — end your session securely. You will be redirected to the login page.</li>
          </ul>
          <Tip>If you forget your password, contact your tool Admin to reset it. Admins can set a new temporary password via User Management, and you will be prompted to change it on next login.</Tip>
          <table className="w-full text-sm mt-3">
            <tbody>
              <PermRow action="View and edit your own profile" roles={['ALL']} />
              <PermRow action="Sign out" roles={['ALL']} />
            </tbody>
          </table>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-6">
          Firstsource IMO Tool — User Guidelines · For support contact your tool Administrator
        </div>

      </main>
    </div>
  )
}
