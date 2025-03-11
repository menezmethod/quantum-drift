import * as THREE from 'three';
import { GLTFLoader } from '@three/examples/loaders/GLTFLoader';

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
            await Promise.all([
                this.loadModels(),
                this.loadSounds(),
                this.loadTextures()
            ]);

            this.loadingState.completed = true;
            return true;
        } catch (error) {
            this.handleError('critical', error);
            return false;
        }
    }

    async loadModels() {
        const loader = new GLTFLoader();
        // Use absolute paths to ensure models are loaded correctly
        const modelPaths = {
            'FIGHTER': 'assets/models/ships/ALTSPACE1.glb',
            'INTERCEPTOR': 'assets/models/ships/ALTSPACE2.glb',
            // Add aliases for backward compatibility
            'SCOUT': 'assets/models/ships/ALTSPACE1.glb',
            'EXPERIMENTAL': 'assets/models/ships/ALTSPACE2.glb',
            
            // Terrain models
            'TERRAIN': 'assets/models/terrain/Terrain.glb',
            'WATER': 'assets/models/terrain/Water.glb',
            
            // Flora models
            'TREE_01': 'assets/models/flora/SP_Tree01.glb',
            'TREE_02': 'assets/models/flora/SP_Tree02.glb',
            'TREE_03': 'assets/models/flora/SP_Tree03.glb',
            'TREE_04': 'assets/models/flora/SP_Tree04.glb',
            'PLANT_06': 'assets/models/flora/BigPlant_06.glb',
            'PLANT_07': 'assets/models/flora/SP_Plant07.glb',
            'PLANT_08': 'assets/models/flora/SP_Plant08.glb',
            'GRASS_01': 'assets/models/flora/Grass_01.glb',
            'MUSHROOMS': 'assets/models/flora/Mushrooms.glb',
            'ROOTS_01': 'assets/models/flora/SmalRoots_01.glb',
            'TENTACLES_01': 'assets/models/flora/Tenticles_01.glb',
            
            // Rock models
            'BIG_ROCK_01': 'assets/models/rocks/BigRock_01.glb',
            'BIG_ROCK_02': 'assets/models/rocks/BigRock_02.glb',
            'ROCK_FORMATION_01': 'assets/models/rocks/RockFormation_01.glb',
            'ROCK_FORMATION_02': 'assets/models/rocks/RockFormation_02.glb',
            'ROCK_FORMATION_03': 'assets/models/rocks/RockFormation_03.glb',
            'ROCK_FORMATION_05': 'assets/models/rocks/RockFormation_05.glb',
            'ROCK_FORMATION_07': 'assets/models/rocks/RockFormation_07.glb',
            'ROCK_01': 'assets/models/rocks/SP_Rock01.glb',
            'ROCK_02': 'assets/models/rocks/SP_Rock02.glb',
            'ROCK_03': 'assets/models/rocks/SP_Rock03.glb',
            'ROCK_04': 'assets/models/rocks/SP_Rock04.glb',
            'ROCK_05': 'assets/models/rocks/SP_Rock05.glb',
            'ROCK_06': 'assets/models/rocks/SP_Rock06.glb',
            'ROCK_07': 'assets/models/rocks/SP_Rock07.glb',
            'ROCK_08': 'assets/models/rocks/SP_Rock08.glb',
            'ROCK_09': 'assets/models/rocks/SP_Rock09.glb',
            
            // Object models
            'CRYSTAL_01': 'assets/models/objects/SP_Crystal01.glb',
            'GROUND_01': 'assets/models/objects/SP_Ground01.glb',
            'GROUND_02': 'assets/models/objects/SP_Ground02.glb',
            'GROUND_03': 'assets/models/objects/SP_Ground03.glb',
            'GROUND_04': 'assets/models/objects/SP_Ground04.glb',
            'GROUND_05': 'assets/models/objects/SP_Ground05.glb',
            'MOUNTAIN_01': 'assets/models/objects/SP_Mountain01.glb',
            'MOUNTAIN_02': 'assets/models/objects/SP_Mountain02.glb',
            'MOUNTAIN_03': 'assets/models/objects/SP_Mountain03.glb',
            'STONE_01': 'assets/models/objects/SP_Stone01.glb'
        };

        console.log('🚢 Starting to load models with paths:', modelPaths);

        const loadPromises = Object.entries(modelPaths).map(([key, path]) => {
            console.log(`🔄 Setting up loading for model: ${key} from path: ${path}`);
            return this.loadWithRetry(() => this.loadModel(loader, key, path));
        });

        await Promise.all(loadPromises);
        
        // Apply consistent sizing to all ship models
        this.normalizeShipSizes();
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

    async loadSounds() {
        const audioLoader = new THREE.AudioLoader();
        const soundPaths = {
            'laser': 'assets/sounds/laser.mp3',
            'laser-bounce': 'assets/sounds/laser-bounce.mp3',
            'grenade-laser': 'assets/sounds/grenade-laser.mp3',
            'bounce': 'assets/sounds/bounce.mp3'
        };

        const loadPromises = Object.entries(soundPaths).map(([key, path]) => {
            return this.loadWithRetry(() => this.loadSound(audioLoader, key, path));
        });

        await Promise.all(loadPromises);
    }

    async loadSound(loader, key, path) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Sound loading timeout: ${key}`));
            }, 10000);

            loader.load(
                path,
                (buffer) => {
                    clearTimeout(timeoutId);
                    this.assets.sounds.set(key, buffer);
                    this.onProgress?.(`Loaded sound: ${key}`);
                    resolve();
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100);
                    this.onProgress?.(`Loading ${key}: ${Math.round(percent)}%`);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Error loading sound ${key}: ${error.message}`));
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

    getSound(key) {
        return this.assets.sounds.get(key);
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
        this.assets.sounds.clear();
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
            const model = this.assets.models.get(key);
            
            if (!model) {
                console.warn(`Ship model with key "${key}" not found!`);
                
                // Try to find alternative models if aliases didn't work
                if (key === 'FIGHTER' || key === 'SCOUT') {
                    // Try alternatives for fighter
                    console.log('Trying to find FIGHTER/SCOUT alternatives');
                    const altModel = this.assets.models.get('FIGHTER') || this.assets.models.get('SCOUT');
                    if (altModel) {
                        console.log('Found alternative model, cloning');
                        
                        // DIAGNOSTIC: Log scale before cloning
                        console.log(`DIAGNOSTIC: Original model scale before clone - [${altModel.scale.x}, ${altModel.scale.y}, ${altModel.scale.z}]`);
                        
                        const cloned = altModel.clone();
                        
                        // DIAGNOSTIC: Log scale after cloning
                        console.log(`DIAGNOSTIC: Cloned model scale - [${cloned.scale.x}, ${cloned.scale.y}, ${cloned.scale.z}]`);
                        
                        return cloned;
                    }
                } else if (key === 'INTERCEPTOR' || key === 'EXPERIMENTAL') {
                    // Try alternatives for interceptor
                    console.log('Trying to find INTERCEPTOR/EXPERIMENTAL alternatives');
                    const altModel = this.assets.models.get('INTERCEPTOR') || this.assets.models.get('EXPERIMENTAL');
                    if (altModel) {
                        console.log('Found alternative model, cloning');
                        
                        // DIAGNOSTIC: Log scale before cloning
                        console.log(`DIAGNOSTIC: Original model scale before clone - [${altModel.scale.x}, ${altModel.scale.y}, ${altModel.scale.z}]`);
                        
                        const cloned = altModel.clone();
                        
                        // DIAGNOSTIC: Log scale after cloning
                        console.log(`DIAGNOSTIC: Cloned model scale - [${cloned.scale.x}, ${cloned.scale.y}, ${cloned.scale.z}]`);
                        
                        return cloned;
                    }
                }
                
                console.error(`No model or alternative found for key: ${key}`);
                return null;
            }
            
            // DIAGNOSTIC: Log scale before cloning 
            console.log(`DIAGNOSTIC: Original model scale before clone - [${model.scale.x}, ${model.scale.y}, ${model.scale.z}]`);
            
            // Return a properly cloned model
            console.log(`Cloning model for: ${key}`);
            const cloned = model.clone();
            
            // DIAGNOSTIC: Log scale after cloning
            console.log(`DIAGNOSTIC: Cloned model scale - [${cloned.scale.x}, ${cloned.scale.y}, ${cloned.scale.z}]`);
            
            return cloned;
        } catch (error) {
            console.error(`Error cloning ship model ${key}:`, error);
            return null;
        }
    }
}

export default AssetLoader; 