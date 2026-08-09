import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { format } from 'date-fns'
import JSZip from 'jszip'

// ─── Utilities ────────────────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object' && 'toNumber' in (v as { toNumber(): number }))
    return (v as { toNumber(): number }).toNumber()
  return Number(v)
}

const stripHtml = (html: string | null | undefined): string =>
  html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''

const fmtUSD = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n).toLocaleString()}`
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

const X = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type RunOpts = { color?: string; sz?: number; bold?: boolean; italic?: boolean }
type CellVal = ({ text: string } & RunOpts) | null

const mkRun = (text: string, opts: RunOpts = {}): string =>
  `<a:r><a:rPr lang="en-US" sz="${opts.sz ?? 900}"${opts.bold ? ' b="1"' : ''}${opts.italic ? ' i="1"' : ''} dirty="0">` +
  `<a:solidFill><a:srgbClr val="${opts.color ?? '4A5568'}"/></a:solidFill>` +
  `<a:latin typeface="Calibri" pitchFamily="34" charset="0"/>` +
  `<a:ea typeface="Calibri" pitchFamily="34" charset="-122"/>` +
  `<a:cs typeface="Calibri" pitchFamily="34" charset="-120"/>` +
  `</a:rPr><a:t>${X(text)}</a:t></a:r>`

const injectCell = (cellXml: string, text: string, opts?: RunOpts): string =>
  cellXml.replace('<a:endParaRPr', mkRun(text, opts) + '<a:endParaRPr')

// ─── Table helpers ────────────────────────────────────────────────────────────

function getTableBounds(xml: string, n: number): [number, number] | null {
  let count = 0, i = 0
  while (true) {
    const s = xml.indexOf('<a:tbl>', i)
    if (s === -1) return null
    const e = xml.indexOf('</a:tbl>', s) + 8
    if (count === n) return [s, e]
    count++; i = e
  }
}

function getRowBounds(tblXml: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let i = 0
  while (true) {
    const s = tblXml.indexOf('<a:tr ', i)
    if (s === -1) break
    const e = tblXml.indexOf('</a:tr>', s) + 7
    out.push([s, e]); i = e
  }
  return out
}

// Fill a row clone's cells sequentially from `values`
function fillRow(template: string, values: CellVal[]): string {
  let result = template, pos = 0
  for (const val of values) {
    const cs = result.indexOf('<a:tc>', pos)
    if (cs === -1) break
    const ce = result.indexOf('</a:tc>', cs) + 7
    if (val?.text) {
      const { text, ...opts } = val
      const injected = injectCell(result.slice(cs, ce), text, opts)
      result = result.slice(0, cs) + injected + result.slice(ce)
      pos = cs + injected.length
    } else {
      pos = ce
    }
  }
  return result
}

// Extract a specific row from a table in the slide XML
function getTemplateRow(slideXml: string, tblIdx: number, rowIdx: number): string {
  const b = getTableBounds(slideXml, tblIdx)
  if (!b) return ''
  const tbl = slideXml.slice(b[0], b[1])
  const rows = getRowBounds(tbl)
  if (rowIdx >= rows.length) return ''
  return tbl.slice(rows[rowIdx][0], rows[rowIdx][1])
}

// Replace all data rows in a table (keeping `headerCount` header rows)
// with dynamically generated rows cloned from `blankRow`
function rebuildTable(
  slideXml: string,
  tblIdx: number,
  headerCount: number,
  blankRow: string,
  data: CellVal[][]
): string {
  const b = getTableBounds(slideXml, tblIdx)
  if (!b) return slideXml
  const [ts, te] = b
  const tbl = slideXml.slice(ts, te)
  const rows = getRowBounds(tbl)
  if (!rows.length) return slideXml

  const preamble  = tbl.slice(0, rows[0][0])
  const headers   = rows.slice(0, headerCount).map(([s, e]) => tbl.slice(s, e))
  const dataRows  = data.map(vals => fillRow(blankRow, vals))

  return slideXml.slice(0, ts) + preamble + headers.join('') + dataRows.join('') + '</a:tbl>' + slideXml.slice(te)
}

// Inject text into specific cells of a table without rebuilding it
// (preserves existing structure — used for fixed-row tables like charter/lens)
function injectTableCells(
  slideXml: string,
  tblIdx: number,
  cells: Array<{ row: number; col: number; text: string; opts?: RunOpts }>
): string {
  const b = getTableBounds(slideXml, tblIdx)
  if (!b) return slideXml
  const [ts, te] = b
  const tbl = slideXml.slice(ts, te)
  const bounds = getRowBounds(tbl)
  const rowXmls = bounds.map(([s, e]) => tbl.slice(s, e))

  for (const { row, col, text, opts } of cells) {
    if (row >= rowXmls.length) continue
    let rx = rowXmls[row], pos = 0
    for (let i = 0; i < col; i++) {
      const cs = rx.indexOf('<a:tc>', pos)
      if (cs === -1) { pos = -1; break }
      pos = rx.indexOf('</a:tc>', cs) + 7
    }
    if (pos < 0) continue
    const cs = rx.indexOf('<a:tc>', pos)
    if (cs === -1) continue
    const ce = rx.indexOf('</a:tc>', cs) + 7
    rowXmls[row] = rx.slice(0, cs) + injectCell(rx.slice(cs, ce), text, opts) + rx.slice(ce)
  }

  const preamble = bounds.length ? tbl.slice(0, bounds[0][0]) : tbl
  return slideXml.slice(0, ts) + preamble + rowXmls.join('') + '</a:tbl>' + slideXml.slice(te)
}

// Update column widths in a table's <a:tblGrid> (widths in EMU; 1 cm = 360000)
function setTableColWidths(slideXml: string, tblIdx: number, widthsEmu: number[]): string {
  const b = getTableBounds(slideXml, tblIdx)
  if (!b) return slideXml
  const [ts, te] = b
  const tbl = slideXml.slice(ts, te)
  const gs = tbl.indexOf('<a:tblGrid>')
  const ge = tbl.indexOf('</a:tblGrid>') + 12
  let colIdx = 0
  const newGrid = tbl.slice(gs, ge).replace(/<a:gridCol w="\d+"/g, () => {
    const w = widthsEmu[colIdx] ?? widthsEmu[widthsEmu.length - 1]
    colIdx++
    return `<a:gridCol w="${w}"`
  })
  return slideXml.slice(0, ts) + tbl.slice(0, gs) + newGrid + tbl.slice(ge) + slideXml.slice(te)
}

// ─── Shape helpers ────────────────────────────────────────────────────────────

function getShapeBounds(xml: string, name: string): [number, number] | null {
  const idx = xml.indexOf(`name="${name}"`)
  if (idx === -1) return null
  const s = xml.lastIndexOf('<p:sp>', idx)
  const e = xml.indexOf('</p:sp>', idx) + 7
  return [s, e]
}

// Replace an <a:t> literal value within a named shape
function replaceShapeText(xml: string, name: string, oldT: string, newT: string): string {
  const b = getShapeBounds(xml, name)
  if (!b) return xml
  const [s, e] = b
  return xml.slice(0, s) +
    xml.slice(s, e).replace(`<a:t>${oldT}</a:t>`, `<a:t>${X(newT)}</a:t>`) +
    xml.slice(e)
}

// Move a named shape's vertical position (y in EMU; 1 cm = 360000)
function setShapeY(xml: string, name: string, yEmu: number): string {
  const b = getShapeBounds(xml, name)
  if (!b) return xml
  const [s, e] = b
  const updated = xml.slice(s, e).replace(/(<a:off x="\d+" y=")(\d+)"/, `$1${yEmu}"`)
  return xml.slice(0, s) + updated + xml.slice(e)
}

