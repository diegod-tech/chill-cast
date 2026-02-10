import express from 'express'
import * as roomController from '../controllers/roomController.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

/**
 * Protected routes
 */
router.post('/', verifyToken, roomController.createRoom)
router.get('/:roomId', verifyToken, roomController.getRoom)
router.post('/:roomId/join', verifyToken, roomController.joinRoom)
router.post('/:roomId/leave', verifyToken, roomController.leaveRoom)
router.put('/:roomId/playback', verifyToken, roomController.updatePlaybackState)

export default router
