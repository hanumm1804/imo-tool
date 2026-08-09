import * as XLSX from 'xlsx'

export interface ImportTaskRow {
  wbs:             string
  level:           number
  title:           string
  status?:         string
  rag?:            string
  priority?:       string
  startDate?:      string | null
  endDate?:        string | null
  durationDays?:   number | null
  percentDone?:    number
  description?:    string | null
  ownerName?:      string | null
  workstreamName?: string | null
  dependsOnId?:    string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wbsToLevel(wbs: string): number {
  if (!wbs) return 3
  return Math.min(3, Math.max(1, wbs.split('.').length))
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().split('T')[0]!
  const s = String(val).trim()
  if (!s) return null
  // "DDD DD-MM-YY" — new template format e.g. "Mon 03-08-26"
  const tmpl = s.match(/^[A-Za-z]{3}\s+(\d{1,2})-(\d{1,2})-(\d{2})$/)
  if (tmpl) {
    const day  = tmpl[1]!.padStart(2, '0')
    const mon  = tmpl[2]!.padStart(2, '0')
    const year = 2000 + parseInt(tmpl[3]!, 10)
    return `${year}-${mon}-${day}`
  }
  // dd/MM/yyyy (legacy export format)
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dm) return `${dm[3]}-${dm[2]!.padStart(2, '0')}-${dm[1]!.padStart(2, '0')}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]!
}

function parseDuration(val: unknown): number | null {
  if (!val) return null
  const s = String(val).trim()
  if (!s) return null
  // "N days" / "N day" — new template format
  const days = s.match(/^(\d+)\s+days?$/i)
  if (days) return parseInt(days[1]!, 10)
  // PTnH — MS Project XML format
  const ms = s.match(/PT(\d+(?:\.\d+)?)H/i)
  if (ms) return Math.max(1, Math.round(parseFloat(ms[1]!) / 8))
  // plain numeric
  const n = Number(s)
  return isNaN(n) || n <= 0 ? null : Math.round(n)
}

function normalizeStatus(s: string): string {
  const v = s.toUpperCase().replace(/[\s-]+/g, '_')
  return ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED'].includes(v) ? v : 'NOT_STARTED'
}

function normalizeRAG(s: string): string {
  const v = s.toUpperCase()
  return ['GREEN', 'AMBER', 'RED', 'GRAY'].includes(v) ? v : 'GRAY'
}

function normalizePriority(s: string): string {
  const v = s.toUpperCase()
  return ['HIGH', 'MEDIUM', 'LOW'].includes(v) ? v : 'MEDIUM'
}

// ─── XLSX Parser ──────────────────────────────────────────────────────────────

export function parseXLSX(file: File): Promise<ImportTaskRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]!]!
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

        // Normalise column header keys — the template has trailing spaces on some headers
        const rows = rawRows.map(row => {
          const n: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(row)) n[k.trim()] = v
          return n
        })

        const tasks: ImportTaskRow[] = rows
          .filter(r => {
            // Skip root summary row (ID=0 or WBS=0)
            const id  = Number(r['ID'])
            const wbs = String(r['WBS'] ?? '').trim()
            if (id === 0 || wbs === '0') return false
            return String(r['Task Name'] ?? '').trim() !== ''
          })
          .map(r => {
            const wbs      = String(r['WBS'] ?? '').trim()
            const rawLevel = Number(r['Level'])
            // Support both old-style columns and new template columns
            const startVal = r['Start'] ?? r['Start Date']
            const endVal   = r['Finish'] ?? r['End Date']
            const durVal   = r['Duration'] ?? r['Duration (Days)']
            const ownerVal = r['Resource Names'] ?? r['Owner']
            const wsVal    = r['Workstream'] ?? ''
            const statusVal = r['Status'] ?? ''
            const ragVal    = r['RAG']    ?? ''
            const priVal    = r['Priority'] ?? ''
            const pctVal    = r['% Done']   ?? 0
            const predsVal = r['Predecessors (Based on ID)'] ?? r['Predecessors'] ?? ''
            return {
              wbs,
              level:          (rawLevel >= 1 && rawLevel <= 3) ? rawLevel : wbsToLevel(wbs),
              title:          String(r['Task Name'] ?? '').trim(),
              workstreamName: String(wsVal).trim() || null,
              ownerName:      String(ownerVal ?? '').trim() || null,
              status:         normalizeStatus(String(statusVal)),
              rag:            normalizeRAG(String(ragVal)),
              priority:       normalizePriority(String(priVal)),
              startDate:      parseDate(startVal),
              endDate:        parseDate(endVal),
              durationDays:   parseDuration(durVal),
              percentDone:    Math.min(100, Math.max(0, Number(pctVal) || 0)),
              dependsOnId:    String(predsVal).trim() || null,
            }
          })

        resolve(tasks)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── MS Project XML Parser ────────────────────────────────────────────────────

export function parseMSProjectXML(file: File): Promise<ImportTaskRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const xmlStr = e.target?.result as string
        const parser = new DOMParser()
        const doc = parser.parseFromString(xmlStr, 'application/xml')

        if (doc.querySelector('parsererror')) {
          throw new Error('Invalid XML file')
        }

        const taskNodes = Array.from(doc.querySelectorAll('Task'))
        const tasks: ImportTaskRow[] = []

        for (const node of taskNodes) {
          const uid = node.querySelector('UID')?.textContent?.trim() ?? ''
          if (uid === '0') continue

          const outlineLevel = Number(node.querySelector('OutlineLevel')?.textContent ?? 0)
          if (outlineLevel === 0) continue

          const name = node.querySelector('Name')?.textContent?.trim() ?? ''
          if (!name) continue

          const wbs = (
            node.querySelector('WBS')?.textContent?.trim() ||
            node.querySelector('OutlineNumber')?.textContent?.trim() ||
            ''
          )

          const startStr  = node.querySelector('Start')?.textContent?.trim() ?? ''
          const finishStr = node.querySelector('Finish')?.textContent?.trim() ?? ''
          const durStr    = node.querySelector('Duration')?.textContent?.trim() ?? ''
          const pct       = Math.min(100, Math.max(0, Number(node.querySelector('PercentComplete')?.textContent ?? 0)))
          const notes     = node.querySelector('Notes')?.textContent?.trim() ?? ''

          tasks.push({
            wbs,
            level:        Math.min(3, Math.max(1, outlineLevel)),
            title:        name,
            startDate:    startStr  ? startStr.split('T')[0]!  : null,
            endDate:      finishStr ? finishStr.split('T')[0]! : null,
            durationDays: parseDuration(durStr),
            percentDone:  pct,
            description:  notes || null,
          })
        }

        resolve(tasks)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