// Move a named <p:graphicFrame> element's vertical position (tables, charts)
function setFrameY(xml: string, name: string, yEmu: number): string {
  const idx = xml.indexOf(`name="${name}"`)
  if (idx === -1) return xml
  const s = xml.lastIndexOf('<p:graphicFrame>', idx)
  const e = xml.indexOf('</p:graphicFrame>', idx) + 17
  const updated = xml.slice(s, e).replace(/(<a:off x="\d+" y=")(\d+)"/, `$1${yEmu}"`)
  return xml.slice(0, s) + updated + xml.slice(e)
}

// Update the first solidFill color in a shape's <p:spPr>
function updateShapeFill(xml: string, name: string, color: string): string {
  const b = getShapeBounds(xml, name)
  if (!b) return xml
  const [s, e] = b
  const sp = xml.slice(s, e)
  const ps = sp.indexOf('<p:spPr>'), pe = sp.indexOf('</p:spPr>') + 9
  const newPr = sp.slice(ps, pe).replace(
    /<a:solidFill><a:srgbClr val="[0-9A-Fa-f]+"\/><\/a:solidFill>/,
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`
  )
  return xml.slice(0, s) + sp.slice(0, ps) + newPr + sp.slice(pe) + xml.slice(e)
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.isDealTeamOnly) return NextResponse.json({ error: 'Export not available for deal-team access' }, { status: 403 })

  const dealId = params.id

  const [deal, allTasks, synergyLines, headcountLines, risks, decisions, actions, charter, narrative, lenses] =
    await Promise.all([
      prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          phases:  { orderBy: { phaseNumber: 'asc' } },
          imoLead: { select: { id: true, name: true } },
        },
      }),
      prisma.task.findMany({ where: { dealId }, select: { level: true, rag: true } }),
      prisma.synergyLine.findMany({
        where: { dealId }, orderBy: { createdAt: 'asc' },
        include: { owner: { select: { name: true } } },
      }),
      (prisma as unknown as Record<string, { findMany: (q: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> }>)
        .headcountLine.findMany({ where: { dealId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      prisma.riskEntry.findMany({ where: { dealId, status: 'OPEN' }, orderBy: { riskScore: 'desc' } }),
      prisma.decisionEntry.findMany({ where: { dealId }, orderBy: { decidedAt: 'desc' } }),
      prisma.actionEntry.findMany({
        where: { dealId, status: 'OPEN' }, orderBy: [{ dueDate: 'asc' }],
        include: { owner: { select: { name: true } } },
      }),
      prisma.integrationCharter.findUnique({ where: { dealId } }),
      prisma.dealNarrative.findUnique({ where: { dealId } }),
      prisma.preAcquisitionLens.findMany({ where: { dealId }, orderBy: { lensNumber: 'asc' } }),
    ])

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // Derived stats
  const l3Tasks     = allTasks.filter(t => t.level === 3)
  const tasksGreen  = l3Tasks.filter(t => t.rag === 'GREEN').length
  const tasksRed    = l3Tasks.filter(t => t.rag === 'RED').length
  const costLines   = synergyLines.filter(l => l.category === 'COST')
  const revLines    = synergyLines.filter(l => l.category === 'REVENUE')
  const synSum      = (lines: typeof synergyLines, f: 'baselineUSD' | 'committedUSD' | 'realisedUSD') =>
    lines.reduce((s, l) => s + toNum(l[f]), 0)
  const hcFTEs      = headcountLines.reduce((s, l) => s + Number(l.headcountReduced ?? 0), 0)
  const hcPeople    = headcountLines.reduce((s, l) => s + toNum(l.peopleExpenseUSD), 0)
  const hcOther     = headcountLines.reduce((s, l) => s + toNum(l.otherExpenseUSD), 0)
  const hcTotal     = hcPeople + hcOther
  const ragColor    = deal.overallRag === 'RED' ? 'DC2626' : deal.overallRag === 'AMBER' ? 'D97706' : '16A34A'
  const currentPhase = deal.phases.find(p => p.status === 'IN_PROGRESS')

  // Load template
  const zip = await JSZip.loadAsync(
    fs.readFileSync(path.join(process.cwd(), 'public', 'slide-template.pptx'))
  )

  // ══════════════════════════════════════════════════════════
  // SLIDE 1 — Title
  // ══════════════════════════════════════════════════════════
  let s1 = await zip.file('ppt/slides/slide1.xml')!.async('string')

  s1 = replaceShapeText(s1, 'TextBox 10', '&lt;TITLE&gt;', deal.name)
  s1 = replaceShapeText(s1, 'TextBox 12', 'Presenter Name', deal.imoLead?.name ?? 'IMO Lead')
  s1 = replaceShapeText(s1, 'TextBox 12', 'Designation Goes Here', 'IMO Lead')
  // Date field — replace the cached date string inside the <a:fld> element
  s1 = s1.replace('<a:t>08 August 2026</a:t>', `<a:t>${format(new Date(), 'dd MMMM yyyy')}</a:t>`)

  zip.file('ppt/slides/slide1.xml', s1)

  // ══════════════════════════════════════════════════════════
  // SLIDE 2 — Executive Summary
  // ══════════════════════════════════════════════════════════
  let s2 = await zip.file('ppt/slides/slide2.xml')!.async('string')

  // ── Deal info strip (Text 3) ──────────────────────────────
  s2 = s2.replace(
    '<a:t>&lt;Deal Name&gt; </a:t>',
    `<a:t>${X(deal.name)} </a:t>`
  )
  s2 = s2.replace(
    '<a:t>|  &lt;Organization&gt; |  Status: &lt;Text&gt;|  Overall RAG: </a:t>',
    `<a:t>|  ${X(deal.acquiredCompanyName)} |  Status: ${X(deal.status.replace(/_/g, ' '))}|  Overall RAG: </a:t>`
  )
  // RAG run — update both the fill color and the placeholder text
  s2 = s2.replace(
    '<a:srgbClr val="D97706"/></a:solidFill>' +
    '<a:latin typeface="+mj-lt"/><a:ea typeface="Calibri" pitchFamily="34" charset="-122"/>' +
    '<a:cs typeface="Calibri" pitchFamily="34" charset="-120"/></a:rPr><a:t>&lt;Text&gt;</a:t>',
    `<a:srgbClr val="${ragColor}"/></a:solidFill>` +
    '<a:latin typeface="+mj-lt"/><a:ea typeface="Calibri" pitchFamily="34" charset="-122"/>' +
    `<a:cs typeface="Calibri" pitchFamily="34" charset="-120"/></a:rPr><a:t>${X(deal.overallRag)}</a:t>`
  )
  const phaseLabel = currentPhase?.phaseName ?? deal.phases[0]?.phaseName ?? 'N/A'
  s2 = s2.replace(
    '<a:t>|  Current Phase: Phase XX — &lt;Phase label&gt;</a:t>',
    `<a:t>|  Current Phase: ${X(phaseLabel)}</a:t>`
  )

  // ── Phase pill fill colors ────────────────────────────────
  const pillShapes = ['Shape 4', 'Shape 6', 'Shape 8', 'Shape 10', 'Shape 12', 'Shape 14']
  pillShapes.forEach((shapeName, i) => {
    const ph = deal.phases[i]
    const fill = !ph ? 'CBD5E1'
      : ph.status === 'COMPLETE'     ? '1C2247'
      : ph.status === 'IN_PROGRESS'  ? 'E16127'
      : 'CBD5E1'
    s2 = updateShapeFill(s2, shapeName, fill)
  })

  // ── KPI counts ───────────────────────────────────────────
  s2 = replaceShapeText(s2, 'Text 18', '&lt;#&gt;', String(allTasks.length))
  s2 = replaceShapeText(s2, 'Text 20', '&lt;#&gt;', String(tasksGreen))
  s2 = replaceShapeText(s2, 'Text 22', '&lt;#&gt;', String(tasksRed))

  // ── Tables — extract blank template rows before any rebuild ──
  const blankSyn = getTemplateRow(s2, 0, 1)
  const blankHc  = getTemplateRow(s2, 1, 1)
  const blankRsk = getTemplateRow(s2, 2, 1)
  const blankAct = getTemplateRow(s2, 3, 1)
  const blankDec = getTemplateRow(s2, 4, 1)

  // Synergy summary (always 3 rows: Total / Cost / Revenue)
  s2 = rebuildTable(s2, 0, 1, blankSyn, [
    [
      { text: 'Total',          color: '1C2247', bold: true },
      { text: fmtUSD(synSum(synergyLines, 'baselineUSD')),  color: '1C2247' },
      { text: fmtUSD(synSum(synergyLines, 'committedUSD')), color: 'E16127' },
      { text: fmtUSD(synSum(synergyLines, 'realisedUSD')),  color: '16A34A', bold: true },
    ],
    [
      { text: 'Cost Savings',   color: '4A5568' },
      { text: fmtUSD(synSum(costLines, 'baselineUSD')),  color: '9CA3AF' },
      { text: fmtUSD(synSum(costLines, 'committedUSD')), color: '9CA3AF' },
      { text: fmtUSD(synSum(costLines, 'realisedUSD')),  color: '9CA3AF' },
    ],
    [
      { text: 'Revenue Upside', color: '4A5568' },
      { text: fmtUSD(synSum(revLines, 'baselineUSD')),  color: '9CA3AF' },
      { text: fmtUSD(synSum(revLines, 'committedUSD')), color: '9CA3AF' },
      { text: fmtUSD(synSum(revLines, 'realisedUSD')),  color: '9CA3AF' },
    ],
  ])

  // Headcount summary (1 aggregate row)
  s2 = rebuildTable(s2, 1, 1, blankHc, [[
    { text: `${hcFTEs} FTEs`, color: '1C2247', bold: true },
    { text: fmtUSD(hcTotal),  color: '1C2247', bold: true },
    { text: fmtUSD(hcPeople), color: '2746C3' },
    { text: fmtUSD(hcOther),  color: '4A5568' },
  ]])

  // Top Risks (dynamic; up to 3 on exec summary)
  s2 = rebuildTable(s2, 2, 1, blankRsk,
    risks.length === 0
      ? [[{ text: 'No open risks', color: '9CA3AF' }, null]]
      : risks.slice(0, 3).map(r => {
          const sc = r.riskScore as number
          const c  = sc <= 3 ? '16A34A' : sc <= 6 ? 'D97706' : 'DC2626'
          return [
            { text: (r.description as string) || '—', color: '4A5568' },
            { text: String(sc), color: c, bold: true },
          ]
        })
  )

  // Open Actions (dynamic; up to 3 on exec summary)
  s2 = rebuildTable(s2, 3, 1, blankAct,
    actions.length === 0
      ? [[{ text: 'No open actions', color: '9CA3AF' }, null, null]]
      : actions.slice(0, 3).map(a => [
          { text: a.title, color: '4A5568' },
          { text: (a.owner as { name: string } | null)?.name || '—', color: '4A5568' },
          { text: a.dueDate ? format(new Date(a.dueDate as Date), 'dd MMM') : '—', color: '4A5568' },
        ])
  )

  // Recent Decisions (dynamic; up to 3 on exec summary)
  s2 = rebuildTable(s2, 4, 1, blankDec,
    decisions.length === 0
      ? [[{ text: 'No decisions logged', color: '9CA3AF' }, null]]
      : decisions.slice(0, 3).map(d => [
          { text: d.title, color: '4A5568' },
          { text: d.decidedAt ? format(new Date(d.decidedAt as Date), 'dd MMM yy') : '—', color: '4A5568' },
        ])
  )

  zip.file('ppt/slides/slide2.xml', s2)

  // ══════════════════════════════════════════════════════════
  // SLIDE 3 — Deal Summary
  // ══════════════════════════════════════════════════════════
  let s3 = await zip.file('ppt/slides/slide3.xml')!.async('string')

  // Reposition the "PRE-ACQUISITION LENS ASSESSMENT" label to y = 7.61 cm
  s3 = setShapeY(s3, 'Text 4', 2739600)
  // Lens table to y = 8.32 cm
  s3 = setFrameY(s3, 'Table 1', 2995200)
  // Section headers to y = 15.34 cm
  s3 = setShapeY(s3, 'Text 5', 5522400)
  s3 = setShapeY(s3, 'Text 7', 5522400)
  // Narrative text boxes to y = 16.00 cm
  s3 = setShapeY(s3, 'Text 6', 5760000)
  s3 = setShapeY(s3, 'Text 8', 5760000)

  // Integration Charter table (6 fixed rows; inject value cells at col 1 & 3)
  if (charter) {
    s3 = injectTableCells(s3, 0, [
      { row: 0, col: 1, text: charter.revenueSynergyTargetUSD ? fmtUSD(toNum(charter.revenueSynergyTargetUSD)) : '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 0, col: 3, text: charter.costSynergyTargetUSD    ? fmtUSD(toNum(charter.costSynergyTargetUSD))    : '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 1, col: 1, text: charter.ebitdaTarget12m != null ? `${toNum(charter.ebitdaTarget12m).toFixed(1)}%` : '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 1, col: 3, text: charter.ebitdaTarget24m != null ? `${toNum(charter.ebitdaTarget24m).toFixed(1)}%` : '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 2, col: 1, text: charter.valueRealisationLead ?? '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 2, col: 3, text: charter.techLead            ?? '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 3, col: 1, text: charter.changeCommsLead     ?? '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 3, col: 3, text: charter.execSteerCoCadence  ?? '—', opts: { color: '4A5568', sz: 1100 } },
      { row: 4, col: 1, text: charter.workingSteerCoCadence ?? '—', opts: { color: '4A5568', sz: 1100 } },
      {
        row: 4, col: 3,
        text: charter.isComplete
          ? `Signed off${charter.signedOffBy ? ` by ${charter.signedOffBy}` : ''}`
          : 'Pending sign-off',
        opts: { color: charter.isComplete ? '16A34A' : 'D97706', sz: 1100 },
      },
      ...(charter.integrationPrinciples
        ? [{ row: 5, col: 1, text: stripHtml(charter.integrationPrinciples), opts: { color: '4A5568', sz: 1100 } }]
        : []
      ),
    ])
  }

  // Lens table (7 fixed rows with lens names; inject data cols 1-4 by lensNumber)
  if (lenses.length > 0) {
    s3 = injectTableCells(s3, 1, lenses.flatMap(lens => {
      const ri = lens.lensNumber
      if (ri < 1 || ri > 7) return []
      const sc = lens.status === 'PASS' ? '16A34A' : lens.status === 'FAIL' ? 'DC2626' : 'D97706'
      return [
        { row: ri, col: 1, text: lens.status || 'TBD', opts: { color: sc, sz: 900, bold: true } },
        { row: ri, col: 2, text: lens.benchmarks ?? '', opts: { color: '4A5568', sz: 900 } },
        { row: ri, col: 3, text: lens.notes      ?? '', opts: { color: '4A5568', sz: 900 } },
        { row: ri, col: 4, text: lens.strategicOverrideActive ? 'Yes' : 'No', opts: { color: lens.strategicOverrideActive ? 'E16127' : '9CA3AF', sz: 900 } },
      ]
    }))
  }

  // Lens table column widths (EMU = cm × 360000):
  // Lens 5.72cm | Status 2.64cm | Benchmarks 13.08cm | Notes 8cm | Override 1.95cm
  s3 = setTableColWidths(s3, 1, [2059200, 950400, 4708800, 2880000, 702000])

  // Narrative text boxes
  if (narrative?.valuationAndDealStructure)
    s3 = replaceShapeText(s3, 'Text 6', '&lt;Text Here&gt;', stripHtml(narrative.valuationAndDealStructure))
  if (narrative?.dueDiligence)
    s3 = replaceShapeText(s3, 'Text 8', '&lt;Text Here&gt;', stripHtml(narrative.dueDiligence))

  zip.file('ppt/slides/slide3.xml', s3)

  // ══════════════════════════════════════════════════════════
  // SLIDE 4 — Synergy Tracker (full detail, all rows)
  // ══════════════════════════════════════════════════════════
  let s4 = await zip.file('ppt/slides/slide4.xml')!.async('string')

  const synDetailRow = (l: typeof synergyLines[0]): CellVal[] => {
    const sc = l.status === 'ON_TRACK' ? '16A34A' : l.status === 'AT_RISK' ? 'DC2626' : 'D97706'
    return [
      { text: l.title,                                      color: '1C2247', sz: 900 },
      { text: fmtUSD(toNum(l.baselineUSD)),                 color: '4A5568', sz: 900 },
      { text: fmtUSD(toNum(l.committedUSD)),                color: 'E16127', sz: 900 },
      { text: fmtUSD(toNum(l.realisedUSD)),                 color: '16A34A', sz: 900, bold: true },
      { text: String(l.benefitsFunnelStage ?? '—'),         color: '4A5568', sz: 900 },
      { text: String(l.status ?? '—'),                      color: sc,       sz: 900, bold: true },
      { text: (l.owner as { name: string } | null)?.name || '—', color: '4A5568', sz: 900 },
    ]
  }

  const totalRow7 = (lines: typeof synergyLines): CellVal[] => [
    { text: 'TOTAL', color: '1C2247', bold: true, sz: 900 },
    { text: fmtUSD(synSum(lines, 'baselineUSD')),  color: '1C2247', bold: true, sz: 900 },
    { text: fmtUSD(synSum(lines, 'committedUSD')), color: 'E16127', bold: true, sz: 900 },
    { text: fmtUSD(synSum(lines, 'realisedUSD')),  color: '16A34A', bold: true, sz: 900 },
    null, null, null,
  ]

  const noData7: CellVal[] = [{ text: 'No data recorded', color: '9CA3AF', sz: 900 }, null, null, null, null, null, null]
  const noData6: CellVal[] = [{ text: 'No data recorded', color: '9CA3AF', sz: 900 }, null, null, null, null, null]

  // Extract blank rows before any rebuild
  const blankCost = getTemplateRow(s4, 0, 1)
  const blankHc4  = getTemplateRow(s4, 1, 1)
  const blankRev  = getTemplateRow(s4, 2, 1)

  // Cost Savings — all lines + totals
  s4 = rebuildTable(s4, 0, 1, blankCost,
    costLines.length > 0
      ? [...costLines.map(synDetailRow), totalRow7(costLines)]
      : [noData7]
  )

  // Headcount Reduction — all departments + totals
  s4 = rebuildTable(s4, 1, 1, blankHc4,
    headcountLines.length > 0
      ? [
          ...headcountLines.map(l => {
            const tot = toNum(l.peopleExpenseUSD) + toNum(l.otherExpenseUSD)
            return [
              { text: String(l.department ?? '—'),       color: '1C2247', bold: true, sz: 900 },
              { text: String(l.headcountReduced ?? 0),   color: '4A5568',              sz: 900 },
              { text: fmtUSD(toNum(l.peopleExpenseUSD)), color: '2746C3',              sz: 900 },
              { text: fmtUSD(toNum(l.otherExpenseUSD)),  color: '4A5568',              sz: 900 },
              { text: fmtUSD(tot),                       color: '1C2247', bold: true, sz: 900 },
              { text: String(l.notes ?? ''),             color: '4A5568',              sz: 900 },
            ] as CellVal[]
          }),
          [
            { text: 'TOTAL',          color: '1C2247', bold: true, sz: 900 },
            { text: String(hcFTEs),   color: '1C2247', bold: true, sz: 900 },
            { text: fmtUSD(hcPeople), color: '2746C3', bold: true, sz: 900 },
            { text: fmtUSD(hcOther),  color: '4A5568', bold: true, sz: 900 },
            { text: fmtUSD(hcTotal),  color: '1C2247', bold: true, sz: 900 },
            null,
          ] as CellVal[],
        ]
      : [noData6]
  )

  // Revenue Upside — all lines + totals
  s4 = rebuildTable(s4, 2, 1, blankRev,
    revLines.length > 0
      ? [...revLines.map(synDetailRow), totalRow7(revLines)]
      : [noData7]
  )

  zip.file('ppt/slides/slide4.xml', s4)

  // Slide 5 — kept as-is (static company branding)

  // ── Generate output ────────────────────────────────────────
  const buf  = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const safe = deal.name.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-')

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${safe}-Executive-Summary.pptx"`,
      'Cache-Control':       'no-store',
    },
  })
}
