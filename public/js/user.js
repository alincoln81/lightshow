// Connection status elements
const startCameraBtn = document.getElementById('start-camera-btn'); //to start the camera and flashlight
const stopCameraBtn = document.getElementById('stop-camera-btn'); //to stop the camera and flashlight
const cameraFeed = document.getElementById('camera-feed'); //for the camera feed
const infoText = document.getElementById('info-text'); //to indicate when the show has started
const infoText2 = document.getElementById('info-text2'); //to indicate when the show has ended
const body = document.getElementById('body'); //for the background color
// Initialize Socket.IO
const socket = io();

//Variables
let currentStream = null;
let currentTrack = null;
let flashlight = null;
let participatingInLightShow = false;
let redirectUrl = null;
// ===================================================================================================================================================
// Socket event handlers
socket.on('connect', () => {
    socket.emit('user-connect');
});

socket.on('redirect-url', (url) => {
    redirectUrl = url;
});

socket.on('start-light-show', (dataPoint) => {
    infoText2.style.display = 'none';
    if (participatingInLightShow) {
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
        infoText.innerHTML = '';
    } else {
        infoText.innerHTML = 'The light show has started! Click the button above to join in!';
    }
});

socket.on('stop-light-show', () => {
    console.log('USER: PRODUCER STOPPED LIGHT SHOW');
    //call the stopCameraAndFlashlight function
    stopCameraAndFlashlight();
    //redirect to the redirect URL
    if (redirectUrl) {
        // Ensure the URL has a protocol
        const redirectUrlWithProtocol = redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://') 
            ? redirectUrl 
            : `https://${redirectUrl}`;
        window.location.href = redirectUrlWithProtocol;
    } else {
        console.log('USER: NO REDIRECT URL');
    }

});

// ===================================================================================================================================================
// Camera and flashlight handling
async function startCameraAndFlashlight() {
    participatingInLightShow = true;
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
        try {
            await currentTrack.applyConstraints({
                advanced: [{torch: false},]
            });
            socket.emit('flashlight-connect');
            updateUI('success');

        } catch (error) {
            console.warn('Flashlight not found:', error);
            updateUI('flashlight-failed');
        }

    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.warn('Camera not found');
        } else {
            console.warn('Error accessing camera:', error);
        }
        updateUI('camera-failed');
    }
}

function stopCameraAndFlashlight() {
    participatingInLightShow = false;
    if (currentStream) {
        // Stop all tracks
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
        currentTrack = null;
        socket.emit('flashlight-disconnect');
    }

    body.style.backgroundColor = '#1b1b1b';
    cameraFeed.srcObject = null;
    flashlight = null;
    // Reset button states
    startCameraBtn.style.display = 'inline-block';
    stopCameraBtn.style.display = 'none';
}
// ===================================================================================================================================================
// UI update
function updateUI(state) {
    
    startCameraBtn.style.display = 'none';
    stopCameraBtn.style.display = 'inline-block';

    if (state == 'success') {
        flashlight = true;
    } else if (state == 'camera-failed' || state == 'flashlight-failed') {
        flashlight = false;
    }
}
// ===================================================================================================================================================
// Pulse interval
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
// ===================================================================================================================================================
// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);
