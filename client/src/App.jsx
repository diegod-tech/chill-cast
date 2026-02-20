import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './utils/store'
import Layout from './components/Layout'
import ConfigWarning from './components/ConfigWarning'
import api from './utils/api'


// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import WatchRoomPage from './pages/WatchRoomPage'
import ProfilePage from './pages/ProfilePage'
import FriendsPage from './pages/FriendsPage'
import ChallengesPage from './pages/ChallengesPage'
import SettingsPage from './pages/SettingsPage'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" />
}

// Layout Wrapper
function LayoutWrapper({ children }) {
  const location = useLocation()
  const isPublic = ['/', '/login', '/register'].includes(location.pathname)

  return isPublic ? children : <Layout>{children}</Layout>
}


function App() {
  const { token, setToken, user, setUser } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken')
      if (storedToken) {
        if (!token) setToken(storedToken)

        if (!user) {
          try {
            // Set token in header explicitly if needed, but api instance usually handles it
            // if api.js uses localStorage it's fine. If it uses store, we just setToken.
            // Let's assume api.js handles it or we rely on the interceptor.
            const response = await api.get('/auth/me')
            setUser(response.data)
          } catch (error) {
            console.error('Failed to restore session:', error)
            if (error.response?.status === 401) {
              localStorage.removeItem('authToken')
              setToken(null)
            }
          }
        }
      }
    }

    initAuth()
  }, [token, setToken, user, setUser])

  return (
    <Router>
      <LayoutWrapper>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <WatchRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challenges"
            element={
              <ProtectedRoute>
                <ChallengesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutWrapper>
      <ConfigWarning />
    </Router>

  )
}

export default App
