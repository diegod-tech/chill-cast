import { auth, db } from '../config/firebase.js'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Socket.IO event handlers for real-time communication
 */
export const initializeSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error'))
    }

    try {
      const decodedToken = await auth.verifyIdToken(token)
      socket.user = {
        uid: decodedToken.uid,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        picture: decodedToken.picture
      }
      next()
    } catch (error) {
      // Allow anonymous/guest if needed, but for now strict
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.uid} (${socket.id})`)
    const { uid, name, picture } = socket.user

    /**
     * Join a room
     */
    socket.on('joinRoom', async (data) => {
      const { roomId } = data
      socket.join(roomId)

      try {
        const roomRef = db.collection('rooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
          socket.emit('error', { message: 'Room not found' })
          return;
        }

        // Add user to participants list in Firestore
        // Note: Ideally efficient to use a subcollection for scalable participants
        // But for small rooms, arrayUnion is okay
        const participant = {
          userId: uid,
          name: name,
          avatar: picture || '',
          joinedAt: new Date().toISOString()
        }

        await roomRef.update({
          participants: FieldValue.arrayUnion(participant)
        })

        // Broadcast to others
        socket.to(roomId).emit('userJoined', {
          userId: uid,
          name: name,
          avatar: picture,
          message: `${name} joined the room`
        })

        // Send room state to user
        socket.emit('roomJoined', {
          roomId,
          room: roomDoc.data(),
          participants: [...(roomDoc.data().participants || []), participant]
        })

      } catch (error) {
        console.error('Join room error:', error)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    /**
     * Leave a room
     */
    socket.on('leaveRoom', async (data) => {
      const { roomId } = data
      socket.leave(roomId)

      // Remove from Firestore (complex with arrayRemove needing exact object, 
      // simplified here by assuming client handles disconnection logic or we do a periodic cleanup)
      // For now, just notify
      io.to(roomId).emit('userLeft', {
        userId: uid,
        message: `${name} left the room`
      })
    })

    /**
     * Sync playback (play/pause/seek)
     */
    socket.on('syncPlayback', async (data) => {
      const { roomId, state } = data

      // Persist to Firestore
      try {
        await db.collection('rooms').doc(roomId).update({
          playbackState: {
            ...state,
            lastSyncTime: new Date().toISOString()
          }
        })
      } catch (e) {
        console.error("Failed to sync playback state to DB", e)
      }

      // Broadcast to all users in room (including sender if needed, but usually sender updates locally)
      // Excluding sender to prevent loop if client implementation requires
      socket.to(roomId).emit('playbackSync', state)
    })

    /**
     * Send chat message
     */
    socket.on('sendMessage', async (data) => {
      const { roomId, message } = data

      try {
        const messageData = {
          roomId,
          senderId: uid,
          senderName: name,
          senderAvatar: picture || '',
          content: message.content,
          messageType: message.messageType || 'text',
          createdAt: new Date().toISOString()
        }

        // Save to Firestore subcollection 'messages'
        const msgRef = await db.collection('rooms').doc(roomId).collection('messages').add(messageData)

        // Broadcast to all in room
        io.to(roomId).emit('newMessage', {
          id: msgRef.id,
          ...messageData
        })
      } catch (error) {
        console.error('Send message error:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    /**
     * Typing indicator
     */
    socket.on('userTyping', (data) => {
      const { roomId, isTyping } = data
      socket.to(roomId).emit('userTyping', {
        userId: uid,
        isTyping,
      })
    })

    /**
     * Send emoji reaction
     */
    socket.on('sendReaction', (data) => {
      const { roomId, emoji } = data
      io.to(roomId).emit('reaction', {
        userId: uid,
        emoji,
        timestamp: new Date(),
      })
    })

    // --- WebRTC Signaling ---

    /**
     * Request screen share - Notify others that I want to share
     */
    socket.on('requestScreenShare', (data) => {
      const { roomId } = data
      // Broadcast to room that this user is presenting
      io.to(roomId).emit('screenShareStarted', {
        presenterId: uid,
        presenterName: name
      })
    })

    /**
     * WebRTC Offer
     * Payload: { targetUserId, offer, roomId }
     */
    socket.on('offer', (data) => {
      const { targetUserId, offer } = data;
      // Emit to specific user if possible, or broadcast to room with target check on client
      // Socket.IO doesn't easily map uid to socketId without a map.
      // For simplicity, broadcast to room, client filters by targetUserId.
      // Better: join a room per user ID (socket.join(uid))
    });
    // Let's implement socket.join(uid) on connection
    socket.join(uid);

    socket.on('webrtc_offer', (data) => {
      const { targetUserId, offer, roomId } = data;
      io.to(targetUserId).emit('webrtc_offer', {
        senderId: uid,
        offer
      })
    })

    socket.on('webrtc_answer', (data) => {
      const { targetUserId, answer, roomId } = data;
      io.to(targetUserId).emit('webrtc_answer', {
        senderId: uid,
        answer
      })
    })

    socket.on('webrtc_ice_candidate', (data) => {
      const { targetUserId, candidate, roomId } = data;
      io.to(targetUserId).emit('webrtc_ice_candidate', {
        senderId: uid,
        candidate
      })
    })

    socket.on('stopScreenShare', (data) => {
      const { roomId } = data
      io.to(roomId).emit('screenShareStopped', {
        presenterId: uid,
      })
    })

    /**
     * User disconnect
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${uid}`)
      // Here we could handle marking user offline in DB
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })
}

export default { initializeSocket }
