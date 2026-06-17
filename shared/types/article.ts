



// Importing UserSummary type for author information in articles
import type { UserSummary } from './user'

export type ArticleCategory =
  | 'PROGRAMMING'
  | 'CAREER'
  | 'STUDY_NOTES'
  | 'PROJECTS'
  | 'LIFE'
  | 'OPINION'

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

export interface ArticleSummary {
  id: string
  title: string
  category: ArticleCategory
  likeCount: number
  createdAt: string
  updatedAt: string
  author: UserSummary
}

export interface ArticleDetails extends Article {
  author: UserSummary
  commentsCount: number
  likedByCurrentUser?: boolean
}

export interface CreateArticleRequest {
  title: string
  content: string
  category: ArticleCategory
}

export interface UpdateArticleRequest {
  title?: string
  content?: string
  category?: ArticleCategory
}
