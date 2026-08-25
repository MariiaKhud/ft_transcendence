import type { UserRole } from '@shared/types/user'

export interface AdminArticle {
  id: string
  title: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  author?: {
    username: string
  }
}

export interface AdminComment {
  id: string
  content: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  author?: {
    username: string
  }
}

export interface AdminUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  articleCount: number
  createdAt: string
}