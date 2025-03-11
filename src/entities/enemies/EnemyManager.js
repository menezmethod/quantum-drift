import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyHealthDisplay } from '../../ui/EnemyHealthDisplay';

export class EnemyManager {
  constructor(scene, mazeSize = 10) {
    this.scene = scene;
    this.mazeSize = mazeSize;
    this.enemies = [];
    
    // Initialize health display if container is available
    if (document.body) {
      this.healthDisplay = new EnemyHealthDisplay(document.body);
    }
    
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
    
    // Instanced meshes for performance optimization
    this.instancedMeshes = {};
    this.initializeInstancedMeshes();
    
    // Spawn settings
    this.maxEnemies = 10;
    this.spawnInterval = 5000; // 5 seconds
    this.lastSpawnTime = 0;
    this.spawnDistanceFromPlayer = 10;
    this.difficulty = 1; // Scales over time
  }
  
  /**
   * Initialize instanced meshes for all enemy types
   */
  initializeInstancedMeshes() {
    // Maximum number of instances per type (can be adjusted as needed)
    const maxInstancesPerType = 20;
    
    // Create instanced meshes for each enemy type
    for (const [type, config] of Object.entries(this.enemyTypes)) {
      // Create geometry based on type
      let geometry;
      
      switch(type) {
        case 'HUNTER':
          geometry = new THREE.ConeGeometry(0.5, 1.2, 4);
          geometry.rotateX(Math.PI / 2);
          break;
        case 'PATROLLER':
          geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
          break;
        case 'BASIC':
        default:
          geometry = new THREE.SphereGeometry(0.5, 8, 8);
          break;
      }
      
      // Create material with enemy color
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.3
      });
      
