const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Quantum Drift Game Server\n');
});

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your game domain
    methods: ["GET", "POST"]
  }
});

// Store connected players
const players = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Generate unique player ID
  const playerId = uuidv4();
  
  // Send player their ID
  socket.emit('player_id', playerId);
  
  // Store player data
  players.set(playerId, {
    id: playerId,
    socketId: socket.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    name: 'Player_' + playerId.substring(0, 5),
    shipType: 'default',
    team: null,
    lastUpdate: Date.now()
  });
  
  // Send the new player to everyone else
  socket.broadcast.emit('player_joined', players.get(playerId));
  
  // Send existing players to the new player
  const existingPlayers = Array.from(players.values());
  socket.emit('players', existingPlayers);
  
  // Update player count
  io.emit('player_count', players.size);
  
  // Handle player update
  socket.on('player_update', (data) => {
    const player = players.get(data.id);
    if (player) {
      // Update player data
      Object.assign(player, data);
      player.lastUpdate = Date.now();
      
      // Broadcast to other players
      socket.broadcast.emit('player_update', data);
    }
  });
  
  // Handle laser shot
  socket.on('laser_shot', (data) => {
    // Broadcast to all players
    socket.broadcast.emit('laser_shot', data);
  });
  
  // Handle player info update
  socket.on('player_info', (data) => {
    const player = players.get(data.id);
    if (player) {
      // Update player info
      player.name = data.name || player.name;
      player.shipType = data.shipType || player.shipType;
      
      // Broadcast to all players
      io.emit('player_info', {
        id: data.id,
        name: player.name,
        shipType: player.shipType
      });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Find player by socket ID
    let disconnectedPlayerId = null;
    for (const [id, player] of players.entries()) {
      if (player.socketId === socket.id) {
        disconnectedPlayerId = id;
        break;
      }
    }
    
    if (disconnectedPlayerId) {
      // Remove player
      players.delete(disconnectedPlayerId);
      
      // Notify other players
      io.emit('player_left', disconnectedPlayerId);
      
      // Update player count
      io.emit('player_count', players.size);
    }
  });
});

// Clean up inactive players (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, player] of players.entries()) {
    if (now - player.lastUpdate > timeout) {
      console.log('Removing inactive player:', id);
      players.delete(id);
      io.emit('player_left', id);
    }
  }
  
  io.emit('player_count', players.size);
}, 5 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quantum Drift game server running on port ${PORT}`);
}); 