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
    healthLabel.textContent = 'HEALTH';
    healthBarContainer.appendChild(healthLabel);
    
    const healthBarOuter = document.createElement('div');
    healthBarOuter.className = 'bar-outer';
    healthBarContainer.appendChild(healthBarOuter);
    
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'bar-inner health-bar';
    healthBarOuter.appendChild(this.healthBar);
    
    // Create energy bar
    const energyBarContainer = document.createElement('div');
    energyBarContainer.className = 'bar-container energy-bar-container';
    statusBars.appendChild(energyBarContainer);
    
    const energyLabel = document.createElement('div');
    energyLabel.className = 'bar-label';
    energyLabel.textContent = 'ENERGY';
    energyBarContainer.appendChild(energyLabel);
    
    const energyBarOuter = document.createElement('div');
    energyBarOuter.className = 'bar-outer';
    energyBarContainer.appendChild(energyBarOuter);
    
    this.energyBar = document.createElement('div');
    this.energyBar.className = 'bar-inner energy-bar';
    energyBarOuter.appendChild(this.energyBar);
    
    // Create weapon indicator
    this.weaponIndicator = document.createElement('div');
    this.weaponIndicator.className = 'weapon-indicator';
    statusBars.appendChild(this.weaponIndicator);
    
    const weaponLabel = document.createElement('div');
    weaponLabel.className = 'weapon-label';
    weaponLabel.textContent = 'WEAPON';
    this.weaponIndicator.appendChild(weaponLabel);
    
    this.weaponName = document.createElement('div');
    this.weaponName.className = 'weapon-name';
    this.weaponName.textContent = 'LASER';
    this.weaponIndicator.appendChild(this.weaponName);
    
    // Initially hide the UI
    this.uiContainer.classList.add('hidden');
  }
  
  /**
   * Show the UI
   */
  show() {
    this.uiContainer.classList.remove('hidden');
  }
  
  /**
   * Hide the UI
   */
  hide() {
    this.uiContainer.classList.add('hidden');
  }
  
  /**
   * Update health bar
   * @param {number} health - Current health value
   * @param {number} maxHealth - Maximum health value
   */
  updateHealth(health, maxHealth) {
    const percentage = (health / maxHealth) * 100;
    this.healthBar.style.width = `${percentage}%`;
    
    // Change color based on health level
    if (percentage < 30) {
      this.healthBar.classList.add('critical');
    } else if (percentage < 60) {
      this.healthBar.classList.remove('critical');
      this.healthBar.classList.add('warning');
    } else {
      this.healthBar.classList.remove('critical', 'warning');
    }
  }
  
  /**
   * Update energy bar
   * @param {number} energy - Current energy value
   * @param {number} maxEnergy - Maximum energy value
   */
  updateEnergy(energy, maxEnergy) {
    const percentage = (energy / maxEnergy) * 100;
    this.energyBar.style.width = `${percentage}%`;
    
    // Change color based on energy level
    if (percentage < 30) {
      this.energyBar.classList.add('critical');
    } else if (percentage < 60) {
      this.energyBar.classList.remove('critical');
      this.energyBar.classList.add('warning');
    } else {
      this.energyBar.classList.remove('critical', 'warning');
    }
  }
  
  /**
   * Update weapon indicator
   * @param {string} weaponName - Name of the current weapon
   */
  updateWeapon(weaponName) {
    this.weaponName.textContent = weaponName;
    
    // Remove previous weapon classes
    this.weaponName.classList.remove('laser', 'grenade', 'bounce');
    
    // Add appropriate class based on weapon
    if (weaponName.includes('LASER')) {
      this.weaponName.classList.add('laser');
    } else if (weaponName.includes('GRENADE')) {
      this.weaponName.classList.add('grenade');
    } else if (weaponName.includes('BOUNCE')) {
      this.weaponName.classList.add('bounce');
    }
  }
} 