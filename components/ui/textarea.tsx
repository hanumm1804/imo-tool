import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-[var(--fsl-light-blue)] bg-white px-3 py-2 text-sm text-[var(--fsl-dark-blue)] placeholder:text-[var(--status-gray)] transition-colors resize-y',
          'focus:outline-none focus:ring-2 focus:ring-[var(--fsl-dark-blue)] focus:ring-offset-1 focus:border-[var(--fsl-dark-blue)]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--fsl-gray)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
