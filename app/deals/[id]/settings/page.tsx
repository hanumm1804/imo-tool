'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AlertTriangle, Plus, Pencil, Check, X as XIcon, Users, UserPlus, Trash2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useDeal } from '@/hooks/useDeal'
import { useUpdateDeal } from '@/hooks/useDeals'
import { useWorkstreams, useCreateWorkstream, useUpdateWorkstream, useDeleteWorkstream } from '@/hooks/useWorkstreams'
import { useDealTeam, useAddToTeam, useInviteToTeam, useRemoveFromTeam, useAllUsers } from '@/hooks/useResources'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { RAGChip } from '@/components/shared/RAGChip'
import type { WorkstreamWithOwner } from '@/hooks/useWorkstreams'
import type { TeamMember } from '@/hooks/useResources'
import { Role, DealStatus, RAGStatus, PhaseStatus } from '@/types'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title:       string
  description?: string
  children:    React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-[var(--fsl-dark-blue)]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

// ─── Deal Info Section ────────────────────────────────────────────────────────

function DealInfoSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: deal, isLoading } = useDeal(dealId)
  const updateDeal  = useUpdateDeal(dealId)
  const { data: allUsers = [] } = useAllUsers()

  const [editing,        setEditing]        = useState(false)
  const [name,           setName]           = useState('')
  const [sector,         setSector]         = useState('')
  const [description,    setDescription]    = useState('')
  const [imoLeadId,      setImoLeadId]      = useState<string>('')
  const [execSponsorId,  setExecSponsorId]  = useState<string>('')

  function startEdit() {
    if (!deal) return
    setName(deal.name ?? '')
    setSector(deal.sector ?? '')
    setDescription(deal.description ?? '')
    setImoLeadId((deal as any).imoLead?.id ?? '')
    setExecSponsorId((deal as any).execSponsor?.id ?? '')
    setEditing(true)
  }

  async function saveEdit() {
    await updateDeal.mutateAsync({
      name,
      sector,
      description,
      imoLeadId:     imoLeadId     || null,
      execSponsorId: execSponsorId || null,
    })
    setEditing(false)
  }

  const selectClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none bg-white"

  if (isLoading) return <SkeletonLoader variant="card" />

  const imoLeadName     = (deal as any)?.imoLead?.name
  const execSponsorName = (deal as any)?.execSponsor?.name

  return (
    <Section title="Deal Information" description="Basic details for this deal.">
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deal Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sector</label>
            <input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IMO Lead</label>
              <select value={imoLeadId} onChange={(e) => setImoLeadId(e.target.value)} className={selectClass}>
                <option value="">— Unassigned —</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Deal Sponsor</label>
              <select value={execSponsorId} onChange={(e) => setExecSponsorId(e.target.value)} className={selectClass}>
                <option value="">— Unassigned —</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={updateDeal.isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {updateDeal.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              <div><span className="text-xs text-gray-400">Name:</span> <span className="font-medium">{deal?.name}</span></div>
              <div><span className="text-xs text-gray-400">Acquired Company:</span> <span className="font-medium">{(deal as any)?.acquiredCompanyName ?? '—'}</span></div>
              <div><span className="text-xs text-gray-400">Sector:</span> <span>{deal?.sector ?? '—'}</span></div>
              <div><span className="text-xs text-gray-400">Status:</span> <span>{deal?.status}</span></div>
              <div><span className="text-xs text-gray-400">IMO Lead:</span> <span className="font-medium">{imoLeadName ?? '—'}</span></div>
              <div><span className="text-xs text-gray-400">Deal Sponsor:</span> <span className="font-medium">{execSponsorName ?? '—'}</span></div>
            </div>
            {canEdit && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </button>
            )}
          </div>
          {deal?.description && <p className="text-gray-500 text-xs pt-1">{deal.description}</p>}
        </div>
      )}
    </Section>
  )
}

// ─── RAG Status Section ───────────────────────────────────────────────────────

function RAGStatusSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: deal }  = useDeal(dealId)
  const updateDeal      = useUpdateDeal(dealId)

  async function setRag(rag: RAGStatus) {
    await updateDeal.mutateAsync({ overallRag: rag })
  }

  const statuses: RAGStatus[] = [RAGStatus.GREEN, RAGStatus.AMBER, RAGStatus.RED, RAGStatus.GRAY]

  return (
    <Section title="Overall RAG Status" description="Override the computed RAG status for this deal.">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Current:</span>
        <RAGChip rag={deal?.overallRag as RAGStatus} />
        {canEdit && (
          <>
            <span className="text-xs text-gray-400">Change to:</span>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setRag(s)}
                disabled={(deal?.overallRag as RAGStatus) === s || updateDeal.isPending}
                className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${
                  s === RAGStatus.GREEN ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                  s === RAGStatus.AMBER ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                  s === RAGStatus.RED   ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                  'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </>
        )}
      </div>
    </Section>
  )
}

// ─── Deal Status Section ──────────────────────────────────────────────────────

function DealStatusSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: deal } = useDeal(dealId)
  const updateDeal = useUpdateDeal(dealId)

  const statuses: DealStatus[] = [
    DealStatus.PRE_CLOSE, DealStatus.ACTIVE, DealStatus.ON_HOLD, DealStatus.CLOSED, DealStatus.CANCELLED,
  ]

  return (
    <Section title="Deal Status" description="Set the current lifecycle stage of this deal.">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={canEdit ? () => updateDeal.mutateAsync({ status: s }) : undefined}
            disabled={!canEdit || (deal?.status as DealStatus) === s}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
              (deal?.status as DealStatus) === s
                ? 'bg-[var(--fsl-dark-blue)] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
    </Section>
  )
}

// ─── Deal Stage Section ───────────────────────────────────────────────────────

const PHASE_STATUS_LABEL: Record<PhaseStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETE:    'Complete',
}

function DealStageSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: deal }       = useDeal(dealId)
  const updateDeal           = useUpdateDeal(dealId)
  const router               = useRouter()
  const [saving, setSaving]  = useState(false)
  const [error,  setError]   = useState<string | null>(null)

  const phases = useMemo(
    () => [...(deal?.phases ?? [])].sort((a, b) => a.phaseNumber - b.phaseNumber),
    [deal?.phases],
  )

  async function setStage(targetPhaseNum: number) {
    if (!deal || saving) return
    setSaving(true)
    setError(null)
    try {
      for (const phase of phases) {
        const newStatus: PhaseStatus =
          phase.phaseNumber < targetPhaseNum   ? PhaseStatus.COMPLETE     :
          phase.phaseNumber === targetPhaseNum  ? PhaseStatus.IN_PROGRESS  :
                                                  PhaseStatus.NOT_STARTED
        if (phase.status === newStatus) continue
        const res = await fetch(`/api/deals/${dealId}/phases?phaseId=${phase.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ status: newStatus }),
        })
        if (!res.ok) {
          const json = await res.json() as { error?: string }
          throw new Error(json.error ?? `Failed to update phase ${phase.phaseNumber}`)
        }
      }
      // Update Deal.currentPhase and invalidate both ['deals'] and ['deal', dealId] caches
      await updateDeal.mutateAsync({ currentPhase: targetPhaseNum })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update stage')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Deal Stage" description="Set the current DRIVE phase for this deal.">
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => {
          const isActive   = (phase.status as PhaseStatus) === PhaseStatus.IN_PROGRESS
          const isComplete = (phase.status as PhaseStatus) === PhaseStatus.COMPLETE
          return (
            <button
              key={phase.id}
              onClick={canEdit ? () => setStage(phase.phaseNumber) : undefined}
              disabled={!canEdit || saving || isActive}
              title={PHASE_STATUS_LABEL[phase.status as PhaseStatus]}
              className={`flex flex-col items-center rounded-lg border-2 px-4 py-3 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-[var(--fsl-orange)] bg-[var(--fsl-orange)] text-white'
                  : isComplete
                  ? 'border-[var(--fsl-dark-blue)] bg-[var(--fsl-dark-blue)] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--fsl-bright-blue)] hover:bg-blue-50'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="text-lg font-bold leading-none">{phase.phaseNumber}</span>
              <span className="mt-1 w-20 break-words text-center leading-tight">{phase.phaseName}</span>
              {isActive   && <span className="mt-1 text-[10px] opacity-80">Current</span>}
              {isComplete && <span className="mt-1 text-[10px] opacity-80">Done</span>}
            </button>
          )
        })}
      </div>
      {canEdit && (
        <p className="mt-3 text-xs text-gray-400">
          Click a phase to set it as the current active stage. Earlier phases will be marked complete; later phases will be reset.
        </p>
      )}
    </Section>
  )
}

