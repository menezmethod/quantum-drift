import * as THREE from 'three';

export class Laser {
  constructor(scene, position, direction, options = {}) {
    // Default options
    this.options = {
      color: 0x00ffff,
      speed: 0.3,
      length: 3,
      thickness: 0.1,
      lifetime: 2000, // milliseconds
      ...options
    };
    
    // Reference to the scene
    this.scene = scene;
    
    // Position and direction
    this.position = position.clone();
    this.direction = direction.clone().normalize();
    
    // Tracking
    this.isActive = true;
    this.creationTime = Date.now();
    this.hasHit = false;
    
    // Create laser mesh
    this.createLaser();
    
    // Add to scene
    this.scene.add(this.mesh);
  }
  
  createLaser() {
    // Create laser geometry
    const geometry = new THREE.CylinderGeometry(
      this.options.thickness, 
      this.options.thickness, 
      this.options.length, 
      8
    );
    // Rotate geometry to align with Z-axis
    geometry.rotateX(Math.PI / 2);
    
    // Create material with glow effect
    this.material = new THREE.MeshStandardMaterial({
      color: this.options.color,
      emissive: this.options.color,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.8
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    
    // Position at starting point
    this.mesh.position.copy(this.position);
    
    // Orient along direction
    this.mesh.lookAt(this.position.clone().add(this.direction));
    
    // Add glow effect
    this.addGlowEffect();
  }
  
  addGlowEffect() {
    // Create point light for glow
    this.light = new THREE.PointLight(this.options.color, 1, 3);
    this.light.position.copy(this.position);
    this.scene.add(this.light);
    
    // Add trail particles if advanced effects are enabled
    // (Placeholder for future particle effects)
  }
  
  update(deltaTime) {
    if (!this.isActive) return;
    
    // Move laser forward
    const movement = this.direction.clone().multiplyScalar(this.options.speed * deltaTime);
    this.position.add(movement);
    this.mesh.position.copy(this.position);
    
    // Update light position
    if (this.light) {
      this.light.position.copy(this.position);
    }
    
    // Check lifetime
    const age = Date.now() - this.creationTime;
    if (age > this.options.lifetime) {
      this.deactivate();
    }
  }
  
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove from scene
    this.scene.remove(this.mesh);
    if (this.light) {
      this.scene.remove(this.light);
    }
    
    // Dispose of resources
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
  
  handleCollision() {
    this.hasHit = true;
    this.deactivate();
  }
} 