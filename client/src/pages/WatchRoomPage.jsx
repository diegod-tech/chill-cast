import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Share2, Settings, Volume2, Maximize, Monitor, MonitorOff } from 'lucide-react'
import { useRoomStore, useAuthStore } from '../utils/store'
import { initSocket, disconnectSocket } from '../utils/socket'
import { formatTime } from '../utils/helpers'
import { db, auth } from '../config/firebase'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import WebRTCManager from '../utils/webrtc'
import api from '../utils/api'
import ErrorBoundary from '../components/ErrorBoundary'

// Helper to extract YouTube ID
const extractVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function WatchRoomPage() {
  const { roomId } = useParams()
  const { user } = useAuthStore()
  const { room, participants, messages, setRoom, setParticipants, setMessages, addMessage, setPlaybackState } = useRoomStore()
  const [currentMessage, setCurrentMessage] = useState('')
  // Initialize with default videoId
  const [playbackState, setLocalPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    service: 'youtube',
    videoId: null
  })
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)
  const [videoUrlInput, setVideoUrlInput] = useState('')

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const videoRef = useRef(null)
  const messagesEndRef = useRef(null)
  const localStreamRef = useRef(null) // NEW: Store local share stream

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 1. Fetch Room Data (Independent of User/Socket)
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}`)
        console.log('📦 API Room Data:', data)
        setRoom(data)
        if (data.participants) setParticipants(data.participants)
        if (data.playbackState) {
          setLocalPlaybackState(prev => ({ ...prev, ...data.playbackState }))
        }
      } catch (error) {
        console.error('❌ Failed to fetch room via API:', error)
        if (error.response && error.response.status === 404) {
          alert('Room not found!')
        }
      }
    }
    fetchRoom()
  }, [roomId, setRoom, setParticipants])

  // 2. Initialize Socket + WebRTC (depends on user)
  useEffect(() => {
    if (!user) return

    const socket = initSocket()
    socketRef.current = socket
    webrtcRef.current = new WebRTCManager()
    const wrtc = webrtcRef.current

    console.log('🔌 Socket initialized, joining room:', roomId)
    socket.emit('joinRoom', { roomId })

    // ── Room state sync ──────────────────────────────────────────────────────
    socket.on('roomJoined', (data) => {
      console.log('✅ roomJoined:', data)
      if (data?.room && Object.keys(data.room).length > 0) {
        setRoom(data.room)
        if (data.room.playbackState) {
          setLocalPlaybackState(prev => ({ ...prev, ...data.room.playbackState }))
        }
      }
      if (data?.participants) setParticipants(data.participants)
    })

    socket.on('updateParticipants', setParticipants)

    socket.on('playbackSync', (state) => {
      setLocalPlaybackState(prev => ({ ...prev, ...state }))
    })

    socket.on('playbackStateChanged', (state) => {
      setLocalPlaybackState(prev => ({ ...prev, ...state }))
    })

    // ── WebRTC signaling ──────────────────────────────────────────────────────
    // Participant receives offer from host → create answer
    socket.on('webrtc_offer', async ({ senderUserId, offer }) => {
      if (!webrtcRef.current) return
      console.log(`🤝 Offer from ${senderUserId}`)
      try {
        const answer = await webrtcRef.current.handleOffer(senderUserId, offer)
        socket.emit('webrtc_answer', { targetUserId: senderUserId, answer, roomId })
      } catch (e) {
        console.error('❌ handleOffer error:', e)
      }
    })

    // Host receives answer from participant → finalize connection
    socket.on('webrtc_answer', async ({ senderUserId, answer }) => {
      if (!webrtcRef.current) return
      console.log(`🤝 Answer from ${senderUserId}`)
      try {
        await webrtcRef.current.handleAnswer(senderUserId, answer)
      } catch (e) {
        console.error('❌ handleAnswer error:', e)
      }
    })

    // ICE candidate — queued until remote desc is set (the main fix)
    socket.on('webrtc_ice_candidate', async ({ senderUserId, candidate }) => {
      if (!webrtcRef.current) return
      try {
        await webrtcRef.current.addICECandidate(senderUserId, candidate)
      } catch (e) {
        console.error('❌ addICECandidate error:', e)
      }
    })

    // ── Screen share signals ──────────────────────────────────────────────────
    socket.on('screenShareStarted', ({ senderUserId }) => {
      if (senderUserId === user.uid) return // host ignores own event
      console.log(`📺 Share started by ${senderUserId}`)
      // switch to screenshare service view
      setLocalPlaybackState(prev => ({ ...prev, service: 'screenshare' }))
    })

    socket.on('screenShareStopped', ({ senderUserId }) => {
      console.log(`🛑 Share stopped by ${senderUserId}`)
      setRemoteStream(null)
      if (senderUserId !== user.uid) {
        setIsScreenSharing(false)
        webrtcRef.current?.closePeerConnection(senderUserId)
      }
    })

    /**
     * HOST receives this when a new participant joins while sharing.
     * Server sends 'offer-request' → host sends a fresh offer to that participant.
     * This replaces the unreliable proactive useEffect.
     */
    socket.on('offer-request', async ({ fromUserId }) => {
      const stream = localStreamRef.current
      if (!stream || !webrtcRef.current) return
      console.log(`🤝 Offer requested by late joiner ${fromUserId}`)
      try {
        // Reset any existing stale connection to this peer first
        webrtcRef.current.closePeerConnection(fromUserId)
        const pc = await webrtcRef.current.createPeerConnection(fromUserId)
        webrtcRef.current.addTracksToConnection(fromUserId, stream)
        const offer = await webrtcRef.current.createOffer(fromUserId)
        socket.emit('webrtc_offer', { targetUserId: fromUserId, offer, roomId })
      } catch (e) {
        console.error('❌ offer-request error:', e)
      }
    })

    // ── WebRTC manager events → socket relay ──────────────────────────────────
    wrtc.on('remoteStream', (stream, peerId) => {
      console.log(`🎥 Remote stream from ${peerId}`)
      setRemoteStream(stream)
    })

    wrtc.on('ice-candidate', (candidate, peerId) => {
      socket.emit('webrtc_ice_candidate', { targetUserId: peerId, candidate, roomId })
    })

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      console.log('🔌 Disconnecting socket, cleaning WebRTC')
      disconnectSocket()
      webrtcRef.current?.stopAllStreams()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      useRoomStore.getState().clearRoom?.()
    }
  }, [roomId, user?.uid]) // minimal deps — callbacks use refs

  // Firestore Chat Listener
  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = []
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() })
      })
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [roomId, setMessages])

  // Attach remote stream to video element and handle autoplay
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.log("📺 Syncing stream to video element...")
      videoRef.current.srcObject = remoteStream

      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("⚠️ Autoplay blocked or failed:", error)
        })
      }
    }
  }, [remoteStream, playbackState?.service])

  // Cleanup stale WebRTC connections when participants leave
  useEffect(() => {
    if (participants && webrtcRef.current) {
      const currentUids = new Set(participants.map(p => p.userId))
      for (const peerId of webrtcRef.current.peerConnections.keys()) {
        if (!currentUids.has(peerId) && peerId !== user?.uid) {
          console.log(`🧹 WEBRTC: Cleaning up stale connection for ${peerId}`)
          webrtcRef.current.closePeerConnection(peerId)
        }
      }
    }
  }, [participants, user?.uid])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!currentMessage.trim() || !user) return

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        roomId,
        senderId: user.uid,
        senderName: user.name || user.email,
        senderAvatar: user.picture || '',
        content: currentMessage,
        messageType: 'text',
        createdAt: serverTimestamp() // Use server timestamp
      })
      setCurrentMessage('')
    } catch (error) {
      console.error("Error sending message", error)
    }
  }

  /**
   * handleScreenShare — Google Meet pattern
   *
   * START:
   *   1. Get screen stream via getDisplayMedia
   *   2. For each current participant, create PC → add tracks → create offer → send
   *   3. Emit requestScreenShare so server notifies others and future joiners
   *      can trigger 'offer-request' back to us (handled in useEffect above)
   *   4. Show local preview
   *
   * STOP:
   *   1. Stop all tracks
   *   2. Close all peer connections (share-only)
   *   3. Emit stopScreenShare
   */
  const handleScreenShare = async () => {
    if (isScreenSharing) {
      // ── STOP ──────────────────────────────────────────────────────────────
      console.log('🛑 Stopping screen share')
      // Stop all local tracks
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
      // Close all peer connections created for this share session
      webrtcRef.current?.stopShareConnections(user.uid)
      socketRef.current.emit('stopScreenShare', { roomId })
      setIsScreenSharing(false)
      setRemoteStream(null)
      return
    }

    // ── START ──────────────────────────────────────────────────────────────
    try {
      if (!webrtcRef.current || !socketRef.current) return
      console.log('🖥️ Starting screen share')

      const stream = await webrtcRef.current.getScreenStream()
      localStreamRef.current = stream

      // Immediately show local preview
      setRemoteStream(stream)
      setIsScreenSharing(true)

      // Switch everyone's view to screenshare service
      updateService('screenshare')

      // Tell server we're sharing (it will emit screenShareStarted to others
      // and emit 'offer-request' to us when new users join)
      socketRef.current.emit('requestScreenShare', { roomId })

      // Send an offer to every current participant
      const otherParticipants = participants.filter(p => p.userId !== user.uid)
      console.log(`🤝 Sending offers to ${otherParticipants.length} participant(s)`)

      for (const p of otherParticipants) {
        try {
          // Always start fresh — close any stale connection first
          webrtcRef.current.closePeerConnection(p.userId)
          const pc = await webrtcRef.current.createPeerConnection(p.userId)
          webrtcRef.current.addTracksToConnection(p.userId, stream)
          const offer = await webrtcRef.current.createOffer(p.userId)
          socketRef.current.emit('webrtc_offer', { targetUserId: p.userId, offer, roomId })
          console.log(`📤 Offer sent to ${p.name}`)
        } catch (err) {
          console.error(`❌ Failed to send offer to ${p.name}:`, err)
        }
      }

      // If user stops sharing via browser's native button
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log('⚠️ Track ended by browser — stopping share')
          handleScreenShare() // call stop branch
        }
      })

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.log('ℹ️ User cancelled screen share picker')
      } else {
        console.error('❌ Screen share error:', error)
      }
      setIsScreenSharing(false)
      localStreamRef.current = null
    }
  }

  const handleTogglePlayback = () => {
    if (room?.hostId !== user?.uid) return
    const newState = {
      ...playbackState,
      isPlaying: !playbackState.isPlaying,
      currentTime: videoRef.current ? videoRef.current.currentTime : playbackState.currentTime
    }
    setLocalPlaybackState(newState)
    socketRef.current.emit('syncPlayback', { roomId, state: newState })
  }

  const updateService = (service) => {
    const newState = { ...playbackState, service, isPlaying: false, currentTime: 0 }
    setLocalPlaybackState(newState)
    socketRef.current.emit('syncPlayback', { roomId, state: newState })
  }

  const handleVideoChange = (e) => {
    e.preventDefault()
    const videoId = extractVideoId(videoUrlInput)
    if (videoId) {
      const newState = {
        ...playbackState,
        service: 'youtube',
        videoId: videoId,
        isPlaying: true,
        currentTime: 0
      }
      setLocalPlaybackState(newState)
      socketRef.current.emit('syncPlayback', { roomId, state: newState })
      setVideoUrlInput('')
    } else {
      alert('Invalid YouTube URL')
    }
  }

  const handleShareRoom = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      alert('Room link copied to clipboard! 📋')
    }).catch(err => {
      console.error('Failed to copy: ', err)
    })
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-dark p-6 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
        <p>Loading Room...</p>
      </div>
    )
  }

  // Debug Log
  console.log("RENDER WatchRoomPage", { room, participantsCount: participants?.length })

  if (Object.keys(room || {}).length === 0 && !room) {
    // Fallback for null room
    return <div className="text-white">Loading...</div>
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dark p-6 relative">
        <div className="max-w-7xl mx-auto">
          {/* ... existing layout ... */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Video Player */}
            <div className="lg:col-span-2">
              <div className="bg-dark-secondary rounded-lg overflow-hidden mb-6">
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  {playbackState.service === 'screenshare' ? (
                    remoteStream ? (
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-white flex flex-col items-center">
                        <Monitor className="w-12 h-12 mb-4 text-primary-500 animate-pulse" />
                        <span className="text-2xl font-bold">Waiting for Screen Share...</span>
                        <p className="mt-2 text-gray-400 text-sm">
                          {room?.hostId === user?.uid
                            ? "Click 'Screen Share' above to start sharing."
                            : "The host hasn't started sharing their screen yet."}
                        </p>
                      </div>
                    )
                  ) : (
                    playbackState.service === 'netflix' ? (
                      <div className="text-white flex flex-col items-center">
                        <span className="text-4xl font-bold text-red-600">NETFLIX</span>
                        <span className="mt-4">Stream synchronization active</span>
                        <span className="text-sm text-gray-400 mt-2">Open Netflix in another tab and use the extension to connect.</span>
                      </div>
                    ) : playbackState.service === 'hotstar' ? (
                      <div className="text-white flex flex-col items-center">
                        <span className="text-4xl font-bold text-[#1347BD]">Disney+ Hotstar</span>
                        <span className="mt-4">Stream synchronization active</span>
                        <span className="text-sm text-gray-400 mt-2">Open Hotstar in another tab and use the extension to connect.</span>
                      </div>
                    ) : (
                      playbackState.videoId ? (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${playbackState.videoId}?autoplay=${playbackState.isPlaying ? 1 : 0}&start=${Math.floor(playbackState.currentTime)}`}
                          title="Video Player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-white flex flex-col items-center">
                          <span className="text-4xl font-bold">Waiting for Video...</span>
                          <span className="mt-4 text-gray-400">Paste a YouTube link below to start watching.</span>
                        </div>
                      )
                    )
                  )}
                </div>

                {/* Room/Service Controls - Visible to Everyone */}
                <div className="flex flex-col gap-4 p-4 bg-dark-tertiary">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-accent-400 uppercase tracking-wider">
                      {room?.hostId === user?.uid ? 'Host Controls' : 'Room Controls'}
                    </span>
                    {room?.isScreenSharing && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full animate-pulse border border-red-500/30">
                        <Monitor className="w-3 h-3" /> LIVE SHARE
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => updateService('youtube')} className={`px-4 py-1 rounded transition text-sm font-semibold ${playbackState.service === 'youtube' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>YouTube</button>
                    <button onClick={() => updateService('netflix')} className={`px-4 py-1 rounded transition text-sm font-semibold ${playbackState.service === 'netflix' ? 'bg-red-800' : 'bg-gray-700 hover:bg-gray-600'}`}>Netflix</button>
                    <button onClick={() => updateService('hotstar')} className={`px-4 py-1 rounded transition text-sm font-semibold ${playbackState.service === 'hotstar' ? 'bg-[#1347BD]' : 'bg-gray-700 hover:bg-gray-600'}`}>Disney+ Hotstar</button>
                    <button
                      onClick={() => updateService('screenshare')}
                      className={`px-4 py-1 rounded transition flex items-center gap-2 text-sm font-semibold ${playbackState.service === 'screenshare' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <Monitor className="w-4 h-4" />
                      Screen Share
                    </button>
                  </div>

                  {/* YouTube URL Input - Host Only */}
                  {room?.hostId === user?.uid && playbackState.service === 'youtube' && (
                    <form onSubmit={handleVideoChange} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste YouTube Link..."
                        className="flex-1 px-3 py-1 bg-dark rounded border border-gray-600 text-sm focus:outline-none focus:border-red-500"
                        value={videoUrlInput}
                        onChange={(e) => setVideoUrlInput(e.target.value)}
                      />
                      <button type="submit" className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700">Load</button>
                    </form>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={handleTogglePlayback}
                        className={`p-2 rounded transition ${room?.hostId === user?.uid ? 'hover:bg-dark-tertiary' : 'opacity-50 cursor-not-allowed'}`}
                        disabled={room?.hostId !== user?.uid}
                      >
                        {playbackState.isPlaying ? '⏸' : '▶'}
                      </button>
                      <button className="p-2 hover:bg-dark-tertiary rounded transition flex items-center gap-2">
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleScreenShare}
                        className={`p-2 rounded transition flex items-center gap-2 ${isScreenSharing ? 'bg-red-500 text-white' : 'hover:bg-dark-tertiary'}`}
                      >
                        {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                        {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                      </button>
                      <button className="p-2 hover:bg-dark-tertiary rounded transition">
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
                <h2 className="text-2xl font-bold mb-2">{room?.name || 'Watch Room'}</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>👥 {participants?.length || 0} watching</div>
                  </div>
                  <button
                    onClick={handleShareRoom}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-tertiary rounded hover:bg-opacity-80 transition text-sm font-semibold"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Room
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Chat & Participants */}
            <div className="space-y-6">
              <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
                <h3 className="text-lg font-bold mb-4">Watching Together</h3>
                <div className="space-y-2">
                  {participants?.filter(Boolean).map((participant, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {participant.avatar ? <img src={participant.avatar} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent-500" />}
                      <span className="text-sm">{participant.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20 flex flex-col h-96">
                <h3 className="text-lg font-bold mb-4">Chat</h3>
                <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 custom-scrollbar">
                  {messages?.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <div className="flex items-baseline justify-between">
                        <p className="font-semibold text-accent-400">{msg.senderName}</p>
                        <span className="text-[10px] text-gray-500">{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <p className="text-gray-300 break-words">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    className="flex-1 px-3 py-2 bg-dark-secondary rounded border border-primary-500 border-opacity-20 text-sm focus:outline-none"
                    placeholder="Say something..."
                  />
                  <button type="submit" className="p-2 gradient-primary rounded hover:shadow-lg transition">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
