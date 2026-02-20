import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, MessageSquare, Lock, Zap, BarChart3, HelpCircle } from 'lucide-react'
import api from '../utils/api'
import { generateRoomId } from '../utils/helpers'
import '../styles/ChillCast.css'

const defaultConfig = {
  hero_title: "Watch Together in Sync",
  hero_subtitle: "Stream anything. Chat freely. Vibe together.",
  cta_button_text: "Create Room",
  create_room_button_text: "Join Room",
};

import ProfileModal from '../components/ProfileModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinRoomUrl, setJoinRoomUrl] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)


  // ChillCast states
  const [config] = useState(defaultConfig)
  const [supportOpen, setSupportOpen] = useState(false)

  // Fetch rooms on mount (replicating implicit logic usually in useEffect if relevant, or maybe passed as props/context in bigger apps)
  // Assuming 'rooms' state was populated before or just starts empty. The original code initialized it as empty array and didn't have a fetch in the displayed snippet.
  // I will enhance this by adding a fetch to show active rooms if the API supports it, or keep it as is if it relies on other mechanisms.
  // The original code: const [rooms, setRooms] = useState([]) and rendered "Recently Joined" based on it.
  // BUT the original code didn't actually fetch rooms in the useEffect! It just had the empty state. 
  // I will keep the state and logic as is, assuming it might be populated elsewhere or user intends to add it. 
  // Wait, if I'm replacing the Dashboard, I should probably keep the structure that was there.

  const handleJoinRoom = (e) => {
    e.preventDefault()
    // Extract roomId from URL if full URL provided, else assume ID
    const urlParts = joinRoomUrl.split('/')
    const roomId = urlParts[urlParts.length - 1]
    if (roomId) {
      navigate(`/room/${roomId}`)
    }
  }



  const handleCreateRoom = async (e) => {
    e.preventDefault()
    try {
      const roomData = {
        name: roomName,
        roomId: generateRoomId(),
        isPrivate,

        videoUrl: '',
      }
      const response = await api.post('/rooms', roomData)
      console.log('🎉 Room Created:', response.data)
      navigate(`/room/${response.data.roomId}`)
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };



  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.id === "support-modal") setSupportOpen(false);
      if (e.target.id === "create-room-modal" && !e.target.closest('.modal-content')) setShowCreateRoom(false);
      if (e.target.id === "join-room-modal" && !e.target.closest('.modal-content')) setShowJoinRoom(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);


  return (
    <div className="main-wrapper">
      <header>
        <nav>
          <div className="logo" onClick={() => navigate('/')}>🎬 ChillCast</div>
          <ul className="nav-links">
            <li><a onClick={() => scrollToSection("features")}>Features</a></li>
            <li><a onClick={() => scrollToSection("platforms")}>Platforms</a></li>
          </ul>
          <div className="nav-actions">
            <button className="icon-button" onClick={() => setShowProfileModal(true)} title="Profile">👤</button>
            <button className="icon-button" onClick={(e) => { e.stopPropagation(); setSupportOpen(true); }} title="Support"><HelpCircle size={24} /></button>
          </div>
        </nav>
      </header>

      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Support Modal */}
      <div id="support-modal" className={`modal ${supportOpen ? "active" : ""}`}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Support</h2>
            <button className="close-button" onClick={() => setSupportOpen(false)}>✕</button>
          </div>
          <div className="modal-body">
            <p>Email: support@chillcast.com</p>
          </div>
        </div>
      </div>



      {/* Join Room Modal */}
      {showJoinRoom && (
        <div id="join-room-modal" className="modal active" style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Room</h2>
              <button className="close-button" onClick={() => setShowJoinRoom(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-gray)' }}>Room URL or ID</label>
                  <input
                    type="text"
                    value={joinRoomUrl}
                    onChange={(e) => setJoinRoomUrl(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500 text-white"
                    placeholder="Paste link here..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="cta-button w-full"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div id="create-room-modal" className="modal active" style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Room</h2>
              <button className="close-button" onClick={() => setShowCreateRoom(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-gray)' }}>Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500 text-white"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
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
                  <label htmlFor="private" className="text-sm" style={{ color: 'var(--text-gray)' }}>Private Room (Only invited users)</label>
                </div>


                <button
                  type="submit"
                  className="cta-button w-full"
                >
                  Create
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <section className="hero">
        <div className="hero-content">
          <h1>{config.hero_title}</h1>
          <p>{config.hero_subtitle}</p>
          <div className="button-group">
            <button className="cta-button" onClick={() => setShowCreateRoom(true)}>{config.cta_button_text}</button>
            <button className="create-room-button" onClick={() => setShowJoinRoom(true)}>{config.create_room_button_text}</button>
          </div>
        </div>
      </section>

      {/* Features Section - Ported from LandingPage */}
      <section id="features" className="py-20 px-6 bg-dark-secondary bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <Zap className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Real-Time Sync</h3>
              <p className="text-gray-400">Watch synchronized with friends, no delays.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <Users className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Social Experience</h3>
              <p className="text-gray-400">See avatars and reactions from all participants.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <MessageSquare className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Live Chat</h3>
              <p className="text-gray-400">Chat with emojis and typing indicators.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <BarChart3 className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Challenges</h3>
              <p className="text-gray-400">Daily challenges with rewards and leaderboards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Joined Rooms - Integrating original dashboard feature */}
      <section className="px-8 py-12 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-white">Recently Joined</h2>
        {rooms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl bg-opacity-5 bg-white">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No rooms yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20 card-hover cursor-pointer bg-card" onClick={() => navigate(`/room/${room.id}`)}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-white">{room.name}</h3>
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
      </section>

      <footer>
        <p>© 2024 ChillCast</p>
      </footer>
    </div>
  )
}
