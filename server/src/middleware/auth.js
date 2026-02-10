import { auth } from '../config/firebase.js'

/**
 * Middleware to verify Firebase ID token
 */
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    const decodedToken = await auth.verifyIdToken(token)
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0],
      picture: decodedToken.picture
    }
    next()
  } catch (error) {
    console.error('Token verification failed:', error)
    res.status(401).json({ message: 'Invalid token' })
  }
}

/**
 * Middleware to handle errors
 */
export const errorHandler = (err, req, res, next) => {
  console.error(err)

  const status = err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    error: {
      status,
      message,
    },
  })
}

/**
 * Middleware for 404 errors
 */
export const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' })
}

export default { verifyToken, errorHandler, notFound }
