import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[var(--fsl-light-blue)] bg-white px-3 py-2 text-sm text-[var(--fsl-dark-blue)] placeholder:text-[var(--status-gray)] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--fsl-dark-blue)] focus:ring-offset-1 focus:border-[var(--fsl-dark-blue)]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--fsl-gray)]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
