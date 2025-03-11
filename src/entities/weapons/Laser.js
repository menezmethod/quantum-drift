import * as THREE from 'three';

export class Laser {
  constructor(scene, position, direction, options = {}) {
    this.scene = scene;
    this.options = { speed: 0.3, color: 0x00ffff, ...options };
    this.mesh = this.createMesh();
    if (position) this.mesh.position.copy(position);
    if (direction) this.direction = direction.normalize();
    this.scene.add(this.mesh);
    this.isActive = true;
  }

  createMesh() {
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: this.options.color });
    return new THREE.Mesh(geometry, material);
  }
  
  update(deltaTime) {
    if (!this.isActive) return;
    
    // Move in direction
    if (this.direction) {
      this.mesh.position.add(
        this.direction.clone().multiplyScalar(this.options.speed * deltaTime)
      );
    }
    
    // Check if laser has exceeded its range
    if (this.options.range) {
      const distance = this.mesh.position.distanceTo(this.initialPosition);
      if (distance > this.options.range) {
        this.deactivate();
      }
    }
  }
  
  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    
    // Dispose of geometry and materials
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
  }
} 