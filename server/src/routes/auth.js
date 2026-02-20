import express from 'express'
import * as authController from '../controllers/authController.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

/**
 * Public routes
 */
router.post('/register', authController.register)
router.post('/login', verifyToken, authController.login)

/**
 * Protected routes
 */
router.get('/me', verifyToken, authController.getCurrentUser)
router.post('/logout', verifyToken, authController.logout)
router.put('/update', verifyToken, authController.updateUser)

export default router
