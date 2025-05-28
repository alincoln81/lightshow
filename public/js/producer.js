// ===================================================================================================================================================
const startLightShowBtn = document.getElementById('start-light-show-btn');
const stopLightShowBtn = document.getElementById('stop-light-show-btn');
const pauseLightShowBtn = document.getElementById('pause-light-show-btn');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const pause = document.getElementById('pause');
let flashInterval;
let lightShowActive = false;
// ===================================================================================================================================================
// Initialize Socket.IO with reconnection settings
const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// Socket event handlers
socket.on('connect', () => {
    //updateConnectionStatus(true);
    console.log('Producer connected');
    socket.emit('producer-connect');
});

socket.on('disconnect', () => {
    console.log('Producer disconnected');
    //updateConnectionStatus(false);
});

socket.on('producer-error', (message) => {
    UIkit.notification({
        message: message,
        status: 'danger',
        pos: 'top-right',
        timeout: 5000
    });
});

socket.on('user-count-update', (count) => {
    document.getElementById('user-count').innerHTML = count;
    document.getElementById('last-updated').innerHTML = new Date().toLocaleString();
});

socket.on('flashlight-count-update', (count) => {
    document.getElementById('flashlight-count').innerHTML = count;
    document.getElementById('last-updated').innerHTML = new Date().toLocaleString();
});

// ===================================================================================================================================================
// Start Light Show
async function startLightShow() {
    //hide the start light show button and show the stop light show button
    startLightShowBtn.style.display = 'none';
    start.style.display = 'none';
    stopLightShowBtn.style.display = 'block';
    stop.style.display = 'block';
    pauseLightShowBtn.style.display = 'block';
    pause.style.display = 'block';
    lightShowActive = true;

    //get the light show mode
    const lightShowMode = document.getElementById('light-show-mode').value;
    
    //set the light show interval based on the light show mode
    let lightShowInterval;
    if (lightShowMode === 'strobe') {
        lightShowInterval = 100;
    } else if (lightShowMode === 'pulse') {
        lightShowInterval = 6000;
    } else {
        //if the light show mode is not valid, return
        console.log('Invalid light show mode');
        return;
    }

    // Function to emit the light show events
    const emitLightShow = () => {
        socket.emit('start-light-show', {brightness: 1, action: 'pulse'});
        setTimeout(() => {
            socket.emit('start-light-show', {brightness: 0, action: 'pulse'});
        }, lightShowInterval/2);
    };

    // Emit immediately
    emitLightShow();
    
    // Then set up the interval for subsequent emissions
    flashInterval = setInterval(emitLightShow, lightShowInterval);
    
    //share the redirect url
    const redirectUrl = document.getElementById('redirect-url').value;
    socket.emit('save-redirect-url', redirectUrl);
}
// stop light show
function stopLightShow() {
    startLightShowBtn.style.display = 'block';
    start.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    stop.style.display = 'none';
    pauseLightShowBtn.style.display = 'none';
    pause.style.display = 'none';
    clearInterval(flashInterval);
    socket.emit('stop-light-show');
    lightShowActive = false;
}

// pause light show
function pauseLightShow() {
    clearInterval(flashInterval);
    startLightShowBtn.style.display = 'block';
    start.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    stop.style.display = 'none';
    pauseLightShowBtn.style.display = 'none';
    pause.style.display = 'none';
    clearInterval(flashInterval);
    socket.emit('pause-light-show');
    lightShowActive = false;
}

// add event listeners
startLightShowBtn.addEventListener('click', () => {startLightShow();});
stopLightShowBtn.addEventListener('click', () => {stopLightShow();});
pauseLightShowBtn.addEventListener('click', () => {pauseLightShow();});
// ===================================================================================================================================================

// add event listener to check if the selected light show mode has changed
document.getElementById('light-show-mode').addEventListener('change', () => {
    if (lightShowActive) {
        clearInterval(flashInterval);
        startLightShow();
    }
});

