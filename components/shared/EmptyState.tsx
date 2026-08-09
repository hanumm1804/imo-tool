import { ReactNode } from 'react'

interface EmptyStateProps {
  title:        string
  message:      string
  actionLabel?: string
  onAction?:    () => void
  icon?:        ReactNode
}

function DefaultIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Folder body */}
      <rect
        x="8"
        y="28"
        width="64"
        height="44"
        rx="4"
        fill="var(--fsl-dark-blue)"
        opacity="0.12"
      />
      <rect
        x="8"
        y="28"
        width="64"
        height="44"
        rx="4"
        stroke="var(--fsl-dark-blue)"
        strokeWidth="2"
        fill="none"
      />
      {/* Folder tab */}
      <path
        d="M8 28h20l4-8h36a4 4 0 0 1 4 4v4H8z"
        fill="var(--fsl-dark-blue)"
        opacity="0.25"
      />
      {/* Document lines */}
      <rect x="22" y="42" width="36" height="3" rx="1.5" fill="var(--fsl-orange)" />
      <rect x="22" y="50" width="26" height="3" rx="1.5" fill="var(--fsl-dark-blue)" opacity="0.35" />
      <rect x="22" y="58" width="30" height="3" rx="1.5" fill="var(--fsl-dark-blue)" opacity="0.25" />
    </svg>
  )
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5">
        {icon ?? <DefaultIllustration />}
      </div>

      <h3 className="text-lg font-semibold text-[var(--fsl-dark-blue)]">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-gray-500">
        {message}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 rounded-md bg-[var(--fsl-orange)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-orange)] focus:ring-offset-2 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