// ─── Workstream Management ────────────────────────────────────────────────────

interface WSFormState {
  code:  string
  name:  string
  description: string
}

function WorkstreamRow({
  ws,
  canEdit,
  onEdit,
  onDelete,
}: {
  ws:       WorkstreamWithOwner
  canEdit:  boolean
  onEdit:   (ws: WorkstreamWithOwner) => void
  onDelete: (ws: WorkstreamWithOwner) => void
}) {
  const updateWS = useUpdateWorkstream(ws.dealId)

  async function toggleActive() {
    await updateWS.mutateAsync({ workstreamId: ws.id, body: { isActive: !ws.isActive } })
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-gray-500">{ws.code}</span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-[var(--fsl-dark-blue)]">{ws.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{ws.fslLead?.name ?? '—'}</td>
      <td className="px-4 py-3">
        <button
          onClick={canEdit ? toggleActive : undefined}
          disabled={!canEdit}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            ws.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          } ${!canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-80'}`}
        >
          {ws.isActive ? <Check className="h-3 w-3" aria-hidden="true" /> : <XIcon className="h-3 w-3" aria-hidden="true" />}
          {ws.isActive ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-4 py-3">
        {canEdit && ws.isCustom && (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(ws)}
              className="rounded px-2 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(ws)}
              className="rounded px-2 py-1 text-xs text-[var(--status-red)] hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
        {ws.isCustom === false && (
          <span className="text-[10px] text-gray-400">DRIVE default</span>
        )}
      </td>
    </tr>
  )
}

function WorkstreamSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: workstreams, isLoading } = useWorkstreams(dealId)
  const createWS = useCreateWorkstream(dealId)
  const deleteWS = useDeleteWorkstream(dealId)

  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState<WorkstreamWithOwner | undefined>()
  const [deleteTarget,setDeleteTarget]= useState<WorkstreamWithOwner | undefined>()
  const [form,        setForm]        = useState<WSFormState>({ code: '', name: '', description: '' })

  function openAdd() {
    setEditTarget(undefined)
    setForm({ code: '', name: '', description: '' })
    setShowForm(true)
  }

  function openEdit(ws: WorkstreamWithOwner) {
    setEditTarget(ws)
    setForm({ code: ws.code, name: ws.name, description: ws.description ?? '' })
    setShowForm(true)
  }

  const updateWS = useUpdateWorkstream(dealId)

  async function handleSave() {
    if (editTarget) {
      await updateWS.mutateAsync({ workstreamId: editTarget.id, body: form })
    } else {
      await createWS.mutateAsync({ ...form, isCustom: true })
    }
    setShowForm(false)
  }

  if (isLoading) return <SkeletonLoader variant="table" rows={4} />

  return (
    <Section title="Workstreams" description="Manage workstreams for this deal. DRIVE framework defaults cannot be deleted.">
      {showForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-[var(--fsl-dark-blue)]">{editTarget ? 'Edit Workstream' : 'New Workstream'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="WS01"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Workstream name"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.code || !form.name}
              className="rounded-md bg-[var(--fsl-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {editTarget ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-md bg-[var(--fsl-dark-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Workstream
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              {['Code', 'Name', 'FSL Lead', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(workstreams ?? []).map((ws) => (
              <WorkstreamRow
                key={ws.id}
                ws={ws}
                canEdit={canEdit}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={async () => {
          if (deleteTarget) await deleteWS.mutateAsync(deleteTarget.id)
          setDeleteTarget(undefined)
        }}
        title="Delete Workstream"
        message={`Delete workstream "${deleteTarget?.name}"? Tasks linked to this workstream will be unlinked.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </Section>
  )
}

// ─── Sensitive Access Section ─────────────────────────────────────────────────

function SensitiveSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: deal } = useDeal(dealId)
  const updateDeal = useUpdateDeal(dealId)

  const isSensitive = deal?.isSensitive ?? false

  return (
    <Section
      title="Data Sensitivity"
      description="Mark this deal as sensitive to restrict access to permitted users only."
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {isSensitive ? 'This deal is marked as sensitive.' : 'This deal is not marked as sensitive.'}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Sensitive deals are only visible to users explicitly granted access.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => updateDeal.mutateAsync({ isSensitive: !isSensitive })}
            disabled={updateDeal.isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isSensitive
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            {isSensitive ? 'Remove Sensitivity' : 'Mark as Sensitive'}
          </button>
        )}
      </div>
    </Section>
  )
}

// ─── Build Team Section ───────────────────────────────────────────────────────

type AddMode = 'none' | 'existing' | 'new'

function BuildTeamSection({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const { data: team = [], isLoading } = useDealTeam(dealId)
  const { data: allUsers = [] }        = useAllUsers()
  const addToTeam    = useAddToTeam(dealId)
  const inviteToTeam = useInviteToTeam(dealId)
  const removeFromTeam = useRemoveFromTeam(dealId)

  const [addMode,     setAddMode]     = useState<AddMode>('none')
  const [removeTarget, setRemoveTarget] = useState<TeamMember | undefined>()
  const [error,       setError]       = useState<string | null>(null)

  // Add existing user
  const [searchQuery,  setSearchQuery]  = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')

  // Invite new user
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '' })
  const [showPwd,    setShowPwd]    = useState(false)

  const filteredUsers = allUsers.filter(u =>
    !team.some(t => t.user.id === u.id) &&
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function resetAdd() {
    setAddMode('none')
    setError(null)
    setSearchQuery('')
    setSelectedUser('')
    setInviteForm({ name: '', email: '', password: '' })
    setShowPwd(false)
  }

  async function handleAddExisting() {
    if (!selectedUser) return
    setError(null)
    try {
      await addToTeam.mutateAsync(selectedUser)
      resetAdd()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member')
    }
  }

  async function handleInvite(ev: React.FormEvent) {
    ev.preventDefault()
    if (!inviteForm.name || !inviteForm.email || inviteForm.password.length < 8) return
    setError(null)
    try {
      await inviteToTeam.mutateAsync(inviteForm)
      resetAdd()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create member')
    }
  }

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase()
  }

  return (
    <Section
      title="Build Team"
      description="Team members here can log into this deal's view and are available as owners in project plan, actions, risks, and decisions."
    >
      {isLoading ? (
        <SkeletonLoader variant="table" rows={3} />
      ) : (
        <>
          {/* Team member list */}
          {team.length === 0 ? (
            <p className="text-sm text-gray-400 italic mb-4">No team members yet. Add people below.</p>
          ) : (
            <div className="mb-4 overflow-hidden rounded-md border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Member', 'Email', 'Access Type', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {team.map(member => (
                    <tr key={member.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-xs font-semibold text-[var(--fsl-orange)]">
                            {getInitials(member.user.name)}
                          </span>
                          <span className="font-medium text-[var(--fsl-dark-blue)]">{member.user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{member.user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          member.user.isDealTeamOnly
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {member.user.isDealTeamOnly ? 'Deal-only access' : 'Global user'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <button
                            onClick={() => setRemoveTarget(member)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Add actions */}
          {canEdit && addMode === 'none' && (
            <div className="flex gap-2">
              <button
                onClick={() => setAddMode('existing')}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Existing User
              </button>
              <button
                onClick={() => setAddMode('new')}
                className="flex items-center gap-1.5 rounded-md bg-[var(--fsl-dark-blue)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Invite New Member
              </button>
            </div>
          )}

          {/* Add existing user panel */}
          {canEdit && addMode === 'existing' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-[var(--fsl-dark-blue)]">Add Existing User</h4>
              <p className="text-xs text-gray-500">Search for a user already in the system.</p>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedUser('') }}
                placeholder="Search by name or email…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                autoFocus
              />
              {searchQuery && filteredUsers.length > 0 && (
                <ul className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                  {filteredUsers.slice(0, 10).map(u => (
                    <li
                      key={u.id}
                      onClick={() => { setSelectedUser(u.id); setSearchQuery(u.name) }}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--fsl-gray)] ${selectedUser === u.id ? 'bg-blue-50 font-medium' : ''}`}
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-xs font-semibold text-[var(--fsl-orange)]">
                        {getInitials(u.name)}
                      </span>
                      <div>
                        <div className="text-[var(--fsl-dark-blue)]">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                      {selectedUser === u.id && <Check className="ml-auto h-4 w-4 text-[var(--fsl-bright-blue)]" aria-hidden="true" />}
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery && filteredUsers.length === 0 && (
                <p className="text-xs text-gray-400 italic">No matching users found.</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={resetAdd} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleAddExisting}
                  disabled={!selectedUser || addToTeam.isPending}
                  className="rounded-md bg-[var(--fsl-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {addToTeam.isPending ? 'Adding…' : 'Add to Team'}
                </button>
              </div>
            </div>
          )}

          {/* Invite new member panel */}
          {canEdit && addMode === 'new' && (
            <form onSubmit={handleInvite} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-[var(--fsl-dark-blue)]">Invite New Member</h4>
              <p className="text-xs text-gray-500">Create a new user with read-only access to this deal.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" aria-hidden="true" />Email Address *</span>
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" aria-hidden="true" />Temporary Password * (min 8 chars)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={resetAdd} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteForm.name || !inviteForm.email || inviteForm.password.length < 8 || inviteToTeam.isPending}
                  className="rounded-md bg-[var(--fsl-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {inviteToTeam.isPending ? 'Creating…' : 'Create & Add to Team'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Remove confirmation */}
      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(undefined)}
        onConfirm={async () => {
          if (removeTarget) await removeFromTeam.mutateAsync(removeTarget.id)
          setRemoveTarget(undefined)
        }}
        title="Remove Team Member"
        message={`Remove ${removeTarget?.user.name ?? 'this person'} from the deal team? They will lose access to this deal's view and will no longer appear in owner pickers for this deal.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </Section>
  )
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone({ dealId, canEdit }: { dealId: string; canEdit: boolean }) {
  const router = useRouter()
  const { data: deal } = useDeal(dealId)
  const updateDeal = useUpdateDeal(dealId)

  const [showConfirm, setShowConfirm] = useState(false)

  if (!canEdit) return null

  const isClosed    = (deal?.status as DealStatus) === DealStatus.CLOSED
  const isOnHold    = (deal?.status as DealStatus) === DealStatus.ON_HOLD
  const isCancelled = (deal?.status as DealStatus) === DealStatus.CANCELLED

  return (
    <Section title="Danger Zone">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--status-red)]" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--status-red)]">Irreversible actions</p>
            <p className="mt-0.5 text-xs text-red-600">These actions affect all users. Proceed with caution.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => updateDeal.mutateAsync({ status: DealStatus.ON_HOLD })}
            disabled={isOnHold || updateDeal.isPending}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            {isOnHold ? 'Deal is On Hold' : 'Put on Hold'}
          </button>
          <button
            onClick={() => updateDeal.mutateAsync({ status: DealStatus.CLOSED })}
            disabled={isClosed || updateDeal.isPending}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            {isClosed ? 'Deal is Closed' : 'Close Deal'}
          </button>
          <button
            onClick={() => updateDeal.mutateAsync({ status: DealStatus.CANCELLED })}
            disabled={isCancelled || updateDeal.isPending}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            {isCancelled ? 'Deal is Cancelled' : 'Cancel Deal'}
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams<{ id: string }>()
  const dealId = params.id
  const { data: session } = useSession()

  const canEdit = session?.user.role !== Role.VIEWER

  return (
    <div className="px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Deal Settings</h1>

      <DealInfoSection    dealId={dealId} canEdit={canEdit} />
      <DealStatusSection  dealId={dealId} canEdit={canEdit} />
      <DealStageSection   dealId={dealId} canEdit={canEdit} />
      <RAGStatusSection   dealId={dealId} canEdit={canEdit} />
      <SensitiveSection   dealId={dealId} canEdit={canEdit} />
      <BuildTeamSection   dealId={dealId} canEdit={canEdit} />
      <WorkstreamSection  dealId={dealId} canEdit={canEdit} />
      <DangerZone         dealId={dealId} canEdit={canEdit} />
    </div>
  )
}
