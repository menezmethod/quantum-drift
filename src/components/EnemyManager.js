import * as THREE from 'three';
import { Enemy } from './Enemy';

export class EnemyManager {
  constructor(scene, mazeSize = 10) {
    this.scene = scene;
    this.mazeSize = mazeSize;
    this.enemies = [];
    
    // Enemy types with their probabilities and configs
    this.enemyTypes = {
      BASIC: {
        probability: 0.6,
        color: 0xff0000,
        health: 30,
        speed: 0.005
      },
      HUNTER: {
        probability: 0.3,
        color: 0xff00ff,
        health: 20,
        speed: 0.008,
        detectionRadius: 15
      },
      PATROLLER: {
        probability: 0.1,
        color: 0xffaa00,
        health: 40,
        speed: 0.004
      }
    };
    
    // Spawn settings
    this.maxEnemies = 10;
    this.spawnInterval = 5000; // 5 seconds
    this.lastSpawnTime = 0;
    this.spawnDistanceFromPlayer = 10;
    this.difficulty = 1; // Scales over time
  }
  
  update(deltaTime, playerPosition, obstacles) {
    // Check if we should spawn new enemies
    this.checkSpawn(playerPosition);
    
    // Ensure obstacles are correctly formatted for enemies
    const wallSegments = this.formatObstaclesForCollision(obstacles);
    
    // Update all active enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      // Skip inactive enemies - they'll be removed later
      if (!enemy.isActive) {
        this.enemies.splice(i, 1);
        continue;
      }
      
      // Update enemy behavior
      enemy.update(deltaTime, playerPosition, wallSegments);
    }
  }
  
  checkSpawn(playerPosition) {
    // Skip if player position isn't available
    if (!playerPosition) return;
    
    const currentTime = Date.now();
    
    // Check if it's time to spawn and we're under the limit
    if (currentTime - this.lastSpawnTime > this.spawnInterval && this.enemies.length < this.maxEnemies) {
      this.lastSpawnTime = currentTime;
      this.spawnEnemy(playerPosition);
    }
  }
  
  spawnEnemy(playerPosition) {
    // Determine spawn position (away from player)
    const spawnPosition = this.getSpawnPosition(playerPosition);
    if (!spawnPosition) return;
    
    // Determine enemy type based on probabilities
    const enemyType = this.selectEnemyType();
    
    // Get configuration for selected enemy type
    const typeConfig = this.enemyTypes[enemyType];
    
    // Scale difficulty based on current level
    const healthMultiplier = 1 + (this.difficulty - 1) * 0.2;
    const speedMultiplier = 1 + (this.difficulty - 1) * 0.1;
    
    // Create enemy with adjusted settings
    const enemy = new Enemy(this.scene, spawnPosition, {
      type: enemyType,
      color: typeConfig.color,
      health: typeConfig.health * healthMultiplier,
      speed: typeConfig.speed * speedMultiplier,
      detectionRadius: typeConfig.detectionRadius || 10
    });
    
    // Add to active enemies list
    this.enemies.push(enemy);
    
    return enemy;
  }
  
  getSpawnPosition(playerPosition) {
    // Try to find a valid spawn position
    for (let attempt = 0; attempt < 10; attempt++) {
      // Generate random angle around player
      const angle = Math.random() * Math.PI * 2;
      
      // Calculate position at random distance from player (between min and max)
      const minDistance = this.spawnDistanceFromPlayer;
      const maxDistance = this.spawnDistanceFromPlayer + 5;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      // Calculate position
      const x = playerPosition.x + Math.cos(angle) * distance;
      const z = playerPosition.z + Math.sin(angle) * distance;
      
      // Check if position is within maze bounds
      if (Math.abs(x) < this.mazeSize * 0.8 && Math.abs(z) < this.mazeSize * 0.8) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    
    // If all attempts failed, return null
    return null;
  }
  
  selectEnemyType() {
    // Random value between 0 and 1
    const rand = Math.random();
    
    // Calculate cumulative probability
    let cumulativeProbability = 0;
    
    for (const [type, config] of Object.entries(this.enemyTypes)) {
      cumulativeProbability += config.probability;
      
      if (rand <= cumulativeProbability) {
        return type;
      }
    }
    
    // Fallback to basic enemy
    return 'BASIC';
  }
  
  increaseMaxEnemies(amount = 1) {
    this.maxEnemies += amount;
  }
  
  increaseDifficulty(amount = 0.1) {
    this.difficulty += amount;
    
    // Also decrease spawn interval as difficulty increases
    this.spawnInterval = Math.max(1000, this.spawnInterval - 100);
  }
  
  checkCollisions(playerPosition, playerRadius = 0.5) {
    // Check for collisions between player and enemies
    if (!playerPosition) return false;
    
    for (const enemy of this.enemies) {
      if (!enemy.isActive) continue;
      
      // Simple distance-based collision check
      const distance = enemy.mesh.position.distanceTo(playerPosition);
      
      // If collision detected
      if (distance < playerRadius + enemy.options.size) {
        return enemy;
      }
    }
    
    return null;
  }
  
  clear() {
    // Remove all enemies
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    
    this.enemies = [];
  }
  
  // Convert obstacle data to wall segments format for collision detection
  formatObstaclesForCollision(obstacles) {
    if (!obstacles || !Array.isArray(obstacles)) return [];
    
    const wallSegments = [];
    
    for (const obstacle of obstacles) {
      if (obstacle.type === 'wall' && obstacle.position && obstacle.size) {
        // Create wall segments from obstacle bounds
        const halfWidth = obstacle.size.x / 2;
        const halfDepth = obstacle.size.z / 2;
        const x = obstacle.position.x;
        const z = obstacle.position.z;
        
        // Create four wall segments for each rectangular wall
        if (obstacle.size.x > obstacle.size.z) {
          // Horizontal wall (longer in x direction)
          wallSegments.push({
            start: new THREE.Vector3(x - halfWidth, 0, z),
            end: new THREE.Vector3(x + halfWidth, 0, z)
          });
        } else {
          // Vertical wall (longer in z direction)
          wallSegments.push({
            start: new THREE.Vector3(x, 0, z - halfDepth),
            end: new THREE.Vector3(x, 0, z + halfDepth)
          });
        }
      } else if (obstacle.type === 'obstacle' && obstacle.position) {
        // Create a simple boundary for other obstacles
        if (obstacle.radius) {
          // For cylindrical obstacles, create a circle approximation using 8 segments
          const radius = obstacle.radius;
          const center = obstacle.position;
          const segments = 8;
          
          for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            const x1 = center.x + Math.cos(angle1) * radius;
            const z1 = center.z + Math.sin(angle1) * radius;
            const x2 = center.x + Math.cos(angle2) * radius;
            const z2 = center.z + Math.sin(angle2) * radius;
            
            wallSegments.push({
              start: new THREE.Vector3(x1, 0, z1),
              end: new THREE.Vector3(x2, 0, z2)
            });
          }
        } else if (obstacle.size) {
          // For box obstacles, create four wall segments
          const halfWidth = obstacle.size.x / 2;
          const halfDepth = obstacle.size.z / 2;
          const x = obstacle.position.x;
          const z = obstacle.position.z;
          
          // Handle rotation if present
          let rotation = 0;
          if (obstacle.rotation) {
            rotation = obstacle.rotation.y;
          }
          
          if (rotation) {
            // Rotated rectangle - more complex calculation
            // For simplicity, we'll just create a simpler collision boundary
            const radius = Math.max(halfWidth, halfDepth);
            const segments = 8;
            
            for (let i = 0; i < segments; i++) {
              const angle1 = (i / segments) * Math.PI * 2;
              const angle2 = ((i + 1) / segments) * Math.PI * 2;
              
              const x1 = x + Math.cos(angle1) * radius;
              const z1 = z + Math.sin(angle1) * radius;
              const x2 = x + Math.cos(angle2) * radius;
              const z2 = z + Math.sin(angle2) * radius;
              
              wallSegments.push({
                start: new THREE.Vector3(x1, 0, z1),
                end: new THREE.Vector3(x2, 0, z2)
              });
            }
          } else {
            // Axis-aligned rectangle - simpler
            wallSegments.push({
              start: new THREE.Vector3(x - halfWidth, 0, z - halfDepth),
              end: new THREE.Vector3(x + halfWidth, 0, z - halfDepth)
            });
            wallSegments.push({
              start: new THREE.Vector3(x + halfWidth, 0, z - halfDepth),
              end: new THREE.Vector3(x + halfWidth, 0, z + halfDepth)
            });
            wallSegments.push({
              start: new THREE.Vector3(x + halfWidth, 0, z + halfDepth),
              end: new THREE.Vector3(x - halfWidth, 0, z + halfDepth)
            });
            wallSegments.push({
              start: new THREE.Vector3(x - halfWidth, 0, z + halfDepth),
              end: new THREE.Vector3(x - halfWidth, 0, z - halfDepth)
            });
          }
        }
      }
    }
    
    return wallSegments;
  }
} 