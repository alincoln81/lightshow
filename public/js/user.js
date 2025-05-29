const SEEN_ONCE_QUERY = 'timetoshine=1';
const has_seen_once = location.search.indexOf(SEEN_ONCE_QUERY) !== -1;

// Connection status elements
const startCameraBtn = document.getElementById('start-camera-btn'); //to start the camera and flashlight
const stopCameraBtn = document.getElementById('stop-camera-btn'); //to stop the camera and flashlight
const cameraFeed = document.getElementById('camera-feed'); //for the camera feed
const body = document.getElementById('body'); //for the background color
const infoText = document.getElementById('info-text'); //to indicate when the show has started
// Initialize Socket.IO
const socket = io();

if (has_seen_once) {
  // OR: "Tap again, Yours truly, Android Police."
  startCameraBtn.innerText = "Tap to Begin";
}

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
    } else {
        //if the user is not participating in the light show, do nothing
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
        //redirect to home page
        window.location.href = '/';
    }
});

socket.on('pause-light-show', () => {
    console.log('USER: PRODUCER PAUSED LIGHT SHOW');
    if (participatingInLightShow) {
        //if we have access to the flashlight, adjust the brightness otherwise just use the border color
        if (flashlight && currentTrack) {
            currentTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
        }
        body.style.backgroundColor = 'rgba(255, 255, 255, 0)';
    } else {
        //if the user is not participating in the light show, do nothing
    }
});

// ===================================================================================================================================================
// Camera and flashlight handling
async function startCameraAndFlashlight() {
    participatingInLightShow = true;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        if (cameras.length === 0) throw new Error("CRAP");
        // Request camera and flashlight permissions
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: cameras.pop()?.deviceId,
            }
        });
        // Store the stream and track for later use
        currentStream = stream;
        currentTrack = stream.getVideoTracks()[0];

        const has_torch = currentTrack?.getCapabilities().torch;

        if (!has_torch) {

          if (!has_seen_once) {
            // CUT - again - with the lights!
            const separator = location.href.indexOf('?') === -1 ? '?' : '&';
            location.href = `${location.href}${separator}${SEEN_ONCE_QUERY}`;
            return;
          } else {
            // This just ain't gonna work
            // TODO: - something different.
            updateUI('flashlight-failed');
            startCameraBtn.innerText = 'Join Light Show';
          }
        }

        // Set up camera feed
        cameraFeed.srcObject = stream;

        // Try to enable flashlight
        try {
            await currentTrack.applyConstraints({
                 advanced: [{torch: false}]
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
    infoText.innerHTML = '';
    
    //redirect to home page
    window.location.href = '/';
}
// ===================================================================================================================================================
// UI update
function updateUI(state) {
    
    if (state == 'success') {
        flashlight = true;
        infoText.innerHTML = '';
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-block';
    } else if (state == 'camera-failed' || state == 'flashlight-failed') {
        flashlight = false;
        infoText.innerHTML = 'Failed to connect the flashlight, please try again.';
        startCameraBtn.style.display = 'inline-block';
        stopCameraBtn.style.display = 'none';
    }
}
// ===================================================================================================================================================
// Button handlers
startCameraBtn.addEventListener('click', startCameraAndFlashlight);
stopCameraBtn.addEventListener('click', stopCameraAndFlashlight);
