'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email:    z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router             = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)

    const result = await signIn('credentials', {
      email:       values.email.trim().toLowerCase(),
      password:    values.password,
      callbackUrl: '/',
      redirect:    false,
    })

    if (result?.error) {
      setServerError('Invalid email or password. Please try again.')
      return
    }

    if (result?.url) {
      router.push(result.url)
    } else {
      router.push('/')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Sign in form"
      className="w-full max-w-sm"
    >
      {/* Email */}
      <div className="mb-5">
        <label
          htmlFor="login-email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
          className={`w-full rounded-md border px-3 py-2.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
            errors.email
              ? 'border-[var(--status-red)] focus:ring-[var(--status-red)]/30'
              : 'border-gray-300 focus:border-[var(--fsl-bright-blue)] focus:ring-[var(--fsl-bright-blue)]/20'
          }`}
          placeholder="you@firstsource.com"
        />
        {errors.email && (
          <p id="login-email-error" role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[var(--status-red)]">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="mb-6">
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
            className={`w-full rounded-md border px-3 py-2.5 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-[var(--status-red)] focus:ring-[var(--status-red)]/30'
                : 'border-gray-300 focus:border-[var(--fsl-bright-blue)] focus:ring-[var(--fsl-bright-blue)]/20'
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw
              ? <EyeOff className="h-4 w-4" aria-hidden="true" />
              : <Eye    className="h-4 w-4" aria-hidden="true" />
            }
            <span className="sr-only">{showPw ? 'Hide' : 'Show'} password</span>
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[var(--status-red)]">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--status-red)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--fsl-orange)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--fsl-orange)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Action:</span>
            Sign In
          </>
        )}
      </button>
    </form>
  )
}
