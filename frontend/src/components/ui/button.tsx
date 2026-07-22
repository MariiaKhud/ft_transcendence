import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Style options for button look and size.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
        profile: 'rounded-full border border-purple-200 bg-white/70 px-4 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-300 hover:bg-white sm:px-5 sm:text-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) => {
  // Use Slot when button wraps another element.
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }

// "flex-shrink-0 rounded-full border border-purple-200 bg-white/70 px-4 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-300 hover:bg-white sm:px-5 sm:text-sm"

