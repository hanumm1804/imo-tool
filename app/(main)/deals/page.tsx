'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Fuse from 'fuse.js'
import {
  Search, SlidersHorizontal, Plus, ChevronDown, ArrowUpDown,
  Briefcase, Calendar, AlertTriangle,
} from 'lucide-react'
import { useDeals } from '@/hooks/useDeals'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { RAGChip } from '@/components/shared/RAGChip'
import { PhaseStepper } from '@/components/shared/PhaseStepper'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { DealStatus, RAGStatus, Role } from '@/types'
import type { DealListItem } from '@/hooks/useDeals'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string }> = {
  PRE_CLOSE:  { label: 'Pre-Close',  color: 'bg-purple-100 text-purple-700' },
  ACTIVE:     { label: 'Active',     color: 'bg-green-100  text-green-700'  },
  ON_HOLD:    { label: 'On Hold',    color: 'bg-amber-100  text-amber-700'  },
  CLOSED:     { label: 'Closed',     color: 'bg-gray-100   text-gray-600'   },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-rose-100   text-rose-700'   },
}

// ─── Sort options ─────────────────────────────────────────────────────────────

type SortKey = 'name' | 'createdAt' | 'updatedAt' | 'overallRag'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name',      label: 'Name (A–Z)'     },
  { key: 'createdAt', label: 'Newest First'   },
  { key: 'updatedAt', label: 'Recently Updated' },
  { key: 'overallRag', label: 'RAG Status'    },
]

const RAG_ORDER: Record<RAGStatus, number> = {
  RED: 0, AMBER: 1, GREEN: 2, GRAY: 3,
}

// ─── Deal Table ───────────────────────────────────────────────────────────────

function DealTable({ deals }: { deals: DealListItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-[var(--fsl-dark-blue)] text-white">
          <tr>
            {['Deal', 'Sector', 'Status', 'RAG', 'Phase', 'Start Date', 'End Date', 'Tasks', 'Resources', 'Last Updated', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {deals.map((deal, idx) => {
            const cfg = STATUS_CONFIG[deal.status]
            return (
              <tr
                key={deal.id}
                className={`${idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'} hover:bg-blue-50 transition-colors`}
              >
                <td className="px-4 py-3">
                  <Link href={`/deals/${deal.id}`} className="group">
                    <p className="text-sm font-semibold text-[var(--fsl-dark-blue)] group-hover:underline">{deal.name}</p>
                    <p className="text-[10px] text-gray-400">{deal.acquiredCompanyName}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal.sector || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3"><RAGChip rag={deal.overallRag} /></td>
                <td className="px-4 py-3">
                  <PhaseStepper current={deal.currentPhase} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {deal.projectStartDate ? format(new Date(deal.projectStartDate), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {deal.projectEndDate ? format(new Date(deal.projectEndDate), 'dd MMM yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal._count.tasks}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{deal._count.resourceAllocations}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {format(new Date(deal.updatedAt), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="rounded-md border border-gray-200 px-3 py-1 text-xs text-[var(--fsl-dark-blue)] hover:bg-blue-50"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const { data: session } = useSession()
  const router            = useRouter()
  const canEdit = session?.user.role !== Role.VIEWER

  const { data: allDeals, isLoading } = useDeals()

  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<DealStatus | 'ALL'>('ALL')
  const [sortKey,       setSortKey]       = useState<SortKey>('updatedAt')
  const [showSortMenu,  setShowSortMenu]  = useState(false)

  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Close sort dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Fuse.js search
  const fuse = useMemo(() => {
    if (!allDeals) return null
    return new Fuse(allDeals, {
      keys:          ['name', 'acquiredCompanyName', 'sector', 'description'],
      threshold:     0.35,
      includeScore:  true,
    })
  }, [allDeals])

  const filtered = useMemo(() => {
    let items = allDeals ?? []

    // Status filter
    if (statusFilter !== 'ALL') {
      items = items.filter((d) => d.status === statusFilter)
    }

    // Fuse search
    if (search.trim() && fuse) {
      items = fuse.search(search.trim()).map((r) => r.item)
    }

    // Sort (only when no search — fuse already ranks)
    if (!search.trim()) {
      items = [...items].sort((a, b) => {
        if (sortKey === 'name')      return a.name.localeCompare(b.name)
        if (sortKey === 'overallRag') return RAG_ORDER[a.overallRag] - RAG_ORDER[b.overallRag]
        if (sortKey === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        // updatedAt default
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }

    return items
  }, [allDeals, search, statusFilter, sortKey, fuse])

  // Summary stats
  const stats = useMemo(() => {
    const all = allDeals ?? []
    return {
      total:   all.length,
      active:  all.filter((d) => d.status === DealStatus.ACTIVE).length,
      red:     all.filter((d) => d.overallRag === RAGStatus.RED).length,
      onHold:  all.filter((d) => d.status === DealStatus.ON_HOLD).length,
    }
  }, [allDeals])

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" rows={6} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Deals</h1>
          <p className="mt-0.5 text-sm text-gray-500">{stats.total} deal{stats.total !== 1 ? 's' : ''} total</p>
        </div>
        {canEdit && (
          <Link
            href="/deals/new"
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Deal
          </Link>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Briefcase,     label: 'Total Deals', value: stats.total,  color: '' },
          { icon: ArrowUpDown,   label: 'Active',      value: stats.active, color: 'text-[var(--fsl-orange)]' },
          { icon: AlertTriangle, label: 'Red RAG',     value: stats.red,    color: 'text-[var(--status-red)]' },
          { icon: Calendar,      label: 'On Hold',     value: stats.onHold, color: 'text-gray-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <Icon className={`h-5 w-5 flex-shrink-0 ${color || 'text-[var(--fsl-dark-blue)]'}`} aria-hidden="true" />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-[var(--fsl-dark-blue)]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & sort bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search deals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...Object.keys(STATUS_CONFIG)] as Array<DealStatus | 'ALL'>).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s as DealStatus].label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative ml-auto" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu((v) => !v)}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Sort: {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSortKey(opt.key); setShowSortMenu(false) }}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 ${
                    sortKey === opt.key ? 'font-semibold text-[var(--fsl-dark-blue)]' : 'text-gray-700'
                  }`}
                >
                  {sortKey === opt.key && <span className="h-1.5 w-1.5 rounded-full bg-[var(--fsl-dark-blue)]" />}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      {(search || statusFilter !== 'ALL') && (
        <p className="text-xs text-gray-500">
          Showing {filtered.length} of {(allDeals ?? []).length} deal{(allDeals ?? []).length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== 'ALL' ? 'No deals match your filters' : 'No deals yet'}
          message={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Create your first deal to get started.'}
          actionLabel={canEdit && !search && statusFilter === 'ALL' ? '+ New Deal' : undefined}
          onAction={canEdit && !search && statusFilter === 'ALL' ? () => router.push('/deals/new') : undefined}
        />
      ) : (
        <DealTable deals={filtered} />
      )}

    </div>
  )
}
