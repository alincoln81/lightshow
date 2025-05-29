// Connection status elements
const startCameraBtn = document.getElementById('start-camera-btn'); //to start the camera and flashlight
const stopCameraBtn = document.getElementById('stop-camera-btn'); //to stop the camera and flashlight
const cameraFeed = document.getElementById('camera-feed'); //for the camera feed
const body = document.getElementById('body'); //for the background color
const infoText = document.getElementById('info-text'); //to indicate when the show has started
// Initialize Socket.IO
const socket = io();

let requesting_camera = false;
let listening_to_camera_permissions = false;

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
            if (brightness === 0) {
                currentTrack.applyConstraints({
                    advanced: [{ torch: false }]
                });
            } else if (brightness === 1) {
                currentTrack.applyConstraints({
                    advanced: [{ torch: true }]
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
        //window.location.href = '/';
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

// Iterates available devices to exhaustion until finding a match.
async function _startCamera(cameras) {
    const camera = cameras.pop()
    console.log("trying", camera)
    if (!camera) throw new Error("No cameras left.")
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            deviceId: camera.deviceId,
        },
    })
    if (!stream) throw new Error("No Stream")
    const track = stream.getVideoTracks()[0]
    if (!track) throw new Error("No Track")
    const has_torch = track.getCapabilities().torch
    if (!has_torch) {
        track.stop()
        return await _startCamera(cameras)
    }
    return {stream, track}
}

// Listens to camera permission changes - and attempts to connect
function _listenToCameraPermissionChanges(callbackAsync) {
    if (listening_to_camera_permissions) return;
    listening_to_camera_permissions = true;

    // Listen.
    navigator.permissions
        .query({ name: "camera" })
        .then((permissionStatus) => {
            console.log(`camera permission state is ${permissionStatus.state}`)
            permissionStatus.onchange = () => {
                console.log(
                    `camera permission state has changed to ${permissionStatus.state === "granted"}`,
                )
                if (permissionStatus.state.toString() === "granted") {
                    // Give the device half a second - before we request another track.
                    setTimeout(() => {
                    // Abort if the track was good.
                    if (currentTrack) return
                    if (requesting_camera) {
                        callbackAsync?.call(2).catch((ex) => {
                        console.error("Failed with permission - no torch", ex);
                        });
                    }
                    }, 500)
                }
            }
        })
}


async function _startCameraAndFlashlight(attemptCount) {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');

        const success = await _startCamera(cameras);

        if (!success || !success.stream || !success.track) throw new Error("No dice");

        // Store the stream and track for later use
        currentStream = success.stream;
        currentTrack = success.track;

        // Set up camera feed
        cameraFeed.srcObject = success.stream;

        // Try to enable flashlight
        try {
            await currentTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
            socket.emit('flashlight-connect');
            updateUI('success');
            requesting_camera = false;
        } catch (error) {
            console.warn('Flashlight not found:', error);
            if (attemptCount !== 1) {
                updateUI('flashlight-failed');
            }
        }

    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.warn('Camera not found');
        } else {
            console.warn('Error accessing camera:', error);
        }
        if (attemptCount !== 1) {
            updateUI('camera-failed');
        }
    }

    if (attemptCount !== 1) {
        requesting_camera = false;
    }
}

async function startCameraAndFlashlight() {
    if (requesting_camera) return;
    requesting_camera = true;

    participatingInLightShow = true;
    _listenToCameraPermissionChanges(_startCameraAndFlashlight)
    await _startCameraAndFlashlight(1);
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
    //window.location.href = '/';
}
// ===================================================================================================================================================
// UI update
function updateUI(state) {
    
    if (state === 'success') {
        flashlight = true;
        infoText.innerHTML = '';
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-block';
    } else if (state === 'camera-failed' || state === 'flashlight-failed') {
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
