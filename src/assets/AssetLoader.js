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
        const modelPaths = {
            'ship': 'assets/models/ships/avrocar_vz-9-av_experimental_aircraft.glb'
        };

        const loadPromises = Object.entries(modelPaths).map(([key, path]) => {
            return this.loadWithRetry(() => this.loadModel(loader, key, path));
        });

        await Promise.all(loadPromises);
    }

    async loadModel(loader, key, path) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Model loading timeout: ${key}`));
            }, 15000);

            loader.load(
                path,
                (gltf) => {
                    clearTimeout(timeoutId);
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
}

export default AssetLoader; 