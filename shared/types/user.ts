



export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

export interface UserSummary {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  level: number
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  displayName?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  username: string
  role: UserRole
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface PublicUserBadge {
  id: string
  name: string
  icon: string
}

export interface PublicUserProfile {
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicUserBadge[]
  level: number
  xp: number
}
