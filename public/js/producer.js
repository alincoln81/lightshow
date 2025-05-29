// ===================================================================================================================================================
const startLightShowBtn = document.getElementById('start-light-show-btn');
const stopLightShowBtn = document.getElementById('stop-light-show-btn');
const pauseLightShowBtn = document.getElementById('pause-light-show-btn');
const start = document.getElementById('start');
const stopContainer = document.getElementById('stop-container');
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
    console.log('User count updated: ' + count);
});

socket.on('flashlight-count-update', (count) => {
    document.getElementById('flashlight-count').innerHTML = count;
    document.getElementById('last-updated').innerHTML = new Date().toLocaleString();
    console.log('Flashlight count updated: ' + count);
});

socket.on('redirect-url', (url) => {
    console.log('Redirect URL updated: ' + url);
    document.getElementById('redirect-url').value = url;
});

socket.on('light-show-mode', (lightShowData) => {
    console.log('Light show mode updated: ' + lightShowData.showMode);
    console.log('Light show active: ' + lightShowData.showActive);
    
    //set the light show mode
    document.getElementById('light-show-mode').value = lightShowData.showMode;

    if (lightShowData.showActive === 'active') {
        startLightShowBtn.style.display = 'none';
        start.style.display = 'none';
        stopLightShowBtn.style.display = 'block';
        stopContainer.style.display = 'block';
        pauseLightShowBtn.style.display = 'block';
        pause.style.display = 'block';
        lightShowActive = true;
    } else if (lightShowData.showActive === 'inactive') {
        startLightShowBtn.style.display = 'block';
        start.style.display = 'block';
        stopLightShowBtn.style.display = 'none';
        stopContainer.style.display = 'none';
        pauseLightShowBtn.style.display = 'none';
        pause.style.display = 'none';
        lightShowActive = false;
    } else if (lightShowData.showActive === 'paused') {
        startLightShowBtn.style.display = 'block';
        start.style.display = 'block';
        stopLightShowBtn.style.display = 'none';
        stopContainer.style.display = 'none';
        pauseLightShowBtn.style.display = 'none';
        pause.style.display = 'none';
        lightShowActive = false;
    } else {
        console.log('Invalid light show active status');
    }
});

// ===================================================================================================================================================
// Start Light Show
async function startLightShow() {
    //hide the start light show button and show the stop light show button
    startLightShowBtn.style.display = 'none';
    start.style.display = 'none';
    stopLightShowBtn.style.display = 'block';
    stopContainer.style.display = 'block';
    pauseLightShowBtn.style.display = 'block';
    pause.style.display = 'block';
    lightShowActive = true;

    //get the light show mode
    const lightShowMode = document.getElementById('light-show-mode').value;
    
    //set the light show interval based on the light show mode
    let lightShowInterval;
    let action;
    if (lightShowMode === 'fast-strobe') {
        lightShowInterval = 100;
        action = 'fast-strobe';
    } else if (lightShowMode === 'slow-strobe') {
        lightShowInterval = 2000;
        action = 'slow-strobe';
    } else if (lightShowMode === 'twinkle') {
        lightShowInterval = 4500;
        action = 'twinkle';
    } else if (lightShowMode === 'pulse') {
        lightShowInterval = 6000;
        action = 'pulse';
    } else {
        //if the light show mode is not valid, return
        console.log('Invalid light show mode');
        return;
    }

    //share the light show mode
    socket.emit('send-light-show-mode', (action));
    
    //share the redirect url
    const redirectUrl = document.getElementById('redirect-url').value;
    if (redirectUrl) {
        socket.emit('save-redirect-url', redirectUrl);
    }

    if (lightShowMode === 'twinkle') {
        // Complex twinkle pattern sequence
        const twinkle = () => {
            socket.emit('start-light-show', {brightness: 1, action: action});
            setTimeout(() => {socket.emit('start-light-show', {brightness: 0, action: action});}, 700);

            setTimeout(() => {socket.emit('start-light-show', {brightness: 1, action: action});}, 1200);
            setTimeout(() => {socket.emit('start-light-show', {brightness: 0, action: action});}, 1700);

            setTimeout(() => {socket.emit('start-light-show', {brightness: 1, action: action});}, 2700);
            setTimeout(() => {socket.emit('start-light-show', {brightness: 0, action: action});}, 3100);

            setTimeout(() => {socket.emit('start-light-show', {brightness: 1, action: action});}, 3700);  
        }

        twinkle();
        flashInterval = setInterval(twinkle, lightShowInterval);
    } else {
        // Function to emit the light show events
        const emitLightShow = () => {
            socket.emit('start-light-show', {brightness: 1, action: action});
            setTimeout(() => {
                socket.emit('start-light-show', {brightness: 0, action: action});
            }, lightShowInterval/2);
        };

        // Emit immediately
        emitLightShow();
        
        // Then set up the interval for subsequent emissions
        flashInterval = setInterval(emitLightShow, lightShowInterval);
    }
}

// stop light show
function stopLightShow() {
    startLightShowBtn.style.display = 'block';
    start.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    stopContainer.style.display = 'none';
    pauseLightShowBtn.style.display = 'none';
    pause.style.display = 'none';
    clearInterval(flashInterval);
    socket.emit('stop-light-show');
    lightShowActive = false;
}

// pause light show
function pauseLightShow() {
    startLightShowBtn.style.display = 'block';
    start.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    stopContainer.style.display = 'none';
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

//Share the redirect on blur
document.getElementById('redirect-url').addEventListener('blur', () => {
    const redirectUrl = document.getElementById('redirect-url').value;
    //if the redirect url is not empty, save the redirect url
    if (redirectUrl) {
        socket.emit('save-redirect-url', redirectUrl);
    }
});