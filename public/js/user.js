console.log('User.js loaded');

// Connection status elements
const connectionStatus = document.getElementById('connection-status');
const startCameraBtn = document.getElementById('start-camera-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const cameraFeed = document.getElementById('camera-feed');
const cameraCard = document.getElementById('camera-card');
const musicPlayer = document.getElementById('music-player');

// Initialize Socket.IO
const socket = io();

// Update connection status
function updateConnectionStatus(isConnected) {
    if (isConnected) {
        connectionStatus.className = 'uk-text-success';
        connectionStatus.innerHTML = '<span class="mdi mdi-circle"></span> Connected';
    } else {
        connectionStatus.className = 'uk-text-danger';
        connectionStatus.innerHTML = '<span class="mdi mdi-circle"></span> Disconnected';
    }
}

// Socket event handlers
socket.on('connect', () => {
    updateConnectionStatus(true);
    socket.emit('user-connect');
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

// Store timeout IDs
socket.on('strobe-user', (dataPoint) => {
    let brightness = dataPoint.brightness/100;
    let action = dataPoint.action;

    console.log('USER: STROBBING', cameraFeed.style.borderColor, brightness, action);

    //if we have access to the flashlight, adjust the brightness otherwise just use the border color
    if (currentTrack) {
        //adjust the brightness of the flashlight to the brightness value
        if (brightness == 0) {
            currentTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
        } else if (brightness == 1) {
            currentTrack.applyConstraints({
                advanced: [{ torch: true }]
            });
        }
    } else {
        //strobe the border color on and off every 100ms
        cameraCard.style.borderColor = 'rgba(197, 197, 197, ' + brightness + ')';
    }

});

socket.on('stop-light-show', () => {
    console.log('USER: STOPPING LIGHT SHOW');
    cameraFeed.style.borderColor = '#1b1b1b';
});


let currentStream = null;
let currentTrack = null;

// Camera and flashlight handling
async function startCameraAndFlashlight() {
    try {
        // Request camera and flashlight permissions
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                advanced: [{
                    torch: true
                }]
            }
        });

        // Store the stream and track for later use
        currentStream = stream;
        currentTrack = stream.getVideoTracks()[0];

        // Set up camera feed
        cameraCard.style.display = 'block';
        cameraFeed.srcObject = stream;
        cameraFeed.style.display = 'block';

        // Try to enable flashlight
        if (currentTrack.getCapabilities().torch) {
            await currentTrack.applyConstraints({
                advanced: [{ torch: true }]
            });
            socket.emit('flashlight-connect');
        } else {
            console.error('Flashlight not found');
        }

        // Update button states
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-block';

    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.error('Camera not found');
        } else {
            console.error('Error accessing camera:', error);
        }
    }
}

function stopCameraAndFlashlight() {
    if (currentStream) {
        // Stop all tracks
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
        currentTrack = null;
        socket.emit('flashlight-disconnect');
    }

    // Clear video source
    cameraFeed.srcObject = null;
    cameraFeed.style.display = 'none';

    // Reset button states
    startCameraBtn.style.display = 'inline-block';
    stopCameraBtn.style.display = 'none';
}

// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);

// Initial state
updateConnectionStatus(false); 