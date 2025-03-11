import * as THREE from 'three';
import { Player } from '../entities/player/Player';
import { WeaponSystem } from '../entities/weapons/WeaponSystem';
import { EnemyManager } from '../entities/enemies/EnemyManager';
import { GameRoom } from '../ui/GameRoom';
import { SoundManager } from '../assets/SoundManager';
import { RegularLaser } from '../entities/weapons/RegularLaser';
import { GameUI } from '../ui/GameUI';
import { NetworkManager } from './NetworkManager';

export class GameEngine {
  constructor() {
    // Initialize properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.score = 0;
    this.isRunning = false;
    this.lastTime = 0;
    this.collisionThreshold = 0.5; // Collision distance threshold
    
    // Game mode and settings
    this.gameMode = 'ffa'; // Default game mode: free-for-all
    this.roomTheme = 'space-station'; // Default room theme
    this.roomSize = { width: 60, height: 60 }; // Default room size
    
    // Initialize UI
    this.ui = new GameUI();
    
    // Multiplayer properties
    this.players = {};  // Will store other players
    this.playerId = null;  // Will be set when joining a game
    this.multiplayerEnabled = false;
    this.teams = {
      red: { score: 0, players: [] },
      blue: { score: 0, players: [] }
    };
    
    // Add NetworkManager instance
    this.networkManager = new NetworkManager();
    
    // Initialize Three.js components
    this.initThree();
    
    // Initialize weapon system
    this.weaponSystem = new WeaponSystem(this.scene);
    
    // Initialize enemy manager (will be used for AI opponents)
    this.enemyManager = new EnemyManager(this.scene, this.roomSize.width / 2);
    
    // Initialize game elements
    this.initGame();
  }
  
  initThree() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    
    // Create isometric-style camera
    this.camera = new THREE.PerspectiveCamera(
      45, // Lower FOV for more isometric-like view
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    
    // Set camera to isometric position
    this.camera.position.set(40, 40, 40); // Position it at a distance
    this.camera.lookAt(0, 0, 0); // Look at the center of the room
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Add renderer to DOM
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }
  
