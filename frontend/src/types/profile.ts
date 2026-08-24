// Types used by the profile page (profile info, badges, and article list).
export interface PublicProfileBadge {
  id: string
  name: string
  icon: string
}

export interface PublicProfile {
  id: string
  displayName: string | null
  username: string
  avatarUrl: string | null
  bio: string | null
  isOnline?: boolean
  followerCount: number
  followingCount: number
  articleCount: number
  badges: PublicProfileBadge[]
  level: number
  experiencePoints: number
}

export interface ProfileArticle {
  id: string
  title: string
  category: string
  likeCount: number
  createdAt: string
}

export interface ProfileArticlesResponse {
  items: ProfileArticle[]
  isUnavailable: boolean
}
