'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Pencil,
  Archive,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { RAGChip } from '@/components/shared/RAGChip'
import { DealStatusBadge } from './DealStatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { useToast } from '@/components/shared/Toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { DealStatus, RAGStatus, Role } from '@/types'
import { format } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DealRow {
  id:                  string
  name:                string
  acquiredCompanyName: string
  status:              DealStatus
  currentPhase:        number
  overallRag:          RAGStatus
  imoLead?:            { id: string; name: string } | null
  acquisitionDate?:    string | null
  updatedAt:           string
}

type SortKey = keyof Pick<DealRow, 'name' | 'status' | 'currentPhase' | 'overallRag' | 'updatedAt'>
type SortDir = 'asc' | 'desc'

interface DealTableProps {
  deals:     DealRow[]
  onRefresh: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last  = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return format(new Date(iso), 'd MMM yyyy') } catch { return '—' }
}

// ── Column header ─────────────────────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label:      string
  sortKey:    SortKey
  currentKey: SortKey | null
  currentDir: SortDir
  onSort:     (k: SortKey) => void
}) {
  const active = currentKey === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 uppercase tracking-wide focus:outline-none focus-visible:underline"
      aria-sort={active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {active ? (
        currentDir === 'asc'
          ? <ArrowUp   className="h-3 w-3" aria-hidden="true" />
          : <ArrowDown className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}

// ── Actions ⋮ menu ────────────────────────────────────────────────────────────

function RowActions({
  deal,
  canEdit,
  canArchive,
  onView,
  onEdit,
  onArchive,
}: {
  deal:       DealRow
  canEdit:    boolean
  canArchive: boolean
  onView:     () => void
  onEdit:     () => void
  onArchive:  () => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`Actions for ${deal.name}`}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fsl-bright-blue)]"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Deal actions</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item
            onSelect={onView}
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 outline-none hover:bg-[var(--fsl-gray)]"
          >
            <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
            View
          </DropdownMenu.Item>

          {canEdit && (
            <DropdownMenu.Item
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 outline-none hover:bg-[var(--fsl-gray)]"
            >
              <Pencil className="h-4 w-4 text-gray-400" aria-hidden="true" />
              Edit
            </DropdownMenu.Item>
          )}

          {canArchive && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-gray-100" />
              <DropdownMenu.Item
                onSelect={onArchive}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-[var(--status-red)] outline-none hover:bg-red-50"
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Archive
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DealTable({ deals, onRefresh }: DealTableProps) {
  const router            = useRouter()
  const { data: session } = useSession()
  const { toast }         = useToast()

  const role      = session?.user?.role as Role | undefined
  const canEdit   = role === 'ADMIN' || role === 'IMO_LEAD'
  const canArchive = role === 'ADMIN'

  const [sortKey, setSortKey]               = useState<SortKey | null>(null)
  const [sortDir, setSortDir]               = useState<SortDir>('asc')
  const [archiveDeal, setArchiveDeal]       = useState<DealRow | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const RAG_ORDER: Record<RAGStatus, number> = {
    RED:   0,
    AMBER: 1,
    GREEN: 2,
    GRAY:  3,
  }

  const sorted = [...deals].sort((a, b) => {
    if (!sortKey) return 0
    let cmp = 0

    if (sortKey === 'name')         cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'status')  cmp = a.status.localeCompare(b.status)
    else if (sortKey === 'currentPhase') cmp = a.currentPhase - b.currentPhase
    else if (sortKey === 'overallRag')   cmp = RAG_ORDER[a.overallRag] - RAG_ORDER[b.overallRag]
    else if (sortKey === 'updatedAt')    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()

    return sortDir === 'asc' ? cmp : -cmp
  })

  async function handleArchive() {
    if (!archiveDeal) return
    setArchiveLoading(true)
    try {
      const res = await fetch(`/api/deals/${archiveDeal.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isArchived: true }),
      })
      if (!res.ok) throw new Error('Failed to archive deal')

      toast({
        variant: 'success',
        title:   'Deal archived',
        message: `"${archiveDeal.name}" has been archived.`,
      })
      setArchiveDeal(null)
      onRefresh()
    } catch {
      toast({
        variant: 'error',
        title:   'Archive failed',
        message: 'Could not archive this deal. Please try again.',
      })
    } finally {
      setArchiveLoading(false)
    }
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        title="No deals yet"
        message="Create your first deal to start tracking integration workstreams."
      />
    )
  }

  const sortProps = { currentKey: sortKey, currentDir: sortDir, onSort: handleSort }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-sm" aria-label="Deals table">
          <thead>
            <tr className="bg-[var(--fsl-dark-blue)] text-left">
              {[
                { label: 'Deal Name',       key: 'name'         as SortKey },
                { label: 'Acquired Co.',    key: null },
                { label: 'Status',          key: 'status'       as SortKey },
                { label: 'Phase',           key: 'currentPhase' as SortKey },
                { label: 'RAG',             key: 'overallRag'   as SortKey },
                { label: 'IMO Lead',        key: null },
                { label: 'Acq. Date',       key: null },
                { label: 'Last Updated',    key: 'updatedAt'    as SortKey },
                { label: '',                key: null },
              ].map(({ label, key }, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-white/80"
                >
                  {key
                    ? <SortableHeader label={label} sortKey={key} {...sortProps} />
                    : <span className="uppercase tracking-wide">{label}</span>
                  }
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((deal, idx) => (
              <tr
                key={deal.id}
                className={`transition-colors hover:bg-blue-50 ${idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'}`}
              >
                {/* Deal Name */}
                <td className="px-4 py-3 font-semibold text-[var(--fsl-dark-blue)]">
                  <button
                    type="button"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    className="text-left hover:underline focus:outline-none focus-visible:underline"
                  >
                    {deal.name}
                  </button>
                </td>

                {/* Acquired company */}
                <td className="px-4 py-3 text-gray-500">
                  {deal.acquiredCompanyName}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <DealStatusBadge status={deal.status} />
                </td>

                {/* Phase */}
                <td className="px-4 py-3 text-center font-medium text-[var(--fsl-dark-blue)]">
                  {deal.currentPhase}
                </td>

                {/* RAG */}
                <td className="px-4 py-3">
                  <RAGChip rag={deal.overallRag} />
                </td>

                {/* IMO Lead */}
                <td className="px-4 py-3">
                  {deal.imoLead ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-[10px] font-bold text-[var(--fsl-orange)]"
                        aria-hidden="true"
                      >
                        {getInitials(deal.imoLead.name)}
                      </span>
                      <span className="truncate text-gray-700">{deal.imoLead.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Acquisition Date */}
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(deal.acquisitionDate)}
                </td>

                {/* Last Updated */}
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(deal.updatedAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <RowActions
                    deal={deal}
                    canEdit={canEdit}
                    canArchive={canArchive}
                    onView={() => router.push(`/deals/${deal.id}`)}
                    onEdit={() => router.push(`/deals/${deal.id}/settings`)}
                    onArchive={() => setArchiveDeal(deal)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Archive confirmation */}
      <ConfirmModal
        isOpen={archiveDeal !== null}
        onClose={() => setArchiveDeal(null)}
        onConfirm={handleArchive}
        title="Archive Deal"
        message={`This will hide "${archiveDeal?.name}" from all views. You can restore it later from Admin settings.`}
        confirmLabel={archiveLoading ? 'Archiving…' : 'Archive Deal'}
        confirmVariant="danger"
        requiresTyping={archiveDeal?.name}
      />
    </>
  )
}
