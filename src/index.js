import * as THREE from 'three';
import './styles/main.css';

// Basic Three.js game with a ship
class SimpleGame {
  constructor() {
    // Track assets loading
    this.assetsLoaded = false;
    this.shipModelLoaded = false;
    
    // Setup basic Three.js scene
    this.setupScene();
    
    // Load assets
    this.loadAssets();
    
    // Setup controls
    this.setupControls();
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    console.log('Simple game initialized!');
  }
  
  setupScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 15, -8); // Higher position for more top-down view
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
    // Create placeholder ship until model loads
    this.createDefaultShip();
    
    // Load the 3D ship model
    this.loadShipModel();
    
    // Check loading progress
    this.checkLoadingProgress();
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
    // Show loading message
    console.log('Loading ship model...');
    
    // Dynamically import the GLTFLoader
    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      // Create GLTFLoader
      const loader = new GLTFLoader();
      
      // Load the model
      loader.load(
        'assets/models/ships/avrocar_vz-9-av_experimental_aircraft.glb',
        (gltf) => {
          console.log('Ship model loaded successfully!');
          
          // Store the model
          this.shipModel = gltf.scene;
          
          // Scale and position the model
          this.shipModel.scale.set(0.3, 0.3, 0.3);
          this.shipModel.rotation.y = Math.PI; // Rotate to face forward
          
          // Apply materials
          this.shipModel.traverse((child) => {
            if (child.isMesh) {
              // Add emissive glow to the ship
              if (child.material) {
                child.material.emissive = new THREE.Color(0x006666);
                child.material.emissiveIntensity = 0.5;
                child.material.needsUpdate = true;
              }
            }
          });
          
          // Add thruster glow
          this.addThrusterGlow();
          
          // Add the model to the playerShip group
          this.scene.remove(this.playerShip);
          this.playerShip = new THREE.Group();
          this.playerShip.add(this.shipModel);
          this.playerShip.position.set(0, 0.5, 0);
          this.scene.add(this.playerShip);
          
          // Add a point light to the ship to make it glow
          const light = new THREE.PointLight(0x00ffff, 1, 2);
          light.position.set(0, 0, 0);
          this.playerShip.add(light);
          
          // Mark ship as loaded
          this.shipModelLoaded = true;
        },
        (xhr) => {
          // Loading progress
          const progress = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading ship model: ${Math.round(progress)}%`);
        },
        (error) => {
          // Error loading model
          console.error('Error loading ship model:', error);
          // Keep using the default ship
        }
      );
    }).catch(error => {
      console.error('Error importing GLTFLoader:', error);
    });
  }
  
  addThrusterGlow() {
    // Create a glow for the thruster
    const thrusterGeometry = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 12);
    const thrusterMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7
    });
    
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    thruster.position.set(0, 0, -0.7); // Position at the back of the ship
    thruster.rotation.x = Math.PI / 2;
    
    // Add point light for the thruster
    const thrusterLight = new THREE.PointLight(0x00ffff, 1, 2);
    thrusterLight.position.copy(thruster.position);
    
    // Add to ship model
    this.shipModel.add(thruster);
    this.shipModel.add(thrusterLight);
  }
  
  checkLoadingProgress() {
    // Check if assets are loaded
    if (this.shipModelLoaded) {
      this.assetsLoaded = true;
      
      // Hide loading screen and show start screen
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
    } else {
      // Check again in 1 second
      setTimeout(() => this.checkLoadingProgress(), 1000);
    }
  }
  
  startGame() {
    // Hide start screen
    document.getElementById('start-screen').classList.add('hidden');
    
    // Show controls info
    document.querySelector('.controls-info').classList.remove('hidden');
    
    // Show control indicators
    if (this.controlsContainer) {
      this.controlsContainer.classList.remove('hidden');
    }
    
    // Start animation loop
    this.animate();
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
    // Store key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      strafeLeft: false,
      strafeRight: false,
      fire: false
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
      Space: 'fire'
    };
    
    // Store active keys for visual feedback
    this.activeKeys = new Set();
    
    // Add visual indicators for controls
    this.createControlIndicators();
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      // Get control action from key mapping
      const action = this.keyMap[event.code];
      
      // Skip if key isn't mapped
      if (!action) return;
      
      // Set key state to active
      this.keys[action] = true;
      
      // Store active key for visual feedback
      this.activeKeys.add(event.code);
      
      // Handle fire action immediately (not just in update loop)
      if (action === 'fire') {
        this.fireLaser();
      }
      
      // Prevent default browser behavior for these keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (event) => {
      // Get control action from key mapping
      const action = this.keyMap[event.code];
      
      // Skip if key isn't mapped
      if (!action) return;
      
      // Set key state to inactive
      this.keys[action] = false;
      
      // Remove from active keys
      this.activeKeys.delete(event.code);
    });
  }
  
  createControlIndicators() {
    // Create a container for the control indicators
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'control-indicators';
    document.body.appendChild(controlsContainer);
    
    // Create indicators for each key
    const indicators = {
      forward: { key: 'W', label: '↑' },
      backward: { key: 'S', label: '↓' },
      left: { key: 'A', label: '←' },
      right: { key: 'D', label: '→' },
      strafeLeft: { key: 'Q', label: '⟲' },
      strafeRight: { key: 'E', label: '⟳' },
      fire: { key: 'SPACE', label: '🔥' }
    };
    
    for (const [action, info] of Object.entries(indicators)) {
      const indicator = document.createElement('div');
      indicator.className = 'key-indicator';
      indicator.id = `indicator-${action}`;
      indicator.innerHTML = `<span class="key">${info.key}</span><span class="label">${info.label}</span>`;
      controlsContainer.appendChild(indicator);
    }
    
    // Store reference to the container
    this.controlsContainer = controlsContainer;
    
    // Initially hide the indicators
    controlsContainer.classList.add('hidden');
  }
  
  updateControlIndicators() {
    // Skip if control indicators aren't created yet
    if (!this.controlsContainer) return;
    
    // Update each indicator based on key state
    for (const [action, isActive] of Object.entries(this.keys)) {
      const indicator = document.getElementById(`indicator-${action}`);
      if (indicator) {
        if (isActive) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      }
    }
  }
  
  fireLaser() {
    // Create a simple laser geometry
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    geometry.rotateX(Math.PI / 2);
    
    // Create glowing material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    
    // Create laser mesh
    const laser = new THREE.Mesh(geometry, material);
    
    // Position in front of the ship
    laser.position.copy(this.playerShip.position);
    laser.rotation.copy(this.playerShip.rotation);
    
    // Move the laser in front of the ship
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.playerShip.quaternion);
    laser.position.add(direction);
    
    // Add to scene
    this.scene.add(laser);
    
    // Add a point light to make it glow
    const light = new THREE.PointLight(0x00ffff, 1, 2);
    laser.add(light);
    
    // Store laser data for animation
    if (!this.lasers) {
      this.lasers = [];
    }
    
    this.lasers.push({
      mesh: laser,
      direction: direction,
      speed: 0.5,
      lifeTime: 0,
      maxLifeTime: 100
    });
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update player position and rotation
    this.updatePlayer();
    
    // Update lasers
    this.updateLasers();
    
    // Update camera to follow player
    this.updateCamera();
    
    // Update player highlight position
    if (this.playerHighlight) {
      this.playerHighlight.position.x = this.playerShip.position.x;
      this.playerHighlight.position.z = this.playerShip.position.z;
      
      // Pulse the highlight opacity for a more dynamic effect
      const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2; // 0 to 1
      this.playerHighlight.material.opacity = 0.05 + pulseFactor * 0.1;
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  updatePlayer() {
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
      
      // Increment lifetime
      laser.lifeTime++;
      
      // Remove old lasers
      if (laser.lifeTime > laser.maxLifeTime) {
        this.scene.remove(laser.mesh);
        this.lasers.splice(i, 1);
        continue;
      }
      
      // Check for collisions with obstacles
      for (let j = 0; j < this.obstacles.length; j++) {
        const obstacle = this.obstacles[j];
        
        // Simple distance check
        if (laser.mesh.position.distanceTo(obstacle.position) < 1.5) {
          // Create hit effect
          this.createHitEffect(laser.mesh.position);
          
          // Remove laser
          this.scene.remove(laser.mesh);
          this.lasers.splice(i, 1);
          break;
        }
      }
    }
  }
  
  createHitEffect(position) {
    // Create a sphere for the hit effect
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    
    const hitEffect = new THREE.Mesh(geometry, material);
    hitEffect.position.copy(position);
    this.scene.add(hitEffect);
    
    // Add point light
    const light = new THREE.PointLight(0x00ffff, 2, 3);
    light.position.copy(position);
    this.scene.add(light);
    
    // Animate hit effect
    let scale = 1.0;
    const expandSpeed = 0.1;
    
    const animate = () => {
      scale += expandSpeed;
      hitEffect.scale.set(scale, scale, scale);
      
      // Fade out
      material.opacity -= 0.05;
      light.intensity -= 0.1;
      
      if (material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        // Remove hit effect
        this.scene.remove(hitEffect);
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
    const offsetY = 15; // Height above the player
    const offsetZ = -8; // Distance behind the player
    
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
    const lookAheadOffset = forwardDir.clone().multiplyScalar(2);
    this.cameraTargetLookAt.add(lookAheadOffset);
    
    // Directly look at the target (no smoothing on look target to prevent jitter)
    this.camera.lookAt(this.cameraTargetLookAt);
  }
  
  handleResize() {
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  updateThrusterEffects() {
    // Skip if ship model isn't loaded
    if (!this.shipModel) return;
    
    // Find the thruster (added in addThrusterGlow)
    const thruster = this.shipModel.children.find(child => 
      child.geometry && child.geometry.type === 'CylinderGeometry' && 
      child.position.z < 0 // Positioned at the back of the ship
    );
    
    // Skip if thruster isn't found
    if (!thruster) return;
    
    // Find thruster light
    const thrusterLight = this.shipModel.children.find(child => 
      child.type === 'PointLight' && 
      child.position.z < 0 // Positioned at the back of the ship
    );
    
    // Base thruster scale and opacity on movement
    const isMovingForward = this.keys.forward;
    const isMovingBackward = this.keys.backward;
    
    if (isMovingForward) {
      // Full thruster when moving forward
      thruster.scale.set(1, 1, 1 + Math.random() * 0.2); // Slight random variation
      thruster.material.opacity = 0.7 + Math.random() * 0.3;
      if (thrusterLight) {
        thrusterLight.intensity = 1.2 + Math.random() * 0.3;
      }
    } else if (isMovingBackward) {
      // Reduced thruster when moving backward
      thruster.scale.set(0.5, 0.5, 0.3 + Math.random() * 0.1);
      thruster.material.opacity = 0.3 + Math.random() * 0.2;
      if (thrusterLight) {
        thrusterLight.intensity = 0.5 + Math.random() * 0.2;
      }
    } else {
      // Idle thruster when not moving
      thruster.scale.set(0.7, 0.7, 0.2 + Math.random() * 0.1);
      thruster.material.opacity = 0.2 + Math.random() * 0.1;
      if (thrusterLight) {
        thrusterLight.intensity = 0.3 + Math.random() * 0.1;
      }
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