import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title:     string
  subtitle?: string
  actions?:  ReactNode
  backHref?: string
}

export function PageHeader({ title, subtitle, actions, backHref }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[var(--fsl-dark-blue)]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </Link>
        )}

        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[var(--fsl-dark-blue)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-shrink-0 items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}
