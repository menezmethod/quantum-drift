import { io } from 'socket.io-client';
import * as THREE from 'three';

console.log('🌐 NetworkManager.js file loaded and imported - VERSION 2.0 -', new Date().toISOString());

export class NetworkManager {
  constructor(game) {
    console.log('🌐 ===== NETWORKMANAGER CONSTRUCTOR CALLED =====');
    console.log('🌐 NetworkManager constructor called with game:', game);
    console.log('🌐 Map constructor available:', typeof Map);
    console.log('🌐 Map constructor:', Map);
    
    this.game = game;
    this.socket = null;
    this.playerId = null;
    this.serverUrl = 'http://localhost:3000';
    this.reconnectDelay = 1000;
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.otherPlayers = new Map();
    this.networkProjectiles = new Map();
    this.pendingPlayers = new Map();
    this.gameStarted = false; // Track if game has started
    
    // Network state
    this.isConnected = false;
    this.networkLatency = 0;
    this.lastPingTime = 0;
    this.pingInterval = null;
    this.lastUpdateTime = 0;
    this.updateRate = 50; // 20 FPS updates
    this.lastHealthUpdate = Date.now();
    
    // Event handlers
    this.eventHandlers = new Map();
    
    console.log('🌐 NetworkManager properties initialized:');
    console.log('🌐 - eventHandlers:', this.eventHandlers);
    console.log('🌐 - eventHandlers type:', typeof this.eventHandlers);
    console.log('🌐 - eventHandlers size:', this.eventHandlers.size);
    console.log('🌐 - eventHandlers constructor:', this.eventHandlers.constructor);
    console.log('🌐 - eventHandlers instanceof Map:', this.eventHandlers instanceof Map);
    console.log('🌐 - eventHandlers forEach:', typeof this.eventHandlers.forEach);
    
    console.log('🌐 Initializing NetworkManager...');
    this.init();
  }
  
  init() {
    console.log('🌐 NetworkManager.init() called');
    console.log('🌐 Setting up event handlers...');
    this.setupEventHandlers();
    console.log('🌐 Event handlers setup complete, connecting...');
    this.connect();
  }
  
  setupEventHandlers() {
    // Set up all event handlers
    this.eventHandlers.set('connect', this.handleConnect.bind(this));
    this.eventHandlers.set('disconnect', this.handleDisconnect.bind(this));
    this.eventHandlers.set('connect_error', this.handleConnectError.bind(this));
    this.eventHandlers.set('gameState', this.handleGameState.bind(this));
    this.eventHandlers.set('gameMap', this.handleGameMap.bind(this));
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
    
    if (!this.eventHandlers) {
      console.error('❌ Event handlers not initialized!');
      console.log('🌐 this.eventHandlers:', this.eventHandlers);
      console.log('🌐 this:', this);
      console.log('🌐 this.eventHandlers type:', typeof this.eventHandlers);
      console.log('🌐 this.eventHandlers constructor:', this.eventHandlers?.constructor);
      return;
    }
    
    if (!(this.eventHandlers instanceof Map)) {
      console.error('❌ Event handlers is not a Map!');
      console.log('🌐 this.eventHandlers:', this.eventHandlers);
      console.log('🌐 this.eventHandlers type:', typeof this.eventHandlers);
      console.log('🌐 this.eventHandlers constructor:', this.eventHandlers?.constructor);
      return;
    }
    
    console.log('🌐 Attaching event handlers...');
    console.log('🌐 Event handlers map size:', this.eventHandlers.size);
    
    try {
      // Attach all event handlers
      this.eventHandlers.forEach((handler, event) => {
        console.log(`🌐 Attaching handler for: ${event}`);
        this.socket.on(event, handler);
      });
      
      // Start ping interval
      this.startPingInterval();
      
      console.log('🌐 Event handlers attached successfully');
    } catch (error) {
      console.error('❌ Error attaching event handlers:', error);
      console.log('🌐 this.eventHandlers:', this.eventHandlers);
      console.log('🌐 this.eventHandlers size:', this.eventHandlers?.size);
      console.log('🌐 this.eventHandlers forEach:', this.eventHandlers?.forEach);
      
      // Fallback: manually attach event handlers
      console.log('🌐 Using fallback event handler attachment...');
      this.attachEventHandlersFallback();
    }
  }
  
