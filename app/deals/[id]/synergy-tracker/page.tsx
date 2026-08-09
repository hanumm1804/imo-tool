'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle, Circle, TrendingUp, Users, Edit2, Save } from 'lucide-react'
import { useSynergy, useCreateSynergyLine, useUpdateSynergyLine, useDeleteSynergyLine } from '@/hooks/useSynergy'
import {
  useHeadcount, useCreateHeadcountLine, useUpdateHeadcountLine,
  useDeleteHeadcountLine, useUpdateHeadcountNotes,
} from '@/hooks/useHeadcount'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { SynergyLineWithRelations } from '@/hooks/useSynergy'
import type { HeadcountLine } from '@/hooks/useHeadcount'
import { Role, SynergyCategory, SynergyStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'cost' | 'revenue' | 'headcount'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'cost',      label: 'Cost Savings'         },
  { key: 'revenue',   label: 'Revenue Upside'        },
  { key: 'headcount', label: 'Headcount Reduction'   },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatM(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function formatFull(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

const STATUS_BADGE: Record<SynergyStatus, { label: string; cls: string }> = {
  ON_TRACK: { label: 'On Track', cls: 'bg-green-50 text-green-700' },
  WATCH:    { label: 'Watch',    cls: 'bg-yellow-50 text-yellow-700' },
  AT_RISK:  { label: 'At Risk',  cls: 'bg-red-50 text-red-700' },
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: {
  label:   string
  value:   string | number
  sub?:    string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-[var(--fsl-dark-blue)]'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Benefits Funnel ─────────────────────────────────────────────────────────

function BenefitsFunnel({ baseline, committed, realised }: {
  baseline: number; committed: number; realised: number
}) {
  const max  = Math.max(baseline, committed, realised, 1)
  const bars = [
    { label: 'Baseline Target', value: baseline,  color: 'bg-[var(--fsl-dark-blue)]'   },
    { label: 'Committed',       value: committed, color: 'bg-[var(--fsl-bright-blue)]' },
    { label: 'Realised',        value: realised,  color: 'bg-[var(--status-green)]'    },
  ]
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--fsl-dark-blue)]">
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        Benefits Funnel
      </h3>
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>{bar.label}</span>
              <span className="font-medium text-[var(--fsl-dark-blue)]">{formatM(bar.value)}</span>
            </div>
            <div className="h-6 w-full rounded-full bg-gray-100">
              <div
                className={`h-6 rounded-full ${bar.color} transition-all duration-500`}
                style={{ width: `${Math.min(100, (bar.value / max) * 100)}%` }}
                role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={bar.value}
                aria-label={bar.label}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Synergy Line Row ─────────────────────────────────────────────────────────

function LineRow({
  line, canEdit, onEdit, onDelete, onToggleValidation,
}: {
  line: SynergyLineWithRelations; canEdit: boolean
  onEdit: (l: SynergyLineWithRelations) => void
  onDelete: (l: SynergyLineWithRelations) => void
  onToggleValidation: (l: SynergyLineWithRelations) => void
}) {
  const captured = Number(line.realisedUSD) > 0
    ? Math.round((Number(line.realisedUSD) / Math.max(1, Number(line.baselineUSD))) * 100)
    : 0
  const statusBadge = STATUS_BADGE[line.status] ?? { label: line.status, cls: 'bg-gray-100 text-gray-600' }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{line.title}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatM(line.baselineUSD)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatM(line.committedUSD)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatM(line.realisedUSD)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-[var(--status-green)]" style={{ width: `${Math.min(100, captured)}%` }} />
          </div>
          <span className="text-xs text-gray-500">{captured}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => canEdit && onToggleValidation(line)}
          disabled={!canEdit}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            line.financeValidated ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          } ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          title={canEdit ? 'Toggle finance validation' : 'Only IMO Lead can validate'}
        >
          {line.financeValidated ? (
            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {line.financeValidated ? 'Validated' : 'Pending'}
        </button>
      </td>
      <td className="px-4 py-3">
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(line)}
              className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(line)}
              className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Synergy Table ────────────────────────────────────────────────────────────

function SynergyTable({
  lines, canEdit, label, onEdit, onDelete, onToggleValidation,
}: {
  lines: SynergyLineWithRelations[]; canEdit: boolean; label: string
  onEdit: (l: SynergyLineWithRelations) => void
  onDelete: (l: SynergyLineWithRelations) => void
  onToggleValidation: (l: SynergyLineWithRelations) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Title', 'Baseline', 'Committed', 'Realised', '% Captured', 'Status', 'Finance', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">
                  No {label.toLowerCase()} lines added yet.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <LineRow
                  key={line.id} line={line} canEdit={canEdit}
                  onEdit={onEdit} onDelete={onDelete} onToggleValidation={onToggleValidation}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Edit Synergy Line Modal ──────────────────────────────────────────────────

interface LineFormState {
  title:        string
  category:     SynergyCategory
  baselineUSD:  number
  committedUSD: number
  realisedUSD:  number
  status:       SynergyStatus
  notes:        string
}

function EditLineModal({
  dealId, editTarget, defaultCategory, onClose,
}: {
  dealId: string; editTarget?: SynergyLineWithRelations
  defaultCategory: SynergyCategory; onClose: () => void
}) {
  const createLine = useCreateSynergyLine(dealId)
  const updateLine = useUpdateSynergyLine(dealId)

  const [form, setForm] = useState<LineFormState>({
    title:        editTarget?.title        ?? '',
    category:     editTarget?.category     ?? defaultCategory,
    baselineUSD:  editTarget?.baselineUSD  ?? 0,
    committedUSD: editTarget?.committedUSD ?? 0,
    realisedUSD:  editTarget?.realisedUSD  ?? 0,
    status:       editTarget?.status       ?? SynergyStatus.ON_TRACK,
    notes:        editTarget?.notes        ?? '',
  })

  function field<K extends keyof LineFormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value as LineFormState[K]
      setForm((f) => ({ ...f, [key]: val }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) {
      await updateLine.mutateAsync({
        lineId: editTarget.id,
        body: { title: form.title, baselineUSD: form.baselineUSD, committedUSD: form.committedUSD, realisedUSD: form.realisedUSD, status: form.status, notes: form.notes || null },
      })
    } else {
      await createLine.mutateAsync({ title: form.title, category: form.category, baselineUSD: form.baselineUSD, committedUSD: form.committedUSD, realisedUSD: form.realisedUSD, status: form.status, notes: form.notes || undefined })
    }
    onClose()
  }

  const isPending = createLine.isPending || updateLine.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--fsl-dark-blue)]">
          {editTarget ? 'Edit Synergy Line' : `Add ${form.category === SynergyCategory.COST ? 'Cost Saving' : 'Revenue Upside'}`}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text" required value={form.title} onChange={field('title')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!editTarget && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={field('category')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none">
                  <option value={SynergyCategory.COST}>Cost Saving</option>
                  <option value={SynergyCategory.REVENUE}>Revenue Upside</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={field('status')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none">
                <option value={SynergyStatus.ON_TRACK}>On Track</option>
                <option value={SynergyStatus.WATCH}>Watch</option>
                <option value={SynergyStatus.AT_RISK}>At Risk</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([['baselineUSD', 'Baseline $'], ['committedUSD', 'Committed $'], ['realisedUSD', 'Realised $']] as const).map(([key, lbl]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
                <input type="number" min={0} value={form[key]} onChange={field(key)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={field('notes')} rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Headcount Line Modal ─────────────────────────────────────────────────────

interface HCFormState {
  department:       string
  headcountReduced: number
  peopleExpenseUSD: number
  otherExpenseUSD:  number
  notes:            string
}

function HeadcountLineModal({
  dealId, editTarget, onClose,
}: {
  dealId: string; editTarget?: HeadcountLine; onClose: () => void
}) {
  const createLine = useCreateHeadcountLine(dealId)
  const updateLine = useUpdateHeadcountLine(dealId)

  const [form, setForm] = useState<HCFormState>({
    department:       editTarget?.department       ?? '',
    headcountReduced: editTarget?.headcountReduced ?? 0,
    peopleExpenseUSD: editTarget?.peopleExpenseUSD ?? 0,
    otherExpenseUSD:  editTarget?.otherExpenseUSD  ?? 0,
    notes:            editTarget?.notes            ?? '',
  })

  function field<K extends keyof HCFormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value as HCFormState[K]
      setForm((f) => ({ ...f, [key]: val }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editTarget) {
      await updateLine.mutateAsync({
        lineId: editTarget.id,
        body: { department: form.department, headcountReduced: form.headcountReduced, peopleExpenseUSD: form.peopleExpenseUSD, otherExpenseUSD: form.otherExpenseUSD, notes: form.notes || null },
      })
    } else {
      await createLine.mutateAsync({ department: form.department, headcountReduced: form.headcountReduced, peopleExpenseUSD: form.peopleExpenseUSD, otherExpenseUSD: form.otherExpenseUSD, notes: form.notes || null })
    }
    onClose()
  }

  const isPending = createLine.isPending || updateLine.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--fsl-dark-blue)]">
          {editTarget ? 'Edit Department Entry' : 'Add Department Headcount'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <input type="text" required value={form.department} onChange={field('department')}
              placeholder="e.g. Finance, HR, IT…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headcount Reduced</label>
            <input type="number" min={0} value={form.headcountReduced} onChange={field('headcountReduced')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">People Expense ($)</label>
              <input type="number" min={0} step="0.01" value={form.peopleExpenseUSD} onChange={field('peopleExpenseUSD')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Expense ($)</label>
              <input type="number" min={0} step="0.01" value={form.otherExpenseUSD} onChange={field('otherExpenseUSD')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={field('notes')} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Headcount Tab ────────────────────────────────────────────────────────────

function HeadcountTab({
  dealId, canEdit,
}: {
  dealId: string; canEdit: boolean
}) {
  const { data: hcData, isLoading } = useHeadcount(dealId)
  const deleteLine                  = useDeleteHeadcountLine(dealId)
  const updateNotes                 = useUpdateHeadcountNotes(dealId)

  const [showModal,    setShowModal]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<HeadcountLine | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<HeadcountLine | undefined>()
  const [notesEdit,    setNotesEdit]    = useState(false)
  const [notesDraft,   setNotesDraft]   = useState('')

  const lines = hcData?.lines ?? []
  const notes = hcData?.notes ?? ''

  const { totalHC, totalPeople, totalOther, totalCost } = useMemo(() => {
    const totalHC     = lines.reduce((s, l) => s + l.headcountReduced, 0)
    const totalPeople = lines.reduce((s, l) => s + l.peopleExpenseUSD, 0)
    const totalOther  = lines.reduce((s, l) => s + l.otherExpenseUSD,  0)
    const totalCost   = totalPeople + totalOther
    return { totalHC, totalPeople, totalOther, totalCost }
  }, [lines])

  const peoplePct = totalCost > 0 ? Math.round((totalPeople / totalCost) * 100) : 0
  const otherPct  = totalCost > 0 ? Math.round((totalOther  / totalCost) * 100) : 0

  function openEdit(line: HeadcountLine) {
    setEditTarget(line); setShowModal(true)
  }

  function handleNotesEdit() {
    setNotesDraft(notes); setNotesEdit(true)
  }

  async function handleNotesSave() {
    await updateNotes.mutateAsync(notesDraft || null)
    setNotesEdit(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Total Headcount Reduced"
          value={String(totalHC)}
          sub="FTEs"
        />
        <SummaryCard
          label="Total True Cost Reduction"
          value={formatFull(totalCost)}
          sub="People + Other"
        />
        <SummaryCard
          label="People Expense Reduction"
          value={formatFull(totalPeople)}
          sub={`${peoplePct}% of total`}
          accent="text-[var(--fsl-bright-blue)]"
        />
        <SummaryCard
          label="Other Cost Reduction"
          value={formatFull(totalOther)}
          sub={`${otherPct}% of total`}
          accent="text-[var(--status-green)]"
        />
      </div>

      {/* Two side-by-side tables */}
      {lines.length === 0 ? (
        <EmptyState
          title="No department entries yet"
          message="Add department-wise headcount and expense reductions to track people savings."
          actionLabel={canEdit ? '+ Add Department' : undefined}
          onAction={canEdit ? () => { setEditTarget(undefined); setShowModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Table 1: Headcount by Department */}
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                <Users className="h-4 w-4" aria-hidden="true" />
                Headcount Reduction by Department
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-white">
                <tr>
                  {['Department', 'Headcount', '% of Total', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const pct = totalHC > 0 ? Math.round((line.headcountReduced / totalHC) * 100) : 0
                  return (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{line.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{line.headcountReduced}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-[var(--fsl-dark-blue)]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(line)} className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50">Edit</button>
                            <button onClick={() => setDeleteTarget(line)} className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-[var(--fsl-dark-blue)]">Total</td>
                  <td className="px-4 py-3 text-sm text-[var(--fsl-dark-blue)]">{totalHC}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">100%</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: Cost Savings by Department */}
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Cost Savings by Department
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-gray-100 bg-white">
                <tr>
                  {['Department', 'People', 'Other', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{line.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatFull(line.peopleExpenseUSD)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatFull(line.otherExpenseUSD)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                      {formatFull(line.peopleExpenseUSD + line.otherExpenseUSD)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-[var(--fsl-dark-blue)]">Total</td>
                  <td className="px-4 py-3 text-sm text-[var(--fsl-bright-blue)]">{formatFull(totalPeople)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--status-green)]">{formatFull(totalOther)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[var(--fsl-dark-blue)]">{formatFull(totalCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Additional Considerations */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--fsl-dark-blue)]">Additional Considerations</h3>
          {canEdit && !notesEdit && (
            <button
              onClick={handleNotesEdit}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="h-3 w-3" aria-hidden="true" /> Edit
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {notesEdit ? (
            <div className="space-y-3">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={6}
                placeholder="Enter additional considerations, caveats, or context…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNotesSave}
                  disabled={updateNotes.isPending}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--fsl-dark-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-3 w-3" aria-hidden="true" />
                  {updateNotes.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setNotesEdit(false)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : notes ? (
            <p className="whitespace-pre-line text-sm text-gray-700">{notes}</p>
          ) : (
            <p className="text-sm text-gray-400">
              {canEdit ? 'No considerations added yet. Click Edit to add context.' : 'No considerations added yet.'}
            </p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <HeadcountLineModal
          dealId={dealId}
          editTarget={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(undefined) }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteLine.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Department Entry"
        message={`Delete headcount entry for "${deleteTarget?.department}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SynergyTrackerPage() {
  const params  = useParams<{ id: string }>()
  const dealId  = params.id
  const { data: session } = useSession()

  const { data: lines, isLoading } = useSynergy(dealId)
  const updateLine = useUpdateSynergyLine(dealId)
  const deleteLine = useDeleteSynergyLine(dealId)

  const canEdit = session?.user.role !== Role.VIEWER

  const [activeTab,    setActiveTab]    = useState<TabKey>('cost')
  const [showModal,    setShowModal]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<SynergyLineWithRelations | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<SynergyLineWithRelations | undefined>()
  const [showHCModal,  setShowHCModal]  = useState(false)

  const { costLines, revenueLines, costTotals, revenueTotals } = useMemo(() => {
    const allLines     = lines ?? []
    const costLines    = allLines.filter((l) => l.category === SynergyCategory.COST)
    const revenueLines = allLines.filter((l) => l.category === SynergyCategory.REVENUE)
    return {
      costLines,
      revenueLines,
      costTotals: {
        baseline:  costLines.reduce((s, l) => s + Number(l.baselineUSD),  0),
        committed: costLines.reduce((s, l) => s + Number(l.committedUSD), 0),
        realised:  costLines.reduce((s, l) => s + Number(l.realisedUSD),  0),
      },
      revenueTotals: {
        baseline:  revenueLines.reduce((s, l) => s + Number(l.baselineUSD),  0),
        committed: revenueLines.reduce((s, l) => s + Number(l.committedUSD), 0),
        realised:  revenueLines.reduce((s, l) => s + Number(l.realisedUSD),  0),
      },
    }
  }, [lines])

  async function handleToggleValidation(line: SynergyLineWithRelations) {
    await updateLine.mutateAsync({ lineId: line.id, body: { financeValidated: !line.financeValidated } })
  }

  const tabLines    = activeTab === 'cost' ? costLines    : revenueLines
  const tabTotals   = activeTab === 'cost' ? costTotals   : revenueTotals
  const tabLabel    = activeTab === 'cost' ? 'Cost Savings' : 'Revenue Upside'
  const tabCategory = activeTab === 'cost' ? SynergyCategory.COST : SynergyCategory.REVENUE

  function handleAddClick() {
    if (activeTab === 'headcount') {
      setShowHCModal(true)
    } else {
      setEditTarget(undefined)
      setShowModal(true)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={5} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Synergy Tracker</h1>
        {canEdit && (
          <button
            onClick={handleAddClick}
            className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {activeTab === 'cost'      ? '+ Add Cost Saving'    :
             activeTab === 'revenue'   ? '+ Add Revenue Upside' :
             '+ Add Department'}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Synergy tabs">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-t-md border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-[var(--fsl-dark-blue)] text-[var(--fsl-dark-blue)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              {label}
              {key !== 'headcount' && (
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                  activeTab === key ? 'bg-[var(--fsl-dark-blue)] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {key === 'cost' ? costLines.length : revenueLines.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'headcount' ? (
        <HeadcountTab dealId={dealId} canEdit={canEdit} />
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard label={`${tabLabel} Lines`}  value={String(tabLines.length)} />
            <SummaryCard label="Baseline Target"      value={formatM(tabTotals.baseline)}  sub="Total identified" />
            <SummaryCard label="Committed"            value={formatM(tabTotals.committed)} sub="Signed-off value" />
            <SummaryCard label="Realised"             value={formatM(tabTotals.realised)}  sub="Captured to date" accent="text-[var(--status-green)]" />
          </div>

          {/* Benefits Funnel */}
          <BenefitsFunnel
            baseline={tabTotals.baseline}
            committed={tabTotals.committed}
            realised={tabTotals.realised}
          />

          {/* Lines table */}
          {tabLines.length === 0 ? (
            <EmptyState
              title={`No ${tabLabel.toLowerCase()} lines yet`}
              message={`Add ${tabLabel.toLowerCase()} lines to track synergy delivery.`}
              actionLabel={canEdit ? `+ Add ${tabLabel === 'Cost Savings' ? 'Cost Saving' : 'Revenue Upside'}` : undefined}
              onAction={canEdit ? () => { setEditTarget(undefined); setShowModal(true) } : undefined}
            />
          ) : (
            <SynergyTable
              lines={tabLines}
              canEdit={canEdit}
              label={tabLabel}
              onEdit={(l) => { setEditTarget(l); setShowModal(true) }}
              onDelete={setDeleteTarget}
              onToggleValidation={handleToggleValidation}
            />
          )}
        </div>
      )}

      {/* Synergy Line Modal */}
      {showModal && (
        <EditLineModal
          dealId={dealId}
          editTarget={editTarget}
          defaultCategory={tabCategory}
          onClose={() => { setShowModal(false); setEditTarget(undefined) }}
        />
      )}

      {/* Headcount Modal */}
      {showHCModal && (
        <HeadcountLineModal
          dealId={dealId}
          onClose={() => setShowHCModal(false)}
        />
      )}

      {/* Delete confirm for synergy lines */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteLine.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Synergy Line"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
