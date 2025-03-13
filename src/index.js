import './styles/main.css';
import {Game} from "./core/Game";

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize game
    const game = new Game();
    
    // Wait for game to be fully initialized before setting up UI interactions
    await game.initPromise;
    console.log('Game initialization complete');
    
    // Add start button event listener
    document.getElementById('start-button').addEventListener('click', () => {
      // Get the player name from the input field
      const playerNameInput = document.getElementById('player-name');
      if (playerNameInput && playerNameInput.value.trim() !== '') {
        // Store the player name
        game.playerName = playerNameInput.value.trim();
        console.log(`Player name set to: ${game.playerName}`);
      } else {
        console.log('Using default player name: ' + game.playerName);
      }
      
      // Start the game
      game.startGame();
    });
  } catch (error) {
    console.error('Failed to initialize the game:', error);
    // Display a user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = 'Failed to initialize the game. Please refresh the page or try again later.';
    document.body.appendChild(errorDiv);
  }
}); 