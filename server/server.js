const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Game state
const gameState = {
  players: {},
  projectiles: {},
  gameTime: 0,
  lastUpdate: Date.now(),
  map: null // Will be set after generation
};

// Generate the map immediately
console.log('🌍 Initializing game state...');
gameState.map = generateGameMap();
console.log('🌍 Game state initialized with map:', gameState.map);

// Player management
class Player {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
    this.position = { x: 0, y: 0.5, z: 0 };
    this.rotation = { y: 0 };
    this.health = 100;
    this.maxHealth = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.currentWeapon = 'LASER';
    this.team = null;
    this.lastUpdate = Date.now();
    this.isAlive = true;
    this.spawnTime = Date.now();
  }

  update(data) {
    if (data.position) this.position = data.position;
    if (data.rotation) this.rotation = data.rotation;
    if (data.health !== undefined) this.health = data.health;
    if (data.energy !== undefined) this.energy = data.energy;
    if (data.currentWeapon) this.currentWeapon = data.currentWeapon;
    if (data.team !== undefined) this.team = data.team;
    this.lastUpdate = Date.now();
  }

  toJSON() {
    return {
      id: this.id,
      position: this.position,
      rotation: this.rotation,
      health: this.health,
      maxHealth: this.maxHealth,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      currentWeapon: this.currentWeapon,
      team: this.team,
      isAlive: this.isAlive,
      lastUpdate: this.lastUpdate
    };
  }
}

// Helper function to generate a safe spawn position
function generateSafeSpawnPosition(players) {
  const spawnRadius = 20; // Increased radius for more spread
  const spawnAttempts = 30; // More attempts to find a safe spot
  const minDistance = 5; // Increased minimum distance between players

  console.log(`🌍 Generating spawn position for new player. Existing players: ${Object.keys(players).length}`);

  for (let i = 0; i < spawnAttempts; i++) {
    // Generate random position in a larger area
    const x = (Math.random() - 0.5) * spawnRadius * 2;
    const z = (Math.random() - 0.5) * spawnRadius * 2;
    const y = 0.5; // Y is always 0.5 for ground level

    // Check if the generated position is safe
    let isSafe = true;
    for (const playerId in players) {
      const player = players[playerId];
      if (player && player.position) {
        const distance = Math.sqrt(
          Math.pow(x - player.position.x, 2) +
          Math.pow(y - player.position.y, 2) +
          Math.pow(z - player.position.z, 2)
        );
        if (distance < minDistance) {
          console.log(`🌍 Position ${x.toFixed(2)}, ${z.toFixed(2)} too close to player ${playerId} (distance: ${distance.toFixed(2)})`);
          isSafe = false;
          break;
        }
      }
    }

    if (isSafe) {
      console.log(`🌍 Generated safe spawn position: x=${x.toFixed(2)}, z=${z.toFixed(2)}`);
      return { x, y, z };
    }
  }
  
  // Fallback: generate a position far from center with more variation
  const fallbackX = (Math.random() - 0.5) * 30;
  const fallbackZ = (Math.random() - 0.5) * 30;
  console.log(`🌍 Using fallback spawn position: x=${fallbackX.toFixed(2)}, z=${fallbackZ.toFixed(2)}`);
  return { x: fallbackX, y: 0.5, z: fallbackZ };
}

