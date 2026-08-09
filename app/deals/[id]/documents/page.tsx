'use client'

import { FolderOpen, ExternalLink } from 'lucide-react'

const AZURE_CHIPS = [
  { label: 'SharePoint', href: 'https://sharepoint.com' },
  { label: 'OneDrive',   href: 'https://onedrive.com'   },
  { label: 'Teams',      href: 'https://teams.microsoft.com' },
]

export default function DocumentsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      {/* Illustration */}
      <div className="mb-8">
        <svg
          viewBox="0 0 200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-40 w-auto"
          aria-hidden="true"
        >
          {/* Folder back */}
          <rect x="20" y="55" width="160" height="95" rx="8" fill="#E5E7EB" />
          {/* Folder tab */}
          <path d="M20 55 Q20 42 30 42 L80 42 Q88 42 92 50 L100 55 Z" fill="#D1D5DB" />
          {/* Folder front */}
          <rect x="25" y="65" width="150" height="79" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1.5" />
          {/* Document 1 */}
          <rect x="55" y="72" width="48" height="60" rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="61" y="84" width="36" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="61" y="93" width="28" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="61" y="102" width="32" height="3" rx="1.5" fill="#D1D5DB" />
          {/* Document 2 */}
          <rect x="97" y="72" width="48" height="60" rx="3" fill="white" stroke="#E5E7EB" strokeWidth="1" />
          <rect x="103" y="84" width="36" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="103" y="93" width="24" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="103" y="102" width="30" height="3" rx="1.5" fill="#D1D5DB" />
          {/* Azure logo hint */}
          <circle cx="100" cy="32" r="16" fill="#0078D4" opacity="0.1" />
          <text x="100" y="37" textAnchor="middle" fontSize="14" fill="#0078D4" fontWeight="700">A</text>
        </svg>
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Documents</h1>

      {/* Description */}
      <p className="mt-3 max-w-md text-sm text-gray-500 leading-relaxed">
        Document management is powered by <span className="font-semibold text-[var(--fsl-dark-blue)]">Microsoft Azure AD</span>.
        Files for this deal are stored and accessed through your organisation's Microsoft 365 environment.
      </p>

      {/* Azure chips */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {AZURE_CHIPS.map((chip) => (
          <a
            key={chip.label}
            href={chip.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-[#0078D4]/30 bg-[#0078D4]/5 px-4 py-2 text-sm font-medium text-[#0078D4] transition-colors hover:bg-[#0078D4]/10"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {chip.label}
          </a>
        ))}
      </div>

      {/* Informational note */}
      <div className="mt-8 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-left max-w-md">
        <FolderOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
        <p className="text-xs text-gray-500 leading-relaxed">
          A deep integration with SharePoint and OneDrive is planned for a future release.
          Until then, please access deal documents directly through the links above.
          Ensure you have the correct Azure AD permissions before accessing sensitive files.
        </p>
      </div>
    </div>
  )
}
