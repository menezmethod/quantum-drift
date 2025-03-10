import * as THREE from 'three';

export class GameRoom {
  constructor(scene, size = { width: 60, height: 60 }, theme = 'space-station') {
    this.scene = scene;
    this.size = size;
    this.theme = theme;
    
    // Room properties
    this.roomObjects = [];
    this.obstacles = [];
    this.spawnPoints = [];
    this.coverPoints = [];
    this.roomCenter = new THREE.Vector3(0, 0, 0);
    
    // Generate room
    this.generateRoom();
  }
  
  generateRoom() {
    // Create room floor
    this.createFloor();
    
    // Create room walls
    this.createWalls();
    
    // Add obstacles and cover points
    this.addObstacles();
    
    // Add spawn points
    this.addSpawnPoints();
    
    // Add decorative elements
    this.addDecorations();
  }
  
  createFloor() {
    // Create floor with grid texture
    const floorGeometry = new THREE.PlaneGeometry(this.size.width, this.size.height);
    
    // Create custom shader material for grid effect
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: this.getThemeColors().floor,
      roughness: 0.8,
      metalness: 0.2,
      emissive: this.getThemeColors().floorEmissive,
      emissiveIntensity: 0.1
    });
    
    // Create floor mesh
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    this.scene.add(floor);
    this.roomObjects.push(floor);
    
    // Add grid lines
    this.addGridLines();
  }
  
  addGridLines() {
    // Create grid material
    const gridMaterial = new THREE.LineBasicMaterial({ 
      color: this.getThemeColors().grid,
      transparent: true,
      opacity: 0.3
    });
    
    // Create horizontal grid lines
    const gridStep = 5;
    const halfWidth = this.size.width / 2;
    const halfHeight = this.size.height / 2;
    
    const gridHelper = new THREE.GridHelper(
      Math.max(this.size.width, this.size.height), 
      Math.max(this.size.width, this.size.height) / gridStep
    );
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    gridHelper.position.y = 0.02; // Slightly above floor to prevent z-fighting
    this.scene.add(gridHelper);
    this.roomObjects.push(gridHelper);
  }
  
  createWalls() {
    // Create walls around the room
    const wallHeight = 3;
    const wallThickness = 1;
    
    // Calculate positions
    const halfWidth = this.size.width / 2;
    const halfHeight = this.size.height / 2;
    
    // Get theme wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.getThemeColors().wall,
      emissive: this.getThemeColors().wallEmissive,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7
    });
    
    // North Wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.size.width + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -halfHeight - wallThickness/2);
    this.scene.add(northWall);
    this.roomObjects.push(northWall);
    this.obstacles.push({
      type: 'wall',
      position: northWall.position.clone(),
      size: new THREE.Vector3(this.size.width + wallThickness*2, wallHeight, wallThickness)
    });
    
    // South Wall
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(this.size.width + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial
    );
    southWall.position.set(0, wallHeight / 2, halfHeight + wallThickness/2);
    this.scene.add(southWall);
    this.roomObjects.push(southWall);
    this.obstacles.push({
      type: 'wall',
      position: southWall.position.clone(),
      size: new THREE.Vector3(this.size.width + wallThickness*2, wallHeight, wallThickness)
    });
    
    // East Wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, this.size.height + wallThickness * 2),
      wallMaterial
    );
    eastWall.position.set(halfWidth + wallThickness/2, wallHeight / 2, 0);
    this.scene.add(eastWall);
    this.roomObjects.push(eastWall);
    this.obstacles.push({
      type: 'wall',
      position: eastWall.position.clone(),
      size: new THREE.Vector3(wallThickness, wallHeight, this.size.height + wallThickness*2)
    });
    
    // West Wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, this.size.height + wallThickness * 2),
      wallMaterial
    );
    westWall.position.set(-halfWidth - wallThickness/2, wallHeight / 2, 0);
    this.scene.add(westWall);
    this.roomObjects.push(westWall);
    this.obstacles.push({
      type: 'wall',
      position: westWall.position.clone(),
      size: new THREE.Vector3(wallThickness, wallHeight, this.size.height + wallThickness*2)
    });
  }
  
  addObstacles() {
    // Add between 5-10 random obstacles in the room
    const obstacleCount = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < obstacleCount; i++) {
      this.addRandomObstacle();
    }
  }
  
  addRandomObstacle() {
    // Types of obstacles: block, cylinder, barrier
    const types = ['block', 'cylinder', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Random position in the room
    const halfWidth = this.size.width / 2 - 5; // Stay away from walls
    const halfHeight = this.size.height / 2 - 5;
    
    const x = (Math.random() * 2 - 1) * halfWidth;
    const z = (Math.random() * 2 - 1) * halfHeight;
    
    // Random size
    const width = 2 + Math.random() * 5;
    const height = 1 + Math.random() * 2;
    const depth = 2 + Math.random() * 5;
    
    // Create obstacle based on type
    let mesh;
    let obstacleData = {
      type: 'obstacle',
      position: new THREE.Vector3(x, height/2, z)
    };
    
    switch (type) {
      case 'block':
        const blockGeometry = new THREE.BoxGeometry(width, height, depth);
        const blockMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().obstacle,
          emissive: this.getThemeColors().obstacleEmissive,
          emissiveIntensity: 0.3,
          roughness: 0.5,
          metalness: 0.5
        });
        mesh = new THREE.Mesh(blockGeometry, blockMaterial);
        mesh.position.set(x, height/2, z);
        obstacleData.size = new THREE.Vector3(width, height, depth);
        break;
        
      case 'cylinder':
        const radius = width / 2;
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, 16);
        const cylinderMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().obstacle,
          emissive: this.getThemeColors().obstacleEmissive,
          emissiveIntensity: 0.3,
          roughness: 0.5,
          metalness: 0.5
        });
        mesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        mesh.position.set(x, height/2, z);
        obstacleData.radius = radius;
        obstacleData.height = height;
        break;
        
      case 'barrier':
        const barrierGeometry = new THREE.BoxGeometry(width, height, 0.5);
        const barrierMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().obstacle,
          emissive: this.getThemeColors().obstacleEmissive,
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.7,
          transparent: true,
          opacity: 0.8
        });
        mesh = new THREE.Mesh(barrierGeometry, barrierMaterial);
        mesh.position.set(x, height/2, z);
        
        // Random rotation
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        obstacleData.size = new THREE.Vector3(width, height, 0.5);
        obstacleData.rotation = mesh.rotation.clone();
        break;
    }
    
    this.scene.add(mesh);
    this.roomObjects.push(mesh);
    this.obstacles.push(obstacleData);
    
    // Add a cover point near this obstacle
    this.coverPoints.push(new THREE.Vector3(
      x + (Math.random() - 0.5) * 3,
      0,
      z + (Math.random() - 0.5) * 3
    ));
  }
  
  addSpawnPoints() {
    // Add spawn points in the corners
    const halfWidth = this.size.width / 2 - 8;
    const halfHeight = this.size.height / 2 - 8;
    
    // Four corners
    this.spawnPoints.push(
      new THREE.Vector3(-halfWidth, 0, -halfHeight),
      new THREE.Vector3(halfWidth, 0, -halfHeight),
      new THREE.Vector3(-halfWidth, 0, halfHeight),
      new THREE.Vector3(halfWidth, 0, halfHeight)
    );
    
    // Add a few more random spawn points
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() * 2 - 1) * halfWidth;
      const z = (Math.random() * 2 - 1) * halfHeight;
      this.spawnPoints.push(new THREE.Vector3(x, 0, z));
    }
  }
  
  addDecorations() {
    // Add decorative elements based on theme
    const decorationCount = 10 + Math.floor(Math.random() * 10);
    
    // Add lights around the room
    for (let i = 0; i < decorationCount; i++) {
      this.addRandomDecoration();
    }
    
    // Add room lights
    this.addRoomLights();
  }
  
  addRandomDecoration() {
    // Types of decorations: console, crate, panel
    const types = ['console', 'crate', 'panel'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Random position near walls
    const halfWidth = this.size.width / 2 - 2;
    const halfHeight = this.size.height / 2 - 2;
    
    let x, z;
    const nearWall = Math.random() > 0.5;
    
    if (nearWall) {
      // Position near a wall
      if (Math.random() > 0.5) {
        // Near east/west wall
        x = (Math.random() > 0.5 ? 1 : -1) * halfWidth;
        z = (Math.random() * 2 - 1) * halfHeight;
      } else {
        // Near north/south wall
        x = (Math.random() * 2 - 1) * halfWidth;
        z = (Math.random() > 0.5 ? 1 : -1) * halfHeight;
      }
    } else {
      // Random position
      x = (Math.random() * 2 - 1) * halfWidth;
      z = (Math.random() * 2 - 1) * halfHeight;
    }
    
    // Create decoration based on type
    let mesh;
    
    switch (type) {
      case 'console':
        const consoleGeometry = new THREE.BoxGeometry(2, 1, 1);
        const consoleMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().console,
          emissive: this.getThemeColors().consoleEmissive,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.8
        });
        mesh = new THREE.Mesh(consoleGeometry, consoleMaterial);
        
        // Add a light on top
        const consoleLight = new THREE.PointLight(
          this.getThemeColors().consoleLight, 
          0.5, 
          5
        );
        consoleLight.position.set(0, 1, 0);
        mesh.add(consoleLight);
        break;
        
      case 'crate':
        const crateGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const crateMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().crate,
          roughness: 0.7,
          metalness: 0.2
        });
        mesh = new THREE.Mesh(crateGeometry, crateMaterial);
        break;
        
      case 'panel':
        const panelGeometry = new THREE.PlaneGeometry(2, 1.5);
        const panelMaterial = new THREE.MeshStandardMaterial({
          color: this.getThemeColors().panel,
          emissive: this.getThemeColors().panelEmissive,
          emissiveIntensity: 0.3,
          roughness: 0.4,
          metalness: 0.6,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(panelGeometry, panelMaterial);
        
        // Orient towards center
        mesh.lookAt(this.roomCenter);
        // Adjust to be vertical
        mesh.rotation.x = 0;
        break;
    }
    
    mesh.position.set(x, 0.75, z);
    this.scene.add(mesh);
    this.roomObjects.push(mesh);
  }
  
  addRoomLights() {
    // Ambient light for the room
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    this.scene.add(ambientLight);
    this.roomObjects.push(ambientLight);
    
    // Add main overhead light
    const mainLight = new THREE.PointLight(
      this.getThemeColors().mainLight, 
      1, 
      100
    );
    mainLight.position.set(0, 15, 0);
    this.scene.add(mainLight);
    this.roomObjects.push(mainLight);
    
    // Add accent lights in corners
    const cornerLightPositions = [
      new THREE.Vector3(-this.size.width / 3, 5, -this.size.height / 3),
      new THREE.Vector3(this.size.width / 3, 5, -this.size.height / 3),
      new THREE.Vector3(-this.size.width / 3, 5, this.size.height / 3),
      new THREE.Vector3(this.size.width / 3, 5, this.size.height / 3)
    ];
    
    for (const position of cornerLightPositions) {
      const cornerLight = new THREE.PointLight(
        this.getThemeColors().accentLight,
        0.6,
        30
      );
      cornerLight.position.copy(position);
      this.scene.add(cornerLight);
      this.roomObjects.push(cornerLight);
    }
  }
  
  getRandomSpawnPoint() {
    if (this.spawnPoints.length === 0) return new THREE.Vector3(0, 0, 0);
    return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone();
  }
  
  /**
   * Get all obstacles in the room, including walls and other objects
   * @returns {Array} Array of obstacles with position and size/radius information
   */
  getObstacles() {
    const obstacles = [];
    
    // Add walls
    if (this.walls && this.walls.length > 0) {
      obstacles.push(...this.walls.map(wall => ({
        type: 'wall',
        position: wall.position.clone(),
        size: wall.size ? { x: wall.size.x, y: wall.size.y, z: wall.size.z } : { x: 1, y: 1, z: 1 },
        rotation: wall.rotation ? wall.rotation.clone() : new THREE.Euler()
      })));
    }
    
    // Add other obstacles like pillars, etc.
    if (this.obstacles && this.obstacles.length > 0) {
      obstacles.push(...this.obstacles.map(obstacle => {
        if (obstacle.geometry && obstacle.geometry.type.includes('Cylinder')) {
          // Cylindrical obstacles
          return {
            type: 'cylinder',
            position: obstacle.position.clone(),
            radius: obstacle.geometry.parameters?.radiusTop || 1,
            height: obstacle.geometry.parameters?.height || 2
          };
        } else {
          // Box obstacles
          return {
            type: 'box',
            position: obstacle.position.clone(),
            size: {
              x: obstacle.scale.x,
              y: obstacle.scale.y,
              z: obstacle.scale.z
            },
            rotation: obstacle.rotation.clone()
          };
        }
      }));
    }
    
    // Add environmental hazards if they exist
    if (this.hazards && this.hazards.length > 0) {
      obstacles.push(...this.hazards.map(hazard => ({
        type: 'hazard',
        position: hazard.position.clone(),
        radius: hazard.radius || 1,
        damage: hazard.damage || 10
      })));
    }
    
    return obstacles;
  }
  
  cleanup() {
    // Remove all room objects from the scene
    for (const object of this.roomObjects) {
      this.scene.remove(object);
      
      // Dispose geometries and materials
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
    }
    
    // Clear arrays
    this.roomObjects = [];
    this.obstacles = [];
    this.spawnPoints = [];
    this.coverPoints = [];
  }
  
  getThemeColors() {
    // Return colors based on room theme
    switch(this.theme) {
      case 'alien-hive':
        return {
          floor: 0x112211,
          floorEmissive: 0x224422,
          wall: 0x336633,
          wallEmissive: 0x44ff44,
          grid: 0x33ff33,
          obstacle: 0x225522,
          obstacleEmissive: 0x33ff33,
          console: 0x336633,
          consoleEmissive: 0x44ff66,
          consoleLight: 0x66ff66,
          crate: 0x225522,
          panel: 0x112211,
          panelEmissive: 0x33ff33,
          mainLight: 0x33ff33,
          accentLight: 0x66ff66
        };
      case 'neon-city':
        return {
          floor: 0x000011,
          floorEmissive: 0x000033,
          wall: 0x110022,
          wallEmissive: 0xff00ff,
          grid: 0x0088ff,
          obstacle: 0x220033,
          obstacleEmissive: 0xff00ff,
          console: 0x330044,
          consoleEmissive: 0xff00ff,
          consoleLight: 0xff00ff,
          crate: 0x110022,
          panel: 0x220044,
          panelEmissive: 0xff00aa,
          mainLight: 0xffffff,
          accentLight: 0xff00ff
        };
      case 'space-station':
      default:
        return {
          floor: 0x111122,
          floorEmissive: 0x0000ff,
          wall: 0x334455,
          wallEmissive: 0x0088ff,
          grid: 0x0088ff,
          obstacle: 0x334455,
          obstacleEmissive: 0x0088ff,
          console: 0x223344,
          consoleEmissive: 0x00ffff,
          consoleLight: 0x00ffff,
          crate: 0x445566,
          panel: 0x223344,
          panelEmissive: 0x0088ff,
          mainLight: 0xaaccff,
          accentLight: 0x0088ff
        };
    }
  }
} 