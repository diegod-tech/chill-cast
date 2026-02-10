import { useState } from 'react'
import { Settings, Moon, Volume2, Globe } from 'lucide-react'
import { useUIStore } from '../utils/store'

export default function SettingsPage() {
  const { darkMode, setDarkMode, showNotifications } = useUIStore()
  const [settings, setSettings] = useState({
    notifications: showNotifications,
    sound: true,
    language: 'en',
    theme: 'dark',
  })

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] })
    if (key === 'theme') {
      setDarkMode(!darkMode)
    }
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Settings
        </h1>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Display */}
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-accent-500" />
              Display
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Dark Mode</p>
                  <p className="text-gray-400 text-sm">Use dark theme</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.theme === 'dark'}
                  onChange={() => handleToggle('theme')}
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Language</p>
                  <p className="text-gray-400 text-sm">Choose your language</p>
                </div>
                <select className="px-4 py-2 bg-dark-secondary rounded border border-primary-500 border-opacity-20 focus:outline-none">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent-500" />
              Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Push Notifications</p>
                  <p className="text-gray-400 text-sm">Get notified of new events</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={() => handleToggle('notifications')}
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Sound</p>
                  <p className="text-gray-400 text-sm">Play notification sounds</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={() => handleToggle('sound')}
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Friend Requests</p>
                  <p className="text-gray-400 text-sm">Notify when someone adds you</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <h2 className="text-xl font-bold mb-4">Privacy & Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Profile Visibility</p>
                  <p className="text-gray-400 text-sm">Make profile public</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Show Status</p>
                  <p className="text-gray-400 text-sm">Show when you're watching</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-lg border-2 border-red-500 border-opacity-30 bg-red-500 bg-opacity-5">
            <h2 className="text-xl font-bold mb-4 text-red-400">Danger Zone</h2>
            <button className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-500 hover:bg-opacity-10 transition">
              Delete Account
            </button>
          </div>

          {/* Save Button */}
          <button className="w-full py-3 gradient-primary rounded-lg font-semibold hover:shadow-lg transition">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
