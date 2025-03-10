import * as THREE from 'three';
import { Laser } from './Laser';

export class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    
    // Weapon types
    this.weaponTypes = {
      LASER: {
        name: 'Regular Laser',
        color: 0x00ffff,
        cooldown: 300,
        length: 3,
        thickness: 0.1,
        speed: 0.3,
        damage: 10
      },
      BOUNCE_LASER: {
        name: 'Bounce Laser',
        color: 0xff00ff,
        cooldown: 500,
        length: 2.5,
        thickness: 0.15,
        speed: 0.25,
        damage: 8,
        bounces: 3
      },
      QUANTUM_GRENADE: {
        name: 'Quantum Grenade',
        color: 0xffff00,
        cooldown: 1000,
        speed: 0.15,
        radius: 0.3,
        damage: 25,
        areaEffectRadius: 5,
        delay: 3000
      }
    };
    
    // Audio (will be implemented later)
    this.audioEnabled = false;
  }
  
  fireWeapon(weaponType, position, direction, options = {}) {
    // Get weapon configuration
    const weaponConfig = this.weaponTypes[weaponType];
    if (!weaponConfig) {
      console.error(`Unknown weapon type: ${weaponType}`);
      return null;
    }
    
    // Create projectile based on weapon type
    let projectile;
    
    switch (weaponType) {
      case 'LASER':
        projectile = this.createLaser(position, direction, {
          ...weaponConfig,
          ...options
        });
        break;
      // Other weapon types will be implemented later
      default:
        console.warn(`Weapon type ${weaponType} not yet implemented`);
        return null;
    }
    
    // Add to projectiles list for tracking
    if (projectile) {
      this.projectiles.push(projectile);
    }
    
    return projectile;
  }
  
  createLaser(position, direction, config) {
    // Create laser projectile
    return new Laser(this.scene, position, direction, config);
  }
  
  update(deltaTime) {
    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      // Update projectile
      projectile.update(deltaTime);
      
      // Remove inactive projectiles
      if (!projectile.isActive) {
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  checkCollisions(targets, obstacles) {
    const hitResults = [];
    
    // Skip if no active projectiles
    if (this.projectiles.length === 0) return hitResults;
    
    // Ensure targets is an array
    const targetArray = Array.isArray(targets) ? targets : [];
    
    // Format obstacles to wall segments if needed
    const wallSegments = this.formatObstacles(obstacles);
    
    // Check each projectile for collisions
    for (const projectile of this.projectiles) {
      if (!projectile.isActive) continue;
      
      // Check wall collisions
      if (wallSegments && this.checkWallCollision(projectile, wallSegments)) {
        hitResults.push({
          projectile: projectile,
          target: 'wall',
          position: projectile.position.clone()
        });
        
        // Handle the hit
        projectile.handleCollision();
        continue;
      }
      
      // Check target collisions
      if (targetArray.length > 0) {
        for (const target of targetArray) {
          if (this.checkTargetCollision(projectile, target)) {
            hitResults.push({
              projectile: projectile,
              target: target,
              position: projectile.position.clone()
            });
            
            // Handle the hit
            projectile.handleCollision();
            break;
          }
        }
      }
    }
    
    return hitResults;
  }
  
  formatObstacles(obstacles) {
    // If obstacles is already an array of wall segments, return it
    if (Array.isArray(obstacles) && obstacles.length > 0 && 
        obstacles[0].start && obstacles[0].end) {
      return obstacles;
    }
    
    // Format obstacles into wall segments if they're in the GameRoom format
    if (Array.isArray(obstacles)) {
      const wallSegments = [];
      
      for (const obstacle of obstacles) {
        if (!obstacle || !obstacle.position) continue;
        
        if (obstacle.type === 'wall' && obstacle.size) {
          // Create line segments for walls
          const halfWidth = obstacle.size.x / 2;
          const halfDepth = obstacle.size.z / 2;
          const x = obstacle.position.x;
          const z = obstacle.position.z;
          
          // Determine if it's a horizontal or vertical wall
          if (obstacle.size.x > obstacle.size.z) {
            // Horizontal wall
            wallSegments.push({
              start: new THREE.Vector3(x - halfWidth, 0, z),
              end: new THREE.Vector3(x + halfWidth, 0, z)
            });
          } else {
            // Vertical wall
            wallSegments.push({
              start: new THREE.Vector3(x, 0, z - halfDepth),
              end: new THREE.Vector3(x, 0, z + halfDepth)
            });
          }
        } else if (obstacle.radius) {
          // For cylindrical obstacles, we'll approximate with line segments
          const segments = 8; // Number of line segments to approximate circle
          const center = obstacle.position;
          const radius = obstacle.radius;
          
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
          // Box obstacle - create four wall segments
          const halfWidth = obstacle.size.x / 2;
          const halfDepth = obstacle.size.z / 2;
          const x = obstacle.position.x;
          const z = obstacle.position.z;
          
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
      
      return wallSegments;
    }
    
    // If obstacles is not in a recognized format, return an empty array
    return [];
  }
  
  checkWallCollision(projectile, wallSegments) {
    // Simple collision check for laser projectiles
    const projectilePosition = new THREE.Vector2(
      projectile.position.x,
      projectile.position.z
    );
    
    const radius = projectile.options.thickness;
    
    // Check each wall segment
    for (const segment of wallSegments) {
      const wallStart = new THREE.Vector2(segment.start.x, segment.start.z);
      const wallEnd = new THREE.Vector2(segment.end.x, segment.end.z);
      
      // Calculate closest point on wall segment to projectile
      const wallVector = wallEnd.clone().sub(wallStart);
      const projectileToWallStart = projectilePosition.clone().sub(wallStart);
      
      // Project projectile onto wall line
      const wallLength = wallVector.length();
      const wallDirection = wallVector.clone().normalize();
      const projectionLength = projectileToWallStart.dot(wallDirection);
      
      // Find closest point on wall segment
      let closestPoint;
      if (projectionLength < 0) {
        closestPoint = wallStart;
      } else if (projectionLength > wallLength) {
        closestPoint = wallEnd;
      } else {
        closestPoint = wallStart.clone().add(wallDirection.multiplyScalar(projectionLength));
      }
      
      // Calculate distance from projectile to closest point
      const distance = projectilePosition.distanceTo(closestPoint);
      
      // Check if collision occurred
      if (distance < radius) {
        return true;
      }
    }
    
    return false;
  }
  
  checkTargetCollision(projectile, target) {
    // Simple distance-based collision check
    if (!target.mesh) return false;
    
    // Get target position (assume it has a mesh with position)
    const targetPosition = target.mesh.position;
    
    // Calculate distance
    const distance = projectile.position.distanceTo(targetPosition);
    
    // Simple radius check (can be enhanced later)
    const collisionThreshold = 0.5 + projectile.options.thickness;
    return distance < collisionThreshold;
  }
  
  clearAllProjectiles() {
    // Deactivate all projectiles
    for (const projectile of this.projectiles) {
      projectile.deactivate();
    }
    
    // Clear array
    this.projectiles = [];
  }
} 