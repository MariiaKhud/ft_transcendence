import { useEffect, useState } from 'react'
import { getLeaderboard } from '@/api/leaderboard'

const TOP_RANK_COUNT = 3

// Module-level cache so every UserAvatar on a page shares one leaderboard
// fetch instead of each firing its own request.
let cachedRanks: Map<string, number> | null = null
let pendingFetch: Promise<Map<string, number>> | null = null

const fetchTopRanks = async (): Promise<Map<string, number>> => {
  if (cachedRanks) return cachedRanks
  if (!pendingFetch) {
    pendingFetch = getLeaderboard()
      .then((users) => {
        const ranks = new Map<string, number>()
        users.slice(0, TOP_RANK_COUNT).forEach((user, index) => {
          ranks.set(user.id, user.rank ?? index + 1)
        })
        cachedRanks = ranks
        return ranks
      })
      .finally(() => {
        pendingFetch = null
      })
  }
  return pendingFetch
}

// Map of userId -> leaderboard rank, for the top 3 users only. Used to draw
// a gold/silver/bronze frame on their avatar anywhere it appears.
export const useTopRanks = () => {
  const [ranks, setRanks] = useState<Map<string, number>>(cachedRanks ?? new Map())

  useEffect(() => {
    if (cachedRanks) {
      setRanks(cachedRanks)
      return
    }

    let isMounted = true
    void fetchTopRanks().then((result) => {
      if (isMounted) setRanks(result)
    })

    return () => {
      isMounted = false
    }
  }, [])

  return ranks
}
