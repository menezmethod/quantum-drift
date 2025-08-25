import { io } from 'socket.io-client';
import * as THREE from 'three';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.serverUrl = 'http://localhost:3000'; // Hardcoded for browser environment
    
    // Player management
    this.otherPlayers = new Map(); // Map of other players by ID
    this.playerId = null;
    this.lastUpdateTime = 0;
    this.updateRate = 50; // 20 FPS updates
    
    // Network state
    this.networkLatency = 0;
    this.lastPingTime = 0;
    this.pingInterval = null;
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Initialize
    this.init();
  }
  
  init() {
    console.log('🌐 Initializing NetworkManager...');
    this.setupEventHandlers();
    this.connect();
  }
  
  setupEventHandlers() {
    // Connection events
    this.eventHandlers.set('connect', this.handleConnect.bind(this));
    this.eventHandlers.set('disconnect', this.handleDisconnect.bind(this));
    this.eventHandlers.set('connect_error', this.handleConnectError.bind(this));
    
    // Game events
    this.eventHandlers.set('gameState', this.handleGameState.bind(this));
    this.eventHandlers.set('playerJoined', this.handlePlayerJoined.bind(this));
    this.eventHandlers.set('playerLeft', this.handlePlayerLeft.bind(this));
    this.eventHandlers.set('playerUpdated', this.handlePlayerUpdated.bind(this));
    this.eventHandlers.set('projectileCreated', this.handleProjectileCreated.bind(this));
    this.eventHandlers.set('projectileDestroyed', this.handleProjectileDestroyed.bind(this));
    this.eventHandlers.set('playerDamaged', this.handlePlayerDamaged.bind(this));
    this.eventHandlers.set('playerKilled', this.handlePlayerKilled.bind(this));
    this.eventHandlers.set('playerRespawned', this.handlePlayerRespawned.bind(this));
    this.eventHandlers.set('projectileHit', this.handleProjectileHit.bind(this));
  }
  
  connect() {
    try {
      console.log(`🌐 Connecting to server: ${this.serverUrl}`);
      console.log('🌐 Socket.IO version:', io.version);
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        forceNew: true
      });
      
      console.log('🌐 Socket created, attaching event handlers...');
      
      // Attach event handlers
      this.attachEventHandlers();
      
      // Add connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          console.error('🌐 Connection timeout - server not responding');
          this.handleConnectionFailure();
        }
      }, 10000);
      
    } catch (error) {
      console.error('🌐 Failed to create socket connection:', error);
      this.handleConnectionFailure();
    }
  }
  
  attachEventHandlers() {
    if (!this.socket) {
      console.error('🌐 No socket available for event handlers');
      return;
    }
    
    console.log('🌐 Attaching event handlers...');
    
    // Attach all event handlers
    this.eventHandlers.forEach((handler, event) => {
      console.log(`🌐 Attaching handler for: ${event}`);
      this.socket.on(event, handler);
    });
    
    // Start ping interval
    this.startPingInterval();
    
    console.log('🌐 Event handlers attached successfully');
  }
  
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.ping();
      }
    }, 5000); // Ping every 5 seconds
  }
  
  ping() {
    if (this.socket && this.isConnected) {
      this.lastPingTime = Date.now();
      this.socket.emit('ping');
    }
  }
  
  handleConnect() {
    console.log('🌐 Connected to server!');
    this.isConnected = true;
    this.connectionAttempts = 0;
    this.playerId = this.socket.id;
    
    // Update UI
    this.updateConnectionStatus(true);
    
    // Start sending player updates
    this.startPlayerUpdates();
  }
  
  handleDisconnect(reason) {
    console.log('🌐 Disconnected from server:', reason);
    this.isConnected = false;
    this.playerId = null;
    
    // Update UI
    this.updateConnectionStatus(false);
    
    // Stop player updates
    this.stopPlayerUpdates();
    
    // Clear other players
    this.otherPlayers.clear();
    
    // Attempt reconnection if not intentional
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }
  
  handleConnectError(error) {
    console.error('🌐 Connection error:', error);
    this.isConnected = false;
    this.handleConnectionFailure();
  }
  
  handleConnectionFailure() {
    this.connectionAttempts++;
    
    if (this.connectionAttempts < this.maxReconnectAttempts) {
      console.log(`🌐 Reconnection attempt ${this.connectionAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay *= 2; // Exponential backoff
    } else {
      console.error('🌐 Max reconnection attempts reached');
      this.updateConnectionStatus(false, 'Connection failed');
    }
  }
  
  scheduleReconnect() {
    if (this.connectionAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.connectionAttempts), 10000);
      console.log(`🌐 Scheduling reconnection in ${delay}ms`);
      setTimeout(() => this.connect(), delay);
    }
  }
  
  handleGameState(data) {
    console.log('🌐 Received game state:', data);
    
    // Clear existing other players
    this.otherPlayers.clear();
    
    // Process players
    if (data.players) {
      data.players.forEach(playerData => {
        if (playerData.id !== this.playerId) {
          this.createOtherPlayer(playerData);
        }
      });
    }
    
    // Process projectiles
    if (data.projectiles) {
      Object.values(data.projectiles).forEach(projectileData => {
        this.createProjectile(projectileData);
      });
    }
  }
  
  handlePlayerJoined(playerData) {
    console.log('🌐 Player joined:', playerData.id);
    
    // Only create other players if the game has started
    if (this.game.gameStarted) {
      this.createOtherPlayer(playerData);
    } else {
      console.log('🌐 Game not started yet, storing player data for later');
      // Store player data to create later when game starts
      if (!this.pendingPlayers) {
        this.pendingPlayers = new Map();
      }
      this.pendingPlayers.set(playerData.id, playerData);
    }
  }
  
  handlePlayerLeft(playerId) {
    console.log('🌐 Player left:', playerId);
    this.removeOtherPlayer(playerId);
  }
  
  handlePlayerUpdated(data) {
    const player = this.otherPlayers.get(data.id);
    if (player) {
      // Update player data
      if (data.position) {
        player.targetPosition = data.position;
      }
      if (data.rotation) {
        player.targetRotation = data.rotation;
      }
      if (data.health !== undefined) {
        player.health = data.health;
      }
      if (data.energy !== undefined) {
        player.energy = data.energy;
      }
      if (data.currentWeapon) {
        player.currentWeapon = data.currentWeapon;
      }
    }
  }
  
  handleProjectileCreated(projectileData) {
    console.log('🌐 Projectile created:', projectileData.id);
    this.createProjectile(projectileData);
  }
  
  handleProjectileDestroyed(projectileId) {
    console.log('🌐 Projectile destroyed:', projectileId);
    this.destroyProjectile(projectileId);
  }
  
  handlePlayerDamaged(data) {
    console.log('🌐 Player damaged event received:', data);
    console.log('🌐 Target ID:', data.targetId, 'Local player ID:', this.playerId);
    console.log('🌐 Damage:', data.damage, 'New health:', data.newHealth);
    
    // Update player health
    const player = this.otherPlayers.get(data.targetId);
    if (player) {
      console.log('🌐 Updating other player health from', player.health, 'to', data.newHealth);
      player.health = data.newHealth;
    }
    
    // Update local player if it's us
    if (data.targetId === this.playerId) {
      console.log('🌐 Updating LOCAL player health from', this.game.health, 'to', data.newHealth);
      console.log('🌐 Game object:', this.game);
      console.log('🌐 Max health value:', this.game.maxHealth);
      
      this.game.health = data.newHealth;
      
      if (this.game.ui) {
        const maxHealth = this.game.maxHealth || 100; // Fallback to 100 if undefined
        console.log('🌐 UI found, updating health bar to:', data.newHealth, '/', maxHealth);
        this.game.ui.updateHealth(this.game.health, maxHealth);
      } else {
        console.error('❌ No UI found to update health!');
      }
    } else {
      console.log('🌐 Not local player, skipping health bar update');
    }
  }
  
  handlePlayerKilled(data) {
    console.log('🌐 Player killed:', data.victimId, 'by:', data.killerId);
    
    // Handle local player death
    if (data.victimId === this.playerId) {
      this.game.health = 0;
      if (this.game.ui) {
        this.game.ui.updateHealth(0, this.game.maxHealth);
      }
      // Show death screen or respawn option
      this.showDeathScreen();
    }
    
    // Handle other player death
    const player = this.otherPlayers.get(data.victimId);
    if (player) {
      player.isAlive = false;
      // Hide player mesh or show death effect
      if (player.mesh) {
        player.mesh.visible = false;
      }
    }
  }
  
  handlePlayerRespawned(playerData) {
    console.log('🌐 Player respawned:', playerData.id);
    
    if (playerData.id === this.playerId) {
      // Local player respawned
      this.game.health = playerData.health;
      this.game.energy = playerData.energy;
      this.game.playerShip.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
      this.game.playerShip.rotation.y = playerData.rotation.y;
      
      if (this.game.ui) {
        this.game.ui.updateHealth(this.game.health, this.game.maxHealth);
        this.game.ui.updateEnergy(this.game.energy, this.game.maxEnergy);
      }
      
      // Hide death screen
      this.hideDeathScreen();
    } else {
      // Other player respawned
      const player = this.otherPlayers.get(playerData.id);
      if (player) {
        player.isAlive = true;
        player.health = playerData.health;
        player.energy = playerData.energy;
        player.targetPosition = playerData.position;
        player.targetRotation = playerData.rotation;
        
        if (player.mesh) {
          player.mesh.visible = true;
          player.mesh.position.copy(playerData.position);
          player.mesh.rotation.y = playerData.rotation.y;
        }
      }
    }
  }
  
  handleProjectileHit(data) {
    console.log('🌐 Projectile hit:', data.projectileId, 'Target:', data.targetId);
    
    // Remove projectile from scene
    this.destroyProjectile(data.projectileId);
    
    // Create hit effect
    if (this.game.createHitEffect) {
      const targetPlayer = this.otherPlayers.get(data.targetId);
      if (targetPlayer && targetPlayer.mesh) {
        this.game.createHitEffect(targetPlayer.mesh.position.clone());
      }
    }
  }
  
  createOtherPlayer(playerData) {
    if (playerData.id === this.playerId) return;
    
    console.log('🌐 Creating other player:', playerData.id);
    
    // Create player mesh (similar to local player but different color)
    const geometry = new THREE.ConeGeometry(0.5, 1, 8);
    geometry.rotateX(Math.PI / 2);
    
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000, // Red for other players
      emissive: 0x660000,
      shininess: 100
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    mesh.rotation.y = playerData.rotation.y;
    
    // Add to scene
    this.game.scene.add(mesh);
    
    // Store player data
    this.otherPlayers.set(playerData.id, {
      id: playerData.id,
      mesh: mesh,
      position: playerData.position,
      rotation: playerData.rotation,
      health: playerData.health,
      energy: playerData.energy,
      currentWeapon: playerData.currentWeapon,
      team: playerData.team,
      isAlive: playerData.isAlive,
      targetPosition: playerData.position,
      targetRotation: playerData.rotation,
      lastUpdate: Date.now()
    });
  }
  
  removeOtherPlayer(playerId) {
    const player = this.otherPlayers.get(playerId);
    if (player && player.mesh) {
      this.game.scene.remove(player.mesh);
      this.otherPlayers.delete(playerId);
    }
  }
  
  createProjectile(projectileData) {
    console.log('🌐 Creating projectile with data:', projectileData);
    
    // Create projectile mesh based on weapon type
    let geometry, material;
    
    switch (projectileData.weaponType) {
      case 'LASER':
        // Make laser projectiles larger and properly oriented
        geometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
        // Don't rotate - let it be vertical (Y-axis) by default
        material = new THREE.MeshBasicMaterial({ 
          color: 0xff0000, // Bright red for network projectiles
          transparent: true, 
          opacity: 0.0, // Make invisible - we only need collision detection
          emissive: 0xff0000,
          emissiveIntensity: 0.0 // No glow
        });
        break;
      case 'BOUNCE':
        geometry = new THREE.SphereGeometry(0.25, 16, 16);
        material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, // Bright green
          transparent: true, 
          opacity: 0.0, // Make invisible
          emissive: 0x00ff00,
          emissiveIntensity: 0.0 // No glow
        });
        break;
      case 'GRENADE':
        geometry = new THREE.SphereGeometry(0.4, 16, 16);
        material = new THREE.MeshPhongMaterial({ 
          color: 0xff4500, 
          emissive: 0xff2000,
          emissiveIntensity: 0.0 // No glow
        });
        break;
      default:
        geometry = new THREE.SphereGeometry(0.2, 8, 8);
        material = new THREE.MeshBasicMaterial({ 
          color: 0xffff00, // Bright yellow
          emissive: 0xffff00,
          emissiveIntensity: 0.0 // No glow
        });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Debug: Check if position data exists
    if (!projectileData.position) {
      console.error('❌ Projectile missing position data:', projectileData);
      return;
    }
    
    if (!projectileData.direction) {
      console.error('❌ Projectile missing direction data:', projectileData);
      return;
    }
    
    if (!projectileData.speed) {
      console.error('❌ Projectile missing speed data:', projectileData);
      return;
    }
    
    console.log('🌐 Setting projectile position:', projectileData.position);
    mesh.position.set(projectileData.position.x, projectileData.position.y, projectileData.position.z);
    
    // Orient the projectile to face the direction it's traveling
    if (projectileData.weaponType === 'LASER') {
      // For laser, orient the cylinder along the direction vector
      const direction = new THREE.Vector3(projectileData.direction.x, projectileData.direction.y, projectileData.direction.z);
      if (direction.length() > 0) {
        direction.normalize();
        // Create a quaternion to rotate the cylinder to face the direction
        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        quaternion.setFromUnitVectors(up, direction);
        mesh.quaternion.copy(quaternion);
      }
    }
    
    // Add to scene
    this.game.scene.add(mesh);
    console.log('🌐 Projectile added to scene at:', mesh.position);
    
    // Store projectile data
    if (!this.game.networkProjectiles) {
      this.game.networkProjectiles = new Map();
    }
    
    this.game.networkProjectiles.set(projectileData.id, {
      id: projectileData.id,
      mesh: mesh,
      data: projectileData,
      createdAt: Date.now()
    });
    
    console.log('🌐 Projectile stored, total network projectiles:', this.game.networkProjectiles.size);
  }
  
  destroyProjectile(projectileId) {
    if (this.game.networkProjectiles) {
      const projectile = this.game.networkProjectiles.get(projectileId);
      if (projectile && projectile.mesh) {
        this.game.scene.remove(projectile.mesh);
        this.game.networkProjectiles.delete(projectileId);
      }
    }
  }
  
  startPlayerUpdates() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      if (this.isConnected && this.game.playerShip) {
        this.sendPlayerUpdate();
      }
    }, this.updateRate);
  }
  
  stopPlayerUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  sendPlayerUpdate() {
    if (!this.socket || !this.isConnected || !this.game.playerShip) return;
    
    const update = {
      position: {
        x: this.game.playerShip.position.x,
        y: this.game.playerShip.position.y,
        z: this.game.playerShip.position.z
      },
      rotation: {
        y: this.game.playerShip.rotation.y
      },
      health: this.game.health,
      energy: this.game.energy,
      currentWeapon: this.game.currentWeapon
    };
    
    this.socket.emit('playerUpdate', update);
  }
  
  sendWeaponFired(weaponType, position, direction, speed, damage) {
    if (!this.socket || !this.isConnected) return;
    
    const data = {
      weaponType,
      position,
      direction,
      speed,
      damage
    };
    
    this.socket.emit('weaponFired', data);
  }
  
  sendPlayerDamaged(targetId, damage, weaponType) {
    if (!this.socket || !this.isConnected) return;
    
    const data = {
      targetId,
      damage,
      weaponType
    };
    
    this.socket.emit('playerDamaged', data);
  }
  
  requestRespawn() {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('requestRespawn');
  }
  
  updateConnectionStatus(connected, message = '') {
    // Update UI to show connection status
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
      if (message) {
        statusElement.textContent += ` - ${message}`;
      }
    }
    
    // Update player count if available
    if (connected) {
      this.updatePlayerCount();
    }
  }
  
  updatePlayerCount() {
    const countElement = document.getElementById('player-count');
    if (countElement) {
      const totalPlayers = this.otherPlayers.size + 1; // +1 for local player
      countElement.textContent = `Players: ${totalPlayers}`;
    }
  }
  
  showDeathScreen() {
    // Create death screen
    let deathScreen = document.getElementById('death-screen');
    if (!deathScreen) {
      deathScreen = document.createElement('div');
      deathScreen.id = 'death-screen';
      deathScreen.className = 'death-screen';
      deathScreen.innerHTML = `
        <div class="death-content">
          <h2>YOU DIED</h2>
          <p id="respawn-countdown">Respawning in 5 seconds...</p>
          <button id="respawn-button" class="glow-button">Respawn Now</button>
        </div>
      `;
      
      document.body.appendChild(deathScreen);
      
      // Add respawn button handler
      document.getElementById('respawn-button').addEventListener('click', () => {
        this.requestRespawn();
      });
    }
    
    deathScreen.classList.remove('hidden');
    
    // Start countdown - make sure element exists first
    const countdownElement = document.getElementById('respawn-countdown');
    if (countdownElement) {
      let countdown = 5;
      
      const updateCountdown = () => {
        if (countdown > 0 && countdownElement) {
          countdownElement.textContent = `Respawning in ${countdown} seconds...`;
          countdown--;
          setTimeout(updateCountdown, 1000);
        } else if (countdownElement) {
          countdownElement.textContent = 'Respawning now...';
          // Auto-respawn after countdown
          setTimeout(() => {
            this.requestRespawn();
          }, 500);
        }
      };
      
      updateCountdown();
    } else {
      console.error('❌ Countdown element not found!');
    }
  }
  
  hideDeathScreen() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.classList.add('hidden');
    }
  }
  
  updateOtherPlayers(deltaTime) {
    // Update other players with interpolation
    this.otherPlayers.forEach(player => {
      if (player.mesh && player.isAlive) {
        // Interpolate position
        if (player.targetPosition) {
          player.mesh.position.lerp(player.targetPosition, deltaTime * 10);
        }
        
        // Interpolate rotation
        if (player.targetRotation) {
          player.mesh.rotation.y = THREE.MathUtils.lerp(
            player.mesh.rotation.y,
            player.targetRotation.y,
            deltaTime * 10
          );
        }
      }
    });
  }
  
  updateNetworkProjectiles(deltaTime) {
    if (!this.game.networkProjectiles) return;
    
    this.game.networkProjectiles.forEach(projectile => {
      if (projectile.mesh && projectile.data) {
        // Debug: Log projectile movement
        const oldPosition = projectile.mesh.position.clone();
        
        // Move projectile
        const direction = projectile.data.direction;
        const speed = projectile.data.speed;
        
        // Debug: Log projectile data
        console.log('🌐 Moving projectile:', projectile.id, 'direction:', direction, 'speed:', speed, 'deltaTime:', deltaTime);
        
        projectile.mesh.position.x += direction.x * speed * deltaTime;
        projectile.mesh.position.y += direction.y * speed * deltaTime;
        projectile.mesh.position.z += direction.z * speed * deltaTime;
        
        // Check collision with local player
        if (this.game.playerShip && projectile.data.playerId !== this.playerId) {
          const distance = projectile.mesh.position.distanceTo(this.game.playerShip.position);
          
          // Debug: Log collision check
          if (distance < 2.0) { // Log when close to player
            console.log('🌐 Projectile near player:', projectile.id, 'distance:', distance.toFixed(2));
          }
          
          if (distance < 1.5) { // Increased collision threshold for better detection
            console.log('🌐 Network projectile hit local player!', projectile.id, 'distance:', distance.toFixed(2));
            
            // Send damage event to server
            this.sendPlayerDamaged(
              this.playerId, // Target is local player
              projectile.data.damage || 25, // Use projectile damage or default
              projectile.data.weaponType || 'LASER'
            );
            
            console.log('🌐 Damage event sent:', {
              targetId: this.playerId,
              damage: projectile.data.damage || 25,
              weaponType: projectile.data.weaponType || 'LASER'
            });
            
            // Remove the projectile
            this.destroyProjectile(projectile.id);
            
            // Create hit effect on local player
            if (this.game.createHitEffect) {
              this.game.createHitEffect(this.game.playerShip.position.clone());
            }
            
            return; // Skip further processing for this projectile
          }
        }
        
        // Debug: Log movement if significant
        const distance = oldPosition.distanceTo(projectile.mesh.position);
        if (distance > 0.01) { // Lower threshold to see more movement
          console.log('🌐 Projectile moved:', projectile.id, 'from', oldPosition, 'to', projectile.mesh.position, 'distance:', distance);
        }
        
        // Remove old projectiles
        if (Date.now() - projectile.createdAt > 10000) {
          console.log('🌐 Removing old projectile:', projectile.id);
          this.destroyProjectile(projectile.id);
        }
      }
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.isConnected = false;
    this.playerId = null;
    this.otherPlayers.clear();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  cleanup() {
    this.disconnect();
    console.log('🌐 NetworkManager cleaned up');
  }
}
