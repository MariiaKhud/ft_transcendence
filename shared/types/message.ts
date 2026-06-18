
import type { ISODateTime } from './api'
import type { UserSummary } from './user'

// Direct message record.
export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: ISODateTime
}

// Message with sender/receiver user objects.
export interface MessageWithUsers extends Message {
  sender: UserSummary
  receiver: UserSummary
}

// Payload to send a message.
export interface SendMessageRequest {
  receiverId: string
  content: string
}

// Payload to mark message as read.
export interface MarkMessageAsReadRequest {
  messageId: string
}
