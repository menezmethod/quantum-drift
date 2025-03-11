import { EventEmitter } from 'events';
import { io } from 'socket.io-client';

export class NetworkManager extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.playerId = null;
    this.connected = false;
    this.players = new Map();
    this.enemies = new Map(); // Track enemy data
    this.lastUpdateTime = 0;
    this.updateInterval = 50; // 20 updates per second
  }

  connect(serverUrl = 'http://localhost:3000') {
    // Don't reconnect if already connected
    if (this.connected) return;

    // Create socket connection
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    // Set up event handlers
    this.socket.on('connect', () => {
      console.log('Connected to game server');
      this.connected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.connected = false;
      this.emit('disconnected');
    });

    this.socket.on('player_id', (id) => {
      this.playerId = id;
      console.log(`Assigned player ID: ${id}`);
      this.emit('player_id', id);
    });

    this.socket.on('player_joined', (player) => {
      if (player.id !== this.playerId) {
        this.players.set(player.id, player);
        console.log(`Player joined: ${player.id}`);
        this.emit('player_joined', player);
      }
    });

    this.socket.on('player_left', (id) => {
      this.players.delete(id);
      console.log(`Player left: ${id}`);
      this.emit('player_left', id);
    });

    this.socket.on('player_update', (update) => {
      if (update.id !== this.playerId) {
        const player = this.players.get(update.id);
        if (player) {
          // Update the player with new data
          Object.assign(player, update);
          player.lastUpdate = Date.now();
          this.emit('player_update', update);
        }
      }
    });

    this.socket.on('laser_shot', (data) => {
      if (data.playerId !== this.playerId) {
        this.emit('laser_shot', data);
      }
    });
    
    // Handle incoming damage events
    this.socket.on('player_damaged', (data) => {
      console.log(`Received damage: ${data.amount} from player ${data.sourceId}`);
      this.emit('player_damaged', data);
    });
    
    // Handle player hit visual effects
    this.socket.on('player_hit', (data) => {
      console.log(`Player hit event for: ${data.playerId}`);
      this.emit('player_hit', data);
    });

    // Handle enemy updates
    this.socket.on('enemy_update', (data) => {
      // If from another player, process the enemy update
      if (data.senderId !== this.playerId) {
        // Store enemy data
        const enemy = this.enemies.get(data.id);
        if (enemy) {
          // Update existing enemy
          Object.assign(enemy, data);
        } else {
          // Add new enemy
          this.enemies.set(data.id, data);
        }
        
        // Emit event for game to handle
        this.emit('enemy_update', data);
      }
    });

    // Handle initial player list
    this.socket.on('players', (players) => {
      players.forEach(player => {
        if (player.id !== this.playerId) {
          this.players.set(player.id, player);
        }
      });
      this.emit('players', players);
    });

    // Handle error
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.playerId = null;
      this.connected = false;
      this.players.clear();
      this.enemies.clear();
    }
  }

  sendPlayerUpdate(data) {
    if (!this.connected || !this.socket) return;

    const now = Date.now();
    // Throttle updates to save bandwidth
    if (now - this.lastUpdateTime < this.updateInterval) return;
    
    this.lastUpdateTime = now;
    
    this.socket.emit('player_update', {
      id: this.playerId,
      ...data
    });
  }

  sendLaserShot(data) {
    if (!this.connected || !this.socket) return;
    
    this.socket.emit('laser_shot', {
      playerId: this.playerId,
      ...data
    });
  }

  /**
   * Send enemy update to all clients
   * @param {object} enemy - Enemy data to sync
   */
  sendEnemyUpdate(enemy) {
    if (!this.connected || !this.socket) return;
    
    // Only send essential data to reduce bandwidth
    this.socket.emit('enemy_update', {
      id: enemy.id,
      position: enemy.mesh.position.clone(),
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      type: enemy.options.type,
      senderId: this.playerId
    });
  }

  updatePlayerInfo(name, shipType) {
    if (!this.connected || !this.socket) return;
    
    this.socket.emit('player_info', {
      id: this.playerId,
      name: name,
      shipType: shipType
    });
  }

  // Get all other players (not including self)
  getOtherPlayers() {
    return Array.from(this.players.values());
  }

  // Get all tracked enemies 
  getEnemies() {
    return Array.from(this.enemies.values());
  }

  isConnected() {
    return this.connected;
  }

  getPlayerId() {
    return this.playerId;
  }

  /**
   * Send damage event to a specific player
   * @param {string} targetId - ID of the player to damage
   * @param {number} amount - Amount of damage to apply
   */
  sendDamageEvent(targetId, amount) {
    if (!this.connected || !this.socket) return;
    
    this.socket.emit('player_damage', {
      sourceId: this.playerId,
      targetId: targetId,
      amount: amount
    });
  }
} 