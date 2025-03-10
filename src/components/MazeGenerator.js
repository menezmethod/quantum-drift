import * as THREE from 'three';

export class MazeGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cellSize = 2;
    this.wallThickness = 0.2;
    this.wallHeight = 1;
    
    // Maze grid: 1 = wall, 0 = path
    this.grid = Array(this.height * 2 + 1).fill().map(() => 
      Array(this.width * 2 + 1).fill(1)
    );
    
    // Wall segments for collision detection
    this.wallSegments = [];
  }
  
  generateMaze() {
    // Create a container for all maze elements
    const mazeContainer = new THREE.Group();
    
    // Generate the maze using recursive backtracking
    this.generateMazeGrid();
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(
      this.width * this.cellSize,
      this.height * this.cellSize
    );
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x000020
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    mazeContainer.add(floor);
    
    // Create walls based on grid
    this.createWalls(mazeContainer);
    
    // Add glow effect
    const glowLight = new THREE.PointLight(0xff00ff, 1, 20);
    glowLight.position.set(0, 2, 0);
    mazeContainer.add(glowLight);
    
    return mazeContainer;
  }
  
  generateMazeGrid() {
    // Start with all walls
    for (let y = 0; y < this.height * 2 + 1; y++) {
      for (let x = 0; x < this.width * 2 + 1; x++) {
        this.grid[y][x] = 1;
      }
    }
    
    // Use recursive backtracking to carve paths
    const startX = 1;
    const startY = 1;
    
    // Mark the starting cell as path
    this.grid[startY][startX] = 0;
    
    // Start the recursive carving
    this.carvePassagesFrom(startX, startY);
    
    // Create entrance and exit
    this.grid[1][0] = 0; // Entrance at left
    this.grid[this.height * 2 - 1][this.width * 2] = 0; // Exit at right
  }
  
  carvePassagesFrom(x, y) {
    // Directions: [dx, dy]
    const directions = [
      [2, 0],  // East
      [0, 2],  // South
      [-2, 0], // West
      [0, -2]  // North
    ];
    
    // Shuffle directions for randomness
    directions.sort(() => Math.random() - 0.5);
    
    // Try each direction
    for (const [dx, dy] of directions) {
      const newX = x + dx;
      const newY = y + dy;
      
      // Check if the new position is within bounds and not yet visited
      if (
        newX > 0 && newX < this.width * 2 &&
        newY > 0 && newY < this.height * 2 &&
        this.grid[newY][newX] === 1
      ) {
        // Carve a passage by marking cells as path
        this.grid[y + dy/2][x + dx/2] = 0;
        this.grid[newY][newX] = 0;
        
        // Continue recursively
        this.carvePassagesFrom(newX, newY);
      }
    }
  }
  
  createWalls(mazeContainer) {
    // Create glowing neon material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.7
    });
    
    // Create walls based on grid
    for (let gridY = 0; gridY < this.height * 2 + 1; gridY++) {
      for (let gridX = 0; gridX < this.width * 2 + 1; gridX++) {
        if (this.grid[gridY][gridX] === 1) {
          // Calculate position in 3D space
          const x = (gridX / 2 - this.width / 2) * this.cellSize;
          const z = (gridY / 2 - this.height / 2) * this.cellSize;
          
          // Create wall geometry
          let wallGeometry;
          
          // Determine wall orientation
          if (gridX % 2 === 0 && gridY % 2 === 1) {
            // Vertical wall (East-West)
            wallGeometry = new THREE.BoxGeometry(
              this.wallThickness,
              this.wallHeight,
              this.cellSize + this.wallThickness
            );
            
            // Add wall segment for collision detection
            this.wallSegments.push({
              start: new THREE.Vector3(x - this.wallThickness/2, 0, z - this.cellSize/2),
              end: new THREE.Vector3(x - this.wallThickness/2, 0, z + this.cellSize/2)
            });
            
          } else if (gridX % 2 === 1 && gridY % 2 === 0) {
            // Horizontal wall (North-South)
            wallGeometry = new THREE.BoxGeometry(
              this.cellSize + this.wallThickness,
              this.wallHeight,
              this.wallThickness
            );
            
            // Add wall segment for collision detection
            this.wallSegments.push({
              start: new THREE.Vector3(x - this.cellSize/2, 0, z - this.wallThickness/2),
              end: new THREE.Vector3(x + this.cellSize/2, 0, z - this.wallThickness/2)
            });
            
          } else if (gridX % 2 === 0 && gridY % 2 === 0) {
            // Corner post
            wallGeometry = new THREE.BoxGeometry(
              this.wallThickness,
              this.wallHeight,
              this.wallThickness
            );
          } else {
            continue; // Skip cells that should be empty
          }
          
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(x, this.wallHeight / 2, z);
          mazeContainer.add(wall);
        }
      }
    }
  }
  
  // Method to get wall segments for collision detection
  getWallSegments() {
    return this.wallSegments;
  }
} 