import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const GlassPanel = ({ children, className, ...props }: GlassPanelProps) => (
  <div
    className={cn('rounded-2xl \
                   border \
                   border-white/30 \
                   bg-white/40 \
                   p-8 \
                   shadow-xl \
                   backdrop-blur-md', className)}
    {...props}
  >
    {children}
  </div>
)
