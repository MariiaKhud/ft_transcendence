/**
 * @file message.ts
 * @description This file defines the TypeScript interfaces for messages in the application, including
 * the Message and MessageWithUsers interfaces, as well as request interfaces for sending messages
 * and marking messages as read.
 */




// Importing UserSummary type for sender and receiver information in messages
import type { UserSummary } from './user'

/**
 * @brief Represents the structure of a message in the application.
 * @interface Message
 * @property {string} id - The unique identifier of the message.
 * @property {string} senderId - The unique identifier of the user who sent the message.
 * @property {string} receiverId - The unique identifier of the user who received the message.
 * @property {string} content - The content of the message.
 * @property {boolean} isRead - Indicates whether the message has been read by the receiver.
 * @property {string} createdAt - The timestamp when the message was created.
 */
export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
}

/**
 * @brief Represents a message along with the sender's and receiver's information.
 * @interface MessageWithUsers
 * @extends Message
 * @property {UserSummary} sender - A summary of the sender's information.
 * @property {UserSummary} receiver - A summary of the receiver's information.
 * @note This interface is useful for displaying messages along with user details in the UI.
 */
export interface MessageWithUsers extends Message {
  sender: UserSummary
  receiver: UserSummary
}

/**
 * @brief Represents the request payload for sending a new message.
 * @interface SendMessageRequest
 * @property {string} receiverId - The unique identifier of the user to whom the message is being sent.
 * @property {string} content - The content of the message to be sent.
 */
export interface SendMessageRequest {
  receiverId: string
  content: string
}

/**
 * @brief Represents the request payload for marking a message as read.
 * @interface MarkMessageAsReadRequest
 * @property {string} messageId - The unique identifier of the message to be marked as read.
 */
export interface MarkMessageAsReadRequest {
  messageId: string
}
