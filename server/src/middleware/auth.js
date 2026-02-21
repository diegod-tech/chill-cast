import { auth } from '../config/firebase.js'

/**
 * Middleware to verify Firebase ID token
 */
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  const isDev = process.env.NODE_ENV === 'development';


  if (!token) {
    // if (isDev) {
    //   console.warn('⚠️ No token provided, but allowing in DEV mode with mock user');
    //   req.user = {
    //     uid: 'dev-user-123',
    //     email: 'dev@example.com',
    //     name: 'Dev User',
    //     picture: ''
    //   };
    //   return next();
    // }
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
    if (isDev) {
      console.warn('⚠️ Token verification failed (likely Project ID mismatch). Attempting unsafe decode for DEV...');
      try {
        // Simple JWT decode (Part 2 is payload)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decodedToken = JSON.parse(jsonPayload);

        console.log('🔓 Unsafe decoded token payload:', decodedToken.email);

        req.user = {
          uid: decodedToken.user_id || decodedToken.sub,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          picture: decodedToken.picture
        };
        return next();
      } catch (decodeError) {
        console.error('Failed to parse token payload:', decodeError);
      }
    }

    console.error('Token verification failed:', error.code, error.message)
    res.status(401).json({
      message: 'Invalid token',
      code: error.code || 'unknown'
    })
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
