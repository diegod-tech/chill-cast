import { Zap, Users, MessageSquare, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-effect border-b border-primary-500 border-opacity-20" style={{ maxWidth: 'none', padding: 0 }}>
        <div className="w-full px-8 py-4 flex justify-between items-center" style={{ maxWidth: 'none', margin: 0 }}>
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-accent-500" />
            <span className="text-2xl font-bold">Chill Cast</span>
          </div>
          <div className="flex gap-4">
            <a href="/login" className="px-6 py-2 rounded-lg hover:bg-primary-500 hover:bg-opacity-20 transition">Login</a>
            <a href="/register" className="px-6 py-2 gradient-primary rounded-lg font-semibold">Sign Up</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mt-20 min-h-screen flex items-center justify-center px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-dark to-accent-900 opacity-50" />
        <div className="relative z-10 text-center max-w-2xl">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Watch Together.<br />
            <span className="gradient-primary bg-clip-text text-transparent">Feel Closer</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Synchronized watch parties with friends. Real-time chat, screen sharing, and challenges.
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/register" className="px-8 py-3 gradient-primary rounded-lg font-semibold text-lg">
              Create Room
            </a>
            <a href="/join" className="px-8 py-3 border-2 border-primary-500 rounded-lg font-semibold text-lg hover:bg-primary-500 hover:bg-opacity-10">
              Join Room
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-dark-secondary bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <Zap className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-Time Sync</h3>
              <p className="text-gray-400">Watch synchronized with friends, no delays.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <Users className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Social Experience</h3>
              <p className="text-gray-400">See avatars and reactions from all participants.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <MessageSquare className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
              <p className="text-gray-400">Chat with emojis and typing indicators.</p>
            </div>
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <BarChart3 className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Challenges</h3>
              <p className="text-gray-400">Daily challenges with rewards and leaderboards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-secondary text-center py-6 border-t border-primary-500 border-opacity-20">
        <p className="text-gray-400">© 2026 Chill Cast. All rights reserved.</p>
      </footer>
    </div>
  )
}
