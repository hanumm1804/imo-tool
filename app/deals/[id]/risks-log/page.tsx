'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useRisks, useCreateRisk, useUpdateRisk, useDeleteRisk,
} from '@/hooks/useLogs'
import { useResources, useQuickAddResource } from '@/hooks/useResources'
import { UserCombobox } from '@/components/ui/UserCombobox'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { RiskWithRelations } from '@/hooks/useLogs'
import { Role, RiskLevel, LogStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_LEVELS: RiskLevel[] = [RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW]

const LEVEL_LABEL: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]:   'High',
  [RiskLevel.MEDIUM]: 'Medium',
  [RiskLevel.LOW]:    'Low',
}

const RISK_MATRIX: Record<RiskLevel, Record<RiskLevel, number>> = {
  [RiskLevel.HIGH]:   { [RiskLevel.LOW]: 4, [RiskLevel.MEDIUM]: 2, [RiskLevel.HIGH]: 1 },
  [RiskLevel.MEDIUM]: { [RiskLevel.LOW]: 8, [RiskLevel.MEDIUM]: 5, [RiskLevel.HIGH]: 3 },
  [RiskLevel.LOW]:    { [RiskLevel.LOW]: 9, [RiskLevel.MEDIUM]: 7, [RiskLevel.HIGH]: 6 },
}

function numericScore(likelihood: RiskLevel, impact: RiskLevel): number {
  return RISK_MATRIX[likelihood][impact]
}

function scoreColor(score: number): string {
  if (score <= 3) return 'bg-red-100 text-red-700 border-red-300'
  if (score <= 6) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  return 'bg-green-100 text-green-700 border-green-300'
}

