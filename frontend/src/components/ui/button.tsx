import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Style options for button look and size.
const buttonVariants = cva(
  'inline-flex \
  items-center \
  justify-center \
  gap-2 \
  whitespace-nowrap \
  font-medium \
  transition-colors \
  disabled:pointer-events-none \
  disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
                  'rounded-md \
                  bg-slate-900 \
                  text-white \
                  hover:bg-slate-800',

        outline:
                  'rounded-md \
                  border \
                  border-slate-300 \
                  bg-white \
                  text-slate-900 \
                  hover:bg-slate-100',

        profile:
                  'rounded-lg \
                  border \
                  border-purple-200 \
                  bg-white/70 \
                  px-4 \
                  py-2 \
                  text-xs \
                  font-semibold \
                  text-purple-700 \
                  transition-all \
                  hover:border-purple-300 \
                  hover:bg-white \
                  sm:px-5 \
                  sm:text-sm',

        profileSecondary:
                  'rounded-lg \
                  border \
                  border-purple-200 \
                  bg-white/70 \
                  px-4 \
                  py-2 \
                  text-xs \
                  font-semibold \
                  text-purple-700 \
                  transition-all \
                  hover:border-fuchsia-400 \
                  hover:bg-fuchsia-100 \
                  hover:text-fuchsia-600 \
                  sm:px-5 \
                  sm:text-sm',

        profileSuccess:
                  'rounded-lg \
                  border \
                  border-emerald-200 \
                  bg-emerald-50 \
                  px-4 \
                  py-2 \
                  text-xs \
                  font-semibold \
                  text-emerald-700 \
                  transition-all \
                  hover:border-emerald-300 \
                  hover:bg-emerald-100 \
                  hover:text-emerald-800 \
                  sm:px-5 \
                  sm:text-sm',

        destructive:
                  'rounded-lg \
                  border \
                  border-red-200 \
                  bg-red-50/70 \
                  px-4 \
                  py-2 \
                  text-xs \
                  font-semibold \
                  text-red-600 \
                  transition-all \
                  hover:border-red-300 \
                  hover:bg-red-100 \
                  sm:px-5 \
                  sm:text-sm',
      },

      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        notification: 'px-3 py-1 text-xs',
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
