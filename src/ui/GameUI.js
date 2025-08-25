/**
 * GameUI class for handling all game UI elements
 */
export class GameUI {
  constructor() {
    this.uiContainer = null;
    this.lastHealth = 100; // Track last health value for regeneration detection
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
    
    // Create combat stats display
    this.createCombatStats();
    
    // Initially hide the UI
    this.uiContainer.classList.add('hidden');
  }
  
  createCombatStats() {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'combat-stats';
    this.uiContainer.appendChild(statsContainer);
    
    // Damage dealt
    this.damageDealtElement = document.createElement('div');
    this.damageDealtElement.className = 'stat-item';
    this.damageDealtElement.innerHTML = '<span class="stat-label">💥 Damage:</span> <span class="stat-value" id="damage-dealt">0</span>';
    statsContainer.appendChild(this.damageDealtElement);
    
    // Damage taken
    this.damageTakenElement = document.createElement('div');
    this.damageTakenElement.className = 'stat-item';
    this.damageTakenElement.innerHTML = '<span class="stat-label">🛡️ Taken:</span> <span class="stat-value" id="damage-taken">0</span>';
    statsContainer.appendChild(this.damageTakenElement);
    
    // Critical hits
    this.criticalHitsElement = document.createElement('div');
    this.criticalHitsElement.className = 'stat-item';
    this.criticalHitsElement.innerHTML = '<span class="stat-label">⚡ Crits:</span> <span class="stat-value" id="critical-hits">0</span>';
    statsContainer.appendChild(this.criticalHitsElement);
    
    // K/D ratio
    this.kdRatioElement = document.createElement('div');
    this.kdRatioElement.className = 'stat-item';
    this.kdRatioElement.innerHTML = '<span class="stat-label">🎯 K/D:</span> <span class="stat-value" id="kd-ratio">0.00</span>';
    statsContainer.appendChild(this.kdRatioElement);
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
  updateHealth(health, maxHealth) {
    const percentage = (health / maxHealth) * 100;
    this.healthBar.style.width = `${percentage}%`;
    
    // Change color based on health level
    if (percentage < 30) {
      this.healthBar.classList.add('critical');
      this.healthBar.classList.remove('warning', 'regenerating');
    } else if (percentage < 60) {
      this.healthBar.classList.remove('critical', 'regenerating');
      this.healthBar.classList.add('warning');
    } else {
      this.healthBar.classList.remove('critical', 'warning', 'regenerating');
    }
    
    // Add regeneration effect if health is increasing
    if (health > this.lastHealth) {
      this.healthBar.classList.add('regenerating');
      // Remove regeneration effect after a short delay
      setTimeout(() => {
        this.healthBar.classList.remove('regenerating');
      }, 500);
    }
    
    this.healthPercentage.textContent = `${percentage.toFixed(0)}%`;
    this.lastHealth = health;
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
      this.energyBar.classList.remove('warning');
    } else if (percentage < 60) {
      this.energyBar.classList.remove('critical');
      this.energyBar.classList.add('warning');
    } else {
      this.energyBar.classList.remove('critical', 'warning');
    }
    
    this.energyPercentage.textContent = `${percentage.toFixed(0)}%`;
  }
  
  /**
   * Update weapon display
   * @param {string} weaponName - Name of current weapon
   */
  updateWeapon(weaponName) {
    if (this.weaponName) {
      this.weaponName.textContent = weaponName;
      this.weaponName.className = `weapon-name ${weaponName.toLowerCase()}`;
    }
  }
  
  /**
   * Update combat statistics
   * @param {object} stats - Combat statistics object
   */
  updateCombatStats(stats) {
    if (stats.damageDealt !== undefined) {
      const element = document.getElementById('damage-dealt');
      if (element) element.textContent = stats.damageDealt;
    }
    
    if (stats.damageTaken !== undefined) {
      const element = document.getElementById('damage-taken');
      if (element) element.textContent = stats.damageTaken;
    }
    
    if (stats.criticalHits !== undefined) {
      const element = document.getElementById('critical-hits');
      if (element) element.textContent = stats.criticalHits;
    }
    
    if (stats.kills !== undefined && stats.deaths !== undefined) {
      const element = document.getElementById('kd-ratio');
      if (element) {
        const ratio = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
        element.textContent = ratio;
      }
    }
  }
} 