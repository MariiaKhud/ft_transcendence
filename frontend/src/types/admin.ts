import type { UserRole } from '@shared/types/user'

export type AdminUser = {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: Date
  articleCount: number
}

export type AdminArticle = {
  id: string
  title: string
  category: string
  likeCount: number
  isRemoved: boolean
  removedReason: string | null
  removedAt: Date | null
  createdAt: Date
  updatedAt: Date
  commentsCount: number
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export type AdminComment = {
  id: string
  content: string
  isRemoved: boolean
  removedReason: string | null
  removedAt: Date | null
  createdAt: Date
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}