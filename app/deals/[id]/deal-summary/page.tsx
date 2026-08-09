'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { format } from 'date-fns'
import {
  CheckCircle, Edit2, Lock, Save, ExternalLink, Unlock,
} from 'lucide-react'
import {
  useDealCharter, useUpdateCharter, useSignoffCharter, useUnlockCharter,
  useDealNarrative, useUpdateNarrative,
} from '@/hooks/useDeal'
import { useLenses, useUpdateLens } from '@/hooks/useLenses'
import { useSynergyLines } from '@/hooks/useSynergy'
import { useHeadcount } from '@/hooks/useHeadcount'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LensStatus, Role } from '@/types'
import Link from 'next/link'
import type { IntegrationCharter } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(v)) return '—'
  return '$' + (v / 1_000_000).toFixed(2) + 'M'
}

// ─── Charter Section ─────────────────────────────────────────────────────────

type CharterDraft = {
  revenueSynergyTargetUSD: string
  costSynergyTargetUSD:    string
  ebitdaTarget12m:         string
  ebitdaTarget24m:         string
  valueRealisationLead:    string
  techLead:                string
  changeCommsLead:         string
  execSteerCoCadence:      string
  workingSteerCoCadence:   string
  integrationPrinciples:   string
}

function draftFromCharter(c: IntegrationCharter | null): CharterDraft {
  return {
    revenueSynergyTargetUSD: c?.revenueSynergyTargetUSD?.toString() ?? '',
    costSynergyTargetUSD:    c?.costSynergyTargetUSD?.toString()    ?? '',
    ebitdaTarget12m:         c?.ebitdaTarget12m?.toString()         ?? '',
    ebitdaTarget24m:         c?.ebitdaTarget24m?.toString()         ?? '',
    valueRealisationLead:    c?.valueRealisationLead                ?? '',
    techLead:                c?.techLead                            ?? '',
    changeCommsLead:         c?.changeCommsLead                     ?? '',
    execSteerCoCadence:      c?.execSteerCoCadence                  ?? '',
    workingSteerCoCadence:   c?.workingSteerCoCadence               ?? '',
    integrationPrinciples:   c?.integrationPrinciples               ?? '',
  }
}

