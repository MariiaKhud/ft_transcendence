import type { TFunction } from 'i18next'
import type { Notification } from '@/hooks/useNotifications'

export type NotificationActionState = 'accepted' | 'declined' | undefined

export function getNotificationActionState(
  notif: Notification,
  actionResult?: NotificationActionState,
): NotificationActionState {
  return actionResult ?? (
    notif.type === 'FRIEND_ACCEPTED' && notif.message === 'is now your friend'
      ? 'accepted'
      : notif.message === 'friend request declined'
        ? 'declined'
        : undefined
  )
}

export function notificationIcon(type: string): string {
  const icons: Record<string, string> = {
    FRIEND_REQUEST: '👋',
    FRIEND_ACCEPTED: '🤝',
    FOLLOWED: '➕',
    COMMENT: '💬',
    MESSAGE: '💬',
    LIKE: '❤️',
    CONTENT_REMOVED: '🚫',
  }
  return icons[type] ?? '🔔'
}

export function getNotificationText(t: TFunction, notif: Notification): string {
  switch (notif.type) {
    case 'FOLLOWED':
      return t('notification.types.followed')

    case 'FRIEND_REQUEST':
      return notif.message === 'friend request declined'
        ? t('notification.types.friendRequestDeclined')
        : t('notification.types.friendRequest')

    case 'FRIEND_ACCEPTED':
      return notif.message === 'is now your friend'
        ? t('notification.types.nowFriends')
        : t('notification.types.friendAccepted')

    case 'MESSAGE':
      return t('notification.types.message')

    case 'COMMENT':
    case 'LIKE': {
      const title = notif.message.match(/"([^"]*)"/)?.[1] ?? ''
      return t(
        `notification.types.${notif.type === 'COMMENT' ? 'comment' : 'like'}`,
        { title },
      )
    }

    case 'CONTENT_REMOVED': {
      const titleMatch = notif.message.match(/"([^"]*)"/)
      return titleMatch
        ? t('notification.types.contentRemovedArticle', { title: titleMatch[1] })
        : t('notification.types.contentRemovedComment')
    }

    default:
      return notif.message
  }
}

export function formatNotificationTime(dateStr: string, t: TFunction): string {
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
  return date.toLocaleDateString()
}
