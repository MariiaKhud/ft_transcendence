import { useEffect } from 'react'
import { connectSocket, getSocket } from '@/lib/socket'
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
    if (userId) {
      const heartbeat = () => {
        if (socket.connected) socket.emit('presence:heartbeat')
      }

      heartbeat()
      heartbeatTimer = window.setInterval(heartbeat, 30_000)
    }

    return () => {
      socket.off('connect_error', onConnectError)
      if (heartbeatTimer) window.clearInterval(heartbeatTimer)
    }
  }, [userId, hasRestoredSession])
}
