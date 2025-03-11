/**
 * MiniMap class for displaying a top-down radar view of the game
 */
export class MiniMap {
  constructor(game) {
    this.game = game;
    this.visible = true;
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.mapScale = 15; // Scale factor for map (pixels per world unit)
    
    // Scale factor for converting world coordinates to mini-map coordinates
    this.scale = 0.08;
    
    // Mini-map center offset in pixels
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.createMiniMap();
  }
  
  /**
   * Create the mini-map UI
   */
  createMiniMap() {
    this.container = document.createElement('div');
    this.container.className = 'mini-map-container';
    document.body.appendChild(this.container);
    
    // Create mini-map area
    const miniMap = document.createElement('div');
    miniMap.className = 'mini-map';
    this.container.appendChild(miniMap);
    
    // Add subtle M key hint
    const hint = document.createElement('div');
    hint.className = 'mini-map-hint';
    hint.textContent = 'M';
    this.container.appendChild(hint);
    
    // Create canvas for drawing
    this.canvas = document.createElement('canvas');
    this.canvas.width = 300;
    this.canvas.height = 300;
    miniMap.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Calculate center offset
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;
  }
  
  /**
   * Update the mini-map with current game state
   */
  update() {
    if (!this.visible || !this.ctx || !this.game.playerShip) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    this.ctx.fillStyle = 'rgba(0, 20, 40, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid lines
    this.drawGridLines();
    
    // Draw objects from infinite map
    this.drawObjects();
    
    // Draw player
    this.drawPlayer();
    
    // Draw enemies (if any exist)
    if (this.game.enemies) {
      this.drawEnemies();
    }
  }
  
  /**
   * Draw grid lines on mini-map
   */
  drawGridLines() {
    const gridSize = 10; // World units
    const gridLines = 20; // Number of grid lines in each direction
    
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    this.ctx.lineWidth = 0.5;
    
    // Get player position
    const playerX = this.game.playerShip.position.x;
    const playerZ = this.game.playerShip.position.z;
    
    const startX = Math.floor(playerX / gridSize) * gridSize - (gridLines * gridSize / 2);
    const startZ = Math.floor(playerZ / gridSize) * gridSize - (gridLines * gridSize / 2);
    
    // Draw vertical lines
    for (let i = 0; i <= gridLines; i++) {
      const worldX = startX + i * gridSize;
      const mapX = this.worldToMapX(worldX);
      
      this.ctx.beginPath();
      this.ctx.moveTo(mapX, 0);
      this.ctx.lineTo(mapX, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= gridLines; i++) {
      const worldZ = startZ + i * gridSize;
      const mapY = this.worldToMapY(worldZ);
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, mapY);
      this.ctx.lineTo(this.canvas.width, mapY);
      this.ctx.stroke();
    }
  }
  
  /**
   * Draw objects from infinite map chunks
   */
  drawObjects() {
    if (!this.game.infiniteMap) return;
    
    // Get nearby chunks
    const playerPos = this.game.playerShip.position;
    const currentKey = this.game.infiniteMap.getChunkKey(playerPos.x, playerPos.z);
    const nearbyChunks = this.game.infiniteMap.getNearbyChunks(currentKey);
    
    // Draw objects from each chunk
    for (const chunk of nearbyChunks) {
      for (const object of chunk.objects) {
        // Get object position
        const x = object.position.x;
        const z = object.position.z;
        
        // Convert to mini-map coordinates
        const mapX = this.worldToMapX(x);
        const mapY = this.worldToMapY(z);
        
        // Set color based on object type
        switch (object.type) {
          case 'flora':
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            break;
          case 'rocks':
            this.ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
            break;
          case 'objects':
            this.ctx.fillStyle = 'rgba(255, 69, 0, 0.7)';
            break;
          default:
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        }
        
        // Draw object dot
        this.ctx.beginPath();
        this.ctx.arc(mapX, mapY, object.radius * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
  
  /**
   * Draw player on mini-map
   */
  drawPlayer() {
    // Get player position
    const x = this.game.playerShip.position.x;
    const z = this.game.playerShip.position.z;
    
    // Convert to mini-map coordinates
    const mapX = this.worldToMapX(x);
    const mapY = this.worldToMapY(z);
    
    // Draw player direction cone
    this.drawPlayerDirection(mapX, mapY);
    
    // Draw player dot
    this.ctx.fillStyle = '#00ffff';
    this.ctx.beginPath();
    this.ctx.arc(mapX, mapY, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw player glow
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(mapX, mapY, 5, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  
  /**
   * Draw player direction indicator
   */
  drawPlayerDirection(mapX, mapY) {
    // Get player rotation
    const angle = this.game.playerShip.rotation.y;
    
    // Draw direction indicator
    this.ctx.save();
    this.ctx.translate(mapX, mapY);
    this.ctx.rotate(-angle); // Negative because z-axis is inverted
    
    // Draw triangular direction indicator
    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -10); // Pointing up
    this.ctx.lineTo(-5, 0);
    this.ctx.lineTo(5, 0);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw enemies on mini-map
   */
  drawEnemies() {
    this.ctx.fillStyle = '#ff3333';
    
    for (const enemy of this.game.enemies) {
      // Get position
      const x = enemy.position.x;
      const z = enemy.position.z;
      
      // Convert to mini-map coordinates
      const mapX = this.worldToMapX(x);
      const mapY = this.worldToMapY(z);
      
      // Draw enemy dot
      this.ctx.beginPath();
      this.ctx.arc(mapX, mapY, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  /**
   * Convert world X coordinate to mini-map X coordinate
   */
  worldToMapX(x) {
    // Get player position
    const playerX = this.game.playerShip.position.x;
    
    // Apply scale and center on player
    return this.offsetX + (x - playerX) * this.scale;
  }
  
  /**
   * Convert world Z coordinate to mini-map Y coordinate
   */
  worldToMapY(z) {
    // Get player position
    const playerZ = this.game.playerShip.position.z;
    
    // Apply scale and center on player (note the negation since Z goes forward)
    return this.offsetY + (z - playerZ) * this.scale;
  }
  
  /**
   * Toggle mini-map visibility
   */
  toggle() {
    this.visible = !this.visible;
    
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }
  
  /**
   * Show mini-map
   */
  show() {
    this.container.classList.remove('hidden');
    this.visible = true;
  }
  
  /**
   * Hide mini-map
   */
  hide() {
    this.container.classList.add('hidden');
    this.visible = false;
  }
} 