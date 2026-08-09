'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, List } from 'lucide-react'
import { DealFilter } from './DealFilter'
import { DealCard } from './DealCard'
import { RAGChip } from '@/components/shared/RAGChip'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PhaseStepper } from '@/components/shared/PhaseStepper'
import { DealStatus, RAGStatus } from '@/types'
import { format } from 'date-fns'

interface SerialisedDeal {
  id:                  string
  name:                string
  acquiredCompanyName: string
  status:              DealStatus
  overallRag:          RAGStatus
  currentPhase:        number
  acquisitionDate?:    string | null
  updatedAt?:          string
  projectStartDate?:   string | null
  projectEndDate?:     string | null
  imoLead?:            { id: string; name: string; avatarUrl?: string | null } | null
}

// ─── List row ─────────────────────────────────────────────────────────────────

function DealListRow({ deal }: { deal: SerialisedDeal }) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(`/deals/${deal.id}`)}
      className="cursor-pointer hover:bg-blue-50 transition-colors"
    >
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-[var(--fsl-dark-blue)]">{deal.name}</p>
        <p className="text-[11px] text-gray-400">{deal.acquiredCompanyName}</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={deal.status} />
      </td>
      <td className="px-4 py-3">
        <RAGChip rag={deal.overallRag} />
      </td>
      <td className="px-4 py-3">
        <PhaseStepper current={deal.currentPhase} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {deal.imoLead?.name ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {deal.projectStartDate ? format(new Date(deal.projectStartDate), 'dd MMM yyyy') : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {deal.projectEndDate ? format(new Date(deal.projectEndDate), 'dd MMM yyyy') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-[var(--fsl-bright-blue)] hover:underline">Open →</span>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DealFilterClientProps {
  deals: SerialisedDeal[]
}

export function DealFilterClient({ deals }: DealFilterClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [view, setView]               = useState<'card' | 'list'>('card')

  const visibleDeals =
    selectedIds.length === 0
      ? deals
      : deals.filter((d) => selectedIds.includes(d.id))

  const filterOptions = deals.map((d) => ({ id: d.id, name: d.name }))

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-[var(--fsl-dark-blue)]">
          {visibleDeals.length === deals.length
            ? `All Deals (${deals.length})`
            : `Showing ${visibleDeals.length} of ${deals.length}`}
        </h2>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setView('card')}
              aria-label="Card view"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                view === 'card'
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Cards
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l border-gray-200 ${
                view === 'list'
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              List
            </button>
          </div>

          <DealFilter
            deals={filterOptions}
            selected={selectedIds}
            onChange={setSelectedIds}
          />
        </div>
      </div>

      {/* Content */}
      {visibleDeals.length === 0 ? (
        <EmptyState
          title="No deals found"
          message={
            selectedIds.length > 0
              ? 'No deals match the current filter. Try clearing your selection.'
              : 'There are no active deals yet. Create one to get started.'
          }
          actionLabel={selectedIds.length > 0 ? 'Clear filters' : undefined}
          onAction={selectedIds.length > 0 ? () => setSelectedIds([]) : undefined}
        />
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                {['Deal', 'Status', 'RAG', 'Phase', 'IMO Lead', 'Start Date', 'End Date', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleDeals.map((deal) => (
                <DealListRow key={deal.id} deal={deal} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
