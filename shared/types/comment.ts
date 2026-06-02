/**
 * @file comment.ts
 * @description This file defines the TypeScript interfaces for comments in the application, including
 * the Comment interface, CommentWithAuthor interface, and request interfaces for creating and
 * updating comments.
 */




// Importing UserSummary type for author information in comments
import type { UserSummary } from './user'

/**
 * @brief Represents the structure of a comment in the application.
 * @interface Comment
 * @property {string} id - The unique identifier of the comment.
 * @property {string} articleId - The unique identifier of the article to which the comment belongs.
 * @property {string} authorId - The unique identifier of the author of the comment.
 * @property {string} content - The content of the comment.
 * @property {boolean} isRemoved - Indicates whether the comment has been removed.
 * @property {string | null} removedReason - The reason for removal, if applicable.
 * @property {string | null} removedAt - The timestamp when the comment was removed, if applicable.
 * @property {string} createdAt - The timestamp when the comment was created.
 * @property {string} updatedAt - The timestamp when the comment was last updated.
 */
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

/**
 * @brief Represents a comment along with the author's information.
 * @interface CommentWithAuthor
 * @extends Comment
 * @property {UserSummary} author - A summary of the author's information.
 */
export interface CommentWithAuthor extends Comment {
  author: UserSummary
}

/**
 * @brief Represents the request payload for creating a new comment.
 * @interface CreateCommentRequest
 * @property {string} articleId - The unique identifier of the article to which the comment belongs.
 * @property {string} content - The content of the comment to be created.
 */
export interface CreateCommentRequest {
  articleId: string
  content: string
}

/**
 * @brief Represents the request payload for updating an existing comment.
 * @interface UpdateCommentRequest
 * @property {string} content - The new content of the comment to be updated.
 */
export interface UpdateCommentRequest {
  content: string
}
