import * as THREE from 'three';
import { GLTFLoader } from '@three/examples/loaders/GLTFLoader';
import { ShipSelector, SHIP_TYPES, SHIP_STATUS } from '../config/ShipConfig';
import { TEAM_COLORS } from '../core/TeamManager';
import AssetLoader from '../assets/AssetLoader';

export class ShipSelectionUI {
    constructor(container, options = {}) {
        this.container = container;
        if (!this.container) {
            console.error('Game container not found');
            return;
        }
        
        this.options = {
            onShipSelect: null,
            isPremium: false,
            ...options
        };

        this.selectedShip = 'scout';
        this.selectedColor = '#00ff00';
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.currentModel = null;
        
        // Initialize the asset loader
        this.assetLoader = new AssetLoader().setCallbacks(
            (message) => console.log(`Ship Selection: ${message}`),
            (type, error) => console.error(`Ship Selection Error: ${type} - ${error}`)
        );
        
        this.createUI();
        // Add a small delay to ensure DOM is fully ready
        setTimeout(() => {
            this.setupPreview();
            this.loadShipModels();
        }, 100);
    }

    createUI() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = 'ship-selection';
        this.element.innerHTML = `
            <div class="ship-selection-header">
                <h2>Choose Your Quantum Ship</h2>
                <div class="color-picker">
                    <label>Ship Color:</label>
                    <input type="color" value="${this.selectedColor}">
                </div>
            </div>
            <div class="ships-container">
                <div class="ship-option selected" data-ship="scout">
                    <h3>Scout</h3>
                    <p>Fast and agile, but lightly armored</p>
                    <div class="stats">
                        <div class="stat">
                            <label>Health</label>
                            <div class="stat-bar"><div style="width: 53%"></div></div>
                        </div>
                        <div class="stat">
                            <label>Speed</label>
                            <div class="stat-bar"><div style="width: 100%"></div></div>
                        </div>
                        <div class="stat">
                            <label>Size</label>
                            <div class="stat-bar"><div style="width: 67%"></div></div>
                        </div>
                    </div>
                </div>
                <div class="ship-option" data-ship="interceptor">
                    <h3>Interceptor</h3>
                    <p>Balanced combat vessel</p>
                    <div class="stats">
                        <div class="stat">
                            <label>Health</label>
                            <div class="stat-bar"><div style="width: 80%"></div></div>
                        </div>
                        <div class="stat">
                            <label>Speed</label>
                            <div class="stat-bar"><div style="width: 85%"></div></div>
                        </div>
                        <div class="stat">
                            <label>Size</label>
                            <div class="stat-bar"><div style="width: 75%"></div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="preview-section">
                <h3>Ship Preview</h3>
                <div id="ship-preview"></div>
            </div>
            <div class="ship-details">
                <div class="ship-name">Scout</div>
                <p class="ship-description">Fast and agile, but lightly armored</p>
                
                <div class="ship-details-left">
                    <div class="stat">
                        <label>Health</label>
                        <div class="stat-bar"><div style="width: 53%"></div></div>
                        <span class="stat-value">53%</span>
                    </div>
                    <div class="stat">
                        <label>Speed</label>
                        <div class="stat-bar"><div style="width: 100%"></div></div>
                        <span class="stat-value">100%</span>
                    </div>
                    <div class="stat">
                        <label>Size</label>
                        <div class="stat-bar"><div style="width: 67%"></div></div>
                        <span class="stat-value">67%</span>
                    </div>
                </div>
                
                <div class="ship-details-right">
                    <div class="special-abilities">
                        <h4>Special Abilities</h4>
                        <div class="ability">Quick Boost</div>
                        <div class="ability">Stealth Mode</div>
                    </div>
                </div>
            </div>
            <button class="launch-button">Launch</button>
        `;

        // Add to container
        this.container.appendChild(this.element);

        // Add class to properly show the UI
        this.element.classList.add('visible');

