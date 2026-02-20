// Content script to interact with Netflix player

console.log("Chill Cast Netflix Sync loaded");

let videoPlayer = null;
let isRemoteUpdate = false;

// Function to find the video element
function findVideoPlayer() {
    const video = document.querySelector('video');
    if (video) {
        console.log("Netflix video player found");
        videoPlayer = video;
        setupListeners(video);
    } else {
        // Retry if not found yet (Netflix is SPA)
        setTimeout(findVideoPlayer, 1000);
    }
}

function setupListeners(video) {
    // Play event
    video.addEventListener('play', () => {
        if (!isRemoteUpdate) {
            console.log("Local Play Event");
            sendMessage({ action: 'play', time: video.currentTime });
        }
    });

    // Pause event
    video.addEventListener('pause', () => {
        if (!isRemoteUpdate) {
            console.log("Local Pause Event");
            sendMessage({ action: 'pause', time: video.currentTime });
        }
    });

    // Seek event
    video.addEventListener('seeked', () => {
        if (!isRemoteUpdate) {
            console.log("Local Seek Event");
            sendMessage({ action: 'seek', time: video.currentTime });
        }
    });
}

function sendMessage(data) {
    chrome.runtime.sendMessage({ action: 'sync_event', data: data });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sync_event') {
        handleRemoteEvent(request.data);
    }
});

function handleRemoteEvent(event) {
    if (!videoPlayer) return;

    isRemoteUpdate = true;
    console.log("Received Remote Event:", event);

    const TOLERANCE = 0.5; // seconds

    switch (event.action) {
        case 'play':
            if (videoPlayer.paused) {
                videoPlayer.play().catch(e => console.error("Play error:", e));
            }
            if (Math.abs(videoPlayer.currentTime - event.time) > TOLERANCE) {
                videoPlayer.currentTime = event.time;
            }
            break;
        case 'pause':
            if (!videoPlayer.paused) {
                videoPlayer.pause();
            }
            break;
        case 'seek':
            if (Math.abs(videoPlayer.currentTime - event.time) > TOLERANCE) {
                videoPlayer.currentTime = event.time;
            }
            break;
    }

    // Reset flag after a short delay to allow events to settle
    setTimeout(() => {
        isRemoteUpdate = false;
    }, 500);
}

// Initialize
findVideoPlayer();
