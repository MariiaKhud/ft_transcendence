



// Importing UserSummary type for sender and receiver information in messages
import type { UserSummary } from './user'

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
}

export interface MessageWithUsers extends Message {
  sender: UserSummary
  receiver: UserSummary
}

export interface SendMessageRequest {
  receiverId: string
  content: string
}

export interface MarkMessageAsReadRequest {
  messageId: string
}
