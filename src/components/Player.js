import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';

export class Player {
  constructor(scene, camera, soundManager) {
    this.scene = scene;
    this.camera = camera;
    this.soundManager = soundManager;
    
    // Player state
    this.health = 100;
    this.maxHealth = 100;
    this.shields = 100;
    this.maxShields = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.score = 0;
    this.collisionRadius = 0.8;
    this.isAlive = true;
    this.isInvulnerable = false;
    this.isFlashing = false;
    
    // Movement properties
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.maxSpeed = 30;
    this.friction = 0.95;
    this.rotationSpeed = 2.5;
    
    // Controls state
    this.controls = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      strafeLeft: false,
      strafeRight: false,
      brake: false,
      boost: false,
      fire: false
    };
    
    // Create ship mesh
    this.mesh = new THREE.Group();
    this.createDefaultShipMesh();
    
    // Set initial position
    this.mesh.position.set(0, 1, 0);
    this.scene.add(this.mesh);
    
    // Camera offset for third-person view
    this.cameraOffset = new THREE.Vector3(0, 5, -10);
    
    // Load the ship model
    this.shipModel = null;
    this.loadShipModel();
    
    // Setup weapons
    this.weapons = {
      primary: null,
      secondary: null
    };
    
    // Visual effects
    this.thrusterParticles = [];
    this.thrusterLight = null;
    this.setupThrusterEffects();
    
    // Flash material for collisions
    this.flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    
    // Setup key controls
    this.setupControls();
    
