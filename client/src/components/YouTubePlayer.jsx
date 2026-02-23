/**
 * YouTubePlayer — programmatically controlled YouTube embed.
 *
 * Uses the YouTube IFrame Player API so we can call
 * playVideo() / pauseVideo() / seekTo() from JS,
 * enabling true synchronized playback across all users.
 *
 * Props:
 *   videoId      — YouTube video ID (e.g. "dQw4w9WgXcQ")
 *   isPlaying    — true = play, false = pause
 *   currentTime  — seconds to seek to when video loads
 *   onReady      — called when player is ready: (playerRef) => void
 *   onStateChange — called on player state change: ({ isPlaying, currentTime }) => void
 */

import { useEffect, useRef } from 'react'

// Load the YouTube IFrame API script once, globally.
let ytApiLoaded = false
let ytApiCallbacks = []

function loadYouTubeAPI() {
    if (ytApiLoaded) return
    ytApiLoaded = true

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)

    // The API calls window.onYouTubeIframeAPIReady when ready
    window.onYouTubeIframeAPIReady = () => {
        ytApiCallbacks.forEach(cb => cb())
        ytApiCallbacks = []
    }
}

function onYouTubeReady(cb) {
    if (window.YT && window.YT.Player) {
        cb()
    } else {
        ytApiCallbacks.push(cb)
        loadYouTubeAPI()
    }
}

export default function YouTubePlayer({ videoId, isPlaying, currentTime, onReady, onStateChange }) {
    const containerRef = useRef(null)
    const playerRef = useRef(null)
    // Track whether the last state change was initiated externally (sync) or by the user
    const isSyncingRef = useRef(false)

    // Create/destroy the player when videoId changes
    useEffect(() => {
        if (!videoId) return

        let destroyed = false

        onYouTubeReady(() => {
            if (destroyed || !containerRef.current) return

            // Destroy old player if present
            if (playerRef.current) {
                try { playerRef.current.destroy() } catch (_) { }
                playerRef.current = null
            }

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId,
                playerVars: {
                    autoplay: isPlaying ? 1 : 0,
                    start: Math.floor(currentTime || 0),
                    controls: 1,                // show native controls
                    rel: 0,                     // no related videos at end
                    modestbranding: 1,
                },
                events: {
                    onReady: (e) => {
                        if (onReady) onReady(playerRef)
                    },
                    onStateChange: (e) => {
                        // Ignore events fired because WE programmatically changed state
                        if (isSyncingRef.current) return

                        const YT = window.YT.PlayerState
                        if (e.data === YT.PLAYING) {
                            const ct = playerRef.current?.getCurrentTime?.() ?? 0
                            onStateChange?.({ isPlaying: true, currentTime: ct })
                        } else if (e.data === YT.PAUSED) {
                            const ct = playerRef.current?.getCurrentTime?.() ?? 0
                            onStateChange?.({ isPlaying: false, currentTime: ct })
                        }
                    },
                },
            })
        })

        return () => {
            destroyed = true
            if (playerRef.current) {
                try { playerRef.current.destroy() } catch (_) { }
                playerRef.current = null
            }
        }
        // Only recreate when videoId changes — play/pause are handled by the effect below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId])

    // Sync play/pause/seek from external state WITHOUT recreating the player
    useEffect(() => {
        const player = playerRef.current
        if (!player?.getPlayerState) return

        isSyncingRef.current = true

        try {
            const state = player.getPlayerState()
            const YT = window.YT?.PlayerState

            if (isPlaying) {
                // Seek first if needed (> 2 s drift), then play
                const ct = player.getCurrentTime?.() ?? 0
                if (currentTime != null && Math.abs(ct - currentTime) > 2) {
                    player.seekTo(currentTime, true)
                }
                if (state !== YT?.PLAYING) player.playVideo()
            } else {
                if (state === YT?.PLAYING) player.pauseVideo()
            }
        } catch (_) { }

        // Clear flag after a short debounce so user events are captured again
        setTimeout(() => { isSyncingRef.current = false }, 500)
    }, [isPlaying, currentTime])

    return (
        <div className="w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}
