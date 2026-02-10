import express from 'express'
import * as messageController from '../controllers/messageController.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

/**
 * Protected routes
 */
router.post('/:roomId/messages', verifyToken, messageController.sendMessage)
router.get('/:roomId/messages', verifyToken, messageController.getMessages)
router.delete('/:roomId/messages/:messageId', verifyToken, messageController.deleteMessage)

export default router
