import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../utils/store'
import api from '../utils/api'
import { validateEmail } from '../utils/helpers'
import { auth, googleProvider } from '../config/firebase'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, setToken, setLoading } = useAuthStore()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      const token = await user.getIdToken()

      // Sync with backend (will create user if not exists)
      const response = await api.post('/auth/login')

      setToken(token)
      setUser(response.data.user)
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setError('Google Sign-In failed')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email')
      setLoading(false)
      return
    }

    try {
      // Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user
      const token = await user.getIdToken()

      // Sync with backend
      const response = await api.post('/auth/login')

      setToken(token)
      setUser(response.data.user) // User data from Firestore via backend
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Chill Cast</h1>
          <p className="text-gray-400">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full py-2 gradient-primary rounded-lg font-semibold hover:shadow-lg transition"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <a href="/register" className="text-accent-500 hover:text-accent-400">
              Sign up
            </a>
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 border border-primary-500 rounded-lg font-semibold hover:bg-primary-500 hover:bg-opacity-10 transition"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}