// Generate a fixed, non-random game map
function generateGameMap() {
  console.log('🌍 Generating fixed game map...');
  
  const map = {
    obstacles: [
      // Box obstacles
      { type: 'box', position: { x: 10, y: 2, z: 5 }, size: { x: 2, y: 4, z: 2 }, color: 0xff0000 },
      { type: 'box', position: { x: -8, y: 2.5, z: -3 }, size: { x: 3, y: 5, z: 3 }, color: 0x00ff00 },
      { type: 'box', position: { x: 5, y: 1.5, z: -8 }, size: { x: 2.5, y: 3, z: 2.5 }, color: 0x0000ff },
      { type: 'box', position: { x: -12, y: 2, z: 8 }, size: { x: 2, y: 4, z: 2 }, color: 0xffff00 },
      { type: 'box', position: { x: 15, y: 2.5, z: -5 }, size: { x: 3, y: 5, z: 3 }, color: 0xff00ff },
      
      // Cylinder obstacles
      { type: 'cylinder', position: { x: 0, y: 3, z: 12 }, radius: 1.5, height: 6, color: 0x00ffff },
      { type: 'cylinder', position: { x: -15, y: 2.5, z: 0 }, radius: 1, height: 5, color: 0xff8800 },
      { type: 'cylinder', position: { x: 8, y: 3.5, z: -12 }, radius: 2, height: 7, color: 0x8800ff },
      { type: 'cylinder', position: { x: -5, y: 2, z: 15 }, radius: 1.2, height: 4, color: 0xff0088 },
      { type: 'cylinder', position: { x: 18, y: 3, z: 2 }, radius: 1.8, height: 6, color: 0x88ff00 },
      
      // Sphere obstacles
      { type: 'sphere', position: { x: -10, y: 2, z: -8 }, radius: 2, color: 0xff4400 },
      { type: 'sphere', position: { x: 3, y: 1.5, z: 18 }, radius: 1.5, color: 0x44ff00 },
      { type: 'sphere', position: { x: -18, y: 2.5, z: -5 }, radius: 2.5, color: 0x0044ff },
      { type: 'sphere', position: { x: 12, y: 2, z: -15 }, radius: 1.8, color: 0xff0044 },
      { type: 'sphere', position: { x: -2, y: 1.8, z: -18 }, radius: 1.2, color: 0x44ffff },
      { type: 'sphere', position: { x: 20, y: 2.2, z: 10 }, radius: 2.2, color: 0xffff44 }
    ]
  };
  
  console.log(`🌍 Generated map with ${map.obstacles.length} obstacles`);
  return map;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Create new player with random spawn position
  const spawnPosition = generateSafeSpawnPosition(gameState.players);
  const player = new Player(socket.id, socket);
  player.position = spawnPosition; // Override default position with random spawn
  gameState.players[socket.id] = player;
  
  console.log(`Player ${socket.id} spawned at:`, spawnPosition);
  
  // Send current game state to new player
  socket.emit('gameState', {
    players: Object.values(gameState.players).map(p => p.toJSON()),
    projectiles: gameState.projectiles,
    gameTime: gameState.gameTime,
    map: gameState.map // Send the map to the new player
  });
  
  // Also send map data separately for clarity
  socket.emit('gameMap', gameState.map);
  
  // Notify other players about new player
  socket.broadcast.emit('playerJoined', player.toJSON());
  
  // Handle player updates
  socket.on('playerUpdate', (data) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].update(data);
      
      // Broadcast to other players
      socket.broadcast.emit('playerUpdated', {
        id: socket.id,
        ...data
      });
    }
  });
  
  // Handle weapon firing
  socket.on('weaponFired', (data) => {
    const player = gameState.players[socket.id];
    if (!player || !player.isAlive) return;
    
    // Create projectile
    const projectileId = `${socket.id}_${Date.now()}`;
    const projectile = {
      id: projectileId,
      playerId: socket.id,
      weaponType: data.weaponType,
      position: data.position,
      direction: data.direction,
      speed: data.speed,
      damage: data.damage,
      createdAt: Date.now()
    };
    
    gameState.projectiles[projectileId] = projectile;
    
    // Broadcast to all players
    io.emit('projectileCreated', projectile);
    
    // Remove projectile after some time
    setTimeout(() => {
      if (gameState.projectiles[projectileId]) {
        delete gameState.projectiles[projectileId];
        io.emit('projectileDestroyed', projectileId);
      }
    }, 10000); // 10 seconds
  });
  
  // Handle player damage
  socket.on('playerDamaged', (data) => {
    const targetPlayer = gameState.players[data.targetId];
    if (targetPlayer && targetPlayer.isAlive) {
      targetPlayer.health = Math.max(0, targetPlayer.health - data.damage);
      
      if (targetPlayer.health <= 0) {
        targetPlayer.isAlive = false;
        targetPlayer.deathTime = Date.now();
        
        // Notify all players about the kill
        io.emit('playerKilled', {
          killerId: socket.id,
          victimId: data.targetId,
          weaponType: data.weaponType
        });
        
        // Respawn player after 5 seconds
        setTimeout(() => {
          if (gameState.players[data.targetId]) {
            // Generate random spawn position away from other players
            const spawnPosition = generateSafeSpawnPosition(gameState.players);
            
            targetPlayer.health = targetPlayer.maxHealth;
            targetPlayer.energy = targetPlayer.maxEnergy;
            targetPlayer.isAlive = true;
            targetPlayer.position = spawnPosition;
            targetPlayer.rotation = { y: Math.random() * Math.PI * 2 }; // Random rotation
            targetPlayer.spawnTime = Date.now();
            
            console.log(`🌍 Player ${data.targetId} respawned at:`, spawnPosition);
            io.emit('playerRespawned', targetPlayer.toJSON());
          }
        }, 5000);
      } else {
        // Broadcast damage to all players
        io.emit('playerDamaged', {
          targetId: data.targetId,
          damage: data.damage,
          newHealth: targetPlayer.health
        });
      }
    }
  });
  
  // Handle player respawn request
  socket.on('requestRespawn', () => {
    const player = gameState.players[socket.id];
    if (player && !player.isAlive) {
      // Generate random spawn position away from other players
      const spawnPosition = generateSafeSpawnPosition(gameState.players);
      
      player.health = player.maxHealth;
      player.energy = player.maxEnergy;
      player.isAlive = true;
      player.position = spawnPosition;
      player.rotation = { y: Math.random() * Math.PI * 2 }; // Random rotation
      player.spawnTime = Date.now();
      
      console.log(`🌍 Player ${socket.id} manually respawned at:`, spawnPosition);
      io.emit('playerRespawned', player.toJSON());
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove player from game state
    if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      
      // Notify other players
      socket.broadcast.emit('playerLeft', socket.id);
    }
  });
});

