const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Set up routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/producer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'producer.html'));
});

// Track connected users and flashlights
let connectedUsers = new Set();
let connectedFlashlights = new Set();
let producerConnected = false;
let producerSocket = null;
let state = null;

// Socket.IO connection handling
io.on('connection', (socket) => {
    //console.log('New connection:', socket.id);

    // Handle producer connection
    socket.on('producer-connect', () => {
        if (!producerConnected) {
            producerConnected = true;
            producerSocket = socket;
            socket.join('producer');
            // Send current counts to the producer
            socket.emit('user-count-update', connectedUsers.size);
            socket.emit('flashlight-count-update', connectedFlashlights.size);
            console.log('Producer connected');
        } else {
            socket.emit('producer-error', 'Another producer is already connected');
        }
    });

    // Handle producer disconnection
    socket.on('producer-disconnect', () => {
        if (socket.rooms.has('producer')) {
            producerConnected = false;
            producerSocket = null;
            socket.leave('producer');
            console.log('Producer disconnected');
        }
    });

    // Handle user connection
    socket.on('user-connect', () => {
        connectedUsers.add(socket.id);
        if (producerSocket) {
            producerSocket.emit('user-count-update', connectedUsers.size);
        }
        //console.log('User connected. Total users:', connectedUsers.size);
        if (state) {
            socket.emit('state-update', state);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket === producerSocket) {
            producerConnected = false;
            producerSocket = null;
        }
        if (connectedUsers.has(socket.id)) {
            connectedUsers.delete(socket.id);
            if (producerSocket) {
                producerSocket.emit('user-count-update', connectedUsers.size);
            }
            //console.log('User disconnected. Total users:', connectedUsers.size);
        }
        if (connectedFlashlights.has(socket.id)) {
            connectedFlashlights.delete(socket.id);
            if (producerSocket) {
                producerSocket.emit('flashlight-count-update', connectedFlashlights.size);
            }
            //console.log('Flashlight disconnected. Total flashlights:', connectedFlashlights.size);
        }
    });

    // Handle light show start
    socket.on('strobe', (dataPoint) => {
        //console.log('SERVER:STROBBING', dataPoint);
        // Broadcast to all users except the sender
        socket.broadcast.emit('strobe-user', dataPoint);
        state = dataPoint;
    });

    socket.on('pulse', (dataPoint) => {
        //console.log('SERVER:PULSING', dataPoint);
        // Broadcast to all users except the sender
        socket.broadcast.emit('pulse-user');
        state = dataPoint;
    });

    socket.on('stop-light-show', () => {
        //console.log('SERVER:STOPPING LIGHT SHOW');
        // Broadcast to all users except the sender
        socket.broadcast.emit('stop-light-show');
        //stop the music
        socket.broadcast.emit('stop-music');
        state = null;
    });

    // Error handling
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', 'An error occurred');
    });
});

// Error handling for the HTTP server
http.on('error', (error) => {
    console.error('Server error:', error);
});

// Start the server
http.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 