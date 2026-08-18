export interface LeaderboardUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  articleCount: number
  totalLikes: number
  badges: Array<{
    id: string
    name: string
    icon: string
  }>
  level: number
  rank?: number
}