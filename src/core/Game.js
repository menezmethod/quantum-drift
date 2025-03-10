import { GameEngine } from './GameEngine';
import { GameUI } from '../ui/GameUI';
import { MiniMap } from '../ui/MiniMap';
import { GAME_CONFIG } from '../config/GameConfig';
import * as THREE from 'three';
import { TeamManager, GAME_MODES } from './TeamManager';
import { ShipSelectionUI } from '../ui/ShipSelectionUI';
import { Player } from '../entities/player/Player';
import { Enemy } from '../entities/enemies/Enemy';

export class Game {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            gameMode: GAME_MODES.FREE_FOR_ALL,
            isPremium: false,
            ...options
        };

        // Initialize core components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        // Initialize managers
        this.teamManager = new TeamManager(this.options.gameMode);
        
        // Game state
        this.isRunning = false;
        this.entities = new Map();
        
        // Setup window resize handler
        window.addEventListener('resize', () => this.handleResize());
        
        // Initialize ship selection
        this.initShipSelection();
    }

    initShipSelection() {
        this.shipSelection = new ShipSelectionUI(this.container, {
            isPremium: this.options.isPremium,
            onShipSelect: (selection) => this.startGame(selection)
        });
    }

    startGame(playerSelection) {
        // Hide ship selection
        this.shipSelection.hide();
        
        // Create player
        const player = new Player(this.scene, new THREE.Vector3(0, 0, 0), {
            ...playerSelection.config.stats,
            shipModel: playerSelection.config.model
        });

        // Assign team/color in FFA mode
        const { teamId } = this.teamManager.assignPlayerToTeam('player1');
        player.setTeam(teamId, parseInt(playerSelection.color.replace(/[^\d,]/g, '').split(',').map(x => parseInt(x)).join('')));

        // Store player
        this.entities.set('player1', player);

        // Add some AI players for testing
        this.addAIPlayers(5);

        // Start game loop
        this.isRunning = true;
        this.animate();
    }

    addAIPlayers(count) {
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                0,
                (Math.random() - 0.5) * 40
            );

            const enemy = new Enemy(this.scene, position, {
                type: Math.random() > 0.5 ? 'HUNTER' : 'PATROLLER',
                shipModel: ['SCOUT', 'INTERCEPTOR', 'STANDARD'][Math.floor(Math.random() * 3)]
            });

            // Assign team/color
            const { teamId, color } = this.teamManager.assignPlayerToTeam(`ai${i}`);
            enemy.setTeam(teamId, color);

            // Store enemy
            this.entities.set(`ai${i}`, enemy);
        }
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        const deltaTime = 16; // Assuming 60fps for now
        
        // Update all entities
        const playerArray = Array.from(this.entities.values());
        this.entities.forEach(entity => {
            if (entity instanceof Enemy) {
                entity.update(deltaTime, playerArray, []);
            } else {
                entity.update(deltaTime);
            }
        });

        // Handle collisions
        this.handleCollisions();

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    handleCollisions() {
        const entities = Array.from(this.entities.values()).filter(e => e.isActive);

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];

                // Skip collision check if entities are on the same team
                if (this.teamManager.arePlayersOnSameTeam(entity1.teamId, entity2.teamId)) {
                    continue;
                }

                // Simple distance-based collision
                const distance = entity1.mesh.position.distanceTo(entity2.mesh.position);
                const minDistance = entity1.options.size + entity2.options.size;

                if (distance < minDistance) {
                    entity1.takeDamage(10);
                    entity2.takeDamage(10);
                }
            }
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    destroy() {
        this.isRunning = false;
        
        // Clean up entities
        this.entities.forEach(entity => entity.destroy());
        this.entities.clear();

        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);

        // Clean up THREE.js resources
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Remove renderer
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
} 