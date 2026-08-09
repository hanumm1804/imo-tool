import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { TaskWithRelations } from '@/hooks/useTasks'

// ─── Internal helpers ────────────────────────────────────────────────────────

function sortTasksForExport(
  tasks: TaskWithRelations[],
): { task: TaskWithRelations; wbs: string }[] {
  const result: { task: TaskWithRelations; wbs: string }[] = []

  const visit = (t: TaskWithRelations, prefix: string) => {
    result.push({ task: t, wbs: t.wbsNumber ?? prefix })
    tasks
      .filter((c) => c.parentId === t.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .forEach((c, i) => visit(c, `${prefix}.${i + 1}`))
  }

  tasks
    .filter((t) => t.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .forEach((r, i) => visit(r, `${i + 1}`))

  return result
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  try { return format(new Date(d as string), 'EEE dd-MM-yy') }
  catch { return '' }
}

function fmtDuration(days: number | null | undefined): string {
  const d = Math.max(1, days ?? 1)
  return d === 1 ? '1 day' : `${d} days`
}

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toMSDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  try {
    const dt = new Date(d as string)
    const y  = dt.getFullYear()
    const m  = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}T08:00:00`
  } catch { return '' }
}

function toDuration(days: number | null | undefined): string {
  const d = days ?? 1
  return `PT${Math.max(1, d) * 8}H0M0S`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── XLSX Export ─────────────────────────────────────────────────────────────

export function exportProjectPlanXLSX(tasks: TaskWithRelations[], dealName: string): void {
  const rows = sortTasksForExport(tasks)

  // Column headers match the standard integration program plan template
  const headers = [
    'Level ', 'ID', 'WBS', 'Task Mode', 'Task Name',
    'Duration', 'Start', 'Finish',
    'Predecessors (Based on ID)', 'Resource Names', 'Workstream ',
  ]

  const data = rows.map(({ task, wbs }, i) => [
    task.level,
    i + 1,
    wbs,
    'Auto Scheduled',
    task.title,
    fmtDuration(task.durationDays),
    fmtDate(task.startDate as unknown as string),
    fmtDate(task.endDate   as unknown as string),
    '',
    task.owner?.name ?? '',
    task.workstream.name,
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

  ws['!cols'] = [
    { wch: 7  }, { wch: 5  }, { wch: 10 }, { wch: 16 }, { wch: 52 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 24  }, { wch: 22 }, { wch: 30 },
  ]

  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const safe = dealName.replace(/[/\\?%*:|"<>]/g, '_')
  XLSX.writeFile(wb, `${safe}_ProjectPlan.xlsx`)
}

// ─── MS Project XML Export ───────────────────────────────────────────────────

export function exportProjectPlanXML(tasks: TaskWithRelations[], dealName: string): void {
  const rows = sortTasksForExport(tasks)

  let uid = 1
  const taskBlocks = rows.map(({ task, wbs }) => {
    const start  = toMSDate(task.startDate  as unknown as string)
    const finish = toMSDate(task.endDate    as unknown as string)
    const dur    = toDuration(task.durationDays)
    const notes  = xmlEsc(task.description ?? '')
    const id     = uid++

    return [
      `    <Task>`,
      `      <UID>${id}</UID>`,
      `      <ID>${id}</ID>`,
      `      <Name>${xmlEsc(task.title)}</Name>`,
      `      <OutlineLevel>${task.level}</OutlineLevel>`,
      `      <WBS>${xmlEsc(wbs)}</WBS>`,
      `      <OutlineNumber>${xmlEsc(wbs)}</OutlineNumber>`,
      start  ? `      <Start>${start}</Start>`   : '',
      finish ? `      <Finish>${finish}</Finish>` : '',
      `      <Duration>${dur}</Duration>`,
      `      <PercentComplete>${task.percentDone ?? 0}</PercentComplete>`,
      notes  ? `      <Notes>${notes}</Notes>`    : '',
      `    </Task>`,
    ].filter(Boolean).join('\n')
  })

  const safe = dealName.replace(/[/\\?%*:|"<>]/g, '_')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${xmlEsc(dealName)}</Name>
  <SaveVersion>14</SaveVersion>
  <ScheduleFromStart>1</ScheduleFromStart>
  <CalendarUID>1</CalendarUID>
  <Tasks>
    <Task>
      <UID>0</UID>
      <ID>0</ID>
      <Name>${xmlEsc(dealName)}</Name>
      <OutlineLevel>0</OutlineLevel>
      <Summary>1</Summary>
    </Task>
${taskBlocks.join('\n')}
  </Tasks>
</Project>`

  downloadBlob(
    new Blob([xml], { type: 'application/xml;charset=utf-8' }),
    `${safe}_ProjectPlan.xml`,
  )
}
