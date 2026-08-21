import type { NavigateFunction } from 'react-router-dom'

export function goToProfile(
  navigate: NavigateFunction,
  username?: string | null,
): void {
  if (!username) return
  navigate(`/profile/${username}`)
}
