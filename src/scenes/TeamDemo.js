import * as THREE from 'three';
import { TeamManager, GAME_MODES } from '../core/TeamManager';
import { Enemy } from '../entities/enemies/Enemy';
import { Player } from '../entities/player/Player';

export class TeamDemo {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            gameMode: GAME_MODES.TEAM_VS_TEAM,
            playerCount: 2,
            enemyCount: 4,
            ...options
        };

        // Initialize team manager
        this.teamManager = new TeamManager(this.options.gameMode);
        
        // Initialize collections
        this.players = new Map();
        this.enemies = new Map();
        
        // Setup demo
        this.setupDemo();
    }

    setupDemo() {
        // Create players
        for (let i = 0; i < this.options.playerCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                1,
                (Math.random() - 0.5) * 20
            );
            
            const player = new Player(this.scene, position);
            const { teamId, color } = this.teamManager.assignPlayerToTeam(`player${i}`);
            
            player.setTeam(teamId, color);
            this.players.set(`player${i}`, player);
            
            // Log player creation
            console.log(`Created player ${i} on team ${teamId} with color ${color.toString(16)}`);
        }

        // Create enemies
        for (let i = 0; i < this.options.enemyCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                1,
                (Math.random() - 0.5) * 20
            );
            
            const enemyType = ['BASIC', 'HUNTER', 'PATROLLER'][Math.floor(Math.random() * 3)];
            const enemy = new Enemy(this.scene, position, {
                type: enemyType,
                shipModel: ['STANDARD', 'INTERCEPTOR', 'HEAVY', 'SCOUT'][Math.floor(Math.random() * 4)]
            });
            
            // Assign to a random team
            const { teamId, color } = this.teamManager.assignPlayerToTeam(`enemy${i}`);
            enemy.setTeam(teamId, color);
            
            this.enemies.set(`enemy${i}`, enemy);
            
            // Log enemy creation
            console.log(`Created ${enemyType} enemy ${i} on team ${teamId} with color ${color.toString(16)}`);
        }
    }

    update(deltaTime) {
        // Convert players to array for enemy targeting
        const playerArray = Array.from(this.players.values());
        
        // Update all entities
        this.players.forEach(player => {
            if (player.isActive) {
                player.update(deltaTime);
            }
        });

        this.enemies.forEach(enemy => {
            if (enemy.isActive) {
                enemy.update(deltaTime, playerArray, []);
            }
        });
    }

    handleCollisions() {
        // Check collisions between all active entities
        const activeEntities = [
            ...Array.from(this.players.values()).filter(p => p.isActive),
            ...Array.from(this.enemies.values()).filter(e => e.isActive)
        ];

        for (let i = 0; i < activeEntities.length; i++) {
            for (let j = i + 1; j < activeEntities.length; j++) {
                const entity1 = activeEntities[i];
                const entity2 = activeEntities[j];

                // Skip collision check if entities are on the same team
                if (this.teamManager.arePlayersOnSameTeam(entity1.teamId, entity2.teamId)) {
                    continue;
                }

                // Simple distance-based collision
                const distance = entity1.mesh.position.distanceTo(entity2.mesh.position);
                const minDistance = entity1.options.size + entity2.options.size;

                if (distance < minDistance) {
                    // Handle collision
                    entity1.takeDamage(10);
                    entity2.takeDamage(10);
                }
            }
        }
    }

    getTeamScores() {
        return this.teamManager.getTeamScores();
    }

    setGameMode(mode) {
        this.options.gameMode = mode;
        this.teamManager.setGameMode(mode);
        
        // Reassign all entities to teams
        this.players.forEach((player, id) => {
            const { teamId, color } = this.teamManager.assignPlayerToTeam(id);
            player.setTeam(teamId, color);
        });

        this.enemies.forEach((enemy, id) => {
            const { teamId, color } = this.teamManager.assignPlayerToTeam(id);
            enemy.setTeam(teamId, color);
        });
    }
} 