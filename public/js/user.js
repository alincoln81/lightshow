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
let flashTimeouts = [];

socket.on('strobe-user', (dataPoint) => {
    console.log('USER: STROBBING', dataPoint);

    let brightness = dataPoint.brightness/100;
    let action = dataPoint.action;

    console.log('USER: STROBBING', cameraFeed.style.borderColor, brightness, action);

    if (action == "flash") {
        // Clear any existing timeouts
        flashTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        flashTimeouts = [];

        cameraFeed.style.borderColor = 'rgba(197, 197, 197, ' + brightness + ')';

        //hold the border color for 150ms and then fade it out over 100ms
        const holdTimeout = setTimeout(() => {
            //fade out the border color over 100ms in 10ms increments
            for (let i = 0; i < 10; i++) {
                const fadeTimeout = setTimeout(() => {
                    cameraFeed.style.borderColor = 'rgba(197, 197, 197, ' + (brightness - i * 0.1) + ')';
                }, i * 10);
                flashTimeouts.push(fadeTimeout);
            }
        }, 150);
        flashTimeouts.push(holdTimeout);
    } else if (action == "strobe") {
        //strobe the border color on and off every 100ms
        cameraFeed.style.borderColor = 'rgba(197, 197, 197, ' + brightness + ')';
        cameraCard.style.borderColor = 'rgba(197, 197, 197, ' + brightness + ')';
        //adjust the brightness of the flashlight if brightness is == 0 off and if brightness is == 100 on
        if (brightness == 0) {
            currentTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
        } else if (brightness == 100) {
            currentTrack.applyConstraints({
                advanced: [{ torch: true }]
            });
        }

    } else if (action == "blackout_then_flash") {
        // Clear any existing timeouts
        flashTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        flashTimeouts = [];
        cameraFeed.style.borderColor = '#1b1b1b';
        const blackoutTimeout = setTimeout(() => {
            //flash the border color over 100ms in 10ms increments
            cameraFeed.style.borderColor = 'rgba(197, 197, 197, 1)';
            const holdTimeout = setTimeout(() => {
                //fade out the border color over 100ms in 10ms increments
                for (let i = 0; i < 10; i++) {
                    const fadeTimeout = setTimeout(() => {
                        cameraFeed.style.borderColor = 'rgba(197, 197, 197, ' + (100 - i * 0.1) + ')';
                    }, i * 10);
                    flashTimeouts.push(fadeTimeout);
                }
            }, 150);
            flashTimeouts.push(holdTimeout);
        }, 100);
        flashTimeouts.push(blackoutTimeout);
    } else {
        // Clear any existing timeouts
        flashTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        flashTimeouts = [];
        cameraFeed.style.borderColor = '#1b1b1b';
    }
});

socket.on('stream-music', (songWave) => {
    console.log('USER: STREAMING MUSIC', songWave);
    if (!musicPlayer) {
        console.error('Music player element not found');
        return;
    }
    // Set the source and play
    musicPlayer.src = '/assets/music/' + songWave;
    musicPlayer.play().catch(error => {
        console.error('Error playing music:', error);
        UIkit.notification({
            message: 'Error playing music. Please check if your browser allows audio playback.',
            status: 'danger',
            pos: 'top-right',
            timeout: 5000
        });
    });
});

socket.on('stop-music', () => {
    console.log('USER: STOPPING MUSIC');
    if (musicPlayer) {
        musicPlayer.pause();
        musicPlayer.currentTime = 0;
    }
    flashTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    flashTimeouts = [];
    cameraFeed.style.borderColor = '#1b1b1b';
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

// Handle flashlight state changes
socket.on('flashlight-state', async (state) => {
    console.log('Flashlight state:', state);
    if (currentTrack && currentTrack.getCapabilities().torch) {
        try {
            if (typeof state === 'object') {
                // Handle brightness control
                await currentTrack.applyConstraints({
                    advanced: [
                        { torch: true },
                        { exposureMode: 'manual' },
                        { exposureTime: state.brightness }
                    ]
                });
            } else {
                // Handle simple on/off
                await currentTrack.applyConstraints({
                    advanced: [{ torch: state }]
                });
            }
        } catch (error) {
            console.error('Error setting flashlight state:', error);
        }
    }
    // Update camera feed border
    let brightness = state.brightness/100;
    cameraFeed.style.borderColor = state ? 'rgba(197, 197, 197, ' + brightness + ')' : '#1b1b1b';
});

// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);

// Initial state
updateConnectionStatus(false); 