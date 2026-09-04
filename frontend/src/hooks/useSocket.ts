import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'

export function useSocket() {
  const { currentUser } = useAuth()

  useEffect(() => {
    const socket = getSocket()

    if (!currentUser) {
      disconnectSocket()
      return
    }

    const onConnectError = (err: Error) => {
      console.error('[socket client] CONNECT ERROR', err.message)
    }

    socket.on('connect_error', onConnectError)
    connectSocket()

    const heartbeat = () => {
      if (socket.connected) socket.emit('presence:heartbeat')
    }

    heartbeat()
    const heartbeatTimer = window.setInterval(heartbeat, 30_000)

    return () => {
      socket.off('connect_error', onConnectError)
      window.clearInterval(heartbeatTimer)
    }
  }, [currentUser])
}
