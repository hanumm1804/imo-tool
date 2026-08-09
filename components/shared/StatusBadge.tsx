import { DealStatus } from '@/types'

interface StatusBadgeProps {
  status: DealStatus
}

const STATUS_CONFIG: Record<
  DealStatus,
  { classes: string; label: string }
> = {
  PRE_CLOSE: {
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
    label:   'Pre-Close',
  },
  ACTIVE: {
    classes: 'bg-[var(--fsl-bright-blue)] text-white border-[var(--fsl-bright-blue)]',
    label:   'Active',
  },
  ON_HOLD: {
    classes: 'bg-amber-100 text-[var(--status-amber)] border-amber-200',
    label:   'On Hold',
  },
  CLOSED: {
    classes: 'bg-[var(--fsl-dark-blue)] text-white border-[var(--fsl-dark-blue)]',
    label:   'Closed',
  },
  CANCELLED: {
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
    label:   'Cancelled',
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