      // Create instanced mesh
      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        maxInstancesPerType
      );
      
      // Hide initially
      instancedMesh.count = 0;
      
      // Store for later use
      this.instancedMeshes[type] = {
        mesh: instancedMesh,
        maxInstances: maxInstancesPerType,
        activeInstances: 0,
        instanceMap: new Map() // Maps enemy ID to instance index
      };
      
      // Add to scene
      this.scene.add(instancedMesh);
    }
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
        // Remove health bar if enemy is inactive
        if (this.healthDisplay) {
          this.healthDisplay.removeHealthBar(enemy);
        }
        
        // Remove from instanced mesh if using instancing
        this.removeFromInstancedMesh(enemy);
        
        this.enemies.splice(i, 1);
        continue;
      }
      
      // Update enemy behavior
      enemy.update(deltaTime, playerPosition, wallSegments);
      
      // Update instanced mesh transform for this enemy
      this.updateInstancedMeshTransform(enemy);
    }
    
    // Update health displays
    if (this.healthDisplay) {
      this.healthDisplay.update(this.enemies);
    }
  }
  
  /**
   * Add enemy to appropriate instanced mesh
   * @param {Enemy} enemy - The enemy to add
   */
  addToInstancedMesh(enemy) {
    if (!enemy || !enemy.isActive) return;
    
    const type = enemy.options.type;
    const instanceData = this.instancedMeshes[type];
    
    if (!instanceData) return;
    
    // Check if we have room for another instance
    if (instanceData.activeInstances < instanceData.maxInstances) {
      const instanceIndex = instanceData.activeInstances;
      
      // Store the mapping
      instanceData.instanceMap.set(enemy.id, instanceIndex);
      
      // Update the transform for this instance
      const matrix = new THREE.Matrix4();
      matrix.setPosition(enemy.mesh.position);
      matrix.makeRotationFromEuler(enemy.mesh.rotation);
      matrix.scale(new THREE.Vector3(
        enemy.options.size,
        enemy.options.size,
        enemy.options.size
      ));
      
      instanceData.mesh.setMatrixAt(instanceIndex, matrix);
      instanceData.mesh.instanceMatrix.needsUpdate = true;
      
      // Increment active instance count
      instanceData.activeInstances++;
      instanceData.mesh.count = instanceData.activeInstances;
      
      // Use this instance instead of individual mesh
      this.scene.remove(enemy.mesh);
      enemy.useInstancing = true;
    }
  }
  
  /**
   * Update the transform of an enemy's instance in the instanced mesh
   * @param {Enemy} enemy - The enemy to update
   */
  updateInstancedMeshTransform(enemy) {
    if (!enemy || !enemy.isActive || !enemy.useInstancing) return;
    
    const type = enemy.options.type;
    const instanceData = this.instancedMeshes[type];
    
    if (!instanceData || !instanceData.instanceMap.has(enemy.id)) return;
    
    const instanceIndex = instanceData.instanceMap.get(enemy.id);
    
    // Update matrix
    const matrix = new THREE.Matrix4();
    matrix.setPosition(enemy.mesh.position);
    matrix.makeRotationFromEuler(enemy.mesh.rotation);
    matrix.scale(new THREE.Vector3(
      enemy.options.size,
      enemy.options.size,
      enemy.options.size
    ));
    
    instanceData.mesh.setMatrixAt(instanceIndex, matrix);
    instanceData.mesh.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * Remove enemy from instanced mesh
   * @param {Enemy} enemy - The enemy to remove
   */
  removeFromInstancedMesh(enemy) {
    if (!enemy || !enemy.useInstancing) return;
    
    const type = enemy.options.type;
    const instanceData = this.instancedMeshes[type];
    
    if (!instanceData || !instanceData.instanceMap.has(enemy.id)) return;
    
    const instanceIndex = instanceData.instanceMap.get(enemy.id);
    const lastIndex = instanceData.activeInstances - 1;
    
    // If this is not the last instance, move the last instance to this slot
    if (instanceIndex !== lastIndex) {
      // Find which enemy uses the last index
      let lastEnemyId = null;
      for (const [id, index] of instanceData.instanceMap.entries()) {
        if (index === lastIndex) {
          lastEnemyId = id;
          break;
        }
      }
      
      if (lastEnemyId) {
        // Get the last matrix
        const matrix = new THREE.Matrix4();
        instanceData.mesh.getMatrixAt(lastIndex, matrix);
        
        // Set it at the current index
        instanceData.mesh.setMatrixAt(instanceIndex, matrix);
        
        // Update the mapping
        instanceData.instanceMap.set(lastEnemyId, instanceIndex);
      }
    }
    
    // Delete this enemy from the map
    instanceData.instanceMap.delete(enemy.id);
    
    // Decrement active instance count
    instanceData.activeInstances--;
    instanceData.mesh.count = instanceData.activeInstances;
    instanceData.mesh.instanceMatrix.needsUpdate = true;
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
      maxHealth: typeConfig.health * healthMultiplier,
      speed: typeConfig.speed * speedMultiplier,
      detectionRadius: typeConfig.detectionRadius || 10
    });
    
    // Add to instanced mesh if available
    this.addToInstancedMesh(enemy);
    
    // Enable network synchronization
    if (this.scene.networkManager) {
      enemy.syncWithNetwork = true;
      
      // Immediately sync this new enemy
      this.scene.networkManager.sendEnemyUpdate(enemy);
    }
    
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
  
  render(camera) {
    // Render health bars if available
    if (this.healthDisplay) {
      this.healthDisplay.render(camera);
    }
  }
  
  clear() {
    // Remove all enemies
    for (const enemy of this.enemies) {
      if (this.healthDisplay) {
        this.healthDisplay.removeHealthBar(enemy);
      }
      enemy.destroy();
    }
    
    this.enemies = [];
    
    // Reset instanced meshes
    for (const typeData of Object.values(this.instancedMeshes)) {
      typeData.activeInstances = 0;
      typeData.mesh.count = 0;
      typeData.instanceMap.clear();
      typeData.mesh.instanceMatrix.needsUpdate = true;
    }
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