function cellColor(l: RiskLevel, i: RiskLevel): string {
  const s = numericScore(l, i)
  if (s <= 3) return 'bg-red-400'
  if (s <= 6) return 'bg-yellow-200'
  return 'bg-green-200'
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  accent = 'blue',
  children,
}: {
  title:       string
  count:       number
  defaultOpen?: boolean
  accent?:     'blue' | 'gray'
  children:    React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const headerCls = accent === 'blue'
    ? 'bg-[var(--fsl-dark-blue)] text-white'
    : 'bg-gray-100 text-gray-700 border-b border-gray-200'
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <button
        className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold ${headerCls}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          {title}
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${accent === 'blue' ? 'bg-white/20' : 'bg-gray-300 text-gray-700'}`}>
            {count}
          </span>
        </span>
        {open
          ? <ChevronDown className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          : <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
      </button>
      {open && children}
    </div>
  )
}

// ─── 3×3 Heatmap ─────────────────────────────────────────────────────────────

function RiskHeatmap({ risks }: { risks: RiskWithRelations[] }) {
  const ROWS: RiskLevel[] = [RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW]
  const COLS: RiskLevel[] = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH]

  const grid: Record<string, Record<string, RiskWithRelations[]>> = {
    [RiskLevel.HIGH]:   { [RiskLevel.LOW]: [], [RiskLevel.MEDIUM]: [], [RiskLevel.HIGH]: [] },
    [RiskLevel.MEDIUM]: { [RiskLevel.LOW]: [], [RiskLevel.MEDIUM]: [], [RiskLevel.HIGH]: [] },
    [RiskLevel.LOW]:    { [RiskLevel.LOW]: [], [RiskLevel.MEDIUM]: [], [RiskLevel.HIGH]: [] },
  }

  for (const r of risks) {
    grid[r.likelihood]?.[r.impact]?.push(r)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--fsl-dark-blue)]">Risk Heatmap</h3>
      <div className="flex gap-2">
        <div className="flex flex-col items-center justify-center pr-2">
          <span
            className="text-xs font-medium text-gray-500"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Likelihood →
          </span>
        </div>
        <div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 72px)', gridTemplateRows: 'repeat(3, 72px)' }}>
            {ROWS.map((l) =>
              COLS.map((i) => {
                const cellRisks = grid[l][i]
                return (
                  <div
                    key={`${l}-${i}`}
                    className={`relative flex items-center justify-center rounded-sm ${cellColor(l, i)}`}
                    title={`${LEVEL_LABEL[l]} likelihood × ${LEVEL_LABEL[i]} impact (score ${numericScore(l, i)})`}
                  >
                    <span className="text-[10px] font-medium text-gray-700 opacity-40 absolute top-1 left-1.5">
                      {numericScore(l, i)}
                    </span>
                    {cellRisks.length > 0 && (
                      <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-gray-800 shadow">
                        {cellRisks.length}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 72px)' }}>
            {COLS.map((c) => (
              <p key={c} className="text-center text-[10px] text-gray-400">{LEVEL_LABEL[c]}</p>
            ))}
          </div>
          <p className="mt-0.5 text-center text-xs font-medium text-gray-500">Impact →</p>
        </div>
        <div className="ml-2 flex flex-col justify-center gap-1 text-xs text-gray-500">
          {ROWS.map((r) => (
            <div key={r} className="flex h-[72px] items-center">{LEVEL_LABEL[r]}</div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-400" />High (1–3)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-yellow-200" />Medium (4–6)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-200" />Low (7–9)</span>
      </div>
    </div>
  )
}

// ─── Risk Drawer ──────────────────────────────────────────────────────────────

interface RiskFormState {
  description: string
  ownerId:     string
  likelihood:  RiskLevel
  impact:      RiskLevel
  status:      LogStatus
  mitigation:  string
}

function RiskDrawer({
  dealId,
  editTarget,
  onClose,
}: {
  dealId:      string
  editTarget?: RiskWithRelations
  onClose:     () => void
}) {
  const createRisk = useCreateRisk(dealId)
  const updateRisk = useUpdateRisk(dealId)
  const { data: resources = [] } = useResources(dealId)
  const quickAdd = useQuickAddResource(dealId)

  const [form, setForm] = useState<RiskFormState>({
    description: editTarget?.description ?? '',
    ownerId:     editTarget?.ownerId     ?? '',
    likelihood:  editTarget?.likelihood  ?? RiskLevel.MEDIUM,
    impact:      editTarget?.impact      ?? RiskLevel.MEDIUM,
    status:      editTarget?.status      ?? LogStatus.OPEN,
    mitigation:  editTarget?.mitigation  ?? '',
  })

  function setField<K extends keyof RiskFormState>(key: K, val: RiskFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      description: form.description,
      likelihood:  form.likelihood,
      impact:      form.impact,
      status:      form.status,
      mitigation:  form.mitigation || undefined,
      ownerId:     form.ownerId    || undefined,
    }
    if (editTarget) {
      await updateRisk.mutateAsync({ riskId: editTarget.id, body: payload })
    } else {
      await createRisk.mutateAsync(payload)
    }
    onClose()
  }

  const isPending    = createRisk.isPending || updateRisk.isPending
  const currentScore = numericScore(form.likelihood, form.impact)

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-y-0 right-0 z-40 flex w-[520px] flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="risk-drawer-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-[var(--fsl-dark-blue)] px-5 py-4">
          <h3 id="risk-drawer-title" className="text-lg font-bold text-white">
            {editTarget ? 'Edit Risk' : 'Log Risk'}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                placeholder="Describe the risk…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
              <UserCombobox
                users={resources.map(r => ({ id: r.user.id, name: r.user.name }))}
                value={form.ownerId}
                currentName={editTarget?.owner?.name ?? ''}
                onChange={userId => setField('ownerId', userId)}
                onCreateNew={name => quickAdd.mutateAsync(name)}
              />
            </div>

            {/* Likelihood × Impact */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
                <select
                  value={form.likelihood}
                  onChange={(e) => setField('likelihood', e.target.value as RiskLevel)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                >
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                <select
                  value={form.impact}
                  onChange={(e) => setField('impact', e.target.value as RiskLevel)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                >
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 text-center">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${scoreColor(currentScore)}`}>
                  Level: {currentScore}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as LogStatus)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              >
                {([LogStatus.OPEN, LogStatus.IN_PROGRESS, LogStatus.RESOLVED, LogStatus.CLOSED] as LogStatus[]).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Plan</label>
              <textarea
                value={form.mitigation}
                onChange={(e) => setField('mitigation', e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 px-5 py-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Log Risk'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Risks table (shared between sections) ────────────────────────────────────

function RisksTable({
  items,
  canEdit,
  onEdit,
  onDelete,
}: {
  items:    RiskWithRelations[]
  canEdit:  boolean
  onEdit:   (r: RiskWithRelations) => void
  onDelete: (r: RiskWithRelations) => void
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-gray-400">No risks in this section.</p>
    )
  }
  return (
    <table className="w-full text-left">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          {['Risk', 'Owner', 'Likelihood', 'Impact', 'Level', 'Status', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((risk, idx) => (
          <tr key={risk.id} className={idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : ''}>
            <td className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--fsl-dark-blue)] line-clamp-2">{risk.description}</p>
              {risk.mitigation && (
                <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                  Mitigation: {risk.mitigation}
                </p>
              )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">{risk.owner?.name ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{LEVEL_LABEL[risk.likelihood]}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{LEVEL_LABEL[risk.impact]}</td>
            <td className="px-4 py-3">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${scoreColor(risk.riskScore)}`}>
                {risk.riskScore}
              </span>
            </td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                {risk.status.replace('_', ' ')}
              </span>
            </td>
            <td className="px-4 py-3">
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(risk)}
                    className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(risk)}
                    className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RisksLogPage() {
  const params  = useParams<{ id: string }>()
  const dealId  = params.id
  const { data: session } = useSession()

  const { data: risks, isLoading } = useRisks(dealId)
  const deleteRisk = useDeleteRisk(dealId)

  const canEdit = session?.user.role !== Role.VIEWER

  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<RiskWithRelations | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<RiskWithRelations | undefined>()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const sorted = useMemo(() =>
    [...(risks ?? [])].sort((a, b) => a.riskScore - b.riskScore),
    [risks]
  )

  const filtered = useMemo(() =>
    sorted.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.description.toLowerCase().includes(q) &&
          !(r.owner?.name ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    }),
    [sorted, statusFilter, search]
  )

  // Split into active vs resolved/closed
  const activeRisks   = useMemo(() =>
    filtered.filter((r) => r.status === LogStatus.OPEN || r.status === LogStatus.IN_PROGRESS),
    [filtered]
  )
  const resolvedRisks = useMemo(() =>
    filtered.filter((r) => r.status === LogStatus.RESOLVED || r.status === LogStatus.CLOSED),
    [filtered]
  )

  function openNew()  { setEditTarget(undefined); setDrawerOpen(true) }
  function openEdit(r: RiskWithRelations) { setEditTarget(r); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false); setEditTarget(undefined) }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={6} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Risks Log</h1>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Log Risk
          </button>
        )}
      </div>

      {/* Heatmap */}
      {(risks ?? []).length > 0 && <RiskHeatmap risks={risks ?? []} />}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search risks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', LogStatus.OPEN, LogStatus.IN_PROGRESS, LogStatus.RESOLVED, LogStatus.CLOSED] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== 'ALL' ? 'No risks match filters' : 'No risks logged yet'}
          message={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter.' : 'Log risks to track and mitigate potential issues.'}
          actionLabel={canEdit && !search && statusFilter === 'ALL' ? '+ Log Risk' : undefined}
          onAction={canEdit && !search && statusFilter === 'ALL' ? openNew : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Active risks */}
          <CollapsibleSection
            title="Active Risks"
            count={activeRisks.length}
            defaultOpen={true}
            accent="blue"
          >
            <RisksTable
              items={activeRisks}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </CollapsibleSection>

          {/* Resolved / Closed risks */}
          <CollapsibleSection
            title="Resolved / Closed Risks"
            count={resolvedRisks.length}
            defaultOpen={false}
            accent="gray"
          >
            <RisksTable
              items={resolvedRisks}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </CollapsibleSection>
        </div>
      )}

      {drawerOpen && (
        <RiskDrawer
          dealId={dealId}
          editTarget={editTarget}
          onClose={closeDrawer}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteRisk.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Risk"
        message="Delete this risk entry? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
