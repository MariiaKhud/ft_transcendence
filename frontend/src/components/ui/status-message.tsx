import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatusMessageProps {
  tone: 'error' | 'success'
  children: ReactNode
  className?: string
}

const toneClasses = {
  error: 'border-red-200/50 bg-red-50/80 text-red-600',
  success: 'border-green-200/50 bg-green-50/80 text-green-600',
} as const

export function StatusMessage({ tone, children, className }: StatusMessageProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-4 py-3 text-sm font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </p>
  )
}
