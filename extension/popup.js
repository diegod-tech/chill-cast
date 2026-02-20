document.getElementById('connectBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomId').value;
    if (roomId) {
        chrome.runtime.sendMessage({ action: 'connect', roomId: roomId }, (response) => {
            document.getElementById('status').textContent = 'Connecting to ' + roomId + '...';
        });
    }
});
