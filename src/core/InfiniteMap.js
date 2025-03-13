import * as THREE from 'three';

/**
 * Manages an infinite map system using chunks
 */
export class InfiniteMap {
  constructor(game) {
    this.game = game;
    this.chunks = new Map(); // Map of loaded chunks
    this.chunkSize = 100; // Size of each chunk in world units
    this.loadDistance = 2; // Number of chunks to load in each direction
    this.cullingDistance = 3; // Number of chunks before culling
    
    // Track current chunk
    this.currentChunkX = 0;
    this.currentChunkZ = 0;
    
    // Asset categories for random placement
    this.assetCategories = {
      flora: [
        'SP_Plant07.glb',
        'SP_Plant08.glb',
        'SP_Tree01.glb',
        'SP_Tree02.glb',
        'SP_Tree03.glb',
        'SP_Tree04.glb',
      ],
      rocks: [
        'SP_Rock01.glb',
        'SP_Rock02.glb',
        'SP_Rock03.glb',
        'SP_Rock04.glb',
        'SP_Rock05.glb',
        'SP_Rock06.glb',
        'SP_Rock07.glb',
        'SP_Rock08.glb',
        'SP_Rock09.glb'
      ],
      objects: [
        'SP_Ground02.glb',
        'SP_Ground03.glb',
        'SP_Ground04.glb',
        'SP_Ground05.glb',
        'SP_Mountain01.glb',
        'SP_Mountain02.glb',
        'SP_Mountain03.glb',
        'SP_Stone01.glb'
      ]
    };
  }

  /**
   * Get chunk key from world coordinates
   */
  getChunkKey(x, z) {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    return `${chunkX},${chunkZ}`;
  }

  /**
   * Update chunks based on player position
   */
  update(playerPosition) {
    // Get current chunk from player position
    const newChunkX = Math.floor(playerPosition.x / this.chunkSize);
    const newChunkZ = Math.floor(playerPosition.z / this.chunkSize);

    // If chunk changed, update loaded chunks
    if (newChunkX !== this.currentChunkX || newChunkZ !== this.currentChunkZ) {
      this.currentChunkX = newChunkX;
      this.currentChunkZ = newChunkZ;
      this.updateLoadedChunks();
    }
  }

  /**
   * Update which chunks are loaded based on current position
   */
  updateLoadedChunks() {
    // Track which chunks should be kept
    const chunksToKeep = new Set();

    // Calculate chunks to load
    for (let x = -this.loadDistance; x <= this.loadDistance; x++) {
      for (let z = -this.loadDistance; z <= this.loadDistance; z++) {
        const chunkX = this.currentChunkX + x;
        const chunkZ = this.currentChunkZ + z;
        const key = `${chunkX},${chunkZ}`;
        chunksToKeep.add(key);

        // Load chunk if not already loaded
        if (!this.chunks.has(key)) {
          this.loadChunk(chunkX, chunkZ);
        }
      }
    }

    // Unload chunks that are too far away
    for (const [key, chunk] of this.chunks) {
      if (!chunksToKeep.has(key)) {
        const distance = Math.max(
          Math.abs(chunk.x - this.currentChunkX),
          Math.abs(chunk.z - this.currentChunkZ)
        );

        if (distance > this.cullingDistance) {
          this.unloadChunk(key);
        }
      }
    }
  }

  /**
   * Load a new chunk at the specified coordinates
   */
  loadChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    
    // Create chunk container
    const chunk = {
      x: chunkX,
      z: chunkZ,
      objects: [],
      group: new THREE.Group()
    };

    // Calculate world position of chunk corner
    const worldX = chunkX * this.chunkSize;
    const worldZ = chunkZ * this.chunkSize;

    // Add random objects to chunk
    this.populateChunk(chunk, worldX, worldZ);

