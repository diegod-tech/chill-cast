import io from 'socket.io-client'

let socket = null

export const initSocket = () => {
  const token = localStorage.getItem('authToken');

  if (socket) {
    // If token changed (e.g. user logged in), update auth and reconnect
    if (socket.auth && socket.auth.token !== token) {
      console.log("🔄 Updating socket auth token...");
      socket.auth.token = token;
      socket.disconnect().connect();
    } else if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  return socket
}

export const getSocket = () => {
  return initSocket()
}

export const disconnectSocket = () => {
  if (socket) {
    if (socket.connected) socket.disconnect()
    socket = null
  }
}
