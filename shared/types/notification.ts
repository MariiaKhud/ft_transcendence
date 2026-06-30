
import type { ISODateTime } from './api'

// Kinds of notifications in the app.
export type NotificationType =
  | 'FOLLOWED'
  | 'COMMENT'
  | 'LIKE'
  | 'CONTENT_REMOVED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'

// Notification record.
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  refId: string | null
  isRead: boolean
  createdAt: ISODateTime
}

// Payload to mark notification as read.
export interface MarkNotificationAsReadRequest {
  notificationId: string
}
