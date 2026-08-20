import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiRequest } from '@/api/client'

const PING_INTERVAL = 60_000 // 60 seconds

async function pingOnline() {
  await apiRequest('/users/me/online', {
    method: 'PATCH',
    fallbackMessage: 'Failed to update online status',
  })
}

export function useOnlineStatus() {
  const { currentUser } = useAuth()

  useEffect(() => {
    // Only ping when logged in
    if (!currentUser) return

    // Ping immediately on mount
    void pingOnline().catch(() => {})

    // Then every 60 seconds
    const interval = setInterval(() => {
      void pingOnline().catch(() => {})
    }, PING_INTERVAL)

    return () => clearInterval(interval)
  }, [currentUser])
}
