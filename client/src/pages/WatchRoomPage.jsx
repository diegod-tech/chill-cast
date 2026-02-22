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

  // 2. Initialize Socket (Depends on User)
  useEffect(() => {
    if (!user) return; // Don't init socket until user is loaded

    socketRef.current = initSocket()
    try {
      webrtcRef.current = new WebRTCManager()
    } catch (err) {
      console.error("Failed to init WebRTC:", err)
    }

    if (socketRef.current) {
      console.log('🔌 Socket initialized, joining room:', roomId)
      socketRef.current.emit('joinRoom', { roomId })

      socketRef.current.on('roomJoined', (data) => {
        console.log('✅ Room Joined Data:', data)
        if (data && data.room && Object.keys(data.room).length > 0) {
          setRoom(data.room)
          if (data.room.playbackState) {
            setLocalPlaybackState(prev => ({ ...prev, ...data.room.playbackState }))
          }
        } else {
          console.warn("⚠️ Received empty room data from socket, ignoring overwrite.")
        }

        if (data && data.participants) {
          setParticipants(data.participants)
        }
      })

      // Add other socket listeners here
      socketRef.current.on('updateParticipants', (updatedParticipants) => {
        setParticipants(updatedParticipants)
      })

      socketRef.current.on('playbackStateChanged', (state) => {
        setLocalPlaybackState(prev => ({ ...prev, ...state }))
      })

      socketRef.current.on('webrtc_offer', async ({ senderUserId, offer }) => {
        if (!webrtcRef.current) return;
        console.log(`🤝 WEBRTC: Received offer from ${senderUserId}`)
        try {
          const answer = await webrtcRef.current.handleOffer(senderUserId, offer)
          console.log(`🤝 WEBRTC: Sending answer to ${senderUserId}`)
          socketRef.current.emit('webrtc_answer', {
            targetUserId: senderUserId,
            answer,
            roomId
          })
        } catch (e) {
          console.error("❌ WEBRTC Offer Error:", e)
        }
      })

      socketRef.current.on('webrtc_answer', async ({ senderUserId, answer }) => {
        if (!webrtcRef.current) return;
        console.log(`🤝 WEBRTC: Received answer from ${senderUserId}`)
        try {
          await webrtcRef.current.handleAnswer(senderUserId, answer)
          console.log(`🤝 WEBRTC: Connection state with ${senderUserId} updated after answer`)
        } catch (e) {
          console.error("❌ WEBRTC Answer Error:", e)
        }
      })

      socketRef.current.on('webrtc_ice_candidate', async ({ senderUserId, candidate }) => {
        if (!webrtcRef.current) return;
        console.log(`🤝 WEBRTC: Received ICE candidate from ${senderUserId}`)
        try {
          await webrtcRef.current.addICECandidate(senderUserId, candidate)
        } catch (e) {
          console.error("❌ WEBRTC ICE Error:", e)
        }
      })

      socketRef.current.on('screenShareStarted', ({ senderUserId }) => {
        if (senderUserId === user.uid) return; // Host ignores its own event
        console.log(`User ${senderUserId} started screen sharing.`)
        setIsScreenSharing(false) // We are the receiver
      })

      socketRef.current.on('screenShareStopped', ({ senderUserId }) => {
        console.log(`User ${senderUserId} stopped screen sharing.`)
        setRemoteStream(null)
        setIsScreenSharing(false)

        // Receiver-side cleanup: Close the connection to the presenter
        if (webrtcRef.current && senderUserId !== user.uid) {
          console.log(`🧹 WEBRTC: Closing connection to former presenter ${senderUserId}`)
          webrtcRef.current.closePeerConnection(senderUserId)
        }
      })

      webrtcRef.current.on('remoteStream', (stream, peerId) => {
        console.log(`🎥 WEBRTC: Received remote stream from ${peerId}`)
        setRemoteStream(stream)
      })

      webrtcRef.current.on('ice-candidate', (candidate, peerId) => {
        console.log(`🤝 WEBRTC: Sending ICE candidate to ${peerId}`)
        socketRef.current.emit('webrtc_ice_candidate', {
          targetUserId: peerId,
          candidate,
          roomId
        })
      })
    }

    return () => {
      console.log('🔌 Disconnecting socket and cleaning up WebRTC')
      disconnectSocket()
      if (webrtcRef.current) {
        webrtcRef.current.stopAllStreams()
      }
      // NEW: Clear room state from store to prevent hostId leak
      const clearRoom = useRoomStore.getState().clearRoom
      if (clearRoom) clearRoom()
    }
  }, [roomId, user?.uid, setRoom, setParticipants, setLocalPlaybackState]) // Removed remoteStream

  // 3. Proactive Share Logic - Only for the Host
  useEffect(() => {
    if (isScreenSharing && room?.hostId === user?.uid && participants.length > 1) {
      const stream = localStreamRef.current;
      if (!stream) {
        console.log("⚠️ WEBRTC: isScreenSharing is true but no localStream available for proactive share");
        return;
      }

      participants.forEach(async (p) => {
        if (p.userId === user.uid) return
        if (!webrtcRef.current) return;

        // Only create offer if not already connected
        if (!webrtcRef.current.peerConnections.has(p.userId)) {
          console.log(`🤝 WEBRTC: Proactively offering share to new participant: ${p.name}`);
          try {
            const pc = await webrtcRef.current.createPeerConnection(p.userId)
            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            const offer = await webrtcRef.current.createOffer(p.userId)
            socketRef.current.emit('webrtc_offer', {
              targetUserId: p.userId,
              offer,
              roomId
            })
          } catch (err) {
            console.error(`❌ WEBRTC: Failed to send proactive offer to ${p.name}`, err)
          }
        }
      })
    }
  }, [participants, isScreenSharing, room?.hostId, user?.uid, roomId])

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

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop sharing
      console.log("🛑 Stopping screen share...")
      if (webrtcRef.current) webrtcRef.current.stopAllStreams()
      socketRef.current.emit('stopScreenShare', { roomId })
      setIsScreenSharing(false)
      setRemoteStream(null)
      localStreamRef.current = null
    } else {
      // Start sharing
      try {
        if (!webrtcRef.current) return;
        console.log("🖥️ Starting screen share...")
        const stream = await webrtcRef.current.getScreenStream()
        localStreamRef.current = stream
        setIsScreenSharing(true)

        // Switch room service to screenshare so everyone sees it
        updateService('screenshare');

        // Notify room
        socketRef.current.emit('requestScreenShare', { roomId })

        // Initial connections to everyone present
        participants.forEach(async (p) => {
          if (p.userId === user.uid) return
          if (!webrtcRef.current) return;

          console.log(`🤝 Initiating share connection with ${p.name}`)
          try {
            const pc = await webrtcRef.current.createPeerConnection(p.userId)

            // Clear existing senders if any (to avoid duplicate tracks on restart)
            pc.getSenders().forEach(sender => {
              if (sender.track) {
                console.log(`[PC] Removing stale track from ${p.name}`);
                pc.removeTrack(sender);
              }
            });

            // Add new tracks
            stream.getTracks().forEach(track => {
              console.log(`[PC] Adding ${track.kind} track for ${p.name}`);
              pc.addTrack(track, stream);
            });

            const offer = await webrtcRef.current.createOffer(p.userId)
            socketRef.current.emit('webrtc_offer', {
              targetUserId: p.userId,
              offer,
              roomId
            })
          } catch (err) {
            console.error(`❌ WEBRTC: Failed to initiate connection with ${p.name}`, err);
          }
        })

        // Local preview
        setRemoteStream(stream)

        // Stop sharing if stream ends
        stream.getTracks()[0].onended = () => {
          console.log("⚠️ Screen share stream ended by user/browser")
          if (localStreamRef.current) {
            handleScreenShare()
          }
        }

      } catch (error) {
        console.error("❌ Screen share failed:", error)
        setIsScreenSharing(false)
        localStreamRef.current = null
      }
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
