// User and auth form types.
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN'

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: UserRole
  preferredLanguage: string | null
  xp: number
  level: number
  isOnline: boolean
  lastSeenAt: string
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  username: string
}
