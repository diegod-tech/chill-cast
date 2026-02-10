import { db } from '../config/firebase.js'

/**
 * Register a new user (Post-Firebase Auth Signup)
 * Expects: { uid, email, name, avatar }
 */
export const register = async (req, res) => {
  try {
    const { uid, email, name, avatar } = req.body

    if (!uid || !email) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      return res.status(200).json({ message: 'User already exists', user: userDoc.data() })
    }

    const newUser = {
      uid,
      email,
      name: name || email.split('@')[0],
      avatar: avatar || '',
      isOnline: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await userRef.set(newUser)

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

/**
 * Login user (Sync/Get Profile)
 * Handled mostly on client, this endpoint ensures Firestore sync
 */
export const login = async (req, res) => {
  try {
    const { uid } = req.user // From middleware

    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      // Fallback if user doesn't exist in Firestore but valid token
      const newUser = {
        uid,
        email: req.user.email,
        name: req.user.name || req.user.email.split('@')[0],
        avatar: req.user.picture || '',
        isOnline: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await userRef.set(newUser)
      return res.json({ message: 'Login successful', user: newUser })
    }

    await userRef.update({ isOnline: true })

    res.json({
      message: 'Login successful',
      user: userDoc.data()
    })
  } catch (error) {
    console.error('CRITICAL LOGIN ERROR:', error)
    if (error.stack) console.error('Stack Trace:', error.stack)

    // Check if db is initialized
    if (!db) console.error('FATAL: Firestore DB instance is undefined!')

    res.status(500).json({
      message: 'Login failed',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    })
  }
}

/**
 * Get current user
 */
export const getCurrentUser = async (req, res) => {
  try {
    const { uid } = req.user
    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(userDoc.data())
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' })
  }
}

/**
 * Logout user
 */
export const logout = async (req, res) => {
  try {
    // Ideally update isOnline status
    if (req.user && req.user.uid) {
      await db.collection('users').doc(req.user.uid).update({ isOnline: false })
    }
    res.json({ message: 'Logout successful' })
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' })
  }
}

export default { register, login, getCurrentUser, logout }
