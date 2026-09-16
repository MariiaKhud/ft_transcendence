import type { UserRole } from '@shared/types/user'

export type AdminUser = {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: string
  articleCount: number
}

export type AdminArticle = {
  id: string
  title: string
  category: string
  likeCount: number
  isRemoved: boolean
  removedReason: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
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
  removedAt: string | null
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}