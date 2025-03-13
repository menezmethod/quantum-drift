import {GameUI} from '../ui/GameUI';
import {MiniMap} from '../ui/MiniMap';
import {GAME_CONFIG} from '../config/GameConfig';
import * as THREE from 'three';
import {ShipSelectionUI} from '../ui/ShipSelectionUI';
import {Player} from '../entities/player/Player';
import AssetLoader from "../assets/AssetLoader";
import {SoundManager} from "../assets/SoundManager";
import {CONTROL_FEEDBACK, CONTROL_SETTINGS, ControlUtils, DEFAULT_CONTROL_STATE} from "../config/Controls";
import {InfiniteMap} from "./InfiniteMap";
import {NetworkManager} from "./NetworkManager";
import {CSS2DObject, CSS2DRenderer} from "three/addons/renderers/CSS2DRenderer";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader";

// Basic Three.js game with a ship
export class Game {
    constructor() {
        // Initialize all properties first
        // Player information
        this.playerName = 'Pilot';  // Default player name

        // Create the asset loader
        this.assetLoader = new AssetLoader().setCallbacks(
            (message) => this.updateLoadingUI(message),
            (type, error) => this.handleLoadError(type, error)
        );

        // Initialize SoundManager
        this.soundManager = new SoundManager();

        // Asset loading state
        this.loadingState = {
            started: false,
            completed: false,
            errors: []
        };

        // Track assets loading
        this.assetsLoaded = false;
        this.shipModelLoaded = false;

        // Initialize control state
        this.keys = {...DEFAULT_CONTROL_STATE};

        // Setup animation timing
        this.clock = new THREE.Clock();
        this.lastTime = Date.now();

        // Event handling - bind methods
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);

        // Debounce timers
        this.mouseMoveTimer = null;
        this.resizeTimer = null;
        this.weaponCooldowns = new Map();
        this.lastWeaponSwitch = 0;

        // Setup basic Three.js scene
        this.setupScene();

        // Create game UI
        this.ui = new GameUI();

        // Create player after scene setup (as specified in Task 8)
        this.player = new Player(this.scene, new THREE.Vector3(0, 0.5, 0), {
            type: 'PLAYER',
            shipModel: 'STANDARD',
            teamColor: 0x00ffff
        });
        this.scene.add(this.player.mesh);

        // For backward compatibility with existing code
        this.playerShip = this.player.mesh;

        // Game properties
        this.boundarySize = 100; // Size of the playable area

        // Initialize player state
        this.health = 100;
        this.maxHealth = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.energyRechargeRate = 20; // Units per second
        this.currentWeapon = 'LASER';

        // Initialize available weapons
        this.availableWeapons = ['LASER', 'GRENADE', 'BOUNCE'];
        this.weaponIndex = 0; // Start with LASER

        // Initialize remotePlayers map for multiplayer
        this.remotePlayers = new Map();
        
        // Initialize NetworkManager
        this.networkManager = new NetworkManager();
        this.setupNetworkEvents();
        
        // Add frame counter
        this.frameCount = 0;
        
        this.multiplayerEnabled = false;
        
        // Initialize enemyManager with empty array to prevent null references
        this.enemyManager = { enemies: [] };
        