        // Setup event listeners
        this.setupEventListeners();
    }

    setupPreview() {
        // Get preview container
        this.previewContainer = this.element.querySelector('#ship-preview');
        if (!this.previewContainer) {
            console.error('Preview container not found');
            return;
        }

        // Set initial dimensions
        this.previewContainer.style.width = '100%';
        this.previewContainer.style.height = '150px';

        // Create scene
        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0x000011);

        // Create camera
        this.previewCamera = new THREE.PerspectiveCamera(
            65,
            this.previewContainer.clientWidth / this.previewContainer.clientHeight,
            0.1,
            1000
        );
        this.previewCamera.position.set(0, 0.3, 2.5);
        this.previewCamera.lookAt(0, 0, 0);

        // Create renderer
        this.previewRenderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(this.previewContainer.clientWidth, this.previewContainer.clientHeight);
        this.previewRenderer.setClearColor(0x000011);
        this.previewContainer.appendChild(this.previewRenderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.previewScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(1, 1, 1).normalize();
        this.previewScene.add(directionalLight);

        // Add a grid to help with orientation
        const gridHelper = new THREE.GridHelper(8, 8, 0x333333, 0x222222);
        gridHelper.position.y = -0.5;
        this.previewScene.add(gridHelper);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.previewContainer && this.previewCamera && this.previewRenderer) {
                this.previewCamera.aspect = this.previewContainer.clientWidth / this.previewContainer.clientHeight;
                this.previewCamera.updateProjectionMatrix();
                this.previewRenderer.setSize(this.previewContainer.clientWidth, this.previewContainer.clientHeight);
            }
        });

        // Start animation
        this.animate();
    }

    setupEventListeners() {
        // Store bound handlers for cleanup
        this.boundHandleShipSelection = this.handleShipSelection.bind(this);
        this.boundHandleLaunch = this.handleLaunch.bind(this);
        this.boundHandleColorChange = this.handleColorChange.bind(this);
        this.boundHandleResize = this.handleResize.bind(this);
        
        // Ship selection - make sure to use the right selector
        const shipOptions = this.element.querySelectorAll('.ship-option');
        shipOptions.forEach(option => {
            option.addEventListener('click', this.boundHandleShipSelection);
        });
        
        // Launch button
        const launchButton = this.element.querySelector('.launch-button');
        launchButton.addEventListener('click', this.boundHandleLaunch);
        
        // Color picker
        const colorPicker = this.element.querySelector('input[type="color"]');
        colorPicker.addEventListener('change', this.boundHandleColorChange);
        
        // Handle window resize for the preview
        window.addEventListener('resize', this.boundHandleResize);
    }

    selectShip(shipType) {
        this.selectedShip = shipType;
        
        // Update details section
        const details = this.element.querySelector('.ship-details');
        const shipName = details.querySelector('.ship-name');
        const shipDesc = details.querySelector('.ship-description');
        
        const config = this.getShipConfig();
        shipName.textContent = config.name;
        shipDesc.textContent = config.description;
        
        // Update the stats
        const leftSection = details.querySelector('.ship-details-left');
        leftSection.innerHTML = '';
        
        Object.entries(config.stats).forEach(([key, value]) => {
            const percentage = Math.round(value * 100);
            const statElement = document.createElement('div');
            statElement.className = 'stat';
            statElement.innerHTML = `
                <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <div class="stat-bar"><div style="width: ${percentage}%"></div></div>
                <span class="stat-value">${percentage}%</span>
            `;
            leftSection.appendChild(statElement);
        });
        
        // Update abilities
        const abilitiesContainer = details.querySelector('.special-abilities');
        abilitiesContainer.innerHTML = '<h4>Special Abilities</h4>';
        config.abilities.forEach(ability => {
            const abilityEl = document.createElement('div');
            abilityEl.className = 'ability';
            abilityEl.textContent = ability;
            abilitiesContainer.appendChild(abilityEl);
        });
        
        // Update preview
        this.updatePreview();
    }

    async loadShipModels() {
        try {
            // Load ships using the central AssetLoader
            await this.assetLoader.loadModels();
            console.log('Ship models loaded successfully via AssetLoader');
            
            // Set initial preview
            this.updatePreview();
        } catch (error) {
            console.error('Error loading ship models:', error);
        }
    }

    updatePreview() {
        // Remove current model if it exists
        if (this.currentModel) {
            this.previewScene.remove(this.currentModel);
            this.currentModel = null;
        }

        // Convert selectedShip to the format expected by AssetLoader
        // Map 'scout' to FIGHTER and 'interceptor' to INTERCEPTOR to ensure different models
        let modelKey;
        if (this.selectedShip === 'scout') {
            modelKey = 'FIGHTER';  // Maps to ALTSPACE1.glb
        } else if (this.selectedShip === 'interceptor') {
            modelKey = 'INTERCEPTOR';  // Maps to ALTSPACE2.glb
        } else {
            modelKey = this.selectedShip.toUpperCase();
        }
        
        console.log(`Ship selection: Mapping ${this.selectedShip} to model key ${modelKey}`);
        
        // Get the model from AssetLoader and clone it
        const model = this.assetLoader.getShipModel(modelKey);
        
        if (model) {
            this.currentModel = model;
            
            // Update material color
            this.currentModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    try {
                        // Clone material to avoid affecting other instances
                        child.material = child.material.clone();
                        
                        // Apply color with safety checks
                        if (child.material.color) {
                            child.material.color = new THREE.Color(this.selectedColor);
                        }
                        
                        if (child.material.emissive) {
                            child.material.emissive = new THREE.Color(this.selectedColor).multiplyScalar(0.3);
                        }
                        
                        child.material.needsUpdate = true;
                    } catch (error) {
                        console.warn('Error setting preview material properties:', error);
                    }
                }
            });

            // Set preview-specific scale
            this.currentModel.scale.set(0.25, 0.25, 0.25);
            this.currentModel.position.set(0, 0, 0);
            this.currentModel.rotation.set(0, 0, 0);

            // Add to scene
            this.previewScene.add(this.currentModel);
        } else {
            console.log('Model not available for preview');
        }
    }

    animate = () => {
        if (!this.previewRenderer || !this.previewScene || !this.previewCamera) {
            return;
        }
        
        requestAnimationFrame(this.animate);

        // Rotate the model if it exists
        if (this.currentModel) {
            this.currentModel.rotation.y += 0.01;
        }

        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    getShipConfig() {
        if (this.selectedShip === 'scout') {
            return {
                type: 'fighter',
                name: 'Scout',
                description: 'Fast and agile, but lightly armored',
                stats: {
                    health: 0.53,
                    speed: 1.0,
                    size: 0.67,
                    turnSpeed: 1.0,
                    acceleration: 1.0
                },
                abilities: ['Quick Boost', 'Stealth Mode']
            };
        } else {
            return {
                type: 'experimental',
                name: 'Interceptor',
                description: 'Balanced combat vessel',
                stats: {
                    health: 0.8,
                    speed: 0.85,
                    size: 0.75,
                    turnSpeed: 0.7,
                    acceleration: 0.9
                },
                abilities: ['Shield Generator', 'EMP Burst']
            };
        }
    }

    show() {
        this.element.classList.add('visible');
    }

    hide() {
        this.element.classList.add('hidden');
    }

    updateOptions(newOptions) {
        this.options = {
            ...this.options,
            ...newOptions
        };
    }

    cleanup() {
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clean up event listeners using the stored bound handlers
        const shipOptions = this.element.querySelectorAll('.ship-option');
        shipOptions.forEach(option => {
            option.removeEventListener('click', this.boundHandleShipSelection);
        });
        
        const launchButton = this.element.querySelector('.launch-button');
        if (launchButton) {
            launchButton.removeEventListener('click', this.boundHandleLaunch);
        }
        
        const colorPicker = this.element.querySelector('input[type="color"]');
        if (colorPicker) {
            colorPicker.removeEventListener('change', this.boundHandleColorChange);
        }
        
        window.removeEventListener('resize', this.boundHandleResize);
        
        // Clean up THREE.js resources
        if (this.previewRenderer) {
            this.previewRenderer.dispose();
        }
        
        if (this.previewScene) {
            // Let Three.js handle most of the cleanup, but we should clear the scene
            this.previewScene = null;
        }
        
        // No need to explicitly dispose of models as they're managed by AssetLoader
        this.previewRenderer = null;
        this.previewCamera = null;
        this.currentModel = null;
    }

    handleShipSelection = (event) => {
        const option = event.currentTarget;
        const shipType = option.dataset.ship;
        console.log(`Selecting ship: ${shipType}`);
        this.selectShip(shipType);
        
        // Update UI to show selected
        const shipOptions = this.element.querySelectorAll('.ship-option');
        shipOptions.forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
    }
    
    handleLaunch = () => {
        if (this.selectedShip && this.options.onShipSelect) {
            console.log(`Launching with ship: ${this.selectedShip}`);
            
            // Map ship types consistently with updatePreview method
            let modelType;
            if (this.selectedShip === 'scout') {
                modelType = 'FIGHTER';  // Maps to ALTSPACE1.glb
            } else if (this.selectedShip === 'interceptor') {
                modelType = 'INTERCEPTOR';  // Maps to ALTSPACE2.glb
            } else {
                modelType = this.selectedShip.toUpperCase();
            }
            
            // Create selection data in the format the game expects
            const selectionData = {
                type: modelType,
                color: this.selectedColor,
                config: this.getShipConfig()
            };
            
            console.log(`Launching with mapped ship type: ${modelType}`);
            
            // Hide UI before calling the callback
            this.hide();
            
            // Clean up resources
            this.cleanup();
            
            // First remove the element from the DOM to prevent any interference
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            
            // Then call the callback with ship selection data
            this.options.onShipSelect(selectionData);
        }
    }
    
    handleColorChange = (event) => {
        this.selectedColor = event.target.value;
        this.updatePreview();
    }
    
    handleResize = () => {
        if (this.previewRenderer && this.previewCamera) {
            const container = this.previewContainer;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.previewCamera.aspect = width / height;
            this.previewCamera.updateProjectionMatrix();
            
            this.previewRenderer.setSize(width, height);
        }
    }
} 