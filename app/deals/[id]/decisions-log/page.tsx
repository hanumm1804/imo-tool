'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Plus, Search, ChevronDown, ChevronRight, X, Shield } from 'lucide-react'
import {
  useDecisions, useCreateDecision, useUpdateDecision, useDeleteDecision,
} from '@/hooks/useLogs'
import { useResources, useQuickAddResource } from '@/hooks/useResources'
import { UserCombobox } from '@/components/ui/UserCombobox'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { DecisionWithRelations } from '@/hooks/useLogs'
import { Role } from '@/types'

// ─── Decision Drawer ──────────────────────────────────────────────────────────

interface DecisionFormState {
  title:             string
  context:           string
  decisionMade:      string
  rationale:         string
  impactWorkstream:  string
  decisionMakerId:   string
  decidedAt:         string
}

function DecisionDrawer({
  dealId,
  editTarget,
  onClose,
}: {
  dealId:      string
  editTarget?: DecisionWithRelations
  onClose:     () => void
}) {
  const createDecision = useCreateDecision(dealId)
  const updateDecision = useUpdateDecision(dealId)
  const { data: resources = [] } = useResources(dealId)
  const quickAdd = useQuickAddResource(dealId)

  const [form, setForm] = useState<DecisionFormState>({
    title:            editTarget?.title                ?? '',
    context:          editTarget?.context              ?? '',
    decisionMade:     editTarget?.decisionMade         ?? '',
    rationale:        editTarget?.rationale            ?? '',
    impactWorkstream: editTarget?.impactWorkstream     ?? '',
    decisionMakerId:  editTarget?.decisionMakerId      ?? '',
    decidedAt:        editTarget?.decidedAt
      ? format(new Date(editTarget.decidedAt), 'yyyy-MM-dd')
      : '',
  })

  function setField(key: keyof DecisionFormState, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title:             form.title,
      context:           form.context           || undefined,
      decisionMade:      form.decisionMade,
      decisionMakerId:   form.decisionMakerId   || undefined,
      decidedAt:         form.decidedAt ? new Date(form.decidedAt).toISOString() : undefined,
      rationale:         form.rationale         || undefined,
      impactWorkstream:  form.impactWorkstream   || undefined,
    }
    if (editTarget) {
      await updateDecision.mutateAsync({ decisionId: editTarget.id, body: payload })
    } else {
      await createDecision.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createDecision.isPending || updateDecision.isPending

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-y-0 right-0 z-40 flex w-[520px] flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="decision-drawer-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-[var(--fsl-dark-blue)] px-5 py-4">
          <h3 id="decision-drawer-title" className="text-lg font-bold text-white">
            {editTarget ? 'Edit Decision' : 'Log Decision'}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background / Context</label>
              <textarea
                value={form.context}
                onChange={(e) => setField('context', e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                placeholder="What background information is relevant?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Made *</label>
              <textarea
                required
                value={form.decisionMade}
                onChange={(e) => setField('decisionMade', e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                placeholder="What was decided?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rationale</label>
              <textarea
                value={form.rationale}
                onChange={(e) => setField('rationale', e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                placeholder="Why was this decision made?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Maker</label>
              <UserCombobox
                users={resources.map(r => ({ id: r.user.id, name: r.user.name }))}
                value={form.decisionMakerId}
                currentName={editTarget?.decisionMaker?.name ?? ''}
                onChange={userId => setField('decisionMakerId', userId)}
                onCreateNew={name => quickAdd.mutateAsync(name)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workstream Impact</label>
              <textarea
                value={form.impactWorkstream}
                onChange={(e) => setField('impactWorkstream', e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                placeholder="Which workstreams are impacted?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision Date</label>
              <input
                type="date"
                value={form.decidedAt}
                onChange={(e) => setField('decidedAt', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
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
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Log Decision'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Expandable Row ───────────────────────────────────────────────────────────

function DecisionRow({
  decision,
  canEdit,
  onEdit,
  onDelete,
}: {
  decision: DecisionWithRelations
  canEdit:  boolean
  onEdit:   (d: DecisionWithRelations) => void
  onDelete: (d: DecisionWithRelations) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="cursor-pointer border-b border-gray-100 hover:bg-blue-50"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 w-6">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
          )}
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-[var(--fsl-dark-blue)]">{decision.title}</p>
          {!expanded && decision.context && (
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{decision.context}</p>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">{decision.decisionMaker?.name ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {decision.decidedAt
            ? format(new Date(decision.decidedAt), 'dd MMM yyyy')
            : '—'}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {canEdit && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(decision)}
                className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(decision)}
                className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-blue-50">
          <td />
          <td colSpan={4} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {decision.context && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Context</p>
                  <p className="text-gray-700">{decision.context}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Decision Made</p>
                <p className="text-gray-700">{decision.decisionMade}</p>
              </div>
              {decision.rationale && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Rationale</p>
                  <p className="text-gray-700">{decision.rationale}</p>
                </div>
              )}
              {decision.impactWorkstream && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Workstream Impact</p>
                  <p className="text-gray-700">{decision.impactWorkstream}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionsLogPage() {
  const params = useParams<{ id: string }>()
  const dealId = params.id
  const { data: session } = useSession()

  const { data: decisions, isLoading } = useDecisions(dealId)
  const deleteDecision = useDeleteDecision(dealId)

  const canEdit = session?.user.role !== Role.VIEWER

  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<DecisionWithRelations | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<DecisionWithRelations | undefined>()
  const [search,       setSearch]       = useState('')

  const filtered = useMemo(() =>
    (decisions ?? []).filter((d) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        d.title.toLowerCase().includes(q) ||
        (d.context        ?? '').toLowerCase().includes(q) ||
        (d.decisionMade   ?? '').toLowerCase().includes(q) ||
        (d.decisionMaker?.name ?? '').toLowerCase().includes(q)
      )
    }),
    [decisions, search]
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonLoader variant="table" rows={6} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Permanent record banner */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Shield className="h-5 w-5 flex-shrink-0 text-[var(--fsl-dark-blue)]" aria-hidden="true" />
        <p className="text-sm text-[var(--fsl-dark-blue)]">
          <span className="font-semibold">Decisions are a permanent record.</span>{' '}
          Once logged, decision history is captured in the audit trail and cannot be fully erased.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Decisions Log</h1>
        {canEdit && (
          <button
            onClick={() => { setEditTarget(undefined); setDrawerOpen(true) }}
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Log Decision
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search decisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No decisions match your search' : 'No decisions logged yet'}
          message={search ? 'Try adjusting your search.' : 'Log decisions to maintain a permanent record of key choices.'}
          actionLabel={canEdit && !search ? '+ Log Decision' : undefined}
          onAction={canEdit && !search ? () => setDrawerOpen(true) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                <th className="px-4 py-3 w-6" />
                {['Decision', 'Decision Maker', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map((decision) => (
                <DecisionRow
                  key={decision.id}
                  decision={decision}
                  canEdit={canEdit}
                  onEdit={(d) => { setEditTarget(d); setDrawerOpen(true) }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && (
        <DecisionDrawer
          dealId={dealId}
          editTarget={editTarget}
          onClose={() => { setDrawerOpen(false); setEditTarget(undefined) }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteDecision.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Decision"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