  // Fallback method to manually attach event handlers
  attachEventHandlersFallback() {
    console.log('🌐 Attaching event handlers manually...');
    
    try {
      // Manually attach each event handler
      this.socket.on('connect', this.handleConnect.bind(this));
      this.socket.on('disconnect', this.handleDisconnect.bind(this));
      this.socket.on('connect_error', this.handleConnectError.bind(this));
      this.socket.on('gameState', this.handleGameState.bind(this));
      this.socket.on('gameMap', this.handleGameMap.bind(this));
      this.socket.on('playerJoined', this.handlePlayerJoined.bind(this));
      this.socket.on('playerLeft', this.handlePlayerLeft.bind(this));
      this.socket.on('playerUpdated', this.handlePlayerUpdated.bind(this));
      this.socket.on('projectileCreated', this.handleProjectileCreated.bind(this));
      this.socket.on('projectileDestroyed', this.handleProjectileDestroyed.bind(this));
      this.socket.on('playerDamaged', this.handlePlayerDamaged.bind(this));
      this.socket.on('playerKilled', this.handlePlayerKilled.bind(this));
      this.socket.on('playerRespawned', this.handlePlayerRespawned.bind(this));
      this.socket.on('projectileHit', this.handleProjectileHit.bind(this));
      
      // Start ping interval
      this.startPingInterval();
      
      console.log('🌐 Fallback event handlers attached successfully');
    } catch (fallbackError) {
      console.error('❌ Fallback event handler attachment also failed:', fallbackError);
    }
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
    
    // Send initial player position to server
    this.sendInitialPosition();
    
    // Update UI
    this.updateConnectionStatus(true);
    
    // Start sending player updates
    this.startPlayerUpdates();
  }
  
  // Send initial position to server
  sendInitialPosition() {
    if (!this.game || !this.game.playerShip) {
      console.log('🌐 Local player not ready yet, will send position later');
      return;
    }
    
    const initialData = {
      position: this.game.playerShip.position,
      rotation: { y: this.game.playerShip.rotation.y },
      health: this.game.health || 100,
      energy: this.game.energy || 100,
      currentWeapon: this.game.currentWeapon || 'LASER'
    };
    
    console.log('🌐 Sending initial position to server:', initialData);
    this.socket.emit('playerUpdate', initialData);
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
    
    // Process players - store them as pending instead of creating immediately
    if (data.players) {
      console.log('🌐 Storing', data.players.length, 'players from game state as pending');
      if (!this.pendingPlayers) {
        this.pendingPlayers = new Map();
      }
      
      data.players.forEach(playerData => {
        // Store ALL players (including local player) as pending
        this.pendingPlayers.set(playerData.id, playerData);
        console.log('🌐 Stored player as pending:', playerData.id, 'at position:', playerData.position);
      });
      
      console.log('🌐 Total pending players after game state:', this.pendingPlayers.size);
      
      // If game has already started, create players immediately
      if (this.gameStarted) {
        console.log('🌐 Game already started, creating players from game state');
        this.createPendingPlayers();
      }
    }
    
    // Process projectiles
    if (data.projectiles) {
      Object.values(data.projectiles).forEach(projectileData => {
        this.createProjectile(projectileData);
      });
    }
    
    // Process map data if included
    if (data.map) {
      console.log('🌐 Received map data in game state');
      this.handleGameMap(data.map);
    }
  }
  
  // Handle map data from server
  handleGameMap(mapData) {
    console.log('🌐 Received game map:', mapData);
    console.log('🌐 Map contains', mapData.obstacles.length, 'obstacles');
    
    if (!this.game || !this.game.scene) {
      console.log('🌐 Game not ready yet, storing map data for later');
      this.pendingMap = mapData;
      return;
    }
    
    // Check if scene is fully initialized
    if (this.game.scene.children.length < 5) {
      console.log('🌐 Scene not fully initialized yet, waiting...');
      setTimeout(() => {
        console.log('🌐 Retrying obstacle creation after delay...');
        this.createObstaclesFromMap(mapData);
      }, 1000);
      return;
    }
    
    // Create obstacles from map data
    this.createObstaclesFromMap(mapData);
  }
  
