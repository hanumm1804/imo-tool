'use client'

import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface ConfirmModalProps {
  isOpen:           boolean
  onClose:          () => void
  onConfirm:        () => void | Promise<void>
  title:            string
  message:          string
  confirmLabel?:    string
  confirmVariant?:  'danger' | 'primary'
  requiresTyping?:  string
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel   = 'Confirm',
  confirmVariant = 'primary',
  requiresTyping,
}: ConfirmModalProps) {
  const [typedValue, setTypedValue] = useState('')
  const [loading,    setLoading]    = useState(false)

  const canConfirm = requiresTyping
    ? typedValue.trim() === requiresTyping.trim()
    : true

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      setTypedValue('')
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setTypedValue('')
      onClose()
    }
  }

  const confirmClasses =
    confirmVariant === 'danger'
      ? 'bg-[var(--status-red)] hover:bg-red-700 text-white'
      : 'bg-[var(--fsl-bright-blue)] hover:bg-blue-800 text-white'

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby="confirm-modal-description"
        >
          <AlertDialog.Title className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
            {title}
          </AlertDialog.Title>

          <AlertDialog.Description
            id="confirm-modal-description"
            className="mt-2 text-sm text-gray-600"
          >
            {message}
          </AlertDialog.Description>

          {requiresTyping && (
            <div className="mt-4">
              <label
                htmlFor="confirm-typing-input"
                className="block text-sm font-medium text-gray-700"
              >
                Type{' '}
                <span className="font-semibold text-[var(--fsl-dark-blue)]">
                  {requiresTyping}
                </span>{' '}
                to confirm:
              </label>
              <input
                id="confirm-typing-input"
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--fsl-bright-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--fsl-bright-blue)]"
                placeholder={requiresTyping}
                autoComplete="off"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-bright-blue)] focus:ring-offset-2"
              >
                Cancel
              </button>
            </AlertDialog.Cancel>

            <button
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmClasses}`}
              aria-busy={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing…
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
