import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { TopNav } from '@/components/layout/TopNav'

export default async function MainLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--fsl-gray)]">
      <TopNav />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
