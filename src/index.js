import * as THREE from 'three';
import './styles/main.css';
import { GameUI } from './components/GameUI';
import { MiniMap } from './components/MiniMap';

// Basic Three.js game with a ship
class SimpleGame {
  constructor() {
    // Initialize all properties first
    // Sound management
    this.audioListener = new THREE.AudioListener();
    this.soundPools = new Map();
    this.loadedSounds = new Map();
    this.soundLoadPromises = new Map();

    // Asset loading state
    this.loadingState = {
      started: false,
      completed: false,
      errors: [],
      timeouts: new Map(),
      retryCount: new Map(),
      maxRetries: 3,
      loadingPromises: new Map()
    };
    
    // Track assets loading
    this.assetsLoaded = false;
    this.shipModelLoaded = false;
    
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
    
    // Game properties
    this.boundarySize = 100; // Size of the playable area
    
    // Initialize player state
    this.health = 100;
    this.maxHealth = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.energyRechargeRate = 20; // Units per second
    this.currentWeapon = 'LASER';
    
    // Load assets
    this.loadAssets();
    
    // Setup controls
    this.setupControls();
    
    // Create mini-map (after scene setup)
    this.miniMap = new MiniMap(this);
    
    // Handle window resize
    window.addEventListener('resize', this.boundHandleResize);
    
    console.log('Simple game initialized!');
  }
  
  setupScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Restored original FOV
    this.camera.position.set(0, 15, -10); // Slightly adjusted for the larger ship
    this.camera.lookAt(0, 0, 0);
    
    // Camera smoothing properties
    this.cameraTargetPosition = new THREE.Vector3();
    this.cameraTargetLookAt = new THREE.Vector3();
    this.cameraSmoothingFactor = 0.05; // Reduced for less aggressive smoothing
    
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
    
    // Create a simple grid floor
    this.createFloor();
    
