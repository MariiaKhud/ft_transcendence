import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      withCredentials: true,   // sends HttpOnly auth cookie
      autoConnect: false,      // we connect manually when user logs in
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

export function connectSocket() {
  const socket = getSocket()

  console.log(
    '[socket client] connectSocket()',
    'connected:', socket.connected,
    'id:', socket.id
  )

  socket.connect()
}

export function disconnectSocket() {
  const socket = getSocket()

  console.log(
    '[socket client] disconnectSocket()',
    'connected:', socket.connected,
    'id:', socket.id
  )

  socket.disconnect()
}
