'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Search, Filter, Info } from 'lucide-react'
import { useAuditLog } from '@/hooks/useAdmin'
import type { AuditLogItem } from '@/hooks/useAdmin'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ENTITY_COLORS: Record<string, string> = {
  Deal:       'bg-blue-100 text-blue-700',
  User:       'bg-purple-100 text-purple-700',
  Task:       'bg-orange-100 text-orange-700',
  AppSetting: 'bg-gray-100 text-gray-700',
  Workstream: 'bg-teal-100 text-teal-700',
  Risk:       'bg-red-100 text-red-700',
  Action:     'bg-yellow-100 text-yellow-700',
  Decision:   'bg-green-100 text-green-700',
  Synergy:    'bg-indigo-100 text-indigo-700',
}

function entityBadge(entityType: string) {
  const cls = ENTITY_COLORS[entityType] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {entityType}
    </span>
  )
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ')
}

// ─── Detail Popover ───────────────────────────────────────────────────────────

function DetailPopover({ item }: { item: AuditLogItem }) {
  const [open, setOpen] = useState(false)

  if (!item.oldValue && !item.newValue && !item.detail) return <span className="text-gray-300">—</span>

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Show details"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Details</p>
            {item.detail && (
              <p className="mb-2 text-sm text-gray-700">{item.detail}</p>
            )}
            {item.oldValue && (
              <div className="mb-2">
                <p className="text-[10px] font-semibold text-gray-400 mb-0.5">Old Value</p>
                <pre className="rounded-md bg-red-50 p-2 text-[10px] text-red-700 overflow-auto max-h-24">
                  {JSON.stringify(JSON.parse(item.oldValue), null, 2)}
                </pre>
              </div>
            )}
            {item.newValue && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 mb-0.5">New Value</p>
                <pre className="rounded-md bg-green-50 p-2 text-[10px] text-green-700 overflow-auto max-h-24">
                  {JSON.stringify(JSON.parse(item.newValue), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  'ALL', 'Deal', 'User', 'Task', 'AppSetting', 'Workstream', 'Risk', 'Action', 'Decision',
]

export default function AdminAuditPage() {
  const [search,      setSearch]      = useState('')
  const [entityType,  setEntityType]  = useState('ALL')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: logs, isLoading } = useAuditLog({
    action:     search || undefined,
    entityType: entityType !== 'ALL' ? entityType : undefined,
    dateFrom:   dateFrom || undefined,
    dateTo:     dateTo   || undefined,
  })

  const filtered = useMemo(() => {
    if (!search) return logs ?? []
    const q = search.toLowerCase()
    return (logs ?? []).filter((l) =>
      l.action.toLowerCase().includes(q) ||
      (l.user?.name ?? '').toLowerCase().includes(q) ||
      (l.entityType ?? '').toLowerCase().includes(q) ||
      (l.detail ?? '').toLowerCase().includes(q)
    )
  }, [logs, search])

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonLoader variant="table" rows={10} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Audit Log</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Read-only record of all actions. Showing {filtered.length} entries.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search action, user, entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-600 ${
            showFilters ? 'border-[var(--fsl-dark-blue)] bg-blue-50 text-[var(--fsl-dark-blue)]' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filters
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          {(entityType !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => { setEntityType('ALL'); setDateFrom(''); setDateTo('') }}
              className="self-end rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No audit entries found"
          message="Try adjusting your search or filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                {['Timestamp', 'User', 'Action', 'Entity', 'ID', 'Details'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`${idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'} hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-medium text-gray-700">
                      {format(new Date(log.createdAt), 'dd MMM yyyy')}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[var(--fsl-dark-blue)]">
                      {log.user?.name ?? log.userName ?? 'System'}
                    </p>
                    <p className="text-[10px] text-gray-400">{log.user?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-700">{formatAction(log.action)}</code>
                  </td>
                  <td className="px-4 py-3">
                    {entityBadge(log.entityType)}
                  </td>
                  <td className="px-4 py-3">
                    {log.entityId ? (
                      <code className="text-[10px] text-gray-400 font-mono">
                        {log.entityId.slice(-8)}
                      </code>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DetailPopover item={log} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
