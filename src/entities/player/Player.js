import * as THREE from 'three';
import { ModelLoader } from '../../assets/ModelLoader';
import { KEY_MAPPINGS, CONTROL_SETTINGS, DEFAULT_CONTROL_STATE, ControlUtils } from '../../config/Controls';
import { Ship } from '../Ship';

export class Player extends Ship {
  constructor(scene, position, options = {}) {
    // Set default player options
    const playerOptions = {
      type: 'PLAYER',
      health: 100,
      maxHealth: 100,
      speed: 0.15,
      size: 1.0,
      shipModel: 'STANDARD',
      ...options
    };
    
    super(scene, position, playerOptions);
    
    // Player-specific properties
    this.moveDirection = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();
    this.targetQuaternion = new THREE.Quaternion();
    
    // Movement state
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false
    };
    
    // Bind event handler methods to preserve 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    
    // Initialize controls
    this.setupControls();
  }

  setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    
    // Mouse controls for aiming
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  handleKeyDown(event) {
    switch(event.code) {
        case 'KeyW':
        this.moveState.forward = true;
          break;
        case 'KeyS':
        this.moveState.backward = true;
          break;
        case 'KeyA':
        this.moveState.left = true;
          break;
        case 'KeyD':
        this.moveState.right = true;
          break;
      case 'ShiftLeft':
        this.moveState.boost = true;
          break;
      }
  }
    
  handleKeyUp(event) {
    switch(event.code) {
        case 'KeyW':
        this.moveState.forward = false;
          break;
        case 'KeyS':
        this.moveState.backward = false;
          break;
        case 'KeyA':
        this.moveState.left = false;
          break;
        case 'KeyD':
        this.moveState.right = false;
        break;
      case 'ShiftLeft':
        this.moveState.boost = false;
          break;
      }
  }

  handleMouseMove(event) {
    // Update rotation based on mouse position
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Calculate target rotation
    this.rotation.y = Math.atan2(mouseX, mouseY);
    this.targetQuaternion.setFromEuler(this.rotation);
  }
  
  update(deltaTime) {
    if (!this.isActive) return;
    
    super.update(deltaTime);
    
    // Update movement
    this.updateMovement(deltaTime);
    
    // Update rotation
    this.updateRotation(deltaTime);
    
    // Emit position update event
    this.emit('positionUpdate', {
      position: this.mesh.position.clone(),
      rotation: this.mesh.rotation.clone(),
      teamId: this.teamId
    });
  }

  updateMovement(deltaTime) {
    // Reset movement direction
    this.moveDirection.set(0, 0, 0);
    
    // Calculate movement direction based on input state
    if (this.moveState.forward) this.moveDirection.z -= 1;
    if (this.moveState.backward) this.moveDirection.z += 1;
    if (this.moveState.left) this.moveDirection.x -= 1;
    if (this.moveState.right) this.moveDirection.x += 1;
    
    // Normalize movement direction
    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }
    
    // Apply speed and boost
    const currentSpeed = this.moveState.boost ? this.options.speed * 1.5 : this.options.speed;
    
    // Update velocity with smooth acceleration
    const acceleration = 0.1;
    this.velocity.lerp(this.moveDirection.multiplyScalar(currentSpeed), acceleration);
    
    // Apply velocity
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Keep player within bounds (example bounds)
    const bounds = 50;
    this.mesh.position.x = Math.max(-bounds, Math.min(bounds, this.mesh.position.x));
    this.mesh.position.z = Math.max(-bounds, Math.min(bounds, this.mesh.position.z));
    
    // Broadcast position updates for multiplayer
    if (this.networkManager) {
      this.networkManager.emit('player_move', {
        position: this.mesh.position,
        rotation: this.mesh.rotation,
      });
    }
  }

  updateRotation(deltaTime) {
    // Smoothly interpolate current rotation to target rotation
    this.mesh.quaternion.slerp(this.targetQuaternion, 0.1);
  }

  getForwardDirection() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.mesh.quaternion);
    return forward;
  }

  getRightDirection() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.mesh.quaternion);
    return right;
  }

  // Override destroy to handle player-specific cleanup
  destroy() {
    if (!this.isActive) return;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    
    // Call parent destroy method
    super.destroy();
    
    // Emit player destroyed event
    this.emit('playerDestroyed', {
      position: this.mesh.position.clone(),
      teamId: this.teamId
    });
  }
} 