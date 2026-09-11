import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'

export function useSocket() {
  const { currentUser, hasRestoredSession } = useAuth()
  // Depend on the id, not the whole object: currentUser gets a new reference
  // on any profile update (role, XP, avatar, ...), and none of those should
  // tear down and reconnect the socket — only an actual login/logout/switch
  // of identity should.
  const userId = currentUser?.id ?? null

  useEffect(() => {
    // Wait for the initial session check so a returning logged-in user connects
    // once, already authenticated, instead of briefly connecting as a guest
    // and immediately reconnecting.
    if (!hasRestoredSession) {
      return
    }

    const socket = getSocket()

    const onConnectError = (err: Error) => {
      console.error('[socket client] CONNECT ERROR', err.message)
    }

    socket.on('connect_error', onConnectError)

    // The socket connects regardless of login state — guests get read-only
    // access to public rooms (e.g. the feed). Force a fresh handshake so it
    // picks up the current (or now-absent) auth cookie rather than reusing a
    // stale session from before a login/logout.
    if (socket.connected) {
      socket.disconnect()
    }
    connectSocket()

    let heartbeatTimer: number | undefined
    const startHeartbeat = () => {
      if (!userId) return
      const heartbeat = () => {
        if (socket.connected) socket.emit('presence:heartbeat')
      }
      heartbeat()
      heartbeatTimer = window.setInterval(heartbeat, 30_000)
    }
    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer)
        heartbeatTimer = undefined
      }
    }

    startHeartbeat()

    // Chrome force-closes open WebSocket connections when a page is frozen
    // for the back-forward cache, which logs a spurious connection-failure
    // error on restore. Disconnect cleanly before that happens and reconnect
    // if the page is later restored from bfcache.
    const onPageHide = () => {
      stopHeartbeat()
      disconnectSocket()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        connectSocket()
        startHeartbeat()
      }
    }

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      socket.off('connect_error', onConnectError)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      stopHeartbeat()
    }
  }, [userId, hasRestoredSession])
}
