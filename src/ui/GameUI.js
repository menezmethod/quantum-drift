/**
 * GameUI class for handling all game UI elements
 */
export class GameUI {
  constructor() {
    this.uiContainer = null;
    this.controlsInfo = null;
    this.healthBar = null;
    this.energyBar = null;
    this.weaponIndicator = null;

    this.createUI();
  }

  /**
   * Create all UI elements
   */
  createUI() {
    // Remove existing controls-info if it exists
    const oldControls = document.querySelector('.controls-info');
    if (oldControls) {
      oldControls.remove();
    }

    // Create main UI container
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'game-ui';
    this.uiContainer.id = 'game-ui';
    document.body.appendChild(this.uiContainer);

    // Create status bars container
    const statusBars = document.createElement('div');
    statusBars.className = 'status-bars';
    this.uiContainer.appendChild(statusBars);

    // Create health bar
    const healthBarContainer = document.createElement('div');
    healthBarContainer.className = 'bar-container health-bar-container';
    statusBars.appendChild(healthBarContainer);

    const healthLabel = document.createElement('div');
    healthLabel.className = 'bar-label';
    healthLabel.innerHTML = '❤️'; // Heart emoji for health
    healthBarContainer.appendChild(healthLabel);

    const healthBarOuter = document.createElement('div');
    healthBarOuter.className = 'bar-outer';
    healthBarContainer.appendChild(healthBarOuter);

    this.healthBar = document.createElement('div');
    this.healthBar.className = 'bar-inner health-bar';
    healthBarOuter.appendChild(this.healthBar);

    // Create health percentage display
    this.healthPercentage = document.createElement('div');
    this.healthPercentage.className = 'bar-percentage';
    this.healthPercentage.textContent = '100%';
    healthBarContainer.appendChild(this.healthPercentage);

    // Create energy bar
    const energyBarContainer = document.createElement('div');
    energyBarContainer.className = 'bar-container energy-bar-container';
    statusBars.appendChild(energyBarContainer);

    const energyLabel = document.createElement('div');
    energyLabel.className = 'bar-label';
    energyLabel.innerHTML = '⚡'; 
    energyBarContainer.appendChild(energyLabel);

    const energyBarOuter = document.createElement('div');
    energyBarOuter.className = 'bar-outer';
    energyBarContainer.appendChild(energyBarOuter);

    this.energyBar = document.createElement('div');
    this.energyBar.className = 'bar-inner energy-bar';
    energyBarOuter.appendChild(this.energyBar);

    // Create energy percentage display
    this.energyPercentage = document.createElement('div');
    this.energyPercentage.className = 'bar-percentage';
    this.energyPercentage.textContent = '100%';
    energyBarContainer.appendChild(this.energyPercentage);

    // Create weapon indicator
    this.weaponIndicator = document.createElement('div');
    this.weaponIndicator.className = 'weapon-indicator';
    this.uiContainer.appendChild(this.weaponIndicator);

    const weaponLabel = document.createElement('div');
    weaponLabel.className = 'weapon-label';
    weaponLabel.textContent = '🔫';  // Weapon emoji
    this.weaponIndicator.appendChild(weaponLabel);

    this.weaponName = document.createElement('div');
    this.weaponName.className = 'weapon-name laser';
    this.weaponName.textContent = 'LASER';
    this.weaponIndicator.appendChild(this.weaponName);

    // Initially hide the UI
    this.uiContainer.classList.add('hidden');
  }

  /**
   * Show the UI
   */
  show() {
    if (this.uiContainer) {
      this.uiContainer.classList.remove('hidden');
      this.uiContainer.style.display = 'flex';
      this.uiContainer.style.opacity = '1';
    }
  }

  /**
   * Hide the UI
   */
  hide() {
    if (this.uiContainer) {
      this.uiContainer.classList.add('hidden');
      this.uiContainer.style.display = 'none';
      this.uiContainer.style.opacity = '0';
    }
  }

  /**
   * Update health bar
   * @param {number} currentHealth - Current health value
   * @param {number} maxHealth - Maximum health value
   */
  updateHealth(currentHealth, maxHealth) {
    if (this.healthBar) {
      const healthPercent = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
      this.healthBar.style.width = `${healthPercent}%`;
      this.healthPercentage.textContent = `${Math.round(healthPercent)}%`;
      
      // Update color based on health percentage
      if (healthPercent < 25) {
        this.healthBar.style.backgroundColor = '#ff0000'; // Red for critical
      } else if (healthPercent < 50) {
        this.healthBar.style.backgroundColor = '#ffaa00'; // Orange for low
      } else {
        this.healthBar.style.backgroundColor = '#00ff00'; // Green for healthy
      }
    }
  }

  /**
   * Update energy bar
   * @param {number} currentEnergy - Current energy value
   * @param {number} maxEnergy - Maximum energy value
   */
  updateEnergy(currentEnergy, maxEnergy) {
    if (this.energyBar) {
      const energyPercent = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));
      this.energyBar.style.width = `${energyPercent}%`;
      this.energyPercentage.textContent = `${Math.round(energyPercent)}%`;
      
      // Update color based on energy percentage
      if (energyPercent < 25) {
        this.energyBar.style.backgroundColor = '#ccccff'; // Light blue for low energy
      } else {
        this.energyBar.style.backgroundColor = '#0088ff'; // Bright blue for normal energy
      }
    }
  }

  /**
   * Update weapon indicator
   * @param {string} weaponName - Name of the current weapon
   */
  updateWeapon(weaponName) {
    this.weaponName.textContent = weaponName;

    // Remove all weapon classes
    this.weaponName.classList.remove('laser', 'grenade', 'bounce');

    // Add the appropriate class for styling
    switch(weaponName.toLowerCase()) {
      case 'laser':
        this.weaponName.classList.add('laser');
        break;
      case 'grenade':
        this.weaponName.classList.add('grenade');
        break;
      case 'bounce':
        this.weaponName.classList.add('bounce');
        break;
    }
  }
} 