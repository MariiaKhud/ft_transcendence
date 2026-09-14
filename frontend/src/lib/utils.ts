import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TFunction } from 'i18next'
import i18n from '@/lib/i18n'
import { formatLocalizedDate } from '@/lib/date-format'

// Join class names and remove Tailwind conflicts.
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

// Reuses the notification.time.* keys — same "5m ago"-style phrasing,
// no reason to duplicate the translations for a second feature.
export function formatLastSeen(dateStr: string, t: TFunction): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('notification.time.justNow')
  if (diffMins < 60) return t('notification.time.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('notification.time.hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('notification.time.daysAgo', { count: diffDays })
  return formatLocalizedDate(dateStr)
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
}
