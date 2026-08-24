import { useEffect } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'

export function useSocket() {
  const { currentUser } = useAuth()

  useEffect(() => {
    if (!currentUser) {
      disconnectSocket()
      return
    }

    connectSocket()

    const socket = getSocket()

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason)
    })

    socket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err.message)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
    }
  }, [currentUser])
}