  handlePlayerJoined(playerData) {
    console.log('🌐 Player joined:', playerData.id);
    
    // Store ALL players (including local player) as pending until game starts
    if (!this.pendingPlayers) {
      this.pendingPlayers = new Map();
    }
    
    this.pendingPlayers.set(playerData.id, playerData);
    console.log('🌐 Stored player as pending:', playerData.id, 'at position:', playerData.position);
    console.log('🌐 Total pending players:', this.pendingPlayers.size);
    
    // Only create other players immediately if game has started
    if (this.gameStarted && playerData.id !== this.playerId) {
      console.log('🌐 Game already started, creating other player immediately');
      this.createOtherPlayer(playerData);
    }
  }
  
  // Method to create all pending players when game starts
  createPendingPlayers() {
    console.log('🚀 Game starting - creating pending players and positioning local player');
    
    // Mark game as started
    this.gameStarted = true;
    
    // Add a small delay to ensure game is fully initialized
    setTimeout(() => {
      console.log('🚀 Delayed player creation - checking game state...');
      
      // Check if game and scene are properly initialized
      if (!this.game) {
        console.error('❌ Game object not available in NetworkManager');
        return;
      }
      
      if (!this.game.scene) {
        console.error('❌ Game scene not available in NetworkManager');
        return;
      }
      
      if (!this.game.playerShip) {
        console.error('❌ Local player ship not available in NetworkManager');
        return;
      }
      
      console.log('🚀 Game state verified - proceeding with player creation');
      
      // First, sync the local world with server state
      this.syncWorldWithServer();
      
      // Handle pending map data if available
      if (this.pendingMap) {
        console.log('🌐 Creating obstacles from pending map data...');
        this.createObstaclesFromMap(this.pendingMap);
        this.pendingMap = null;
      }
      
      // First, clear any existing players to ensure clean state
      this.otherPlayers.forEach((player, id) => {
        console.log('🌐 Removing existing player:', id);
        if (player.mesh) {
          this.game.scene.remove(player.mesh);
        }
      });
      this.otherPlayers.clear();
      
      // Now create all pending players
      if (this.pendingPlayers && this.pendingPlayers.size > 0) {
        console.log('🌐 Creating', this.pendingPlayers.size, 'pending players');
        this.pendingPlayers.forEach((playerData, id) => {
          this.createOtherPlayer(playerData);
        });
        this.pendingPlayers.clear();
      } else {
        console.log('🌐 No pending players to create');
      }
      
      // Position and show the local player
      this.positionLocalPlayer();
    }, 100); // 100ms delay to ensure game is ready
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
      
      // Flash red when hit by enemy (only for enemy damage, not obstacles)
      if (this.game && typeof this.game.flashCollisionWarning === 'function') {
        this.game.flashCollisionWarning();
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
    console.log('🌐 Creating other player:', playerData.id);
    
    // Safety check: don't create the local player as an "other player"
    if (playerData.id === this.playerId) {
      console.log('🚀 Skipping local player creation in createOtherPlayer - will be handled separately');
      return;
    }
    
    // Check if player already exists
    if (this.otherPlayers.has(playerData.id)) {
      console.log('🌐 Player already exists, updating:', playerData.id);
      this.removeOtherPlayer(playerData.id);
    }
    
    // Check if game and scene are properly initialized
    if (!this.game) {
      console.error('❌ Game object not available in NetworkManager');
      return;
    }
    
    if (!this.game.scene) {
      console.error('❌ Game scene not available in NetworkManager');
      return;
    }
    
    console.log('🌐 Player data:', playerData);
    console.log('🌐 Game scene:', this.game.scene);
    console.log('🌐 Local player position:', this.game.playerShip ? this.game.playerShip.position : 'No local player');
    console.log('🌐 World coordinates - Local player:', this.game.playerShip ? 
      `x=${this.game.playerShip.position.x.toFixed(2)}, z=${this.game.playerShip.position.z.toFixed(2)}` : 'No local player');
    console.log('🌐 World coordinates - Network player:', 
      `x=${playerData.position.x.toFixed(2)}, z=${playerData.position.z.toFixed(2)}`);
    
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
    
    console.log('🌐 Created mesh at position:', mesh.position);
    console.log('🌐 Adding mesh to scene...');
    
    // Add to scene
    this.game.scene.add(mesh);
    
    console.log('🌐 Mesh added to scene. Scene children count:', this.game.scene.children.length);
    console.log('🌐 Mesh visible:', mesh.visible);
    console.log('🌐 Mesh position after adding:', mesh.position);
    
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
    
    console.log('🌐 Other players count:', this.otherPlayers.size);
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
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Send player updates every 50ms (20 FPS)
    this.updateInterval = setInterval(() => {
      if (this.isConnected && this.game && this.game.playerShip) {
        // Update health regeneration
        this.updateHealthRegeneration();
        
        // Send player update to server
        this.sendPlayerUpdate();
      }
    }, 50);
    
    // Sync world with server every 5 seconds
    this.worldSyncInterval = setInterval(() => {
      if (this.isConnected && this.game && this.game.playerShip) {
        this.syncWorldWithServer();
      }
    }, 5000);
  }
  
  sendPlayerUpdate() {
    if (!this.isConnected || !this.game || !this.game.playerShip) return;
    
    const updateData = {
      position: this.game.playerShip.position,
      rotation: { y: this.game.playerShip.rotation.y },
      health: this.game.health,
      energy: this.game.energy,
      currentWeapon: this.game.currentWeapon
    };
    
    this.socket.emit('playerUpdate', updateData);
  }
  
  updateHealthRegeneration() {
    if (!this.game || typeof this.game.health !== 'number') return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - (this.lastHealthUpdate || now);
    this.lastHealthUpdate = now;
    
    // Convert to seconds
    const deltaTime = timeSinceLastUpdate / 1000;
    
    // Health regeneration rate: 2 HP per second (2% of max health) - Balanced for combat
    const regenerationRate = 2;
    const regenerationAmount = regenerationRate * deltaTime;
    
    // Apply regeneration
    const oldHealth = this.game.health;
    this.game.health = Math.min(this.game.maxHealth || 100, this.game.health + regenerationAmount);
    
    // Update UI if health changed significantly
    if (Math.abs(this.game.health - oldHealth) > 0.1) {
      if (this.game.ui && typeof this.game.ui.updateHealth === 'function') {
        this.game.ui.updateHealth(this.game.health, this.game.maxHealth || 100);
      }
      
      // Log health regeneration for debugging
      console.log(`🌐 Network health regenerated: ${oldHealth.toFixed(1)} -> ${this.game.health.toFixed(1)} (Δ${deltaTime.toFixed(3)}s)`);
    }
  }
  
  stopPlayerUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.worldSyncInterval) {
      clearInterval(this.worldSyncInterval);
      this.worldSyncInterval = null;
    }
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

