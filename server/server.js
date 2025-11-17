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

// Player color palette (consistent across all clients)
const PLAYER_COLORS = [
  0xff0000, // Red
  0x00ff00, // Green
  0x0000ff, // Blue
  0xffff00, // Yellow
  0xff00ff, // Magenta
  0x00ffff, // Cyan
  0xff8800, // Orange
  0x8800ff, // Purple
];

// Helper to get consistent color for a player ID
function getPlayerColor(playerId) {
  const colorIndex = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex];
}

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
    this.color = getPlayerColor(id); // Assign consistent color based on ID
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
      lastUpdate: this.lastUpdate,
      color: this.color // Include color in player data
    };
  }
}

// Helper function to check if a position collides with an obstacle
function checkObstacleCollision(x, z, obstacles) {
  if (!obstacles || !obstacles.obstacles) return false;
  
  const playerRadius = 1.0; // Player collision radius
  const playerY = 0.5; // Player Y position
  
  for (const obstacle of obstacles.obstacles) {
    const obsPos = obstacle.position;
    const obsX = obsPos.x || obsPos[0];
    const obsY = obsPos.y || obsPos[1];
    const obsZ = obsPos.z || obsPos[2];
    
    // Check horizontal distance (X-Z plane)
    const horizontalDist = Math.sqrt(
      Math.pow(x - obsX, 2) + Math.pow(z - obsZ, 2)
    );
    
    if (obstacle.type === 'box') {
      const size = obstacle.size;
      const sizeX = size.x || size[0] || 2;
      const sizeZ = size.z || size[2] || 2;
      const sizeY = size.y || size[1] || 4;
      
      // Check if player is within box bounds (with player radius)
      const halfSizeX = sizeX / 2 + playerRadius;
      const halfSizeZ = sizeZ / 2 + playerRadius;
      const halfSizeY = sizeY / 2;
      
      if (Math.abs(x - obsX) < halfSizeX && 
          Math.abs(z - obsZ) < halfSizeZ &&
          Math.abs(playerY - obsY) < halfSizeY) {
        return true; // Collision detected
      }
    } else if (obstacle.type === 'cylinder') {
      const radius = obstacle.radius || 1;
      const height = obstacle.height || 5;
      
      // Check if player is within cylinder bounds
      if (horizontalDist < radius + playerRadius &&
          Math.abs(playerY - obsY) < height / 2) {
        return true; // Collision detected
      }
    } else if (obstacle.type === 'sphere') {
      const radius = obstacle.radius || 1;
      
      // Check if player is within sphere bounds
      const verticalDist = Math.abs(playerY - obsY);
      const totalDist = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
      
      if (totalDist < radius + playerRadius) {
        return true; // Collision detected
      }
    }
  }
  
  return false; // No collision
}

