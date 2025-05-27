import { programs, connections, modes, songs } from './db.js';

console.log('Producer.js loaded');
//console.log('Programs', programs);
//console.log('Connections', connections);
// ===================================================================================================================================================
const modeSelect = document.getElementById('mode-select');
const strobeForm = document.getElementById('strobe-form');
const startLightShowBtn = document.getElementById('start-light-show-btn');
const stopLightShowBtn = document.getElementById('stop-light-show-btn');
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
// Load modes
function loadModes() {
    modes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        option.textContent = mode;
        modeSelect.appendChild(option);
    });
    // initialize controls
    loadControls();
}
// initialize mode selection
loadModes();
// ===================================================================================================================================================
// Set up Controls
function loadControls() {
    console.log('Setting up controls');

    if (modeSelect.value === 'music') {
        console.log('Music mode');
        loadMusicControls();
    } else if (modeSelect.value === 'dj') {
        console.log('DJ mode');
        loadDJControls();
    } else if (modeSelect.value === 'strobe') {
        console.log('Strobe mode');
        loadStrobeControls();
    } else if (modeSelect.value === 'pixel map') {
        console.log('Pixel map mode');
        loadPixelMapControls();
    } else {
        console.warn('Invalid mode');
    }
}
// add event listener to mode select
modeSelect.addEventListener('change', () => {loadControls();});
// ===================================================================================================================================================
// Load Music Controls
function loadMusicControls() {
    console.log('Loading Music controls');
    strobeForm.innerHTML = 'COMING SOON: Music Controls Go Here';
    /*//clear the strobe form
    strobeForm.innerHTML = '';
    strobeForm.innerHTML = `
        <div id="music-mode-controls" class="uk-grid-small" uk-grid>
            <div class="uk-width-1-1">
                <div class="uk-margin">
                    <label class="uk-form-label">Select a Song</label>
                    <select class="uk-select" id="song-select">
                        ${songs.map(song => `<option value="${song.name}">${song.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;
    */
}
// Load DJ Controls
function loadDJControls() {
    console.log('Loading DJ controls');
    
    strobeForm.innerHTML = '';
    addDjControlsRow();
    //strobeForm.innerHTML = 'COMING SOON: DJ Controls Go Here';
}
// Load Strobe Controls
function loadStrobeControls() {
    console.log('Loading Strobe controls');
    //strobeForm.innerHTML = 'COMING SOON: Strobe Controls Go Here';
    strobeForm.innerHTML = 'Start the light show to see a basic strobe pattern';
}
// Load Pixel Map Controls
function loadPixelMapControls() {
    console.log('Loading Pixel Map controls');
    strobeForm.innerHTML = 'COMING SOON: Pixel Map Controls Go Here';
}

function addDjControlsRow() {
    console.log('Adding DJ controls row');

    const row = document.createElement('div');
    row.className = 'uk-grid-small uk-margin';
    row.setAttribute('uk-grid', '');
    row.innerHTML = `
        <div class="uk-width-expand">
            <label class="uk-form-label">On Duration (ms)</label>
            <div class="uk-form-controls">
                <input class="uk-input" type="number" min="0" step="1" placeholder="100" value="100" required>
            </div>
        </div>
        <div class="uk-width-expand">
            <label class="uk-form-label">Off Duration (ms)</label>
            <div class="uk-form-controls">
                <input class="uk-input" type="number" min="0" step="1" placeholder="100" value="100" required>
            </div>
        </div>
        <div class="uk-width-expand">
            <label class="uk-form-label">Play Duration (ms)</label>
            <div class="uk-form-controls">
                <input class="uk-input" type="number" min="0" step="1" placeholder="5000" value="5000" required>
            </div>
        </div>
        <div class="uk-width-expand">
            <label class="uk-form-label">Brightness (0-100)</label>
            <div class="uk-form-controls">
                <input class="uk-input" type="number" min="0" max="100" step="1" placeholder="100" value="100" required>
            </div>
        </div>
        <div class="uk-width-auto uk-flex uk-flex-middle" style="display: none;">
            <button type="button" class="uk-button uk-button-danger uk-button-small remove-row">
                <span class="mdi mdi-delete"></span>
            </button>
        </div>
    `;
    djControls.appendChild(row);

    // Show remove buttons if there's more than one row
    const removeButtons = document.querySelectorAll('.remove-row');
    const deleteRow = document.querySelectorAll('.delete-row');
    removeButtons.forEach(btn => {
        btn.style.display = removeButtons.length > 1 ? 'inline-block' : 'none';
        btn.style.display = deleteRow.length > 1 ? 'inline-block' : 'none';
    });
}