// Game loop for server-side updates
setInterval(() => {
  const now = Date.now();
  const deltaTime = now - gameState.lastUpdate;
  gameState.lastUpdate = now;
  gameState.gameTime += deltaTime;
  
  // Update projectiles
  Object.keys(gameState.projectiles).forEach(projectileId => {
    const projectile = gameState.projectiles[projectileId];
    if (projectile) {
      // Move projectile
      projectile.position.x += projectile.direction.x * projectile.speed * (deltaTime / 1000);
      projectile.position.y += projectile.direction.y * projectile.speed * (deltaTime / 1000);
      projectile.position.z += projectile.direction.z * projectile.speed * (deltaTime / 1000);
      
      // Check for collisions with players
      Object.values(gameState.players).forEach(player => {
        if (player.isAlive && player.id !== projectile.playerId) {
          const distance = Math.sqrt(
            Math.pow(projectile.position.x - player.position.x, 2) +
            Math.pow(projectile.position.y - player.position.y, 2) +
            Math.pow(projectile.position.z - player.position.z, 2)
          );
          
          if (distance < 1.0) { // Collision threshold
            // Handle collision
            player.health = Math.max(0, player.health - projectile.damage);
            
            // Remove projectile
            delete gameState.projectiles[projectileId];
            
            // Notify all players
            io.emit('projectileHit', {
              projectileId: projectileId,
              targetId: player.id,
              damage: projectile.damage
            });
            
            if (player.health <= 0) {
              player.isAlive = false;
              player.deathTime = now;
              
              io.emit('playerKilled', {
                killerId: projectile.playerId,
                victimId: player.id,
                weaponType: projectile.weaponType
              });
            }
          }
        }
      });
    }
  });
  
  // Clean up old projectiles
  Object.keys(gameState.projectiles).forEach(projectileId => {
    const projectile = gameState.projectiles[projectileId];
    if (now - projectile.createdAt > 10000) { // 10 seconds
      delete gameState.projectiles[projectileId];
    }
  });
}, 50); // 20 FPS server update rate

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    players: Object.keys(gameState.players).length,
    projectiles: Object.keys(gameState.projectiles).length,
    uptime: process.uptime()
  });
});

// Game state endpoint (for debugging)
app.get('/api/gameState', (req, res) => {
  res.json({
    players: Object.values(gameState.players).map(p => p.toJSON()),
    projectiles: gameState.projectiles,
    gameTime: gameState.gameTime
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Quantum Drift Server running on port ${PORT}`);
  console.log(`📊 Game state initialized`);
  console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:8080'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
