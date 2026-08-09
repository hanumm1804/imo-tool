'use client'

import { useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Plus, Download } from 'lucide-react'
import { useResources, useCreateResource, useUpdateResource, useDeleteResource } from '@/hooks/useResources'
import { useWorkstreams } from '@/hooks/useWorkstreams'
import { useTasks } from '@/hooks/useTasks'
import { UserPicker } from '@/components/shared/UserPicker'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { RAGChip } from '@/components/shared/RAGChip'
import { PeopleTasksPanel } from '@/components/shared/PeopleTasksPanel'
import type { ResourceWithRelations } from '@/hooks/useResources'
import type { PersonStat } from '@/hooks/useResources'
import { Role, RAGStatus, TaskStatus } from '@/types'

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--fsl-dark-blue)]">{value}</p>
    </div>
  )
}

// ─── Add/Edit Person Modal ────────────────────────────────────────────────────

interface PersonFormState {
  userId:          string
  workstreamId:    string
  roleDescription: string
  allocationPct:   number
  startDate:       string
  endDate:         string
}

function AddPersonModal({
  dealId,
  editTarget,
  workstreams,
  onClose,
}: {
  dealId:      string
  editTarget?: ResourceWithRelations
  workstreams: Array<{ id: string; name: string; code: string }>
  onClose:     () => void
}) {
  const createResource = useCreateResource(dealId)
  const updateResource = useUpdateResource(dealId)

  const [form, setForm] = useState<PersonFormState>({
    userId:          editTarget?.userId             ?? '',
    workstreamId:    editTarget?.workstreamId       ?? '',
    roleDescription: editTarget?.roleDescription    ?? '',
    allocationPct:   editTarget?.allocationPct      ?? 100,
    startDate:       editTarget?.startDate ? format(new Date(editTarget.startDate as unknown as string), 'yyyy-MM-dd') : '',
    endDate:         editTarget?.endDate   ? format(new Date(editTarget.endDate   as unknown as string), 'yyyy-MM-dd') : '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.userId) return

    const payload = {
      workstreamId:    form.workstreamId    || undefined,
      roleDescription: form.roleDescription || undefined,
      allocationPct:   form.allocationPct,
      startDate:       form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate:         form.endDate   ? new Date(form.endDate).toISOString()   : undefined,
    }

    if (editTarget) {
      await updateResource.mutateAsync({ resourceId: editTarget.id, body: payload })
    } else {
      await createResource.mutateAsync({ userId: form.userId, ...payload })
    }
    onClose()
  }

  const isPending = createResource.isPending || updateResource.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--fsl-dark-blue)]">
          {editTarget ? 'Edit Person' : 'Add Person'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editTarget && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Person *</label>
              <UserPicker value={form.userId} onChange={(id) => setForm(f => ({ ...f, userId: id }))} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Workstream</label>
            <select
              value={form.workstreamId}
              onChange={(e) => setForm(f => ({ ...f, workstreamId: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            >
              <option value="">— None —</option>
              {workstreams.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.code} — {ws.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role / Description</label>
            <input
              type="text"
              value={form.roleDescription}
              onChange={(e) => setForm(f => ({ ...f, roleDescription: e.target.value }))}
              placeholder="e.g. Integration Lead"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Allocation % (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.allocationPct}
              onChange={(e) => setForm(f => ({ ...f, allocationPct: Number(e.target.value) }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!form.userId && !editTarget) || isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportResourcesCSV(people: PersonStat[], filename: string) {
  const header = 'Person,Total Tasks,RED,AMBER,GREEN,Completed,Not Started\n'
  const rows = people.map(p =>
    [p.name, p.totalTasks, p.redTasks, p.amberTasks, p.greenTasks, p.completedTasks, p.notStartedTasks].join(',')
  ).join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const params  = useParams<{ id: string }>()
  const dealId  = params.id
  const { data: session } = useSession()

  const { data: resources,   isLoading: resLoading   } = useResources(dealId)
  const { data: workstreams, isLoading: wsLoading    } = useWorkstreams(dealId)
  const { data: tasks,       isLoading: tasksLoading } = useTasks(dealId)
  const deleteResource = useDeleteResource(dealId)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget,   setEditTarget]   = useState<ResourceWithRelations | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<ResourceWithRelations | undefined>()

  const canEdit  = session?.user.role !== Role.VIEWER
  const isLoading = resLoading || wsLoading || tasksLoading

  const kpis = useMemo(() => {
    const allTasks = tasks ?? []
    const l3       = allTasks.filter(t => t.level === 3)
    return {
      totalPeople:       (resources ?? []).length,
      workstreamsActive: (workstreams ?? []).filter(w => w.isActive).length,
      tasksAssigned:     allTasks.length,
      redTasks:          l3.filter(t => t.rag === RAGStatus.RED).length,
    }
  }, [resources, workstreams, tasks])

  const personStats = useMemo<PersonStat[]>(() => {
    if (!resources || !tasks) return []
    return resources.map(r => {
      const mine = tasks.filter(t => t.ownerId === r.user.id)
      let barRed = 0, barAmber = 0, barGreen = 0, barCompleted = 0, barNotStarted = 0, barOther = 0
      for (const t of mine) {
        if      (t.status === TaskStatus.COMPLETE)     barCompleted++
        else if (t.status === TaskStatus.NOT_STARTED)  barNotStarted++
        else if (t.rag    === RAGStatus.RED)            barRed++
        else if (t.rag    === RAGStatus.AMBER)          barAmber++
        else if (t.rag    === RAGStatus.GREEN)          barGreen++
        else                                            barOther++
      }
      return {
        userId:          r.user.id,
        name:            r.user.name,
        totalTasks:      mine.length,
        redTasks:        mine.filter(t => t.rag    === RAGStatus.RED).length,
        amberTasks:      mine.filter(t => t.rag    === RAGStatus.AMBER).length,
        greenTasks:      mine.filter(t => t.rag    === RAGStatus.GREEN).length,
        completedTasks:  mine.filter(t => t.status === TaskStatus.COMPLETE).length,
        notStartedTasks: mine.filter(t => t.status === TaskStatus.NOT_STARTED).length,
        barRed, barAmber, barGreen, barCompleted, barNotStarted, barOther,
      }
    })
  }, [resources, tasks])

  function handleEditPerson(userId: string) {
    const r = (resources ?? []).find(r => r.user.id === userId)
    if (r) { setEditTarget(r); setShowAddModal(true) }
  }

  function handleDeletePerson(userId: string) {
    const r = (resources ?? []).find(r => r.user.id === userId)
    if (r) setDeleteTarget(r)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={6} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Resources</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResourcesCSV(personStats, `resources-${dealId}.csv`)}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => { setEditTarget(undefined); setShowAddModal(true) }}
              className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Person
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="Total People"       value={kpis.totalPeople} />
        <KPICard label="Active Workstreams" value={kpis.workstreamsActive} />
        <KPICard label="Tasks Assigned"     value={kpis.tasksAssigned} />
        <KPICard label="Red Tasks"          value={kpis.redTasks} />
      </div>

      {/* Workstream Overview */}
      <section aria-labelledby="ws-overview-heading">
        <h2 id="ws-overview-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Workstream Overview
        </h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                {['Workstream', 'FSL Lead', 'Tasks Total', 'GREEN', 'AMBER', 'RED', 'RAG'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(workstreams ?? []).filter(ws => ws.isActive).map((ws, idx) => {
                const wsTasks = (tasks ?? []).filter(t => t.workstreamId === ws.id && t.level === 3)
                return (
                  <tr key={ws.id} className={idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : ''}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[var(--fsl-dark-blue)]">{ws.name}</p>
                      <p className="text-xs text-gray-400">{ws.code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{ws.fslLead?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{wsTasks.length}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--status-green)]">
                      {wsTasks.filter(t => t.rag === RAGStatus.GREEN).length}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--status-amber)]">
                      {wsTasks.filter(t => t.rag === RAGStatus.AMBER).length}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--status-red)]">
                      {wsTasks.filter(t => t.rag === RAGStatus.RED).length}
                    </td>
                    <td className="px-4 py-3"><RAGChip rag={ws.rag} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* People Table + Bar Chart */}
      <section aria-labelledby="people-heading">
        <h2 id="people-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          People
        </h2>
        {(resources ?? []).length === 0 ? (
          <EmptyState
            title="No people allocated"
            message="Add people to this deal to track resource allocation."
            actionLabel={canEdit ? '+ Add Person' : undefined}
            onAction={canEdit ? () => setShowAddModal(true) : undefined}
          />
        ) : (
          <PeopleTasksPanel
            people={personStats}
            canEdit={canEdit}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
          />
        )}
      </section>

      {/* Modals */}
      {showAddModal && (
        <AddPersonModal
          dealId={dealId}
          editTarget={editTarget}
          workstreams={(workstreams ?? []).map(w => ({ id: w.id, name: w.name, code: w.code }))}
          onClose={() => { setShowAddModal(false); setEditTarget(undefined) }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteResource.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Remove Person"
        message={`Remove ${deleteTarget?.user.name} from this deal?`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  )
}
