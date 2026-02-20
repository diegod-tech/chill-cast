import { useState, useEffect } from 'react'
import { X, User, Mail, Save, Loader } from 'lucide-react'
import { useAuthStore } from '../utils/store'
import api from '../utils/api'

export default function ProfileModal({ isOpen, onClose }) {
    const { user, setUser } = useAuthStore()
    const [name, setName] = useState('')
    const [avatar, setAvatar] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (user) {
            setName(user.name || '')
            setAvatar(user.picture || '')
        }
    }, [user, isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const { data } = await api.put('/auth/update', { name, picture: avatar })
            setUser(data.user)
            onClose()
            alert('Profile updated successfully!')
        } catch (error) {
            console.error('Failed to update profile:', error)
            alert(error.response?.data?.message || 'Failed to update profile')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-dark-secondary border border-primary-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <User className="text-primary-500" /> Edit Profile
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 hover:bg-white/10 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-500 shadow-glow">
                                {avatar ? (
                                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-dark-tertiary flex items-center justify-center text-3xl">
                                        {name?.charAt(0)?.toUpperCase() || <User />}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                            <div className="flex items-center gap-3 px-4 py-3 bg-dark-tertiary rounded-xl border border-white/5 opacity-70 cursor-not-allowed">
                                <Mail size={18} className="text-gray-500" />
                                <span className="text-gray-300 truncate">{user?.email}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-tertiary rounded-xl border border-white/10 focus:border-primary-500 focus:outline-none text-white transition-colors"
                                placeholder="Enter your name"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Avatar URL</label>
                            <input
                                type="url"
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-tertiary rounded-xl border border-white/10 focus:border-primary-500 focus:outline-none text-white transition-colors"
                                placeholder="https://example.com/avatar.jpg"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold rounded-xl shadow-lg hover:shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {isLoading ? <Loader className="animate-spin" /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
