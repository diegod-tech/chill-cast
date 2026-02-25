/**
 * WebRTCManager — Simple, battle-tested screen share implementation.
 *
 * Design: All state is on the RTCPeerConnection object itself (via a wrapper object).
 * This avoids the "Maps out of sync" problem.
 *
 * Key fix: ICE candidate queuing via a per-connection pendingCandidates array.
 * Candidates received before the remote description is set are queued and flushed
 * the moment setRemoteDescription succeeds.
 */

/**
 * ICE servers for WebRTC NAT traversal.
 *
 * STUN: Helps peers discover their public IP (needed for initial handshake).
 * TURN: Relays media traffic when direct P2P fails (required for cross-network).
 *
 * Without TURN, screen share works only on the same local network.
 * With TURN, it works across any network (mobile, corporate, VPN, etc.).
 */
const ICE_SERVERS = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },

  // Free TURN servers from open-relay.metered.ca
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  // Additional free TURN (numb.viagenie.ca)
  {
    urls: 'turn:numb.viagenie.ca',
    username: 'webrtc@live.com',
    credential: 'muazkh',
  },
]

export class WebRTCManager {
  constructor() {
    /** @type {Map<string, { pc: RTCPeerConnection, pendingCandidates: RTCIceCandidateInit[], remoteSet: boolean }>} */
    this.peers = new Map()
    this.events = {}
  }

