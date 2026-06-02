/**
 * @file article.ts
 * @description This file defines the TypeScript interfaces for articles in the application, including
 * the Article, ArticleSummary, and ArticleDetails interfaces, as well as request interfaces for
 * creating and updating articles.
 */




// Importing UserSummary type for author information in articles
import type { UserSummary } from './user'

/**
 * @brief Represents the category of an article.
 * @enum {string}
 */
export type ArticleCategory =
  | 'PROGRAMMING'
  | 'CAREER'
  | 'STUDY_NOTES'
  | 'PROJECTS'
  | 'LIFE'
  | 'OPINION'

/**
 * @brief Represents the structure of an article in the application.
 * @interface Article
 * @property {string} id - The unique identifier of the article.
 * @property {string} authorId - The unique identifier of the author of the article.
 * @property {string} title - The title of the article.
 * @property {string} content - The content of the article.
 * @property {ArticleCategory} category - The category to which the article belongs.
 * @property {number} likeCount - The number of likes the article has received.
 * @property {boolean} isRemoved - Indicates whether the article has been removed.
 * @property {string | null} removedReason - The reason for removal, if applicable.
 * @property {string | null} removedAt - The timestamp when the article was removed, if applicable.
 * @property {string} createdAt - The timestamp when the article was created.
 * @property {string} updatedAt - The timestamp when the article was last updated.
 */
export interface Article {
  id: string
  authorId: string
  title: string
  content: string
  category: ArticleCategory
  likeCount: number
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * @brief Represents a summary of an article's information, typically used in lists or references.
 * @interface ArticleSummary
 * @property {string} id - The unique identifier of the article.
 * @property {string} title - The title of the article.
 * @property {ArticleCategory} category - The category to which the article belongs.
 * @property {number} likeCount - The number of likes the article has received.
 * @property {string} createdAt - The timestamp when the article was created.
 * @property {string} updatedAt - The timestamp when the article was last updated.
 * @property {UserSummary} author - A summary of the author's information.
 */
export interface ArticleSummary {
  id: string
  title: string
  category: ArticleCategory
  likeCount: number
  createdAt: string
  updatedAt: string
  author: UserSummary
}

/**
 * @brief Represents detailed information about an article, including the author's information and
 * the number of comments.
 * @interface ArticleDetails
 * @extends Article
 * @property {UserSummary} author - A summary of the author's information.
 * @property {number} commentsCount - The number of comments associated with the article.
 * @property {boolean} [likedByCurrentUser] - Indicates whether the current user has liked the article.
 */
export interface ArticleDetails extends Article {
  author: UserSummary
  commentsCount: number
  likedByCurrentUser?: boolean
}

/**
 * @brief Represents the request payload for creating a new article.
 * @interface CreateArticleRequest
 * @property {string} title - The title of the article to be created.
 * @property {string} content - The content of the article to be created.
 * @property {ArticleCategory} category - The category to which the article belongs.
 */
export interface CreateArticleRequest {
  title: string
  content: string
  category: ArticleCategory
}

/**
 * @brief Represents the request payload for updating an existing article.
 * @interface UpdateArticleRequest
 * @property {string} [title] - The new title of the article, if it is being updated.
 * @property {string} [content] - The new content of the article, if it is being updated.
 * @property {ArticleCategory} [category] - The new category of the article, if it is being updated.
 * @note All fields in this interface are optional, allowing for partial updates to the article.
 */
export interface UpdateArticleRequest {
  title?: string
  content?: string
  category?: ArticleCategory
}
