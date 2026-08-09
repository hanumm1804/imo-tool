'use client'

import { useCallback, useRef, useState } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id:        string
  title:     string
  message?:  string
  variant:   ToastVariant
}

// ── Config ────────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { borderColor: string; iconColor: string; Icon: React.ElementType; label: string }
> = {
  success: {
    borderColor: 'border-l-[var(--status-green)]',
    iconColor:   'text-[var(--status-green)]',
    Icon:        CheckCircle,
    label:       'Success',
  },
  error: {
    borderColor: 'border-l-[var(--status-red)]',
    iconColor:   'text-[var(--status-red)]',
    Icon:        AlertCircle,
    label:       'Error',
  },
  info: {
    borderColor: 'border-l-[var(--fsl-bright-blue)]',
    iconColor:   'text-[var(--fsl-bright-blue)]',
    Icon:        Info,
    label:       'Info',
  },
  warning: {
    borderColor: 'border-l-[var(--status-amber)]',
    iconColor:   'text-[var(--status-amber)]',
    Icon:        AlertTriangle,
    label:       'Warning',
  },
}

// ── Hook ──────────────────────────────────────────────────────────────────────

type ToastInput = Omit<ToastMessage, 'id'>

let _addToast: ((toast: ToastInput) => void) | null = null

export function useToast() {
  const toast = useCallback(
    (input: ToastInput) => {
      if (_addToast) {
        _addToast(input)
      } else {
        console.warn('[useToast] Toaster is not mounted')
      }
    },
    [],
  )

  return { toast }
}

// ── Individual Toast item ─────────────────────────────────────────────────────

function ToastItem({
  id,
  title,
  message,
  variant,
  onRemove,
}: ToastMessage & { onRemove: (id: string) => void }) {
  const cfg = VARIANT_CONFIG[variant]
  const { Icon } = cfg

  return (
    <RadixToast.Root
      className={`group pointer-events-auto relative flex w-80 items-start gap-3 overflow-hidden rounded-lg border border-gray-200 border-l-4 ${cfg.borderColor} bg-white p-4 shadow-lg transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full`}
      duration={4000}
      onOpenChange={(open) => {
        if (!open) onRemove(id)
      }}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cfg.iconColor}`}
        aria-hidden="true"
      />
      <span className="sr-only">{cfg.label}:</span>

      <div className="flex-1 min-w-0">
        <RadixToast.Title className="text-sm font-semibold text-[var(--fsl-dark-blue)]">
          {title}
        </RadixToast.Title>
        {message && (
          <RadixToast.Description className="mt-0.5 text-xs text-gray-500">
            {message}
          </RadixToast.Description>
        )}
      </div>

      <RadixToast.Close asChild>
        <button
          className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Dismiss</span>
        </button>
      </RadixToast.Close>
    </RadixToast.Root>
  )
}

// ── Toaster ───────────────────────────────────────────────────────────────────

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counterRef          = useRef(0)

  const addToast = useCallback((input: ToastInput) => {
    const id = `toast-${++counterRef.current}`
    setToasts((prev) => [...prev, { ...input, id }])
  }, [])

  // Register global reference so useToast() can reach this instance
  _addToast = addToast

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={removeToast} />
      ))}
      <RadixToast.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen flex-col-reverse gap-2 p-4 sm:max-w-sm" />
    </RadixToast.Provider>
  )
}
