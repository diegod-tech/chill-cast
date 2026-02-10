import { useState } from 'react'
import { useFriendsStore } from '../utils/store'
import { Users, UserPlus, UserMinus, Activity } from 'lucide-react'

export default function FriendsPage() {
  const { friends, onlineFriends } = useFriendsStore()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Friends</h1>
          <button className="flex items-center gap-2 px-6 py-3 gradient-primary rounded-lg font-semibold hover:shadow-lg transition">
            <UserPlus className="w-5 h-5" />
            Add Friend
          </button>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full px-6 py-3 bg-dark-secondary rounded-lg border border-primary-500 border-opacity-20 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">{friends.length}</div>
            <p className="text-gray-400 text-sm">Total Friends</p>
          </div>
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">{onlineFriends.length}</div>
            <p className="text-gray-400 text-sm">Online</p>
          </div>
          <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
            <div className="text-3xl font-bold">0</div>
            <p className="text-gray-400 text-sm">Pending Requests</p>
          </div>
        </div>

        {/* Friends List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No friends yet</p>
              <button className="px-6 py-2 gradient-primary rounded-lg font-semibold">
                Find Friends
              </button>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{friend.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      {onlineFriends.some((f) => f.id === friend.id) ? (
                        <>
                          <Activity className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-400">Online</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Offline</span>
                      )}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-dark-tertiary rounded transition">
                    <UserMinus className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
