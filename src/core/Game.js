import { GameEngine } from './GameEngine';
import { GameUI } from '../ui/GameUI';
import { MiniMap } from '../ui/MiniMap';
import { GAME_CONFIG } from '../config/GameConfig';

class Game {
    constructor() {
        this.engine = new GameEngine();
        this.ui = new GameUI();
        
        // Game state
        this.isLoading = true;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Bind methods
        this.handleLoadingProgress = this.handleLoadingProgress.bind(this);
        this.handleLoadingError = this.handleLoadingError.bind(this);
    }

    async init() {
        // Initialize game engine
        await this.engine.init();
        
        // Set up game state
        this.setupGameState();
        
        return true;
    }

    setupGameState() {
        // Initialize player state
        this.health = GAME_CONFIG.PLAYER.INITIAL_HEALTH;
        this.energy = GAME_CONFIG.PLAYER.INITIAL_ENERGY;
        
        // Update UI
        this.ui.updateHealth(this.health, GAME_CONFIG.PLAYER.INITIAL_HEALTH);
        this.ui.updateEnergy(this.energy, GAME_CONFIG.PLAYER.INITIAL_ENERGY);
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

        // Start game engine
        this.engine.startGame();
        
        // Set game state
        this.isLoading = false;
        this.isPaused = false;
        this.isGameOver = false;
    }

    handleLoadingProgress(message) {
        this.updateLoadingUI(message);
    }

    handleLoadingError(assetType, error) {
        console.error(`Error loading ${assetType}:`, error);
        this.showErrorScreen(`Failed to load ${assetType}. Please refresh the page.`);
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
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

    showStartScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const startScreen = document.getElementById('start-screen');
        
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                loadingScreen.classList.remove('fade-out');
            }, 500);
        }
        
        if (startScreen) {
            startScreen.classList.remove('hidden');
            startScreen.classList.add('fade-in');
        }
    }

    showErrorScreen(message) {
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
                this.init();
            };
            errorScreen.appendChild(retryButton);
            
            document.body.appendChild(errorScreen);
        }
        
        const messageElement = errorScreen.querySelector('.error-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    cleanup() {
        this.engine?.cleanup();
    }
}

export default Game; 