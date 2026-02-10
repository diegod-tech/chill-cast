import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, MessageSquare, Lock } from 'lucide-react'
import api from '../utils/api'
import { generateRoomId } from '../utils/helpers'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    try {
      const roomData = {
        name: roomName,
        roomId: generateRoomId(),
        isPrivate,
        videoUrl: '',
      }
      await api.post('/rooms', roomData)
      navigate(`/room/${roomData.roomId}`)
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <button
            onClick={() => setShowCreateRoom(!showCreateRoom)}
            className="flex items-center gap-2 px-6 py-3 gradient-primary rounded-lg font-semibold hover:shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </button>
        </div>

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="mb-8 p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <form onSubmit={handleCreateRoom} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500"
                  placeholder="My Awesome Room"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="private" className="text-sm">Private Room (Only invited users)</label>
              </div>

              <button
                type="submit"
                className="px-6 py-2 gradient-primary rounded-lg font-semibold hover:shadow-lg transition"
              >
                Create
              </button>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">0</div>
            <p className="text-gray-400 text-sm">Active Rooms</p>
          </div>
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">0</div>
            <p className="text-gray-400 text-sm">Friends Online</p>
          </div>
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">0</div>
            <p className="text-gray-400 text-sm">Watch Hours</p>
          </div>
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">0</div>
            <p className="text-gray-400 text-sm">Current Streak</p>
          </div>
        </div>

        {/* Recently Joined Rooms */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recently Joined</h2>
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No rooms yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20 card-hover cursor-pointer" onClick={() => navigate(`/room/${room.id}`)}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{room.name}</h3>
                    {room.isPrivate && <Lock className="w-4 h-4 text-accent-500" />}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.participants?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
