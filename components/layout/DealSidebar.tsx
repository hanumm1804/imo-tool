'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  GanttChart,
  Users,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  BookOpen,
  Folder,
  Settings2,
  ChevronLeft,
} from 'lucide-react'

interface SidebarItem {
  label:     string
  href:      string
  Icon:      React.ElementType
  badge?:    'actions' | 'risks' | 'decisions'
  divider?:  boolean
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Executive Summary',  href: '',                 Icon: LayoutDashboard },
  { label: 'Synergy Tracker',    href: '/synergy-tracker', Icon: TrendingUp },
  { label: 'Deal Summary',       href: '/deal-summary',    Icon: FileText },
  { label: 'Project Plan',       href: '/project-plan',    Icon: GanttChart },
  { label: 'Resources',          href: '/resources',       Icon: Users },
  { label: 'Actions Log',        href: '/actions-log',     Icon: CheckSquare,   badge: 'actions' },
  { label: 'Risks Log',          href: '/risks-log',       Icon: AlertTriangle, badge: 'risks' },
  { label: 'Decisions Log',      href: '/decisions-log',   Icon: BookOpen,      badge: 'decisions' },
  { label: 'Documents',          href: '/documents',       Icon: Folder },
]

const SETTINGS_ITEM: SidebarItem = {
  label: 'Deal Settings',
  href:  '/settings',
  Icon:  Settings2,
  divider: true,
}

interface BadgeCounts {
  actions:   number
  risks:     number
  decisions: number
  highRisks: number
}

interface DealSidebarProps {
  dealId:   string
  dealName: string
}

export function DealSidebar({ dealId, dealName }: DealSidebarProps) {
  const pathname = usePathname()
  const [counts, setCounts] = useState<BadgeCounts>({
    actions:   0,
    risks:     0,
    decisions: 0,
    highRisks: 0,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCounts() {
      try {
        const [actRes, riskRes, decRes] = await Promise.all([
          fetch(`/api/deals/${dealId}/actions?status=OPEN`, { signal: controller.signal }),
          fetch(`/api/deals/${dealId}/risks?status=OPEN`, { signal: controller.signal }),
          fetch(`/api/deals/${dealId}/decisions?status=OPEN`, { signal: controller.signal }),
        ])

        type CountResponse = { data: { count: number; highCount?: number } }

        const [actJson, riskJson, decJson] = await Promise.all([
          actRes.json()  as Promise<CountResponse>,
          riskRes.json() as Promise<CountResponse>,
          decRes.json()  as Promise<CountResponse>,
        ])

        setCounts({
          actions:   actJson.data?.count   ?? 0,
          risks:     riskJson.data?.count  ?? 0,
          decisions: decJson.data?.count   ?? 0,
          highRisks: riskJson.data?.highCount ?? 0,
        })
      } catch {
        // Ignore AbortError and network errors — badges stay at zero
      }
    }

    void fetchCounts()
    return () => controller.abort()
  }, [dealId])

  function isActive(href: string): boolean {
    const full = `/deals/${dealId}${href}`
    // Exact match for the root deal page
    if (href === '') return pathname === `/deals/${dealId}`
    return pathname.startsWith(full)
  }

  function getBadgeCount(badge: SidebarItem['badge']): number | null {
    if (!badge) return null
    return counts[badge] > 0 ? counts[badge] : null
  }

  function getBadgeClasses(badge: SidebarItem['badge']): string {
    if (badge === 'risks' && counts.highRisks > 0) {
      return 'bg-[var(--status-red)] text-white'
    }
    return 'bg-[var(--fsl-orange)] text-white'
  }

  function renderItem(item: SidebarItem) {
    const href       = `/deals/${dealId}${item.href}`
    const active     = isActive(item.href)
    const badgeCount = getBadgeCount(item.badge)

    return (
      <li key={item.href}>
        <Link
          href={href}
          aria-current={active ? 'page' : undefined}
          className={`group flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fsl-bright-blue)] ${
            active
              ? 'border-l-[3px] border-[var(--fsl-orange)] bg-[var(--fsl-dark-blue)] pl-[9px] text-white'
              : 'text-[var(--fsl-dark-blue)] hover:bg-[var(--fsl-light-blue)]/20'
          }`}
        >
          <item.Icon
            className={`h-4 w-4 flex-shrink-0 ${active ? 'text-white' : 'text-[var(--fsl-dark-blue)]/60 group-hover:text-[var(--fsl-dark-blue)]'}`}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {badgeCount !== null && (
            <span
              className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${getBadgeClasses(item.badge)}`}
              aria-label={`${badgeCount} open ${item.badge}`}
            >
              {badgeCount}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <aside
      className="flex h-full w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-[var(--fsl-gray)]"
      aria-label={`${dealName} navigation`}
    >
      {/* Back to deals list */}
      <div className="border-b border-gray-200 px-3 py-2">
        <Link
          href="/deals"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[var(--fsl-dark-blue)] transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          All Deals
        </Link>
      </div>

      {/* Deal name header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Deal
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--fsl-dark-blue)]" title={dealName}>
          {dealName}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3" aria-label="Deal sections">
        <ul className="space-y-0.5" role="list">
          {SIDEBAR_ITEMS.map(renderItem)}
        </ul>

        <hr className="my-3 border-gray-200" />

        <ul role="list">
          {renderItem(SETTINGS_ITEM)}
        </ul>
      </nav>
    </aside>
  )
}
