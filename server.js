import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import geoip from 'geoip-lite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 3 * 1024 * 1024 * 1024, // 3 GB limit (supports 2GB files with base64 overhead)
  pingTimeout: 120000,
  pingInterval: 25000
});

app.use(express.static('dist'));

// Serve index.html for all routes (for React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// In-memory storage (deleted when server stops)
let messages = [];

// Helper function to get client IP
const getClientIP = (socket) => {
  // Try multiple headers in order of preference
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIP = socket.handshake.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  // Fallback to socket address
  return socket.handshake.address;
};

// Socket.io connection handler
io.on('connection', (socket) => {
  const clientIP = getClientIP(socket);
  console.log('[Server] User connected:', socket.id);
  console.log('[Server] Client IP:', clientIP);
  console.log('[Server] Current messages count:', messages.length);

  // Get geo information
  const geo = geoip.lookup(clientIP);
  console.log('[Server] Geo info:', geo);

  // Store IP and geo info with socket
  socket.clientIP = clientIP;
  socket.geoInfo = geo;

  // Send existing messages to newly connected user
  socket.emit('load-messages', messages);

  // Handle new message from client
  socket.on('send-message', (message) => {
    console.log('[Server] Received message:', message.type, message.fileName || message.text);
    if (message.type === 'file') {
      console.log('[Server] File details:', {
        fileName: message.fileName,
        fileType: message.fileType,
        fileSize: message.fileSize,
        hasFileData: !!message.fileData,
        fileDataLength: message.fileData ? message.fileData.length : 0
      });
    }

    // Add server-side IP and geo information to user messages
    if (message.from === 'user') {
      message.serverInfo = {
        ip: socket.clientIP,
        geo: socket.geoInfo
      };
    }

    messages.push(message);
    console.log('[Server] Total messages now:', messages.length);
    // Broadcast to all connected clients
    io.emit('new-message', message);
    console.log('[Server] Broadcasted message to all clients');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('[Server] User disconnected:', socket.id);
  });
});

const PORT = 5173;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});