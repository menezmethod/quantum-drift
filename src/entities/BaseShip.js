import * as THREE from 'three';
import { EventEmitter } from 'events';

export class BaseShip extends EventEmitter {
    constructor(scene, position, options = {}) {
        super();
        
        this.options = {
            type: 'BASIC',
            teamId: null,
            teamColor: 0xffffff,
            health: 100,
            maxHealth: 100,
            speed: 0.1,
            size: 1.0,
            shipModel: 'STANDARD',
            ...options
        };

        this.scene = scene;
        this.health = this.options.health;
        this.maxHealth = this.options.maxHealth;
        this.isActive = true;
        this.teamId = this.options.teamId;
        
        // Create ship mesh
        this.createMesh(position);
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Initialize effects
        this.initializeEffects();
    }

    createMesh(position) {
        // Ship models based on type
        const models = {
            STANDARD: () => new THREE.ConeGeometry(this.options.size, this.options.size * 2, 3),
            INTERCEPTOR: () => {
                const geometry = new THREE.ConeGeometry(this.options.size * 0.8, this.options.size * 2.5, 4);
                geometry.rotateX(Math.PI / 2);
                return geometry;
            },
            HEAVY: () => new THREE.CylinderGeometry(
                this.options.size * 1.2,
                this.options.size * 1.4,
                this.options.size * 2,
                6
            ),
            SCOUT: () => {
                const geometry = new THREE.ConeGeometry(this.options.size * 0.6, this.options.size * 2.2, 5);
                geometry.rotateX(Math.PI / 2);
                return geometry;
            }
        };

        // Get geometry based on ship model or fallback to STANDARD
        const geometry = (models[this.options.shipModel] || models.STANDARD)();
        geometry.rotateX(Math.PI / 2);

        // Create material with team color and effects
        this.material = new THREE.MeshStandardMaterial({
            color: this.options.teamColor,
            emissive: this.options.teamColor,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.copy(position);
        this.mesh.position.y = this.options.size;

        // Add engine glow
        this.addEngineGlow();
    }

    addEngineGlow() {
        const engineLight = new THREE.PointLight(this.options.teamColor, 1, 2);
        engineLight.position.set(0, 0, -this.options.size);
        this.mesh.add(engineLight);
    }

    initializeEffects() {
        this.effects = {
            damageTween: null,
            enginePulse: { value: 0 }
        };
    }

    update(deltaTime) {
        if (!this.isActive) return;

        // Update engine pulse effect
        this.updateEngineEffect(deltaTime);
    }

    updateEngineEffect(deltaTime) {
        this.effects.enginePulse.value += deltaTime * 0.005;
        const pulseIntensity = 0.5 + 0.2 * Math.sin(this.effects.enginePulse.value);
        this.material.emissiveIntensity = pulseIntensity;
    }

    takeDamage(amount) {
        if (!this.isActive) return;

        this.health = Math.max(0, this.health - amount);
        this.flashOnDamage();

        if (this.health <= 0) {
            this.destroy();
        }

        // Emit damage event
        this.emit('damage', {
            amount,
            remainingHealth: this.health,
            maxHealth: this.maxHealth
        });
    }

    flashOnDamage() {
        const originalEmissive = this.material.emissive.getHex();
        this.material.emissive.setHex(0xffffff);

        setTimeout(() => {
            if (this.material) {
                this.material.emissive.setHex(originalEmissive);
            }
        }, 100);
    }

    destroy() {
        if (!this.isActive) return;

        this.isActive = false;
        this.createExplosionEffect();
        
        // Emit destroy event
        this.emit('destroy', {
            position: this.mesh.position.clone(),
            teamId: this.teamId
        });

        // Remove from scene after explosion
        setTimeout(() => {
            if (this.mesh && this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
        }, 1000);
    }

    createExplosionEffect() {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            velocities.push(velocity);
            particles.push(new THREE.Vector3(0, 0, 0));
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: this.options.teamColor,
            size: 0.2,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.position.copy(this.mesh.position);
        this.scene.add(particleSystem);

        const startTime = Date.now();
        const duration = 1000;

        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                for (let i = 0; i < particleCount; i++) {
                    particles[i].add(velocities[i]);
                    positions[i * 3] = particles[i].x;
                    positions[i * 3 + 1] = particles[i].y;
                    positions[i * 3 + 2] = particles[i].z;
                }
                geometry.attributes.position.needsUpdate = true;
                material.opacity = 1 - (elapsed / duration);
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(particleSystem);
            }
        };

        animateExplosion();
    }

    setTeam(teamId, teamColor) {
        this.teamId = teamId;
        this.options.teamColor = teamColor;
        if (this.material) {
            this.material.color.setHex(teamColor);
            this.material.emissive.setHex(teamColor);
        }
    }
} 