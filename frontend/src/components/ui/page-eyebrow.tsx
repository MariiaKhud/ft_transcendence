import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageEyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

export const PageEyebrow = ({ children, className, ...props }: PageEyebrowProps) => (
  <p
    className={cn('text-sm \
                  font-semibold \
                  uppercase \
                  tracking-[0.2em] \
                  text-purple-600', className)}
    {...props}
  >
    {children}
  </p>
)
