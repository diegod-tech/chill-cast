import io from 'socket.io-client'

let socket = null

export const initSocket = () => {
  if (socket) return socket

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
  
  socket = io(SOCKET_URL, {
    auth: {
      token: localStorage.getItem('authToken'),
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  return socket
}

export const getSocket = () => {
  if (!socket) {
    return initSocket()
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
