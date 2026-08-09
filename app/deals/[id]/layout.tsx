import { ReactNode } from 'react'
import { getServerSession } from 'next-auth/next'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DealSidebar } from '@/components/layout/DealSidebar'
import { TopNav } from '@/components/layout/TopNav'
import { Role } from '@/types'
import type { Metadata } from 'next'

interface DealLayoutProps {
  children: ReactNode
  params:   { id: string }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const deal = await prisma.deal.findUnique({
    where:  { id: params.id },
    select: { name: true },
  })
  return { title: deal ? `${deal.name} — IMO Tool` : 'Deal' }
}

export default async function DealLayout({ children, params }: DealLayoutProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const deal = await prisma.deal.findUnique({
    where:  { id: params.id },
    select: {
      id:          true,
      name:        true,
      status:      true,
      overallRag:  true,
      isSensitive: true,
      sensitiveAccessList: {
        select: { userId: true },
      },
    },
  })

  if (!deal) notFound()

  // Sensitive deal access check for VIEWER role
  if (session.user.role === Role.VIEWER && deal.isSensitive) {
    const hasAccess = deal.sensitiveAccessList.some((sa) => sa.userId === session.user.id)
    if (!hasAccess) {
      redirect('/deals?error=forbidden')
    }
  }

  // Deal-team-only users can only access deals they've been added to
  if (session.user.isDealTeamOnly) {
    const allocation = await prisma.resourceAllocation.findFirst({
      where: { dealId: params.id, userId: session.user.id },
      select: { id: true },
    })
    if (!allocation) {
      redirect('/deals?error=forbidden')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--fsl-gray)]">
      <TopNav />
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <DealSidebar dealId={deal.id} dealName={deal.name} />
        <main className="flex-1 overflow-y-auto bg-[var(--fsl-gray)]">
          {children}
        </main>
      </div>
    </div>
  )
}