  // Method to sync local world with server state
  syncWorldWithServer() {
    console.log('🌐 Syncing local world with server state...');
    
    if (!this.game || !this.game.playerShip) {
      console.log('🌐 Cannot sync world - game or playerShip not available');
      return;
    }
    
    console.log('🌐 Local player position before sync:', this.game.playerShip.position);
    console.log('🌐 Local player visible before sync:', this.game.playerShip.visible);
    
    // Log all pending players to sync
    if (this.pendingPlayers && this.pendingPlayers.size > 0) {
      console.log('🌐 All pending players to sync:');
      this.pendingPlayers.forEach((playerData, id) => {
        const isLocal = id === this.playerId;
        console.log(`  ${isLocal ? '🚀 LOCAL' : '🌐 OTHER'}: ${id} at ${playerData.position.x.toFixed(2)}, ${playerData.position.z.toFixed(2)}`);
      });
    } else {
      console.log('🌐 No pending players to sync');
    }
  }

  // Create obstacles from server map data
  createObstaclesFromMap(mapData) {
    console.log('🌐 Creating obstacles from server map data...');
    console.log('🌐 Map data received:', mapData);
    
    if (!this.game) {
      console.error('❌ Cannot create obstacles - game object not available');
      return;
    }
    
    if (!this.game.scene) {
      console.error('❌ Cannot create obstacles - game scene not available');
      return;
    }
    
    console.log('🌐 Game scene available:', this.game.scene);
    console.log('🌐 Scene children count before:', this.game.scene.children.length);
    
    // Clear any existing obstacles
    if (this.game.obstacles) {
      console.log('🌐 Clearing existing obstacles:', this.game.obstacles.length);
      this.game.obstacles.forEach(obstacle => {
        if (obstacle.mesh) {
          this.game.scene.remove(obstacle.mesh);
        }
      });
    }
    
    // Initialize obstacles array
    this.game.obstacles = [];
    
    // Create obstacles from map data
    mapData.obstacles.forEach((obstacleData, index) => {
      console.log(`🌐 Creating obstacle ${index + 1}:`, obstacleData);
      
      let geometry;
      let material;
      
      switch (obstacleData.type) {
        case 'box':
          geometry = new THREE.BoxGeometry(
            obstacleData.size.x, 
            obstacleData.size.y, 
            obstacleData.size.z
          );
          break;
        case 'cylinder':
          geometry = new THREE.CylinderGeometry(
            obstacleData.radius, 
            obstacleData.radius, 
            obstacleData.height, 
            16
          );
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(obstacleData.radius, 16, 16);
          break;
        default:
          console.warn('🌐 Unknown obstacle type:', obstacleData.type);
          return;
      }
      
      // Create material with the specified color
      material = new THREE.MeshPhongMaterial({
        color: obstacleData.color,
        emissive: new THREE.Color(obstacleData.color).multiplyScalar(0.5),
        shininess: 100
      });
      
      // Create mesh
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.set(
        obstacleData.position.x,
        obstacleData.position.y,
        obstacleData.position.z
      );
      
      console.log(`🌐 Obstacle ${index + 1} mesh created at:`, obstacle.position);
      
      // Add point light for glow effect
      const light = new THREE.PointLight(obstacleData.color, 0.5, 5);
      light.position.set(0, 0, 0);
      obstacle.add(light);
      
      // Add to scene
      this.game.scene.add(obstacle);
      console.log(`🌐 Obstacle ${index + 1} added to scene`);
      
      // Store obstacle data
      this.game.obstacles.push({
        mesh: obstacle,
        data: obstacleData
      });
      
      console.log(`🌐 Obstacle ${index + 1} stored in obstacles array`);
    });
    
    console.log(`🌐 Created ${this.game.obstacles.length} obstacles from map data`);
    console.log('🌐 Scene children count after:', this.game.scene.children.length);
    console.log('🌐 Final obstacles array:', this.game.obstacles);
  }

