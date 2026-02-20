importScripts('socket.io.min.js');

let socket = null;
let currentRoomId = null;



// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "connect") {
        connectToRoom(request.roomId);
        sendResponse({ status: "connecting" });
    } else if (request.action === "sync_event") {
        if (socket && socket.connected) {
            socket.emit("netflix_sync", {
                ...request.data,
                roomId: currentRoomId
            });
        }
    }
    return true;
});

function connectToRoom(roomId) {
    if (socket) {
        socket.disconnect();
    }

    // Connect to the Chill Cast server
    // Assuming localhost for now, user might need to configure this
    socket = io("http://localhost:5000");

    socket.on("connect", () => {
        console.log("Connected to Chill Cast server");
        currentRoomId = roomId;
        socket.emit("join_room", roomId); // Reusing existing join_room or create new one?
        // Let's use specific netflix join if needed, but join_room should work for grouping
    });

    socket.on("netflix_sync", (data) => {
        // Broadcast to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "sync_event",
                    data: data
                });
            }
        });
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from Chill Cast server");
    });
}
