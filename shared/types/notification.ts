/**
 * @file notification.ts
 * @description This file defines the TypeScript interfaces for notifications in the application, including
 * the Notification interface and the MarkNotificationAsReadRequest interface.
 * @brief This file defines the types related to notifications in the application, including the Notification interface and the MarkNotificationAsReadRequest interface.
 */




/**
 * @brief Represents the type of a notification in the application.
 * @enum {string}
 */
export type NotificationType =
  | 'FOLLOWED'
  | 'COMMENT'
  | 'LIKE'
  | 'CONTENT_REMOVED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'

/**
 * @brief Represents the structure of a notification in the application.
 * @interface Notification
 * @property {string} id - The unique identifier of the notification.
 * @property {string} userId - The unique identifier of the user to whom the notification belongs.
 * @property {NotificationType} type - The type of the notification (e.g., FOLLOWED, COMMENT, LIKE).
 * @property {string} message - The content of the notification message.
 * @property {string | null} refId - An optional reference ID related to the notification (e.g., article ID, comment ID).
 * @property {boolean} isRead - Indicates whether the notification has been read by the user.
 * @property {string} createdAt - The timestamp when the notification was created.
 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  refId: string | null
  isRead: boolean
  createdAt: string
}

/**
 * @brief Represents the request payload for marking a notification as read.
 * @interface MarkNotificationAsReadRequest
 * @property {string} notificationId - The unique identifier of the notification to be marked as read.
 */
export interface MarkNotificationAsReadRequest {
  notificationId: string
}
