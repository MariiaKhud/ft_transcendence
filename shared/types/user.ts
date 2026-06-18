
import type { ISODateTime } from './api'

// User roles used for permissions.
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

// Full user record.
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
  lastSeenAt: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// Small user shape for lists and relations.
export interface UserSummary {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  role: UserRole
  level: number
}

// Payload to register a new account.
export interface RegisterRequest {
  email: string
  username: string
  password: string
  displayName?: string
}

// Payload to log in.
export interface LoginRequest {
  email: string
  password: string
}

// User data returned in auth responses.
export interface AuthUser {
  id: string
  email: string
  username: string
  role: UserRole
}

// Cookie-based auth response payload.
export interface AuthResponse {
  user: AuthUser
}

// Public badge shape shown on profile.
export interface PublicUserBadge {
  id: string
  name: string
  icon: string
}

// Public profile data shown to other users.
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
