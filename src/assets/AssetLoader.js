import * as THREE from 'three';
import { GLTFLoader } from '@three/examples/loaders/GLTFLoader';

// Enable THREE.Cache for asset caching
THREE.Cache.enabled = true;

class AssetLoader {
    constructor() {
        this.loadingState = {
            started: false,
            completed: false,
            errors: [],
            timeouts: new Map(),
            retryCount: new Map(),
            maxRetries: 3,
            loadingPromises: new Map()
        };

        this.assets = {
            models: new Map(),
            sounds: new Map(),
            textures: new Map()
        };

        this.onProgress = null;
        this.onError = null;
    }

    setCallbacks(onProgress, onError) {
        this.onProgress = onProgress;
        this.onError = onError;
        return this;
    }

    async loadAll() {
        if (this.loadingState.started) {
            console.warn('Asset loading already in progress');
            return;
        }

        this.loadingState.started = true;
        this.loadingState.completed = false;
        this.loadingState.errors = [];

        try {
            const modelsToLoad = [
                'ships/ALTSPACE1.glb',
                'ships/ALTSPACE2.glb',
                'terrain/Terrain.glb',
                'terrain/Water.glb',
                'objects/SP_Stone01.glb',
                'objects/SP_Ground05.glb'
            ];

            const loader = new GLTFLoader();
            
            for (const model of modelsToLoad) {
                try {
                    const loaded = await this.loadWithRetry(() => 
                        this.loadModel(loader, model, `assets/models/${model}`)
                    );
                    if (loaded) {
                        console.log(`✅ Successfully loaded model: ${model}`);
                        
                        // Add aliases for ship models
                        if (model === 'ships/ALTSPACE1.glb') {
                            this.assets.models.set('FIGHTER', this.assets.models.get(model));
                            this.assets.models.set('SCOUT', this.assets.models.get(model));
                            this.assets.models.set('STANDARD', this.assets.models.get(model));
                            this.assets.models.set('DEFAULT', this.assets.models.get(model));
                        } else if (model === 'ships/ALTSPACE2.glb') {
                            this.assets.models.set('INTERCEPTOR', this.assets.models.get(model));
                            this.assets.models.set('EXPERIMENTAL', this.assets.models.get(model));
                            this.assets.models.set('HEAVY', this.assets.models.get(model));
                        }
                    }
                } catch (error) {
                    console.error(`⛔ Failed to load model ${model}:`, error);
                    this.handleError('model', error);
                }
            }

            this.loadingState.completed = true;
            return true;
        } catch (error) {
            this.handleError('critical', error);
            return false;
        }
    }

