/**
 * WebRTC utilities for screen sharing and P2P video/audio
 */

export class WebRTCManager {
  constructor() {
    this.peerConnections = new Map()
    this.dataChannels = new Map()
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

    // Set up event handlers
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to remote peer
        console.log('ICE candidate generated')
      }
    }

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, peerConnection.connectionState)
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
        audio: false,
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
    if (!peerConnection) {
      // If we don't have a PC yet for this peer (e.g. we are receiver), create one
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
