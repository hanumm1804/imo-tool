'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Settings, ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { Role } from '@/types'

const NAV_LINKS = [
  { label: 'Dashboard',       href: '/'           },
  { label: 'Deals',           href: '/deals'      },
  { label: 'Reports',         href: '/reports'    },
  { label: 'Framework',       href: '/framework'  },
  { label: 'User Guidelines', href: '/guidelines' },
] as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last  = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN:           'Admin',
    IMO_LEAD:        'IMO Lead',
    WORKSTREAM_LEAD: 'WS Lead',
    CONTRIBUTOR:     'Contributor',
    VIEWER:          'Viewer',
  }
  return labels[role] ?? role
}

function FirstsourceLogo() {
  return (
    <div className="flex self-stretch items-center bg-white px-2">
      <Image
        src="/FSL-Logo_1.png"
        alt="Firstsource"
        width={130}
        height={36}
        priority
        className="object-contain"
      />
    </div>
  )
}

export function TopNav() {
  const pathname              = usePathname()
  const { data: session }     = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  const user = session?.user

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="fsl-gradient sticky top-0 z-50 flex h-14 items-center justify-between px-6 shadow-md"
      aria-label="Main navigation"
    >
      {/* Left: Logo + IMO label */}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Firstsource IMO Tool — home">
          <FirstsourceLogo />
        </Link>
        <span className="border-l border-white/20 pl-3 text-sm font-bold tracking-widest text-[var(--fsl-orange)]">
          IMO
        </span>
      </div>

      {/* Centre: nav links */}
      <ul className="flex items-center gap-1" role="list">
        {NAV_LINKS.map(({ label, href }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative px-4 py-1.5 text-sm font-medium transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                  active
                    ? 'text-white after:absolute after:bottom-[-4px] after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-[var(--fsl-orange)]'
                    : 'text-white/70 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Right: user menu + settings */}
      <div className="flex items-center gap-3">
        {/* Settings (ADMIN only) */}
        {user?.role === ('ADMIN' as Role) && (
          <Link
            href="/admin"
            className="flex items-center rounded p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Admin settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Admin settings</span>
          </Link>
        )}

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {/* Avatar circle */}
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fsl-dark-blue)] text-sm font-bold text-[var(--fsl-orange)] ring-2 ring-[var(--fsl-orange)]/40"
                aria-hidden="true"
              >
                {getInitials(user.name ?? '')}
              </span>

              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold leading-none text-white">
                  {user.name}
                </div>
                <div className="mt-0.5 text-[10px] text-white/60">
                  {getRoleLabel(user.role)}
                </div>
              </div>

              <ChevronDown
                className={`h-3.5 w-3.5 text-white/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                {/* Dropdown */}
                <div
                  role="menu"
                  aria-label="User actions"
                  className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[var(--fsl-gray)]"
                  >
                    <UserIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <span className="sr-only">Navigate to</span>
                    Profile
                  </Link>

                  <hr className="my-1 border-gray-100" />

                  <button
                    role="menuitem"
                    onClick={() => void signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--status-red)] hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
