// Control configuration for the game
// This file centralizes all control-related settings and mappings

// Key mappings for different actions
export const KEY_MAPPINGS = {
    // Movement controls
    MOVEMENT: {
        FORWARD: ['KeyW', 'ArrowUp'],
        BACKWARD: ['KeyS', 'ArrowDown'],
        LEFT: ['KeyA', 'ArrowLeft'],
        RIGHT: ['KeyD', 'ArrowRight'],
        STRAFE_LEFT: ['KeyQ'],
        STRAFE_RIGHT: ['KeyE']
    },
    // Weapon controls
    WEAPONS: {
        FIRE: ['Space'],
        SELECT_LASER: ['Digit1'],
        SELECT_GRENADE: ['Digit2'],
        SELECT_BOUNCE: ['Digit3'],
        SWITCH_WEAPON: ['KeyX']
    },
    // UI controls
    UI: {
        TOGGLE_MAP: ['KeyM'],
        TOGGLE_CONTROLS: ['KeyC']
    }
};

// Control settings and configurations
export const CONTROL_SETTINGS = {
    // Movement settings
    MOVEMENT: {
        ROTATION_SPEED: 2.5,
        SHIP_SPEED: 30,
        ACCELERATION: 1.0,
        DECELERATION: 0.95,
        STRAFE_SPEED_MULTIPLIER: 0.8
    },
    // Weapon cooldowns (in milliseconds)
    WEAPON_COOLDOWNS: {
        LASER: 200,
        BOUNCE: 500,
        GRENADE: 1000
    },
    // Touch controls settings
    TOUCH: {
        JOYSTICK_MAX_DISTANCE: 40,
        JOYSTICK_DEAD_ZONE: 10,
        DOUBLE_TAP_DELAY: 300
    }
};

// Visual feedback settings for controls
export const CONTROL_FEEDBACK = {
    INDICATORS: {
        MOVEMENT: [
            { id: 'forward', key: 'W', label: '⬆️', tooltip: 'Forward' },
            { id: 'backward', key: 'S', label: '⬇️', tooltip: 'Backward' },
            { id: 'left', key: 'A', label: '⬅️', tooltip: 'Turn Left' },
            { id: 'right', key: 'D', label: '➡️', tooltip: 'Turn Right' },
            { id: 'strafeLeft', key: 'Q', label: '↩️', tooltip: 'Strafe Left' },
            { id: 'strafeRight', key: 'E', label: '↪️', tooltip: 'Strafe Right' }
        ],
        WEAPONS: [
            { id: 'selectLaser', key: '1', label: '🔫', tooltip: 'Laser' },
            { id: 'selectGrenade', key: '2', label: '💣', tooltip: 'Grenade' },
            { id: 'selectBounce', key: '3', label: '↗️↘️', tooltip: 'Bounce Laser' },
            { id: 'switchWeapon', key: 'X', label: '🔄', tooltip: 'Switch Weapon' }
        ],
        ACTIONS: [
            { id: 'fire', key: 'CLICK', label: '🔥', tooltip: 'Fire Weapon' }
        ]
    }
};

// Default control state
export const DEFAULT_CONTROL_STATE = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
    fire: false,
    switchWeapon: false
};

// Helper functions for control handling
export const ControlUtils = {
    /**
     * Check if a key code matches any of the specified actions
     * @param {string} keyCode - The key code to check
     * @param {string} action - The action to check against
     * @param {string} category - The category of the action (MOVEMENT, WEAPONS, UI)
     * @returns {boolean} - Whether the key matches the action
     */
    isKeyMatch: (keyCode, action, category) => {
        return KEY_MAPPINGS[category]?.[action]?.includes(keyCode) || false;
    },

    /**
     * Get the action for a given key code
     * @param {string} keyCode - The key code to check
     * @returns {Object|null} - The matching action and category, or null if no match
     */
    getActionForKey: (keyCode) => {
        for (const [category, actions] of Object.entries(KEY_MAPPINGS)) {
            for (const [action, keys] of Object.entries(actions)) {
                if (keys.includes(keyCode)) {
                    return { category, action };
                }
            }
        }
        return null;
    },

    /**
     * Check if a key is a weapon selection key
     * @param {string} keyCode - The key code to check
     * @returns {boolean} - Whether the key is a weapon selection key
     */
    isWeaponSelectionKey: (keyCode) => {
        return KEY_MAPPINGS.WEAPONS.SELECT_LASER.includes(keyCode) ||
               KEY_MAPPINGS.WEAPONS.SELECT_GRENADE.includes(keyCode) ||
               KEY_MAPPINGS.WEAPONS.SELECT_BOUNCE.includes(keyCode) ||
               KEY_MAPPINGS.WEAPONS.SWITCH_WEAPON.includes(keyCode);
    }
}; 