function CharterSection({ dealId }: { dealId: string }) {
  const { data: session }            = useSession()
  const { data: charter, isLoading } = useDealCharter(dealId)
  const updateCharter                = useUpdateCharter(dealId)
  const signoffCharter               = useSignoffCharter(dealId)
  const unlockCharter                = useUnlockCharter(dealId)

  const [draft,        setDraft]        = useState<CharterDraft>(draftFromCharter(null))
  const [editMode,     setEditMode]     = useState(false)
  const [showSignoff,  setShowSignoff]  = useState(false)
  const [showOverride, setShowOverride] = useState(false)

  const canEdit     = session?.user.role !== Role.VIEWER
  const isAdmin     = session?.user.role === Role.ADMIN
  const isSignedOff = charter?.isComplete ?? false

  useEffect(() => {
    if (charter) setDraft(draftFromCharter(charter))
  }, [charter])

  // Auto-open edit mode when no charter exists yet
  useEffect(() => {
    if (!isLoading && charter === null && canEdit) setEditMode(true)
  }, [isLoading, charter, canEdit])

  function setField(key: keyof CharterDraft, val: string) {
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    await updateCharter.mutateAsync({
      revenueSynergyTargetUSD: draft.revenueSynergyTargetUSD ? parseFloat(draft.revenueSynergyTargetUSD) : null,
      costSynergyTargetUSD:    draft.costSynergyTargetUSD    ? parseFloat(draft.costSynergyTargetUSD)    : null,
      ebitdaTarget12m:         draft.ebitdaTarget12m         ? parseFloat(draft.ebitdaTarget12m)         : null,
      ebitdaTarget24m:         draft.ebitdaTarget24m         ? parseFloat(draft.ebitdaTarget24m)         : null,
      valueRealisationLead:    draft.valueRealisationLead    || null,
      techLead:                draft.techLead                || null,
      changeCommsLead:         draft.changeCommsLead         || null,
      execSteerCoCadence:      draft.execSteerCoCadence      || null,
      workingSteerCoCadence:   draft.workingSteerCoCadence   || null,
      integrationPrinciples:   draft.integrationPrinciples   || null,
    })
    setEditMode(false)
  }

  if (isLoading) return <SkeletonLoader variant="text" rows={6} />

  return (
    <section aria-labelledby="charter-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id="charter-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Integration Charter
        </h2>
        <div className="flex items-center gap-2">
          {isSignedOff && (
            <>
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Signed Off
                {charter?.signedOffBy && (
                  <span className="font-normal">
                    {' '}by {charter.signedOffBy}
                    {charter.signedOffAt && ' on ' + format(new Date(charter.signedOffAt), 'dd MMM yyyy')}
                  </span>
                )}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowOverride(true)}
                  className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                  Override
                </button>
              )}
            </>
          )}
          {canEdit && !isSignedOff && (
            <>
              {editMode ? (
                <>
                  {charter && (
                    <button
                      onClick={() => { setDraft(draftFromCharter(charter)); setEditMode(false) }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={updateCharter.isPending}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--fsl-dark-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    {updateCharter.isPending ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
              )}
              {charter && !editMode && (
                <button
                  onClick={() => setShowSignoff(true)}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--fsl-orange)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign Off
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!charter && !canEdit ? (
        <div className="px-6 py-8 text-center text-sm text-gray-400">
          No charter created yet.
        </div>
      ) : (
        <div className="space-y-5 px-6 py-5">
          {/* Synergy Targets */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Synergy Targets</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { key: 'revenueSynergyTargetUSD' as const, label: 'Revenue Synergy' },
                { key: 'costSynergyTargetUSD'    as const, label: 'Cost Synergy'    },
                { key: 'ebitdaTarget12m'         as const, label: 'EBITDA 12m'      },
                { key: 'ebitdaTarget24m'         as const, label: 'EBITDA 24m'      },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-gray-400">{label}</p>
                  {editMode ? (
                    <input
                      type="number"
                      value={draft[key]}
                      onChange={e => setField(key, e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-[var(--fsl-dark-blue)]">
                      {fmt(charter?.[key])}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leadership */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Programme Leadership</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: 'valueRealisationLead' as const, label: 'Value Realisation Lead' },
                { key: 'techLead'             as const, label: 'Tech Lead'               },
                { key: 'changeCommsLead'      as const, label: 'Change & Comms Lead'     },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-gray-400">{label}</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={draft[key]}
                      onChange={e => setField(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}…`}
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-700">{charter?.[key] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Governance Cadences */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Governance Cadences</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: 'execSteerCoCadence'    as const, label: 'Exec SteerCo'    },
                { key: 'workingSteerCoCadence' as const, label: 'Working SteerCo' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-gray-400">{label}</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={draft[key]}
                      onChange={e => setField(key, e.target.value)}
                      placeholder="e.g. Fortnightly"
                      className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-700">{charter?.[key] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Integration Principles */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Integration Principles</p>
            {editMode ? (
              <textarea
                value={draft.integrationPrinciples}
                onChange={e => setField('integrationPrinciples', e.target.value)}
                rows={4}
                placeholder="List the guiding principles for this integration…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              />
            ) : (
              <p className="whitespace-pre-line text-sm text-gray-700">
                {charter?.integrationPrinciples || '—'}
              </p>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showSignoff}
        onClose={() => setShowSignoff(false)}
        onConfirm={async () => {
          await signoffCharter.mutateAsync()
          setShowSignoff(false)
        }}
        title="Sign Off Charter"
        message="This will mark the Integration Charter as complete and lock it from further edits. This action cannot be undone."
        confirmLabel="Sign Off"
        confirmVariant="primary"
      />

      <ConfirmModal
        isOpen={showOverride}
        onClose={() => setShowOverride(false)}
        onConfirm={async () => {
          await unlockCharter.mutateAsync()
          setShowOverride(false)
          setEditMode(true)
        }}
        title="Override Charter Sign-Off"
        message="This will remove the sign-off and reopen the charter for editing. The previous sign-off record will be cleared. This action is logged."
        confirmLabel="Override"
        confirmVariant="danger"
      />
    </section>
  )
}

// ─── TipTap Field ─────────────────────────────────────────────────────────────

function TipTapField({
  value, onChange, placeholder, readOnly,
}: {
  value:       string
  onChange:    (html: string) => void
  placeholder?: string
  readOnly:    boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content:  value,
    editable: !readOnly,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  })

  return (
    <div
      className={`min-h-[140px] rounded-md border bg-white px-4 py-3 text-sm prose prose-sm max-w-none ${
        readOnly
          ? 'border-gray-100 text-gray-600'
          : 'border-gray-300 focus-within:border-[var(--fsl-bright-blue)] focus-within:ring-1 focus-within:ring-[var(--fsl-bright-blue)]'
      }`}
    >
      <EditorContent editor={editor} />
    </div>
  )
}

// ─── Narrative Section ────────────────────────────────────────────────────────

function NarrativeSection({
  dealId, title, fieldKey, placeholder,
}: {
  dealId:      string
  title:       string
  fieldKey:    'valuationAndDealStructure' | 'dueDiligence'
  placeholder: string
}) {
  const { data: session }                 = useSession()
  const { data: narrative, isLoading }    = useDealNarrative(dealId)
  const updateNarrative                   = useUpdateNarrative(dealId)

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const readOnly = session?.user.role === Role.VIEWER

  const handleChange = useCallback((html: string) => {
    if (readOnly) return
    updateNarrative.debouncedMutate({ fieldKey, content: html })
    setLastSaved(new Date())
  }, [fieldKey, readOnly, updateNarrative])

  if (isLoading) return <SkeletonLoader variant="text" rows={5} />

  return (
    <section aria-labelledby={`${fieldKey}-heading`} className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id={`${fieldKey}-heading`} className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          {title}
        </h2>
        {lastSaved && !readOnly && (
          <span className="text-xs text-gray-400">Saved {format(lastSaved, 'HH:mm:ss')}</span>
        )}
      </div>
      <div className="px-6 py-5">
        <TipTapField
          value={narrative?.[fieldKey] ?? ''}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      </div>
    </section>
  )
}

// ─── Lenses Section ───────────────────────────────────────────────────────────

const LENS_STATUS_STYLES: Record<string, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  TBD:  'bg-gray-100 text-gray-600',
}

function LensesSection({ dealId }: { dealId: string }) {
  const { data: session }           = useSession()
  const { data: lenses, isLoading } = useLenses(dealId)
  const updateLens                  = useUpdateLens(dealId)

  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [editStatus,     setEditStatus]     = useState<string>('TBD')
  const [editNotes,      setEditNotes]      = useState('')
  const [editBenchmarks, setEditBenchmarks] = useState('')

  const canEdit = session?.user.role !== Role.VIEWER

  if (isLoading) return <SkeletonLoader variant="table" rows={7} />

  async function handleSaveLens(lensId: string) {
    await updateLens.mutateAsync({
      lensId,
      body: {
        status:     editStatus as LensStatus,
        notes:      editNotes      || null,
        benchmarks: editBenchmarks || undefined,
      },
    })
    setEditingId(null)
  }

  return (
    <section aria-labelledby="lenses-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 id="lenses-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Pre-Acquisition Intelligence — 7 Lenses
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {(lenses ?? []).map((lens, idx) => {
          const isEditing = editingId === lens.id
          return (
            <div key={lens.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--fsl-dark-blue)]">{lens.lensName}</p>
                    <p className="mt-0.5 text-xs italic text-gray-400">{lens.benchmarks}</p>
                    {lens.notes && !isEditing && (
                      <p className="mt-1 text-sm text-gray-600">{lens.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LENS_STATUS_STYLES[lens.status] ?? ''}`}>
                    {lens.status}
                  </span>
                  {canEdit && !isEditing && (
                    <button
                      onClick={() => {
                        setEditingId(lens.id)
                        setEditStatus(lens.status)
                        setEditNotes(lens.notes ?? '')
                        setEditBenchmarks(lens.benchmarks ?? '')
                      }}
                      className="rounded-md border border-gray-300 p-1 text-gray-600 hover:bg-gray-50"
                    >
                      <Edit2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 ml-10 space-y-3 rounded-md border border-gray-200 p-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    >
                      <option value="TBD">TBD</option>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">KPI &amp; Thresholds</label>
                    <textarea
                      value={editBenchmarks}
                      onChange={e => setEditBenchmarks(e.target.value)}
                      rows={3}
                      placeholder="Enter KPIs and thresholds for this lens…"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveLens(lens.id)}
                      disabled={updateLens.isPending}
                      className="rounded-md bg-[var(--fsl-dark-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Synergy Snapshot ─────────────────────────────────────────────────────────

function SynergySnapshot({ dealId }: { dealId: string }) {
  const { data: lines, isLoading } = useSynergyLines(dealId)

  if (isLoading) return <SkeletonLoader variant="card" />

  const baseline  = (lines ?? []).reduce((s, l) => s + (Number(l.baselineUSD)  || 0), 0)
  const committed = (lines ?? []).reduce((s, l) => s + (Number(l.committedUSD) || 0), 0)
  const realised  = (lines ?? []).reduce((s, l) => s + (Number(l.realisedUSD)  || 0), 0)

  return (
    <section aria-labelledby="synergy-snapshot-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id="synergy-snapshot-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Synergy Snapshot
        </h2>
        <Link
          href={`/deals/${dealId}/synergy-tracker`}
          className="flex items-center gap-1 text-sm text-[var(--fsl-bright-blue)] hover:underline"
        >
          View Full Tracker
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 py-4">
        {[
          { label: 'Baseline',  value: baseline,  color: 'text-[var(--fsl-dark-blue)]' },
          { label: 'Committed', value: committed, color: 'text-[var(--fsl-orange)]'     },
          { label: 'Realised',  value: realised,  color: 'text-[var(--status-green)]'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-8 py-2 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>
              ${(value / 1_000_000).toFixed(1)}M
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Headcount Snapshot ───────────────────────────────────────────────────────

function HeadcountSnapshot({ dealId }: { dealId: string }) {
  const { data: hcData, isLoading } = useHeadcount(dealId)

  if (isLoading) return <SkeletonLoader variant="card" />

  const lines       = hcData?.lines ?? []
  const totalHC     = lines.reduce((s, l) => s + l.headcountReduced, 0)
  const totalPeople = lines.reduce((s, l) => s + l.peopleExpenseUSD, 0)
  const totalOther  = lines.reduce((s, l) => s + l.otherExpenseUSD,  0)
  const totalCost   = totalPeople + totalOther
  const peoplePct   = totalCost > 0 ? Math.round((totalPeople / totalCost) * 100) : 0
  const otherPct    = totalCost > 0 ? Math.round((totalOther  / totalCost) * 100) : 0

  function fmtCost(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`
    return `$${Math.round(n).toLocaleString()}`
  }

  return (
    <section aria-labelledby="hc-snapshot-heading" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 id="hc-snapshot-heading" className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
          Headcount Reduction Snapshot
        </h2>
        <Link
          href={`/deals/${dealId}/synergy-tracker`}
          className="flex items-center gap-1 text-sm text-[var(--fsl-bright-blue)] hover:underline"
        >
          View Headcount Tab
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4 py-4">
        {[
          { label: 'Headcount Reduced', value: String(totalHC) + ' FTEs',      color: 'text-[var(--fsl-dark-blue)]', sub: undefined },
          { label: 'True Cost Reduction', value: fmtCost(totalCost),            color: 'text-[var(--fsl-dark-blue)]', sub: 'People + Other' },
          { label: 'People Expense',     value: fmtCost(totalPeople),           color: 'text-[var(--fsl-bright-blue)]', sub: `${peoplePct}% of total` },
          { label: 'Other Cost',         value: fmtCost(totalOther),            color: 'text-[var(--status-green)]',   sub: `${otherPct}% of total` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="px-6 py-2 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
          </div>
        ))}
      </div>
      {lines.length === 0 && (
        <div className="px-6 pb-4 text-center text-xs text-gray-400">
          No headcount data recorded yet.
        </div>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealSummaryPage() {
  const params = useParams<{ id: string }>()
  const dealId = params.id

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-6">
      <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Deal Summary</h1>

      <CharterSection dealId={dealId} />

      <NarrativeSection
        dealId={dealId}
        title="Valuation &amp; Deal Structure"
        fieldKey="valuationAndDealStructure"
        placeholder="Describe the valuation methodology and deal structure…"
      />

      <NarrativeSection
        dealId={dealId}
        title="Due Diligence"
        fieldKey="dueDiligence"
        placeholder="Summarise due diligence findings and key risks identified…"
      />

      <LensesSection dealId={dealId} />

      <SynergySnapshot dealId={dealId} />

      <HeadcountSnapshot dealId={dealId} />
    </div>
  )
}
