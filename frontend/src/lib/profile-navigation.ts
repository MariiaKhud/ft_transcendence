import type { NavigateFunction } from 'react-router-dom'
import type { Notification } from '@/hooks/useNotifications'

export function goToProfile(
  navigate: NavigateFunction,
  username?: string | null,
): void {
  if (!username) return
  navigate(`/profile/${username}`)
}

export function navigateToNotification(
  navigate: NavigateFunction,
  notif: Notification,
): void {
  switch (notif.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
    case 'FOLLOWED':
    case 'BADGE':
    case 'LEVEL_UP':
      goToProfile(navigate, notif.actor?.username)
      break

    case 'ARTICLE_CREATED':
      if (notif.refId) navigate(`/articles/${notif.refId}`)
      break

    case 'MESSAGE':
      if (notif.actor?.username) {
        navigate(`/chat/${encodeURIComponent(notif.actor.username)}`)
      }
      break

    case 'COMMENT':
    case 'LIKE':
      if (notif.refId) navigate(`/articles/${notif.refId}`)
      break

    case 'CONTENT_REMOVED':
      navigate('/notifications')
      break

    default:
      break
  }
}
