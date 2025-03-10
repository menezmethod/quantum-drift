import * as THREE from 'three';

class Scene {
    constructor(engine) {
        this.engine = engine;
        this.scene = engine.scene;
        
        // Scene elements
        this.floor = null;
        this.playerHighlight = null;
        this.obstacles = [];
        
        // Scene properties
        this.boundarySize = 25;
        this.gridSize = 100;
        this.gridDivisions = 100;
    }

    init() {
        this.createFloor();
        this.createBoundaryMarkers();
        this.createObstacles();
        return this;
    }

    createFloor() {
        // Create grid
        const gridHelper = new THREE.GridHelper(
            this.gridSize,
            this.gridDivisions,
            0x444444,
            0x222222
        );
        this.engine.add(gridHelper);

        // Create floor with glow effect
        const floorGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x000022,
            transparent: true,
            opacity: 0.2,
        });

        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -0.01;
        this.engine.add(this.floor);

        // Create player highlight
        const highlightGeometry = new THREE.CircleGeometry(5, 32);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
        });

        this.playerHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        this.playerHighlight.rotation.x = -Math.PI / 2;
        this.playerHighlight.position.y = 0.02;
        this.engine.add(this.playerHighlight);
    }

    createBoundaryMarkers() {
        const markerSize = 1;
        const markerHeight = 1;
        const numMarkers = 10;

        const markerGeometry = new THREE.BoxGeometry(markerSize, markerHeight, markerSize);
        const markerMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x600000,
            transparent: true,
            opacity: 0.7
        });

        const markers = new THREE.Group();

        for (let i = 0; i < numMarkers; i++) {
            const t = (i / (numMarkers - 1)) * 2 - 1;
            const position = this.boundarySize * t;

            ['north', 'south', 'east', 'west'].forEach(direction => {
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                
                switch(direction) {
                    case 'north':
                        marker.position.set(position, markerHeight / 2, -this.boundarySize);
                        break;
                    case 'south':
                        marker.position.set(position, markerHeight / 2, this.boundarySize);
                        break;
                    case 'east':
                        marker.position.set(this.boundarySize, markerHeight / 2, position);
                        break;
                    case 'west':
                        marker.position.set(-this.boundarySize, markerHeight / 2, position);
                        break;
                }
                
                markers.add(marker);
            });
        }

        this.engine.add(markers);
    }

    createObstacles() {
        const numObstacles = 15;
        
        for (let i = 0; i < numObstacles; i++) {
            const obstacle = this.createRandomObstacle();
            if (obstacle) {
                this.obstacles.push(obstacle);
                this.engine.add(obstacle);
            }
        }
    }

    createRandomObstacle() {
        const shapeType = Math.floor(Math.random() * 3);
        let geometry, size;

        // Create random geometry
        switch(shapeType) {
            case 0: // Box
                size = 1.5 + Math.random() * 3;
                const height = 3 + Math.random() * 4;
                geometry = new THREE.BoxGeometry(size, height, size);
                break;
            case 1: // Cylinder
                const radius = 1 + Math.random() * 2;
                const cylinderHeight = 4 + Math.random() * 5;
                geometry = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 16);
                size = radius * 2;
                break;
            case 2: // Sphere
                const sphereRadius = 1.5 + Math.random() * 2;
                geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
                size = sphereRadius * 2;
                break;
        }

        // Create neon material
        const hue = Math.random();
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color.clone().multiplyScalar(0.5),
            shininess: 100
        });

        // Create mesh
        const obstacle = new THREE.Mesh(geometry, material);

        // Add point light
        const light = new THREE.PointLight(color, 0.5, 5);
        light.position.set(0, 0, 0);
        obstacle.add(light);

        // Set random position (avoiding player spawn area)
        let x, z;
        let validPosition = false;

        while (!validPosition) {
            x = (Math.random() - 0.5) * 45;
            z = (Math.random() - 0.5) * 45;
            
            const distanceFromOrigin = Math.sqrt(x * x + z * z);
            if (distanceFromOrigin > 10) {
                validPosition = true;
            }
        }

        const y = shapeType === 2 ? Math.random() * 3 : size / 2;
        obstacle.position.set(x, y, z);

        return obstacle;
    }

    updatePlayerHighlight(playerPosition) {
        if (this.playerHighlight) {
            this.playerHighlight.position.x = playerPosition.x;
            this.playerHighlight.position.z = playerPosition.z;
            
            const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2;
            this.playerHighlight.material.opacity = 0.05 + pulseFactor * 0.1;
        }
    }

    getFloor() {
        return this.floor;
    }

    getObstacles() {
        return this.obstacles;
    }

    getBoundarySize() {
        return this.boundarySize;
    }

    cleanup() {
        // Cleanup all obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        
        // Clear arrays
        this.obstacles = [];
    }
}

export default Scene; 