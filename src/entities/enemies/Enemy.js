import * as THREE from 'three';
import { Ship } from '../Ship';

export class Enemy extends Ship {
  constructor(scene, position, options = {}) {
    // Set default enemy options
    const enemyOptions = {
      type: 'BASIC',
      health: 30,
      speed: 0.005,
      size: 0.6,
      detectionRadius: 10,
      attackRange: 8,
      shipModel: 'STANDARD',
      ...options
    };
    
    super(scene, position, enemyOptions);
    
    // Enemy-specific properties
    this.targetPosition = null;
    this.lastDirectionChange = 0;
    this.directionChangeInterval = 2000 + Math.random() * 2000;
    this.currentTarget = null;
    this.lastAttackTime = 0;
    this.attackCooldown = 1000;
  }
  
  update(deltaTime, players, wallSegments) {
    if (!this.isActive) return;
    
    super.update(deltaTime);
    
    // Update behavior based on enemy type
    switch (this.options.type) {
      case 'HUNTER':
        this.updateHunter(deltaTime, players, wallSegments);
        break;
      case 'PATROLLER':
        this.updatePatroller(deltaTime, wallSegments);
        break;
      case 'BASIC':
      default:
        this.updateBasic(deltaTime, players, wallSegments);
        break;
    }
  }
  
  updateBasic(deltaTime, players, wallSegments) {
    const currentTime = Date.now();
    
    // Find nearest enemy player
    let nearestTarget = this.findNearestEnemyPlayer(players);
    
    if (nearestTarget && this.isInRange(nearestTarget.position, this.options.detectionRadius)) {
      // If enemy player is in range, engage
      this.currentTarget = nearestTarget;
      this.engageTarget(deltaTime, wallSegments);
    } else {
      // Random movement when no target
      if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
        this.lastDirectionChange = currentTime;
        const angle = Math.random() * Math.PI * 2;
        this.direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        this.directionChangeInterval = 2000 + Math.random() * 2000;
      }
      
      if (this.direction) {
        this.moveWithCollision(this.direction, deltaTime, wallSegments);
      }
    }
  }
  
  updateHunter(deltaTime, players, wallSegments) {
    const nearestTarget = this.findNearestEnemyPlayer(players);
    
    if (nearestTarget && this.isInRange(nearestTarget.position, this.options.detectionRadius)) {
      this.currentTarget = nearestTarget;
      this.engageTarget(deltaTime, wallSegments);
    } else {
      this.updateBasic(deltaTime, players, wallSegments);
    }
  }
  
  updatePatroller(deltaTime, wallSegments) {
    if (!this.targetPosition || this.mesh.position.distanceTo(this.targetPosition) < 0.5) {
      this.targetPosition = new THREE.Vector3(
        this.mesh.position.x + (Math.random() * 10 - 5),
        this.mesh.position.y,
        this.mesh.position.z + (Math.random() * 10 - 5)
      );
    }
    
    const toTarget = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position).normalize();
    this.moveWithCollision(toTarget, deltaTime, wallSegments);
  }
  
  engageTarget(deltaTime, wallSegments) {
    if (!this.currentTarget || !this.currentTarget.isActive) {
      this.currentTarget = null;
      return;
    }

    const toTarget = new THREE.Vector3().subVectors(
      this.currentTarget.position,
      this.mesh.position
    );
    
    const distance = toTarget.length();
    
    if (distance < this.options.attackRange) {
      // Attack if in range and cooldown is ready
      const currentTime = Date.now();
      if (currentTime - this.lastAttackTime > this.attackCooldown) {
        this.attack();
        this.lastAttackTime = currentTime;
      }
      
      // Maintain distance
      if (distance < this.options.attackRange * 0.5) {
        this.moveWithCollision(toTarget.normalize().negate(), deltaTime, wallSegments);
      }
    } else {
      // Move towards target
      this.moveWithCollision(toTarget.normalize(), deltaTime, wallSegments);
    }
    
    // Face target
    const angle = Math.atan2(toTarget.x, toTarget.z);
    this.mesh.rotation.y = angle;
  }
  
  moveWithCollision(direction, deltaTime, wallSegments) {
    const movement = direction.clone().multiplyScalar(this.options.speed * deltaTime);
    const previousPosition = this.mesh.position.clone();
    
    this.mesh.position.add(movement);
    
    if (this.checkWallCollision(wallSegments)) {
      this.mesh.position.copy(previousPosition);
      this.direction = direction.clone().reflect(new THREE.Vector3(1, 0, 0));
    }
    
    // Face movement direction
    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }
  
  findNearestEnemyPlayer(players) {
    let nearestDistance = Infinity;
    let nearestPlayer = null;

    players.forEach(player => {
      if (player.isActive && player.teamId !== this.teamId) {
        const distance = this.mesh.position.distanceTo(player.mesh.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlayer = player;
        }
      }
    });

    return nearestPlayer;
  }
  
  isInRange(position, range) {
    return this.mesh.position.distanceTo(position) <= range;
  }
  
  attack() {
    // Emit attack event for weapon system to handle
    this.emit('attack', {
      position: this.mesh.position.clone(),
      direction: new THREE.Vector3().subVectors(
        this.currentTarget.mesh.position,
        this.mesh.position
      ).normalize(),
      teamId: this.teamId
    });
  }
  
  checkWallCollision(wallSegments) {
    const pos = this.mesh.position;
    for (const segment of wallSegments) {
      const closest = this.getClosestPoint(pos, segment.start, segment.end);
      if (pos.distanceTo(closest) < this.options.size) return true;
    }
    return false;
  }

  getClosestPoint(point, start, end) {
    const line = end.clone().sub(start);
    const t = Math.max(0, Math.min(1, point.clone().sub(start).dot(line) / line.lengthSq()));
    return start.clone().add(line.multiplyScalar(t));
  }
} 