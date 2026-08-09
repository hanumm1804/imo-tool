'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { X, CheckSquare, Square, CheckCircle, Lock } from 'lucide-react'
import { useSignoffTollgate } from '@/hooks/useDeal'
import type { PhaseWithTollgates, TollgateWithUser } from '@/hooks/useDeal'
import { Role } from '@/types'

interface TollgatePanelProps {
  dealId: string
  phase:  PhaseWithTollgates
  onClose: () => void
}

export function TollgatePanel({ dealId, phase, onClose }: TollgatePanelProps) {
  const { data: session } = useSession()
  const signoff           = useSignoffTollgate(dealId)

  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(phase.tollgateItems.filter((t) => t.isComplete).map((t) => t.id))
  )

  const canEdit        = session?.user.role !== Role.VIEWER
  const isAlreadyDone  = phase.tollgateComplete
  const mandatoryItems = phase.tollgateItems.filter((t) => t.isMandatory)
  const allMandatoryChecked = mandatoryItems.every((t) => t.isComplete || checkedIds.has(t.id))
  const canSignOff     = canEdit && allMandatoryChecked && !isAlreadyDone

  function toggleItem(id: string) {
    if (!canEdit || isAlreadyDone) return
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSignOff() {
    await signoff.mutateAsync({
      phaseId: phase.id,
      itemIds: [...checkedIds],
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-gray-200 bg-white shadow-xl"
      role="dialog"
      aria-labelledby="tollgate-panel-title"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 bg-[var(--fsl-dark-blue)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fsl-orange)]">
            Tollgate Review
          </p>
          <h3 id="tollgate-panel-title" className="mt-0.5 text-lg font-bold text-white">
            {phase.phaseName}
          </h3>
          {phase.tollgateDescription && (
            <p className="mt-1 text-xs text-white/70">{phase.tollgateDescription}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close tollgate panel"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Phase dates */}
      {(phase.plannedStartDate || phase.plannedEndDate) && (
        <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-3 text-xs text-gray-500">
          {phase.plannedStartDate && (
            <span>Start: {format(new Date(phase.plannedStartDate), 'dd MMM yyyy')}</span>
          )}
          {phase.plannedEndDate && (
            <span>End: {format(new Date(phase.plannedEndDate), 'dd MMM yyyy')}</span>
          )}
        </div>
      )}

      {/* Checklist */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isAlreadyDone && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-green-700">Tollgate Signed Off</p>
              {phase.tollgateSignedOffAt && (
                <p className="text-xs text-green-600">
                  Signed off on {format(new Date(phase.tollgateSignedOffAt), 'dd MMM yyyy')}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Checklist Items
        </p>

        {phase.tollgateItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No checklist items for this phase.</p>
        )}

        <ul className="space-y-2" role="list">
          {phase.tollgateItems.map((item) => {
              const isChecked = item.isComplete || checkedIds.has(item.id)
              return (
                <li key={item.id}>
                  <button
                    onClick={() => toggleItem(item.id)}
                    disabled={isAlreadyDone || !canEdit || item.isComplete}
                    className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isChecked
                        ? 'border-[var(--fsl-dark-blue)]/20 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${isAlreadyDone || !canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                    aria-pressed={isChecked}
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-[var(--fsl-dark-blue)]" aria-hidden="true" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className={`text-sm ${isChecked ? 'text-[var(--fsl-dark-blue)]' : 'text-gray-700'}`}>
                        {item.label}
                        {item.isMandatory && (
                          <span className="ml-1 text-[var(--status-red)]" aria-label="mandatory">*</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>

        {!isAlreadyDone && mandatoryItems.length > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            * Mandatory items — all must be checked before sign-off
          </p>
        )}
      </div>

      {/* Footer */}
      {!isAlreadyDone && canEdit && (
        <div className="border-t border-gray-200 px-5 py-4">
          <button
            onClick={handleSignOff}
            disabled={!canSignOff || signoff.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--fsl-dark-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {signoff.isPending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
            Sign Off Tollgate
          </button>
          {!allMandatoryChecked && (
            <p className="mt-2 text-center text-xs text-gray-400">
              Complete all mandatory items to enable sign-off
            </p>
          )}
        </div>
      )}
    </div>
  )
}
