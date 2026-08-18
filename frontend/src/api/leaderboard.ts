import { apiRequestData } from '@/api/client'
import type { LeaderboardUser } from '@/types/leaderboard'

export const getLeaderboard = async (): Promise<LeaderboardUser[]> => {
  const data = await apiRequestData<LeaderboardUser[]>('/users/leaderboard', {
    fallbackMessage: 'Unable to load leaderboard',
  })

  return data.slice(0, 50).map((user, index) => ({
    ...user,
    rank: user.rank ?? index + 1,
  }))
}