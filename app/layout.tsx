import type { Metadata } from 'next'
import { ReactNode } from 'react'
import '@/styles/globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/shared/Toast'

export const metadata: Metadata = {
  title: {
    default:  'IMO Tool — Firstsource',
    template: '%s — IMO Tool',
  },
  description: 'Integration Management Office Tool for Firstsource post-merger operations',
  robots:      { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans h-full antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
