/**
 * WebRTC utilities for screen sharing and P2P video/audio
 */

export class WebRTCManager {
  constructor() {
    this.peerConnections = new Map()
    this.dataChannels = new Map()
    this.events = {}
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(listener)
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }

  /**
   * Create peer connection
   */
  async createPeerConnection(peerId, iceServers = []) {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: iceServers.length > 0 ? iceServers : [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ],
    })

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[PC] Generated ICE candidate for ${peerId}`)
        this.emit('ice-candidate', event.candidate, peerId)
      }
    }

    peerConnection.ontrack = (event) => {
      console.log(`[PC] 🎥 Received track from ${peerId} (type: ${event.track.kind})`)

      // Get or create a media stream for this peer
      let stream = this.peerStreams?.get(peerId)
      if (!stream) {
        stream = new MediaStream()
        if (!this.peerStreams) this.peerStreams = new Map()
        this.peerStreams.set(peerId, stream)
      }

      // Add the track to the stream
      stream.addTrack(event.track)

      // Emit the stream (UI will update on every track but keep same stream ref)
      this.emit('remoteStream', stream, peerId)
    }

    peerConnection.onconnectionstatechange = () => {
      console.log(`[PC] 🌐 Connection state with ${peerId}: ${peerConnection.connectionState}`)
      if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
        this.peerConnections.delete(peerId)
        if (this.peerStreams) this.peerStreams.delete(peerId)
      }
    }

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`[PC] 🧊 ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`)
    }

    peerConnection.onsignalingstatechange = () => {
      console.log(`[PC] 🚥 Signaling state with ${peerId}: ${peerConnection.signalingState}`)
    }

    this.peerConnections.set(peerId, peerConnection)
    return peerConnection
  }

  /**
   * Get screen share stream
   */
  async getScreenStream() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        },
        audio: true,
      })
      return stream
    } catch (error) {
      console.error('Failed to get screen stream:', error)
      throw error
    }
  }

  /**
   * Get microphone/camera stream
   */
  async getUserStream(audio = true, video = true) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      })
      return stream
    } catch (error) {
      console.error('Failed to get user stream:', error)
      throw error
    }
  }

  /**
   * Add track to peer connection
   */
  addTrack(peerId, track, stream) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.addTrack(track, stream)
    }
  }

  /**
   * Create and send offer
   */
  async createOffer(peerId) {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection) return null

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    return offer
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(peerId, offer) {
    let peerConnection = this.peerConnections.get(peerId)

    // If connection exists but is CLOSED, we MUST recreate it
    if (peerConnection && (peerConnection.connectionState === 'closed' || peerConnection.signalingState === 'closed')) {
      console.log(`[Manager] Recreating closed connection for ${peerId}`)
      this.closePeerConnection(peerId)
      peerConnection = null
    }

    if (!peerConnection) {
      console.log(`[Manager] Creating new connection for incoming offer from ${peerId}`)
      peerConnection = await this.createPeerConnection(peerId)
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    return answer
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(peerId, answer) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  /**
   * Add ICE candidate
   */
  async addICECandidate(peerId, candidate) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection && candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('Error adding ICE candidate', e)
      }
    }
  }

  /**
   * Close peer connection
   */
  closePeerConnection(peerId) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }

    const dataChannel = this.dataChannels.get(peerId)
    if (dataChannel) {
      dataChannel.close()
      this.dataChannels.delete(peerId)
    }
  }

  /**
   * Stop all streams
   */
  stopAllStreams() {
    this.peerConnections.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        sender.track?.stop()
      })
      pc.close()
    })
    this.peerConnections.clear()
    this.dataChannels.clear()
  }
}

export default WebRTCManager
