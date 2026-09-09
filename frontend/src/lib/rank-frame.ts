// Avatar frame styling for the top 3 leaderboard ranks (gold/silver/bronze).
const RANK_RING_COLORS: Record<number, string> = {
  1: 'ring-amber-400',
  2: 'ring-slate-300',
  3: 'ring-orange-500',
}

// Tailwind ring classes for a rank's medal color, or '' outside the top 3.
// `thickness` lets small avatars (chat, search results) use a thinner ring
// than large ones (profile header, leaderboard rows).
export const getRankFrameClass = (rank: number | undefined, thickness: 'thin' | 'thick' = 'thick') => {
  if (!rank) return ''
  const color = RANK_RING_COLORS[rank]
  if (!color) return ''
  const ringWidth = thickness === 'thin' ? 'ring-2' : 'ring-[3px]'
  return `${ringWidth} ${color} ring-offset-2 ring-offset-transparent`
}