  // Position and show the local player when game starts
  positionLocalPlayer() {
    console.log('🚀 Positioning local player from server data...');
    
    if (!this.game || !this.game.playerShip) {
      console.error('❌ Cannot position local player - game or playerShip not available');
      return;
    }
    
    // Get the local player's data from the server state
    const localPlayerData = this.pendingPlayers ? 
      Array.from(this.pendingPlayers.values()).find(p => p.id === this.playerId) : null;
    
    if (localPlayerData) {
      console.log('🚀 Found local player data from server:', localPlayerData.position);
      
      // Position the local player from server data
      this.game.playerShip.position.set(
        localPlayerData.position.x,
        localPlayerData.position.y,
        localPlayerData.position.z
      );
      
      if (localPlayerData.rotation) {
        this.game.playerShip.rotation.y = localPlayerData.rotation.y;
      }
      
      // Make the local player visible
      this.game.playerShip.visible = true;
      
      console.log('🚀 Local player positioned at:', this.game.playerShip.position);
      console.log('🚀 Local player now visible:', this.game.playerShip.visible);
      
      // Update game state
      if (this.game.health !== undefined) {
        this.game.health = localPlayerData.health || 100;
      }
      if (this.game.energy !== undefined) {
        this.game.energy = localPlayerData.energy || 100;
      }
      if (localPlayerData.currentWeapon) {
        this.game.currentWeapon = localPlayerData.currentWeapon;
      }
      
      console.log('🚀 Local player game state updated - health:', this.game.health, 'energy:', this.game.energy);
    } else {
      console.log('🚀 No server data for local player, using default position');
      
      // If no server data, use a safe default position
      this.game.playerShip.position.set(0, 0.5, 0);
      this.game.playerShip.visible = true;
      
      console.log('🚀 Local player positioned at default location:', this.game.playerShip.position);
    }
  }
}