import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Manager to handle and cache all loaded models
export class ModelLoader {
  constructor() {
    // Cache for storing loaded models to avoid reloading
    this.modelCache = new Map();
    
    // Create loaders
    this.gltfLoader = new GLTFLoader();
    
    // Loading manager to track progress
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      console.log(`Loading: ${Math.round(progress)}% (${url})`);
    };
    
    // Set up loaders with manager
    this.gltfLoader.manager = this.loadingManager;
  }
  
  /**
   * Load a 3D model from path
   * @param {string} path - Path to the model file, relative to the assets directory
   * @returns {Promise} - Promise that resolves with the loaded model
   */
  loadModel(path) {
    // Add assets prefix for webpack build
    const assetPath = path.startsWith('assets/') ? path : `assets/${path}`;
    
    // Check if model is already in cache
    if (this.modelCache.has(assetPath)) {
      return Promise.resolve(this.modelCache.get(assetPath).clone());
    }
    
    // If not in cache, load it
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        assetPath,
        (gltf) => {
          // Store original in cache
          this.modelCache.set(assetPath, gltf.scene.clone());
          
          // Process the model for better performance
          this.processModel(gltf.scene);
          
          resolve(gltf.scene);
        },
        (progress) => {
          // Optional progress callback
        },
        (error) => {
          console.error(`Error loading model from ${assetPath}:`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Process model to optimize it
   * @param {THREE.Group} model - The loaded model
   */
  processModel(model) {
    console.log('Processing model in ModelLoader, initial scale:', model.scale.x, model.scale.y, model.scale.z);
    
    // Traverse the model and optimize materials, geometries, etc.
    model.traverse((node) => {
      if (node.isMesh) {
        console.log(`ModelLoader found mesh: ${node.name}, Scale:`, node.scale);
        
        // Enable shadows
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Keep materials but ensure they're properly configured
        if (node.material) {
          // Ensure material has appropriate render settings
          node.material.needsUpdate = true;
        }
      }
    });
    
    // Center the model if needed
    this.centerModel(model);
    
    console.log('Model after processing, final scale:', model.scale.x, model.scale.y, model.scale.z);
  }
  
  /**
   * Center the model at its geometric center
   * @param {THREE.Group} model - The model to center
   */
  centerModel(model) {
    // Create a bounding box for the model
    const boundingBox = new THREE.Box3().setFromObject(model);
    
    // Calculate the center of the bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Move the model so its center is at the origin
    model.position.sub(center);
  }
  
  /**
   * Clear the model cache (useful when memory needs to be freed)
   */
  clearCache() {
    this.modelCache.clear();
  }
  
  /**
   * Get a list of all loaded model paths
   * @returns {Array} - Array of paths to loaded models
   */
  getLoadedModelPaths() {
    return Array.from(this.modelCache.keys());
  }
} 