  // ─── Event Emitter ────────────────────────────────────────────────────────────
  on(event, fn) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(fn)
  }
  off(event, fn) {
    if (this.events[event]) this.events[event] = this.events[event].filter(l => l !== fn)
  }
  emit(event, ...args) {
    ; (this.events[event] || []).forEach(fn => { try { fn(...args) } catch (e) { console.error('[WEBRTC] emit error:', e) } })
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────────

  /** Get peer state object or null */
  _peer(peerId) {
    return this.peers.get(peerId) || null
  }

  /** Create or get the peer entry. Returns the entry. */
  async _ensurePeer(peerId) {
    const entry = this.peers.get(peerId)
    if (entry) {
      const { pc } = entry
      const alive = pc.connectionState !== 'closed'
        && pc.connectionState !== 'failed'
        && pc.signalingState !== 'closed'
      if (alive) return entry
      console.log(`[WEBRTC] ♻️ Recreating dead PC for ${peerId}`)
      try { pc.close() } catch (_) { }
      this.peers.delete(peerId)
    }

    return this._createPeer(peerId)
  }

  /** Always creates a BRAND NEW peer entry. */
  _createPeer(peerId) {
    console.log(`[WEBRTC] ➕ Creating RTCPeerConnection for ${peerId}`)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    /** @type {{ pc: RTCPeerConnection, pendingCandidates: RTCIceCandidateInit[], remoteSet: boolean }} */
    const entry = { pc, pendingCandidates: [], remoteSet: false }
    this.peers.set(peerId, entry)

    // Relay our ICE candidates to the other side via the app's socket
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log(`[WEBRTC] 🧊 ICE → ${peerId}`)
        this.emit('icecandidate', candidate, peerId)
      }
    }

    // When we receive remote tracks, bundle them into one MediaStream
    const inboundStream = new MediaStream()
    pc.ontrack = ({ track }) => {
      console.log(`[WEBRTC] 🎥 Track from ${peerId}: ${track.kind}`)
      if (!inboundStream.getTracks().find(t => t.id === track.id)) {
        inboundStream.addTrack(track)
      }
      this.emit('remoteStream', inboundStream, peerId)
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WEBRTC] 🌐 ${peerId}: ${pc.connectionState}`)
      if (pc.connectionState === 'connected') this.emit('connected', peerId)
      if (pc.connectionState === 'failed') this.emit('failed', peerId)
    }
    pc.oniceconnectionstatechange = () => console.log(`[WEBRTC] 🧊 ICE ${peerId}: ${pc.iceConnectionState}`)
    pc.onsignalingstatechange = () => console.log(`[WEBRTC] 🚦 SIG ${peerId}: ${pc.signalingState}`)

    return entry
  }

  /** Apply a candidate to a PC, queuing it if remote description is not yet set. */
  async _applyCandidate(peerId, candidate) {
    // Ensure the entry exists (peer may not have a PC yet)
    if (!this.peers.has(peerId)) {
      // Create a stub entry with just a queue — the PC will be created on offer/answer
      const entry = { pc: null, pendingCandidates: [candidate], remoteSet: false }
      this.peers.set(peerId, entry)
      console.log(`[WEBRTC] 🧊 Pre-queued candidate for ${peerId} (no PC yet, queue: 1)`)
      return
    }

    const entry = this.peers.get(peerId)
    if (!entry.remoteSet || !entry.pc) {
      entry.pendingCandidates.push(candidate)
      console.log(`[WEBRTC] 🧊 Queued candidate for ${peerId} (queue: ${entry.pendingCandidates.length})`)
      return
    }

    try {
      await entry.pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.warn(`[WEBRTC] ICE error for ${peerId}:`, e.message)
    }
  }

  /** Flush pending candidates after remote desc is set. */
  async _flushCandidates(peerId) {
    const entry = this.peers.get(peerId)
    if (!entry || !entry.pc) return
    if (entry.pendingCandidates.length === 0) return
    console.log(`[WEBRTC] 🚿 Flushing ${entry.pendingCandidates.length} candidates for ${peerId}`)
    for (const c of entry.pendingCandidates) {
      try { await entry.pc.addIceCandidate(new RTCIceCandidate(c)) }
      catch (e) { console.warn(`[WEBRTC] Flush ICE error for ${peerId}:`, e.message) }
    }
    entry.pendingCandidates = []
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * HOST: Create a connection to `peerId`, add tracks from `stream`, create & return offer SDP.
   */
  async createOffer(peerId, stream) {
    // Always start fresh for a new share session
    this.close(peerId)
    const entry = this._createPeer(peerId)
    const { pc } = entry

    // Add every track from the local stream
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
      console.log(`[WEBRTC] ➕ Track added (${track.kind}) for ${peerId}`)
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.log(`[WEBRTC] 📤 Offer ready for ${peerId}`)
    return pc.localDescription
  }

  /**
   * PARTICIPANT: Handle incoming offer from `peerId`, return answer SDP.
   * @param {string} peerId
   * @param {RTCSessionDescriptionInit} offerSdp
   * @param {MediaStream} [localStream] - Optional local stream to add (e.g. mic)
   */
  async handleOffer(peerId, offerSdp, localStream) {
    console.log(`[WEBRTC] 📥 Handling offer from ${peerId}`)

    // Check if we have a stub entry with pre-queued candidates
    const existing = this.peers.get(peerId)
    let entry
    if (existing && !existing.pc) {
      // Stub has pre-queued candidates — create real PC and attach them
      const real = this._createPeer(peerId)
      real.pendingCandidates = existing.pendingCandidates
      entry = real
    } else {
      entry = await this._ensurePeer(peerId)
    }

    const { pc } = entry

    // If we have a local stream (e.g. mic), add its tracks so the caller hears us
    if (localStream) {
      localStream.getTracks().forEach(track => {
        // Avoid adding duplicate tracks
        const senders = pc.getSenders()
        if (!senders.find(s => s.track?.id === track.id)) {
          pc.addTrack(track, localStream)
          console.log(`[WEBRTC] ➕ Added local ${track.kind} track for ${peerId}`)
        }
      })
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
    entry.remoteSet = true
    await this._flushCandidates(peerId)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    console.log(`[WEBRTC] 📤 Answer ready for ${peerId}`)
    return pc.localDescription
  }

  /**
   * HOST: Handle incoming answer from `peerId`.
   */
  async handleAnswer(peerId, answerSdp) {
    console.log(`[WEBRTC] 📥 Handling answer from ${peerId}`)
    const entry = this.peers.get(peerId)
    if (!entry || !entry.pc) {
      console.warn(`[WEBRTC] handleAnswer: no PC for ${peerId}`)
      return
    }
    const { pc } = entry
    if (pc.signalingState === 'stable' || pc.signalingState === 'closed') {
      console.warn(`[WEBRTC] handleAnswer: wrong signalingState (${pc.signalingState}) for ${peerId}, skipping`)
      return
    }
    await pc.setRemoteDescription(new RTCSessionDescription(answerSdp))
    entry.remoteSet = true
    await this._flushCandidates(peerId)
    console.log(`[WEBRTC] ✅ Connection ready with ${peerId}`)
  }

  /**
   * Add a remote ICE candidate for `peerId`. Queues if remote desc not yet set.
   */
  async addIceCandidate(peerId, candidate) {
    if (!candidate) return
    await this._applyCandidate(peerId, candidate)
  }

  /**
   * Capture screen and return the MediaStream.
   */
  async getScreenStream() {
    return navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true, // Enables system audio — Chrome shows "Share system audio" checkbox
    })
  }

  /**
   * Close the connection to a specific peer.
   */
  close(peerId) {
    const entry = this.peers.get(peerId)
    if (entry?.pc) {
      try { entry.pc.close() } catch (_) { }
    }
    this.peers.delete(peerId)
    console.log(`[WEBRTC] 🗑️ Closed connection to ${peerId}`)
  }

  /**
   * Close all connections except `excludeId` (pass the host's UID to exclude self).
   */
  closeAll(excludeId) {
    for (const [peerId] of this.peers) {
      if (peerId !== excludeId) this.close(peerId)
    }
  }

  /**
   * Fully destroy all connections (called on component unmount).
   */
  destroy() {
    for (const [, entry] of this.peers) {
      if (entry?.pc) try { entry.pc.close() } catch (_) { }
    }
    this.peers.clear()
    this.events = {}
    console.log('[WEBRTC] 💥 Destroyed all connections')
  }
}

export default WebRTCManager
