'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'
import { Plus, Search, X, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useActions, useCreateAction, useUpdateAction, useDeleteAction,
} from '@/hooks/useLogs'
import { useResources, useQuickAddResource } from '@/hooks/useResources'
import { UserCombobox } from '@/components/ui/UserCombobox'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { ActionWithRelations } from '@/hooks/useLogs'
import { Role } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVERDUE'

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  CLOSED:      'bg-green-100 text-green-700',
  OVERDUE:     'bg-red-100 text-red-700',
}

const PRIORITY_BADGE: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH:   'bg-orange-100 text-orange-700',
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

// ─── Slide-Over Drawer ────────────────────────────────────────────────────────

interface ActionFormState {
  title:       string
  description: string
  ownerId:     string
  priority:    string
  dueDate:     string
  status:      string
}

function ActionDrawer({
  dealId,
  editTarget,
  onClose,
}: {
  dealId:      string
  editTarget?: ActionWithRelations
  onClose:     () => void
}) {
  const createAction = useCreateAction(dealId)
  const updateAction = useUpdateAction(dealId)
  const { data: resources = [] } = useResources(dealId)
  const quickAdd = useQuickAddResource(dealId)

  const [form, setForm] = useState<ActionFormState>({
    title:       editTarget?.title       ?? '',
    description: editTarget?.description ?? '',
    ownerId:     editTarget?.ownerId     ?? '',
    priority:    editTarget?.priority    ?? 'MEDIUM',
    dueDate:     editTarget?.dueDate     ? format(new Date(editTarget.dueDate as unknown as string), 'yyyy-MM-dd') : '',
    status:      editTarget?.status      ?? 'OPEN',
  })

  function setField(key: keyof ActionFormState, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      ownerId: form.ownerId || undefined,
    }
    if (editTarget) {
      await updateAction.mutateAsync({ actionId: editTarget.id, body: payload })
    } else {
      await createAction.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = createAction.isPending || updateAction.isPending

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-y-0 right-0 z-40 flex w-[480px] flex-col border-l border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="action-drawer-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[var(--fsl-dark-blue)] px-5 py-4">
          <h3 id="action-drawer-title" className="text-lg font-bold text-white">
            {editTarget ? 'Edit Action' : 'New Action'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                >
                  {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                >
                  {['OPEN', 'IN_PROGRESS', 'CLOSED'].map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField('dueDate', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-5 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Actions table (shared between sections) ──────────────────────────────────

function ActionsTable({
  items,
  canEdit,
  onEdit,
  onDelete,
}: {
  items:    ActionWithRelations[]
  canEdit:  boolean
  onEdit:   (a: ActionWithRelations) => void
  onDelete: (a: ActionWithRelations) => void
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-gray-400">No actions in this section.</p>
    )
  }
  return (
    <table className="w-full text-left">
      <thead className="border-b border-gray-200 bg-gray-50">
        <tr>
          {['Title', 'Owner', 'Priority', 'Due Date', 'Status', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((action, idx) => {
          const isOverdue =
            action.dueDate &&
            isPast(new Date(action.dueDate as unknown as string)) &&
            action.status !== 'CLOSED'
          return (
            <tr
              key={action.id}
              className={`${isOverdue ? 'bg-red-50' : idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'} hover:bg-blue-50`}
            >
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-[var(--fsl-dark-blue)]">{action.title}</p>
                {action.description && (
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{action.description}</p>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {action.owner?.name ?? <span className="text-gray-400">Unassigned</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[action.priority ?? 'MEDIUM']}`}>
                  {action.priority ?? 'MEDIUM'}
                </span>
              </td>
              <td className="px-4 py-3">
                {action.dueDate ? (
                  <span className={`text-sm ${isOverdue ? 'font-semibold text-[var(--status-red)]' : 'text-gray-700'}`}>
                    {isOverdue && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
                    {format(new Date(action.dueDate as unknown as string), 'dd MMM yyyy')}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isOverdue ? STATUS_BADGE['OVERDUE'] : STATUS_BADGE[action.status ?? 'OPEN']
                }`}>
                  {isOverdue ? 'OVERDUE' : (action.status ?? 'OPEN').replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(action)}
                      className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(action)}
                      className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActionsLogPage() {
  const params  = useParams<{ id: string }>()
  const dealId  = params.id
  const { data: session } = useSession()

  const { data: actions, isLoading } = useActions(dealId)
  const deleteAction = useDeleteAction(dealId)

  const canEdit = session?.user.role !== Role.VIEWER

  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<ActionWithRelations | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<ActionWithRelations | undefined>()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const now           = new Date()
  const soonThreshold = addDays(now, 7)

  const filtered = useMemo(() => {
    return (actions ?? []).filter((a) => {
      const isOverdue =
        a.dueDate && isPast(new Date(a.dueDate as unknown as string)) && a.status !== 'CLOSED'

      if (statusFilter === 'OVERDUE' && !isOverdue) return false
      if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE' && a.status !== statusFilter) return false

      if (search) {
        const q = search.toLowerCase()
        if (
          !a.title.toLowerCase().includes(q) &&
          !(a.owner?.name ?? '').toLowerCase().includes(q) &&
          !(a.description ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [actions, search, statusFilter])

  // Split into two sections
  const activeItems = useMemo(() => filtered.filter((a) => a.status !== 'CLOSED'), [filtered])
  const closedItems = useMemo(() => filtered.filter((a) => a.status === 'CLOSED'),  [filtered])

  const overdueCount = useMemo(() =>
    (actions ?? []).filter((a) =>
      a.dueDate && isPast(new Date(a.dueDate as unknown as string)) && a.status !== 'CLOSED'
    ).length,
    [actions]
  )

  const dueSoonCount = useMemo(() =>
    (actions ?? []).filter((a) => {
      if (!a.dueDate || a.status === 'CLOSED') return false
      const due = new Date(a.dueDate as unknown as string)
      return isWithinInterval(due, { start: now, end: soonThreshold })
    }).length,
    [actions]
  )

  function openNew()  { setEditTarget(undefined); setDrawerOpen(true) }
  function openEdit(a: ActionWithRelations) { setEditTarget(a); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false); setEditTarget(undefined) }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonLoader variant="table" rows={8} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Actions Log</h1>
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-[var(--status-red)]">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {overdueCount} overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="flex items-center gap-1 text-[var(--status-amber)]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {dueSoonCount} due this week
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Action
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search actions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'OVERDUE'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
              {s === 'OVERDUE' && overdueCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[var(--status-red)] px-1.5 py-0.5 text-[10px] text-white">
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== 'ALL' ? 'No actions match filters' : 'No actions yet'}
          message={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter.' : 'Add actions to track work items across this deal.'}
          actionLabel={canEdit && !search && statusFilter === 'ALL' ? '+ New Action' : undefined}
          onAction={canEdit && !search && statusFilter === 'ALL' ? openNew : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Active actions */}
          <CollapsibleSection
            title="Active Actions"
            count={activeItems.length}
            defaultOpen={true}
            accent="blue"
          >
            <ActionsTable
              items={activeItems}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </CollapsibleSection>

          {/* Closed actions */}
          <CollapsibleSection
            title="Closed Actions"
            count={closedItems.length}
            defaultOpen={false}
            accent="gray"
          >
            <ActionsTable
              items={closedItems}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          </CollapsibleSection>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <ActionDrawer
          dealId={dealId}
          editTarget={editTarget}
          onClose={closeDrawer}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteAction.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Action"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
