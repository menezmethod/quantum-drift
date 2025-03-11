import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * Manages health bar display for all enemies
 */
export class EnemyHealthDisplay {
  constructor(container) {
    this.container = container;
    this.enemyHealthBars = new Map();
    
    // Initialize CSS2D renderer
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow click through
    this.container.appendChild(this.labelRenderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Add health bar to an enemy
   * @param {object} enemy - Enemy object to add health bar to
   */
  addHealthBar(enemy) {
    if (!enemy || !enemy.mesh) return;

    // Create health bar container
    const healthBarContainer = document.createElement('div');
    healthBarContainer.className = 'enemy-health-container';
    healthBarContainer.style.width = '50px';
    healthBarContainer.style.height = '10px';
    healthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    healthBarContainer.style.border = '1px solid #333';
    healthBarContainer.style.borderRadius = '2px';
    healthBarContainer.style.overflow = 'hidden';
    healthBarContainer.style.position = 'relative';

    // Create health bar
    const healthBar = document.createElement('div');
    healthBar.className = 'enemy-health-bar';
    healthBar.style.width = '100%';
    healthBar.style.height = '100%';
    healthBar.style.backgroundColor = '#ff3333';
    healthBar.style.transition = 'width 0.2s ease-in-out';
    healthBarContainer.appendChild(healthBar);

    // Create CSS2D object and position it above enemy
    const healthLabel = new CSS2DObject(healthBarContainer);
    healthLabel.position.set(0, enemy.options.size * 2.5, 0); // Position above enemy
    
    // Add to enemy mesh
    enemy.mesh.add(healthLabel);
    
    // Store reference to health bar element
    this.enemyHealthBars.set(enemy.id, {
      element: healthBar,
      label: healthLabel
    });
  }

  /**
   * Update health bar for an enemy
   * @param {object} enemy - Enemy to update health bar for
   */
  updateHealthBar(enemy) {
    if (!enemy || !this.enemyHealthBars.has(enemy.id)) return;
    
    const healthBar = this.enemyHealthBars.get(enemy.id);
    if (!healthBar || !healthBar.element) return;
    
    // Calculate health percentage
    const healthPercentage = (enemy.health / enemy.maxHealth) * 100;
    healthBar.element.style.width = `${healthPercentage}%`;
    
    // Update color based on health percentage
    if (healthPercentage < 25) {
      healthBar.element.style.backgroundColor = '#ff0000'; // Red for critical
    } else if (healthPercentage < 50) {
      healthBar.element.style.backgroundColor = '#ffaa00'; // Orange for low
    } else {
      healthBar.element.style.backgroundColor = '#ff3333'; // Default red
    }
  }

  /**
   * Remove health bar from an enemy
   * @param {object} enemy - Enemy to remove health bar from
   */
  removeHealthBar(enemy) {
    if (!enemy || !this.enemyHealthBars.has(enemy.id)) return;
    
    const healthBar = this.enemyHealthBars.get(enemy.id);
    if (healthBar && healthBar.label && enemy.mesh) {
      enemy.mesh.remove(healthBar.label);
    }
    
    this.enemyHealthBars.delete(enemy.id);
  }

  /**
   * Update all health bars
   * @param {array} enemies - Array of enemy objects
   */
  update(enemies) {
    // Add health bars to new enemies
    for (const enemy of enemies) {
      if (!enemy.isActive) continue;
      
      if (!this.enemyHealthBars.has(enemy.id)) {
        this.addHealthBar(enemy);
      }
      
      this.updateHealthBar(enemy);
    }
  }

  /**
   * Render health bars
   * @param {THREE.Camera} camera - Camera to render from
   */
  render(camera) {
    this.labelRenderer.render(camera.scene, camera);
  }

  /**
   * Clean up all resources
   */
  dispose() {
    this.enemyHealthBars.clear();
    if (this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
      this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
    }
  }
} 