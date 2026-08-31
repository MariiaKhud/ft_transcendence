import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'

export function useSocket() {
  const { currentUser } = useAuth()

  useEffect(() => {
    const socket = getSocket()

    console.log(
      '[socket hook] effect',
      'user:', currentUser?.username ?? 'none',
      'connected:', socket.connected,
      'id:', socket.id
    )

    if (!currentUser) {
      disconnectSocket()
      return
    }

    function onConnect() {
      console.log(
        '[socket client] CONNECTED',
        'id:', socket.id
      )
    }

    function onDisconnect(reason: string) {
      console.log(
        '[socket client] DISCONNECTED',
        'reason:', reason,
        'connected:', socket.connected,
        'id:', socket.id
      )
    }

    function onConnectError(err: Error) {
      console.error(
        '[socket client] CONNECT ERROR',
        err.message
      )
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    connectSocket()

    return () => {
      console.log(
        '[socket hook] cleanup',
        'connected:', socket.connected,
        'id:', socket.id
      )

      // socket.off('connect')
      // socket.off('disconnect')
      // socket.off('connect_error')

      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [currentUser])
}
