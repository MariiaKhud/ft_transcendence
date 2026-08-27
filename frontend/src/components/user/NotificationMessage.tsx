import { useTranslation } from 'react-i18next'
import type { Notification } from '@/hooks/useNotifications'
import {
  getNotificationActionState,
  getNotificationText,
  type NotificationActionState,
} from '@/lib/notification-display'

interface NotificationMessageProps {
  notif: Notification
  actionResult?: NotificationActionState
  actorClassName?: string
}

export function NotificationMessage({
  notif,
  actionResult,
  actorClassName = 'font-medium',
}: NotificationMessageProps) {
  const { t } = useTranslation()
  const resolvedState = getNotificationActionState(notif, actionResult)
  const message = resolvedState === 'accepted'
    ? t('notification.types.nowFriends')
    : resolvedState === 'declined'
      ? t('notification.types.friendRequestDeclined')
      : getNotificationText(t, notif)

  if (notif.type === 'CONTENT_REMOVED') return message

  return (
    <>
      <span className={actorClassName}>
        {notif.actor?.displayName ?? notif.actor?.username ?? t('notification.someone')}
      </span>{' '}
      {message}
    </>
  )
}
