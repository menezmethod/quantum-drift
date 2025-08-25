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
    this.healthBar.className = 'bar-inner health-bar healthy';
    this.healthBar.style.width = '100%'; // Ensure initial width is set
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
    energyLabel.innerHTML = '⚡'; // Lightning emoji for energy
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
   * @param {number} health - Current health value
   * @param {number} maxHealth - Maximum health value
   */
  updateHealth(currentHealth, maxHealth) {
    if (!this.healthBar || !this.healthPercentage) return;
    
    const percentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
    
    console.log(`🩺 UI Health Update: ${currentHealth}/${maxHealth} = ${percentage}%`);
    
    // Update health bar width
    this.healthBar.style.width = `${percentage}%`;
    console.log(`🩺 Health bar width set to: ${percentage}%`);
    
    // Update percentage text
    this.healthPercentage.textContent = `${percentage.toFixed(0)}%`;
    
    // Add visual feedback for regeneration
    if (currentHealth < maxHealth) {
      // Add pulsing effect when regenerating
      this.healthBar.classList.add('regenerating');
      
      // Remove pulsing effect when at full health
      if (currentHealth >= maxHealth) {
        this.healthBar.classList.remove('regenerating');
      }
    } else {
      this.healthBar.classList.remove('regenerating');
    }
    
    // Update health bar color based on health level - preserve bar-inner class
    this.healthBar.className = 'bar-inner health-bar';
    if (percentage > 60) {
      this.healthBar.classList.add('healthy');
    } else if (percentage > 30) {
      this.healthBar.classList.add('warning');
    } else {
      this.healthBar.classList.add('critical');
    }
    
    console.log(`🩺 Health bar classes:`, this.healthBar.className);
    console.log(`🩺 Health bar style width:`, this.healthBar.style.width);
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
    
    this.energyPercentage.textContent = `${percentage.toFixed(0)}%`;
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