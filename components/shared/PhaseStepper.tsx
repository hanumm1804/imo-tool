const PHASE_COUNT = 6

export const PHASE_LABELS: Record<number, string> = {
  1: 'Direction',
  2: 'Readiness',
  3: 'Integration',
  4: 'Value',
  5: 'Embed',
  6: 'BAU & Value Close',
}

interface PhaseStepperProps {
  current:     number
  showLabel?:  boolean
}

export function PhaseStepper({ current, showLabel = true }: PhaseStepperProps) {
  return (
    <div className="flex items-center gap-1" aria-label={`Phase ${current} of ${PHASE_COUNT}`}>
      {Array.from({ length: PHASE_COUNT }).map((_, i) => {
        const phase = i + 1
        const cls =
          phase === current
            ? 'bg-[var(--fsl-orange)] h-2.5 w-2.5'
            : phase < current
              ? 'bg-[var(--fsl-dark-blue)] h-2 w-2'
              : 'bg-gray-300 h-2 w-2'
        return (
          <span key={phase} className={`rounded-full transition-all ${cls}`} aria-hidden="true" />
        )
      })}
      {showLabel && (
        <span className="ml-1.5 text-[11px] text-gray-400 whitespace-nowrap">
          Phase {current}
          {PHASE_LABELS[current] && <span> · {PHASE_LABELS[current]}</span>}
        </span>
      )}
    </div>
  )
}
