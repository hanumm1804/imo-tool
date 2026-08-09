'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ChevronLeft, Pencil } from 'lucide-react'
import { RAGChip } from '@/components/shared/RAGChip'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DealStatus, RAGStatus, Role } from '@/types'

interface DealHeaderDeal {
  id:                   string
  name:                 string
  acquiredCompanyName:  string
  status:               DealStatus
  overallRag:           RAGStatus
  currentPhase:         number
}

interface DealPageHeaderProps {
  deal:     DealHeaderDeal
  onEdit?:  () => void
}

const PHASE_COUNT = 6

function PhaseIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Phase ${current} of ${PHASE_COUNT}`}>
      {Array.from({ length: PHASE_COUNT }).map((_, i) => {
        const phase = i + 1
        const state =
          phase < current  ? 'complete' :
          phase === current ? 'active'   : 'future'

        const dotClass =
          state === 'active'   ? 'bg-[var(--fsl-orange)] ring-2 ring-[var(--fsl-orange)]/30' :
          state === 'complete' ? 'bg-[var(--fsl-dark-blue)]' :
                                  'bg-gray-300'

        return (
          <span
            key={phase}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${dotClass}`}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}

export function DealPageHeader({ deal, onEdit }: DealPageHeaderProps) {
  const { data: session } = useSession()
  const role = session?.user?.role as Role | undefined

  const canEdit = role === 'ADMIN' || role === 'IMO_LEAD'

  return (
    <header className="sticky top-14 z-40 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Back link */}
        <Link
          href="/deals"
          className="flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-[var(--fsl-dark-blue)]"
          aria-label="Back to Deals"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Deals</span>
        </Link>

        {/* Separator */}
        <span className="text-gray-300" aria-hidden="true">/</span>

        {/* Deal info */}
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <h1 className="truncate text-base font-bold text-[var(--fsl-dark-blue)]">
            {deal.name}
          </h1>

          {deal.acquiredCompanyName && (
            <>
              <span className="text-gray-300" aria-hidden="true">·</span>
              <span className="truncate text-sm text-gray-500">
                {deal.acquiredCompanyName}
              </span>
            </>
          )}

          <StatusBadge status={deal.status} />
          <RAGChip rag={deal.overallRag} />

          <div className="flex items-center gap-1.5">
            <PhaseIndicator current={deal.currentPhase} />
            <span className="text-xs text-gray-500">
              Phase {deal.currentPhase}
            </span>
          </div>
        </div>

        {/* Edit button */}
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[var(--fsl-dark-blue)] transition-colors hover:bg-[var(--fsl-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)] focus:ring-offset-1"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Edit deal: </span>
            Edit
          </button>
        )}
      </div>
    </header>
  )
}