    async loadModel(loader, key, path) {
        return new Promise((resolve, reject) => {
            console.log(`🔍 Actually loading model: ${key} from: ${path}`);
            
            const timeoutId = setTimeout(() => {
                reject(new Error(`Model loading timeout: ${key}`));
            }, 15000);

            loader.load(
                path,
                (gltf) => {
                    clearTimeout(timeoutId);
                    console.log(`✅ Successfully loaded model: ${key}`);
                    
                    // Store the original model before any scaling
                    this.assets.models.set(key, gltf.scene);
                    this.onProgress?.(`Loaded model: ${key}`);
                    resolve();
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100);
                    this.onProgress?.(`Loading ${key}: ${Math.round(percent)}%`);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    console.error(`⛔ Error loading model ${key}:`, error.message);
                    reject(new Error(`Error loading model ${key}: ${error.message}`));
                }
            );
        });
    }

    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        const texturePaths = {
            // Add texture paths when needed
        };

        const loadPromises = Object.entries(texturePaths).map(([key, path]) => {
            return this.loadWithRetry(() => this.loadTexture(textureLoader, key, path));
        });

        await Promise.all(loadPromises);
    }

    async loadTexture(loader, key, path) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Texture loading timeout: ${key}`));
            }, 10000);

            loader.load(
                path,
                (texture) => {
                    clearTimeout(timeoutId);
                    this.assets.textures.set(key, texture);
                    this.onProgress?.(`Loaded texture: ${key}`);
                    resolve();
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100);
                    this.onProgress?.(`Loading ${key}: ${Math.round(percent)}%`);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Error loading texture ${key}: ${error.message}`));
                }
            );
        });
    }

    async loadWithRetry(loadFunction) {
        const key = loadFunction.name || 'unknown';
        let retryCount = 0;

        while (retryCount < this.loadingState.maxRetries) {
            try {
                return await loadFunction();
            } catch (error) {
                retryCount++;
                if (retryCount === this.loadingState.maxRetries) {
                    this.handleError(key, error);
                    throw error;
                }
                console.warn(`Retrying ${key} (attempt ${retryCount}/${this.loadingState.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
    }

    handleError(assetType, error) {
        console.error(`Error loading ${assetType}:`, error);
        this.loadingState.errors.push({ type: assetType, error: error.message });
        this.onError?.(assetType, error.message);
    }

    getModel(key) {
        return this.assets.models.get(key);
    }

    getTexture(key) {
        return this.assets.textures.get(key);
    }

    isLoaded() {
        return this.loadingState.completed;
    }

    getErrors() {
        return this.loadingState.errors;
    }

    cleanup() {
        // Dispose of all loaded assets
        this.assets.models.forEach(model => {
            model.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });

        this.assets.textures.forEach(texture => texture.dispose());

        // Clear all maps
        this.assets.models.clear();
        this.assets.textures.clear();

        // Reset loading state
        this.loadingState = {
            started: false,
            completed: false,
            errors: [],
            timeouts: new Map(),
            retryCount: new Map(),
            maxRetries: 3,
            loadingPromises: new Map()
        };
    }

    // Force ship sizes to be consistent
    normalizeShipSizes() {
        console.log('🛠️ NORMALIZING SHIP SIZES');
        
        // Check what models we have
        const modelKeys = Array.from(this.assets.models.keys());
        console.log('Available models:', modelKeys);
        
        // Skip if no models are loaded
        if (this.assets.models.size === 0) {
            console.warn('⚠️ No models loaded yet, skipping normalization');
            return;
        }
        
        // Set all models to scale 1
        modelKeys.forEach(key => {
            try {
                const model = this.assets.models.get(key);
                if (model) {
                    console.log(`Setting standard scale 1.0 for ${key}`);
                    model.scale.set(1, 1, 1);
                }
            } catch (error) {
                console.error(`Error setting scale for model ${key}:`, error);
            }
        });
        
        console.log('🛠️ SHIP SIZE NORMALIZATION COMPLETE');
    }
    
    // Method to get a cloned ship model
    getShipModel(key) {
        try {
            console.log(`Getting ship model: ${key}`);
            
            // First try direct key lookup
            let model = this.assets.models.get(key);
            
            // If not found, try the file path
            if (!model) {
                model = this.assets.models.get(`ships/${key}.glb`);
            }
            
            // If still not found, try aliases
            if (!model) {
                console.log(`Trying to find model by alias: ${key}`);
                if (key === 'FIGHTER' || key === 'SCOUT' || key === 'STANDARD' || key === 'DEFAULT') {
                    // Use ALTSPACE1 as the default/standard ship model
                    model = this.assets.models.get('ships/ALTSPACE1.glb');
                } else if (key === 'INTERCEPTOR' || key === 'EXPERIMENTAL' || key === 'HEAVY') {
                    model = this.assets.models.get('ships/ALTSPACE2.glb');
                }
            }
            
            if (!model) {
                console.warn(`Ship model with key "${key}" not found!`);
                return null;
            }
            
            return this.cloneAndPrepareModel(model);
        } catch (error) {
            console.error(`Error cloning ship model ${key}:`, error);
            return null;
        }
    }

    // New method to handle model cloning and preparation
    cloneAndPrepareModel(model) {
        // DIAGNOSTIC: Log scale before cloning
        console.log(`DIAGNOSTIC: Original model scale before clone - [${model.scale.x}, ${model.scale.y}, ${model.scale.z}]`);
        
        // Clone the model
        const cloned = model.clone();
        
        // Apply consistent scaling as specified in Task 12
        cloned.scale.set(0.45, 0.45, 0.45);
        
        // Ensure materials are properly cloned
        cloned.traverse(node => {
            if (node.isMesh && node.material) {
                // Clone material to prevent sharing between instances
                node.material = node.material.clone();
                
                // Ensure material properties are set
                if (!node.material.color) node.material.color = new THREE.Color(0xffffff);
                if (!node.material.emissive) node.material.emissive = new THREE.Color(0x000000);
                
                // Enable shadows
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        
        // DIAGNOSTIC: Log scale after cloning
        console.log(`DIAGNOSTIC: Cloned model scale - [${cloned.scale.x}, ${cloned.scale.y}, ${cloned.scale.z}]`);
        
        return cloned;
    }

    // Method to get a cloned ship model for opponents
    getOpponentShipModel(key) {
        try {
            console.log(`Getting opponent ship model: ${key}`);
            // Use the same model loading logic as getShipModel
            const model = this.getShipModel(key);
            
            if (!model) {
                console.warn(`No model found for opponent ship type: ${key}`);
                return null;
            }
            
            // Clone the model to ensure each opponent has their own instance
            const clonedModel = model.clone();
            
            // Apply any opponent-specific modifications here if needed
            // For example, different materials or effects
            
            return clonedModel;
        } catch (error) {
            console.error(`Error getting opponent ship model ${key}:`, error);
            return null;
        }
    }

    // Add the loadModels method used by ShipSelectionUI
    async loadModels() {
        console.log('Loading ship models for selection UI');
        
        if (this.assets.models.has('FIGHTER') && this.assets.models.has('INTERCEPTOR')) {
            console.log('Ship models already loaded, using cached versions');
            return true;
        }
        
        const shipModels = [
            'ships/ALTSPACE1.glb',
            'ships/ALTSPACE2.glb'
        ];
        
        const loader = new GLTFLoader();
        
        for (const model of shipModels) {
            try {
                const loaded = await this.loadWithRetry(() => 
                    this.loadModel(loader, model, `assets/models/${model}`)
                );
                if (loaded) {
                    console.log(`✅ Successfully loaded ship model: ${model} for selection UI`);
                    
                    // Add aliases for ship models
                    if (model === 'ships/ALTSPACE1.glb') {
                        this.assets.models.set('FIGHTER', this.assets.models.get(model));
                        this.assets.models.set('SCOUT', this.assets.models.get(model));
                        this.assets.models.set('STANDARD', this.assets.models.get(model));
                        this.assets.models.set('DEFAULT', this.assets.models.get(model));
                    } else if (model === 'ships/ALTSPACE2.glb') {
                        this.assets.models.set('INTERCEPTOR', this.assets.models.get(model));
                        this.assets.models.set('EXPERIMENTAL', this.assets.models.get(model));
                        this.assets.models.set('HEAVY', this.assets.models.get(model));
                    }
                }
            } catch (error) {
                console.error(`⛔ Failed to load ship model ${model}:`, error);
                this.handleError('model', error);
            }
        }
        
        return true;
    }
}

export default AssetLoader; 