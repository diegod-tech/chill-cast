import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { useAuthStore } from '../utils/store'
import { useNavigate } from 'react-router-dom'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [stats] = useState({
    watchHours: 24,
    roomsCreated: 5,
    friendsAdded: 12,
    challenges: 3,
  })

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 mx-auto mb-4 flex items-center justify-center">
            <User className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{user?.name || 'Guest'}</h1>
          <p className="text-gray-400">{user?.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20 text-center">
            <div className="text-2xl font-bold">{stats.watchHours}</div>
            <p className="text-gray-400 text-sm">Watch Hours</p>
          </div>
          <div className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20 text-center">
            <div className="text-2xl font-bold">{stats.roomsCreated}</div>
            <p className="text-gray-400 text-sm">Rooms Created</p>
          </div>
          <div className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20 text-center">
            <div className="text-2xl font-bold">{stats.friendsAdded}</div>
            <p className="text-gray-400 text-sm">Friends</p>
          </div>
          <div className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20 text-center">
            <div className="text-2xl font-bold">{stats.challenges}</div>
            <p className="text-gray-400 text-sm">Challenges</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['🎬', '🔥', '👥', '🏆'].map((emoji, i) => (
              <div key={i} className="p-4 rounded-lg glass-effect border border-primary-500 border-opacity-20 text-center">
                <div className="text-4xl mb-2">{emoji}</div>
                <p className="text-xs text-gray-400">Achievement</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-500 hover:bg-opacity-10 transition"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