    // Initialize UI elements
    this.initUI();
  }
  
  setWeaponSystem(weaponSystem) {
    this.weaponSystem = weaponSystem;
  }
  
  createDefaultShip() {
    // Create ship geometry (temporary simple shape)
    const geometry = new THREE.ConeGeometry(0.5, 2, 8);
    
    // Create material with neon glow effect
    this.material = new THREE.MeshStandardMaterial({
      color: this.normalColor,
      emissive: this.normalColor,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Create mesh
    this.shipMesh = new THREE.Mesh(geometry, this.material);
    this.shipMesh.rotation.x = Math.PI / 2;
    
    // Add to container
    this.mesh.add(this.shipMesh);
    
    // Add thruster glow
    const thrusterGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const thrusterMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.7
    });
    this.thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    this.thruster.position.set(0, 0, 1);
    this.shipMesh.add(this.thruster);
  }
  
  loadShipModel() {
    // Path to the model - use the provided aircraft model
    const modelPath = 'models/ships/avrocar_vz-9-av_experimental_aircraft.glb';
    
    console.log('Loading ship model:', modelPath);
    
    this.modelLoader.loadModel(modelPath)
      .then(model => {
        console.log('Ship model loaded successfully');
        
        // Remove default ship
        this.mesh.remove(this.shipMesh);
        
        // Add loaded model
        this.shipModel = model;
        
        // Scale and position the model as needed (adjusted for the specific model)
        this.shipModel.scale.set(0.3, 0.3, 0.3); // Adjust scale as needed
        
        // Ensure model is properly oriented - may need adjustment based on model
        this.shipModel.rotation.y = Math.PI; 
        
        // Add model to container
        this.mesh.add(this.shipModel);
        
        // Add thruster to model
        this.addThrusterToModel();
        
        // Apply custom colors
        this.applyShipColors();
      })
      .catch(error => {
        console.error('Failed to load ship model:', error);
        // Keep using default ship if model fails to load
      });
  }
  
  addThrusterToModel() {
    // Create thruster
    const thrusterGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const thrusterMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.7
    });
    this.thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    
    // Position thruster at rear of ship (may need adjustment based on model)
    this.thruster.position.set(0, 0, 0.8);
    
    // Add to model
    this.shipModel.add(this.thruster);
  }
  
  applyShipColors() {
    // Apply custom neon colors to the ship model
    if (this.shipModel) {
      this.shipModel.traverse(node => {
        if (node.isMesh && node.material) {
          // Store original material for resetting
          if (!node.userData.originalMaterial) {
            node.userData.originalMaterial = node.material.clone();
          }
          
          // Apply neon effect
          node.material.emissive = new THREE.Color(this.normalColor);
          node.material.emissiveIntensity = 0.5;
          node.material.needsUpdate = true;
        }
      });
    }
  }
  
  setupInputHandlers() {
    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'Space':
          this.fireLaser();
          break;
        case 'Digit1':
          this.weaponType = 'LASER';
          document.getElementById('weapon-value').textContent = 'LASER';
          break;
        case 'Digit2':
          this.weaponType = 'BOUNCE_LASER';
          document.getElementById('weapon-value').textContent = 'BOUNCE LASER';
          break;
        case 'Digit3':
          this.weaponType = 'QUANTUM_GRENADE';
          document.getElementById('weapon-value').textContent = 'QUANTUM GRENADE';
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
      }
    });
  }
  
  update(deltaTime) {
    // Update flashing effect if active
    if (this.isFlashing) {
      const currentTime = Date.now();
      if (currentTime - this.flashStartTime > this.flashDuration) {
        this.isFlashing = false;
        this.resetShipColor();
      }
    }
    
    // Apply movement based on input, scaled by deltaTime for consistent speed
    this.velocity.x = 0;
    this.velocity.z = 0;
    
    if (this.moveForward) {
      this.velocity.z = -this.speed * deltaTime;
    }
    if (this.moveBackward) {
      this.velocity.z = this.speed * deltaTime;
    }
    if (this.moveLeft) {
      this.velocity.x = -this.speed * deltaTime;
    }
    if (this.moveRight) {
      this.velocity.x = this.speed * deltaTime;
    }
    
    // Apply velocity to position
    this.mesh.position.x += this.velocity.x;
    this.mesh.position.z += this.velocity.z;
    
    // Update rotation based on movement direction
    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }
    
    // Animate thruster if it exists
    if (this.thruster) {
      this.thruster.scale.set(
        1 + 0.1 * Math.sin(Date.now() * 0.01),
        1 + 0.1 * Math.sin(Date.now() * 0.01),
        1 + 0.1 * Math.sin(Date.now() * 0.01)
      );
    }
    
    // Update laser cooldown
    if (this.laserCooldown > 0) {
      this.laserCooldown -= deltaTime;
      if (this.laserCooldown <= 0) {
        this.laserCooldown = 0;
      }
    }
  }
  
  fireLaser() {
    // Check cooldown
    if (this.laserCooldown > 0 || !this.weaponSystem) return;
    
    // Calculate firing position (tip of the ship)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.mesh.quaternion);
    
    // Position slightly in front of the ship to avoid self-collision
    const position = this.mesh.position.clone().add(direction.multiplyScalar(1.2));
    position.y = 0.5; // Set height
    
    // Fire weapon
    this.weaponSystem.fireWeapon(this.weaponType, position, direction);
    
    // Set cooldown based on weapon type
    const weaponConfig = this.weaponSystem.weaponTypes[this.weaponType];
    this.laserCooldown = weaponConfig ? weaponConfig.cooldown : 500;
  }
  
  flashOnCollision() {
    this.isFlashing = true;
    this.flashStartTime = Date.now();
    this.applyFlashColor();
  }
  
  applyFlashColor() {
    // Apply flash color to ship
    if (this.shipModel) {
      // If using 3D model
      this.shipModel.traverse(node => {
        if (node.isMesh && node.material) {
          node.material.emissive = new THREE.Color(this.flashColor);
          node.material.needsUpdate = true;
        }
      });
    } else if (this.shipMesh) {
      // If using default ship
      this.material.color.setHex(this.flashColor);
      this.material.emissive.setHex(this.flashColor);
    }
  }
  
  resetShipColor() {
    // Reset to normal color
    if (this.shipModel) {
      // If using 3D model
      this.shipModel.traverse(node => {
        if (node.isMesh && node.material) {
          node.material.emissive = new THREE.Color(this.normalColor);
          node.material.needsUpdate = true;
        }
      });
    } else if (this.shipMesh) {
      // If using default ship
      this.material.color.setHex(this.normalColor);
      this.material.emissive.setHex(this.normalColor);
    }
  }
  
  takeDamage(amount) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.updateHealthDisplay();
    this.flashOnCollision();
    return this.health === 0;
  }
  
  updateHealthDisplay() {
    document.getElementById('health-value').textContent = this.health;
  }
  
  reset() {
    // Reset position
    this.mesh.position.set(0, 0.5, 0);
    
    // Reset movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity.set(0, 0, 0);
    
    // Reset health
    this.health = 100;
    this.updateHealthDisplay();
    
    // Reset appearance
    this.isFlashing = false;
    this.resetShipColor();
    
    // Reset laser cooldown
    this.laserCooldown = 0;
    
    // Reset weapon type
    this.weaponType = 'LASER';
    document.getElementById('weapon-value').textContent = 'LASER';
  }
  
  /**
   * Check collisions with obstacles in the room
   * @param {Array} obstacles - Array of obstacles to check against
   * @returns {boolean} - True if collision detected
   */
  checkObstacleCollisions(obstacles) {
    if (!obstacles || !Array.isArray(obstacles) || obstacles.length === 0) {
      return false;
    }
    
    // Skip collision detection if player is invulnerable
    if (this.isInvulnerable) {
      return false;
    }
    
    const playerPosition = this.mesh.position.clone();
    const playerRadius = this.collisionRadius || 0.8; // Default player collision radius
    
    for (const obstacle of obstacles) {
      if (!obstacle || !obstacle.position) continue;
      
      // Handle different obstacle types
      if (obstacle.type === 'wall' && obstacle.size) {
        // Rectangular wall collision
        const halfWidth = obstacle.size.x / 2;
        const halfDepth = obstacle.size.z / 2;
        const obstacleX = obstacle.position.x;
        const obstacleZ = obstacle.position.z;
        
        // Calculate closest point on the rectangle to the player
        const closestX = Math.max(obstacleX - halfWidth, Math.min(playerPosition.x, obstacleX + halfWidth));
        const closestZ = Math.max(obstacleZ - halfDepth, Math.min(playerPosition.z, obstacleZ + halfDepth));
        
        // Calculate distance between closest point and player center
        const distanceX = playerPosition.x - closestX;
        const distanceZ = playerPosition.z - closestZ;
        const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;
        
        // Collision detected if distance is less than player radius
        if (distanceSquared < playerRadius * playerRadius) {
          // Flash the ship on collision
          this.flashOnCollision();
          return true;
        }
      } else if ((obstacle.type === 'cylinder' || obstacle.type === 'hazard') && obstacle.radius) {
        // Circular obstacle collision (cylinders, hazards)
        const distance = playerPosition.distanceTo(obstacle.position);
        const combinedRadius = playerRadius + obstacle.radius;
        
        if (distance < combinedRadius) {
          // For hazards, take damage
          if (obstacle.type === 'hazard' && obstacle.damage) {
            this.takeDamage(obstacle.damage);
          }
          
          // Flash on collision
          this.flashOnCollision();
          return true;
        }
      } else if (obstacle.type === 'box' && obstacle.size) {
        // Box obstacle (similar to wall but in 3D)
        const halfWidth = obstacle.size.x / 2;
        const halfHeight = obstacle.size.y / 2;
        const halfDepth = obstacle.size.z / 2;
        const obstacleX = obstacle.position.x;
        const obstacleY = obstacle.position.y;
        const obstacleZ = obstacle.position.z;
        
        // Calculate closest point on the box to the player
        const closestX = Math.max(obstacleX - halfWidth, Math.min(playerPosition.x, obstacleX + halfWidth));
        const closestY = Math.max(obstacleY - halfHeight, Math.min(playerPosition.y, obstacleY + halfHeight));
        const closestZ = Math.max(obstacleZ - halfDepth, Math.min(playerPosition.z, obstacleZ + halfDepth));
        
        // Calculate distance between closest point and player center
        const distanceX = playerPosition.x - closestX;
        const distanceY = playerPosition.y - closestY;
        const distanceZ = playerPosition.z - closestZ;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY + distanceZ * distanceZ;
        
        // Collision detected if distance is less than player radius
        if (distanceSquared < playerRadius * playerRadius) {
          // Flash the ship on collision
          this.flashOnCollision();
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Visual feedback when player collides with something
   */
  flashOnCollision() {
    if (this.isFlashing) return;
    
    this.isFlashing = true;
    const originalMaterials = [];
    
    // Store original materials and set flash material
    if (this.shipModel) {
      this.shipModel.traverse(child => {
        if (child.isMesh && child.material) {
          originalMaterials.push({
            mesh: child,
            material: child.material
          });
          
          if (Array.isArray(child.material)) {
            child.material = child.material.map(() => this.flashMaterial.clone());
          } else {
            child.material = this.flashMaterial.clone();
          }
        }
      });
    } else if (this.mesh.material) {
      originalMaterials.push({
        mesh: this.mesh,
        material: this.mesh.material
      });
      this.mesh.material = this.flashMaterial.clone();
    }
    
    // Reset materials after a short delay
    setTimeout(() => {
      originalMaterials.forEach(item => {
        item.mesh.material = item.material;
      });
      this.isFlashing = false;
    }, 150);
  }
} 