// Helper function to generate a safe spawn position
function generateSafeSpawnPosition(players) {
  const boundarySize = 25; // Match client boundary size
  const spawnRadius = boundarySize - 2; // Stay 2 units inside boundary
  const spawnAttempts = 150; // More attempts to find a safe spot
  const minDistance = 12; // Larger minimum distance between players for better spread

  console.log(`🌍 Generating spawn position for new player. Existing players: ${Object.keys(players).length}`);

  // If no other players, try multiple positions away from center
  if (Object.keys(players).length === 0) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 12 + Math.random() * 8; // 12-20 units from center (within boundary)
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const y = 0.5;
      
      // Ensure within boundary
      if (Math.abs(x) > boundarySize - 2 || Math.abs(z) > boundarySize - 2) {
        continue;
      }
      
      // Check obstacle collision
      if (!gameState.map || !checkObstacleCollision(x, z, gameState.map)) {
        console.log(`🌍 Generated initial spawn position: x=${x.toFixed(2)}, z=${z.toFixed(2)}`);
        return { x, y, z };
      }
    }
    // If all attempts failed, fall through to main spawn logic
  }

  // Try to find a position far from all existing players
  for (let i = 0; i < spawnAttempts; i++) {
    // Generate random position within boundary (stay 2 units inside)
    const x = (Math.random() - 0.5) * spawnRadius * 2;
    const z = (Math.random() - 0.5) * spawnRadius * 2;
    const y = 0.5; // Y is always 0.5 for ground level
    
    // Ensure position is within bounds
    if (Math.abs(x) > boundarySize - 2 || Math.abs(z) > boundarySize - 2) {
      continue; // Skip positions outside boundary
    }

    // Check if the generated position is safe from other players
    let isSafe = true;
    let minPlayerDistance = Infinity;
    
    for (const playerId in players) {
      const player = players[playerId];
      if (player && player.position) {
        const distance = Math.sqrt(
          Math.pow(x - player.position.x, 2) +
          Math.pow(y - player.position.y, 2) +
          Math.pow(z - player.position.z, 2)
        );
        minPlayerDistance = Math.min(minPlayerDistance, distance);
        if (distance < minDistance) {
          console.log(`🌍 Position ${x.toFixed(2)}, ${z.toFixed(2)} too close to player ${playerId} (distance: ${distance.toFixed(2)})`);
          isSafe = false;
          break;
        }
      }
    }
    
    // Check if the position collides with obstacles
    if (isSafe && gameState.map) {
      if (checkObstacleCollision(x, z, gameState.map)) {
        console.log(`🌍 Position ${x.toFixed(2)}, ${z.toFixed(2)} collides with obstacle`);
        isSafe = false;
      }
    }

    if (isSafe) {
      console.log(`🌍 Generated safe spawn position: x=${x.toFixed(2)}, z=${z.toFixed(2)} (min distance from players: ${minPlayerDistance.toFixed(2)})`);
      return { x, y, z };
    }
  }
  
  // Fallback: try positions in a circle pattern, avoiding obstacles and players
  const existingPlayerCount = Object.keys(players).length;
  // Try more positions with better distribution
  for (let i = 0; i < 50; i++) {
    // Distribute players evenly around circle, with some randomness
    const baseAngle = (existingPlayerCount * Math.PI * 2 / 8) + (i * Math.PI * 2 / 50);
    const angle = baseAngle + (Math.random() - 0.5) * 0.5; // Add some randomness
    const distance = 15 + Math.random() * 8; // 15-23 units from center (within boundary)
    const fallbackX = Math.cos(angle) * distance;
    const fallbackZ = Math.sin(angle) * distance;
    
    // Ensure within boundary
    if (Math.abs(fallbackX) > boundarySize - 2 || Math.abs(fallbackZ) > boundarySize - 2) {
      continue; // Skip positions outside boundary
    }
    
    // Check obstacle collision first (faster check)
    if (gameState.map && checkObstacleCollision(fallbackX, fallbackZ, gameState.map)) {
      continue; // Skip this position
    }
    
    // Check distance from other players
    let tooClose = false;
    for (const playerId in players) {
      const player = players[playerId];
      if (player && player.position) {
        const distance = Math.sqrt(
          Math.pow(fallbackX - player.position.x, 2) +
          Math.pow(fallbackZ - player.position.z, 2)
        );
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
    }
    
    if (!tooClose) {
      console.log(`🌍 Using fallback spawn position: x=${fallbackX.toFixed(2)}, z=${fallbackZ.toFixed(2)}`);
      return { x: fallbackX, y: 0.5, z: fallbackZ };
    }
  }
  
  // Last resort: spawn at origin (should be safe if map is designed correctly)
  console.log(`🌍 Using origin as last resort spawn position`);
  return { x: 0, y: 0.5, z: 0 };
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
    const player = gameState.players[socket.id];
    if (player) {
      player.update(data);
      
      // Broadcast to other players (include color for sync)
      socket.broadcast.emit('playerUpdated', {
        id: socket.id,
        ...data,
        color: player.color // Include color in updates for sync
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
      color: player.color, // Include player color for projectile
      createdAt: Date.now()
    };
    
    gameState.projectiles[projectileId] = projectile;
    
    // Broadcast to all players (except the shooter - they see their own local projectile)
    socket.broadcast.emit('projectileCreated', projectile);
    
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
  
  // Handle grenade explosions
  socket.on('grenadeExploded', (data) => {
    const explosionPos = data.position;
    const explosionRadius = data.radius || 4;
    const maxDamage = data.maxDamage || 75;
    const attackerId = socket.id;
    
    // Check all players in explosion radius
    for (const playerId in gameState.players) {
      const player = gameState.players[playerId];
      if (!player || !player.isAlive || playerId === attackerId) continue;
      
      // Calculate distance from explosion
      const playerPos = player.position;
      const distance = Math.sqrt(
        Math.pow(explosionPos.x - playerPos.x, 2) +
        Math.pow(explosionPos.y - playerPos.y, 2) +
        Math.pow(explosionPos.z - playerPos.z, 2)
      );
      
      if (distance < explosionRadius) {
        // Calculate damage with distance falloff
        const damagePercent = 1 - (distance / explosionRadius);
        const damage = Math.floor(maxDamage * damagePercent);
        
        // Apply damage
        player.health = Math.max(0, player.health - damage);
        
        if (player.health <= 0) {
          player.isAlive = false;
          player.deathTime = Date.now();
          
          // Notify all players about the kill
          io.emit('playerKilled', {
            killerId: attackerId,
            victimId: playerId,
            weaponType: 'GRENADE'
          });
          
          // Respawn player after 5 seconds
          setTimeout(() => {
            if (gameState.players[playerId]) {
              const spawnPosition = generateSafeSpawnPosition(gameState.players);
              player.health = player.maxHealth;
              player.energy = player.maxEnergy;
              player.isAlive = true;
              player.position = spawnPosition;
              player.rotation = { y: Math.random() * Math.PI * 2 };
              player.spawnTime = Date.now();
              io.emit('playerRespawned', player.toJSON());
            }
          }, 5000);
        } else {
          // Broadcast damage to all players
          io.emit('playerDamaged', {
            targetId: playerId,
            damage: damage,
            newHealth: player.health,
            weaponType: 'GRENADE'
          });
        }
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