  initGame() {
    // Create clock for timing
    this.clock = new THREE.Clock();
    
    // Initialize scene if not set
    if (!this.scene) {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000011); // Dark blue background
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x444444);
      this.scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1).normalize();
      this.scene.add(directionalLight);
    }
    
    // Initialize camera if not set
    if (!this.camera) {
      this.camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
      );
      this.camera.position.set(0, 10, -10);
      this.camera.lookAt(0, 0, 0);
    }
    
    // Initialize renderer if not set
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      document.body.appendChild(this.renderer.domElement);
    }
    
    // Initialize sound manager
    this.soundManager = new SoundManager();
    
    // Initialize player
    this.player = new Player(this.scene, this.camera, this.soundManager);
    
    // Initialize weapon system
    this.weaponSystem = new WeaponSystem(this.scene, this.soundManager);
    
    // Equip player with weapons
    this.player.equipWeapon('primary', new RegularLaser(this.weaponSystem));
    
    // Initialize enemy manager
    this.enemyManager = new EnemyManager(this.scene, this.weaponSystem, this.soundManager);
    
    // Initialize the first room
    this.initializeFirstRoom();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show UI
    this.showGameUI();
    
    // Game is now initialized
    this.isInitialized = true;
    this.isPaused = false;
  }
  
  initGameModeUI() {
    // Clear any existing game mode UI
    const existingUI = document.querySelector('.team-indicator');
    if (existingUI) {
      existingUI.remove();
    }
    
    // Only add UI for team-based modes in multiplayer
    if (!this.multiplayerEnabled) return;
    
    switch (this.gameMode) {
      case 'tdm': // Team Deathmatch
      case 'ctf': // Capture The Flag
        // Create team scores indicator
        const teamIndicator = document.createElement('div');
        teamIndicator.className = 'team-indicator';
        
        const redTeam = document.createElement('div');
        redTeam.className = 'team-score team-red';
        redTeam.innerHTML = 'RED: <span id="red-score">0</span>';
        
        const blueTeam = document.createElement('div');
        blueTeam.className = 'team-score team-blue';
        blueTeam.innerHTML = 'BLUE: <span id="blue-score">0</span>';
        
        teamIndicator.appendChild(redTeam);
        teamIndicator.appendChild(blueTeam);
        
        document.getElementById('game-container').appendChild(teamIndicator);
        
        // Add flag status indicator for CTF mode
        if (this.gameMode === 'ctf') {
          const flagStatus = document.createElement('div');
          flagStatus.className = 'flag-status';
          
          const blueFlag = document.createElement('div');
          blueFlag.className = 'flag-blue';
          blueFlag.innerHTML = '<div class="flag-icon"></div> <span id="blue-flag-status">SECURE</span>';
          
          const redFlag = document.createElement('div');
          redFlag.className = 'flag-red';
          redFlag.innerHTML = '<div class="flag-icon"></div> <span id="red-flag-status">SECURE</span>';
          
          flagStatus.appendChild(blueFlag);
          flagStatus.appendChild(redFlag);
          
          document.getElementById('game-container').appendChild(flagStatus);
        }
        break;
        
      case 'koth': // King of the Hill
        // Create control point status
        const controlIndicator = document.createElement('div');
        controlIndicator.className = 'team-indicator';
        
        const controlPoint = document.createElement('div');
        controlPoint.className = 'team-score';
        controlPoint.innerHTML = 'CONTROL: <span id="control-status">NEUTRAL</span>';
        
        controlIndicator.appendChild(controlPoint);
        document.getElementById('game-container').appendChild(controlIndicator);
        break;
    }
  }
  
  setGameMode(mode) {
    this.gameMode = mode;
    console.log(`Game mode set to: ${mode}`);
    
    // Update UI for the new game mode
    this.initGameModeUI();
  }
  
  setRoomTheme(theme) {
    this.roomTheme = theme;
    console.log(`Room theme set to: ${theme}`);
    
    // If a room exists, regenerate it with the new theme
    if (this.gameRoom) {
      this.gameRoom.cleanup();
      this.gameRoom = new GameRoom(this.scene, this.roomSize, this.roomTheme);
      this.obstacles = this.gameRoom.getObstacles();
    }
  }
  
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    
    // Start incrementing score over time (for single player only)
    if (!this.multiplayerEnabled) {
      this.scoreInterval = setInterval(() => {
        this.updateScore(1);
      }, 1000);
      
      // Start the enemy spawner
      this.spawnEnemyTimer = setInterval(() => {
        this.enemyManager.increaseDifficulty(0.05);
        this.enemyManager.increaseMaxEnemies(1);
      }, 30000); // Increase difficulty every 30 seconds
    }
    
    this.gameLoop(this.lastTime);
  }
  
  restart() {
    // Clear timers
    if (this.scoreInterval) {
      clearInterval(this.scoreInterval);
    }
    
    if (this.spawnEnemyTimer) {
      clearInterval(this.spawnEnemyTimer);
    }
    
    // Reset game state
    this.score = 0;
    this.updateScore();
    
    // Clear all projectiles
    this.weaponSystem.clearAllProjectiles();
    
    // Clear enemies
    this.enemyManager.clear();
    
    // Reset player
    this.player.reset();
    
    // Regenerate room
    this.gameRoom.cleanup();
    this.gameRoom = new GameRoom(this.scene, this.roomSize, this.roomTheme);
    this.obstacles = this.gameRoom.getObstacles();
    
    // Position player at spawn point
    const spawnPoint = this.gameRoom.getRandomSpawnPoint();
    this.player.mesh.position.copy(spawnPoint);
    
    // Multiplayer reset
    if (this.multiplayerEnabled) {
      // Reset team scores
      this.teams.red.score = 0;
      this.teams.blue.score = 0;
      this.updateTeamScores();
      
      // Reset multiplayer state (will be implemented with actual networking)
      console.log("Resetting multiplayer state");
    }
    
    // Start score increment timer (for single player)
    if (!this.multiplayerEnabled) {
      this.scoreInterval = setInterval(() => {
        this.updateScore(1);
      }, 1000);
      
      // Start the enemy spawner
      this.spawnEnemyTimer = setInterval(() => {
        this.enemyManager.increaseDifficulty(0.05);
        this.enemyManager.increaseMaxEnemies(1);
      }, 30000); // Increase difficulty every 30 seconds
    }
    
    // Start the game
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }
  
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update game state
    this.update();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    // Continue the game loop
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  update() {
    // Get delta time from the clock
    const deltaTime = this.clock.getDelta();
    
    // Skip update if game is paused
    if (this.isPaused) return;
    
    // Get obstacles from current room
    const obstacles = this.currentRoom?.getObstacles() || [];
    
    // Update player
    if (this.player) {
      this.player.update(deltaTime);
      
      // Check player collisions with obstacles
      if (this.currentRoom) {
        const collided = this.player.checkObstacleCollisions(obstacles);
        if (collided) {
          // Handle collision response here
          console.log('Player collided with obstacle');
        }
      }
    }
    
    // Update enemies
    if (this.enemyManager) {
      this.enemyManager.update(deltaTime, obstacles, this.player);
    }
    
    // Update weapons
    if (this.weaponSystem) {
      // Get targets (player and enemies)
      const targets = [this.player, ...this.enemyManager.getEnemies()].filter(target => target && target.isAlive);
      
      // Check weapon collisions
      const hits = this.weaponSystem.checkCollisions(targets, obstacles);
      
      // Handle hits
      for (const hit of hits) {
        if (hit.target !== 'wall' && typeof hit.target.takeDamage === 'function') {
          hit.target.takeDamage(hit.projectile.damage);
        }
        
        // Create explosion effect
        this.createExplosion(hit.position, hit.projectile.explosionSize || 0.5);
      }
      
      // Update weapon system
      this.weaponSystem.update(deltaTime);
    }
    
    // Update current room
    if (this.currentRoom) {
      this.currentRoom.update(deltaTime);
    }
    
    // Check if player has completed the current room
    if (this.currentRoom && this.player) {
      const isRoomCompleted = this.currentRoom.checkCompletion(this.player);
      if (isRoomCompleted && !this.isTransitioning) {
        this.transitionToNextRoom();
      }
    }
    
    // Update UI
    this.updateUI();
    
    // Send player updates if multiplayer is enabled
    if (this.multiplayerEnabled && this.networkManager.isConnected()) {
      this.sendPlayerUpdate();
    }
  }
  
  updateCamera() {
    // For isometric view, we maintain the camera's relative position 
    // but move it to follow the player
    const cameraOffset = new THREE.Vector3(40, 40, 40);
    
    // We want to keep the isometric angle but position relative to player
    this.camera.position.set(
      this.player.mesh.position.x + cameraOffset.x,
      cameraOffset.y, // Keep the same height
      this.player.mesh.position.z + cameraOffset.z
    );
    
    // Look at the player
    this.camera.lookAt(
      this.player.mesh.position.x,
      0, // Look at ground level
      this.player.mesh.position.z
    );
  }
  
  updateOtherPlayers(deltaTime) {
    // This will be replaced with actual networking code
    // For now, just a placeholder for the multiplayer functionality
    for (const playerId in this.players) {
      const player = this.players[playerId];
      // In real implementation, we'd interpolate positions from the server
    }
  }
  
  checkPlayerCollisions() {
    // Check for collisions with other players
    // This will be implemented with actual networking
  }
  
  updateGameMode(deltaTime) {
    // Handle game mode specific logic
    switch (this.gameMode) {
      case 'tdm': // Team Deathmatch
        // Just update scores when players are hit, already handled in processHitResults
        break;
        
      case 'ctf': // Capture The Flag
        // Check for flag captures, etc.
        this.updateCTFLogic(deltaTime);
        break;
        
      case 'koth': // King of the Hill
        // Check for hill control
        this.updateKOTHLogic(deltaTime);
        break;
        
      case 'ffa': // Free For All
      default:
        // Individual scores, handled in processHitResults
        break;
    }
  }
  
  updateCTFLogic(deltaTime) {
    // This will be implemented with actual flag capture logic
    // For now, just a placeholder
  }
  
  updateKOTHLogic(deltaTime) {
    // This will be implemented with actual hill control logic
    // For now, just a placeholder
  }
  
  processHitResults(hitResults) {
    // Process hits from weapon system
    for (const hit of hitResults) {
      // If hit a wall or obstacle, create a visual effect
      if (hit.target === 'wall' || hit.target === 'obstacle') {
        this.createHitEffect(hit.position);
      } 
      // If hit a target (enemy or player), damage it
      else if (hit.target && hit.target.takeDamage) {
        const damage = hit.projectile.options.damage || 10;
        const destroyed = hit.target.takeDamage(damage);
        
        if (destroyed) {
          if (this.multiplayerEnabled) {
            // Handle multiplayer scoring based on game mode
            switch (this.gameMode) {
              case 'tdm': // Team Deathmatch
                // Add score to the team that got the kill
                const targetTeam = hit.target.team;
                const attackerTeam = this.player.team;
                
                if (targetTeam !== attackerTeam) {
                  this.teams[attackerTeam].score += 1;
                  this.updateTeamScores();
                }
                break;
                
              default: // FFA and other modes
                this.updateScore(25); // Points for destroying a target
                break;
            }
          } else {
            // Single player scoring
            this.updateScore(25); // Points for destroying an enemy
          }
        }
      }
    }
  }
  
  createHitEffect(position) {
    // Create a simple flash effect at the hit position
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const flash = new THREE.Mesh(geometry, material);
    flash.position.copy(position);
    this.scene.add(flash);
    
    // Animate and remove after short duration
    const startTime = Date.now();
    const duration = 300;
    
    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const scale = 1 + elapsed / duration;
        flash.scale.set(scale, scale, scale);
        material.opacity = 0.8 * (1 - elapsed / duration);
        requestAnimationFrame(animateFlash);
      } else {
        this.scene.remove(flash);
        geometry.dispose();
        material.dispose();
      }
    };
    
    animateFlash();
  }
  
  checkObstacleCollisions(position, radius) {
    // Simple collision check with obstacles
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'wall') {
        // Box collision with walls
        const halfSize = new THREE.Vector3().copy(obstacle.size).multiplyScalar(0.5);
        
        // Check if position is within the bounding box of the wall
        if (
          position.x > obstacle.position.x - halfSize.x - radius &&
          position.x < obstacle.position.x + halfSize.x + radius &&
          position.z > obstacle.position.z - halfSize.z - radius &&
          position.z < obstacle.position.z + halfSize.z + radius
        ) {
          return true;
        }
      } else if (obstacle.radius) {
        // Cylinder collision
        const dx = position.x - obstacle.position.x;
        const dz = position.z - obstacle.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < obstacle.radius + radius) {
          return true;
        }
      } else if (obstacle.size) {
        // Box collision with rotation if needed
        const halfSize = new THREE.Vector3().copy(obstacle.size).multiplyScalar(0.5);
        
        // For simplicity, just do a bounding sphere check for now
        const dx = position.x - obstacle.position.x;
        const dz = position.z - obstacle.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Use the larger dimension as the bounding radius
        const boundingRadius = Math.max(halfSize.x, halfSize.z);
        
        if (distance < boundingRadius + radius) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  updateScore(points = 0) {
    this.score += points;
    document.getElementById('score-value').textContent = this.score;
  }
  
  updateTeamScores() {
    // Update team scores in the UI
    if (this.multiplayerEnabled && (this.gameMode === 'tdm' || this.gameMode === 'ctf')) {
      document.getElementById('red-score').textContent = this.teams.red.score;
      document.getElementById('blue-score').textContent = this.teams.blue.score;
    }
  }
  
  gameOver() {
    this.isRunning = false;
    
    // Clear score interval
    if (this.scoreInterval) {
      clearInterval(this.scoreInterval);
      this.scoreInterval = null;
    }
    
    // Clear enemy spawner
    if (this.spawnEnemyTimer) {
      clearInterval(this.spawnEnemyTimer);
      this.spawnEnemyTimer = null;
    }
    
    // Hide game UI and show game over screen
    if (this.ui) {
      this.ui.hide();
    }
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('game-over').classList.remove('hidden');
  }
  
  handleResize() {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Multiplayer methods
  enableMultiplayer() {
    this.multiplayerEnabled = true;
    console.log("Multiplayer mode enabled");
    
    // Show multiplayer info in UI
    document.getElementById('multiplayer-info').classList.remove('hidden');
    
    // Set up NetworkManager event listeners
    this.setupNetworkListeners();
    
    // Connect to server
    this.connectToServer();
  }
  
  disableMultiplayer() {
    this.multiplayerEnabled = false;
    console.log("Multiplayer mode disabled");
    
    // Hide multiplayer info in UI
    document.getElementById('multiplayer-info').classList.add('hidden');
    
    // Disconnect from server
    this.disconnectFromServer();
  }
  
  setupNetworkListeners() {
    // Clear existing listeners
    this.networkManager.removeAllListeners();
    
    // Handle player joined
    this.networkManager.on('player_joined', (playerData) => {
      console.log('Player joined:', playerData);
      
      // Create other player visual representation
      const newPlayer = this.createOtherPlayer(playerData);
      this.players[playerData.id] = newPlayer;
      
      // Update player count in UI
      document.getElementById('players-count').textContent = Object.keys(this.players).length + 1; // +1 for local player
    });
    
    // Handle player left
    this.networkManager.on('player_left', (id) => {
      console.log('Player left:', id);
      
      // Remove player from scene
      if (this.players[id]) {
        this.scene.remove(this.players[id].mesh);
        delete this.players[id];
        
        // Update player count in UI
        document.getElementById('players-count').textContent = Object.keys(this.players).length + 1; // +1 for local player
      }
    });
    
    // Handle player update
    this.networkManager.on('player_update', (data) => {
      if (this.players[data.id]) {
        this.updateOtherPlayer(this.players[data.id], data);
      }
    });
    
    // Handle laser shot from other players
    this.networkManager.on('laser_shot', (data) => {
      // Create laser from other player
      if (data.origin && data.direction) {
        this.createLaserFromPlayer(data.origin, data.direction, data.playerId);
      }
    });
    
    // Handle connection status
    this.networkManager.on('connected', () => {
      console.log('Connected to server');
      document.getElementById('connection-status').textContent = 'Connected';
      document.getElementById('connection-status').classList.add('connected');
    });
    
    this.networkManager.on('disconnected', () => {
      console.log('Disconnected from server');
      document.getElementById('connection-status').textContent = 'Disconnected';
      document.getElementById('connection-status').classList.remove('connected');
    });
    
    // Handle player ID assignment
    this.networkManager.on('player_id', (id) => {
      this.playerId = id;
      console.log('Assigned player ID:', id);
    });
  }
  
  connectToServer(serverUrl = 'http://localhost:3000') {
    if (!this.multiplayerEnabled) return;
    
    console.log(`Connecting to multiplayer server: ${serverUrl}`);
    this.networkManager.connect(serverUrl);
    
    // Update player count in UI
    document.getElementById('players-count').textContent = '1';
    
    // Assign player to a team if in team mode
    if (this.gameMode === 'tdm' || this.gameMode === 'ctf') {
      const team = Math.random() > 0.5 ? 'red' : 'blue';
      this.player.team = team;
      this.teams[team].players.push(this.playerId);
      console.log(`Assigned to team: ${team}`);
    }
  }
  
  disconnectFromServer() {
    console.log("Disconnecting from multiplayer server");
    
    // Use NetworkManager to disconnect
    this.networkManager.disconnect();
    
    // Reset multiplayer state
    this.playerId = null;
    
    // Remove other players from scene
    for (const id in this.players) {
      this.scene.remove(this.players[id].mesh);
    }
    
    // Reset players and teams
    this.players = {};
    this.teams.red.players = [];
    this.teams.blue.players = [];
    this.player.team = null;
  }
  
  sendPlayerUpdate() {
    if (!this.multiplayerEnabled || !this.networkManager.isConnected()) return;
    if (!this.player || !this.player.mesh) return;
    
    const playerData = {
      position: {
        x: this.player.mesh.position.x,
        y: this.player.mesh.position.y,
        z: this.player.mesh.position.z
      },
      rotation: this.player.mesh.rotation.y,
      team: this.player.team,
      name: this.playerName,
      shipType: this.player.shipType
    };
    
    this.networkManager.sendPlayerUpdate(playerData);
  }
  
  createLaserFromPlayer(origin, direction, playerId) {
    // Implement this method to spawn a laser from another player
    // Similar to your existing laser creation code but from a different origin
    const laserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    
    // Determine color based on player's team if applicable
    let laserColor = 0xff0000; // Default red
    if (this.players[playerId] && this.players[playerId].team) {
      laserColor = this.players[playerId].team === 'red' ? 0xff0000 : 0x0000ff;
    }
    
    const laserMaterial = new THREE.MeshBasicMaterial({ 
      color: laserColor,
      emissive: laserColor,
      emissiveIntensity: 1.0
    });
    
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    
    // Set laser position and rotation
    laser.position.copy(origin);
    
    // Set laser direction
    const laserDirection = new THREE.Vector3().copy(direction);
    laser.lookAt(laserDirection.add(origin));
    
    // Rotate to align with direction
    laser.rotateX(Math.PI / 2);
    
    // Add to scene
    this.scene.add(laser);
    
    // Add to lasers array for update
    this.lasers.push({
      mesh: laser,
      direction: laserDirection.normalize(),
      speed: 0.5, // Adjust as needed
      playerId: playerId
    });
    
    return laser;
  }
  
  /**
   * Initialize the first game room
   */
  initializeFirstRoom() {
    // Clean up any existing room
    if (this.currentRoom) {
      this.currentRoom.cleanup();
    }
    
    // Create a new room
    this.currentRoom = new GameRoom(
      this.scene, 
      { width: 60, height: 60 }, 
      this.roomTheme || 'space-station'
    );
    
    // Position player at spawn point
    if (this.player && this.currentRoom) {
      const spawnPoint = this.currentRoom.getRandomSpawnPoint();
      this.player.mesh.position.copy(spawnPoint);
    }
    
    // Reset current level
    this.currentLevel = 1;
    
    // Update UI
    this.updateLevelDisplay();
  }
  
  /**
   * Update the level display in the UI
   */
  updateLevelDisplay() {
    const levelElement = document.getElementById('level-value');
    if (levelElement) {
      levelElement.textContent = this.currentLevel;
    }
  }
  
  /**
   * Create an explosion effect at the given position
   */
  createExplosion(position, size = 0.5) {
    // Create a sphere for the explosion
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(geometry, material);
    explosion.position.copy(position);
    this.scene.add(explosion);
    
    // Add point light
    const light = new THREE.PointLight(0x00ffff, 2, 10);
    light.position.copy(position);
    this.scene.add(light);
    
    // Animate the explosion
    let scale = 1.0;
    const expandSpeed = 2.0;
    const duration = 0.5; // seconds
    let elapsed = 0;
    
    const animate = (deltaTime) => {
      elapsed += deltaTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        // Remove the explosion
        this.scene.remove(explosion);
        this.scene.remove(light);
        return;
      }
      
      // Expand and fade out
      scale += expandSpeed * deltaTime;
      explosion.scale.set(scale, scale, scale);
      
      // Fade out
      const opacity = 1 - progress;
      material.opacity = opacity;
      light.intensity = 2 * opacity;
      
      // Continue animation
      requestAnimationFrame((timestamp) => {
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        animate(delta / 1000); // Convert ms to seconds
      });
    };
    
    // Start animation
    const lastTimestamp = performance.now();
    animate(0);
  }
  
  /**
   * Transition to the next room/level
   */
  transitionToNextRoom() {
    // Set transition flag
    this.isTransitioning = true;
    
    // Fade out effect
    // Here you would implement a visual fade-out effect
    
    // After fade out, create new room
    setTimeout(() => {
      // Clean up old room
      if (this.currentRoom) {
        this.currentRoom.cleanup();
      }
      
      // Increment level
      this.currentLevel++;
      
      // Create new room with increased difficulty
      this.currentRoom = new GameRoom(
        this.scene,
        { width: 60, height: 60 },
        this.roomTheme || 'space-station',
        { 
          difficulty: this.currentLevel * 0.2,
          obstacleCount: Math.min(10 + this.currentLevel, 30)
        }
      );
      
      // Position player at spawn point
      if (this.player && this.currentRoom) {
        const spawnPoint = this.currentRoom.getRandomSpawnPoint();
        this.player.mesh.position.copy(spawnPoint);
      }
      
      // Update UI
      this.updateLevelDisplay();
      
      // Increase enemy manager difficulty
      if (this.enemyManager) {
        this.enemyManager.increaseDifficulty(0.1 * this.currentLevel);
        this.enemyManager.increaseMaxEnemies(1);
      }
      
      // Fade in effect
      // Here you would implement a visual fade-in effect
      
      // Reset transition flag
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500); // After fade-in completes
      
    }, 1000); // After fade-out completes
  }
  
  /**
   * Update UI elements
   */
  updateUI() {
    // Update health and energy displays
    if (this.player) {
      // Update health
      const healthElement = document.getElementById('health-value');
      if (healthElement) {
        healthElement.textContent = Math.round(this.player.health);
        
        // Update health bar
        const healthBar = document.getElementById('health-bar-inner');
        if (healthBar) {
          const healthPercent = (this.player.health / this.player.maxHealth) * 100;
          healthBar.style.width = `${healthPercent}%`;
        }
      }
      
      // Update energy
      const energyElement = document.getElementById('energy-value');
      if (energyElement) {
        energyElement.textContent = Math.round(this.player.energy);
        
        // Update energy bar
        const energyBar = document.getElementById('energy-bar-inner');
        if (energyBar) {
          const energyPercent = (this.player.energy / this.player.maxEnergy) * 100;
          energyBar.style.width = `${energyPercent}%`;
        }
      }
      
      // Update shield
      const shieldElement = document.getElementById('shield-value');
      if (shieldElement) {
        shieldElement.textContent = Math.round(this.player.shields);
        
        // Update shield bar
        const shieldBar = document.getElementById('shield-bar-inner');
        if (shieldBar) {
          const shieldPercent = (this.player.shields / this.player.maxShields) * 100;
          shieldBar.style.width = `${shieldPercent}%`;
        }
      }
    }
    
    // Update score
    const scoreElement = document.getElementById('score-value');
    if (scoreElement && this.player) {
      scoreElement.textContent = this.player.score;
    }
  }
  
  /**
   * Setup event listeners for window resizing and UI controls
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Handle pause/resume game
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
      });
    }
    
    // Handle restart game
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
      restartButton.addEventListener('click', () => this.restart());
    }
  }
  
  /**
   * Show the game UI elements
   */
  showGameUI() {
    // Show game UI
    if (this.ui) {
      this.ui.show();
    }
    
    // Hide any splash screens or menus
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
      splashScreen.style.display = 'none';
    }
  }
  
  // Create visual representation for other players
  createOtherPlayer(playerData) {
    // Get ship type from player data or default to STANDARD
    const shipType = playerData.shipType || 'STANDARD';
    
    // Create geometry based on ship type
    let geometry;
    switch(shipType) {
      case 'INTERCEPTOR':
        geometry = new THREE.ConeGeometry(0.4, 1.25, 4);
        break;
      case 'HEAVY':
        geometry = new THREE.CylinderGeometry(0.6, 0.7, 1.0, 6);
        break;
      case 'SCOUT':
        geometry = new THREE.ConeGeometry(0.3, 1.1, 5);
        break;
      case 'STANDARD':
      default:
        geometry = new THREE.ConeGeometry(0.5, 1.0, 3);
        break;
    }
    
    // Rotate geometry to align with movement direction
    geometry.rotateX(Math.PI / 2);
    
    // Create material based on team color
    const shipColor = playerData.teamColor || 0x00ffff;
    const material = new THREE.MeshPhongMaterial({ 
      color: shipColor, 
      emissive: shipColor,
      emissiveIntensity: 0.5,
      shininess: 100
    });
    
    // Create mesh
    const ship = new THREE.Mesh(geometry, material);
    
    // Add engine glow effect
    const engineGlow = new THREE.PointLight(shipColor, 1, 2);
    engineGlow.position.set(0, 0, -0.5);
    ship.add(engineGlow);
    
    // Add ship to scene
    this.scene.add(ship);
    
    // Create name label
    const nameDiv = document.createElement('div');
    nameDiv.className = 'player-label';
    nameDiv.textContent = playerData.name || `Player-${playerData.id.substring(0, 4)}`;
    
    const nameLabel = new CSS2DObject(nameDiv);
    nameLabel.position.set(0, 1, 0);
    ship.add(nameLabel);
    
    // Set initial position if provided
    if (playerData.position) {
      ship.position.set(
        playerData.position.x,
        playerData.position.y || 0.5,
        playerData.position.z
      );
    }
    
    // Set initial rotation if provided
    if (playerData.rotation !== undefined) {
      ship.rotation.y = playerData.rotation;
    }
    
    // Return the player object
    return {
      mesh: ship,
      nameLabel,
      engineGlow,
      team: playerData.team,
      health: 100,
      shipType
    };
  }
  
  // Update other player with new data
  updateOtherPlayer(player, data) {
    if (!player || !player.mesh) return;
    
    // Update position with smooth lerping
    if (data.position) {
      const targetPos = new THREE.Vector3(
        data.position.x,
        data.position.y || 0.5,
        data.position.z
      );
      
      player.mesh.position.lerp(targetPos, 0.3);
    }
    
    // Update rotation with smooth interpolation
    if (data.rotation !== undefined) {
      // Find shortest rotation path
      let rotDiff = data.rotation - player.mesh.rotation.y;
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      player.mesh.rotation.y += rotDiff * 0.3;
    }
    
    // Update team if changed
    if (data.team !== undefined && data.team !== player.team) {
      player.team = data.team;
    }
    
    // Update other properties as needed
  }
} 