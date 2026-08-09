'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Users, Settings2, ScrollText, ChevronRight } from 'lucide-react'
import { Role } from '@/types'

const CARDS = [
  {
    href:        '/admin/users',
    icon:        Users,
    title:       'User Management',
    description: 'Manage user accounts, roles, and access. Invite new users or deactivate existing ones.',
    accent:      'bg-blue-50 text-[var(--fsl-dark-blue)]',
  },
  {
    href:        '/admin/settings',
    icon:        Settings2,
    title:       'App Settings',
    description: 'Configure global application settings including feature flags and default values.',
    accent:      'bg-orange-50 text-[var(--fsl-orange)]',
  },
  {
    href:        '/admin/audit',
    icon:        ScrollText,
    title:       'Audit Log',
    description: 'View a complete read-only record of all actions performed across the platform.',
    accent:      'bg-gray-50 text-gray-600',
  },
]

export default function AdminPage() {
  const { data: session } = useSession()

  if (session && session.user.role !== Role.ADMIN) {
    redirect('/')
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--fsl-dark-blue)]">Administration</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage users, settings, and audit logs for the IMO Tool.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {CARDS.map(({ href, icon: Icon, title, description, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--fsl-dark-blue)]">{title}</h2>
            <p className="mt-1.5 flex-1 text-sm text-gray-500 leading-relaxed">{description}</p>
            <span className="mt-4 flex items-center text-xs font-medium text-[var(--fsl-dark-blue)] group-hover:underline">
              Open
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
