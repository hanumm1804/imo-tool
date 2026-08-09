'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

interface EscalationBannerProps {
  redDealCount: number
}

export function EscalationBanner({ redDealCount }: EscalationBannerProps) {
  if (redDealCount === 0) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-lg bg-[var(--status-red)] px-5 py-3 text-white shadow-md"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className="h-5 w-5 flex-shrink-0"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">
          {redDealCount}{' '}
          {redDealCount === 1 ? 'deal has' : 'deals have'} RED workstreams requiring
          immediate attention
        </span>
      </div>

      <Link
        href="/?rag=RED"
        className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        View RED deals
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Filter deals by RED status</span>
      </Link>
    </div>
  )
}
