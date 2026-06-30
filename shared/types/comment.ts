
import type { ISODateTime } from './api'
import type { UserSummary } from './user'

// Full comment record.
export interface Comment {
  id: string
  articleId: string
  authorId: string
  content: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// Comment with author profile data.
export interface CommentWithAuthor extends Comment {
  author: UserSummary
}

// Payload to create a comment.
export interface CreateCommentRequest {
  articleId: string
  content: string
}

// Payload to edit a comment.
export interface UpdateCommentRequest {
  content: string
}