// ===================================================================================================================================================
// Start Light Show
async function startLightShow() {
    console.log('Starting light show');
    startLightShowBtn.style.display = 'none';
    stopLightShowBtn.style.display = 'block';

    if (modeSelect.value === 'music') {
        console.log('Starting music mode');
        let selectedSong = await parseSelectedSong();
        strobeFlashlightAndCameraBorder(selectedSong);
    } else if (modeSelect.value === 'dj') {
        console.log('Starting DJ mode');
        socket.emit('start-dj-mode');
    } else if (modeSelect.value === 'strobe') {
        console.log('Starting strobe mode');
        socket.emit('start-strobe-mode');

        //strobe the flashlight and camera border on and off every 100ms
        strobeInterval = setInterval(() => {
            socket.emit('strobe', {brightness: 100, action: 'strobe'});
            setTimeout(() => {
                socket.emit('strobe', {brightness: 0, action: 'strobe'});
            }, 50);
        }, 150);


    } else if (modeSelect.value === 'pixel map') {
        console.log('Starting pixel map mode');
        socket.emit('start-pixel-map-mode');
    } else {
        console.warn('Invalid mode');
    }
}
// stop light show
function stopLightShow() {
    console.log('Stopping light show');
    startLightShowBtn.style.display = 'block';
    stopLightShowBtn.style.display = 'none';
    clearInterval(strobeInterval);
    currentDataPoint = 0;
    currentTimeMS = 0;
    socket.emit('stop-light-show');
}
// add event listener to the start light show button
startLightShowBtn.addEventListener('click', () => {startLightShow();});
// add event listener to the stop light show button
stopLightShowBtn.addEventListener('click', () => {stopLightShow();});
// ===================================================================================================================================================
// Parse selected song
async function parseSelectedSong() {
    let selectedSong = document.getElementById('song-select').value;
    //use the selected song to get the song file name
    let songFile = songs.find(song => song.name === selectedSong).file;
    try {
        //fetch the JSON file
        const response = await fetch(`assets/json/${songFile}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        //parse the JSON file into a JS object
        let songData = await response.json();

        //loop through songData and multiply the time entry by 1000 (convert from seconds to MS)
        for (let i = 0; i < songData.length; i++) {
            songData[i].ms = songData[i].time * 1000;
        }
        console.log('Song data', songData);
        return songData;
    } catch (error) {
        console.error('Error loading song data:', error);
        UIkit.notification({
            message: 'Error loading song data',
            status: 'danger',
            pos: 'top-right',
            timeout: 5000
        });
        return null;
    }
}
// ===================================================================================================================================================
// Strobe the flashlight and camera border based on the song data
let strobeInterval;
let currentDataPoint = 0;
let currentTimeMS = 0;

function strobeFlashlightAndCameraBorder(selectedSong) {
    console.log('Strobing flashlight and camera border');
    //strobe the flashlight and camera border based on the song data

    strobeInterval = setInterval(() => {strobe(selectedSong,)}, 1);
    //stream the music
    let songName = document.getElementById('song-select').value;
    //use the selected song to get the song file name
    let songFile = songs.find(song => song.name === songName).wav;
    socket.emit('stream-music', songFile);
}

function strobe(selectedSong) {
    
    if (currentDataPoint >= selectedSong.length) {
        clearInterval(strobeInterval);
        return;
    } 

    if (currentTimeMS >= selectedSong[currentDataPoint].ms) {
        console.log('Strobing', currentTimeMS, selectedSong[currentDataPoint], selectedSong[currentDataPoint].ms);
        socket.emit('strobe', selectedSong[currentDataPoint]);
        currentDataPoint++;
        currentTimeMS = 0;
        console.log('Next data point', currentDataPoint);
    } else {
        currentTimeMS++;
    }
}


