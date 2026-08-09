import { RAGStatus } from '@/types'

interface RAGChipProps {
  rag: RAGStatus | null | undefined
}

const RAG_CONFIG: Record<
  RAGStatus,
  { bg: string; textColor: string; border: string; dot: string; label: string }
> = {
  GREEN: {
    bg:        'bg-green-100',
    textColor: 'text-[var(--status-green)]',
    border:    'border-green-200',
    dot:       'bg-[var(--status-green)]',
    label:     'GREEN',
  },
  AMBER: {
    bg:        'bg-amber-100',
    textColor: 'text-[var(--status-amber)]',
    border:    'border-amber-200',
    dot:       'bg-[var(--status-amber)]',
    label:     'AMBER',
  },
  RED: {
    bg:        'bg-red-100',
    textColor: 'text-[var(--status-red)]',
    border:    'border-red-200',
    dot:       'bg-[var(--status-red)]',
    label:     'RED',
  },
  GRAY: {
    bg:        'bg-gray-100',
    textColor: 'text-[var(--status-gray)]',
    border:    'border-gray-200',
    dot:       'bg-[var(--status-gray)]',
    label:     'GRAY',
  },
}

export function RAGChip({ rag }: RAGChipProps) {
  const config = rag ? RAG_CONFIG[rag] : undefined

  if (!config) {
    return <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-400">—</span>
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.textColor} ${config.border}`}
      aria-label={`RAG status: ${config.label}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}
