
import type { ISODateTime } from './api'
import type { UserSummary } from './user'

// Allowed article categories.
export type ArticleCategory =
  | 'PROGRAMMING'
  | 'CAREER'
  | 'STUDY_NOTES'
  | 'PROJECTS'
  | 'LIFE'
  | 'OPINION'

// Full article record.
export interface Article {
  id: string
  authorId: string
  title: string
  content: string
  category: ArticleCategory
  likeCount: number
  isRemoved: boolean
  removedReason: string | null
  removedAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// Light article shape for lists.
export interface ArticleSummary {
  id: string
  title: string
  category: ArticleCategory
  likeCount: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  author: UserSummary
}

// Detailed article with extra data.
export interface ArticleDetails extends Article {
  author: UserSummary
  commentsCount: number
  likedByCurrentUser?: boolean
}

// Payload to create a new article.
export interface CreateArticleRequest {
  title: string
  content: string
  category: ArticleCategory
}

// Payload to update an article.
export interface UpdateArticleRequest {
  title?: string
  content?: string
  category?: ArticleCategory
}
