/**
 * WebRTC Manager — Screen Sharing (Google Meet style)
 *
 * Key design decisions:
 *  - ICE candidates are QUEUED until the remote description is set, then flushed.
 *    This is the #1 fix that makes P2P handshakes reliable.
 *  - Each peerId gets its own connection, candidate queue, and flush state.
 *  - resetPeerConnection() force-closes and removes a connection so a fresh
 *    offer can be made without stale state.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export class WebRTCManager {
  constructor() {
    this.peerConnections = new Map()   // peerId → RTCPeerConnection
    this.peerStreams = new Map()   // peerId → MediaStream (received)
    this.iceCandidateQueues = new Map() // peerId → RTCIceCandidate[]
    this.remoteDescSet = new Map()   // peerId → boolean
    this.events = {}
  }

  // ─── Event Emitter ───────────────────────────────────────────────────────────

  on(event, listener) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(listener)
  }

  off(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener)
    }
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => {
        try { listener(...args) } catch (e) { console.error('[WebRTC] Listener error:', e) }
      })
    }
  }

  // ─── Peer Connection ──────────────────────────────────────────────────────────

  /**
   * Creates a new RTCPeerConnection for peerId.
   * If one already exists and is still alive, returns it.
   * If one exists but is closed/failed, resets it first.
   */
  async createPeerConnection(peerId) {
    const existing = this.peerConnections.get(peerId)
    if (existing) {
      const dead = existing.connectionState === 'closed'
        || existing.connectionState === 'failed'
        || existing.signalingState === 'closed'
      if (!dead) {
        console.log(`[PC] Reusing existing connection for ${peerId}`)
        return existing
      }
      console.log(`[PC] Resetting dead connection for ${peerId}`)
      this._resetPeer(peerId)
    }

    console.log(`[PC] Creating new RTCPeerConnection for ${peerId}`)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // ICE candidate → queue until we know remote desc is set
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[PC] 🧊 ICE candidate for ${peerId}`)
        this.emit('ice-candidate', event.candidate, peerId)
      }
    }

    // Track arrives → bundle into a single stream and emit
    pc.ontrack = (event) => {
      console.log(`[PC] 🎥 Track received from ${peerId}: ${event.track.kind}`)
      let stream = this.peerStreams.get(peerId)
      if (!stream) {
        stream = new MediaStream()
        this.peerStreams.set(peerId, stream)
      }
      // Avoid duplicate tracks
      if (!stream.getTracks().find(t => t.id === event.track.id)) {
        stream.addTrack(event.track)
      }
      this.emit('remoteStream', stream, peerId)
    }

    pc.onconnectionstatechange = () => {
      console.log(`[PC] 🌐 ${peerId}: ${pc.connectionState}`)
      if (pc.connectionState === 'connected') {
        this.emit('peerConnected', peerId)
      }
      if (pc.connectionState === 'failed') {
        console.warn(`[PC] ⚠️ Connection FAILED for ${peerId}, may need restart`)
        this.emit('peerFailed', peerId)
      }
      if (pc.connectionState === 'disconnected') {
        this.emit('peerDisconnected', peerId)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[PC] 🧊 ICE ${peerId}: ${pc.iceConnectionState}`)
    }

    pc.onsignalingstatechange = () => {
      console.log(`[PC] 🚥 Signaling ${peerId}: ${pc.signalingState}`)
    }

    // Initialize per-peer state
    this.peerConnections.set(peerId, pc)
    this.iceCandidateQueues.set(peerId, [])
    this.remoteDescSet.set(peerId, false)

    return pc
  }

  /** Force-closes and removes all state for a peer. */
  _resetPeer(peerId) {
    const pc = this.peerConnections.get(peerId)
    if (pc) {
      try { pc.close() } catch (_) { }
      this.peerConnections.delete(peerId)
    }
    this.peerStreams.delete(peerId)
    this.iceCandidateQueues.delete(peerId)
    this.remoteDescSet.delete(peerId)
  }

  /** Public reset — same as _resetPeer but named for external use. */
  closePeerConnection(peerId) {
    this._resetPeer(peerId)
  }

  // ─── Offer / Answer ───────────────────────────────────────────────────────────

  /**
   * Creates and stores a local offer for peerId.
   * Caller must add tracks BEFORE calling this.
   */
  async createOffer(peerId) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) throw new Error(`[WebRTC] No PC for ${peerId}`)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.log(`[PC] 📤 Offer created for ${peerId}`)
    return offer
  }

  /**
   * Handles an incoming offer from peerId.
   * Resets connection if stale, sets remote desc, creates + returns answer.
   * After this call, ICE candidates for this peer are flushed.
   */
  async handleOffer(peerId, offer) {
    // Ensure clean connection
    const existing = this.peerConnections.get(peerId)
    if (existing) {
      const dead = existing.connectionState === 'closed'
        || existing.connectionState === 'failed'
        || existing.signalingState === 'closed'
      if (dead) this._resetPeer(peerId)
    }

    const pc = await this.createPeerConnection(peerId)

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    console.log(`[PC] 📥 Remote description set for ${peerId} (offer)`)

    // Mark remote desc as set so queued candidates can be flushed
    this.remoteDescSet.set(peerId, true)
    await this._flushCandidates(peerId)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    console.log(`[PC] 📤 Answer created for ${peerId}`)
    return answer
  }

  /**
   * Sets the remote answer for peerId after we sent an offer.
   * After this, queued ICE candidates are flushed.
   */
  async handleAnswer(peerId, answer) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) {
      console.warn(`[PC] handleAnswer: no PC for ${peerId}`)
      return
    }
    // Only set if in a state that accepts remote answers
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`[PC] handleAnswer: unexpected signaling state ${pc.signalingState} for ${peerId}`)
      return
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    console.log(`[PC] 📥 Remote description set for ${peerId} (answer)`)

    this.remoteDescSet.set(peerId, true)
    await this._flushCandidates(peerId)
  }

  // ─── ICE Candidate Queuing (The Critical Fix) ─────────────────────────────────

  /**
   * Adds an ICE candidate. If remote description is not yet set, queues it.
   * Once remote description is set, candidates are flushed via _flushCandidates().
   */
  async addICECandidate(peerId, candidate) {
    if (!candidate) return

    const remoteSet = this.remoteDescSet.get(peerId)
    if (!remoteSet) {
      // Queue it — will be applied when handleOffer/handleAnswer sets remote desc
      const queue = this.iceCandidateQueues.get(peerId) || []
      queue.push(candidate)
      this.iceCandidateQueues.set(peerId, queue)
      console.log(`[PC] 🧊 Queued ICE candidate for ${peerId} (queue size: ${queue.length})`)
      return
    }

    await this._applyCandidate(peerId, candidate)
  }

  async _flushCandidates(peerId) {
    const queue = this.iceCandidateQueues.get(peerId) || []
    if (queue.length === 0) return
    console.log(`[PC] 🚿 Flushing ${queue.length} queued ICE candidates for ${peerId}`)
    for (const candidate of queue) {
      await this._applyCandidate(peerId, candidate)
    }
    this.iceCandidateQueues.set(peerId, [])
  }

  async _applyCandidate(peerId, candidate) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      // This can happen benignly if the connection closed mid-handshake
      console.warn(`[PC] ICE candidate error for ${peerId}:`, e.message)
    }
  }

  // ─── Media ────────────────────────────────────────────────────────────────────

  async getScreenStream() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true,
    })
    return stream
  }

  /**
   * Add all tracks from `stream` to the PC for `peerId`.
   * Skips tracks that are already added (safe to call multiple times).
   */
  addTracksToConnection(peerId, stream) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    const existingSenderTracks = pc.getSenders().map(s => s.track?.id).filter(Boolean)
    stream.getTracks().forEach(track => {
      if (!existingSenderTracks.includes(track.id)) {
        pc.addTrack(track, stream)
        console.log(`[PC] ➕ Added ${track.kind} track to ${peerId}`)
      }
    })
  }

  /**
   * Replace all senders in a PC with tracks from the new stream.
   * Used when restarting a share — avoids renegotiation race conditions.
   */
  replaceTracksInConnection(peerId, stream) {
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    const newTracks = stream.getTracks()
    pc.getSenders().forEach(sender => {
      const replacement = newTracks.find(t => t.kind === sender.track?.kind)
      if (replacement) sender.replaceTrack(replacement)
    })
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Close all connections and reset all state.
   */
  stopAllStreams() {
    this.peerConnections.forEach((pc, peerId) => {
      pc.getSenders().forEach(sender => { try { sender.track?.stop() } catch (_) { } })
      try { pc.close() } catch (_) { }
    })
    this.peerConnections.clear()
    this.peerStreams.clear()
    this.iceCandidateQueues.clear()
    this.remoteDescSet.clear()
    console.log('[WebRTC] 🧹 All streams and connections stopped')
  }

  /**
   * Close only the share-related connections (all peers except self).
   * Used when stopping a screen share without destroying the manager.
   */
  stopShareConnections(selfUid) {
    for (const [peerId] of this.peerConnections) {
      if (peerId !== selfUid) this._resetPeer(peerId)
    }
    console.log('[WebRTC] 🧹 Share connections stopped')
  }
}

export default WebRTCManager