        // Store the initialization promise for external code to await
        this.initialized = false;
        this.initPromise = this.init().then(() => {
            this.initialized = true;
            return this;
        }).catch(error => {
            console.error('Game initialization failed:', error);
            throw error;
        });
    }
    
    setupNetworkEvents() {
        this.networkManager.on('connected', () => {
            console.log('Connected to game server!');
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('connection-status').classList.add('connected');
        });

        this.networkManager.on('disconnected', () => {
            console.log('Disconnected from game server');
            document.getElementById('connection-status').textContent = 'Disconnected';
            document.getElementById('connection-status').classList.remove('connected');
        });

        this.networkManager.on('player_joined', (playerData) => {
            console.log('Player joined:', playerData);
            // Update player count
            this.updatePlayerCount();
        });

        this.networkManager.on('player_left', (id) => {
            console.log('Player left:', id);
            // Remove player mesh if it exists
            const player = this.remotePlayers.get(id);
            if (player) {
                this.scene.remove(player);
                this.remotePlayers.delete(id);
                console.log(`Removed remote player: ${id}`);
            }
            // Update player count
            this.updatePlayerCount();
        });

        // Add player update handling
        this.networkManager.on('player_update', (data) => {
            this.updateRemotePlayer(data.id, data.position, data.rotation);
        });

        // Add laser shot handling
        this.networkManager.on('laser_shot', (shotData) => {
            console.log('Received laser shot from network:', shotData);
            const position = new THREE.Vector3(shotData.origin.x, shotData.origin.y, shotData.origin.z);
            const direction = new THREE.Vector3(shotData.direction.x, shotData.direction.y, shotData.direction.z);

            if (shotData.type === 'bounce') {
                this.fireBouncingLaser(position, direction);
            } else {
                this.fireLaser(position, direction);
            }
        });

        // Add helper method to update player count
        this.updatePlayerCount = () => {
            const count = this.networkManager.getOtherPlayers().length + 1; // +1 for self
            document.getElementById('players-count').textContent = String(count);
        };
    }
    
    /**
     * Initialize the game asynchronously
     */
    async init() {
        try {
            // Load assets and wait for them to complete
            await this.loadAssets();
            
            // Only proceed with setup after assets are loaded
            // Setup controls
            this.setupControls();

            // Initialize infinite map after scene setup
            this.infiniteMap = new InfiniteMap(this);

            // Create mini-map (after scene setup) but keep it hidden initially
            this.miniMap = new MiniMap(this);
            this.miniMap.hide(); // Make sure it starts hidden

            // Handle window resize
            window.addEventListener('resize', this.boundHandleResize);

            console.log('Simple game initialized!');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showErrorScreen('Failed to initialize game. Please refresh the page.');
        }
    }

    setupScene() {
        // Create Three.js Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1f); // Dark blue background

        // Setup WebGL renderer
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Setup CSS2D renderer for labels
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('game-container').appendChild(this.labelRenderer.domElement);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near
            1000 // Far
        );

        // Position camera
        this.camera.position.set(0, 7, 15); // Slightly above and behind player
        this.camera.lookAt(0, 0, 0);

        // Attach audio listener to camera
        if (this.soundManager) {
            this.camera.add(this.soundManager.getListener());
            console.log('Audio listener attached to camera');
        }

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);

        // Create a simple grid floor
        this.createFloor();

        // Create some obstacles
        this.createObstacles();

        // Set the scene reference in the asset loader
        this.assetLoader.setScene(this.scene);
    }

    async loadAssets() {
        if (this.loadingState.started) {
            console.warn('🔍 Asset loading already in progress');
            return Promise.resolve(); // Return resolved promise
        }

        this.updateLoadingUI('Loading game assets...');
        this.loadingState.started = true;

        try {
            // Create initial player with default ship if not already created
            if (!this.player) {
                this.player = new Player(this.scene, new THREE.Vector3(0, 0.5, 0), {
                    type: 'PLAYER',
                    shipModel: 'STANDARD',
                    teamColor: 0x00ffff
                });
                this.playerShip = this.player.mesh; // For backward compatibility
            }

            // Load all assets through AssetLoader
            const assetsLoaded = await this.assetLoader.loadAll();
            
            if (assetsLoaded) {
                this.assetsLoaded = true;
                this.shipModelLoaded = true;
                console.log('✅ All assets loaded successfully');
            } else {
                console.warn('⚠️ Some assets may not have loaded correctly');
            }
            
            this.checkLoadingProgress();
            return Promise.resolve(assetsLoaded); // Return resolved promise with result
        } catch (error) {
            console.error('🔍 Critical error loading assets:', error);
            this.handleLoadError('critical', error);
            return Promise.reject(error); // Return rejected promise
        }
    }

    handleLoadError(assetType, error) {
        console.error(`Error loading ${assetType}:`, error);
        this.loadingState.errors.push({type: assetType, error: error.message});

        // Update UI with error
        this.updateLoadingUI(`Error loading ${assetType}. ${this.loadingState.errors.length} errors total.`);

        // If critical error, show error screen
        if (assetType === 'critical') {
            this.showErrorScreen('Failed to load game assets. Please refresh the page.');
        }
    }

    updateLoadingUI(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const messageElement = loadingScreen.querySelector('.loading-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    showErrorScreen(message) {
        // Create error screen if it doesn't exist
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
                this.loadAssets();
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

    checkLoadingProgress() {
        console.log('🔍 Checking loading progress...');

        // Log loading state
        console.log('Loading state:', JSON.stringify(this.loadingState, null, 2));

        // Define what's required for a fully loaded game
        const requiredAssets = {
            shipModel: this.shipModelLoaded,
            assetsLoaded: this.assetLoader.isLoaded()
        };

        // Check if all required assets are loaded
        const allAssetsLoaded = Object.entries(requiredAssets).every(([key, loaded]) => {
            console.log(`🔍 ${key}: ${loaded ? '✅' : '❌'}`);
            return loaded;
        });

        if (allAssetsLoaded) {
            console.log('✅ All required assets loaded!');
            this.loadingState.completed = true;
            this.showStartScreen();
        } else {
            // Log which assets are still pending
            const pendingAssets = Object.entries(requiredAssets)
                .filter(([_, loaded]) => !loaded)
                .map(([key]) => key);
            console.log('⏳ Still waiting for:', pendingAssets);

            // Update loading UI
            this.updateLoadingUI(`Loading... (${pendingAssets.join(', ')})`);

            // Check again after a delay
            setTimeout(() => this.checkLoadingProgress(), 1000);
        }
    }

    showStartScreen() {
        console.log('🔍 Attempting to show start screen');

        // Timeout to ensure UI has time to update
        setTimeout(() => {
            // Hide loading screen and show start screen
            const loadingScreen = document.getElementById('loading-screen');
            const startScreen = document.getElementById('start-screen');

            console.log('🔍 Loading screen element:', loadingScreen);
            console.log('🔍 Start screen element:', startScreen);

            if (loadingScreen) {
                console.log('🔍 Adding fade-out class to loading screen');
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    loadingScreen.classList.remove('fade-out');
                    console.log('🔍 Loading screen hidden');
                }, 500);
            } else {
                console.error('🔍 Loading screen element not found!');
            }

            if (startScreen) {
                console.log('🔍 Showing start screen');
                startScreen.classList.remove('hidden');
                startScreen.classList.add('fade-in');
            } else {
                console.error('🔍 Start screen element not found!');
            }

            console.log('🔍 Game ready to start!');
        }, 500);
    }

    addThrusterGlow() {
        // Use the AssetLoader's addThrusterGlow method
        if (!this.player || !this.player.mesh) {
            console.warn('Cannot add thruster glow: Player or player mesh is not initialized');
            return;
        }
        
        const thrusterObjects = this.assetLoader.addThrusterGlow(this.player.mesh);
        
        // Store references to the created objects
        if (thrusterObjects) {
            this.thruster = thrusterObjects.thruster;
            this.thrusterLight = thrusterObjects.thrusterLight;
            
            // Create a subtle, animated glow effect with proper initialization
            this.thrusterPulse = {
                value: 0,
                phase: 0
            };
        }
    }

    createFloor() {
        // Use the AssetLoader's createFloor method
        const floorObjects = this.assetLoader.createFloor(this.scene);
        
        // Store references to the created objects
        this.floor = floorObjects.floor;
        this.raycastFloor = floorObjects.raycastFloor;
        
        // The terrain will be set by the promise in AssetLoader.createFloor
        // We'll need to add a callback or handle this differently if we need immediate access
        
        // Create player highlight after floor is created
        this.createPlayerHighlight();
    }

    // Separate method for player highlight to avoid code duplication
    createPlayerHighlight() {
        // Add a circular highlight around the player's position
        const highlightGeometry = new THREE.CircleGeometry(5, 32);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
        });

        this.playerHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        this.playerHighlight.rotation.x = -Math.PI / 2;
        this.playerHighlight.position.y = 0.02; // Slightly above the floor
        this.scene.add(this.playerHighlight);
    }
    createObstacles() {
        // Create obstacle arrays
        this.obstacles = [];

        console.log('🚧 Creating immersive landscape with pathways and scattered crystals');

        // Define model categories and paths, with a focus on variety and character
        const obstacleCategories = {
            // Small to medium rocks
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
            // Expanded flora selection
            flora: [
                'Grass_01.glb',
                'Mushrooms.glb',
                'SP_Plant07.glb',
                'SP_Plant08.glb',
                'SmalRoots_01.glb',
                'Tenticles_01.glb',
                'BigPlant_06.glb'
            ],
            // Expanded ground features for creating pathways
            groundFeatures: [
                'objects/SP_Ground02.glb',
                'objects/SP_Ground03.glb',
                'objects/SP_Ground04.glb',
                'objects/SP_Ground05.glb'
            ],
            // Crystal clusters for interest points
            crystals: [
                'objects/SP_Crystal01.glb',
                'objects/SP_Stone01.glb'
            ],
            // Mountains for landscape borders and key landmarks
            mountains: [
                'objects/SP_Mountain01.glb',
                'objects/SP_Mountain02.glb',
                'objects/SP_Mountain03.glb'
            ]
        };

        // Enhanced distribution for a more detailed landscape
        const distribution = {
            rocks: 8,
            flora: 10,
            groundFeatures: 18,  // Increased from 12 to 18
            crystals: 9,
            mountains: 12  // Increased from 4 to 12
        };

        // Define some pre-made templates for object groupings
        const templates = [
            // Rock garden template
            {
                position: new THREE.Vector3(25, 0, 15),
                rotation: Math.PI / 6,
                elements: [
                    {category: 'rocks', modelIndex: 0, offset: new THREE.Vector3(0, 0, 0), scale: 2.0, rotation: 0},
                    {
                        category: 'rocks',
                        modelIndex: 2,
                        offset: new THREE.Vector3(3, 0, 1),
                        scale: 1.3,
                        rotation: Math.PI / 3
                    },
                    {
                        category: 'rocks',
                        modelIndex: 1,
                        offset: new THREE.Vector3(-2, 0, 2),
                        scale: 1.5,
                        rotation: Math.PI / 5
                    },
                    {category: 'flora', modelIndex: 1, offset: new THREE.Vector3(2, 0, 3), scale: 1.2, rotation: 0}
                ]
            },
            // Flora cluster template
            {
                position: new THREE.Vector3(-20, 0, -18),
                rotation: Math.PI / 4,
                elements: [
                    {category: 'flora', modelIndex: 4, offset: new THREE.Vector3(0, 0, 0), scale: 1.8, rotation: 0},
                    {
                        category: 'flora',
                        modelIndex: 0,
                        offset: new THREE.Vector3(2, 0, 2),
                        scale: 1.4,
                        rotation: Math.PI / 2
                    },
                    {
                        category: 'flora',
                        modelIndex: 3,
                        offset: new THREE.Vector3(-1.5, 0, 1),
                        scale: 1.2,
                        rotation: Math.PI / 6
                    },
                    {category: 'rocks', modelIndex: 3, offset: new THREE.Vector3(1, 0, -2), scale: 1.0, rotation: 0}
                ]
            },
            // Crystal formation template
            {
                position: new THREE.Vector3(-15, 0, 30),
                rotation: -Math.PI / 3,
                elements: [
                    {category: 'crystals', modelIndex: 0, offset: new THREE.Vector3(0, 0, 0), scale: 1.5, rotation: 0},
                    {
                        category: 'crystals',
                        modelIndex: 0,
                        offset: new THREE.Vector3(1.5, 0, 1),
                        scale: 1.0,
                        rotation: Math.PI / 2
                    },
                    {
                        category: 'crystals',
                        modelIndex: 0,
                        offset: new THREE.Vector3(-1, 0, 1.5),
                        scale: 0.8,
                        rotation: Math.PI / 4
                    },
                    {
                        category: 'groundFeatures',
                        modelIndex: 2,
                        offset: new THREE.Vector3(0, -0.2, 0),
                        scale: 1.8,
                        rotation: 0
                    }
                ]
            }
        ];

        // Create main pathways (4 paths coming from center, like a cross)
        const pathways = [
            {direction: new THREE.Vector3(1, 0, 0), width: 5},   // East
            {direction: new THREE.Vector3(-1, 0, 0), width: 5},  // West
            {direction: new THREE.Vector3(0, 0, 1), width: 5},   // North
            {direction: new THREE.Vector3(0, 0, -1), width: 5}   // South
        ];

        // Add some curved pathways to make it more interesting
        pathways.push(
            {
                direction: new THREE.Vector3(0.7, 0, 0.7),
                width: 4,
                curve: 0.8 // Will curve around
            },
            {
                direction: new THREE.Vector3(-0.7, 0, -0.7),
                width: 4,
                curve: -0.5 // Will curve the other way
            }
        );

        // Create some crystal gardens (clusters of crystals)
        const crystalGardens = [
            {x: 30, z: 30, radius: 8, count: 4},
            {x: -25, z: 20, radius: 6, count: 3},
            {x: 15, z: -35, radius: 10, count: 5}
        ];

        // Function to check if a position is near a pathway
        const isNearPathway = (x, z, pathWidth) => {
            for (const path of pathways) {
                // Create a vector from center to this position
                const posVector = new THREE.Vector3(x, 0, z);
                const length = posVector.length();

                // Normalize the vector to compare direction
                if (length > 0) posVector.divideScalar(length);

                // Check if this aligns with any pathway
                const dot = posVector.dot(path.direction);

                // If aligned with path direction and not too close to center
                if (dot > 0.7 && length > 15 && length < 40) {
                    // Calculate perpendicular distance to path
                    const perpFactor = Math.sqrt(1 - dot * dot) * length;
                    if (perpFactor < (path.width || pathWidth)) {
                        return true;
                    }

                    // For curved paths
                    if (path.curve) {
                        // Check if in a curved region
                        if (length > 20) {
                            // Apply curvature - this is simplified but creates a nice effect
                            const curveFactor = (length - 20) * path.curve * 0.1;
                            const curvePerp = Math.abs(perpFactor - curveFactor);
                            if (curvePerp < (path.width || pathWidth)) {
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        };

        // Function to check if position is in a crystal garden
// Load and place models as obstacles
        for (const [category, models] of Object.entries(obstacleCategories)) {
            const count = distribution[category];

            for (let i = 0; i < count; i++) {
                // Select a random model from this category
                const modelPath = models[Math.floor(Math.random() * models.length)];

                // Handle different paths based on category
                let fullPath;
                if (modelPath.includes('/')) {
                    // Path already includes the folder
                    fullPath = `assets/models/${modelPath}`;
                } else {
                    // Use the category as the folder
                    fullPath = `assets/models/${category}/${modelPath}`;
                }

                // Create position based on category
                let x, z;
                let attempts = 0;
                let isValid = false;
                let inGarden = null;

                while (!isValid && attempts < 30) {
                    attempts++;

                    if (category === 'groundFeatures') {
                        // Ground features go along pathways or in open areas
                        if (Math.random() < 0.7) {
                            // 70% along pathways
                            const angle = Math.random() * Math.PI * 2;
                            const distance = 15 + Math.random() * 25; // Between 15-40 from center
                            x = Math.cos(angle) * distance;
                            z = Math.sin(angle) * distance;

                            // If not near a pathway, try again
                            if (!isNearPathway(x, z, 6)) continue;
                        } else {
                            // 30% randomly placed
                            x = (Math.random() * 80) - 40;
                            z = (Math.random() * 80) - 40;
                        }
                    } else if (category === 'crystals') {
                        // Try to place in crystal gardens
                        if (Math.random() < 0.7) {
                            // 70% in crystal gardens
                            const garden = crystalGardens[Math.floor(Math.random() * crystalGardens.length)];
                            const angle = Math.random() * Math.PI * 2;
                            const distance = Math.random() * garden.radius;
                            x = garden.x + Math.cos(angle) * distance;
                            z = garden.z + Math.sin(angle) * distance;
                            inGarden = garden;
                        } else {
                            // 30% scattered elsewhere, avoiding pathways
                            x = (Math.random() * 70) - 35;
                            z = (Math.random() * 70) - 35;

                            // If near a pathway, try again
                            if (isNearPathway(x, z, 6)) continue;
                        }
                    } else if (category === 'mountains') {
                        // Mountains go on the periphery with more diverse placement
                        if (i < 4) {
                            // Place 4 mountains at the far corners of the map
                            const angle = (Math.PI / 4) + (i * Math.PI / 2); // Place at 45°, 135°, 225°, 315°
                            const distance = 40 + Math.random() * 5; // Between 40-45 from center
                            x = Math.cos(angle) * distance;
                            z = Math.sin(angle) * distance;
                        } else if (i < 8) {
                            // Place 4 mountains at cardinal directions, but further out
                            const angle = (i - 4) * Math.PI / 2; // Place at 0°, 90°, 180°, 270°
                            const distance = 42 + Math.random() * 8; // Between 42-50 from center
                            x = Math.cos(angle) * distance;
                            z = Math.sin(angle) * distance;
                        } else {
                            // Place remaining mountains randomly but still on periphery
                            const angle = Math.random() * Math.PI * 2;
                            const distance = 35 + Math.random() * 10; // Between 35-45 from center
                            x = Math.cos(angle) * distance;
                            z = Math.sin(angle) * distance;
                        }

                        // If near a pathway, try again (want mountains to border but not block paths)
                        if (isNearPathway(x, z, 8)) continue;
                    } else {
                        // Rocks and flora go anywhere but not on paths
                        x = (Math.random() * 80) - 40;
                        z = (Math.random() * 80) - 40;

                        // Avoid pathways for these obstacles
                        if (isNearPathway(x, z, 5)) continue;
                    }

                    // Keep all objects away from center spawn
                    if (Math.sqrt(x * x + z * z) < 15) continue;

                    // Position is valid
                    isValid = true;
                }

                if (!isValid) continue; // Skip if couldn't find valid position

                // Scale factors tailored by category and context
                let scale;
                if (category === 'rocks') {
                    scale = 1.5 + Math.random(); // Larger rocks (1.5-2.5)
                } else if (category === 'flora') {
                    scale = 1.2 + Math.random() * 0.8; // Taller flora (1.2-2.0)
                } else if (category === 'groundFeatures') {
                    if (isNearPathway(x, z, 6)) {
                        // Ground features along pathways have more consistent size
                        scale = 1.2 + Math.random() * 0.6; // Medium-sized ground (1.2-1.8)
                    } else {
                        // Ground features away from pathways can vary more
                        scale = 0.8 + Math.random() * 1.4; // Variable ground features (0.8-2.2)
                    }
                } else if (category === 'crystals') {
                    if (inGarden) {
                        // Varied crystal sizes in gardens
                        scale = 0.5 + Math.random() * 1.4; // Variety of sizes (0.5-1.9)
                    } else {
                        // Scattered crystals are smaller
                        scale = 0.7 + Math.random() * 0.6; // Smaller scattered (0.7-1.3)
                    }
                } else if (category === 'mountains') {
                    // More diverse mountain scales based on position
                    if (i < 4) {
                        // Corner mountains are largest
                        scale = 2.2 + Math.random() * 1.3; // Largest mountains (2.2-3.5)
                    } else if (i < 8) {
                        // Cardinal direction mountains are medium-large
                        scale = 1.8 + Math.random(); // Medium-large mountains (1.8-2.8)
                    } else {
                        // Random mountains have varied sizes
                        scale = 1.4 + Math.random() * 1.6; // Variable mountains (1.4-3.0)
                    }
                }

                // Use loader to get the model
                const loader = new GLTFLoader();
                loader.load(
                    fullPath,
                    (gltf) => {
                        const model = gltf.scene;

                        // Apply scale and position
                        model.scale.set(scale, scale, scale);
                        model.position.set(x, 0, z); // Will adjust y based on model size

                        // Add randomized rotation, except for ground features on pathways
                        if (category === 'groundFeatures' && isNearPathway(x, z, 6)) {
                            // Align with nearest pathway for ground features
                            const alignAngle = Math.atan2(z, x);
                            model.rotation.y = alignAngle + (Math.random() * 0.5 - 0.25); // Slight variation
                        } else {
                            model.rotation.y = Math.random() * Math.PI * 2;
                        }

                        // Enable shadows with optimization
                        model.traverse(node => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;

                                // Optimize materials while keeping visual quality
                                if (node.material) {
                                    // Add category-specific visual enhancements
                                    if (category === 'crystals' && modelPath.includes('Crystal')) {
                                        // Make crystals glow with random colors
                                        const crystalColors = [
                                            new THREE.Color(0x00ffff), // cyan
                                            new THREE.Color(0xff00ff), // magenta
                                            new THREE.Color(0x88bbff), // light blue
                                            new THREE.Color(0xffaa00)  // orange
                                        ];

                                        // Random crystal color
                                        node.material.emissive = crystalColors[Math.floor(Math.random() * crystalColors.length)];
                                        node.material.emissiveIntensity = 0.3 + Math.random() * 0.3; // 0.3-0.6
                                    } else if (category === 'mountains') {
                                        // Give mountains a slight purple/blue tint
                                        node.material.color = new THREE.Color(0x9090b0);
                                    } else if (category === 'groundFeatures') {
                                        // Give ground features varied earthy tones
                                        const groundColors = [
                                            new THREE.Color(0x908070), // tan
                                            new THREE.Color(0x807060), // brown
                                            new THREE.Color(0x708060), // olive
                                            new THREE.Color(0x606070)  // slate
                                        ];
                                        node.material.color = groundColors[Math.floor(Math.random() * groundColors.length)];
                                    }
                                }
                            }
                        });

                        // Add to scene
                        this.scene.add(model);

                        // IMPROVED COLLISION DETECTION: Use oriented bounding box for more accurate collisions
                        // First, compute an accurate bounding box
                        const bbox = new THREE.Box3().setFromObject(model);
                        const size = bbox.getSize(new THREE.Vector3());

                        // Use the improved ground placement calculation
                        model.position.y = this.calculateGroundOffset(model, category, scale);

                        // Generate compound collision shapes for more accurate collision detection
                        const collisionShapes = this.generateCompoundCollisionShapes(model, category, scale);

                        // Create better collision data with compound shapes
                        const obstacleData = {
                            mesh: model,
                            type: category,
                            // Advanced collision data
                            collisionShape: 'compound',
                            compoundShapes: collisionShapes.map(shape => {
                                // Transform shape centers to world coordinates
                                const worldCenter = shape.center.clone();
                                worldCenter.add(model.position);

                                return {
                                    ...shape,
                                    center: worldCenter,
                                    worldRotation: model.rotation.y + (shape.rotation || 0)
                                };
                            }),
                            // Keep bounding box for broad-phase checks
                            boundingBox: {
                                min: new THREE.Vector3(
                                    model.position.x - (size.x * scale / 2),
                                    model.position.y - (size.y * scale / 2),
                                    model.position.z - (size.z * scale / 2)
                                ),
                                max: new THREE.Vector3(
                                    model.position.x + (size.x * scale / 2),
                                    model.position.y + (size.y * scale / 2),
                                    model.position.z + (size.z * scale / 2)
                                ),
                                size: size.clone().multiplyScalar(scale),
                                rotation: model.rotation.y
                            },
                            // Also keep a simple radius for quick distance checks
                            size: Math.max(size.x, size.z) * scale * 0.5,
                            position: model.position.clone()
                        };

                        this.obstacles.push(obstacleData);

                        // Log first few obstacles for debugging
                        if (this.obstacles.length <= 3) {
                            console.log(`Created ${category} obstacle from ${modelPath}: width=${size.x * scale}, height=${size.y * scale}, depth=${size.z * scale} at [${model.position.x.toFixed(1)}, ${model.position.y.toFixed(1)}, ${model.position.z.toFixed(1)}]`);
                        }
                    },
                    undefined, // Progress callback
                    (error) => {
                        console.error(`Error loading obstacle model ${fullPath}:`, error);
                    }
                );
            }
        }

        // Create a special centerpiece crystal formation
        this.createCenterpiece();

        // Create template-based object groupings for more cohesive landscape
        this.createTemplateGroupings(templates, obstacleCategories);

        console.log(`Started loading ${Object.values(distribution).reduce((a, b) => a + b, 0)} obstacles with pathways and crystal gardens`);
    }

    /**
     * Create template-based object groupings
     */
    createTemplateGroupings(templates, categoryModels) {
        console.log('Creating template-based object groupings');

        templates.forEach((template, templateIndex) => {
            const templatePosition = template.position;
            const templateRotation = template.rotation;

            // Process each element in the template
            template.elements.forEach(element => {
                const category = element.category;

                // Get the model list for this category
                const models = categoryModels[category];
                if (!models || models.length === 0) return;

                // Select model by index or randomly if index is out of bounds
                const modelIndex = element.modelIndex < models.length ? element.modelIndex : Math.floor(Math.random() * models.length);
                const modelPath = models[modelIndex];

                // Handle different paths based on category
                let fullPath;
                if (modelPath.includes('/')) {
                    // Path already includes the folder
                    fullPath = `assets/models/${modelPath}`;
                } else {
                    // Use the category as the folder
                    fullPath = `assets/models/${category}/${modelPath}`;
                }

                // Calculate final position with rotation applied to offset
                const offset = element.offset.clone();

                // Apply template rotation to the offset
                if (templateRotation) {
                    // Create rotation matrix
                    const rotMatrix = new THREE.Matrix4().makeRotationY(templateRotation);
                    offset.applyMatrix4(rotMatrix);
                }

                // Final position combines template position and rotated offset
                const finalPosition = new THREE.Vector3(
                    templatePosition.x + offset.x,
                    templatePosition.y + offset.y,
                    templatePosition.z + offset.z
                );

                // Final rotation combines template rotation and element rotation
                const finalRotation = templateRotation + element.rotation;

                // Use loader to get the model
                const loader = new GLTFLoader();
                loader.load(
                    fullPath,
                    (gltf) => {
                        const model = gltf.scene;

                        // Apply scale
                        model.scale.set(element.scale, element.scale, element.scale);

                        // Set initial position
                        model.position.copy(finalPosition);

                        // Apply rotation
                        model.rotation.y = finalRotation;

                        // Enable shadows with appropriate material enhancements
                        model.traverse(node => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;

                                // Apply category-specific visual effects
                                if (node.material) {
                                    if (category === 'crystals') {
                                        // Crystal glow effect
                                        node.material.emissive = new THREE.Color(0x88bbff);
                                        node.material.emissiveIntensity = 0.3;
                                    }
                                }
                            }
                        });

                        // Add to scene
                        this.scene.add(model);

                        // Compute accurate bounding box
                        const bbox = new THREE.Box3().setFromObject(model);
                        const size = bbox.getSize(new THREE.Vector3());

                        // Use improved ground placement
                        const groundY = this.calculateGroundOffset(model, category, element.scale);
                        model.position.y = groundY + element.offset.y; // Apply any intentional Y offset

                        // Generate compound collision shapes
                        const collisionShapes = this.generateCompoundCollisionShapes(model, category, element.scale);

                        // Add to obstacles array with collision data
                        this.obstacles.push({
                            mesh: model,
                            type: category,
                            collisionShape: 'compound',
                            compoundShapes: collisionShapes.map(shape => {
                                // Transform shape centers to world coordinates
                                const worldCenter = shape.center.clone();
                                worldCenter.add(model.position);

                                return {
                                    ...shape,
                                    center: worldCenter,
                                    worldRotation: model.rotation.y + (shape.rotation || 0)
                                };
                            }),
                            boundingBox: {
                                min: new THREE.Vector3(
                                    model.position.x - (size.x * element.scale / 2),
                                    model.position.y - (size.y * element.scale / 2),
                                    model.position.z - (size.z * element.scale / 2)
                                ),
                                max: new THREE.Vector3(
                                    model.position.x + (size.x * element.scale / 2),
                                    model.position.y + (size.y * element.scale / 2),
                                    model.position.z + (size.z * element.scale / 2)
                                ),
                                size: size.clone().multiplyScalar(element.scale),
                                rotation: model.rotation.y
                            },
                            size: Math.max(size.x, size.z) * element.scale * 0.5,
                            position: model.position.clone()
                        });

                        console.log(`Template ${templateIndex + 1}: Added ${category} model at [${model.position.x.toFixed(1)}, ${model.position.y.toFixed(1)}, ${model.position.z.toFixed(1)}]`);
                    },
                    undefined,
                    (error) => {
                        console.error(`Error loading template model ${fullPath}:`, error);
                    }
                );
            });
        });
    }

    setupControls() {
        // Store active keys for visual feedback
        this.activeKeys = new Set();

        // Add visual indicators for controls
        this.createControlIndicators();

        // Detect if we're on a touch device
        this.isTouchDevice = 'ontouchstart' in window;

        // Keyboard controls
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);

        // Mouse controls - attach to the canvas for better precision
        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', this.boundHandleClick);
        canvas.addEventListener('mousemove', this.boundHandleMouseMove);

        // Setup touch controls for mobile devices
        if (this.isTouchDevice) {
            this.setupTouchControls();
        }
    }

    createControlIndicators() {
        console.log('Creating control indicators');
        // Create container if it doesn't exist
        if (!this.controlsContainer) {
            this.controlsContainer = document.createElement('div');
            this.controlsContainer.id = 'controls';
            this.controlsContainer.className = 'control-indicators';
            document.body.appendChild(this.controlsContainer);
            console.log('Control container created');
        }

        // Clear existing indicators
        this.controlsContainer.innerHTML = '';

        // Create the movement controls grid
        const movementControls = document.createElement('div');
        movementControls.className = 'movement-controls control-group';

        // Create the weapon controls section
        const weaponControls = document.createElement('div');
        weaponControls.className = 'weapon-controls control-group';

        // Define the key indicators for movement
        const movementKeys = [
            {id: 'forward', key: 'W', label: '⬆️', tooltip: 'Forward', gridArea: 'forward'},
            {id: 'backward', key: 'S', label: '⬇️', tooltip: 'Backward', gridArea: 'backward'},
            {id: 'left', key: 'A', label: '⬅️', tooltip: 'Turn Left', gridArea: 'left'},
            {id: 'right', key: 'D', label: '➡️', tooltip: 'Turn Right', gridArea: 'right'},
            {id: 'strafeLeft', key: 'Q', label: '↩️', tooltip: 'Strafe Left', gridArea: 'strafeLeft'},
            {id: 'strafeRight', key: 'E', label: '↪️', tooltip: 'Strafe Right', gridArea: 'strafeRight'},
            {id: 'fire', key: 'CLICK', label: '🔥', tooltip: 'Fire Weapon', gridArea: 'fire'}
        ];

        // Define the key indicators for weapons
        const weaponKeys = [
            {id: 'selectLaser', key: '1', label: '🔫', tooltip: 'Laser', className: 'weapon-key'},
            {id: 'selectGrenade', key: '2', label: '💣', tooltip: 'Grenade', className: 'weapon-key'},
            {id: 'selectBounce', key: '3', label: '↗️↘️', tooltip: 'Bounce Laser', className: 'weapon-key'},
            {id: 'switchWeapon', key: 'X', label: '🔄', tooltip: 'Switch Weapon', className: 'weapon-key'}
        ];

        // Create movement indicators
        movementKeys.forEach(keyInfo => {
            const indicator = document.createElement('div');
            indicator.id = `indicator-${keyInfo.id}`;
            indicator.className = `key-indicator ${keyInfo.className || ''}`;
            indicator.innerHTML = `
            <span class="key">${keyInfo.key}</span>
            <span class="label">${keyInfo.label}</span>
        `;
            indicator.title = keyInfo.tooltip;
            movementControls.appendChild(indicator);
        });

        // Create weapon indicators
        weaponKeys.forEach(keyInfo => {
            const indicator = document.createElement('div');
            indicator.id = `indicator-${keyInfo.id}`;
            indicator.className = `key-indicator ${keyInfo.className || ''}`;
            indicator.innerHTML = `
            <span class="key">${keyInfo.key}</span>
            <span class="label">${keyInfo.label}</span>
        `;
            indicator.title = keyInfo.tooltip;
            weaponControls.appendChild(indicator);
        });

        // Add a controls hint
        const hint = document.createElement('div');
        hint.className = 'controls-hint';
        hint.textContent = 'Press C to toggle controls visibility';

        // Add all elements to controls container
        this.controlsContainer.appendChild(movementControls);
        this.controlsContainer.appendChild(weaponControls);
        this.controlsContainer.appendChild(hint);

        console.log('Control indicators created with updated structure');
    }

    updateControlIndicators() {
        // Skip if control indicators aren't created yet
        if (!this.controlsContainer) return;

        // Update movement keys
        this.updateIndicatorState('forward', this.keys.forward);
        this.updateIndicatorState('backward', this.keys.backward);
        this.updateIndicatorState('left', this.keys.left);
        this.updateIndicatorState('right', this.keys.right);
        this.updateIndicatorState('strafeLeft', this.keys.strafeLeft);
        this.updateIndicatorState('strafeRight', this.keys.strafeRight);

        // Update fire state
        this.updateIndicatorState('fire', this.keys.fire);

        // Update weapon selection
        this.updateIndicatorState('selectLaser', this.currentWeapon === 'LASER');
        this.updateIndicatorState('selectGrenade', this.currentWeapon === 'GRENADE');
        this.updateIndicatorState('selectBounce', this.currentWeapon === 'BOUNCE');
    }

    updateIndicatorState(id, isActive) {
        const indicator = this.controlsContainer?.querySelector(`#indicator-${id}`);
        if (indicator) {
            if (isActive) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }

    handleResize() {
        // Debounce resize events
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.resizeTimer = setTimeout(() => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.resizeTimer = null;
        }, 100);
    }

    handleKeyDown(event) {
        // Handle escape key for in-game menu
        if (event.code === 'Escape') {
            this.showInGameMenu();
            return;
        }

        // Handle 'C' key to toggle controls visibility
        if (event.code === 'KeyC') {
            console.log('C key pressed - toggling controls');
            this.toggleControls();
            return;
        }

        // Handle 'M' key to toggle mini-map
        if (event.code === 'KeyM') {
            this.toggleMiniMap();
            return;
        }

        // Get control action from key mapping
        const action = ControlUtils.getActionForKey(event.code);

        // Skip if key isn't mapped or event is repeated
        if (!action || event.repeat) return;

        // Handle weapon selection
        if (action.category === 'WEAPONS') {
            if (action.action === 'SWITCH_WEAPON') {
                this.cycleWeapon();
                return;
            } else if (action.action === 'SELECT_LASER') {
                this.selectWeapon('LASER');
                return;
            } else if (action.action === 'SELECT_GRENADE') {
                this.selectWeapon('GRENADE');
                return;
            } else if (action.action === 'SELECT_BOUNCE') {
                this.selectWeapon('BOUNCE');
                return;
            }
        }

        // Handle UI controls
        if (action.category === 'UI') {
            if (action.action === 'TOGGLE_MAP') {
                this.toggleMiniMap();
                return;
            } else if (action.action === 'TOGGLE_CONTROLS') {
                this.toggleControls();
                return;
            }
        }

        // Set key state to active
        if (action.category === 'MOVEMENT') {
            this.keys[action.action.toLowerCase()] = true;
        }

        // Store active key for visual feedback
        this.activeKeys.add(event.code);

        // Update control indicators
        this.updateControlIndicators();

        // Prevent default browser behavior for game controls
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'KeyM'].includes(event.code)) {
            event.preventDefault();
        }
    }

    handleKeyUp(event) {
        const action = ControlUtils.getActionForKey(event.code);
        if (!action) return;

        // Skip weapon selection keys on keyup
        if (action.category === 'WEAPONS' && action.action.startsWith('SELECT_')) {
            return;
        }

        // Set key state to inactive
        if (action.category === 'MOVEMENT') {
            this.keys[action.action.toLowerCase()] = false;
        } else if (action.category === 'WEAPONS') {
            this.keys[action.action.toLowerCase()] = false;
        } else if (action.category === 'UI') {
            this.keys[action.action.toLowerCase()] = false;
        }

        // Remove from active keys
        this.activeKeys.delete(event.code);

        // Update control indicators
        this.updateControlIndicators();
    }

    handleClick(event) {
        // Ensure we have a valid event object
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        // Prevent rapid-fire clicking
        const now = Date.now();
        const weaponCooldown = this.weaponCooldowns.get(this.currentWeapon) || 0;

        if (now < weaponCooldown) {
            return;
        }

        // Get click coordinates relative to canvas
        const rect = this.renderer.domElement.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);

        if (typeof clientX !== 'number' || typeof clientY !== 'number') {
            console.warn('Invalid click coordinates');
            return;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Convert to normalized device coordinates
        new THREE.Vector2(
            (x / this.renderer.domElement.clientWidth) * 2 - 1,
            -(y / this.renderer.domElement.clientHeight) * 2 + 1
        );
// Handle weapon-specific targeting
        if (this.currentWeapon === 'GRENADE') {
            this.handleGrenadeTargeting({
                clientX,
                clientY,
                preventDefault: () => {
                } // Add dummy preventDefault for consistency
            });
        } else {
            this.handleDirectionalFiring({clientX, clientY});
        }
    }

    handleMouseMove(event) {
        // Skip if we're moving too frequently (throttle)
        if (this.mouseMoveTimer) {
            return;
        }

        // Use requestAnimationFrame for smoother updates
        this.mouseMoveTimer = requestAnimationFrame(() => {
            // Get mouse coordinates relative to canvas
            const rect = this.renderer.domElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Update targeting indicators for any weapon type
            this.updateTargetingIndicator({
                clientX: event.clientX,
                clientY: event.clientY
            });

            // Additional targeting for grenade if that's the current weapon
            if (this.currentWeapon === 'GRENADE') {
                this.updateGrenadeTargetingIndicator({
                    clientX: event.clientX,
                    clientY: event.clientY
                });
            }

            this.mouseMoveTimer = null;
        });
    }

    handleFireAction() {
        const now = Date.now();
        const weaponCooldown = this.weaponCooldowns.get(this.currentWeapon) || 0;

        if (now < weaponCooldown) {
            return;
        }

        // Set cooldown based on weapon type
        const cooldownTime = this.currentWeapon === 'GRENADE' ? 1000 :
            this.currentWeapon === 'BOUNCE' ? 500 :
                200;

        this.weaponCooldowns.set(this.currentWeapon, now + cooldownTime);
        this.fireCurrentWeapon();
    }

    setupTouchControls() {
        // Create touch control container
        const touchControls = document.createElement('div');
        touchControls.className = 'touch-controls';
        document.body.appendChild(touchControls);

        // Create virtual joystick for movement
        const joystickContainer = document.createElement('div');
        joystickContainer.className = 'joystick-container';
        touchControls.appendChild(joystickContainer);

        const joystick = document.createElement('div');
        joystick.className = 'joystick';
        joystickContainer.appendChild(joystick);

        const joystickKnob = document.createElement('div');
        joystickKnob.className = 'joystick-knob';
        joystick.appendChild(joystickKnob);

        // Create fire button
        const fireButton = document.createElement('div');
        fireButton.className = 'touch-button fire-button';
        fireButton.innerHTML = CONTROL_FEEDBACK.INDICATORS.ACTIONS.find(a => a.id === 'fire').label;
        touchControls.appendChild(fireButton);

        // Create weapon switch button
        const weaponButton = document.createElement('div');
        weaponButton.className = 'touch-button weapon-button';
        weaponButton.innerHTML = CONTROL_FEEDBACK.INDICATORS.WEAPONS.find(w => w.id === 'switchWeapon').label;
        touchControls.appendChild(weaponButton);

        // Joystick handling
        let joystickActive = false;
        let joystickOrigin = {x: 0, y: 0};

        joystick.addEventListener('touchstart', (e) => {
            joystickActive = true;
            const touch = e.touches[0];
            const rect = joystick.getBoundingClientRect();
            joystickOrigin.x = rect.left + rect.width / 2;
            joystickOrigin.y = rect.top + rect.height / 2;
            handleJoystickMove(touch);
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (joystickActive) {
                const touch = e.touches[0];
                handleJoystickMove(touch);
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', (e) => {
            if (joystickActive) {
                joystickActive = false;
                joystickKnob.style.transform = 'translate(0, 0)';

                // Reset movement keys using DEFAULT_CONTROL_STATE
                Object.keys(DEFAULT_CONTROL_STATE).forEach(key => {
                    if (key.startsWith('forward') || key.startsWith('backward') ||
                        key.startsWith('left') || key.startsWith('right') ||
                        key.startsWith('strafe')) {
                        this.keys[key] = DEFAULT_CONTROL_STATE[key];
                    }
                    e.preventDefault();
                });

                this.updateControlIndicators();
            }
        });

        const handleJoystickMove = (touch) => {
            const maxDistance = CONTROL_SETTINGS.TOUCH.JOYSTICK_MAX_DISTANCE;
            const deadZone = CONTROL_SETTINGS.TOUCH.JOYSTICK_DEAD_ZONE;

            // Calculate distance from center
            const dx = touch.clientX - joystickOrigin.x;
            const dy = touch.clientY - joystickOrigin.y;

            // Limit distance to maxDistance
            const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
            const angle = Math.atan2(dy, dx);

            // Move joystick knob
            const knobX = distance * Math.cos(angle);
            const knobY = distance * Math.sin(angle);
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

            // Convert joystick position to key presses using deadzone
            this.keys.forward = dy < -deadZone;
            this.keys.backward = dy > deadZone;
            this.keys.left = dx < -deadZone;
            this.keys.right = dx > deadZone;

            this.updateControlIndicators();
        };

        // Fire button handling with weapon cooldown
        let lastFireTime = 0;
        fireButton.addEventListener('touchstart', (e) => {
            const now = Date.now();
            const cooldown = CONTROL_SETTINGS.WEAPON_COOLDOWNS[this.currentWeapon];

            if (now - lastFireTime >= cooldown) {
                this.keys.fire = true;
                this.fireCurrentWeapon();
                lastFireTime = now;
            }

            this.updateControlIndicators();
            e.preventDefault();
        });

        fireButton.addEventListener('touchend', (e) => {
            this.keys.fire = false;
            this.updateControlIndicators();
            e.preventDefault();
        });

        // Weapon switch button handling with cooldown
        let lastWeaponSwitchTime = 0;
        weaponButton.addEventListener('touchstart', (e) => {
            const now = Date.now();
            if (now - lastWeaponSwitchTime >= 200) { // 200ms cooldown for weapon switching
                this.cycleWeapon();
                lastWeaponSwitchTime = now;
            }
            e.preventDefault();
        });

        // Enable directional fire on game area tap
        const gameArea = document.querySelector('canvas');
        if (gameArea) {
            let lastTapTime = 0;

            gameArea.addEventListener('touchstart', (e) => {
                // Ignore if touch is in control areas
                const touch = e.touches[0];
                const isInControlArea =
                    touchControls.contains(document.elementFromPoint(touch.clientX, touch.clientY));

                if (!isInControlArea && this.playerShip) {
                    const now = Date.now();
                    const doubleTapDelay = CONTROL_SETTINGS.TOUCH.DOUBLE_TAP_DELAY;

                    // Check for double tap
                    if (now - lastTapTime < doubleTapDelay) {
                        // Handle double tap action (e.g., special weapon)
                        this.cycleWeapon();
                    } else {
                        // Handle single tap (directional firing)
                        const touchX = touch.clientX;
                        const touchY = touch.clientY;

                        // Handle directional firing similarly to mouse
                        const touchPoint = new THREE.Vector2(
                            (touchX / window.innerWidth) * 2 - 1,
                            -(touchY / window.innerHeight) * 2 + 1
                        );

                        // Use raycasting to determine the point in 3D space
                        const raycaster = new THREE.Raycaster();
                        raycaster.setFromCamera(touchPoint, this.camera);

                        // Check for intersection with the floor
                        const intersects = raycaster.intersectObject(this.floor);

                        if (intersects.length > 0) {
                            const targetPoint = intersects[0].point;

                            // Calculate the direction from the player to the target point
                            const shipPosition = this.playerShip.position.clone();
                            const direction = targetPoint.clone().sub(shipPosition).normalize();

                            // Only care about horizontal direction (ignore y component)
                            direction.y = 0;
                            direction.normalize();

                            // Store the original rotation
                            const originalRotation = this.playerShip.rotation.clone();

                            // Temporarily rotate the ship to face the target
                            this.playerShip.lookAt(shipPosition.clone().add(direction));

                            // Fire the weapon in that direction
                            if (this.currentWeapon === 'GRENADE') {
                                // For grenades, we simulate a tap at the target location
                                const targetEvent = {
                                    clientX: touchX,
                                    clientY: touchY,
                                    preventDefault: () => {
                                    }
                                };
                                this.handleGrenadeTargeting(targetEvent);
                            } else {
                                // For lasers and bounce, fire in the direction
                                this.fireCurrentWeapon(direction);
                            }

                            // Restore the original rotation
                            this.playerShip.rotation.copy(originalRotation);
                        }
                    }

                    lastTapTime = now;
                    e.preventDefault();
                }
            });
        }
    }

    toggleControls() {
        // Clear any existing timeout
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = null;
        }

        // Also clear any auto-fade timeout
        if (this.controlsFadeTimeout) {
            clearTimeout(this.controlsFadeTimeout);
            this.controlsFadeTimeout = null;
        }

        if (!this.controlsContainer) {
            this.createControlIndicators();
        }

        if (this.controlsContainer.classList.contains('visible')) {
            this.fadeOutControls();
        } else {
            this.fadeInControls();
        }
    }

    fadeInControls() {
        console.log('Fading in controls');

        // Clear any existing fade timeout
        if (this.controlsFadeTimeout) {
            clearTimeout(this.controlsFadeTimeout);
            this.controlsFadeTimeout = null;
        }

        if (this.controlsContainer) {
            // Remove any classes that might hide the controls
            this.controlsContainer.classList.remove('hidden', 'fading');
            // Add the visible class
            this.controlsContainer.classList.add('visible');
            console.log('Controls should now be visible with class: visible');

            // Set a timeout to automatically fade out the controls after 5 seconds
            // (but only if we're in the game and not in a menu)
            if (this.isRunning) {
                this.controlsFadeTimeout = setTimeout(() => {
                    console.log('Auto-hiding controls after timeout');
                    this.fadeOutControls();
                }, 5000);
            }
        } else {
            console.warn('Control container not found during fade in');
            // Try to create controls if they don't exist
            this.createControlIndicators();
            // And then try to show them
            if (this.controlsContainer) {
                this.controlsContainer.classList.add('visible');

                // Also set the auto-fade timeout for the newly created controls
                // (but only if we're in the game and not in a menu)
                if (this.isRunning) {
                    this.controlsFadeTimeout = setTimeout(() => {
                        console.log('Auto-hiding newly created controls after timeout');
                        this.fadeOutControls();
                    }, 5000);
                }
            }
        }
    }

    fadeOutControls() {
        console.log('Fading out controls');

        // Clear any existing fade timeout
        if (this.controlsFadeTimeout) {
            clearTimeout(this.controlsFadeTimeout);
            this.controlsFadeTimeout = null;
        }

        if (this.controlsContainer) {
            // First add the fading class for the transition
            this.controlsContainer.classList.add('fading');
            this.controlsContainer.classList.remove('visible');

            // After the transition completes, add the hidden class
            setTimeout(() => {
                if (this.controlsContainer) {
                    this.controlsContainer.classList.add('hidden');
                }
            }, 500); // Match the transition time from CSS
        } else {
            console.warn('Control container not found during fade out');
        }
    }

    updateWeaponUI() {
        // Update UI to reflect weapon change
        if (this.ui) {
            this.ui.updateWeapon(this.currentWeapon);

            // Update targeting indicator color if it exists
            if (this.targetingIndicator) {
                const colors = {
                    'LASER': new THREE.Color(0x00ffff),
                    'GRENADE': new THREE.Color(0xff4500),
                    'BOUNCE': new THREE.Color(0x00ff99)
                };
                const color = colors[this.currentWeapon] || colors['LASER'];

                this.targetingIndicator.children.forEach(child => {
                    if (child.material) {
                        child.material.color = color;
                    }
                });
            }
        }

        // Log weapon change
        console.log('Weapon updated:', this.currentWeapon);
    }

    selectWeapon(weaponType) {
        console.log('Selecting specific weapon:', weaponType);
        const index = this.availableWeapons.indexOf(weaponType);
        if (index !== -1) {
            this.weaponIndex = index;
            this.currentWeapon = weaponType;
            console.log('Weapon selection successful');

            // Update UI to reflect weapon change
            this.updateWeaponUI();

            // Play weapon switch sound if available
            this.playSound('weapon-switch');
        } else {
            console.warn('Attempted to select unavailable weapon:', weaponType);
        }
    }

    cycleWeapon() {
        console.log('Cycling weapon from:', this.currentWeapon);
        this.weaponIndex = (this.weaponIndex + 1) % this.availableWeapons.length;
        this.currentWeapon = this.availableWeapons[this.weaponIndex];
        console.log('New weapon selected:', this.currentWeapon);

        // Update UI to reflect weapon change
        this.updateWeaponUI();

        // Play weapon switch sound
        this.playSound('weapon-switch');
    }

    fireGrenade() {
        console.log("Grenade weapon selected - click to target");
    }

    animate() {
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;

        // Skip animation if game is paused
        if (this.paused) return;

        // Update physics
        if (this.player) this.updatePlayer(deltaTime);

        // Network updates
        if (this.networkManager && this.multiplayerEnabled) {
            this.sendPlayerPositionUpdate();
        }

        // Update other players if they exist
        if (typeof this.updateOtherPlayers === 'function') {
            this.updateOtherPlayers();
        }

        // Update lasers
        this.updateLasers(deltaTime);

        // Update bouncing lasers if available
        if (typeof this.updateBouncingLasers === 'function') {
            this.updateBouncingLasers();
        }

        // Update grenades if there are any
        if (this.grenades && this.grenades.length > 0) {
            this.updateGrenades(deltaTime);
        }

        // Check for collisions
        this.checkObstacleCollisions();

        // Update camera
        this.updateCamera();

        // Update energy
        this.updateEnergy(deltaTime);

        // Update thruster effects for player ship
        this.updateThrusterEffects(deltaTime);

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // Render CSS2D labels
        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    updatePlayer(deltaTime) {
        if (!this.playerShip) return;

        // Save original position in case we need to revert due to collision
        const originalPosition = this.playerShip.position.clone();

        // ORIGINAL SHIP MOVEMENT PHYSICS
        const moveSpeed = 10; // Base movement speed
        const rotateSpeed = 2.5; // Base rotation speed

        let moved = false; // Track if the ship moved

        // Handle forward/backward movement
        if (this.keys.forward) {
            // Move forward
            const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerShip.quaternion);
            this.playerShip.position.addScaledVector(forwardDir, moveSpeed * deltaTime);
            moved = true;
        } else if (this.keys.backward) {
            // Move backward
            const backwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerShip.quaternion);
            this.playerShip.position.addScaledVector(backwardDir, moveSpeed * deltaTime);
            moved = true;
        }

        // Handle left/right rotation
        if (this.keys.left) {
            // Rotate left
            this.playerShip.rotation.y += rotateSpeed * deltaTime;
            moved = true;
        } else if (this.keys.right) {
            // Rotate right
            this.playerShip.rotation.y -= rotateSpeed * deltaTime;
            moved = true;
        }

        // Update player highlight to follow the player ship
        if (this.playerHighlight) {
            this.playerHighlight.position.x = this.playerShip.position.x;
            this.playerHighlight.position.z = this.playerShip.position.z;

            // Add a subtle pulsing effect to the highlight
            const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2;
            this.playerHighlight.material.opacity = 0.05 + pulseFactor * 0.1;
        }

        // Check for collisions after movement
        if (moved) {
            this.checkObstacleCollisions();

            // If no collisions, update thruster effects
            if (typeof this.updateThrusterEffects === 'function') {
                this.updateThrusterEffects();
            }

            // Send position update to server if multiplayer is enabled
            if (this.multiplayerEnabled && this.networkManager && this.networkManager.isConnected()) {
                this.sendPlayerPositionUpdate();
            }
        }
    }

    updateLasers(deltaTime) {
        if (!this.lasers) return;

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];

            // Move laser
            laser.mesh.position.add(laser.direction.clone().multiplyScalar(laser.speed));

            // Update trail effect
            laser.trailPoints.push(laser.mesh.position.clone());
            if (laser.trailPoints.length > 8) { // Reduced trail length for better performance
                laser.trailPoints.shift();
            }

            // Update trail geometry
            const positions = new Float32Array(laser.trailPoints.length * 3);
            for (let j = 0; j < laser.trailPoints.length; j++) {
                positions[j * 3] = laser.trailPoints[j].x;
                positions[j * 3 + 1] = laser.trailPoints[j].y;
                positions[j * 3 + 2] = laser.trailPoints[j].z;
            }
            laser.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            // Pulse effect
            laser.pulsePhase += 0.3;
            const pulse = Math.sin(laser.pulsePhase) * 0.2 + 0.8;
            laser.mesh.material.opacity = pulse;
            const light = laser.mesh.children[0];
            if (light) {
                light.intensity = pulse * 2;
            }

            // Increment lifetime
            laser.lifeTime++;

            // Remove old lasers
            if (laser.lifeTime > laser.maxLifeTime) {
                this.scene.remove(laser.mesh);
                this.scene.remove(laser.trail);
                this.lasers.splice(i, 1);
                continue;
            }

            // Check for collisions with obstacles
            for (let j = 0; j < this.obstacles.length; j++) {
                const obstacle = this.obstacles[j];

                // Simple distance check
                if (laser.mesh.position.distanceTo(obstacle.position) < 1.5) {
                    // Create enhanced hit effect
                    this.createEnhancedHitEffect(laser.mesh.position.clone(), laser.direction.clone());

                    // Remove laser
                    this.scene.remove(laser.mesh);
                    this.scene.remove(laser.trail);
                    this.lasers.splice(i, 1);
                    break;
                }
            }

            // Check for collisions with other players
            let hitOtherPlayer = false;
            if (this.otherPlayerObjects && laser.ownerId !== this.networkManager?.playerId) {
                for (const playerId in this.otherPlayerObjects) {
                    const playerObject = this.otherPlayerObjects[playerId];
                    if (!playerObject || !playerObject.ship) continue;

                    const playerPos = playerObject.ship.position.clone();
                    playerPos.y = 0.5; // Adjust to match laser height

                    // Check collision with remote player
                    const hitDistance = 1.0; // Collision distance for player hits
                    if (laser.mesh.position.distanceTo(playerPos) < hitDistance) {
                        console.log(`Laser hit remote player: ${playerId}`);

                        // Create hit effect at player position
                        this.createEnhancedHitEffect(playerPos, laser.direction.clone());

                        // Apply damage to remote player (25 damage for regular laser)
                        if (this.networkManager) {
                            this.networkManager.sendDamageEvent(playerId, 25);
                        }

                        // Remove laser after hit
                        this.scene.remove(laser.mesh);
                        this.scene.remove(laser.trail);
                        this.lasers.splice(i, 1);

                        hitOtherPlayer = true;
                        break;
                    }
                }

                if (hitOtherPlayer) continue;
            }

            // Check for collisions with enemies
            if (this.enemyManager && this.enemyManager.enemies && this.enemyManager.enemies.length > 0) {
                for (let j = this.enemyManager.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemyManager.enemies[j];
                    if (!enemy.isActive) continue;

                    const enemyPos = enemy.mesh.position.clone();
                    enemyPos.y = 0.5; // Adjust to match laser height

                    // Check if the laser hit the enemy
                    const hitDistance = 0.7; // Collision distance for enemy hits
                    if (laser.mesh.position.distanceTo(enemyPos) < hitDistance) {
                        console.log(`Laser hit enemy ${enemy.id}`);

                        // Apply damage to the enemy (25 damage for regular laser)
                        enemy.takeDamage(25);

                        // Create hit effect
                        this.createHitEffect(enemyPos);

                        // Remove laser after hit
                        this.scene.remove(laser.mesh);
                        this.scene.remove(laser.trail);
                        this.lasers.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }

    createEnhancedHitEffect(position, direction) {
        // Create a burst of particles
        const particleCount = 15;
        const particles = [];

        // Create particle material
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < particleCount; i++) {
            // Create small particle geometry
            const particleGeometry = new THREE.PlaneGeometry(0.1, 0.1);
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());

            // Position at hit point
            particle.position.copy(position);

            // Random velocity based on impact direction
            const spread = Math.PI / 2; // 90 degree spread
            const angle = Math.random() * spread - spread / 2;
            const speed = 0.2 + Math.random() * 0.3;

            // Calculate velocity
            particle.userData.velocity = direction.clone()
                .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
                .multiplyScalar(speed);
            particle.userData.life = 1.0; // Full life

            this.scene.add(particle);
            particles.push(particle);
        }

        // Add impact flash
        const flashGeometry = new THREE.CircleGeometry(0.3, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        flash.lookAt(position.clone().add(direction));
        this.scene.add(flash);

        // Add point light
        const light = new THREE.PointLight(0x00ffff, 2, 4);
        light.position.copy(position);
        this.scene.add(light);

        // Animate particles
        let frame = 0;
        const animate = () => {
            frame++;

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];

                // Move particle
                particle.position.add(particle.userData.velocity);

                // Reduce life
                particle.userData.life -= 0.05;

                // Update opacity
                particle.material.opacity = particle.userData.life;

                // Remove dead particles
                if (particle.userData.life <= 0) {
                    this.scene.remove(particle);
                    particles.splice(i, 1);
                }
            }

            // Update flash
            flash.scale.addScalar(0.2);
            flashMaterial.opacity *= 0.8;

            // Update light
            light.intensity *= 0.8;

            // Continue animation if particles remain
            if (particles.length > 0 && frame < 20) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(flash);
                this.scene.remove(light);
            }
        };

        // Start animation
        animate();
    }

    checkObstacleCollisions() {
        if (!this.playerShip || !this.infiniteMap) {
            console.log('Skipping collision check - player ship or infinite map not available');
            return;
        }

        // Get player collision info
        const playerRadius = this.playerShip.userData.collisionRadius || 0.35;
        const playerPos = this.playerShip.position.clone();

        // Create player sphere for collision checks
        const playerSphere = {
            center: playerPos,
            radius: playerRadius
        };

        // Check collisions with infinite map objects first
        const mapCollision = this.infiniteMap.checkCollisions(playerPos, playerRadius);

        if (mapCollision.collided) {
            // Handle collision from infinite map
            this.handleObjectCollision(playerPos, mapCollision.object.position, mapCollision.object.type || 'terrain');
            return; // Stop checking after handling one collision
        }

        // Check local obstacles with more accurate collision detection
        for (const obstacle of this.obstacles) {
            if (!obstacle.mesh) continue;

            // First, do a quick broad-phase check with spheres for efficiency
            const obstaclePos = obstacle.position.clone();
            const distance = playerPos.distanceTo(obstaclePos);
            const quickCheckDistance = playerRadius + obstacle.size;

            // Skip detailed check if clearly not colliding
            if (distance > quickCheckDistance * 1.5) continue;

            // Determine if collision happened based on shape type
            let collision = false;

            if (obstacle.collisionShape === 'compound' && obstacle.compoundShapes) {
                // Use compound shape collision detection for complex objects
                collision = this.checkCompoundCollision(playerSphere, obstacle.compoundShapes);
            } else if (obstacle.collisionShape === 'complex' && obstacle.boundingBox) {
                // Fall back to oriented bounding box if compound shapes not available
                collision = this.checkBoxCollision(
                    playerPos, playerRadius,
                    obstacle.boundingBox,
                    obstacle.boundingBox.rotation
                );
            } else {
                // Simplest case: sphere-based collision for backward compatibility
                collision = distance < quickCheckDistance;
            }

            if (collision) {
                // Handle the collision
                this.handleObjectCollision(playerPos, obstaclePos, obstacle.type);
                break; // Only handle one collision at a time
            }
        }
    }

    /**
     * Check collision between player (sphere) and obstacle (compound shapes)
     */
    checkCompoundCollision(playerSphere, compoundShapes) {
        // Check collision against each shape in the compound
        for (const shape of compoundShapes) {
            let collision = false;

            if (shape.type === 'box') {
                // Box vs sphere collision
                collision = this.checkBoxSphereCollision(
                    shape.center,
                    shape.halfExtents,
                    shape.worldRotation || 0,
                    playerSphere
                );
            } else if (shape.type === 'sphere') {
                // Sphere vs sphere collision (simpler case)
                const distance = playerSphere.center.distanceTo(shape.center);
                collision = distance < (playerSphere.radius + shape.radius);
            }

            if (collision) {
                return true; // Collision with any part means collision with the compound
            }
        }

        return false; // No collision with any part
    }

    /**
     * Check collision between a rotated box and a sphere
     */
    checkBoxSphereCollision(boxCenter, boxHalfExtents, boxRotation, sphere) {
        // Transform sphere center to box space (accounting for rotation)
        const toSphere = new THREE.Vector3().subVectors(sphere.center, boxCenter);

        // Apply inverse rotation to get into box space
        if (boxRotation) {
            const rotMatrix = new THREE.Matrix4().makeRotationY(-boxRotation);
            toSphere.applyMatrix4(rotMatrix);
        }

        // Find closest point on box to sphere in box space
        const closestPoint = new THREE.Vector3(
            Math.max(-boxHalfExtents.x, Math.min(boxHalfExtents.x, toSphere.x)),
            Math.max(-boxHalfExtents.y, Math.min(boxHalfExtents.y, toSphere.y)),
            Math.max(-boxHalfExtents.z, Math.min(boxHalfExtents.z, toSphere.z))
        );

        // If using rotation, convert closest point back to world space
        let worldClosestPoint;
        if (boxRotation) {
            const rotMatrix = new THREE.Matrix4().makeRotationY(boxRotation);
            worldClosestPoint = closestPoint.clone().applyMatrix4(rotMatrix).add(boxCenter);
        } else {
            worldClosestPoint = closestPoint.clone().add(boxCenter);
        }

        // Calculate squared distance from closest point to sphere center (for efficiency)
        const squaredDistance = sphere.center.distanceToSquared(worldClosestPoint);

        // Collision occurs if distance is less than sphere radius squared
        return squaredDistance < (sphere.radius * sphere.radius);
    }

    /**
     * Handle collision with any object
     */
    handleObjectCollision(playerPos, objectPos, objectType) {
        console.log(`COLLISION DETECTED with ${objectType}: Pushing ship back`);

        // Push player away from obstacle
        const pushDir = new THREE.Vector3()
            .subVectors(playerPos, objectPos)
            .normalize();

        // Adjust push force based on object type
        let pushForce = 0.7; // Default push force
        let damageAmount = 5; // Default damage

        // Customize collision response based on type
        switch (objectType) {
            case 'rocks':
                pushForce = 0.85; // Rocks push strongly
                damageAmount = 8;
                break;
            case 'specialObjects':
            case 'groundFeatures':
                pushForce = 0.75; // Ground features push medium
                damageAmount = 6;
                break;
            case 'mountains':
                pushForce = 1.0; // Mountains push very strongly
                damageAmount = 10;
                break;
            case 'crystals':
                pushForce = 0.7; // Crystals push medium but with special effect
                damageAmount = 7;

                // Add special crystal collision effect
                this.createCrystalCollisionEffect(objectPos);
                break;
            case 'centerpiece':
                pushForce = 0.9; // Centerpiece pushes strongly
                damageAmount = 9;

                // Add special centerpiece collision effect
                this.createCrystalCollisionEffect(objectPos, true);
                break;
            case 'flora':
                pushForce = 0.6; // Flora pushes gently
                damageAmount = 3;
                break;
            default:
                // Use default values
                break;
        }

        // Apply the push force
        this.playerShip.position.addScaledVector(pushDir, pushForce);

        // Flash collision warning
        this.flashCollisionWarning();

        // Apply damage if the function exists
        if (typeof this.applyDamage === 'function') {
            this.applyDamage(damageAmount);
        }

        // Play appropriate collision sound based on object type
        let soundToPlay = 'collision';

        if (objectType === 'specialObjects') {
            // Crystal-like sounds for special objects
            soundToPlay = 'crystalHit';
        } else if (objectType === 'mountains') {
            // Heavy impact for mountains
            soundToPlay = 'heavyImpact';
        }

        // Play the sound if it exists, otherwise fall back to default collision
        if (this.playSound) {
            try {
                this.playSound(soundToPlay);
            } catch (e) {
                // Fall back to default if sound doesn't exist
                try {
                    this.playSound('collision');
                } catch (e2) {
                    // No sound available
                }
            }
        }
    }

    /**
     * Check collision between player (sphere) and obstacle (oriented box)
     */
    checkBoxCollision(playerPos, playerRadius, box, rotation) {
        // Get box center
        const boxCenter = new THREE.Vector3(
            (box.min.x + box.max.x) / 2,
            (box.min.y + box.max.y) / 2,
            (box.min.z + box.max.z) / 2
        );

        // Calculate half extents of box
        const halfExtents = new THREE.Vector3(
            (box.max.x - box.min.x) / 2,
            (box.max.y - box.min.y) / 2,
            (box.max.z - box.min.z) / 2
        );

        // Vector from box center to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, boxCenter);

        // If we have rotation, apply inverse rotation to convert to box space
        if (rotation) {
            // Create rotation matrix for the box (negative rotation to invert)
            const rotMatrix = new THREE.Matrix4().makeRotationY(-rotation);
            toPlayer.applyMatrix4(rotMatrix);
        }

        // Find closest point on the box to the player in box space
        const closestPoint = new THREE.Vector3(
            Math.max(-halfExtents.x, Math.min(halfExtents.x, toPlayer.x)),
            Math.max(-halfExtents.y, Math.min(halfExtents.y, toPlayer.y)),
            Math.max(-halfExtents.z, Math.min(halfExtents.z, toPlayer.z))
        );

        // If using rotation, convert closest point back to world space
        let worldClosestPoint;
        if (rotation) {
            // Create rotation matrix for the box
            const rotMatrix = new THREE.Matrix4().makeRotationY(rotation);
            worldClosestPoint = closestPoint.clone().applyMatrix4(rotMatrix).add(boxCenter);
        } else {
            worldClosestPoint = closestPoint.clone().add(boxCenter);
        }

        // Calculate squared distance from closest point to player center
        const squaredDistance = playerPos.distanceToSquared(worldClosestPoint);

        // Collision occurs if distance is less than player radius squared
        return squaredDistance < (playerRadius * playerRadius);
    }

    updateCamera() {
        // Check if cameraTargetPosition is initialized
        if (!this.cameraTargetPosition) {
            this.cameraTargetPosition = new THREE.Vector3();
            this.cameraTargetLookAt = new THREE.Vector3();
            this.cameraSmoothingFactor = 0.05;
        }

        // If playerShip doesn't exist, early return
        if (!this.playerShip) return;

        // Define the camera offset from the player
        const offsetY = 18; // Height above the player
        const offsetZ = -16; // Distance behind the player (adjusted for larger ship)

        // Get the player's forward direction vector (simplified)
        const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerShip.quaternion);

        // Calculate camera target position (directly above and slightly behind player)
        this.cameraTargetPosition.copy(this.playerShip.position);
        this.cameraTargetPosition.y += offsetY;

        // Move camera back based on player's orientation
        const backOffset = forwardDir.clone().multiplyScalar(offsetZ);
        this.cameraTargetPosition.add(backOffset);

        // Smoothly move camera toward target position
        this.camera.position.lerp(this.cameraTargetPosition, this.cameraSmoothingFactor);

        // Make camera look at the player
        this.cameraTargetLookAt.copy(this.playerShip.position);
        this.camera.lookAt(this.cameraTargetLookAt);
    }

    updateThrusterEffects(deltaTime) {
        // Skip if ship model isn't loaded
        if (!this.shipModel || !this.thruster || !this.thrusterLight) return;

        // Use stored references instead of finding children each time
        const {thruster, thrusterLight} = this;

        // Base thruster scale and opacity on movement
        const isMovingForward = this.keys.forward;
        const isMovingBackward = this.keys.backward;

        // Update thruster pulse for ambient animation
        this.thrusterPulse.value = (this.thrusterPulse.value + 0.1) % (Math.PI * 2);
        const pulseEffect = Math.sin(this.thrusterPulse.value) * 0.1;

        if (isMovingForward) {
            // Full thruster when moving forward
            const randomScale = 1 + Math.random() * 0.2 + pulseEffect;
            thruster.scale.set(1, 1, randomScale);
            thruster.material.opacity = 0.7 + Math.random() * 0.3;
            thrusterLight.intensity = 1.2 + Math.random() * 0.3 + pulseEffect;

            // Add color variation for a more dynamic effect
            const hue = (Date.now() % 1000) / 1000; // Cycle through colors over time
            thruster.material.color.setHSL(hue, 1, 0.5);
            thrusterLight.color.setHSL(hue, 1, 0.5);
        } else if (isMovingBackward) {
            // Reduced thruster when moving backward
            const randomScale = 0.3 + Math.random() * 0.1 + pulseEffect * 0.5;
            thruster.scale.set(0.5, 0.5, randomScale);
            thruster.material.opacity = 0.4 + Math.random() * 0.2;
            thrusterLight.intensity = 0.6 + Math.random() * 0.2 + pulseEffect * 0.5;

            // Cooler color for reverse thrust
            thruster.material.color.setHSL(0.6, 1, 0.5); // Blue-ish
            thrusterLight.color.setHSL(0.6, 1, 0.5);
        } else {
            // Idle state with subtle pulsing
            const idleScale = 0.3 + pulseEffect;
            thruster.scale.set(0.3, 0.3, idleScale);
            thruster.material.opacity = 0.3 + pulseEffect;
            thrusterLight.intensity = 0.4 + pulseEffect;

            // Neutral color for idle
            thruster.material.color.setHSL(0.5, 0.7, 0.5); // Cyan-ish
            thrusterLight.color.setHSL(0.5, 0.7, 0.5);
        }

        // Performance optimization: only update material if it's visible
        if (thruster.material.opacity < 0.01) {
            thruster.visible = false;
            thrusterLight.visible = false;
        } else {
            thruster.visible = true;
            thrusterLight.visible = true;
        }
    }

    flashCollisionWarning() {
        // Create a full-screen flash effect for collision
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'collision-flash';
        document.body.appendChild(flashOverlay);

        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(flashOverlay);
        }, 150);
    }

    updateEnergy(deltaTime) {
        // Validate parameters
        if (typeof deltaTime !== 'number' || deltaTime < 0) {
            console.warn('Invalid deltaTime in updateEnergy:', deltaTime);
            return;
        }

        // Initialize energy values if undefined
        if (typeof this.energy !== 'number') this.energy = 0;
        if (typeof this.maxEnergy !== 'number') this.maxEnergy = 100;
        if (typeof this.energyRechargeRate !== 'number') this.energyRechargeRate = 20;

        // Store old energy for change detection
        const oldEnergy = this.energy;

        // Calculate recharge amount
        const rechargeAmount = this.energyRechargeRate * deltaTime;

        // Apply recharge with bounds checking
        this.energy = Math.min(this.maxEnergy, this.energy + rechargeAmount);

        // Update UI only if energy changed
        if (this.energy !== oldEnergy) {
            if (this.ui && typeof this.ui.updateEnergy === 'function') {
                this.ui.updateEnergy(this.energy, this.maxEnergy);
            }

            // Play charging sound when energy is low (under 10%)
            if (this.energy < (this.maxEnergy * 0.1)) {
                this.playSound('weapon-charging');
            }

            // Log significant energy changes (more than 1 unit) for debugging
            if (Math.abs(this.energy - oldEnergy) > 1) {
                console.log(`Energy updated: ${oldEnergy.toFixed(1)} -> ${this.energy.toFixed(1)} (Δ${deltaTime.toFixed(3)}s)`);
            }
        }
    }

    updateGrenades(deltaTime) {
        if (!this.grenades || this.grenades.length === 0) return;

        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const grenade = this.grenades[i];

            // If the grenade has exploded, handle explosion effects
            if (grenade.exploded) {
                // Increase the explosion radius until maximum
                grenade.explosionMesh.scale.addScalar(0.2);
                grenade.explosionLight.intensity -= 0.1;

                // Remove explosion after it's done
                if (grenade.explosionLight.intensity <= 0) {
                    this.scene.remove(grenade.explosionMesh);
                    this.scene.remove(grenade.trail);
                    this.grenades.splice(i, 1);
                }
                continue;
            }

            // Update the grenade position along the arc
            grenade.progress += 0.02;

            if (grenade.progress >= 1) {
                // Explode when reaching the target
                this.explodeGrenade(grenade, i);
            } else {
                // Move along a quadratic bezier curve for arcing trajectory
                const p0 = grenade.startPos;
                const p1 = grenade.midPos;
                const p2 = grenade.endPos;

                // Quadratic bezier formula: p = (1-t)^2 * p0 + 2(1-t)t * p1 + t^2 * p2
                const t = grenade.progress;
                const oneMinusT = 1 - t;

                grenade.mesh.position.x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
                grenade.mesh.position.y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
                grenade.mesh.position.z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * p1.z + t * t * p2.z;

                // Add trail effect
                const point = grenade.mesh.position.clone();
                grenade.trailPoints.push(point);

                // Keep only the last 20 trail points
                if (grenade.trailPoints.length > 20) {
                    grenade.trailPoints.shift();
                }

                // Update trail geometry
                const positions = new Float32Array(grenade.trailPoints.length * 3);
                for (let j = 0; j < grenade.trailPoints.length; j++) {
                    positions[j * 3] = grenade.trailPoints[j].x;
                    positions[j * 3 + 1] = grenade.trailPoints[j].y;
                    positions[j * 3 + 2] = grenade.trailPoints[j].z;
                }

                grenade.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                grenade.trail.geometry.attributes.position.needsUpdate = true;
            }
        }
    }

    explodeGrenade(grenade, index) {
        // Remove the grenade mesh
        this.scene.remove(grenade.mesh);

        // Create explosion geometry
        const explosionGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionMesh.position.copy(grenade.mesh.position);

        // Add to scene
        this.scene.add(explosionMesh);

        // Add explosion light
        const explosionLight = new THREE.PointLight(0xff6600, 3, 10);
        explosionMesh.add(explosionLight);

        // Mark as exploded
        grenade.exploded = true;
        grenade.explosionMesh = explosionMesh;
        grenade.explosionLight = explosionLight;

        // Calculate damage radius
        const explosionCenter = grenade.mesh.position.clone();
        const maxDamage = 100; // Maximum damage at center
        const damageRadius = grenade.explosionRadius || 10; // Default radius of 10 units

        // Check for obstacle hits in explosion radius
        for (const obstacle of this.obstacles) {
            const distance = obstacle.position.distanceTo(explosionCenter);
            if (distance < damageRadius) {
                // Calculate damage based on distance (linear falloff)
                const damagePercent = 1 - (distance / damageRadius);
                const hitPoint = obstacle.position.clone().add(
                    explosionCenter.clone().sub(obstacle.position).normalize().multiplyScalar(distance * 0.8)
                );
                this.createHitEffect(hitPoint);
            }
        }

        // Check for enemy damage
        if (this.enemyManager && this.enemyManager.enemies && this.enemyManager.enemies.length > 0) {
            for (const enemy of this.enemyManager.enemies) {
                if (!enemy.isActive) continue;

                const enemyPosition = enemy.mesh.position.clone();
                enemyPosition.y = 0; // Project to ground plane
                const grenadePosition = explosionCenter.clone();
                grenadePosition.y = 0; // Project to ground plane

                const enemyDistance = enemyPosition.distanceTo(grenadePosition);
                if (enemyDistance < damageRadius) {
                    // Calculate damage with distance falloff
                    const damagePercent = 1 - (enemyDistance / damageRadius);
                    const damage = Math.floor(maxDamage * damagePercent);

                    // Apply damage to enemy
                    enemy.takeDamage(damage);

                    // Visual feedback
                    this.createHitEffect(enemyPosition);
                }
            }
        }

        // Check for player damage
        const playerPosition = this.playerShip.position.clone();
        playerPosition.y = 0; // Project to ground plane
        const grenadePosition = explosionCenter.clone();
        grenadePosition.y = 0; // Project to ground plane

        const playerDistance = playerPosition.distanceTo(grenadePosition);
        if (playerDistance < damageRadius) {
            // Calculate damage with distance falloff
            const damagePercent = 1 - (playerDistance / damageRadius);
            const damage = Math.floor(maxDamage * damagePercent);

            // Apply damage to player
            this.health = Math.max(0, this.health - damage);

            // Update UI
            if (this.ui) {
                this.ui.updateHealth(this.health, this.maxHealth);
            }

            // Visual feedback
            this.flashCollisionWarning();
            this.createHitEffect(playerPosition);
        }
    }

    updateBouncingLasers() {
        if (!this.bouncingLasers || this.bouncingLasers.length === 0) return;

        const playerPos = this.playerShip ? this.playerShip.position.clone() : null;
        const tempRay = new THREE.Ray();  // For collision detection
        const tempVector = new THREE.Vector3();  // For temporary calculations

        // Update each laser
        for (let i = this.bouncingLasers.length - 1; i >= 0; i--) {
            const laser = this.bouncingLasers[i];

            // Skip invalid lasers
            if (!laser || !laser.mesh) continue;

            // Calculate next position before moving
            const nextPosition = laser.mesh.position.clone().add(
                laser.direction.clone().multiplyScalar(laser.speed)
            );

            // Check for collisions with obstacles
            let collision = false;
            let closestPoint = null;
            let closestDistance = Infinity;
            let closestNormal = null;
            let bounced = false;

            // Set up ray for collision detection
            tempRay.origin.copy(laser.mesh.position);
            tempRay.direction.copy(laser.direction);

            // Check for collision with each obstacle
            for (const obstacle of this.obstacles) {
                if (!obstacle.mesh) continue;  // Skip obstacles without meshes

                let intersection = null;
                let normal = null;

                // Get obstacle bounding sphere
                const boundingSphere = new THREE.Sphere(
                    obstacle.position.clone(),
                    obstacle.size || 1
                );

                // Do quick sphere check first
                intersection = tempRay.intersectSphere(boundingSphere, tempVector);

                if (intersection) {
                    // If we hit the bounding sphere, do a more precise check if possible
                    if (obstacle.boundingBox) {
                        // Use box collision if available
                        const boxCenter = new THREE.Vector3();
                        
                        // Instead of using getCenter (which doesn't exist), calculate center from min and max
                        if (obstacle.boundingBox.min && obstacle.boundingBox.max) {
                            boxCenter.addVectors(obstacle.boundingBox.min, obstacle.boundingBox.max).multiplyScalar(0.5);
                        } else {
                            boxCenter.copy(obstacle.position);
                        }
                        
                        // Get size (either from directly stored size or calculate from min/max)
                        let halfExtents;
                        if (obstacle.boundingBox.size) {
                            halfExtents = obstacle.boundingBox.size.clone().multiplyScalar(0.5);
                        } else if (obstacle.boundingBox.min && obstacle.boundingBox.max) {
                            // Calculate size from min and max
                            halfExtents = new THREE.Vector3()
                                .subVectors(obstacle.boundingBox.max, obstacle.boundingBox.min)
                                .multiplyScalar(0.5);
                        } else {
                            // Fallback if neither is available
                            halfExtents = new THREE.Vector3(obstacle.size || 1, obstacle.size || 1, obstacle.size || 1);
                        }

                        const boxIntersection = this.rayBoxIntersection(
                            laser.mesh.position,
                            laser.direction,
                            boxCenter,
                            halfExtents,
                            obstacle.boundingBox.rotation || 0
                        );

                        if (boxIntersection) {
                            intersection = boxIntersection.point;
                            normal = boxIntersection.normal;
                        }
                    } else {
                        // Otherwise use sphere intersection
                            normal = intersection.clone().sub(obstacle.position).normalize();
                        }

                    // Update closest collision point
                    const distance = laser.mesh.position.distanceTo(intersection);
                    if (distance < closestDistance && distance < laser.speed * 1.2) {
                        closestDistance = distance;
                        closestPoint = intersection;
                        closestNormal = normal;
                        collision = true;
                    }
                }
            }

            // Handle bounce if collision found
            if (collision && closestPoint && closestNormal) {
                // Position at intersection point
                laser.mesh.position.copy(closestPoint);

                // Calculate reflection direction
                const dot = laser.direction.dot(closestNormal);
                const reflection = laser.direction.clone()
                    .sub(closestNormal.multiplyScalar(2 * dot))
                    .normalize();

                // Add some randomness to the bounce
                const randomAngle = (Math.random() - 0.5) * 0.2; // Small random angle
                reflection.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
                laser.direction.copy(reflection);

                // Increment bounce count
                laser.bounces++;

                // Create bounce effect
                this.createBounceEffect(closestPoint.clone(), closestNormal.clone());

                // Play bounce sound
                this.playSound('bounce');

                // Enable player collision after first bounce
                laser.canHitPlayer = true;

                // Increase speed slightly with each bounce
                laser.speed *= 1.1;

                bounced = true;
            }

            // If no bounce occurred, move normally
            if (!bounced) {
                laser.mesh.position.copy(nextPosition);
            }

            // Rest of the existing laser update code...
        }
    }

    /**
     * Helper method to check ray-box intersection
     * @param {THREE.Vector3} rayOrigin - Origin of the ray
     * @param {THREE.Vector3} rayDirection - Direction of the ray
     * @param {THREE.Vector3} boxCenter - Center of the box
     * @param {THREE.Vector3} halfExtents - Half-extents of the box
     * @param {number} rotation - Y-axis rotation of the box
     * @returns {Object|null} Intersection point and normal, or null if no intersection
     */
    rayBoxIntersection(rayOrigin, rayDirection, boxCenter, halfExtents, rotation = 0) {
        // Transform ray to box space
        const rayStart = rayOrigin.clone().sub(boxCenter);
        const rayDir = rayDirection.clone();

        // Apply inverse rotation if box is rotated
        if (rotation !== 0) {
            const rotMatrix = new THREE.Matrix4().makeRotationY(-rotation);
            rayStart.applyMatrix4(rotMatrix);
            rayDir.applyMatrix4(rotMatrix);
        }

        // Calculate intersection with axis-aligned box
        const invDir = new THREE.Vector3(
            1.0 / rayDir.x,
            1.0 / rayDir.y,
            1.0 / rayDir.z
        );

        const t1 = new THREE.Vector3(
            (-halfExtents.x - rayStart.x) * invDir.x,
            (-halfExtents.y - rayStart.y) * invDir.y,
            (-halfExtents.z - rayStart.z) * invDir.z
        );

        const t2 = new THREE.Vector3(
            (halfExtents.x - rayStart.x) * invDir.x,
            (halfExtents.y - rayStart.y) * invDir.y,
            (halfExtents.z - rayStart.z) * invDir.z
        );

        const tmin = new THREE.Vector3(
            Math.min(t1.x, t2.x),
            Math.min(t1.y, t2.y),
            Math.min(t1.z, t2.z)
        );

        const tmax = new THREE.Vector3(
            Math.max(t1.x, t2.x),
            Math.max(t1.y, t2.y),
            Math.max(t1.z, t2.z)
        );

        const realTmin = Math.max(Math.max(tmin.x, tmin.y), tmin.z);
        const realTmax = Math.min(Math.min(tmax.x, tmax.y), tmax.z);

        // No intersection
        if (realTmax < 0 || realTmin > realTmax) {
            return null;
        }

        // Calculate intersection point
        const point = rayStart.clone().add(rayDir.multiplyScalar(realTmin));

        // Calculate normal
        const normal = new THREE.Vector3();
        const epsilon = 0.000001;

        if (Math.abs(point.x - halfExtents.x) < epsilon) normal.set(1, 0, 0);
        else if (Math.abs(point.x + halfExtents.x) < epsilon) normal.set(-1, 0, 0);
        else if (Math.abs(point.y - halfExtents.y) < epsilon) normal.set(0, 1, 0);
        else if (Math.abs(point.y + halfExtents.y) < epsilon) normal.set(0, -1, 0);
        else if (Math.abs(point.z - halfExtents.z) < epsilon) normal.set(0, 0, 1);
        else if (Math.abs(point.z + halfExtents.z) < epsilon) normal.set(0, 0, -1);

        // Transform point and normal back to world space
        if (rotation !== 0) {
            const rotMatrix = new THREE.Matrix4().makeRotationY(rotation);
            point.applyMatrix4(rotMatrix);
            normal.applyMatrix4(rotMatrix);
        }

        point.add(boxCenter);

        return { point, normal };
    }

    // Create a special effect for laser bounces
    createBounceEffect(position, normal) {
        // Create a particle burst effect at the bounce point
        const particleCount = 20;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Add a flash of light at bounce point
        const bounceLight = new THREE.PointLight(0x00ffcc, 3, 5);
        bounceLight.position.copy(position);
        this.scene.add(bounceLight);

        // Create a ring effect at bounce point
        const ringGeometry = new THREE.RingGeometry(0.1, 0.5, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);

        // Orient the ring according to the normal
        if (Math.abs(normal.y) > 0.99) { // If normal is pointing mainly up/down
            ring.rotation.x = Math.PI / 2; // Rotate to lie flat
                    } else {
            // Point the ring along the normal
            const rotationAxis = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
            const angle = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
            ring.setRotationFromAxisAngle(rotationAxis, angle);
        }

        this.scene.add(ring);

        // Create particles around bounce point
        for (let i = 0; i < particleCount; i++) {
            // Random direction from bounce point
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();

            // Bias direction toward normal
            direction.add(normal.clone().multiplyScalar(2)).normalize();

            // Starting at bounce point
            const startPoint = position.clone();
            particlePositions[i * 3] = startPoint.x;
            particlePositions[i * 3 + 1] = startPoint.y;
            particlePositions[i * 3 + 2] = startPoint.z;

            // Random sizes for particles
            particleSizes[i] = Math.random() * 0.1 + 0.05;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffcc,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);

        // Store particle velocities
        const particleVelocities = [];
        for (let i = 0; i < particleCount; i++) {
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();

            // Bias direction toward normal
            direction.add(normal.clone().multiplyScalar(1.5)).normalize();

            // Random speed
            const speed = Math.random() * 0.1 + 0.05;
            particleVelocities.push(direction.multiplyScalar(speed));
        }

        // Animate particles and effects
        let frameCount = 0;
        const maxFrames = 30;

        const animate = () => {
            frameCount++;

            // Update particles
            const positions = particles.geometry.attributes.position.array;

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += particleVelocities[i].x;
                positions[i * 3 + 1] += particleVelocities[i].y;
                positions[i * 3 + 2] += particleVelocities[i].z;

                // Slow down particles over time
                particleVelocities[i].multiplyScalar(0.95);
            }

            particles.geometry.attributes.position.needsUpdate = true;

            // Fade the light
            bounceLight.intensity *= 0.85;

            // Expand and fade the ring
            ring.scale.addScalar(0.15);
            ring.material.opacity *= 0.9;

            // Fade the particles
            particles.material.opacity *= 0.92;

            if (frameCount < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(bounceLight);
                this.scene.remove(ring);
                this.scene.remove(particles);
            }
        };

        // Start animation
        animate();
    }

    // Now add new methods to handle grenade targeting
    updateGrenadeTargetingIndicator(event) {
        // Create targeting indicator if it doesn't exist
        if (!this.grenadeTargetIndicator) {
            // Create targeting indicator
            const targetGeometry = new THREE.RingGeometry(0.2, 0.3, 32);
            const targetMaterial = new THREE.MeshBasicMaterial({
                color: 0xff4500,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            this.grenadeTargetIndicator = new THREE.Mesh(targetGeometry, targetMaterial);
            this.grenadeTargetIndicator.rotation.x = Math.PI / 2; // Make it horizontal

            // Add pulsing animation
            this.grenadeTargetIndicator.pulse = 0;

            // Add to scene
            this.scene.add(this.grenadeTargetIndicator);
        }

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Raycasting to get the point on the floor
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Use raycastFloor for consistent targeting
        const intersects = raycaster.intersectObject(this.raycastFloor);

        if (intersects.length > 0) {
            const targetPoint = intersects[0].point;

            // Check if the target is within maximum range
            const maxRange = 20;
            const shipPosition = this.playerShip.position.clone();
            shipPosition.y = 0; // Project to ground plane

            // Vector from ship to target
            const toTarget = targetPoint.clone().sub(shipPosition);
            const distance = toTarget.length();

            // Update indicator color based on range
            if (distance > maxRange) {
                this.grenadeTargetIndicator.material.color.set(0xff0000); // Red for out of range
            } else {
                this.grenadeTargetIndicator.material.color.set(0x00ff00); // Green for valid
            }

            // Position the targeting indicator
            this.grenadeTargetIndicator.position.copy(targetPoint);
            this.grenadeTargetIndicator.position.y = 0.1; // Slightly above floor

            // Pulse animation
            this.grenadeTargetIndicator.pulse += 0.1;
            const scale = 1 + 0.2 * Math.sin(this.grenadeTargetIndicator.pulse);
            this.grenadeTargetIndicator.scale.set(scale, scale, scale);

            // Store target point for launching
            this.grenadeTargetPoint = targetPoint.clone();
        }
    }

    handleGrenadeTargeting(event) {
        // Ensure we have a valid event object
        if (event && event.preventDefault && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        // Validate energy before proceeding
        if (!this.energy || !this.maxEnergy) {
            console.warn('Energy values invalid:', {energy: this.energy, maxEnergy: this.maxEnergy});
            return;
        }

        // Check if we have enough energy - now requires FULL energy
        if (this.energy < this.maxEnergy) {
            console.log("Not enough energy for grenade");
            return;
        }

        // Validate event coordinates
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);

        if (typeof clientX !== 'number' || typeof clientY !== 'number') {
            console.warn('Invalid grenade target coordinates');
            return;
        }

        // Get the position where to throw the grenade
        const mouse = new THREE.Vector2(
            (clientX / window.innerWidth) * 2 - 1,
            -(clientY / window.innerHeight) * 2 + 1
        );

        // Raycasting to get the point on the floor
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Use raycastFloor for consistent targeting
        const intersects = raycaster.intersectObject(this.raycastFloor);

        if (intersects.length > 0) {
            const targetPoint = intersects[0].point;

            // Check if the target is within maximum range
            const maxRange = 20;
            const shipPosition = this.playerShip.position.clone();
            shipPosition.y = 0; // Project to ground plane

            // Vector from ship to target
            const toTarget = targetPoint.clone().sub(shipPosition);
            const distance = toTarget.length();

            // If beyond max range, limit to max range
            if (distance > maxRange) {
                toTarget.normalize().multiplyScalar(maxRange);
                targetPoint.copy(shipPosition).add(toTarget);
            }

            // Consume full energy
            this.energy = 0;

            // Update UI with energy change
            if (this.ui && typeof this.ui.updateEnergy === 'function') {
                this.ui.updateEnergy(this.energy, this.maxEnergy);
            } else {
                console.warn('UI energy update failed');
            }

            // Create and launch the grenade
            this.launchGrenade(targetPoint);
        }
    }

    launchGrenade(targetPoint) {
        // Create grenade mesh
        const grenadeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const grenadeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4500,
            emissive: 0xff2000,
            emissiveIntensity: 0.5
        });
        const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);

        // Position at the ship
        grenade.position.copy(this.playerShip.position);
        grenade.position.y = 0.5; // Slightly above floor

        // Add to scene
        this.scene.add(grenade);

        // Add grenade trail effect
        const trail = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0xff4500,
                size: 0.1,
                transparent: true,
                opacity: 0.8
            })
        );
        this.scene.add(trail);

        // Add a point light to make it glow
        const light = new THREE.PointLight(0xff4500, 1, 3);
        grenade.add(light);

        // Store grenade data for animation
        if (!this.grenades) {
            this.grenades = [];
        }

        // Calculate the arc of the grenade
        const startPos = grenade.position.clone();
        const endPos = targetPoint.clone();
        const midPos = startPos.clone().add(endPos.clone().sub(startPos).multiplyScalar(0.5));
        midPos.y += 5; // Arc height

        this.grenades.push({
            mesh: grenade,
            trail: trail,
            startPos: startPos,
            midPos: midPos,
            endPos: endPos,
            progress: 0,
            exploded: false,
            explosionRadius: 4,
            trailPoints: []
        });

        // Play grenade launch sound
        this.playSound('grenade-laser');
    }

    // Add a method to show targeting indicator for all weapons
    updateTargetingIndicator(event) {
        // Skip if indicator was recently updated
        if (this.lastIndicatorUpdate && Date.now() - this.lastIndicatorUpdate < 16) {
            return;
        }
        this.lastIndicatorUpdate = Date.now();

        // Get the mouse position in normalized device coordinates
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Log the normalized mouse position occasionally
        if (Math.random() < 0.01) {
            console.log('Mouse normalized position:', mouse);
        }

        // Use raycasting to determine the point in 3D space
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Check for intersection with the raycastFloor
        const intersects = raycaster.intersectObject(this.raycastFloor);

        // Log raycasting results occasionally for debugging
        if (Math.random() < 0.01) {
            console.log('Raycast results:', {
                intersections: intersects.length,
                raycastFloorExists: !!this.raycastFloor,
                raycastFloorPosition: this.raycastFloor ? this.raycastFloor.position.y : 'N/A'
            });
        }

        if (intersects.length > 0) {
            const targetPoint = intersects[0].point;

            // Create or update targeting indicator
            if (!this.targetingIndicator) {
                console.log('Creating new targeting indicator');
                // Create a more efficient indicator using a single geometry
                const geometry = new THREE.Group();

                // Outer ring with fewer segments - MAKE LARGER
                const outerRing = new THREE.RingGeometry(0.8, 1.0, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8, // Increased opacity
                    side: THREE.DoubleSide
                });
                const outer = new THREE.Mesh(outerRing, material);

                // Inner ring with fewer segments - MAKE LARGER
                const innerRing = new THREE.RingGeometry(0.2, 0.4, 16);
                const inner = new THREE.Mesh(innerRing, material.clone());

                // Simplified crosshair - MAKE LARGER
                const lineGeometry = new THREE.BufferGeometry();
                const lineVertices = new Float32Array([
                    -0.6, 0, 0,
                    0.6, 0, 0,
                    0, -0.6, 0,
                    0, 0.6, 0
                ]);
                lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));
                const lines = new THREE.LineSegments(lineGeometry, material.clone());

                geometry.add(outer);
                geometry.add(inner);
                geometry.add(lines);

                this.targetingIndicator = geometry;
                this.targetingIndicator.rotation.x = Math.PI / 2;
                this.scene.add(this.targetingIndicator);
            }

            // Update position - INCREASE HEIGHT
            this.targetingIndicator.position.copy(targetPoint);
            this.targetingIndicator.position.y = 0.5; // Much higher above the terrain

            // Update color based on weapon type
            const colors = {
                'LASER': new THREE.Color(0x00ffff),
                'GRENADE': new THREE.Color(0xff4500),
                'BOUNCE': new THREE.Color(0x00ff99)
            };
            const color = colors[this.currentWeapon] || colors['LASER'];

            // Only update colors if they've changed
            if (!this.lastWeaponColor || this.lastWeaponColor !== this.currentWeapon) {
                this.targetingIndicator.children.forEach(child => {
                    if (child.material) {
                        child.material.color = color;
                    }
                });
                this.lastWeaponColor = this.currentWeapon;
            }

            // Simplified pulse animation
            if (!this.targetingIndicator.pulse) {
                this.targetingIndicator.pulse = 0;
            }
            this.targetingIndicator.pulse = (this.targetingIndicator.pulse + 0.1) % (Math.PI * 2);
            const pulseScale = 1.0 + 0.1 * Math.sin(this.targetingIndicator.pulse);
            this.targetingIndicator.scale.setScalar(pulseScale);

            // Show indicator
            this.targetingIndicator.visible = true;

            // Reset fade timeout
            if (this.targetingTimeout) {
                clearTimeout(this.targetingTimeout);
            }
            this.targetingTimeout = setTimeout(() => {
                if (this.targetingIndicator && this.targetingIndicator.visible) {
                    this.targetingIndicator.visible = false;
                }
            }, 1000);

            // Extract target direction for firing
            this.targetDirection = new THREE.Vector3()
                .subVectors(targetPoint, this.playerShip.position)
                .normalize();
        }
    }

    /**
     * Toggle mini-map visibility
     */
    toggleMiniMap() {
        if (this.miniMap) {
            this.miniMap.toggle();
        }
    }

    // Add cleanup method
    startGame() {
        console.log("Starting game...");

        // Get player name from input
        const playerNameInput = document.getElementById('player-name');
        this.playerName = playerNameInput.value.trim() || 'Pilot-' + Math.floor(Math.random() * 1000);

        // Hide start screen
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.add('hidden');

        // Enable multiplayer mode by default
        this.multiplayerEnabled = true;

        // Connect to server
        if (this.networkManager) {
            this.networkManager.connect();

            // Show multiplayer info UI
            const multiplayerInfo = document.getElementById('multiplayer-info');
            if (multiplayerInfo) {
                multiplayerInfo.classList.remove('hidden');
            }

            // Update player info on server
            this.networkManager.updatePlayerInfo(this.playerName, this.currentShipType || 'default');
        }

        // Show ship selection screen
        this.showShipSelection();
    }

    showShipSelection() {
        // Make sure we have a container
        const container = document.getElementById('game-container');
        if (!container) {
            console.error('Game container not found');
            return;
        }

        // Initialize ship selection if not already done
        if (!this.shipSelection) {
            this.shipSelection = new ShipSelectionUI(container, {
                isPremium: false,
                onShipSelect: (selection) => {
                    this.shipSelection.hide();
                    this.startGameplay(selection);
                }
            });
        }
        this.shipSelection.show();
    }

    startGameplay(shipSelection) {
        console.log('🔍 Starting gameplay with ship selection:', shipSelection);

        // First apply the ship selection
        this.applyShipSelection(shipSelection);

        // Add player name label above the ship
        this.addPlayerNameLabel();

        // Set game as running (if this property exists)
        this.isRunning = true;

        // Show game UI (using either method)
        if (typeof this.ui !== 'undefined' && typeof this.ui.show === 'function') {
            this.ui.show();
        } else {
            // Show game UI directly
            const gameUI = document.querySelector('.game-ui');
            if (gameUI) {
                gameUI.classList.remove('hidden');
            }
        }

        // Show mini-map if it exists
        if (this.miniMap && typeof this.miniMap.show === 'function') {
            this.miniMap.show();
        }

        // Create and show controls if not already created
        if (!this.controlsContainer && typeof this.createControlIndicators === 'function') {
            this.createControlIndicators();
        }
        this.fadeInControls();

        // IMPORTANT: Double-check that the player ship has a proper collision radius
        if (this.playerShip) {
            this.playerShip.userData.collisionRadius = 0.35; // Use the same reduced value as defined earlier
            console.log('🛡️ Verified player ship collision radius:', this.playerShip.userData.collisionRadius);
        } else {
            console.error('⚠️ Player ship not available when starting gameplay!');
        }

        // Manually check for collisions once to make sure it's working
        setTimeout(() => {
            console.log('🔍 Running initial collision check...');
            this.checkObstacleCollisions();
        }, 500);

        // Start animation loop
        this.animate();

        console.log('✅ Game started successfully!');
    }

    applyShipSelection(selection) {
        console.log('🔍 Applying ship selection:', selection);

        // Clear existing ship model
        if (this.playerShip) {
            // Remove all children (previous ship model)
            while (this.playerShip.children.length > 0) {
                const child = this.playerShip.children[0];
                this.playerShip.remove(child);
            }
        }

        // Set ship model based on selection
        const type = selection.type.toUpperCase(); // Make sure it's uppercase for consistency
        this.setShipModel(type);
        this.currentShipType = type;

        // Position ship at a random location in the playing area
        // Avoid spawning too close to the center (where other players might spawn)
        const spawnRadius = 30; // Radius from center for spawning
        const randomAngle = Math.random() * Math.PI * 2; // Random angle
        const randomDistance = spawnRadius * (0.5 + Math.random() * 0.5); // Between 50% and 100% of spawn radius

        // Calculate position
        const spawnX = Math.cos(randomAngle) * randomDistance;
        const spawnZ = Math.sin(randomAngle) * randomDistance;

        // Set player ship position
        if (this.playerShip) {
            this.playerShip.position.set(spawnX, this.playerShip.position.y, spawnZ);

            // Set random rotation
            this.playerShip.rotation.y = Math.random() * Math.PI * 2;

            console.log(`Player spawned at position: [${spawnX.toFixed(2)}, ${spawnZ.toFixed(2)}], rotation: ${this.playerShip.rotation.y.toFixed(2)}`);
        }

        // Apply ship color if specified
        if (selection.color && this.playerShip) {
            const color = new THREE.Color(selection.color);

            // Apply color to all meshes in the ship model
            this.playerShip.traverse(child => {
                if (child.isMesh && child.material) {
                    try {
                        // Clone the material to avoid affecting other instances
                        if (!child.material._isCloned) {
                            child.material = child.material.clone();
                            child.material._isCloned = true;
                        }

                        // Update material color properties with safety checks
                        if (child.material.color) {
                            child.material.color.set(color);
                        }

                        if (child.material.emissive) {
                            child.material.emissive.set(color);
                            child.material.emissiveIntensity = 0.3;
                        }

                        // Update the material
                        child.material.needsUpdate = true;
                    } catch (error) {
                        console.warn('Error setting material properties:', error);
                    }
                }
            });
        }

        console.log('✅ Ship configuration applied successfully');

        // Verify collision detection is working
        console.log('🔍 Verifying collision detection is working');
    }

    exitToMainMenu() {
        // Stop animation loop
        this.isRunning = false;

        // Hide in-game menu if it exists
        const menuContainer = document.getElementById('in-game-menu');
        if (menuContainer) {
            menuContainer.classList.add('hidden');
        }

        // Hide game UI
        this.ui.hide();
        if (this.miniMap) {
            this.miniMap.hide();
        }
        this.fadeOutControls();

        // Clean up ship selection if it exists
        if (this.shipSelection) {
            this.shipSelection.hide();
        }

        // Show start screen
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.classList.remove('hidden');
            startScreen.classList.add('fade-in');
        }

        // Reset game state
        this.resetGameState();
    }

    resetGameState() {
        console.log('🔄 Resetting game state...');

        // Reset player position
        if (this.playerShip) {
            this.playerShip.position.set(0, 0.5, 0);
            this.playerShip.rotation.set(0, 0, 0);
        }

        // Reset camera to original position
        if (this.camera) {
            this.camera.position.set(0, 15, -10);
            this.camera.lookAt(0, 0, 0);
        }

        // Reset player stats
        this.health = this.maxHealth || 100;
        this.energy = this.maxEnergy || 100;

        // Update UI - use existing methods if available
        if (typeof this.updateUI === 'function') {
            this.updateUI();
        } else {
            // Update health bar
            const healthBar = document.querySelector('.health-bar .bar-inner');
            if (healthBar) {
                healthBar.style.width = '100%';
            }

            // Update energy bar
            const energyBar = document.querySelector('.energy-bar .bar-inner');
            if (energyBar) {
                energyBar.style.width = '100%';
            }
        }

        // Original way of clearing lasers
        if (this.lasers) {
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const laser = this.lasers[i];
                if (laser.mesh && laser.mesh.parent) {
                    laser.mesh.parent.remove(laser.mesh);
                }
            }
            this.lasers = [];
        }

        // Clear bouncing lasers
        if (this.bouncingLasers) {
            for (let i = this.bouncingLasers.length - 1; i >= 0; i--) {
                const laser = this.bouncingLasers[i];
                if (laser.mesh && laser.mesh.parent) {
                    laser.mesh.parent.remove(laser.mesh);
                }
            }
            this.bouncingLasers = [];
        }

        // Clear grenades
        if (this.grenades) {
            for (let i = this.grenades.length - 1; i >= 0; i--) {
                const grenade = this.grenades[i];
                if (grenade.mesh && grenade.mesh.parent) {
                    grenade.mesh.parent.remove(grenade.mesh);
                }
            }
            this.grenades = [];
        }

        // Reset movement keys
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            strafeLeft: false,
            strafeRight: false
        };

        // Reset weapon state to original
        this.currentWeapon = 'laser';
        this.weaponCooldown = 0;
        this.grenadeTargeting = false;

        // Make sure the player exists
        if (!this.playerShip) {
            this.createDefaultShip();
        }

        // Reset player velocity (original behavior)
        this.playerVelocity = new THREE.Vector3();
        this.playerRotation = new THREE.Vector3();

        // Update weapon UI - use existing method if available
        if (typeof this.updateWeaponUI === 'function') {
            this.updateWeaponUI();
        }

        // Update control indicators - use existing method if available
        if (typeof this.updateControlIndicators === 'function') {
            this.updateControlIndicators();
        }

        console.log('✅ Game state reset complete');
    }

    handleDirectionalFiring(event) {
        // Get mouse position in normalized device coordinates
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        // Use raycasting to determine the point in 3D space
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Check for intersection with an invisible plane at ship's height
        const planeNormal = new THREE.Vector3(0, 1, 0);
        const shipHeight = this.playerShip.position.y;
        const plane = new THREE.Plane(planeNormal, -shipHeight);

        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetPoint);

        if (targetPoint) {
            // Calculate direction from ship to target
            const direction = targetPoint.clone().sub(this.playerShip.position).normalize();
            direction.y = 0; // Keep shots parallel to ground

            // Get the ship's current forward direction
            const shipForward = new THREE.Vector3(0, 0, 1);
            shipForward.applyQuaternion(this.playerShip.quaternion);
            shipForward.y = 0;
            shipForward.normalize();

            // Calculate the angle between ship's forward direction and target direction
            const angle = shipForward.angleTo(direction);

            // Only fire if the target is within a reasonable angle (e.g., 60 degrees) from ship's forward direction
            const maxFiringAngle = Math.PI / 3; // 60 degrees

            if (angle <= maxFiringAngle) {
                // Fire weapon in the calculated direction
                this.fireCurrentWeapon(direction);
            }
        }
    }

    fireCurrentWeapon(direction) {
        // Check weapon cooldown
        const now = Date.now();
        const weaponCooldown = this.weaponCooldowns.get(this.currentWeapon) || 0;

        if (now < weaponCooldown) {
            return;
        }

        // Define energy costs for each weapon from GAME_CONFIG
        const energyCosts = {
            'LASER': GAME_CONFIG.WEAPONS.LASER.ENERGY_COST,
            'BOUNCE': GAME_CONFIG.WEAPONS.BOUNCE.ENERGY_COST,
            'GRENADE': GAME_CONFIG.WEAPONS.GRENADE.ENERGY_COST
        };

        // Check if we have enough energy
        const energyCost = energyCosts[this.currentWeapon];
        if (this.energy < energyCost) {
            console.log(`Not enough energy for ${this.currentWeapon}`);
            return;
        }

        // Set cooldown based on weapon type from GAME_CONFIG
        const cooldowns = {
            'LASER': GAME_CONFIG.WEAPONS.LASER.COOLDOWN,
            'BOUNCE': GAME_CONFIG.WEAPONS.BOUNCE.COOLDOWN,
            'GRENADE': GAME_CONFIG.WEAPONS.GRENADE.COOLDOWN
        };
        const cooldownTime = cooldowns[this.currentWeapon];

        this.weaponCooldowns.set(this.currentWeapon, now + cooldownTime);

        // Consume energy
        this.energy = Math.max(0, this.energy - energyCost);

        // Update UI with energy change
        if (this.ui && typeof this.ui.updateEnergy === 'function') {
            this.ui.updateEnergy(this.energy, this.maxEnergy);
        }

        // Use target direction if available, otherwise use ship orientation
        let firingDirection;

        // If we have a targetDirection from mouse, use that instead of ship orientation
        if (this.targetDirection && (this.currentWeapon === 'LASER' || this.currentWeapon === 'BOUNCE')) {
            firingDirection = this.targetDirection.clone();
            console.log('Using mouse targeting direction:', firingDirection);
        } else {
            // Fall back to ship orientation if no target direction
            firingDirection = direction || new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerShip.quaternion);
            console.log('Using ship orientation direction:', firingDirection);
        }

        // Ensure direction is normalized
        firingDirection.normalize();

        // Get firing position (slightly in front of ship)
        const position = this.playerShip.position.clone().add(firingDirection.clone().multiplyScalar(1.5));
        position.y = 0.5; // Set height

        // Create weapon effect based on type
        switch (this.currentWeapon) {
            case 'LASER':
                this.fireLaser(position, firingDirection);
                this.playSound('laser');

                // Send laser shot to other players if multiplayer is enabled
                if (this.multiplayerEnabled && this.networkManager && this.networkManager.isConnected()) {
                    this.networkManager.sendLaserShot({
                        origin: position,
                        direction: firingDirection
                    });
                }
                break;
            case 'BOUNCE':
                this.fireBouncingLaser(position, firingDirection);
                this.playSound('laser-bounce');

                // Send bounce laser shot to other players if multiplayer is enabled
                if (this.multiplayerEnabled && this.networkManager && this.networkManager.isConnected()) {
                    this.networkManager.sendLaserShot({
                        origin: position,
                        direction: firingDirection,
                        type: 'bounce'
                    });
                }
                break;
            case 'GRENADE':
                // Grenades are handled separately through handleGrenadeTargeting
                break;
        }

        // Visual feedback for firing
        this.createMuzzleFlash(position, firingDirection);

        // Log energy state for debugging
        console.log(`Weapon fired: ${this.currentWeapon}, Energy remaining: ${this.energy}/${this.maxEnergy}`);
    }

    createMuzzleFlash(position, direction) {
        // Create a quick flash effect at the firing position
        const flashGeometry = new THREE.CircleGeometry(0.3, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);

        // Position flash at the weapon position, oriented to face the camera
        flash.position.copy(position);
        flash.position.y += 0.1; // Slightly above ship

        // Update flash to always face camera
        flash.lookAt(this.camera.position);

        // Add to scene
        this.scene.add(flash);

        // Create flash animation with subtle scaling
        let scale = 1;
        const animate = () => {
            scale += 0.2;
            flash.scale.set(scale, scale, scale);

            // Reduce opacity as flash grows
            if (flash.material) {
                flash.material.opacity = Math.max(0, 1 - (scale - 1) / 2);

                // Remove when fully transparent
                if (flash.material.opacity <= 0) {
                    this.scene.remove(flash);
                    if (flash.material) flash.material.dispose();
                    if (flash.geometry) flash.geometry.dispose();
                    return;
                }
            }

            // Continue animation
            requestAnimationFrame(animate);
        };
        animate();
    }

    fireLaser(position, direction) {
        // Create laser geometry - make it longer and thinner for better visual
        const geometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
        geometry.rotateX(-Math.PI / 2); // Changed rotation to negative to flip direction

        // Create glowing material with better visual effects
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });

        const laser = new THREE.Mesh(geometry, material);
        laser.position.copy(position);

        // Orient laser along direction - using lookAt for more accurate direction
        const targetPos = position.clone().add(direction.clone().multiplyScalar(10));
        laser.lookAt(targetPos);

        // Add to scene
        this.scene.add(laser);

        // Add point light for glow effect with better parameters
        const light = new THREE.PointLight(0x00ffff, 2, 4);
        light.position.set(0, 0, 0); // Center of the laser
        laser.add(light);

        // Add a trail effect
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);

        // Initialize lasers array if it doesn't exist
        if (!this.lasers) {
            this.lasers = [];
        }

        // Store laser data with enhanced properties
        this.lasers.push({
            mesh: laser,
            trail: trail,
            direction: direction.clone(), // Clone the direction to prevent reference issues
            speed: 1.2, // Slightly increased speed for better feel
            lifeTime: 0,
            maxLifeTime: 40,
            trailPoints: [],
            pulsePhase: 0
        });
    }

    fireBouncingLaser(position, direction) {
        // Create bouncing laser geometry - using a smaller sphere for better visuals
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff99,
            transparent: true,
            opacity: 0.8
        });

        const laser = new THREE.Mesh(geometry, material);
        laser.position.copy(position);

        // Add point light for glow effect
        const light = new THREE.PointLight(0x00ff99, 2, 3);
        laser.add(light);

        // Create enhanced trail effect
        const trail = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({
                color: 0x00ff99,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            })
        );

        // Add to scene
        this.scene.add(laser);
        this.scene.add(trail);

        // Initialize bouncing lasers array if it doesn't exist
        if (!this.bouncingLasers) {
            this.bouncingLasers = [];
        }

        // Store bouncing laser data with improved parameters
        this.bouncingLasers.push({
            mesh: laser,
            trail: trail,
            direction: direction.clone(), // Clone the direction to prevent reference issues
            speed: 0.8, // Increased speed for better feel
            bounces: 0,
            maxBounces: 3,
            lifeTime: 0,
            maxLifeTime: 120,
            canHitPlayer: false,
            bounceTimeout: 15, // Reduced timeout for better gameplay
            trailPoints: [],
            pulsePhase: 0
        });
    }

    createHitEffect(position) {
        // Create particle burst effect
        const particleCount = 15;
        const particles = [];

        // Create particle material with orange/red color for explosion
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < particleCount; i++) {
            // Create small particle geometry
            const particleGeometry = new THREE.PlaneGeometry(0.2, 0.2);
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());

            // Position at hit point
            particle.position.copy(position);

            // Random velocity in all directions
            particle.userData.velocity = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize().multiplyScalar(0.2 + Math.random() * 0.3);
            particle.userData.life = 1.0;

            this.scene.add(particle);
            particles.push(particle);
        }

        // Add impact flash
        const flashGeometry = new THREE.CircleGeometry(0.5, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        flash.lookAt(this.camera.position);
        this.scene.add(flash);

        // Add point light
        const light = new THREE.PointLight(0xff6600, 3, 6);
        light.position.copy(position);
        this.scene.add(light);

        // Animate particles and effects
        let frame = 0;
        const animate = () => {
            frame++;

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];

                // Move particle
                particle.position.add(particle.userData.velocity);

                // Reduce life
                particle.userData.life -= 0.05;

                // Update opacity
                particle.material.opacity = particle.userData.life;

                // Remove dead particles
                if (particle.userData.life <= 0) {
                    this.scene.remove(particle);
                    particles.splice(i, 1);
                }
            }

            // Update flash
            flash.scale.addScalar(0.2);
            flashMaterial.opacity *= 0.8;

            // Update light
            light.intensity *= 0.8;

            // Continue animation if particles remain
            if (particles.length > 0 && frame < 20) {
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(flash);
                this.scene.remove(light);
            }
        };

        // Start animation
        animate();
    }

    showInGameMenu() {
        // Pause the game
        this.isRunning = false;

        // Create or reuse the menu element
        let menuContainer = document.getElementById('in-game-menu');
        if (!menuContainer) {
            menuContainer = document.createElement('div');
            menuContainer.id = 'in-game-menu';
            menuContainer.className = 'menu-container';
            document.getElementById('game-container').appendChild(menuContainer);

            // Style the menu
            menuContainer.style.position = 'absolute';
            menuContainer.style.top = '50%';
            menuContainer.style.left = '50%';
            menuContainer.style.transform = 'translate(-50%, -50%)';
            menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            menuContainer.style.padding = '20px';
            menuContainer.style.borderRadius = '10px';
            menuContainer.style.color = '#fff';
            menuContainer.style.textAlign = 'center';
            menuContainer.style.zIndex = '1000';
            menuContainer.style.border = '2px solid #00ffff';
            menuContainer.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
            menuContainer.style.minWidth = '300px';
        }

        // Create menu content
        menuContainer.innerHTML = `
      <h2 style="color: #00ffff; margin-top: 0;">Game Menu</h2>
      <div class="menu-options">
        <button id="resume-button" class="menu-button">Resume Game</button>
        <button id="change-ship-button" class="menu-button">Change Ship</button>
        <button id="exit-button" class="menu-button">Exit to Main Menu</button>
      </div>
    `;

        // Style buttons
        const buttons = menuContainer.querySelectorAll('.menu-button');
        buttons.forEach(button => {
            button.style.display = 'block';
            button.style.width = '100%';
            button.style.padding = '10px';
            button.style.margin = '10px 0';
            button.style.backgroundColor = '#001a33';
            button.style.color = '#00ffff';
            button.style.border = '1px solid #00ffff';
            button.style.borderRadius = '5px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '16px';
            button.style.transition = 'all 0.2s';

            // Hover effect
            button.onmouseenter = () => {
                button.style.backgroundColor = '#00ffff';
                button.style.color = '#001a33';
            };
            button.onmouseleave = () => {
                button.style.backgroundColor = '#001a33';
                button.style.color = '#00ffff';
            };
        });

        // Add event listeners
        document.getElementById('resume-button').addEventListener('click', () => this.resumeGame());
        document.getElementById('change-ship-button').addEventListener('click', () => this.showShipChangeScreen());
        document.getElementById('exit-button').addEventListener('click', () => this.exitToMainMenu());

        // Show the menu
        menuContainer.classList.remove('hidden');
    }

    resumeGame() {
        console.log('Hiding menus');

        // Hide ship selection if it exists
        if (this.shipSelection) {
            this.shipSelection.hide();
        }

        // Hide menu
        const menuContainer = document.getElementById('in-game-menu');
        if (menuContainer) {
            menuContainer.classList.add('hidden');
        }
    }

    showShipChangeScreen() {
        // Hide the menu
        const menuContainer = document.getElementById('in-game-menu');
        if (menuContainer) {
            menuContainer.classList.add('hidden');
        }

        // Make sure we have a container
        const container = document.getElementById('game-container');
        if (!container) {
            console.error('Game container not found');
            return;
        }

        // Clean up existing ship selection if it exists
        if (this.shipSelection) {
            this.shipSelection.hide();

            // Safely remove the element from DOM if it exists and has a parent
            if (this.shipSelection.element && this.shipSelection.element.parentNode) {
                this.shipSelection.element.parentNode.removeChild(this.shipSelection.element);
            }

            this.shipSelection = null;
        }

        // Create new ship selection instance
        this.shipSelection = new ShipSelectionUI(container, {
            isPremium: false,
            onShipSelect: (selection) => {
                this.shipSelection.hide();
                this.applyShipSelection(selection);
            }
        });

        // Show the ship selection UI
        this.shipSelection.show();
    }

    /**
     * Calculate proper ground offset for an object based on its type and geometry
     */
    calculateGroundOffset(model, category, scale) {
        // Get the bounding box
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());

        // Calculate the distance from the object's pivot to its bottom
        const pivotToBottom = bbox.min.y;

        // The base offset is the distance needed to move the object so its bottom touches the ground
        let groundOffset = -pivotToBottom;

        // Add category-specific adjustments with more refined values
        switch (category) {
            case 'rocks':
                // Rocks typically need to be slightly embedded in the ground
                groundOffset += size.y * 0.08;
                break;
            case 'flora':
                // Flora should be firmly planted in the ground
                groundOffset += size.y * 0.03;
                break;
            case 'groundFeatures':
                // Ground features should be partially embedded, varying by model
                if (model.name && model.name.includes('Ground02')) {
                    groundOffset += size.y * 0.15; // SP_Ground02 needs more embedding
                } else if (model.name && model.name.includes('Ground05')) {
                    groundOffset += size.y * 0.05; // SP_Ground05 needs less embedding
                } else {
                    groundOffset += size.y * 0.1; // Default for other ground features
                }
                break;
            case 'crystals':
                // Crystals should appear to be growing from the ground
                groundOffset += size.y * 0.15;
                break;
            case 'mountains':
                // Mountains need to be firmly embedded with varying depths
                const mountainDepth = 0.08 + (Math.random() * 0.05); // Random depth between 8-13%
                groundOffset += size.y * mountainDepth;
                break;
            case 'centerpiece':
                // Centerpiece gets special treatment
                groundOffset += size.y * 0.12;
                break;
            default:
                // Default adjustment for unknown types
                groundOffset += 0;
        }

        // Scale the offset according to the object's scale
        // Add a small global offset to prevent z-fighting
        return (groundOffset * scale) + 0.01;
    }

    /**
     * Create a special centerpiece for the landscape
     */
    createCenterpiece() {
        // Create a special formation at a designated spot
        const centerpiece = {
            position: new THREE.Vector3(0, 0, -35), // Prominent position
            models: [
                {
                    path: 'assets/models/objects/SP_Crystal01.glb',
                    scale: 2.5,
                    offset: new THREE.Vector3(0, 0, 0),
                    rotation: 0
                },
                {
                    path: 'assets/models/objects/SP_Crystal01.glb',
                    scale: 1.8,
                    offset: new THREE.Vector3(2, 0, 1),
                    rotation: Math.PI / 4
                },
                {
                    path: 'assets/models/objects/SP_Crystal01.glb',
                    scale: 1.6,
                    offset: new THREE.Vector3(-1.5, 0, -1),
                    rotation: -Math.PI / 5
                },
                {
                    path: 'assets/models/objects/SP_Ground05.glb',
                    scale: 2.0,
                    offset: new THREE.Vector3(0, -0.5, 0),
                    rotation: 0
                },
                {
                    path: 'assets/models/objects/SP_Stone01.glb',
                    scale: 1.2,
                    offset: new THREE.Vector3(2.5, 0, -1.5),
                    rotation: Math.PI / 3
                }
            ]
        };

        // Load each model in the centerpiece
        centerpiece.models.forEach((model, index) => {
            const loader = new GLTFLoader();
            loader.load(
                model.path,
                (gltf) => {
                    const object = gltf.scene;

                    // Apply scale
                    object.scale.set(model.scale, model.scale, model.scale);

                    // Position relative to centerpiece
                    object.position.copy(centerpiece.position.clone().add(model.offset));

                    // Apply rotation
                    object.rotation.y = model.rotation;

                    // Add special glow effect for crystals
                    if (model.path.includes('Crystal')) {
                        object.traverse(node => {
                            if (node.isMesh && node.material) {
                                node.material.emissive = new THREE.Color(0xff00ff);
                                node.material.emissiveIntensity = 0.5;

                                // Add a point light for extra effect
                                const light = new THREE.PointLight(0xff00ff, 2, 10);
                                light.position.set(0, 2 * model.scale, 0);
                                object.add(light);
                            }
                        });
                    }

                    // Add to scene
                    this.scene.add(object);

                    // Create collision data
                    const bbox = new THREE.Box3().setFromObject(object);
                    const size = bbox.getSize(new THREE.Vector3());

                    // Use improved ground placement
                    const groundY = this.calculateGroundOffset(object, 'centerpiece', model.scale);
                    object.position.y = groundY + model.offset.y; // Add the intentional offset for composition

                    // Generate compound collision shapes
                    const collisionShapes = this.generateCompoundCollisionShapes(object, 'centerpiece', model.scale);

                    // Add to obstacles
                    this.obstacles.push({
                        mesh: object,
                        type: 'centerpiece',
                        collisionShape: 'compound',
                        compoundShapes: collisionShapes.map(shape => {
                            // Transform shape centers to world coordinates
                            const worldCenter = shape.center.clone();
                            worldCenter.add(object.position);

                            return {
                                ...shape,
                                center: worldCenter,
                                worldRotation: object.rotation.y + (shape.rotation || 0)
                            };
                        }),
                        boundingBox: {
                            min: new THREE.Vector3(
                                object.position.x - (size.x * model.scale / 2),
                                object.position.y - (size.y * model.scale / 2),
                                object.position.z - (size.z * model.scale / 2)
                            ),
                            max: new THREE.Vector3(
                                object.position.x + (size.x * model.scale / 2),
                                object.position.y + (size.y * model.scale / 2),
                                object.position.z + (size.z * model.scale / 2)
                            ),
                            size: size.clone().multiplyScalar(model.scale),
                            rotation: object.rotation.y
                        },
                        size: Math.max(size.x, size.z) * model.scale * 0.5,
                        position: object.position.clone()
                    });

                    console.log(`Centerpiece: Added ${model.path.split('/').pop()} at position [${object.position.x.toFixed(1)}, ${object.position.y.toFixed(1)}, ${object.position.z.toFixed(1)}]`);
                },
                undefined,
                (error) => {
                    console.error(`Error loading centerpiece model ${model.path}:`, error);
                }
            );
        });
    }

    /**
     * Create a special effect when colliding with crystals
     */
    createCrystalCollisionEffect(position, isSpecial = false) {
        // Create particles for crystal collision
        const particleCount = isSpecial ? 30 : 15;
        const color = isSpecial ? 0xff00ff : 0x00ffff;

        for (let i = 0; i < particleCount; i++) {
            // Create a small glowing cube
            const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(geometry, material);

            // Position at collision point
            particle.position.copy(position);

            // Add small random offset
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.y += Math.random() * 3;
            particle.position.z += (Math.random() - 0.5) * 2;

            // Add to scene
            this.scene.add(particle);

            // Create velocity for particle
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.2
            );

            // Animate the particle
            const startTime = Date.now();
            const duration = 1000 + Math.random() * 1000; // 1-2 seconds

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    // Remove particle when animation completes
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                    return;
                }

                // Update position
                particle.position.add(velocity);

                // Slow down over time
                velocity.multiplyScalar(0.98);

                // Fade out
                particle.material.opacity = 0.8 * (1 - progress);

                // Continue animation
                requestAnimationFrame(animate);
            };

            // Start animation
            animate();
        }
    }

    /**
     * Generate compound collision shapes for more accurate collision detection
     */
    generateCompoundCollisionShapes(model, category, scale) {
        // Generate a compound collision shape based on model geometry and category
        const shapes = [];
        const bbox = new THREE.Box3().setFromObject(model);

        // Helper function to add a box shape
        const addBoxShape = (center, size, rotation = 0) => {
            shapes.push({
                type: 'box',
                center: center.clone(),
                halfExtents: size.clone().multiplyScalar(0.5),
                rotation: rotation
            });
        };

        // Helper function to add a sphere shape
        const addSphereShape = (center, radius) => {
            shapes.push({
                type: 'sphere',
                center: center.clone(),
                radius: radius
            });
        };

        // Different collision shape strategies based on category
        switch (category) {
            case 'rocks':
                // For rocks, use 1-3 overlapping boxes based on size
                const rockSize = bbox.getSize(new THREE.Vector3());
                const rockCenter = new THREE.Vector3();
                bbox.getCenter(rockCenter);

                // Main box
                addBoxShape(rockCenter, rockSize);

                // For larger rocks, add 1-2 more boxes at slight offsets for better shape approximation
                if (rockSize.x > 1.5 * scale || rockSize.z > 1.5 * scale) {
                    // Add a second box, slightly offset and rotated
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 0.3 * rockSize.x,
                        0,
                        (Math.random() - 0.5) * 0.3 * rockSize.z
                    );

                    const secondSize = new THREE.Vector3(
                        rockSize.x * (0.7 + Math.random() * 0.3),
                        rockSize.y * 0.9,
                        rockSize.z * (0.7 + Math.random() * 0.3)
                    );

                    addBoxShape(rockCenter.clone().add(offset), secondSize, Math.PI * 0.25);

                    // For very large rocks, add a third box
                    if (rockSize.x > 2.5 * scale || rockSize.z > 2.5 * scale) {
                        const thirdOffset = new THREE.Vector3(
                            (Math.random() - 0.5) * 0.4 * rockSize.x,
                            rockSize.y * 0.2,
                            (Math.random() - 0.5) * 0.4 * rockSize.z
                        );

                        const thirdSize = new THREE.Vector3(
                            rockSize.x * (0.6 + Math.random() * 0.2),
                            rockSize.y * 0.7,
                            rockSize.z * (0.6 + Math.random() * 0.2)
                        );

                        addBoxShape(rockCenter.clone().add(thirdOffset), thirdSize, Math.PI * 0.125);
                    }
                }
                break;

            case 'flora':
                // For flora, use a smaller box for the base and a sphere for the top
                const floraSize = bbox.getSize(new THREE.Vector3());
                const floraCenter = new THREE.Vector3();
                bbox.getCenter(floraCenter);

                // Box for the base/stem
                const stemSize = new THREE.Vector3(
                    floraSize.x * 0.2,
                    floraSize.y * 0.6,
                    floraSize.z * 0.2
                );

                const stemCenter = new THREE.Vector3(
                    floraCenter.x,
                    bbox.min.y + (stemSize.y / 2),
                    floraCenter.z
                );

                addBoxShape(stemCenter, stemSize);

                // Sphere for the top/foliage
                const foliageCenter = new THREE.Vector3(
                    floraCenter.x,
                    bbox.min.y + (floraSize.y * 0.7),
                    floraCenter.z
                );

                const foliageRadius = Math.max(floraSize.x, floraSize.z) * 0.5;
                addSphereShape(foliageCenter, foliageRadius);
                break;

            case 'mountains':
                // For mountains, use a pyramid-like composition of boxes
                const mountainSize = bbox.getSize(new THREE.Vector3());
                const mountainCenter = new THREE.Vector3();
                bbox.getCenter(mountainCenter);

                // Base box (wider)
                const baseSize = new THREE.Vector3(
                    mountainSize.x,
                    mountainSize.y * 0.3,
                    mountainSize.z
                );

                const baseCenter = new THREE.Vector3(
                    mountainCenter.x,
                    bbox.min.y + (baseSize.y / 2),
                    mountainCenter.z
                );

                addBoxShape(baseCenter, baseSize);

                // Middle box (narrower)
                const middleSize = new THREE.Vector3(
                    mountainSize.x * 0.8,
                    mountainSize.y * 0.4,
                    mountainSize.z * 0.8
                );

                const middleCenter = new THREE.Vector3(
                    mountainCenter.x,
                    bbox.min.y + baseSize.y + (middleSize.y / 2),
                    mountainCenter.z
                );

                addBoxShape(middleCenter, middleSize);

                // Top box (narrowest)
                const topSize = new THREE.Vector3(
                    mountainSize.x * 0.5,
                    mountainSize.y * 0.3,
                    mountainSize.z * 0.5
                );

                const topCenter = new THREE.Vector3(
                    mountainCenter.x,
                    bbox.min.y + baseSize.y + middleSize.y + (topSize.y / 2),
                    mountainCenter.z
                );

                addBoxShape(topCenter, topSize);
                break;

            case 'crystals':
                // For crystals, use a combination of boxes at different angles
                const crystalSize = bbox.getSize(new THREE.Vector3());
                const crystalCenter = new THREE.Vector3();
                bbox.getCenter(crystalCenter);

                // Calculate a better fitting box size (narrower)
                const mainCrystalSize = new THREE.Vector3(
                    crystalSize.x * 0.7,
                    crystalSize.y,
                    crystalSize.z * 0.7
                );

                // Add the main crystal shape
                addBoxShape(crystalCenter, mainCrystalSize, model.rotation.y);

                // For larger crystals, add some angled shards
                if (crystalSize.y > 1.0 * scale) {
                    // Add up to 3 additional shards
                    const shardCount = 1 + Math.floor(Math.random() * 3);

                    for (let i = 0; i < shardCount; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = crystalSize.x * 0.3;

                        const offset = new THREE.Vector3(
                            Math.cos(angle) * distance,
                            crystalSize.y * (Math.random() * 0.2),
                            Math.sin(angle) * distance
                        );

                        const shardSize = new THREE.Vector3(
                            crystalSize.x * (0.2 + Math.random() * 0.3),
                            crystalSize.y * (0.4 + Math.random() * 0.4),
                            crystalSize.z * (0.2 + Math.random() * 0.3)
                        );

                        const shardRotation = Math.random() * Math.PI;
                        addBoxShape(crystalCenter.clone().add(offset), shardSize, shardRotation);
                    }
                }
                break;

            case 'groundFeatures':
                // For ground features, use a more accurate horizontal shape with the right height
                const groundSize = bbox.getSize(new THREE.Vector3());
                const groundCenter = new THREE.Vector3();
                bbox.getCenter(groundCenter);

                // Just use a single box but with better proportions
                const adjustedSize = new THREE.Vector3(
                    groundSize.x,
                    groundSize.y * 0.7, // Lower height to prevent floating
                    groundSize.z
                );

                // Center it properly on the ground
                const adjustedCenter = new THREE.Vector3(
                    groundCenter.x,
                    bbox.min.y + (adjustedSize.y / 2),
                    groundCenter.z
                );

                addBoxShape(adjustedCenter, adjustedSize, model.rotation.y);
                break;

            case 'centerpiece':
                // For centerpiece, create a custom multi-part shape
                const centerpieceSize = bbox.getSize(new THREE.Vector3());
                const centerpieceCenter = new THREE.Vector3();
                bbox.getCenter(centerpieceCenter);

                // Main box
                addBoxShape(centerpieceCenter, centerpieceSize);

                // Add a sphere on top for the crystal parts
                const sphereCenter = new THREE.Vector3(
                    centerpieceCenter.x,
                    centerpieceCenter.y + (centerpieceSize.y * 0.2),
                    centerpieceCenter.z
                );

                const sphereRadius = Math.max(centerpieceSize.x, centerpieceSize.z) * 0.6;
                addSphereShape(sphereCenter, sphereRadius);
                break;

            default:
                // Default: just use a box based on the bounding box
                const size = bbox.getSize(new THREE.Vector3());
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                addBoxShape(center, size);
                break;
        }

        return shapes;
    }

    updateOtherPlayers() {
        if (!this.networkManager || !this.multiplayerEnabled || !this.assetLoader) return;

        const otherPlayers = this.networkManager.getOtherPlayers();
        if (!this.otherPlayerObjects) this.otherPlayerObjects = {};

        otherPlayers.forEach(playerData => {
            let playerObject = this.otherPlayerObjects[playerData.id];

            if (!playerObject) {
                console.log('Creating new player representation for:', playerData.id);
                let shipType = (playerData.shipType || 'STANDARD').toUpperCase();
                let shipModel = this.assetLoader.getOpponentShipModel(shipType);

                // Try fallback to STANDARD if the ship type wasn't found
                if (!shipModel && shipType !== 'STANDARD') {
                    console.log(`Falling back to STANDARD ship model for player ${playerData.id}`);
                    shipType = 'STANDARD';
                    shipModel = this.assetLoader.getOpponentShipModel(shipType);
                }

                if (!shipModel) {
                    console.warn(`No model found for ship type: ${shipType}, creating basic geometry`);
                    // Fallback geometry if model fails
                    const geometry = new THREE.ConeGeometry(0.5, 1.0, 8);
                    geometry.rotateX(Math.PI / 2);
                    const material = new THREE.MeshPhongMaterial({
                        color: playerData.teamColor || 0x00ffff,
                        emissive: playerData.teamColor || 0x00ffff,
                        emissiveIntensity: 0.5
                    });
                    const ship = new THREE.Mesh(geometry, material);
                    this.scene.add(ship);
                    playerObject = {ship, lastUpdate: Date.now()};
                } else {
                    // Scale the model consistently (matching player ship scaling)
                    shipModel.scale.set(0.45, 0.45, 0.45);
                    this.scene.add(shipModel);
                    playerObject = {ship: shipModel, lastUpdate: Date.now()};
                }

                // Add engine glow
                const engineGlow = new THREE.PointLight(playerData.teamColor || 0x00ffff, 1, 2);
                engineGlow.position.set(0, 0, -0.7);
                playerObject.ship.add(engineGlow);
                playerObject.engineGlow = engineGlow;

                // Add name label
                const nameDiv = document.createElement('div');
                nameDiv.className = 'player-label';
                nameDiv.textContent = playerData.name || `Player-${playerData.id.substring(0, 4)}`;
                // Add styling to make the label more visible
                nameDiv.style.color = '#ffcc00';
                nameDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                nameDiv.style.padding = '2px 6px';
                nameDiv.style.borderRadius = '4px';
                nameDiv.style.fontSize = '14px';
                nameDiv.style.fontWeight = 'bold';
                nameDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
                const nameLabel = new CSS2DObject(nameDiv);
                nameLabel.position.set(0, 1.8, 0);
                playerObject.ship.add(nameLabel);
                playerObject.nameLabel = nameLabel;

                this.otherPlayerObjects[playerData.id] = playerObject;
            }

            // Update position and rotation
            if (playerData.position) {
                playerObject.ship.position.lerp(
                    new THREE.Vector3(playerData.position.x, playerData.position.y || 0.5, playerData.position.z),
                    0.3
                );
            }
            if (playerData.rotation !== undefined) {
                const targetY = playerData.rotation;
                let rotDiff = targetY - playerObject.ship.rotation.y;
                if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                playerObject.ship.rotation.y += rotDiff * 0.3;
            }

            playerObject.lastUpdate = Date.now();
        });

        // Clean up disconnected players
        const now = Date.now();
        Object.keys(this.otherPlayerObjects).forEach(id => {
            const playerObj = this.otherPlayerObjects[id];
            if (now - playerObj.lastUpdate > 10000) {
                console.log('Removing disconnected player:', id);
                this.scene.remove(playerObj.ship);
                delete this.otherPlayerObjects[id];
                this.updatePlayerCount();
            }
        });
    }

    // Helper method to send player position and rotation to the server
    sendPlayerPositionUpdate() {
        if (!this.playerShip || !this.networkManager || !this.networkManager.isConnected()) return;

        // Create a simple data object with player information
        const playerData = {
            position: {
                x: this.playerShip.position.x,
                y: this.playerShip.position.y,
                z: this.playerShip.position.z
            },
            rotation: this.playerShip.rotation.y,
            shipType: this.currentShipType || 'STANDARD',
            name: this.playerName
        };

        // Send the update to the network manager
        this.networkManager.sendPlayerUpdate(playerData);
    }

    // Add the missing setShipModel function
    setShipModel(type) {
        console.log('🔍 Setting ship model:', type);
        
        // Use the AssetLoader's setShipModel method
        const newShip = this.assetLoader.setShipModel(
            type, 
            this.scene, 
            this.playerShip,
            (model) => {
                // This callback will be called when the ship is set
                // Add player name label above the ship
                this.playerShip = model;
                this.addPlayerNameLabel();
            }
        );
        
        return newShip;
    }

    // Add player name label above the player's ship
    addPlayerNameLabel() {
        // Only proceed if we have a valid player ship
        if (!this.playerShip) return;

        // Remove existing label if any
        if (this.playerNameLabel && this.playerNameLabel.parent) {
            this.playerNameLabel.parent.remove(this.playerNameLabel);
            this.playerNameLabel = null;
        }

        // Create player name div
        const nameDiv = document.createElement('div');
        nameDiv.className = 'player-label own-player';
        nameDiv.textContent = this.playerName || 'You';

        // Add styling to make the label more visible
        nameDiv.style.color = '#88ff88';
        nameDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        nameDiv.style.padding = '2px 6px';
        nameDiv.style.borderRadius = '4px';
        nameDiv.style.fontSize = '14px';
        nameDiv.style.fontWeight = 'bold';
        nameDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';

        // Create CSS2D object for player name
        const nameLabel = new CSS2DObject(nameDiv);
        nameLabel.position.set(0, 2.0, 0); // Position above ship
        this.playerShip.add(nameLabel);
        this.playerNameLabel = nameLabel;
    }

    /**
     * Play a sound by name
     * @param {string} name - Name of the sound to play
     * @param {THREE.Vector3} position - Optional position for 3D audio
     */
    playSound(name, position = null) {
        if (this.soundManager) {
            console.log(`Playing sound: ${name}`);
            this.soundManager.playSound(name, position);
        } else {
            console.warn(`Cannot play sound '${name}': SoundManager not initialized`);
        }
    }

    /**
     * Update a remote player's position and rotation
     * @param {string} id - Player ID
     * @param {Object} position - Position coordinates
     * @param {Object} rotation - Rotation coordinates
     */
    updateRemotePlayer(id, position, rotation) {
        // Get existing player or create a new one
        let player = this.remotePlayers.get(id);

        if (!player) {
            // Create a new player mesh if this is the first update
            player = this.createRemotePlayerMesh();
            this.remotePlayers.set(id, player);
            this.scene.add(player);
            console.log(`Created new remote player: ${id}`);
        }

        // Update player position and rotation
        if (position) {
            player.position.set(position.x, position.y, position.z);
        }

        if (rotation) {
            player.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }

    /**
     * Create a mesh for a remote player
     * @returns {THREE.Object3D} Player mesh
     */
    createRemotePlayerMesh() {
        // For simplicity, we'll use a simple colored box for remote players
        const geometry = new THREE.BoxGeometry(1, 1, 2);
        const material = new THREE.MeshBasicMaterial({color: 0xff0000});
        const mesh = new THREE.Mesh(geometry, material);

        // Add name label
        const nameLabel = document.createElement('div');
        nameLabel.className = 'player-label';
        nameLabel.textContent = 'Player';

        const playerLabel = new CSS2DObject(nameLabel);
        playerLabel.position.set(0, 1.5, 0);
        mesh.add(playerLabel);

        return mesh;
    }
}