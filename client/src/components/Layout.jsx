import { Link, useLocation } from 'react-router-dom'
import { Home, Users, BarChart3, Settings, LogOut, Zap } from 'lucide-react'
import { useAuthStore } from '../utils/store'

export default function Layout({ children }) {
  const location = useLocation()
  const { logout } = useAuthStore()

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Friends', href: '/friends' },
    { icon: BarChart3, label: 'Challenges', href: '/challenges' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-dark">
      {/* Sidebar */}
      <nav className="w-64 bg-dark-secondary border-r border-primary-500 border-opacity-20 p-6 flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          <Zap className="w-8 h-8 text-accent-500" />
          <span className="text-2xl font-bold">Chill Cast</span>
        </Link>

        {/* Nav Items */}
        <div className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.href)
                    ? 'bg-primary-500 bg-opacity-20 text-accent-400 border-l-2 border-accent-500'
                    : 'text-gray-400 hover:bg-dark-tertiary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500 hover:bg-opacity-10 transition w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
