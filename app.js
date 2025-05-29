const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const DEBUG_MODE_ENABLED = false;


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
        console.log('User connected. Total users:', connectedUsers.size);
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
            console.log('User disconnected. Total users:', connectedUsers.size);
        }
        if (connectedFlashlights.has(socket.id)) {
            connectedFlashlights.delete(socket.id);
            if (producerSocket) {
                producerSocket.emit('flashlight-count-update', connectedFlashlights.size);
            }
            console.log('Flashlight disconnected. Total flashlights:', connectedFlashlights.size);
        }
    });

    socket.on('flashlight-connect', () => {
        connectedFlashlights.add(socket.id);
        if (producerSocket) {
            producerSocket.emit('flashlight-count-update', connectedFlashlights.size);
        }
        console.log('Flashlight connected. Total flashlights:', connectedFlashlights.size);
    });

    socket.on('flashlight-disconnect', () => {
        connectedFlashlights.delete(socket.id);
        if (producerSocket) {
            producerSocket.emit('flashlight-count-update', connectedFlashlights.size);
        }
        console.log('Flashlight disconnected. Total flashlights:', connectedFlashlights.size);
    });


    socket.on('send-light-show-mode', (action) => {
        console.log('SERVER:LIGHT SHOW MODE', action);
        // Broadcast to all users except the sender
    });
    if (DEBUG_MODE_ENABLED) {
      socket.on('debug', (action) => {
          console.log('DEBUG', JSON.parse(action));
          // Broadcast to all users except the sender
      });
    }

    socket.on('start-light-show', (dataPoint) => {
        //console.log('SERVER:PULSING', dataPoint);
        // Broadcast to all users except the sender
        socket.broadcast.emit('start-light-show', dataPoint);
    });

    socket.on('stop-light-show', () => {
        console.log('SERVER:STOPPING LIGHT SHOW');
        // Broadcast to all users except the sender
        socket.broadcast.emit('stop-light-show');
    });

    socket.on('pause-light-show', () => {
        console.log('SERVER:PAUSING LIGHT SHOW');
        // Broadcast to all users except the sender
        socket.broadcast.emit('pause-light-show');
    });

    socket.on('save-redirect-url', (url) => {
        console.log('SERVER:SAVING REDIRECT URL', url);
        // Broadcast to all users except the sender
        socket.broadcast.emit('redirect-url', url);
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