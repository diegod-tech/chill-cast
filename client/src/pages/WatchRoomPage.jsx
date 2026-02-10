import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Share2, Settings, Volume2, Maximize, Monitor, MonitorOff } from 'lucide-react'
import { useRoomStore, useAuthStore } from '../utils/store'
import { initSocket } from '../utils/socket'
import { formatTime } from '../utils/helpers'
import { db, auth } from '../config/firebase'
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import WebRTCManager from '../utils/webrtc'

export default function WatchRoomPage() {
  const { roomId } = useParams()
  const { user } = useAuthStore()
  const { room, participants, messages, setRoom, setParticipants, setMessages, addMessage, setPlaybackState } = useRoomStore()
  const [currentMessage, setCurrentMessage] = useState('')
  const [playbackState, setLocalPlaybackState] = useState({ isPlaying: false, currentTime: 0, duration: 0, service: 'youtube' })
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteStream, setRemoteStream] = useState(null)

  const socketRef = useRef(null)
  const webrtcRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    socketRef.current = initSocket()
    webrtcRef.current = new WebRTCManager()

    if (socketRef.current) {
      // Join room
      socketRef.current.emit('joinRoom', { roomId })

      // Socket Listeners
      socketRef.current.on('roomJoined', (data) => {
        setRoom(data.room)
        setParticipants(data.participants)
        if (data.room.playbackState) setLocalPlaybackState(data.room.playbackState)
      })

      socketRef.current.on('userJoined', (data) => {
        setParticipants((prev) => [...prev, data])
      })

      socketRef.current.on('userLeft', (data) => {
        setParticipants((prev) => prev.filter(p => p.userId !== data.userId))
      })

      socketRef.current.on('playbackSync', (state) => {
        setLocalPlaybackState(state)
      })

      // WebRTC Signaling Listeners
      socketRef.current.on('screenShareStarted', async (data) => {
        if (data.presenterId !== user?.uid) {
          // Prepare to receive
          console.log('Screen share started by', data.presenterId)
        }
      })

      socketRef.current.on('webrtc_offer', async ({ senderId, offer }) => {
        if (senderId === user?.uid) return;
        console.log('Received Offer from', senderId)

        const peerConnection = await webrtcRef.current.createPeerConnection(senderId)

        peerConnection.ontrack = (event) => {
          console.log('Received Remote Stream')
          setRemoteStream(event.streams[0])
        }

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.emit('webrtc_ice_candidate', {
              targetUserId: senderId,
              candidate: event.candidate,
              roomId
            })
          }
        }

        const answer = await webrtcRef.current.handleOffer(senderId, offer)
        socketRef.current.emit('webrtc_answer', {
          targetUserId: senderId,
          answer,
          roomId
        })
      })

      socketRef.current.on('webrtc_answer', async ({ senderId, answer }) => {
        await webrtcRef.current.handleAnswer(senderId, answer)
      })

      socketRef.current.on('webrtc_ice_candidate', async ({ senderId, candidate }) => {
        await webrtcRef.current.addICECandidate(senderId, candidate)
      })

      socketRef.current.on('screenShareStopped', () => {
        setRemoteStream(null)
        webrtcRef.current.stopAllStreams()
      })

      return () => {
        socketRef.current.disconnect()
        webrtcRef.current.stopAllStreams()
      }
    }
  }, [roomId, user, setRoom, setParticipants])

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

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

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
      webrtcRef.current.stopAllStreams()
      socketRef.current.emit('stopScreenShare', { roomId })
      setIsScreenSharing(false)
      setRemoteStream(null)
    } else {
      // Start sharing
      try {
        const stream = await webrtcRef.current.getScreenStream()
        setIsScreenSharing(true)

        // Notify room
        socketRef.current.emit('requestScreenShare', { roomId })

        // Create offers for all participants (naively for now, better to wait for them to request)
        // Or better: In a mesh, we initiate connection to existing peers
        // For simplicity: We wait for a "who is there" or just iterate known participants
        participants.forEach(async (p) => {
          if (p.userId === user.uid) return

          const pc = await webrtcRef.current.createPeerConnection(p.userId)
          stream.getTracks().forEach(track => pc.addTrack(track, stream))

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit('webrtc_ice_candidate', {
                targetUserId: p.userId,
                candidate: event.candidate,
                roomId
              })
            }
          }

          const offer = await webrtcRef.current.createOffer(p.userId)
          socketRef.current.emit('webrtc_offer', {
            targetUserId: p.userId,
            offer,
            roomId
          })
        })

        // Local preview
        setRemoteStream(stream)

      } catch (error) {
        console.error("Screen share failed", error)
      }
    }
  }

  const updateService = (service) => {
    const newState = { ...playbackState, service, isPlaying: false, currentTime: 0 }
    setLocalPlaybackState(newState)
    socketRef.current.emit('syncPlayback', { roomId, state: newState })
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-dark-secondary rounded-lg overflow-hidden mb-6">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {remoteStream ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
                ) : (
                  playbackState.service === 'netflix' ? (
                    <div className="text-white flex flex-col items-center">
                      <span className="text-4xl font-bold text-red-600">NETFLIX</span>
                      <span className="mt-4">Stream synchronization active</span>
                    </div>
                  ) : (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/dQw4w9WgXcQ`}
                      title="Video Player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                )}
              </div>

              {/* Streaming Buttons Logic */}
              <div className="flex gap-4 p-4 bg-dark-tertiary">
                <button onClick={() => updateService('youtube')} className={`px-4 py-1 rounded ${playbackState.service === 'youtube' ? 'bg-red-600' : 'bg-gray-700'}`}>YouTube</button>
                <button onClick={() => updateService('netflix')} className={`px-4 py-1 rounded ${playbackState.service === 'netflix' ? 'bg-red-800' : 'bg-gray-700'}`}>Netflix</button>
                <button onClick={() => updateService('hulu')} className={`px-4 py-1 rounded ${playbackState.service === 'hulu' ? 'bg-green-600' : 'bg-gray-700'}`}>Hulu</button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-dark-tertiary rounded transition">
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
              <div className="flex items-center gap-4">
                <div>👥 {participants?.length || 0} watching</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20">
              <h3 className="text-lg font-bold mb-4">Watching Together</h3>
              <div className="space-y-2">
                {participants?.map((participant, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {participant.avatar ? <img src={participant.avatar} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-accent-500" />}
                    <span className="text-sm">{participant.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-lg glass-effect border border-primary-500 border-opacity-20 flex flex-col h-96">
              <h3 className="text-lg font-bold mb-4">Chat</h3>
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {messages?.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <p className="font-semibold text-accent-400">{msg.senderName}</p>
                    <p className="text-gray-300">{msg.content}</p>
                  </div>
                ))}
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
  )
}
