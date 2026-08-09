import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--fsl-orange)] text-white hover:bg-[#c45410] focus-visible:ring-[var(--fsl-orange)]',
        outline:
          'border border-[var(--fsl-light-blue)] bg-transparent text-[var(--fsl-dark-blue)] hover:bg-[var(--fsl-gray)] focus-visible:ring-[var(--fsl-light-blue)]',
        ghost:
          'bg-transparent text-[var(--fsl-dark-blue)] hover:bg-[var(--fsl-gray)] focus-visible:ring-[var(--fsl-light-blue)]',
        destructive:
          'bg-[var(--status-red)] text-white hover:bg-red-700 focus-visible:ring-[var(--status-red)]',
        link:
          'text-[var(--fsl-bright-blue)] underline-offset-4 hover:underline bg-transparent p-0 h-auto focus-visible:ring-[var(--fsl-bright-blue)]',
        secondary:
          'bg-[var(--fsl-dark-blue)] text-white hover:bg-[var(--fsl-mid-blue)] focus-visible:ring-[var(--fsl-dark-blue)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
