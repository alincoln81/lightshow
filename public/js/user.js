//console.log('User.js loaded');

// Connection status elements
const startCameraBtn = document.getElementById('start-camera-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const cameraFeed = document.getElementById('camera-feed');
const cameraCard = document.getElementById('camera-card');

let currentStream = null;
let currentTrack = null;
let flashlight = null;
let pulseInterval = null;

// Initialize Socket.IO
const socket = io();

// Socket event handlers
socket.on('connect', () => {
    socket.emit('user-connect');
});

socket.on('state-update', (state) => {
    console.log('USER: STATE UPDATE', state);
});

socket.on('disconnect', () => {
});

// Store timeout IDs
socket.on('strobe-user', (dataPoint) => {
    let brightness = dataPoint.brightness;
    //if we have access to the flashlight, adjust the brightness otherwise just use the border color
    if (flashlight && currentTrack) {
        //adjust the brightness of the flashlight to the brightness value
        if (brightness == 0) {
            currentTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
        } else if (brightness == 1) {
            currentTrack.applyConstraints({
                advanced: [{torch: true}]
            });
        }
    } else {
        cameraCard.style.backgroundColor = 'rgba(255, 255, 255, ' + brightness + ')';
    }
});

socket.on('pulse-user', () => {
    let brightness = 0;
    let torchState = true;
    //Set an interval to pulse the flashlight and camera border on and off every 400ms
    pulseInterval = setInterval(() => {
        

        if (flashlight && currentTrack) {
            try {
                const capabilities = currentTrack.getCapabilities();
                if (capabilities.torchLevel) {
                    currentTrack.applyConstraints({
                        advanced: [
                            {torch: torchState},
                            {torchLevel: brightness}  // Value between 0.0 and 1.0
                        ]
                    });
                } else {
                    // Fallback to basic torch control if brightness control is not supported
                    currentTrack.applyConstraints({
                        advanced: [{torch: torchState}]
                    });
                }
            } catch (error) {
                console.warn('Error setting torch brightness:', error);
                // Fallback to basic torch control
                currentTrack.applyConstraints({
                    advanced: [{torch: torchState}]
                });
            }
        } else {
            cameraCard.style.backgroundColor = 'rgba(255, 255, 255, ' + brightness + ')';
        }


        
        if (torchState == true) {
            
            console.log('USER: PULSE INTERVAL',  
                'torchState:', torchState, 
                'brightness:', brightness
            );

            brightness += 0.025;

            if (brightness > 1) {
                brightness = 1;
                torchState = false;
            }

        } else if (torchState == false) {
            console.log('USER: PULSE INTERVAL',  
                'torchState:', torchState, 
                'brightness:', brightness
            );

            brightness -= 0.025;

            if (brightness < 0) {
                brightness = 0;
                torchState = true;
            }
        }
    }, 50);
});

socket.on('stop-light-show', () => {
    //console.log('USER: STOPPING LIGHT SHOW');
    cameraCard.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    if (pulseInterval) {
        clearInterval(pulseInterval);
    }
});

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
        cameraFeed.srcObject = stream;

        // Try to enable flashlight
        if (currentTrack.getCapabilities().torch) {
            try {
                const capabilities = currentTrack.getCapabilities();
                if (capabilities.torchLevel) {
                    await currentTrack.applyConstraints({
                        advanced: [
                            {torch: true},
                            {torchLevel: 1.0}  // Value between 0.0 and 1.0
                        ]
                    });
                } else {
                    // Fallback to basic torch control if brightness control is not supported
                    await currentTrack.applyConstraints({
                        advanced: [{torch: true}]
                    });
                }
                socket.emit('flashlight-connect');
                flashlight = true;
            } catch (error) {
                console.warn('Error setting initial torch brightness:', error);
                // Fallback to basic torch control
                await currentTrack.applyConstraints({
                    advanced: [{torch: true}]
                });
                socket.emit('flashlight-connect');
                flashlight = true;
            }
        } else {
            console.warn('Flashlight not found');
            flashlight = false;
        }

        // Update button states
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-block';

    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.warn('Camera not found');
        } else {
            console.warn('Error accessing camera:', error);
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

    // Reset button states
    startCameraBtn.style.display = 'inline-block';
    stopCameraBtn.style.display = 'none';
}

// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);
