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
      console.error('Socket Auth failed:', error.code)
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.uid} (${socket.id})`)
    const { uid, name, picture } = socket.user
    let userRoomId = null;

    const handleRoomCleanup = async () => {
      if (!userRoomId) return
      const roomId = userRoomId

      try {
        const roomRef = db.collection('rooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (roomDoc.exists) {
          const roomData = roomDoc.data()
          const participants = roomData.participants || []
          const updatedParticipants = participants.filter(p => p.userId !== uid)

          const updates = { participants: updatedParticipants }

          if (roomData.presenterId === uid) {
            updates.isScreenSharing = false
            updates.presenterId = null
            io.to(roomId).emit('screenShareStopped', { senderUserId: uid })
          }

          await roomRef.update(updates)
          io.to(roomId).emit('updateParticipants', updatedParticipants)
        }
      } catch (err) {
        console.error('Room cleanup error:', err)
      }
    }

    /**
     * Join a room
     */
    socket.on('joinRoom', async (data) => {
      const { roomId } = data
      userRoomId = roomId;
      socket.join(roomId)

      try {
        const roomRef = db.collection('rooms').doc(roomId)
        const roomDoc = await roomRef.get()

        if (!roomDoc.exists) {
          socket.emit('error', { message: 'Room not found' })
          return;
        }

        const roomData = roomDoc.data();
        console.log(`🤝 [Socket Join] User: ${uid} | Room: ${roomId} | Host: ${roomData.hostId}`)
        const existingParticipants = roomData.participants || [];
        const isAlreadyInRoom = existingParticipants.some(p => p.userId === uid);

        if (!isAlreadyInRoom) {
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

          // Send room state to user with new participant included
          socket.emit('roomJoined', {
            roomId,
            room: roomData,
            participants: [...existingParticipants, participant]
          })
        } else {
          // User already in room, just send state
          socket.emit('roomJoined', {
            roomId,
            room: roomData,
            participants: existingParticipants
          })
        }

      } catch (error) {
        console.error('Join room error:', error)
        socket.emit('error', { message: 'Failed to join room' })
      }
    })

    /**
     * Leave a room
     */
    socket.on('leaveRoom', async () => {
      await handleRoomCleanup()
      if (userRoomId) {
        socket.leave(userRoomId)
        userRoomId = null
      }
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
     * Netflix Sync (Extension)
     */
    socket.on('netflix_sync', (data) => {
      const { roomId, action, time } = data
      // Broadcast to others in the room
      socket.to(roomId).emit('netflix_sync', {
        action,
        time,
        userId: uid,
        userName: name
      })
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

    // Every user joins their own private room for direct signaling (1-to-1 WebRTC)
    socket.join(uid);

    /**
     * Request screen share - Notify others that I want to share
     */
    socket.on('requestScreenShare', async (data) => {
      const { roomId } = data

      try {
        await db.collection('rooms').doc(roomId).update({
          isScreenSharing: true,
          presenterId: uid
        });
      } catch (e) {
        console.error("Failed to update screen share state in DB", e);
      }

      // Broadcast to room that this user is presenting
      io.to(roomId).emit('screenShareStarted', {
        senderUserId: uid,
        presenterName: name
      })
    })

    socket.on('webrtc_offer', (data) => {
      const { targetUserId, offer, roomId } = data;
      io.to(targetUserId).emit('webrtc_offer', {
        senderUserId: uid,
        offer
      })
    })

    socket.on('webrtc_answer', (data) => {
      const { targetUserId, answer, roomId } = data;
      io.to(targetUserId).emit('webrtc_answer', {
        senderUserId: uid,
        answer
      })
    })

    socket.on('webrtc_ice_candidate', (data) => {
      const { targetUserId, candidate, roomId } = data;
      io.to(targetUserId).emit('webrtc_ice_candidate', {
        senderUserId: uid,
        candidate
      })
    })

    socket.on('stopScreenShare', async (data) => {
      const { roomId } = data

      try {
        await db.collection('rooms').doc(roomId).update({
          isScreenSharing: false,
          presenterId: null
        });
      } catch (e) {
        console.error("Failed to clear screen share state in DB", e);
      }

      io.to(roomId).emit('screenShareStopped', {
        senderUserId: uid,
      })
    })

    /**
     * User disconnect - Cleanup Firestore state
     */
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${uid}`)
      await handleRoomCleanup()
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  })
}

export default { initializeSocket }