    // Create some obstacles
    this.createObstacles();
  }
  
  loadAssets() {
    if (this.loadingState.started) {
      console.warn('🔍 Asset loading already in progress');
      return;
    }
    
    console.log('🔍 Starting asset loading process');
    console.log('Current loading state:', JSON.stringify(this.loadingState, null, 2));
    
    this.loadingState.started = true;
    this.loadingState.completed = false;
    this.loadingState.errors = [];
    
    // Show loading message
    this.updateLoadingUI('Loading game assets...');
    
    // Create placeholder ship until model loads
    this.createDefaultShip();
    
    // Load assets in parallel with proper error handling
    Promise.all([
      this.loadSounds().catch(error => {
        console.error('🔍 Sound loading failed:', error);
        this.handleLoadError('sounds', error);
        return null;
      }),
      this.loadShipModel().catch(error => {
        console.error('🔍 Ship model loading failed:', error);
        this.handleLoadError('ship model', error);
        return null;
      })
    ]).then(() => {
      console.log('🔍 All asset loading promises completed');
      // Check loading progress even if some assets failed
      this.checkLoadingProgress();
    }).catch(error => {
      console.error('🔍 Critical error loading assets:', error);
      this.handleLoadError('critical', error);
    });
  }
  
  loadSounds() {
    // AudioListener should already be initialized in constructor
    if (!this.camera) {
      console.error('Camera not initialized when trying to load sounds');
      return Promise.reject(new Error('Camera not initialized'));
    }

    // Add listener to camera if not already added
    if (!this.camera.children.includes(this.audioListener)) {
      this.camera.add(this.audioListener);
    }
    
    // Define sounds to load
    const soundsToLoad = [
      { name: 'laser', path: 'assets/sounds/laser.mp3', poolSize: 5 },
      { name: 'laser-bounce', path: 'assets/sounds/laser-bounce.mp3', poolSize: 3 },
      { name: 'grenade-laser', path: 'assets/sounds/grenade-laser.mp3', poolSize: 2 },
      { name: 'bounce', path: 'assets/sounds/bounce.mp3', poolSize: 3 }
    ];
    
    // Create a pool of sounds for frequently played effects
    const audioLoader = new THREE.AudioLoader();
    
    // Load each sound only if not already loaded
    soundsToLoad.forEach(soundInfo => {
      if (!this.loadedSounds.has(soundInfo.name)) {
        const loadPromise = new Promise((resolve, reject) => {
          // Set a timeout for loading
          const timeoutId = setTimeout(() => {
            reject(new Error(`Sound loading timeout: ${soundInfo.name}`));
          }, 10000); // 10 second timeout
          
          audioLoader.load(
            soundInfo.path,
            buffer => {
              clearTimeout(timeoutId);
              
              // Create sound pool
              const pool = [];
              for (let i = 0; i < soundInfo.poolSize; i++) {
                const sound = new THREE.Audio(this.audioListener);
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
                pool.push({ sound, inUse: false, lastUsed: 0 });
              }
              
              this.soundPools.set(soundInfo.name, pool);
              this.loadedSounds.set(soundInfo.name, buffer);
              console.log(`Loaded sound: ${soundInfo.name} (${soundInfo.poolSize} instances)`);
              resolve();
            },
            xhr => {
              console.log(`${soundInfo.name} ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            error => {
              clearTimeout(timeoutId);
              console.error(`Error loading sound ${soundInfo.name}:`, error);
              reject(error);
            }
          );
        });
        
        this.soundLoadPromises.set(soundInfo.name, loadPromise);
      }
    });
    
    // Return a promise that resolves when all sounds are loaded
    return Promise.all(Array.from(this.soundLoadPromises.values()))
      .then(() => {
        console.log('All sounds loaded successfully');
      })
      .catch(error => {
        console.error('Error loading sounds:', error);
        // Continue without sounds rather than breaking the game
      });
  }
  
  playSound(name) {
    const pool = this.soundPools.get(name);
    if (!pool || pool.length === 0) {
      console.warn(`Sound "${name}" not found or not loaded yet.`);
      return;
    }
    
    try {
      const now = Date.now();
      
      // Find available sound that hasn't been used recently
      let soundWrapper = pool.find(wrapper => 
        !wrapper.inUse && (now - wrapper.lastUsed > 50) // 50ms minimum delay between same sound
      );
      
      // If no sound available, find the oldest one
      if (!soundWrapper) {
        soundWrapper = pool.reduce((oldest, current) => 
          (!oldest || current.lastUsed < oldest.lastUsed) ? current : oldest
        );
        
        // If the oldest sound was used too recently, skip playing
        if (now - soundWrapper.lastUsed < 50) {
          return;
        }
        
        soundWrapper.sound.stop(); // Stop it if it's playing
      }
      
      // Mark as in use and update timestamp
      soundWrapper.inUse = true;
      soundWrapper.lastUsed = now;
      
      // Play the sound
      soundWrapper.sound.play();
      
      // Set up callback to release back to the pool
      soundWrapper.sound.onEnded = () => {
        soundWrapper.inUse = false;
      };
    } catch (error) {
      console.warn(`Error playing sound "${name}":`, error);
    }
  }
  
  createDefaultShip() {
    // Create a simple ship geometry as placeholder
    const geometry = new THREE.ConeGeometry(0.5, 1, 8);
    geometry.rotateX(Math.PI / 2);
    
    // Create glowing material
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      emissive: 0x006666,
      shininess: 100
    });
    
    // Create ship mesh
    this.playerShip = new THREE.Mesh(geometry, material);
    this.playerShip.position.set(0, 0.5, 0);
    this.scene.add(this.playerShip);
    
    // Add a point light to the ship to make it glow
    const light = new THREE.PointLight(0x00ffff, 1, 2);
    light.position.set(0, 0, 0);
    this.playerShip.add(light);
    
    // Add ship properties
    this.shipSpeed = 0.1;
    this.rotationSpeed = 0.05;
  }
  
  loadShipModel() {
    return new Promise((resolve, reject) => {
      // Skip if already loading
      if (this.loadingState.loadingPromises.has('shipModel')) {
        return this.loadingState.loadingPromises.get('shipModel');
      }
      
      console.log('🟢🟢🟢 INDEX.JS: Loading ship model...');
      
      const loadPromise = import('@three/examples/loaders/GLTFLoader')
        .then(({ GLTFLoader }) => {
          const loader = new GLTFLoader();
          
          // Set loading timeout
          const timeoutId = setTimeout(() => {
            reject(new Error('Ship model loading timeout'));
          }, 15000); // 15 second timeout
          
          this.loadingState.timeouts.set('shipModel', timeoutId);
          
          return new Promise((resolveLoad, rejectLoad) => {
            loader.load(
              'assets/models/ships/avrocar_vz-9-av_experimental_aircraft.glb',
              (gltf) => {
                clearTimeout(timeoutId);
                this.loadingState.timeouts.delete('shipModel');
                
                console.log('🟢🟢🟢 INDEX.JS: Ship model loaded successfully!');
                
                try {
                  // Store the model
                  this.shipModel = gltf.scene;
                  
                  // Scale and position the model
                  this.shipModel.scale.set(0.9, 0.9, 0.9);
                  console.log('🟢🟢🟢 INDEX.JS: Applied scale 0.9 to shipModel');
                  this.shipModel.rotation.y = Math.PI;
                  
                  // Apply materials
                  this.shipModel.traverse((child) => {
                    if (child.isMesh) {
                      console.log('🟢🟢🟢 INDEX.JS: Found mesh in avrocar model:', child.name);
                      
                      // Add emissive glow to the ship
                      child.material.emissive = new THREE.Color(0x00ffff);
                      child.material.emissiveIntensity = 0.5;
                      child.material.needsUpdate = true;
                    }
                  });
                  
                  // Add the model to the playerShip group
                  this.scene.remove(this.playerShip);
                  this.playerShip = new THREE.Group();
                  this.playerShip.add(this.shipModel);
                  this.playerShip.position.set(0, 0.5, 0);
                  this.scene.add(this.playerShip);
                  
                  // Add effects
                  this.addThrusterGlow();
                  
                  // Update state
                  this.shipModelLoaded = true;
                  
                  resolveLoad();
                } catch (error) {
                  rejectLoad(new Error(`Error processing ship model: ${error.message}`));
                }
              },
              (xhr) => {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                this.updateLoadingUI(`Loading ship model: ${Math.round(percentComplete)}%`);
              },
              (error) => {
                clearTimeout(timeoutId);
                this.loadingState.timeouts.delete('shipModel');
                rejectLoad(new Error(`Error loading ship model: ${error.message}`));
              }
            );
          });
        });
      
      // Store the loading promise
      this.loadingState.loadingPromises.set('shipModel', loadPromise);
      
      // Handle the promise
      loadPromise
        .then(resolve)
        .catch(error => {
          // Attempt retry if under max retries
          const retryCount = (this.loadingState.retryCount.get('shipModel') || 0) + 1;
          this.loadingState.retryCount.set('shipModel', retryCount);
          
          if (retryCount <= this.loadingState.maxRetries) {
            console.warn(`Retrying ship model load (attempt ${retryCount}/${this.loadingState.maxRetries})`);
            this.loadingState.loadingPromises.delete('shipModel');
            return this.loadShipModel();
          }
          
          reject(error);
        });
    });
  }
  
  handleLoadError(assetType, error) {
    console.error(`Error loading ${assetType}:`, error);
    this.loadingState.errors.push({ type: assetType, error: error.message });
    
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
          errors: [],
          timeouts: new Map(),
          retryCount: new Map(),
          maxRetries: 3,
          loadingPromises: new Map()
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
    console.log('Loading state:', JSON.stringify(this.loadingState, null, 2));
    console.log('Sound pools size:', this.soundPools.size);
    console.log('Ship model loaded:', this.shipModelLoaded);
    
    // Define what constitutes a fully loaded game
    const requiredAssets = {
      shipModel: this.shipModelLoaded,
      sounds: this.soundPools.size > 0
    };
    
    // Check if all required assets are loaded
    const allAssetsLoaded = Object.entries(requiredAssets).every(([name, loaded]) => {
      if (!loaded) {
        console.log(`🔍 Asset "${name}" not loaded yet`);
      }
      return loaded;
    });
    
    if (allAssetsLoaded) {
      console.log('✅ All required assets loaded successfully!');
      this.loadingState.completed = true;
      
      // Clear any remaining timeouts
      this.loadingState.timeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.loadingState.timeouts.clear();
      
      // Show start screen
      this.showStartScreen();
    } else {
      // Show which assets are still loading
      const pendingAssets = Object.entries(requiredAssets)
        .filter(([name, loaded]) => !loaded)
        .map(([name]) => name);
      
      console.log(`🔍 Still loading: ${pendingAssets.join(', ')}`);
      this.updateLoadingUI(`Loading: ${pendingAssets.join(', ')}...`);
      
      // Check again in 1 second if not all assets are loaded
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
    
    // Add point light for the thruster
    const thrusterLight = new THREE.PointLight(0x00ffff, 1, 3);
    thrusterLight.position.copy(thruster.position);
    thrusterLight.name = 'thrusterLight';
    
    // Store references for animation
    this.thruster = thruster;
    this.thrusterLight = thrusterLight;
    
    // Add to ship model
    this.shipModel.add(thruster);
    this.shipModel.add(thrusterLight);
    
    // Create a subtle, animated glow effect
    this.thrusterPulse = { value: 0 };
  }
  
  createFloor() {
    // Create a larger, more detailed grid for better orientation
    const gridSize = 100;
    const gridDivisions = 100;
    const mainGridColor = 0x444444;
    const secondaryGridColor = 0x222222;
    
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, mainGridColor, secondaryGridColor);
    this.scene.add(gridHelper);
    
    // Add a subtle glow effect to the grid
    const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize, 1, 1);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x000022,
      transparent: true,
      opacity: 0.2,
    });
    
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.01; // Slightly below the grid to avoid z-fighting
    this.scene.add(this.floor);
    
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
    
    // Add boundary indicators
    this.createBoundaryMarkers();
  }
  
  createBoundaryMarkers() {
    const boundarySize = 25; // Should match constrainToBounds boundary
    const markerSize = 1;
    const markerHeight = 1;
    const numMarkers = 10; // Number of markers per side
    
    const markerGeometry = new THREE.BoxGeometry(markerSize, markerHeight, markerSize);
    const markerMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      emissive: 0x600000,
      transparent: true,
      opacity: 0.7
    });
    
    const markers = new THREE.Group();
    
    // Create boundary markers along the perimeter
    for (let i = 0; i < numMarkers; i++) {
      const t = (i / (numMarkers - 1)) * 2 - 1; // -1 to 1
      const position = boundarySize * t;
      
      // North edge
      const northMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      northMarker.position.set(position, markerHeight / 2, -boundarySize);
      markers.add(northMarker);
      
      // South edge
      const southMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      southMarker.position.set(position, markerHeight / 2, boundarySize);
      markers.add(southMarker);
      
      // East edge
      const eastMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      eastMarker.position.set(boundarySize, markerHeight / 2, position);
      markers.add(eastMarker);
      
      // West edge
      const westMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      westMarker.position.set(-boundarySize, markerHeight / 2, position);
      markers.add(westMarker);
    }
    
    this.scene.add(markers);
  }
  
  createObstacles() {
    // Create some simple obstacles
    this.obstacles = [];
    
    // Create 15 random obstacles with more variety
    for (let i = 0; i < 15; i++) {
      // Choose a random shape (box, cylinder, or sphere)
      const shapeType = Math.floor(Math.random() * 3);
      
      let geometry;
      let size;
      
      if (shapeType === 0) {
        // Box
        size = 1.5 + Math.random() * 3;
        const height = 3 + Math.random() * 4; // Taller for better visibility
        geometry = new THREE.BoxGeometry(size, height, size);
      } else if (shapeType === 1) {
        // Cylinder
        const radius = 1 + Math.random() * 2;
        const height = 4 + Math.random() * 5;
        geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
        size = radius * 2;
      } else {
        // Sphere
        const radius = 1.5 + Math.random() * 2;
        geometry = new THREE.SphereGeometry(radius, 16, 16);
        size = radius * 2;
      }
      
      // Create neon material with random color
      const hue = Math.random();
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.5),
        shininess: 100
      });
      
      // Create mesh
      const obstacle = new THREE.Mesh(geometry, material);
      
      // Add a point light inside the obstacle for glow effect
      const light = new THREE.PointLight(color, 0.5, 5);
      light.position.set(0, 0, 0);
      obstacle.add(light);
      
      // Random position - avoid overlap with the player spawn position
      let x, z;
      let validPosition = false;
      
      while (!validPosition) {
        x = (Math.random() - 0.5) * 45; // Slightly inside boundary
        z = (Math.random() - 0.5) * 45;
        
        // Make sure it's not too close to the origin (player spawn)
        const distanceFromOrigin = Math.sqrt(x * x + z * z);
        if (distanceFromOrigin > 10) {
          validPosition = true;
        }
      }
      
      // Random height offset to make some float
      const y = shapeType === 2 ? Math.random() * 3 : size / 2;
      obstacle.position.set(x, y, z);
      
      // Add to scene
      this.scene.add(obstacle);
      this.obstacles.push(obstacle);
    }
  }
  
  setupControls() {
    // Movement keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      strafeLeft: false,
      strafeRight: false,
      fire: false,
      switchWeapon: false
    };
    
    // Store key mappings (for visual feedback)
    this.keyMap = {
      KeyW: 'forward',
      ArrowUp: 'forward',
      KeyS: 'backward',
      ArrowDown: 'backward',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
      KeyQ: 'strafeLeft',
      KeyE: 'strafeRight',
      Space: 'fire',
      Digit1: 'selectLaser',
      Digit2: 'selectGrenade',
      Digit3: 'selectBounce',
      KeyX: 'switchWeapon',
      KeyM: 'toggleMap'
    };
    
    // Available weapons
    this.availableWeapons = ['LASER', 'GRENADE', 'BOUNCE'];
    this.weaponIndex = 0;
    
    // Store active keys for visual feedback
    this.activeKeys = new Set();
    
    // Add visual indicators for controls
    this.createControlIndicators();
    
    // Detect if we're on a touch device
    this.isTouchDevice = 'ontouchstart' in window;
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      // Get control action from key mapping
      const action = this.keyMap[event.code];
      
      // Skip if key isn't mapped
      if (!action) return;
      
      // Set key state to active
      if (action === 'selectLaser') {
        this.selectWeapon('laser');
      } else if (action === 'selectGrenade') {
        this.selectWeapon('grenade');
      } else if (action === 'selectBounce') {
        this.selectWeapon('bounce'); 
      } else if (action === 'switchWeapon') {
        this.cycleWeapon();
      } else if (action === 'toggleMap') {
        this.toggleMiniMap();
      } else {
        this.keys[action] = true;
      }
      
      // Store active key for visual feedback
      this.activeKeys.add(event.code);
      
      // Handle fire action immediately (not just in update loop)
      if (action === 'fire') {
        this.fireCurrentWeapon();
      }
      
      // Update control indicators
      this.updateControlIndicators();
      
      // Prevent default browser behavior for these keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'KeyM'].includes(event.code)) {
        event.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (event) => {
      // Get control action from key mapping
      const action = this.keyMap[event.code];
      
      // Skip if key isn't mapped
      if (!action) return;
      
      // Skip weapon selection keys on keyup
      if (action === 'selectLaser' || action === 'selectGrenade' || action === 'selectBounce' || action === 'switchWeapon') {
        return;
      }
      
      // Set key state to inactive
      this.keys[action] = false;
      
      // Remove from active keys
      this.activeKeys.delete(event.code);
      
      // Update control indicators
      this.updateControlIndicators();
    });
    
    // Setup touch controls for mobile devices
    if (this.isTouchDevice) {
      this.setupTouchControls();
    }
    
    // Setup universal click handling for all weapons
    document.addEventListener('click', (event) => {
      if (this.currentWeapon === 'GRENADE') {
        // Grenade has special targeting because it creates an arc
        this.handleGrenadeTargeting(event);
      } else {
        // Handle directional firing for laser and bounce weapons
        this.handleDirectionalFiring(event);
      }
    });
    
    // Setup mouse move for weapon targeting preview
    document.addEventListener('mousemove', (event) => {
      // Update targeting indicator for all weapons
      this.updateTargetingIndicator(event);
      
      // Only show grenade-specific targeting indicator when grenade is selected
      if (this.currentWeapon === 'GRENADE') {
        this.updateGrenadeTargetingIndicator(event);
      } else if (this.grenadeTargetIndicator && this.grenadeTargetIndicator.parent) {
        // Remove the grenade-specific targeting indicator if weapon changed
        this.scene.remove(this.grenadeTargetIndicator);
        this.grenadeTargetIndicator = null;
      }
    });
    
    // Add event listeners with bound methods
    window.addEventListener('resize', this.boundHandleResize);
    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('keyup', this.boundHandleKeyUp);
    document.addEventListener('click', this.boundHandleClick);
    document.addEventListener('mousemove', this.boundHandleMouseMove);
  }
  
  handleResize(event) {
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
    // Get control action from key mapping
    const action = this.keyMap[event.code];
    
    // Skip if key isn't mapped or event is repeated
    if (!action || event.repeat) return;
    
    // Handle weapon selection with cooldown
    if (action.startsWith('select') || action === 'switchWeapon') {
      const now = Date.now();
      if (now - this.lastWeaponSwitch < 200) { // 200ms cooldown
        return;
      }
      this.lastWeaponSwitch = now;
    }
    
    // Set key state to active
    if (action === 'selectLaser') {
      this.selectWeapon('laser');
    } else if (action === 'selectGrenade') {
      this.selectWeapon('grenade');
    } else if (action === 'selectBounce') {
      this.selectWeapon('bounce'); 
    } else if (action === 'switchWeapon') {
      this.cycleWeapon();
    } else if (action === 'toggleMap') {
      this.toggleMiniMap();
    } else {
      this.keys[action] = true;
    }
    
    // Store active key for visual feedback
    this.activeKeys.add(event.code);
    
    // Handle fire action with rate limiting
    if (action === 'fire') {
      this.handleFireAction();
    }
    
    // Update control indicators
    this.updateControlIndicators();
    
    // Prevent default browser behavior for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'KeyM'].includes(event.code)) {
      event.preventDefault();
    }
  }
  
  handleKeyUp(event) {
    const action = this.keyMap[event.code];
    if (!action) return;
    
    // Skip weapon selection keys on keyup
    if (action === 'selectLaser' || action === 'selectGrenade' || 
        action === 'selectBounce' || action === 'switchWeapon') {
      return;
    }
    
    // Set key state to inactive
    this.keys[action] = false;
    
    // Remove from active keys
    this.activeKeys.delete(event.code);
    
    // Update control indicators
    this.updateControlIndicators();
  }
  
  handleClick(event) {
    // Prevent rapid-fire clicking
    const now = Date.now();
    const weaponCooldown = this.weaponCooldowns.get(this.currentWeapon) || 0;
    
    if (now < weaponCooldown) {
      return;
    }
    
    // Set next allowed fire time based on weapon type
    const cooldownTime = this.currentWeapon === 'GRENADE' ? 1000 : // 1 second for grenades
                        this.currentWeapon === 'BOUNCE' ? 500 :    // 0.5 seconds for bounce
                        200;                                       // 0.2 seconds for regular laser
    
    this.weaponCooldowns.set(this.currentWeapon, now + cooldownTime);
    
    // Handle weapon firing based on type
    if (this.currentWeapon === 'GRENADE') {
      this.handleGrenadeTargeting(event);
    } else {
      this.handleDirectionalFiring(event);
    }
  }
  
  handleMouseMove(event) {
    // Debounce mouse move events
    if (this.mouseMoveTimer) {
      clearTimeout(this.mouseMoveTimer);
    }
    
    this.mouseMoveTimer = setTimeout(() => {
      this.updateTargetingIndicator(event);
      
      if (this.currentWeapon === 'GRENADE') {
        this.updateGrenadeTargetingIndicator(event);
      }
      
      this.mouseMoveTimer = null;
    }, 16); // ~60fps
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
    fireButton.innerHTML = '🔥';
    touchControls.appendChild(fireButton);
    
    // Create weapon switch button
    const weaponButton = document.createElement('div');
    weaponButton.className = 'touch-button weapon-button';
    weaponButton.innerHTML = '🔄';
    touchControls.appendChild(weaponButton);
    
    // Joystick handling
    let joystickActive = false;
    let joystickOrigin = { x: 0, y: 0 };
    
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
        
        // Reset movement keys
        this.keys.forward = false;
        this.keys.backward = false;
        this.keys.left = false;
        this.keys.right = false;
        this.updateControlIndicators();
      }
    });
    
    const handleJoystickMove = (touch) => {
      const maxDistance = 40; // Maximum joystick movement distance
      
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
      
      // Convert joystick position to key presses
      this.keys.forward = dy < -10;
      this.keys.backward = dy > 10;
      this.keys.left = dx < -10;
      this.keys.right = dx > 10;
      
      this.updateControlIndicators();
    };
    
    // Fire button handling
    fireButton.addEventListener('touchstart', (e) => {
      this.keys.fire = true;
      this.fireCurrentWeapon();
      this.updateControlIndicators();
      e.preventDefault();
    });
    
    fireButton.addEventListener('touchend', (e) => {
      this.keys.fire = false;
      this.updateControlIndicators();
      e.preventDefault();
    });
    
    // Weapon switch button handling
    weaponButton.addEventListener('touchstart', (e) => {
      this.cycleWeapon();
      e.preventDefault();
    });
    
    // Enable directional fire on game area tap
    const gameArea = document.querySelector('canvas');
    if (gameArea) {
      gameArea.addEventListener('touchstart', (e) => {
        // Ignore if touch is in control areas
        const touch = e.touches[0];
        const isInControlArea = 
          touchControls.contains(document.elementFromPoint(touch.clientX, touch.clientY));
          
        if (!isInControlArea && this.playerShip) {
          // Similar to handling mouse click but for touch
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
                preventDefault: () => {}
              };
              this.handleGrenadeTargeting(targetEvent);
            } else {
              // For lasers and bounce, fire in the direction
              this.fireCurrentWeapon(direction);
            }
            
            // Restore the original rotation
            this.playerShip.rotation.copy(originalRotation);
          }
          
          e.preventDefault();
        }
      });
    }
  }
  
  createControlIndicators() {
    // Create a container for the control indicators
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'control-indicators';
    document.body.appendChild(this.controlsContainer);
    
    // Create movement controls container
    const movementControls = document.createElement('div');
    movementControls.className = 'control-group movement-controls';
    this.controlsContainer.appendChild(movementControls);
    
    // Define movement keys with better icons
    const movementKeys = [
      { id: 'forward', key: 'W', label: '⬆️', tooltip: 'Forward' },
      { id: 'backward', key: 'S', label: '⬇️', tooltip: 'Backward' },
      { id: 'left', key: 'A', label: '⬅️', tooltip: 'Turn Left' },
      { id: 'right', key: 'D', label: '➡️', tooltip: 'Turn Right' },
      { id: 'strafeLeft', key: 'Q', label: '↩️', tooltip: 'Strafe Left' },
      { id: 'strafeRight', key: 'E', label: '↪️', tooltip: 'Strafe Right' },
      { id: 'fire', key: 'SPACE', label: '🔥', tooltip: 'Fire' }
    ];
    
    // Create movement key indicators
    movementKeys.forEach(keyInfo => {
      const indicator = document.createElement('div');
      indicator.className = 'key-indicator';
      indicator.id = `indicator-${keyInfo.id}`;
      indicator.title = keyInfo.tooltip; // Add tooltip
      
      const keyElement = document.createElement('div');
      keyElement.className = 'key';
      keyElement.textContent = keyInfo.key;
      
      const labelElement = document.createElement('div');
      labelElement.className = 'label';
      labelElement.textContent = keyInfo.label;
      
      indicator.appendChild(keyElement);
      indicator.appendChild(labelElement);
      movementControls.appendChild(indicator);
    });
    
    // Create weapon controls container
    const weaponControls = document.createElement('div');
    weaponControls.className = 'control-group weapon-controls';
    this.controlsContainer.appendChild(weaponControls);
    
    // Define weapon keys with better icons
    const weaponKeys = [
      { id: 'selectLaser', key: '1', label: '🔫', tooltip: 'Laser' },
      { id: 'selectGrenade', key: '2', label: '💣', tooltip: 'Grenade' },
      { id: 'selectBounce', key: '3', label: '↗️↘️', tooltip: 'Bounce Laser' },
      { id: 'switchWeapon', key: 'X', label: '🔄', tooltip: 'Switch Weapon' }
    ];
    
    // Create weapon key indicators
    weaponKeys.forEach(keyInfo => {
      const indicator = document.createElement('div');
      indicator.className = 'key-indicator weapon-key';
      indicator.id = `indicator-${keyInfo.id}`;
      indicator.title = keyInfo.tooltip; // Add tooltip
      
      const keyElement = document.createElement('div');
      keyElement.className = 'key';
      keyElement.textContent = keyInfo.key;
      
      const labelElement = document.createElement('div');
      labelElement.className = 'label';
      labelElement.textContent = keyInfo.label;
      
      indicator.appendChild(keyElement);
      indicator.appendChild(labelElement);
      weaponControls.appendChild(indicator);
    });
    
    // Create a controls hint
    const controlsHint = document.createElement('div');
    controlsHint.className = 'controls-hint';
    controlsHint.textContent = 'Press C to toggle controls';
    this.controlsContainer.appendChild(controlsHint);
    
    // Initially show the controls for first-time users
    this.controlsContainer.classList.remove('hidden');
    this.controlsContainer.classList.add('visible');
    
    // Set up auto-hide timer for controls - increased to 10 seconds
    this.controlsTimeout = setTimeout(() => {
      this.fadeOutControls();
    }, 10000); // Hide after 10 seconds
    
    // Add C key listener to toggle controls display
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyC') {
        this.toggleControls();
        event.preventDefault();
      }
    });
    
    // Remove F1 alternative as we only want C to show controls
    // But keep it for touch devices
    if ('ontouchstart' in window) {
      // Add a touch-friendly button to toggle controls
      const controlsToggleButton = document.createElement('button');
      controlsToggleButton.className = 'controls-toggle-button';
      controlsToggleButton.textContent = 'Controls';
      document.body.appendChild(controlsToggleButton);
      
      controlsToggleButton.addEventListener('touchstart', (event) => {
        this.toggleControls();
        event.preventDefault();
      });
    }
  }
  
  toggleControls() {
    // Clear any existing timeout
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    
    if (this.controlsContainer.classList.contains('visible')) {
      this.fadeOutControls();
    } else {
      this.fadeInControls();
      
      // Don't auto-hide after initial display
      // Only hide when user presses C again
    }
  }
  
  fadeInControls() {
    this.controlsContainer.classList.remove('hidden');
    this.controlsContainer.classList.add('visible');
    this.controlsContainer.classList.remove('fading');
  }
  
  fadeOutControls() {
    this.controlsContainer.classList.add('fading');
    // After fade animation completes, hide completely
    setTimeout(() => {
      if (this.controlsContainer.classList.contains('fading')) {
        this.controlsContainer.classList.remove('visible');
        this.controlsContainer.classList.add('hidden');
        this.controlsContainer.classList.remove('fading');
      }
    }, 500); // Match this with CSS transition duration
  }
  
  updateControlIndicators() {
    // Skip if control indicators aren't created yet
    if (!this.controlsContainer) return;
    
    // Update each indicator based on key state and active keys
    for (const [code, action] of Object.entries(this.keyMap)) {
      const indicator = document.getElementById(`indicator-${action}`);
      if (indicator) {
        if (this.activeKeys.has(code)) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      }
    }
  }
  
  selectWeapon(action) {
    // Update the current weapon
    switch (action) {
      case 'laser':
        this.currentWeapon = 'LASER';
        break;
      case 'grenade':
        this.currentWeapon = 'GRENADE';
        break;
      case 'bounce':
        this.currentWeapon = 'BOUNCE';
        break;
    }
    
    // Update weapon index for cycling
    this.weaponIndex = this.availableWeapons.indexOf(this.currentWeapon);
    
    // Update the UI
    this.ui.updateWeapon(this.currentWeapon);
    
    console.log(`Selected weapon: ${this.currentWeapon}`);
    
    // If we select grenade, make sure to remove any existing targeting indicators
    if (this.currentWeapon !== 'GRENADE' && this.grenadeTargetIndicator) {
      this.scene.remove(this.grenadeTargetIndicator);
      this.grenadeTargetIndicator = null;
    }
  }
  
  cycleWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % this.availableWeapons.length;
    this.currentWeapon = this.availableWeapons[this.weaponIndex];
    
    // Update UI
    this.ui.updateWeapon(this.currentWeapon);
    
    // If we cycled away from grenade, remove targeting indicator
    if (this.currentWeapon !== 'GRENADE' && this.grenadeTargetIndicator) {
      this.scene.remove(this.grenadeTargetIndicator);
      this.grenadeTargetIndicator = null;
    }
  }
  
  fireGrenade() {
    console.log("Grenade weapon selected - click to target");
  }
  
  animate() {
    // Request next frame
    requestAnimationFrame(() => this.animate());
    
    // Calculate delta time
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    
    // Update player
    this.updatePlayer(deltaTime);
    
    // Update camera to follow player
    this.updateCamera();
    
    // Update energy
    this.updateEnergy(deltaTime);
    
    // Update regular lasers
    this.updateLasers();
    
    // Update bouncing lasers
    this.updateBouncingLasers();
    
    // Update grenades
    this.updateGrenades();
    
    // Update mini-map
    if (this.miniMap) {
      this.miniMap.update();
    }
    
    // Update player highlight position
    if (this.playerHighlight) {
      this.playerHighlight.position.x = this.playerShip.position.x;
      this.playerHighlight.position.z = this.playerShip.position.z;
      
      // Make it pulse
      const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2;
      this.playerHighlight.material.opacity = 0.05 + pulseFactor * 0.1;
    }
    
    // Update ship thruster effects
    this.updateThrusterEffects();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  updatePlayer(deltaTime) {
    // Apply rotation when left/right keys are pressed
    if (this.keys.left) {
      this.playerShip.rotation.y += this.rotationSpeed;
    }
    if (this.keys.right) {
      this.playerShip.rotation.y -= this.rotationSpeed;
    }
    
    // Initialize movement direction vector
    let moveDirection = new THREE.Vector3(0, 0, 0);
    
    // Get forward direction of the ship
    const forwardDir = new THREE.Vector3(0, 0, 1);
    forwardDir.applyQuaternion(this.playerShip.quaternion);
    
    // Get right direction for strafing
    const rightDir = new THREE.Vector3();
    rightDir.crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Apply forward/backward movement
    if (this.keys.forward) {
      moveDirection.add(forwardDir);
    }
    if (this.keys.backward) {
      moveDirection.sub(forwardDir);
    }
    
    // Apply strafe movement
    if (this.keys.strafeRight) {
      moveDirection.add(rightDir);
    }
    if (this.keys.strafeLeft) {
      moveDirection.sub(rightDir);
    }
    
    // If we have movement to apply
    if (moveDirection.lengthSq() > 0) {
      // Normalize so diagonal movement isn't faster
      moveDirection.normalize();
      
      // Apply movement speed
      moveDirection.multiplyScalar(this.shipSpeed);
      
      // Save current position for collision detection
      const oldPosition = this.playerShip.position.clone();
      
      // Update position
      this.playerShip.position.add(moveDirection);
      
      // Check for collisions with obstacles
      if (this.checkObstacleCollisions()) {
        // If collision detected, revert to old position
        this.playerShip.position.copy(oldPosition);
        
        // Provide visual feedback for collision
        this.flashCollisionWarning();
      }
      
      // Keep within boundaries
      this.constrainToBounds();
    }
    
    // Update thruster effects based on movement
    this.updateThrusterEffects();
    
    // Update visual indicators for active controls
    this.updateControlIndicators();
  }
  
  updateLasers() {
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
      const angle = Math.random() * spread - spread/2;
      const speed = 0.2 + Math.random() * 0.3;
      
      // Calculate velocity
      const velocity = direction.clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
        .multiplyScalar(speed);
      
      particle.userData.velocity = velocity;
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
    if (!this.obstacles) return false;
    
    const playerPosition = this.playerShip.position.clone();
    playerPosition.y = 0; // Project to ground plane for collision detection
    const playerRadius = 0.8; // Slightly larger collision radius
    
    for (const obstacle of this.obstacles) {
      const obstaclePosition = obstacle.position.clone();
      
      // For sphere collisions, we can do a simple distance check
      if (obstacle.geometry instanceof THREE.SphereGeometry) {
        const radius = obstacle.geometry.parameters.radius;
        // Project obstacle to ground plane for collision detection
        obstaclePosition.y = 0;
        
        const distance = playerPosition.distanceTo(obstaclePosition);
        if (distance < (playerRadius + radius)) {
          return true;
        }
      }
      // For cylinders, use radius for distance check
      else if (obstacle.geometry instanceof THREE.CylinderGeometry) {
        const radius = obstacle.geometry.parameters.radiusTop;
        // Project obstacle to ground plane for collision detection
        obstaclePosition.y = 0;
        
        const distance = playerPosition.distanceTo(obstaclePosition);
        if (distance < (playerRadius + radius)) {
          return true;
        }
      }
      // For boxes, use a more complex check
      else {
        // Project obstacle to ground plane for collision detection
        obstaclePosition.y = 0;
        
        // Get obstacle's bounding box if not already computed
        if (!obstacle.geometry.boundingBox) {
          obstacle.geometry.computeBoundingBox();
        }
        
        // Get obstacle's dimensions
        const box = obstacle.geometry.boundingBox.clone();
        
        // Transform bounding box to world space
        box.applyMatrix4(obstacle.matrixWorld);
        
        // Calculate half-widths of the box on the XZ plane
        const halfWidth = (box.max.x - box.min.x) / 2;
        const halfDepth = (box.max.z - box.min.z) / 2;
        
        // Calculate closest point on the rectangle to the player
        const closestX = Math.max(obstaclePosition.x - halfWidth, 
                           Math.min(playerPosition.x, obstaclePosition.x + halfWidth));
        const closestZ = Math.max(obstaclePosition.z - halfDepth, 
                           Math.min(playerPosition.z, obstaclePosition.z + halfDepth));
        
        // Calculate distance from closest point to player center
        const distanceX = playerPosition.x - closestX;
        const distanceZ = playerPosition.z - closestZ;
        const distanceSquared = distanceX * distanceX + distanceZ * distanceZ;
        
        // Collision detected if distance is less than player radius
        if (distanceSquared < (playerRadius * playerRadius)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  constrainToBounds() {
    const boundarySize = 25;
    
    if (this.playerShip.position.x > boundarySize) {
      this.playerShip.position.x = boundarySize;
    } else if (this.playerShip.position.x < -boundarySize) {
      this.playerShip.position.x = -boundarySize;
    }
    
    if (this.playerShip.position.z > boundarySize) {
      this.playerShip.position.z = boundarySize;
    } else if (this.playerShip.position.z < -boundarySize) {
      this.playerShip.position.z = -boundarySize;
    }
  }
  
  updateCamera() {
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
    
    // Simply look directly at the player with a slight forward offset
    this.cameraTargetLookAt.copy(this.playerShip.position);
    const lookAheadOffset = forwardDir.clone().multiplyScalar(4); // Look ahead offset for larger ship
    this.cameraTargetLookAt.add(lookAheadOffset);
    
    // Directly look at the target (no smoothing on look target to prevent jitter)
    this.camera.lookAt(this.cameraTargetLookAt);
  }
  
  updateThrusterEffects() {
    // Skip if ship model isn't loaded
    if (!this.shipModel || !this.thruster || !this.thrusterLight) return;
    
    // Use stored references instead of finding children each time
    const { thruster, thrusterLight } = this;
    
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
    // Recharge energy
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.energy + this.energyRechargeRate * deltaTime, this.maxEnergy);
      // Update UI
      this.ui.updateEnergy(this.energy, this.maxEnergy);
    }
  }
  
  updateGrenades() {
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
    
    // Check for obstacle hits in explosion radius
    for (const obstacle of this.obstacles) {
      const distance = grenade.mesh.position.distanceTo(obstacle.position);
      if (distance < grenade.explosionRadius) {
        // Create hit effect at the point closest to the explosion
        const direction = obstacle.position.clone().sub(grenade.mesh.position).normalize();
        const hitPoint = grenade.mesh.position.clone().add(direction.multiplyScalar(distance * 0.8));
        this.createHitEffect(hitPoint);
      }
    }
    
    // Check for player hit
    const playerPosition = this.playerShip.position.clone();
    playerPosition.y = 0; // Project to ground plane
    const grenadePosition = grenade.mesh.position.clone();
    grenadePosition.y = 0; // Project to ground plane
    
    const playerDistance = playerPosition.distanceTo(grenadePosition);
    if (playerDistance < grenade.explosionRadius) {
      // Calculate damage based on distance (closer = more damage)
      const damagePercent = 1 - (playerDistance / grenade.explosionRadius);
      const damage = Math.floor(30 * damagePercent); // Up to 30 damage
      
      // Apply damage to player
      this.health -= damage;
      if (this.health < 0) this.health = 0;
      
      // Update UI
      this.ui.updateHealth(this.health, this.maxHealth);
      
      // Flash the screen
      this.flashCollisionWarning();
    }
    
    // Play explosion sound
    this.playSound('grenade-laser');
  }
  
  updateBouncingLasers() {
    if (!this.bouncingLasers || this.bouncingLasers.length === 0) return;
    
    const tempRay = new THREE.Ray();
    const tempVector = new THREE.Vector3();
    
    for (let i = this.bouncingLasers.length - 1; i >= 0; i--) {
      const laser = this.bouncingLasers[i];
      
      // Animate the laser's pulse effect
      laser.pulsePhase += 0.2;
      const pulseValue = Math.sin(laser.pulsePhase) * 0.5 + 0.5;
      
      // Pulse the material and light
      laser.mesh.material.opacity = 0.6 + pulseValue * 0.4;
      const mainLight = laser.mesh.children[0];
      if (mainLight && mainLight.isPointLight) {
        mainLight.intensity = 1.5 + pulseValue;
      }
      
      // Calculate next position
      const nextPosition = laser.mesh.position.clone().add(
        laser.direction.clone().multiplyScalar(laser.speed)
      );
      
      // Store current position for trail
      laser.trailPoints.push(laser.mesh.position.clone());
      if (laser.trailPoints.length > 12) {
        laser.trailPoints.shift();
      }
      
      // Update trail with fade effect
      const positions = new Float32Array(laser.trailPoints.length * 3);
      const colors = new Float32Array(laser.trailPoints.length * 3);
      
      for (let j = 0; j < laser.trailPoints.length; j++) {
        positions[j * 3] = laser.trailPoints[j].x;
        positions[j * 3 + 1] = laser.trailPoints[j].y;
        positions[j * 3 + 2] = laser.trailPoints[j].z;
        
        // Calculate fade based on position in trail
        const fade = j / laser.trailPoints.length;
        colors[j * 3] = 0; // R
        colors[j * 3 + 1] = 1 * fade; // G
        colors[j * 3 + 2] = 0.6 * fade; // B
      }
      
      laser.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      laser.trail.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      laser.trail.material.vertexColors = true;
      
      // Check for collisions
      let bounced = false;
      
      // Set up ray for collision detection
      tempRay.origin.copy(laser.mesh.position);
      tempRay.direction.copy(laser.direction);
      
      // Check each obstacle
      let closestDist = Infinity;
      let closestPoint = null;
      let closestNormal = null;
      
      for (const obstacle of this.obstacles) {
        if (!obstacle.geometry) continue;
        
        let intersection = null;
        let normal = null;
        
        if (obstacle.geometry instanceof THREE.SphereGeometry) {
          const radius = obstacle.geometry.parameters.radius;
          intersection = tempRay.intersectSphere(
            new THREE.Sphere(obstacle.position, radius),
            tempVector
          );
          if (intersection) {
            normal = intersection.clone().sub(obstacle.position).normalize();
          }
        } else if (obstacle.geometry instanceof THREE.CylinderGeometry) {
          const radius = obstacle.geometry.parameters.radiusTop;
          intersection = tempRay.intersectSphere(
            new THREE.Sphere(obstacle.position, radius),
            tempVector
          );
          if (intersection) {
            normal = intersection.clone().sub(obstacle.position).normalize();
          }
        } else {
          // For boxes, use bounding sphere as approximation
          const boundingSphere = obstacle.geometry.boundingSphere;
          if (!boundingSphere) {
            obstacle.geometry.computeBoundingSphere();
          }
          const sphere = new THREE.Sphere(
            obstacle.position,
            obstacle.geometry.boundingSphere.radius
          );
          intersection = tempRay.intersectSphere(sphere, tempVector);
          if (intersection) {
            normal = intersection.clone().sub(obstacle.position).normalize();
          }
        }
        
        if (intersection) {
          const dist = laser.mesh.position.distanceTo(intersection);
          if (dist < closestDist && dist < laser.speed * 1.2) {
            closestDist = dist;
            closestPoint = intersection;
            closestNormal = normal;
          }
        }
      }
      
      // Handle bounce if collision found
      if (closestPoint && closestNormal) {
        // Position at intersection point
        laser.mesh.position.copy(closestPoint);
        
        // Calculate reflection direction
        const dot = laser.direction.dot(closestNormal);
        const reflection = laser.direction.clone()
          .sub(closestNormal.multiplyScalar(2 * dot))
          .normalize();
        
        // Update direction with some randomness for more interesting bounces
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
      
      // If no bounce, move normally
      if (!bounced) {
        laser.mesh.position.copy(nextPosition);
      }
      
      // Check for player collision
      if (laser.canHitPlayer) {
        const playerPos = this.playerShip.position.clone();
        playerPos.y = 0.5;
        
        if (laser.mesh.position.distanceTo(playerPos) < 1) {
          // Player hit
          this.health -= 10;
          if (this.health < 0) this.health = 0;
          
          // Update UI
          this.ui.updateHealth(this.health, this.maxHealth);
          
          // Visual feedback
          this.flashCollisionWarning();
          this.createBounceEffect(playerPos, new THREE.Vector3(0, 1, 0));
          
          // Remove laser
          this.scene.remove(laser.mesh);
          this.scene.remove(laser.trail);
          this.bouncingLasers.splice(i, 1);
          continue;
        }
      }
      
      // Update lifetime
      laser.lifeTime++;
      
      // Remove if too old or too many bounces
      if (laser.lifeTime > laser.maxLifeTime || laser.bounces >= laser.maxBounces) {
        this.scene.remove(laser.mesh);
        this.scene.remove(laser.trail);
        this.bouncingLasers.splice(i, 1);
      }
    }
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
    
    // Only consider the floor for targeting
    const intersects = raycaster.intersectObject(this.floor);
    
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
    }
  }
  
  handleGrenadeTargeting(event) {
    event.preventDefault();
    
    // Check if we have enough energy - now requires FULL energy
    if (this.energy < this.maxEnergy) {
      console.log("Not enough energy for grenade");
      return;
    }
    
    // Get the position where to throw the grenade
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Raycasting to get the point on the floor
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // Only consider the floor for targeting
    const intersects = raycaster.intersectObject(this.floor);
    
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
      this.ui.updateEnergy(this.energy, this.maxEnergy);
      
      // Create and launch the grenade
      this.launchGrenade(targetPoint);
      
      // Play grenade sound
      this.playSound('grenade-laser');
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
  }
  
  // Add a method to show targeting indicator for all weapons
  updateTargetingIndicator(event) {
    // Get the mouse position in normalized device coordinates
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    // Use raycasting to determine the point in 3D space
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // Check for intersection with the floor
    const intersects = raycaster.intersectObject(this.floor);
    
    if (intersects.length > 0) {
      const targetPoint = intersects[0].point;
      
      // Create or update targeting indicator
      if (!this.targetingIndicator) {
        // Create a simple indicator
        const geometry = new THREE.RingGeometry(0.2, 0.3, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        this.targetingIndicator = new THREE.Mesh(geometry, material);
        this.targetingIndicator.rotation.x = Math.PI / 2; // Make it horizontal
        this.scene.add(this.targetingIndicator);
      }
      
      // Position indicator at the target point
      this.targetingIndicator.position.copy(targetPoint);
      this.targetingIndicator.position.y = 0.05; // Slightly above floor
      
      // Set color based on weapon type
      switch(this.currentWeapon) {
        case 'LASER':
          this.targetingIndicator.material.color.set(0x00ffff);
          break;
        case 'GRENADE':
          this.targetingIndicator.material.color.set(0xff4500);
          break;
        case 'BOUNCE':
          this.targetingIndicator.material.color.set(0x00ff99);
          break;
      }
      
      // Add subtle pulse animation
      if (!this.targetingIndicator.pulse) {
        this.targetingIndicator.pulse = 0;
      }
      this.targetingIndicator.pulse += 0.1;
      const scale = 1 + 0.1 * Math.sin(this.targetingIndicator.pulse);
      this.targetingIndicator.scale.set(scale, scale, scale);
      
      // Show indicator
      this.targetingIndicator.visible = true;
      
      // Hide it after 2 seconds of inactivity
      clearTimeout(this.targetingTimeout);
      this.targetingTimeout = setTimeout(() => {
        if (this.targetingIndicator) {
          this.targetingIndicator.visible = false;
        }
      }, 2000);
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
  cleanup() {
    // Stop and remove all sounds
    this.soundPools.forEach(pool => {
      pool.forEach(wrapper => {
        if (wrapper.sound.isPlaying) {
          wrapper.sound.stop();
        }
        wrapper.sound.buffer = null;
      });
    });
    
    // Clear sound pools and loaded sounds
    this.soundPools.clear();
    this.loadedSounds.clear();
    this.soundLoadPromises.clear();
    
    // Remove audio listener from camera
    if (this.audioListener) {
      this.camera.remove(this.audioListener);
      this.audioListener = null;
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.boundHandleResize);
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('keyup', this.boundHandleKeyUp);
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    
    // Clear timers
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    
    if (this.mouseMoveTimer) {
      clearTimeout(this.mouseMoveTimer);
      this.mouseMoveTimer = null;
    }
    
    // Clear weapon cooldowns
    this.weaponCooldowns.clear();
    
    // Clear key states
    Object.keys(this.keys).forEach(key => {
      this.keys[key] = false;
    });
    this.activeKeys.clear();
  }

  startGame() {
    // Hide start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
      startScreen.classList.add('fade-out');
      setTimeout(() => {
        startScreen.classList.add('hidden');
        startScreen.classList.remove('fade-out');
      }, 500);
    }

    // Show game UI
    this.ui.show();

    // Start animation loop
    this.animate();
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

    // Check for intersection with the floor
    const intersects = raycaster.intersectObject(this.floor);

    if (intersects.length > 0) {
      const targetPoint = intersects[0].point;

      // Calculate direction from ship to target
      const direction = targetPoint.clone().sub(this.playerShip.position).normalize();
      direction.y = 0; // Keep shots parallel to ground

      // Get firing position (slightly in front of ship)
      const position = this.playerShip.position.clone().add(direction.multiplyScalar(1.5));
      position.y = 0.5; // Set height

      // Fire weapon in calculated direction
      this.fireCurrentWeapon(direction);
    }
  }

  fireCurrentWeapon(direction) {
    // Check weapon cooldown
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

    // Get firing position (slightly in front of ship)
    const shipDirection = direction || new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerShip.quaternion);
    const position = this.playerShip.position.clone().add(shipDirection.multiplyScalar(1.5));
    position.y = 0.5; // Set height

    // Create weapon effect based on type
    switch (this.currentWeapon) {
      case 'LASER':
        this.fireLaser(position, shipDirection);
        break;
      case 'BOUNCE':
        this.fireBouncingLaser(position, shipDirection);
        break;
      case 'GRENADE':
        // Grenades are handled separately through handleGrenadeTargeting
        break;
    }

    // Play appropriate sound
    const soundMap = {
      'LASER': 'laser',
      'BOUNCE': 'laser-bounce',
      'GRENADE': 'grenade-laser'
    };

    this.playSound(soundMap[this.currentWeapon]);
  }

  fireLaser(position, direction) {
    // Create laser geometry - make it longer and thinner for better visual
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
    geometry.rotateX(Math.PI / 2);

    // Create glowing material with better visual effects
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });

    const laser = new THREE.Mesh(geometry, material);
    laser.position.copy(position);

    // Orient laser along direction - using lookAt for more accurate direction
    const targetPos = position.clone().add(direction.clone().multiplyScalar(1));
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
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize game
  const game = new SimpleGame();
  
  // Add start button event listener
  document.getElementById('start-button').addEventListener('click', () => {
    game.startGame();
  });
}); 