import { db } from '../config/firebase.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Create a new room
 */
export const createRoom = async (req, res) => {
  try {
    const { name, type = 'public' } = req.body
    const { uid } = req.user

    const roomId = uuidv4().substring(0, 8) // Short ID
    const roomRef = db.collection('rooms').doc(roomId)

    // Ensure we don't overwrite (unlikely with UUID but good practice)
    const existing = await roomRef.get()
    if (existing.exists) {
      console.warn(`[Room Creation] Collision or duplicate attempt for ID: ${roomId}`)
      return res.status(409).json({ message: 'Room already exists or ID collision' })
    }

    // Get host info
    const hostDoc = await db.collection('users').doc(uid).get()
    const hostData = hostDoc.exists ? hostDoc.data() : { uid, name: 'Unknown' }

    console.log(`[Room Creation] CREATING: ${roomId} | Host UID: ${uid} | AppId UID: ${req.user.uid}`)

    const newRoom = {
      roomId,
      name,
      type,
      hostId: uid,
      hostName: hostData.name,
      createdAt: new Date().toISOString(),
      participants: [{
        userId: uid,
        name: hostData.name,
        avatar: hostData.avatar || '',
        joinedAt: new Date().toISOString()
      }],
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        videoId: '',
        service: 'youtube', // default
        lastSyncTime: new Date().toISOString()
      }
    }

    await roomRef.set(newRoom)
    console.log(`✅ [Room Created] ID: ${roomId}, Host: ${uid}, Name: ${name}`)

    res.status(201).json(newRoom)
  } catch (error) {
    console.error('Create room error details:', error)
    if (error.code) console.error('Firestore Error Code:', error.code)
    res.status(500).json({
      message: 'Failed to create room',
      error: error.message
    })
  }
}

/**
 * Get all rooms (public)
 */
export const getRooms = async (req, res) => {
  try {
    const roomsSnapshot = await db.collection('rooms')
      .where('type', '==', 'public')
      .get()

    const rooms = []
    roomsSnapshot.forEach(doc => {
      rooms.push(doc.data())
    })

    res.json(rooms)
  } catch (error) {
    console.error('Get rooms error:', error)
    res.status(500).json({ message: 'Failed to fetch rooms' })
  }
}

/**
 * Get room by ID
 */
export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const roomDoc = await db.collection('rooms').doc(roomId).get()

    if (!roomDoc.exists) {
      console.warn(`[Get Room] Room not found: ${roomId}`)
      return res.status(404).json({ message: 'Room not found' })
    }

    const roomData = roomDoc.data()
    console.log(`[Get Room] FETCHED: ${roomId} | Host: ${roomData.hostId} | Requester: ${req.user.uid}`)
    res.json(roomData)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch room' })
  }
}

/**
 * Join room (API endpoint - though mostly handled via socket)
 */
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const { uid } = req.user

    const roomRef = db.collection('rooms').doc(roomId)
    const roomDoc = await roomRef.get()

    if (!roomDoc.exists) {
      return res.status(404).json({ message: 'Room not found' })
    }

    // Get user info
    const userDoc = await db.collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : { uid, name: 'Guest' }

    // Check if already in
    const roomData = roomDoc.data()
    const isParticipant = roomData.participants.some(p => p.userId === uid)

    if (!isParticipant) {
      await roomRef.update({
        participants: [...roomData.participants, {
          userId: uid,
          name: userData.name,
          avatar: userData.avatar || '',
          joinedAt: new Date().toISOString()
        }]
      })
    }

    res.json({ message: 'Joined room successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to join room' })
  }
}

/**
 * Leave room
 */
export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const { uid } = req.user

    const roomRef = db.collection('rooms').doc(roomId)
    const roomDoc = await roomRef.get()

    if (roomDoc.exists) {
      const roomData = roomDoc.data()
      const newParticipants = roomData.participants.filter(p => p.userId !== uid)

      if (newParticipants.length === 0) {
        // Delete room if empty
        await roomRef.delete()
      } else {
        await roomRef.update({ participants: newParticipants })
      }
    }
    res.json({ message: 'Left room' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to leave room' })
  }
}

/**
 * Update playback state
 */
export const updatePlaybackState = async (req, res) => {
  try {
    const { roomId } = req.params
    const { playbackState } = req.body

    await db.collection('rooms').doc(roomId).update({
      playbackState: {
        ...playbackState,
        lastSyncTime: new Date().toISOString()
      }
    })
    res.json({ message: 'Playback state updated' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update playback' })
  }
}

export default { createRoom, getRooms, getRoom, joinRoom, leaveRoom, updatePlaybackState }
