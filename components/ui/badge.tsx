import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--fsl-dark-blue)] text-white hover:bg-[var(--fsl-mid-blue)]',
        secondary:
          'border-transparent bg-[var(--fsl-light-blue)] text-[var(--fsl-dark-blue)] hover:bg-[var(--fsl-light-blue)]/80',
        destructive:
          'border-transparent bg-[var(--status-red)] text-white hover:bg-red-700',
        outline:
          'border-[var(--fsl-light-blue)] text-[var(--fsl-dark-blue)] bg-transparent',
        success:
          'border-transparent bg-[var(--status-green)] text-white',
        warning:
          'border-transparent bg-[var(--status-amber)] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
