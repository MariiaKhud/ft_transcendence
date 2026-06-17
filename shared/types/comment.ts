



// Importing UserSummary type for author information in comments
import type { UserSummary } from './user'

export interface Comment {
  id: string
  articleId: string
  authorId: string
  content: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CommentWithAuthor extends Comment {
  author: UserSummary
}

export interface CreateCommentRequest {
  articleId: string
  content: string
}

export interface UpdateCommentRequest {
  content: string
}
