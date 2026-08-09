'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Check } from 'lucide-react'

interface DealOption {
  id:   string
  name: string
}

interface DealFilterProps {
  deals:    DealOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function DealFilter({ deals, selected, onChange }: DealFilterProps) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef<HTMLDivElement>(null)

  const filtered = deals.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  )

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  function removeSelected(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== id))
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
  }

  const selectedDeals = deals.filter((d) => selected.includes(d.id))

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter deals"
        className="flex min-h-[38px] w-full min-w-[220px] flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-[var(--fsl-bright-blue)] focus:border-[var(--fsl-bright-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--fsl-bright-blue)]"
      >
        {selectedDeals.length === 0 ? (
          <span className="text-gray-400">All Deals</span>
        ) : (
          selectedDeals.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-1 rounded-full bg-[var(--fsl-dark-blue)] px-2 py-0.5 text-[11px] font-medium text-white"
            >
              {d.name}
              <button
                type="button"
                onClick={(e) => removeSelected(d.id, e)}
                aria-label={`Remove ${d.name} filter`}
                className="rounded-full p-0.5 hover:bg-white/20 focus:outline-none"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
                <span className="sr-only">Remove</span>
              </button>
            </span>
          ))
        )}

        <span className="ml-auto flex items-center gap-1 text-gray-400">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear all filters"
              className="rounded p-0.5 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Clear filters</span>
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-lg border border-gray-200 bg-white shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
            <label htmlFor="deal-filter-search" className="sr-only">
              Search deals
            </label>
            <input
              id="deal-filter-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {/* Options */}
          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-label="Deals"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-gray-400">
                No deals found
              </li>
            )}
            {filtered.map((d) => {
              const checked = selected.includes(d.id)
              return (
                <li
                  key={d.id}
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(d.id)}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--fsl-gray)]"
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      checked
                        ? 'border-[var(--fsl-bright-blue)] bg-[var(--fsl-bright-blue)]'
                        : 'border-gray-300 bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="truncate text-[var(--fsl-dark-blue)]">{d.name}</span>
                </li>
              )
            })}
          </ul>

          {/* Footer actions */}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[var(--fsl-bright-blue)] hover:underline focus:outline-none"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
