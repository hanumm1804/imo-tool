'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const PDF_URL = '/Firstsource_IMO_Master_Framework.pdf'

export default function FrameworkPage() {
  const [page,  setPage]  = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [zoom,  setZoom]  = useState(100)

  // The iframe reports page count via postMessage from the PDF viewer,
  // but since we use the browser's native viewer we track page via URL hash.
  // Instead we embed PDF.js viewer via object tag + hash navigation.

  const goTo = useCallback((n: number) => {
    if (total && n >= 1 && n <= total) setPage(n)
    else if (!total && n >= 1) setPage(n)
  }, [total])

  const src = `${PDF_URL}#page=${page}&zoom=${zoom}`

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 shadow-sm">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:flex h-7 w-7 items-center justify-center rounded bg-[var(--fsl-dark-blue)] text-[10px] font-bold text-white">
            PDF
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--fsl-dark-blue)] leading-tight">
              IMO Master Framework
            </p>
            <p className="hidden sm:block text-[10px] text-gray-400 leading-tight">
              Firstsource Integration Management Office
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom out */}
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            disabled={zoom <= 50}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Zoom level */}
          <span className="w-12 text-center text-xs font-medium text-gray-600 tabular-nums">
            {zoom}%
          </span>

          {/* Zoom in */}
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            disabled={zoom >= 200}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="mx-2 h-5 w-px bg-gray-200" />

          {/* Prev page */}
          <button
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page counter / input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={total ?? undefined}
              value={page}
              onChange={(e) => {
                const n = parseInt(e.target.value)
                if (!isNaN(n)) goTo(n)
              }}
              className="h-7 w-10 rounded border border-gray-300 text-center text-xs font-medium text-gray-700 focus:border-[var(--fsl-bright-blue)] focus:outline-none"
              aria-label="Current page"
            />
            {total !== null && (
              <span className="text-xs text-gray-400 tabular-nums">/ {total}</span>
            )}
          </div>

          {/* Next page */}
          <button
            onClick={() => goTo(page + 1)}
            disabled={total !== null && page >= total}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mx-2 h-5 w-px bg-gray-200" />

          {/* Open full screen */}
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
            aria-label="Open in new tab"
          >
            <Maximize2 className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 overflow-hidden">
        <iframe
          key={src}
          src={src}
          className="h-full w-full border-none"
          title="Firstsource IMO Master Framework"
          onLoad={(e) => {
            // Try to read page count from the iframe if accessible
            try {
              const doc = (e.target as HTMLIFrameElement).contentDocument
              if (doc) {
                const match = doc.body?.innerText?.match(/(\d+)\s+pages?/i)
                if (match) setTotal(parseInt(match[1]))
              }
            } catch {
              // cross-origin — ignore; user navigates via prev/next
            }
          }}
        />
      </div>
    </div>
  )
}
