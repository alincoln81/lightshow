import { connections } from './db.js';

console.log('Producer.js loaded');
// ===================================================================================================================================================
const startLightShowBtn = document.getElementById('start-light-show-btn');
const stopLightShowBtn = document.getElementById('stop-light-show-btn');
let strobeInterval;
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
    console.log('User count update', count);
    connections.users = count;
    document.getElementById('user-count').innerHTML = count;
    document.getElementById('last-updated').innerHTML = new Date().toLocaleString();
});

socket.on('flashlight-count-update', (count) => {
    console.log('Flashlight count update', count);
    connections.flashlights = count;
    document.getElementById('flashlight-count').innerHTML = count;
    document.getElementById('last-updated').innerHTML = new Date().toLocaleString();
});

// ===================================================================================================================================================
// Start Light Show
async function startLightShow() {
    //console.log('Starting light show');
    startLightShowBtn.style.display = 'none';
    stopLightShowBtn.style.display = 'block';

    //get the light show mode
    const lightShowMode = document.getElementById('light-show-mode').value;
    console.log('Light show mode', lightShowMode);

    if (lightShowMode === 'strobe') {
        //strobe the flashlight and camera border on and off every 100ms
        strobeInterval = setInterval(() => {
            socket.emit('strobe', {brightness: 1, action: 'strobe'});
            setTimeout(() => {
                socket.emit('strobe', {brightness: 0, action: 'strobe'});
            }, 50);
        }, 150);
    } else if (lightShowMode === 'pulse') {
        //pulse the flashlight and camera border on and off every 400ms
        socket.emit('pulse', {brightness: 1, action: 'pulse'});
    } else {
        console.log('Invalid light show mode');
    }
}
// stop light show
function stopLightShow() {
    console.log('Stopping light show');
    startLightShowBtn.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    clearInterval(strobeInterval);
    socket.emit('stop-light-show');
}
// add event listener to the start light show button
startLightShowBtn.addEventListener('click', () => {startLightShow();});
// add event listener to the stop light show button
stopLightShowBtn.addEventListener('click', () => {stopLightShow();});
// ===================================================================================================================================================


