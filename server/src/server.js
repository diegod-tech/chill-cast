import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { config } from './config/env.js'
import './config/firebase.js' // Initialize Firebase
import { initializeSocket } from './socket/handlers.js'
import { verifyToken, errorHandler, notFound } from './middleware/auth.js'

// Import routes
import authRoutes from './routes/auth.js'
import roomRoutes from './routes/rooms.js'
import messageRoutes from './routes/messages.js'

// Initialize Express app
const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Firebase intialized in imports

// Middleware
app.use(helmet())
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/rooms', messageRoutes)

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * Initialize Socket.IO
 */
initializeSocket(io)

/**
 * Error handling
 */
app.use(notFound)
app.use(errorHandler)

/**
 * Start server
 */
server.listen(config.PORT, () => {
  console.log(`🚀 Chill Cast Server running on port ${config.PORT}`)
  console.log(`🔗 CORS enabled for: ${config.CORS_ORIGIN}`)
  console.log(`🔐 JWT Secret configured`)
})

export default { app, io }