    // Add chunk to scene
    this.game.scene.add(chunk.group);
    this.chunks.set(key, chunk);
  }

  /**
   * Populate a chunk with random objects
   */
  populateChunk(chunk, worldX, worldZ) {
    // Number of objects to place in each category
    const counts = {
      flora: this.getRandomInt(3, 6),
      rocks: this.getRandomInt(2, 4),
      objects: this.getRandomInt(1, 3)
    };

    // Place objects from each category
    for (const [category, assets] of Object.entries(this.assetCategories)) {
      for (let i = 0; i < counts[category]; i++) {
        // Get random asset from category
        const assetPath = assets[Math.floor(Math.random() * assets.length)];
        
        // Calculate random position within chunk
        const x = worldX + Math.random() * this.chunkSize;
        const z = worldZ + Math.random() * this.chunkSize;

        // Load and place object
        this.game.assetLoader.loadModel(`models/${category}/${assetPath}`)
          .then(model => {
            // Random rotation
            model.rotation.y = Math.random() * Math.PI * 2;

            // Random scale based on category
            let scale = 1;
            if (category === 'flora') {
              scale = 0.5 + Math.random() * 0.5;
            } else if (category === 'rocks') {
              scale = 0.3 + Math.random() * 0.4;
            } else {
              scale = 0.2 + Math.random() * 0.3;
            }
            model.scale.set(scale, scale, scale);

            // Position object
            model.position.set(x, 0, z);

            // Add to chunk group
            chunk.group.add(model);

            // Store object data for collision
            chunk.objects.push({
              model,
              position: model.position.clone(),
              radius: this.calculateCollisionRadius(model, scale),
              type: category
            });
          })
          .catch(error => console.error('Error loading model:', error));
      }
    }
  }

  /**
   * Calculate appropriate collision radius for an object
   */
  calculateCollisionRadius(model, scale) {
    // Calculate using bounding box for more accuracy
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    
    // Use the larger of width or depth (horizontal dimensions)
    const radius = Math.max(size.x, size.z) / 2;
    
    // Apply scale
    const scaledRadius = radius * scale;
    
    // Add small padding (10%) for better collision detection
    return scaledRadius * 1.1;
  }

  /**
   * Unload a chunk and remove it from the scene
   */
  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      // Remove from scene
      this.game.scene.remove(chunk.group);
      
      // Dispose of geometries and materials
      chunk.group.traverse(object => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      // Remove from chunks map
      this.chunks.delete(key);
    }
  }

  /**
   * Get random integer between min and max (inclusive)
   */
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Check for collisions with objects in nearby chunks
   */
  checkCollisions(position, radius) {
    const currentKey = this.getChunkKey(position.x, position.z);
    const nearbyChunks = this.getNearbyChunks(currentKey);
    
    // First, do a quick sphere-based check for efficiency
    for (const chunk of nearbyChunks) {
      for (const object of chunk.objects) {
        const distance = position.distanceTo(object.position);
        const quickCheckDistance = radius + object.radius;
        
        // Skip detailed check if clearly not colliding
        if (distance > quickCheckDistance * 1.2) continue;
        
        // For close objects, do a more accurate bounding box check
        const model = object.model;
        
        // Get bounding box in world space
        const bbox = new THREE.Box3().setFromObject(model);
        
        // Create a sphere representing the player
        const playerSphere = {
          center: position.clone(),
          radius: radius
        };
        
        // Check if sphere intersects with box - simple approximation
        const collision = this.checkSphereBoxIntersection(playerSphere, bbox);
        
        if (collision) {
          return {
            collided: true,
            object: {
              position: object.position.clone(),
              radius: object.radius,
              type: object.type
            },
            distance: distance
          };
        }
      }
    }
    
    return { collided: false };
  }

  /**
   * Check if a sphere intersects with a box
   */
  checkSphereBoxIntersection(sphere, box) {
    // Find the closest point on the box to the sphere
    const closestPoint = new THREE.Vector3().copy(sphere.center);
    
    // For each axis, clamp the sphere center to the box bounds
    closestPoint.x = Math.max(box.min.x, Math.min(box.max.x, closestPoint.x));
    closestPoint.y = Math.max(box.min.y, Math.min(box.max.y, closestPoint.y));
    closestPoint.z = Math.max(box.min.z, Math.min(box.max.z, closestPoint.z));
    
    // Calculate distance from closest point to sphere center
    const distance = closestPoint.distanceTo(sphere.center);
    
    // If this distance is less than the sphere radius, we have a collision
    return distance < sphere.radius;
  }

  /**
   * Get array of chunks near the specified chunk
   */
  getNearbyChunks(key) {
    const [x, z] = key.split(',').map(Number);
    const nearby = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const nearbyKey = `${x + dx},${z + dz}`;
        const chunk = this.chunks.get(nearbyKey);
        if (chunk) {
          nearby.push(chunk);
        }
      }
    }
    
    return nearby;
  }
} 