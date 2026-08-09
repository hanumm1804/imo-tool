'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Search, Plus, X, ChevronDown, Check } from 'lucide-react'
import {
  useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useBulkUpdateRole, useDeleteAdminUser,
} from '@/hooks/useAdmin'
import type { AdminUser, AdminUserRole } from '@/hooks/useAdmin'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Role } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<AdminUserRole, string> = {
  ADMIN:    'bg-purple-100 text-purple-700',
  IMO_LEAD: 'bg-blue-100 text-blue-700',
  VIEWER:   'bg-gray-100 text-gray-600',
}

// ─── Invite / Create Modal ────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateAdminUser()
  const [form, setForm] = useState({
    name:     '',
    email:    '',
    role:     'VIEWER' as AdminUserRole,
    password: '',
  })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createUser.mutateAsync(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--fsl-dark-blue)]">Invite User</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminUserRole }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            >
              <option value="VIEWER">Viewer</option>
              <option value="IMO_LEAD">IMO Lead</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
            />
            <p className="mt-0.5 text-xs text-gray-400">Min. 8 characters. User must reset on first login.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {createUser.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Role Select (inline) ─────────────────────────────────────────────────────

function InlineRoleSelect({ user, onUpdate }: {
  user:     AdminUser
  onUpdate: (userId: string, role: AdminUserRole) => void
}) {
  return (
    <select
      value={user.role}
      onChange={(e) => onUpdate(user.id, e.target.value as AdminUserRole)}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer border-none outline-none ${ROLE_BADGE[user.role]}`}
    >
      <option value="VIEWER">VIEWER</option>
      <option value="IMO_LEAD">IMO_LEAD</option>
      <option value="ADMIN">ADMIN</option>
    </select>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user.role === Role.ADMIN

  const [search,       setSearch]      = useState('')
  const [roleFilter,   setRoleFilter]  = useState<AdminUserRole | 'ALL'>('ALL')
  const [showInvite,   setShowInvite]  = useState(false)
  const [selected,     setSelected]    = useState<Set<string>>(new Set())
  const [bulkRole,     setBulkRole]    = useState<AdminUserRole>('VIEWER')
  const [showBulkConf, setShowBulkConf]= useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | undefined>()
  const [deleteTarget,     setDeleteTarget]     = useState<AdminUser | undefined>()

  const { data: users, isLoading } = useAdminUsers(search || undefined, roleFilter)
  const updateUser  = useUpdateAdminUser()
  const bulkUpdate  = useBulkUpdateRole()
  const deleteUser  = useDeleteAdminUser()

  const filtered = useMemo(() => users ?? [], [users])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((u) => u.id)))
  }

  async function handleUpdateRole(userId: string, role: AdminUserRole) {
    await updateUser.mutateAsync({ userId, body: { role } })
  }

  async function handleBulkRoleUpdate() {
    await bulkUpdate.mutateAsync({ userIds: [...selected], role: bulkRole })
    setSelected(new Set())
    setShowBulkConf(false)
  }

  async function handleToggleActive(user: AdminUser) {
    await updateUser.mutateAsync({ userId: user.id, body: { isActive: !user.isActive } })
    setDeactivateTarget(undefined)
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    await deleteUser.mutateAsync(deleteTarget.id)
    setDeleteTarget(undefined)
  }

  if (isLoading) {
    return (
      <div className="px-6 py-6 space-y-4">
        <SkeletonLoader variant="table" rows={8} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">{(users ?? []).length} users registered</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invite User
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'ADMIN', 'IMO_LEAD', 'VIEWER'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-[var(--fsl-dark-blue)] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r === 'ALL' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && isAdmin && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--fsl-dark-blue)]/20 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-[var(--fsl-dark-blue)]">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Set role to:</span>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as AdminUserRole)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none"
            >
              <option value="VIEWER">VIEWER</option>
              <option value="IMO_LEAD">IMO_LEAD</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              onClick={() => setShowBulkConf(true)}
              className="rounded-md bg-[var(--fsl-dark-blue)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Apply to {selected.size}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          message="Try adjusting your search or filter."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[var(--fsl-dark-blue)] text-white">
              <tr>
                <th className="px-4 py-3 w-8">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-white/50 bg-transparent"
                      aria-label="Select all"
                    />
                  )}
                </th>
                {['User', 'Role', 'Status', 'Last Login', 'Deals', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`${selected.has(user.id) ? 'bg-blue-50' : idx % 2 === 1 ? 'bg-[var(--fsl-gray)]' : 'bg-white'} hover:bg-blue-50`}
                >
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        aria-label={`Select ${user.name}`}
                        className="rounded border-gray-300"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-white text-xs font-bold">
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--fsl-dark-blue)]">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <InlineRoleSelect user={user} onUpdate={handleUpdateRole} />
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role]}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), 'dd MMM yyyy')
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user._count.resourceAllocations}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeactivateTarget(user)}
                          className={`rounded px-2 py-1 text-xs ${
                            user.isActive
                              ? 'text-[var(--status-red)] hover:bg-red-50'
                              : 'text-[var(--status-green)] hover:bg-green-50'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <span className="text-gray-200">|</span>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(undefined)}
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        title={deactivateTarget?.isActive ? 'Deactivate User' : 'Reactivate User'}
        message={
          deactivateTarget?.isActive
            ? `Deactivate ${deactivateTarget?.name}? They will no longer be able to log in.`
            : `Reactivate ${deactivateTarget?.name}? They will regain access to the system.`
        }
        confirmLabel={deactivateTarget?.isActive ? 'Deactivate' : 'Reactivate'}
        confirmVariant={deactivateTarget?.isActive ? 'danger' : 'primary'}
      />

      <ConfirmModal
        isOpen={showBulkConf}
        onClose={() => setShowBulkConf(false)}
        onConfirm={handleBulkRoleUpdate}
        title="Bulk Role Update"
        message={`Set role to ${bulkRole} for ${selected.size} user${selected.size !== 1 ? 's' : ''}?`}
        confirmLabel="Apply"
        confirmVariant="primary"
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={handleDeleteUser}
        title="Permanently Delete User"
        message={`Delete ${deleteTarget?.name} (${deleteTarget?.email}) permanently? This cannot be undone. Their tasks and entries will be unassigned but all deal data is preserved.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  )
}
