



export type NotificationType =
  | 'FOLLOWED'
  | 'COMMENT'
  | 'LIKE'
  | 'CONTENT_REMOVED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  refId: string | null
  isRead: boolean
  createdAt: string
}

export interface MarkNotificationAsReadRequest {
  notificationId: string
}
