//console.log('User.js loaded');

// Connection status elements
const startCameraBtn = document.getElementById('start-camera-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const cameraFeed = document.getElementById('camera-feed');
const cameraCard = document.getElementById('camera-card');
const body = document.getElementById('body');
const cameraCardTitle = document.getElementById('camera-card-title');

let currentStream = null;
let currentTrack = null;
let flashlight = null;
let pulseInterval = null;

let currentAction = null;

// Initialize Socket.IO
const socket = io();

// Socket event handlers
socket.on('connect', () => {
    socket.emit('user-connect');
});

socket.on('state-update', (state) => {
    console.log('USER: STATE UPDATE', state);
    currentAction = state.action;
    //if state.action == 'pulse' then we need to start the pulse interval
    console.log('Current Action:', currentAction);

    //if currentAction == 'pulse' then we need to start the pulse interval
    if (currentAction == 'pulse') {
        startPulseInterval();
    }
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
        body.style.backgroundColor = 'rgba(255, 255, 255, ' + brightness + ')';
    }
});

socket.on('pulse-user', () => {
    startPulseInterval();
});

socket.on('stop-light-show', () => {
    //console.log('USER: STOPPING LIGHT SHOW');
    body.style.backgroundColor = '#1b1b1b';
    if (pulseInterval) {
        clearInterval(pulseInterval);
    }
    cameraCardTitle.style.display = 'none';
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
        cameraCardTitle.style.display = 'none';

    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.warn('Camera not found');
        } else {
            console.warn('Error accessing camera:', error);
        }
    }
    socket.emit('get-state');
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

    if (pulseInterval) {
        clearInterval(pulseInterval);
    }

    if (currentAction == 'pulse') {
        cameraCardTitle.style.display = 'block';
    } else {
        cameraCardTitle.style.display = 'none';
    }
    body.style.backgroundColor = '#1b1b1b';
    // Clear video source
    cameraFeed.srcObject = null;

    // Reset button states
    startCameraBtn.style.display = 'inline-block';
    stopCameraBtn.style.display = 'none';
}

function startPulseInterval() {
    console.log('USER: STARTING PULSE INTERVAL');

    let brightness = 0;
    let bgOn = true; //for the phone background
    let torchOn = true; //for the actual torch

    if (currentTrack == null) {
        cameraCardTitle.style.display = 'block';
    } else {
        cameraCardTitle.style.display = 'none';
    }

    //Set an interval to pulse the flashlight and camera border on and off every 400ms
    if (flashlight && currentTrack) {
        pulseInterval = setInterval(() => {
            currentTrack.applyConstraints({
                advanced: [{torch: torchOn}]
            });
            if (torchOn) {
                torchOn = false;
            } else {
                torchOn = true;
            }
        }, 3000);

    } else if (!flashlight && currentTrack) {
        pulseInterval = setInterval(() => {
            body.style.backgroundColor = 'rgba(255, 255, 255, ' + brightness + ')';

            if (bgOn == true) {
                
                console.log('USER: PULSE INTERVAL',  
                    'bgOn:', bgOn, 
                    'brightness:', brightness
                );

                brightness += 0.025;

                if (brightness > 1) {
                    brightness = 1;
                    bgOn = false;
                }

            } else if (bgOn == false) {
                console.log('USER: PULSE INTERVAL',  
                    'bgOn:', bgOn, 
                    'brightness:', brightness
                );

                brightness -= 0.025;

                if (brightness < 0) {
                    brightness = 0;
                    bgOn = true;
                }
            }
        }, 50);
    } else {
        console.log('USER: NO FLASHLIGHT OR TRACK');
    }
}

// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);
