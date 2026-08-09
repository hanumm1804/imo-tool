'use client'

import React, { useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { ResourceWithRelations } from '@/hooks/useResources'

interface Props {
  resources:   ResourceWithRelations[]
  value:       string  // userId or ''
  currentName: string  // fallback display name when value not in resources list
  onChange:    (userId: string) => void
  onCreateNew: (name: string) => Promise<{ id: string; name: string }>
  disabled?:   boolean
}

export function ResourceCombobox({ resources, value, currentName, onChange, onCreateNew, disabled }: Props) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedName = resources.find(r => r.user.id === value)?.user.name ?? currentName

  const filtered = query.trim()
    ? resources.filter(r => r.user.name.toLowerCase().includes(query.trim().toLowerCase()))
    : resources

  const exactMatch = resources.some(
    r => r.user.name.toLowerCase() === query.trim().toLowerCase()
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

  // onMouseDown so the selection fires before the input's onBlur
  function handleSelect(userId: string) {
    onChange(userId)
    setQuery('')
    setOpen(false)
  }

  async function handleCreate(e: React.MouseEvent) {
    e.preventDefault()
    const name = query.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const user = await onCreateNew(name)
      onChange(user.id)
      setQuery('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add resource')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          className="input-sm w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none pr-6"
          value={open ? query : selectedName}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search or type to add…"
          disabled={disabled || loading}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}

      {open && (
        <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg text-xs">
          {/* Unassigned */}
          <li
            onMouseDown={e => { e.preventDefault(); handleSelect('') }}
            className="cursor-pointer px-3 py-2 text-gray-400 hover:bg-gray-50"
          >
            — Unassigned —
          </li>

          {filtered.length === 0 && !query.trim() && (
            <li className="px-3 py-2 text-gray-400 select-none">No resources on this deal yet</li>
          )}

          {filtered.map(r => (
            <li
              key={r.user.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(r.user.id) }}
              className={`cursor-pointer px-3 py-2 hover:bg-blue-50 ${
                value === r.user.id
                  ? 'font-semibold text-[var(--fsl-dark-blue)]'
                  : 'text-gray-700'
              }`}
            >
              {r.user.name}
            </li>
          ))}

          {query.trim() && !exactMatch && (
            <li
              onMouseDown={handleCreate}
              className="cursor-pointer border-t border-gray-100 px-3 py-2 text-[var(--fsl-orange)] hover:bg-orange-50"
            >
              + Add &quot;{query.trim()}&quot; as new resource
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
