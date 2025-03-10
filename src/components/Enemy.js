import * as THREE from 'three';

export class Enemy {
  constructor(scene, position, options = {}) {
    // Default options
    this.options = {
      type: 'BASIC', // BASIC, HUNTER, PATROLLER
      color: 0xff0000,
      health: 30,
      speed: 0.005,
      size: 0.6,
      detectionRadius: 10,
      ...options
    };
    
    // Reference to scene
    this.scene = scene;
    
    // Enemy state
    this.health = this.options.health;
    this.isActive = true;
    this.targetPosition = null;
    this.lastDirectionChange = 0;
    this.directionChangeInterval = 2000 + Math.random() * 2000; // Random interval between 2-4 seconds
    
    // Create enemy mesh
    this.createMesh(position);
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  createMesh(position) {
    // Create enemy geometry based on type
    let geometry;
    
    switch (this.options.type) {
      case 'HUNTER':
        // Triangle shape for hunters
        geometry = new THREE.ConeGeometry(this.options.size, this.options.size * 2, 3);
        geometry.rotateX(Math.PI / 2);
        break;
      case 'PATROLLER':
        // Square shape for patrollers
        geometry = new THREE.BoxGeometry(
          this.options.size * 1.5, 
          this.options.size / 2, 
          this.options.size * 1.5
        );
        break;
      case 'BASIC':
      default:
        // Circular shape for basic enemies
        geometry = new THREE.SphereGeometry(this.options.size, 16, 16);
        break;
    }
    
    // Create material with glow effect
    this.material = new THREE.MeshStandardMaterial({
      color: this.options.color,
      emissive: this.options.color,
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.2
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    
    // Set initial position
    this.mesh.position.copy(position);
    this.mesh.position.y = this.options.size; // Set height above ground
  }
  
  update(deltaTime, playerPosition, wallSegments) {
    if (!this.isActive) return;
    
    // Determine movement behavior based on enemy type
    switch (this.options.type) {
      case 'HUNTER':
        this.updateHunter(deltaTime, playerPosition, wallSegments);
        break;
      case 'PATROLLER':
        this.updatePatroller(deltaTime, wallSegments);
        break;
      case 'BASIC':
      default:
        this.updateBasic(deltaTime, playerPosition, wallSegments);
        break;
    }
    
    // Animate enemy (subtle pulsing)
    const pulseFactor = 1 + 0.1 * Math.sin(Date.now() * 0.003);
    this.mesh.scale.set(pulseFactor, pulseFactor, pulseFactor);
  }
  
  updateBasic(deltaTime, playerPosition, wallSegments) {
    // Basic enemies move randomly, changing direction periodically
    const currentTime = Date.now();
    
    // Check if it's time to change direction
    if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
      this.lastDirectionChange = currentTime;
      
      // Set a new random direction
      const angle = Math.random() * Math.PI * 2;
      this.direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      
      // Set new random interval
      this.directionChangeInterval = 2000 + Math.random() * 2000;
    }
    
    // Move in current direction
    if (this.direction) {
      const movement = this.direction.clone().multiplyScalar(this.options.speed * deltaTime);
      
      // Store previous position for collision resolution
      const previousPosition = this.mesh.position.clone();
      
      // Apply movement
      this.mesh.position.add(movement);
      
      // Check for wall collisions
      if (this.checkWallCollision(wallSegments)) {
        // If collision detected, revert to previous position and change direction
        this.mesh.position.copy(previousPosition);
        
        // Reflect direction (simple bounce)
        this.direction.negate();
      }
      
      // Face movement direction
      if (this.direction.length() > 0) {
        const angle = Math.atan2(this.direction.x, this.direction.z);
        this.mesh.rotation.y = angle;
      }
    }
  }
  
  updateHunter(deltaTime, playerPosition, wallSegments) {
    // Hunter enemies actively pursue the player
    if (!playerPosition) return;
    
    // Calculate direction to player
    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    const distance = toPlayer.length();
    
    // Only chase player if within detection radius
    if (distance < this.options.detectionRadius) {
      // Normalize direction vector
      toPlayer.normalize();
      
      // Store previous position for collision resolution
      const previousPosition = this.mesh.position.clone();
      
      // Move towards player, faster when closer
      const speedMultiplier = 1 + (1 - distance / this.options.detectionRadius) * 0.5;
      const movement = toPlayer.multiplyScalar(this.options.speed * speedMultiplier * deltaTime);
      this.mesh.position.add(movement);
      
      // Check for wall collisions
      if (this.checkWallCollision(wallSegments)) {
        // If collision detected, revert to previous position
        this.mesh.position.copy(previousPosition);
      }
      
      // Face towards player
      const angle = Math.atan2(toPlayer.x, toPlayer.z);
      this.mesh.rotation.y = angle;
    } else {
      // If player is out of range, use basic movement
      this.updateBasic(deltaTime, playerPosition, wallSegments);
    }
  }
  
  updatePatroller(deltaTime, wallSegments) {
    // Patroller enemies follow predetermined paths or patrol points
    // For simplicity, we'll have them move between random points
    
    // Create a new target position if needed
    if (!this.targetPosition || this.mesh.position.distanceTo(this.targetPosition) < 0.5) {
      // Choose a new random position within a reasonable range
      this.targetPosition = new THREE.Vector3(
        this.mesh.position.x + (Math.random() * 10 - 5),
        this.mesh.position.y,
        this.mesh.position.z + (Math.random() * 10 - 5)
      );
    }
    
    // Calculate direction to target
    const toTarget = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position);
    toTarget.normalize();
    
    // Store previous position for collision resolution
    const previousPosition = this.mesh.position.clone();
    
    // Move towards target
    const movement = toTarget.multiplyScalar(this.options.speed * deltaTime);
    this.mesh.position.add(movement);
    
    // Check for wall collisions
    if (this.checkWallCollision(wallSegments)) {
      // If collision detected, revert to previous position and set a new target
      this.mesh.position.copy(previousPosition);
      this.targetPosition = null; // This will force choosing a new target next update
    }
    
    // Face movement direction
    const angle = Math.atan2(toTarget.x, toTarget.z);
    this.mesh.rotation.y = angle;
  }
  
  checkWallCollision(wallSegments) {
    if (!wallSegments || !Array.isArray(wallSegments) || wallSegments.length === 0) return false;
    
    // Get enemy position and radius
    const enemyPosition = new THREE.Vector2(
      this.mesh.position.x,
      this.mesh.position.z
    );
    const enemyRadius = this.options.size;
    
    // Check collisions with each wall segment
    for (const segment of wallSegments) {
      // Skip invalid segments
      if (!segment || !segment.start || !segment.end) continue;
      
      const wallStart = new THREE.Vector2(segment.start.x, segment.start.z);
      const wallEnd = new THREE.Vector2(segment.end.x, segment.end.z);
      
      // Calculate closest point on wall segment to enemy
      const wallVector = wallEnd.clone().sub(wallStart);
      const enemyToWallStart = enemyPosition.clone().sub(wallStart);
      
      // Project enemy onto wall line
      const wallLength = wallVector.length();
      const wallDirection = wallVector.clone().normalize();
      const projectionLength = enemyToWallStart.dot(wallDirection);
      
      // Find closest point on wall segment
      let closestPoint;
      if (projectionLength < 0) {
        closestPoint = wallStart;
      } else if (projectionLength > wallLength) {
        closestPoint = wallEnd;
      } else {
        closestPoint = wallStart.clone().add(wallDirection.multiplyScalar(projectionLength));
      }
      
      // Calculate distance from enemy to closest point
      const distance = enemyPosition.distanceTo(closestPoint);
      
      // Check if collision occurred
      if (distance < enemyRadius) {
        return true;
      }
    }
    
    return false;
  }
  
  takeDamage(amount) {
    if (!this.isActive) return false;
    
    this.health -= amount;
    
    // Visual feedback for damage
    this.flashOnDamage();
    
    // Check if enemy is destroyed
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    
    return false;
  }
  
  flashOnDamage() {
    // Flash the enemy white momentarily
    const originalColor = this.material.emissive.clone();
    this.material.emissive.set(0xffffff);
    
    // Reset after short delay
    setTimeout(() => {
      if (this.material) {
        this.material.emissive.copy(originalColor);
      }
    }, 100);
  }
  
  destroy() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Create explosion effect
    this.createExplosionEffect();
    
    // Remove from scene
    this.scene.remove(this.mesh);
    
    // Dispose of resources
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
  
  createExplosionEffect() {
    // Create a simple explosion effect
    const explosionGeometry = new THREE.SphereGeometry(this.options.size * 2, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.mesh.position);
    this.scene.add(explosion);
    
    // Animate and remove after duration
    const startTime = Date.now();
    const duration = 500;
    
    const animateExplosion = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const scale = 1 + elapsed / duration * 2;
        explosion.scale.set(scale, scale, scale);
        explosionMaterial.opacity = 0.8 * (1 - elapsed / duration);
        requestAnimationFrame(animateExplosion);
      } else {
        this.scene.remove(explosion);
        explosionGeometry.dispose();
        explosionMaterial.dispose();
      }
    };
    
    animateExplosion();
  }
} 