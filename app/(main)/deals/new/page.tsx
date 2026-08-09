'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCreateDeal } from '@/hooks/useDeals'
import { useAllUsers, useQuickCreateUser } from '@/hooks/useResources'
import { UserCombobox } from '@/components/ui/UserCombobox'
import { DealStatus, Role } from '@/types'
import type { CreateDealInput } from '@/hooks/useDeals'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'PRE_CLOSE', label: 'Pre-Close' },
  { value: 'ACTIVE',    label: 'Active'    },
  { value: 'ON_HOLD',   label: 'On Hold'   },
  { value: 'CLOSED',    label: 'Closed'    },
]

const SECTOR_OPTIONS = [
  'Healthcare BPO',
  'Banking & Financial Services',
  'Insurance',
  'Telecom & Media',
  'Retail & Consumer',
  'Technology',
  'Other',
]

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--fsl-bright-blue)]'

const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewDealPage() {
  const router            = useRouter()
  const { data: session } = useSession()
  const createDeal        = useCreateDeal()

  const [form, setForm] = useState<CreateDealInput & { acquisitionDateLocal?: string }>({
    name:                    '',
    acquiredCompanyName:     '',
    sector:                  '',
    description:             '',
    status:                  DealStatus.PRE_CLOSE,
    isSensitive:             false,
    imoLeadId:               undefined,
    execSponsorId:           undefined,
    acquisitionDate:         undefined,
    revenueSynergyTargetUSD: undefined,
    costSynergyTargetUSD:    undefined,
  })

  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers()
  const quickCreate = useQuickCreateUser()
  const [error, setError] = useState<string | null>(null)

  if (session && session.user.role === Role.VIEWER) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-gray-500">You do not have permission to create deals.</p>
        <Link href="/deals" className="mt-4 inline-block text-sm text-[var(--fsl-bright-blue)] hover:underline">
          ← Back to Deals
        </Link>
      </div>
    )
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Convert local date string (YYYY-MM-DD) to ISO datetime for the API
    const payload: CreateDealInput = {
      name:                    form.name,
      acquiredCompanyName:     form.acquiredCompanyName,
      sector:                  form.sector || undefined,
      description:             form.description || undefined,
      status:                  form.status,
      isSensitive:             form.isSensitive,
      imoLeadId:               form.imoLeadId   || undefined,
      execSponsorId:           form.execSponsorId || undefined,
      acquisitionDate:         form.acquisitionDateLocal
                                 ? `${form.acquisitionDateLocal}T00:00:00.000Z`
                                 : undefined,
      revenueSynergyTargetUSD: form.revenueSynergyTargetUSD,
      costSynergyTargetUSD:    form.costSynergyTargetUSD,
    }

    try {
      const deal = await createDeal.mutateAsync(payload)
      router.push(`/deals/${deal.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Back link */}
      <Link
        href="/deals"
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--fsl-dark-blue)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Deals
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--fsl-dark-blue)]">New Deal</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Creates the deal with 6 DRIVE phases, 5 workstreams, and a default task tree.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">

            {/* ── Deal Details ─────────────────────────────────────── */}
            <Section title="Deal Details" />

            {/* Deal Name — full width */}
            <div className="col-span-2">
              <label className={labelCls}>
                Deal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Acumen Healthcare BPO Acquisition"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Acquired Company — full width */}
            <div className="col-span-2">
              <label className={labelCls}>
                Acquired Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Acumen Healthcare BPO Ltd"
                value={form.acquiredCompanyName}
                onChange={(e) => setField('acquiredCompanyName', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Sector */}
            <div>
              <label className={labelCls}>Sector</label>
              <select
                value={form.sector ?? ''}
                onChange={(e) => setField('sector', e.target.value)}
                className={inputCls}
              >
                <option value="">— Select sector —</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value as DealStatus)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Acquisition Date */}
            <div>
              <label className={labelCls}>Acquisition Date</label>
              <input
                type="date"
                value={form.acquisitionDateLocal ?? ''}
                onChange={(e) => setField('acquisitionDateLocal', e.target.value || undefined)}
                className={inputCls}
              />
            </div>

            {/* Spacer so date is on the left */}
            <div />

            {/* ── People ───────────────────────────────────────────── */}
            <Section title="People" />

            {/* IMO Lead */}
            <div>
              <label className={labelCls}>IMO Lead</label>
              <UserCombobox
                users={allUsers}
                value={form.imoLeadId ?? ''}
                onChange={(id) => setField('imoLeadId', id || undefined)}
                onCreateNew={(name) => quickCreate.mutateAsync(name)}
                placeholder={usersLoading ? 'Loading…' : 'Search or type a name…'}
                disabled={usersLoading}
                className="w-full"
              />
            </div>

            {/* Exec Sponsor */}
            <div>
              <label className={labelCls}>Executive Sponsor</label>
              <UserCombobox
                users={allUsers}
                value={form.execSponsorId ?? ''}
                onChange={(id) => setField('execSponsorId', id || undefined)}
                onCreateNew={(name) => quickCreate.mutateAsync(name)}
                placeholder={usersLoading ? 'Loading…' : 'Search or type a name…'}
                disabled={usersLoading}
                className="w-full"
              />
            </div>

            {/* ── Synergy Targets ──────────────────────────────────── */}
            <Section title="Synergy Targets (USD)" />

            {/* Revenue Synergy Target */}
            <div>
              <label className={labelCls}>Revenue Synergy Target ($)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={form.revenueSynergyTargetUSD ?? ''}
                  onChange={(e) =>
                    setField(
                      'revenueSynergyTargetUSD',
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className={`${inputCls} pl-7`}
                />
              </div>
            </div>

            {/* Cost Synergy Target */}
            <div>
              <label className={labelCls}>Cost Synergy Target ($)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={form.costSynergyTargetUSD ?? ''}
                  onChange={(e) =>
                    setField(
                      'costSynergyTargetUSD',
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className={`${inputCls} pl-7`}
                />
              </div>
            </div>

            {/* ── Additional ───────────────────────────────────────── */}
            <Section title="Additional" />

            {/* Description — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="Brief description of the deal…"
                value={form.description ?? ''}
                onChange={(e) => setField('description', e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Sensitive flag — full width */}
            <div className="col-span-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isSensitive ?? false}
                  onChange={(e) => setField('isSensitive', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--fsl-orange)]"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-700">Mark as sensitive</span>
                  <span className="block text-xs text-gray-400">Restricts visibility to named users only</span>
                </span>
              </label>
            </div>

          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Link
              href="/deals"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createDeal.isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {createDeal.isPending ? 'Creating…' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
