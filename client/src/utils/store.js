import { create } from 'zustand'

/**
 * Auth Store - Manages authentication state
 */
export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('authToken'),
  isLoading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('authToken', token)
    } else {
      localStorage.removeItem('authToken')
    }
    set({ token })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    localStorage.removeItem('authToken')
    set({ user: null, token: null })
  },
}))

/**
 * Room Store - Manages current room state
 */
export const useRoomStore = create((set) => ({
  room: null,
  participants: [],
  messages: [],
  playbackState: { isPlaying: false, currentTime: 0, duration: 0 },

  setRoom: (room) => set({ room }),
  setParticipants: (participants) => set({ participants }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setPlaybackState: (state) => set({ playbackState: state }),
  clearRoom: () => set({ room: null, participants: [], messages: [], playbackState: { isPlaying: false, currentTime: 0, duration: 0 } }),
}))

/**
 * UI Store - Manages UI state
 */
export const useUIStore = create((set) => ({
  darkMode: true,
  sidebarOpen: true,
  showNotifications: true,
  theme: 'dark',

  setDarkMode: (darkMode) => set({ darkMode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}))

/**
 * Friends Store - Manages friends list
 */
export const useFriendsStore = create((set) => ({
  friends: [],
  pendingRequests: [],
  onlineFriends: [],

  setFriends: (friends) => set({ friends }),
  setPendingRequests: (requests) => set({ pendingRequests: requests }),
  setOnlineFriends: (friends) => set({ onlineFriends: friends }),
}))
