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
    this.multiplayerBadge = null;
    this.multiplayerBadgeStatus = null;
    this.multiplayerBadgePeers = null;
    
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
    
    this.createMultiplayerBadge();
    
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
    
    this.healthPercentage.textContent = `${percentage.toFixed(0)}%`;
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

  createMultiplayerBadge() {
    if (!this.uiContainer || this.multiplayerBadge) return;
    this.multiplayerBadge = document.createElement('div');
    this.multiplayerBadge.className = 'multiplayer-badge multiplayer-badge-initializing';
    this.multiplayerBadge.setAttribute('aria-live', 'polite');

    this.multiplayerBadgeStatus = document.createElement('span');
    this.multiplayerBadgeStatus.className = 'multiplayer-badge-status';
    this.multiplayerBadgeStatus.textContent = 'Initializing';
    this.multiplayerBadge.appendChild(this.multiplayerBadgeStatus);

    this.multiplayerBadgePeers = document.createElement('span');
    this.multiplayerBadgePeers.className = 'multiplayer-badge-peers';
    this.multiplayerBadgePeers.textContent = 'Peers: 0';
    this.multiplayerBadge.appendChild(this.multiplayerBadgePeers);

    this.uiContainer.appendChild(this.multiplayerBadge);
  }

  updateMultiplayerStatus(status, peerCount) {
    if (!this.multiplayerBadge || !this.multiplayerBadgeStatus || !this.multiplayerBadgePeers) return;
    const normalized = typeof status === 'string' ? status.toLowerCase() : 'initializing';
    const allowedStatuses = ['connected', 'local', 'unsupported', 'disconnected', 'initializing'];
    const statusKey = allowedStatuses.includes(normalized) ? normalized : 'initializing';

    const labelMap = {
      connected: 'Connected',
      local: 'Local',
      unsupported: 'Unsupported',
      disconnected: 'Disconnected',
      initializing: 'Initializing'
    };

    const rawLabel = labelMap[statusKey] || status || 'Status';
    const trimmedLabel = rawLabel.length > 18 ? `${rawLabel.slice(0, 18)}…` : rawLabel;
    this.multiplayerBadgeStatus.textContent = trimmedLabel;

    const parsedCount = Number(peerCount);
    const count = Number.isFinite(parsedCount) ? parsedCount : 0;
    const clampedCount = Math.max(0, Math.min(count, 999));
    this.multiplayerBadgePeers.textContent = `Peers: ${clampedCount}`;

    allowedStatuses.forEach(key => {
      this.multiplayerBadge.classList.remove(`multiplayer-badge-${key}`);
    });
    this.multiplayerBadge.classList.add(`multiplayer-badge-${statusKey}`);
  }
}
 