import type { PublicProfile } from '@/types/profile'

// API response shape for GET /users/:username. This is the same as PublicProfile, but with xp instead of experiencePoints.
export interface PublicProfileApiResponse {
  id: string
  displayName: string | null
  username: string
  avatarUrl: string | null
  cvUrl: string | null
  cvFilename: string | null
  bio: string | null
  isOnline: boolean
  lastSeenAt: string | null
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicProfile['badges']
  level: number
  xp: number
}
