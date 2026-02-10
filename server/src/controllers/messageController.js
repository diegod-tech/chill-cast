import { db } from '../config/firebase.js'

/**
 * Send a message
 */
export const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params
    const { content, messageType } = req.body
    const { uid, name, picture } = req.user

    if (!content) {
      return res.status(400).json({ message: 'Content is required' })
    }

    const messageData = {
      roomId,
      senderId: uid,
      senderName: name,
      senderAvatar: picture || '',
      content,
      messageType: messageType || 'text',
      createdAt: new Date().toISOString(),
      isDeleted: false
    }

    const msgRef = await db.collection('rooms').doc(roomId).collection('messages').add(messageData)

    res.status(201).json({
      message: 'Message sent',
      data: { id: msgRef.id, ...messageData },
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Failed to send message' })
  }
}

/**
 * Get messages for a room
 */
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params
    const { limit = 50 } = req.query

    const messagesSnapshot = await db.collection('rooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get()

    const messages = []
    messagesSnapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() })
    })

    res.json({
      messages: messages.reverse(), // Client likely expects chronological
      total: messages.length, // approximate for now
      limit: parseInt(limit),
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ message: 'Failed to fetch messages' })
  }
}

/**
 * Delete a message
 * Note: Requires roomId in params or body to locate efficiently in subcollection
 */
export const deleteMessage = async (req, res) => {
  try {
    const { roomId, messageId } = req.params
    const { uid } = req.user

    // If route is /:roomId/messages/:messageId, we have roomId.
    // If route is /messages/:messageId, we don't.
    // Assuming we verify route update.

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID required' })
    }

    const msgRef = db.collection('rooms').doc(roomId).collection('messages').doc(messageId)
    const msgDoc = await msgRef.get()

    if (!msgDoc.exists) {
      return res.status(404).json({ message: 'Message not found' })
    }

    const msgData = msgDoc.data()

    // Only allow message sender to delete
    if (msgData.senderId !== uid) {
      return res.status(403).json({ message: 'Not authorized to delete this message' })
    }

    await msgRef.update({ isDeleted: true, content: 'This message was deleted' })

    res.json({ message: 'Message deleted' })
  } catch (error) {
    console.error('Delete message error:', error)
    res.status(500).json({ message: 'Failed to delete message' })
  }
}

export default { sendMessage, getMessages, deleteMessage }
