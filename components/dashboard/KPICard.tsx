import { ReactNode } from 'react'

interface KPICardProps {
  title:     string
  value:     string | number
  subtitle?: string
  icon:      ReactNode
  variant?:  'default' | 'danger' | 'warning'
}

const VARIANT_CONFIG = {
  default: {
    border:     '',
    valueColor: 'text-[var(--fsl-dark-blue)]',
  },
  danger: {
    border:     'border-l-4 border-l-[var(--status-red)]',
    valueColor: 'text-[var(--status-red)]',
  },
  warning: {
    border:     'border-l-4 border-l-[var(--status-amber)]',
    valueColor: 'text-[var(--status-amber)]',
  },
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}: KPICardProps) {
  const cfg = VARIANT_CONFIG[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${cfg.border}`}
    >
      {/* Icon — top right */}
      <div
        className="absolute right-4 top-4 text-[var(--fsl-dark-blue)] opacity-20"
        aria-hidden="true"
      >
        {icon}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className={`mt-1 text-3xl font-bold leading-none ${cfg.valueColor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  )
}
