'use client'

import { useState, useEffect, useCallback } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronsUpDown, Search, X } from 'lucide-react'
import { User } from '@/types'

interface UserPickerProps {
  value?:       string
  onChange:     (userId: string) => void
  placeholder?: string
  disabled?:    boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last  = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-xs font-semibold text-[var(--fsl-orange)]"
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}

export function UserPicker({
  value,
  onChange,
  placeholder = 'Select user…',
  disabled = false,
}: UserPickerProps) {
  const [open,     setOpen]     = useState(false)
  const [users,    setUsers]    = useState<User[]>([])
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const selectedUser = users.find((u) => u.id === value)

  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return
    setLoading(true)
    try {
      const res  = await fetch('/api/users')
      const json = await res.json() as { data: User[] }
      setUsers(json.data ?? [])
    } catch {
      // silently fail — user list stays empty
    } finally {
      setLoading(false)
    }
  }, [users.length])

  useEffect(() => {
    if (open) void fetchUsers()
  }, [open, fetchUsers])

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()),
  )

  function handleSelect(userId: string) {
    onChange(userId)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:border-[var(--fsl-bright-blue)] focus:border-[var(--fsl-bright-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--fsl-bright-blue)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectedUser ? (
            <span className="flex items-center gap-2">
              <UserAvatar name={selectedUser.name} />
              <span className="text-[var(--fsl-dark-blue)]">{selectedUser.name}</span>
              {(selectedUser as User & { department?: string }).department && (
                <span className="text-xs text-gray-400">
                  {(selectedUser as User & { department?: string }).department}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}

          <span className="flex items-center gap-1">
            {selectedUser && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Clear</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-gray-200 bg-white shadow-lg"
          sideOffset={4}
          align="start"
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
            <label htmlFor="user-picker-search" className="sr-only">
              Search users
            </label>
            <input
              id="user-picker-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {/* List */}
          <ul
            role="listbox"
            aria-label="Users"
            className="max-h-56 overflow-y-auto py-1"
          >
            {loading && (
              <li className="px-3 py-4 text-center text-sm text-gray-400">
                Loading…
              </li>
            )}

            {!loading && filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-gray-400">
                No users found
              </li>
            )}

            {!loading &&
              filtered.map((u) => {
                const dept = (u as User & { department?: string }).department
                const isSelected = u.id === value

                return (
                  <li
                    key={u.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(u.id)}
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[var(--fsl-gray)] ${
                      isSelected ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    <UserAvatar name={u.name} />
                    <div className="min-w-0">
                      <div className="truncate text-[var(--fsl-dark-blue)]">{u.name}</div>
                      {dept && (
                        <div className="truncate text-xs text-gray-400">{dept}</div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="ml-auto text-[var(--fsl-bright-blue)]" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </li>
                )
              })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
