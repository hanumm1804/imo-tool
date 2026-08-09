'use client'

import { useRouter } from 'next/navigation'
import { RAGChip } from '@/components/shared/RAGChip'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PhaseStepper } from '@/components/shared/PhaseStepper'
import { DealStatus, RAGStatus } from '@/types'

interface DealCardDeal {
  id:                  string
  name:                string
  acquiredCompanyName: string
  status:              DealStatus
  overallRag:          RAGStatus
  currentPhase:        number
  acquisitionDate?:    string | null
  updatedAt?:          string
  imoLead?:            { id: string; name: string; avatarUrl?: string | null } | null
}

interface DealCardProps {
  deal: DealCardDeal
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last  = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}


export function DealCard({ deal }: DealCardProps) {
  const router = useRouter()

  function handleClick() {
    router.push(`/deals/${deal.id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Deal: ${deal.name} — ${deal.acquiredCompanyName}`}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-100 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fsl-bright-blue)] focus-visible:ring-offset-1"
    >
      {/* Top row: Name + Status + RAG */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[var(--fsl-dark-blue)]">
            {deal.name}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-gray-400">
            {deal.acquiredCompanyName}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={deal.status} />
          <RAGChip rag={deal.overallRag} />
        </div>
      </div>

      {/* Phase stepper */}
      <div className="mt-4">
        <PhaseStepper current={deal.currentPhase} />
      </div>

      {/* IMO Lead */}
      {deal.imoLead && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
          <span
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-[10px] font-bold text-[var(--fsl-orange)]"
            aria-hidden="true"
          >
            {getInitials(deal.imoLead.name)}
          </span>
          <span className="text-[12px] text-gray-500">
            <span className="font-medium text-gray-700">{deal.imoLead.name}</span>
            {' '}· IMO Lead
          </span>
        </div>
      )}
    </article>
  )
}
