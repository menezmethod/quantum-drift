import * as THREE from 'three';
import { Laser } from './Laser';

/**
 * RegularLaser weapon class
 */
export class RegularLaser extends Laser {
  constructor(weaponSystem) {
    super(weaponSystem.scene, null, null, {
      damage: 25, range: 50, speed: 50, color: 0x00ffff
    });
    this.weaponSystem = weaponSystem;
    this.cooldown = 0.2;
    this.currentCooldown = 0;
    this.energyCost = 5;
  }
  
  /**
   * Update cooldown timer and laser position
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Call parent update to handle movement and range checking
    super.update(deltaTime);
    
    // Handle cooldown timer
    if (this.currentCooldown > 0) {
      this.currentCooldown -= deltaTime;
    }
  }
  
  /**
   * Check if weapon can fire
   * @param {object} player - Player object with energy properties
   * @returns {boolean} - True if weapon can fire
   */
  canFire(player) {
    return this.currentCooldown <= 0 && player.energy >= this.energyCost;
  }
  
  /**
   * Fire the weapon
   * @param {THREE.Vector3} position - Starting position of projectile
   * @param {THREE.Vector3} direction - Direction to fire
   * @param {object} player - Player object for energy management
   * @returns {boolean} - True if weapon fired successfully
   */
  fire(position, direction, options = {}) {
    // Position and orient the laser
    this.mesh.position.copy(position);
    this.direction = direction.normalize();
    this.initialPosition = position.clone();
    
    // Store initial properties
    this.teamId = options.teamId;
    
    // Set color based on team
    if (options.teamColor) {
      if (this.mesh.material) {
        this.mesh.material.color.set(options.teamColor);
      }
    }
    
    // Play sound if available
    if (this.weaponSystem.scene.soundManager) {
      this.weaponSystem.scene.soundManager.playSound('laser', position);
    }
    
    return this;
  }
  
  /**
   * Create a laser projectile
   * @param {THREE.Vector3} position - Starting position
   * @param {THREE.Vector3} direction - Direction to fire
   * @returns {object} - Projectile object
   */
  createProjectile(position, direction) {
    // Create laser geometry and material
    const geometry = new THREE.CylinderGeometry(
      this.size.width, 
      this.size.width, 
      this.size.length, 
      8
    );
    
    // Rotate geometry to point along z-axis
    geometry.rotateX(Math.PI / 2);
    
    // Create glowing material
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.8
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position
    mesh.position.copy(position);
    
    // Set rotation to match direction
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1), 
      direction.clone().normalize()
    );
    
    // Add a point light to make it glow
    const light = new THREE.PointLight(this.color, 1, 2);
    mesh.add(light);
    
    // Create projectile object
    const projectile = {
      mesh: mesh,
      direction: direction.clone().normalize(),
      speed: this.speed,
      distance: 0,
      maxDistance: this.range,
      damage: this.damage,
      isActive: true,
      owner: 'player',
      type: 'laser',
      explosionSize: this.explosionSize,
      
      // Update method
      update: function(deltaTime) {
        if (!this.isActive) return false;
        
        // Move projectile
        const moveAmount = this.speed * deltaTime;
        this.mesh.position.addScaledVector(this.direction, moveAmount);
        this.distance += moveAmount;
        
        // Deactivate if max distance reached
        if (this.distance >= this.maxDistance) {
          this.isActive = false;
          return false;
        }
        
        return true;
      },
      
      // Handle collision
      handleCollision: function() {
        this.isActive = false;
      },
      
      // Get current position
      get position() {
        return this.mesh.position;
      }
    };
    
    return projectile;
  }
} 