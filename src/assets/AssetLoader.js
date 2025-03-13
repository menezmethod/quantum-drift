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
        this.scene = null; // Will be set by setScene method
    }

    // Set the scene reference for methods that need to add objects to the scene
    setScene(scene) {
        this.scene = scene;
        return this;
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

    // Methods moved from Game.js

    /**
     * Creates a floor for the game using the Terrain.glb model
     * @param {THREE.Scene} scene - The scene to add the floor to
     * @returns {Object} - The created floor objects
     */
    createFloor(scene) {
        console.log('Creating floor with Terrain.glb model');
        const sceneToUse = scene || this.scene;
        
        if (!sceneToUse) {
            console.error('No scene provided to createFloor');
            return null;
        }

        // Create a placeholder floor initially - this will be visible until the model loads
        const tempFloorGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
        const tempFloorMaterial = new THREE.MeshBasicMaterial({
            color: 0x000022,
            transparent: true,
            opacity: 0.2,
        });

        const floor = new THREE.Mesh(tempFloorGeometry, tempFloorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        sceneToUse.add(floor);

        // Also create an invisible raycasting plane that will always work for targeting
        // This ensures mouse input works consistently regardless of the visual floor model
        const raycastFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.05, // Very slight visibility for debugging
                side: THREE.DoubleSide
            })
        );
        raycastFloor.rotation.x = -Math.PI / 2;
        raycastFloor.position.y = 0.1; // Position higher above terrain
        sceneToUse.add(raycastFloor);

        // Add debug logging
        console.log('Raycast floor created at height:', raycastFloor.position.y, 'and size:', 1000);

        // Load texture first
        const textureLoader = new THREE.TextureLoader();
        const texturePromise = new Promise((resolve, reject) => {
            textureLoader.load(
                'assets/models/textures/Colors3.png',
                texture => {
                    console.log('Terrain texture (Colors3.png) loaded successfully');
                    // Configure texture
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(8, 8); // Repeat the texture more times for better detail
                    resolve(texture);
                },
                undefined,
                error => {
                    console.error('Error loading Colors3.png texture:', error);
                    // Try fallback texture
                    textureLoader.load(
                        'assets/models/textures/tex.png',
                        fallbackTexture => {
                            console.log('Fallback texture loaded');
                            fallbackTexture.wrapS = THREE.RepeatWrapping;
                            fallbackTexture.wrapT = THREE.RepeatWrapping;
                            fallbackTexture.repeat.set(5, 5);
                            resolve(fallbackTexture);
                        },
                        undefined,
                        fallbackError => {
                            console.error('Error loading fallback texture:', fallbackError);
                            resolve(null); // Resolve with null to continue without texture
                        }
                    );
                }
            );
        });

        // When texture is loaded (or failed), get the terrain model from AssetLoader
        texturePromise.then(texture => {
            // Get terrain model from AssetLoader
            const terrain = this.getModel('terrain/Terrain.glb');

            if (terrain) {
                console.log('Using terrain model from AssetLoader');

                // Remove the temporary floor
                if (floor) {
                    sceneToUse.remove(floor);
                    floor.geometry.dispose();
                    floor.material.dispose();
                }

                // Clone the model to avoid modifying the original
                const terrainClone = terrain.clone();

                // Scale the terrain appropriately
                const terrainScale = 100; // Adjust this value to change the overall size
                terrainClone.scale.set(terrainScale, terrainScale * 0.5, terrainScale);

                // Position terrain at center and slightly below zero to avoid z-fighting
                terrainClone.position.set(0, -0.2, 0);

                // Apply texture if available
                if (texture) {
                    terrainClone.traverse((node) => {
                        if (node.isMesh) {
                            node.material = node.material.clone(); // Clone material to avoid affecting other instances
                            node.material.map = texture;
                            node.material.needsUpdate = true;

                            // Enable shadows
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                }

                // Add to scene
                sceneToUse.add(terrainClone);
                
                console.log('Terrain model added to scene');
                
                // Return the created objects
                return { terrain: terrainClone, raycastFloor };
            } else {
                console.warn('Terrain model not found in AssetLoader, using fallback grid');

                // Create a grid as fallback
                const grid = new THREE.GridHelper(100, 100, 0x0000ff, 0x000044);
                grid.position.y = 0;
                sceneToUse.add(grid);
                
                // Return the created objects
                return { terrain: grid, raycastFloor };
            }
        });

        // Return initial objects
        return { floor, raycastFloor };
    }

    /**
     * Sets a ship model for a player
     * @param {string} type - The type of ship to set
     * @param {THREE.Scene} scene - The scene to add the ship to
     * @param {THREE.Object3D} existingShip - The existing ship to replace
     * @param {Function} onComplete - Callback when ship is set
     * @returns {THREE.Object3D} - The new ship model
     */
    setShipModel(type, scene, existingShip, onComplete) {
        console.log('🔍 Setting ship model:', type);
        const sceneToUse = scene || this.scene;
        
        if (!sceneToUse) {
            console.error('No scene provided to setShipModel');
            return null;
        }

        // Get the ship model from assets
        let model = this.getShipModel(type);

        // If model is null or undefined, create fallback model
        if (!model) {
            console.warn('⚠️ Using fallback ship model for type:', type);

            // Create a simple geometric shape as fallback
            const geometry = new THREE.BoxGeometry(1, 0.5, 2);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ffff,
                specular: 0x111111,
                shininess: 30
            });
            model = new THREE.Mesh(geometry, material);
        }

        // Clear existing ship if it exists
        if (existingShip) {
            if (sceneToUse) {
                sceneToUse.remove(existingShip);
            }
        }

        // Position the ship appropriately
        if (model && sceneToUse) {
            model.position.set(0, 0.5, 0);
            sceneToUse.add(model);
        }

        // Call the completion callback if provided
        if (onComplete && typeof onComplete === 'function') {
            onComplete(model);
        }

        return model;
    }

    /**
     * Adds a thruster glow effect to a player mesh
     * @param {THREE.Object3D} playerMesh - The player mesh to add the thruster to
     * @returns {Object} - The created thruster objects
     */
    addThrusterGlow(playerMesh) {
        // Check if player mesh exists
        if (!playerMesh) {
            console.warn('Cannot add thruster glow: Player mesh is not initialized');
            return null;
        }

        // Create a single, efficient thruster glow effect
        // Use instanced mesh for better performance if you have multiple thrusters

        // Create a glow for the thruster
        const thrusterGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 12);
        const thrusterMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending // Use additive blending for better glow effect
        });

        const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thruster.position.set(0, 0, -0.7); // Position at the back of the ship
        thruster.rotation.x = Math.PI / 2;
        thruster.name = 'thruster'; // Name it for easier reference later

        // Add thruster to player mesh
        playerMesh.add(thruster);

        // Add point light for the thruster
        const thrusterLight = new THREE.PointLight(0x00ffff, 1, 3);
        thrusterLight.position.copy(thruster.position);
        thrusterLight.name = 'thrusterLight';
        
        // Add light to player mesh
        playerMesh.add(thrusterLight);

        return { thruster, thrusterLight };
    }

    // UI-related methods moved from Game.js
    
    /**
     * Updates the loading UI with a message
     * @param {string} message - The message to display
     */
    updateLoadingUI(message) {
        // Call the callback if provided
        if (this.onProgress) {
            this.onProgress(message);
            return;
        }
        
        // Otherwise, update the UI directly
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const messageElement = loadingScreen.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * Shows an error screen with a message
     * @param {string} message - The error message to display
     */
    showErrorScreen(message) {
        // Call the callback if provided
        if (this.onError) {
            this.onError('ui', message);
            return;
        }
        
        // Otherwise, create and show the error screen directly
        let errorScreen = document.getElementById('error-screen');
        if (!errorScreen) {
            errorScreen = document.createElement('div');
            errorScreen.id = 'error-screen';
            errorScreen.className = 'error-screen';

            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorScreen.appendChild(errorMessage);

            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry';
            retryButton.onclick = () => {
                errorScreen.remove();
                this.loadingState = {
                    started: false,
                    completed: false,
                    errors: []
                };
                this.loadAll();
            };
            errorScreen.appendChild(retryButton);

            document.body.appendChild(errorScreen);
        }

        // Update error message
        const messageElement = errorScreen.querySelector('.error-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    /**
     * Checks the loading progress and updates the UI
     * @param {Function} onComplete - Callback when loading is complete
     */
    checkLoadingProgress(onComplete) {
        console.log('🔍 Checking asset loading progress...');

        // Log loading state
        console.log('Asset loading state:', JSON.stringify(this.loadingState, null, 2));

        if (this.loadingState.completed) {
            console.log('✅ All assets loaded!');
            
            // Call the completion callback if provided
            if (onComplete && typeof onComplete === 'function') {
                onComplete();
            }
        } else {
            // Update loading UI
            this.updateLoadingUI(`Loading assets...`);

            // Check again after a delay
            setTimeout(() => this.checkLoadingProgress(onComplete), 1000);
        }
    }
}

export default AssetLoader; 