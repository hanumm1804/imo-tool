import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title:       'Sign In — IMO Tool',
  description: 'Sign in to the Firstsource IMO Tool',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen" aria-label="Sign in page">
      {/* ── Left panel: gradient brand section ───────────────────────── */}
      <section
        className="hidden w-2/5 flex-col items-center justify-center gap-8 p-12 md:flex fsl-gradient"
        aria-label="Brand panel"
      >
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo */}
          <div aria-label="Firstsource logo">
            <Image
              src="/FSL-Logo_1.png"
              alt="Firstsource"
              width={180}
              height={52}
              className="brightness-0 invert"
              priority
            />
          </div>

          {/* Divider */}
          <div className="h-px w-20 bg-white/30" aria-hidden="true" />

          {/* Tagline */}
          <p className="text-xl font-medium italic text-white/90">
            We make it happen!
          </p>

          {/* IMO tool description */}
          <div className="max-w-xs space-y-2 text-sm text-white/70 leading-relaxed">
            <p>
              The IMO Tool provides a centralised hub for managing integration workstreams,
              synergy tracking, and post-merger operations.
            </p>
            <p className="text-white/50 text-xs">
              Powered by the DRIVE framework
            </p>
          </div>
        </div>

        {/* Decorative bottom badge */}
        <div className="mt-auto flex items-center gap-2 rounded-full border border-white/20 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[var(--fsl-orange)]" aria-hidden="true" />
          <span className="text-xs font-medium text-white/60">
            Phase 1 · Demo Build
          </span>
        </div>
      </section>

      {/* ── Right panel: login form ───────────────────────────────────── */}
      <section
        className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-12"
        aria-label="Sign in form panel"
      >
        {/* Mobile logo (shown only on small screens) */}
        <div className="mb-8 md:hidden">
          <span className="text-2xl font-bold text-[var(--fsl-dark-blue)]">
            firstsource
            <span className="ml-2 text-[var(--fsl-orange)]">IMO</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold leading-tight text-[var(--fsl-dark-blue)]">
              Welcome to IMO Tool
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with your Firstsource credentials
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-300 text-center max-w-xs">
          &copy; {new Date().getFullYear()} Firstsource Solutions Ltd.
          All rights reserved.
        </p>
      </section>
    </main>
  )
}
