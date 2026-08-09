'use client'

import React, { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface UserItem {
  id:   string
  name: string
}

interface Props {
  users:        UserItem[]
  value:        string        // userId or ''
  currentName?: string        // fallback display name when userId not in list
  onChange:     (userId: string) => void
  onCreateNew?: (name: string) => Promise<{ id: string; name: string }>
  disabled?:    boolean
  placeholder?: string
  className?:   string
}

export function UserCombobox({
  users,
  value,
  currentName = '',
  onChange,
  onCreateNew,
  disabled,
  placeholder = 'Search or type a name…',
  className = '',
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedName = users.find(u => u.id === value)?.name ?? currentName

  const filtered = query.trim()
    ? users.filter(u => u.name.toLowerCase().includes(query.trim().toLowerCase()))
    : users

  const exactMatch = users.some(
    u => u.name.toLowerCase() === query.trim().toLowerCase()
  )

  function handleFocus() {
    setQuery('')
    setError(null)
    setOpen(true)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
  }

  function handleSelect(userId: string) {
    onChange(userId)
    setQuery('')
    setOpen(false)
  }

  async function handleCreate(e: React.MouseEvent) {
    e.preventDefault()
    const name = query.trim()
    if (!name || !onCreateNew) return
    setLoading(true)
    setError(null)
    try {
      const user = await onCreateNew(name)
      onChange(user.id)
      setQuery('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add person')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none pr-6"
          value={open ? query : selectedName}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          disabled={disabled || loading}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}

      {open && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg text-sm">
          <li
            onMouseDown={e => { e.preventDefault(); handleSelect('') }}
            className="cursor-pointer px-3 py-2 text-gray-400 hover:bg-gray-50"
          >
            — Unassigned —
          </li>

          {filtered.length === 0 && !query.trim() && (
            <li className="px-3 py-2 text-gray-400 select-none">
              {users.length === 0 ? 'No users yet — type a name to add' : 'No matches'}
            </li>
          )}

          {filtered.map(u => (
            <li
              key={u.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(u.id) }}
              className={`cursor-pointer px-3 py-2 hover:bg-blue-50 ${
                value === u.id
                  ? 'font-semibold text-[var(--fsl-dark-blue)]'
                  : 'text-gray-700'
              }`}
            >
              {u.name}
            </li>
          ))}

          {onCreateNew && query.trim() && !exactMatch && (
            <li
              onMouseDown={handleCreate}
              className="cursor-pointer border-t border-gray-100 px-3 py-2 text-[var(--fsl-orange)] hover:bg-orange-50"
            >
              + Add &quot;{query.trim()}&quot; as new person
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
