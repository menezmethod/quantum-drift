export const GAME_CONFIG = {
    PLAYER: {
        INITIAL_HEALTH: 100,
        INITIAL_ENERGY: 100,
        ENERGY_RECHARGE_RATE: 20,
        MOVEMENT_SPEED: 0.1,
        ROTATION_SPEED: 0.05,
        COLLISION_RADIUS: 0.8
    },
    
    WEAPONS: {
        LASER: {
            COOLDOWN: 200,
            SPEED: 1.2,
            DAMAGE: 10,
            TRAIL_LENGTH: 8
        },
        BOUNCE: {
            COOLDOWN: 500,
            SPEED: 0.8,
            DAMAGE: 10,
            MAX_BOUNCES: 3,
            TRAIL_LENGTH: 12
        },
        GRENADE: {
            COOLDOWN: 1000,
            EXPLOSION_RADIUS: 4,
            DAMAGE: 30,
            TRAIL_LENGTH: 20
        }
    },
    
    SCENE: {
        BOUNDARY_SIZE: 25,
        GRID_SIZE: 100,
        GRID_DIVISIONS: 100,
        NUM_OBSTACLES: 15,
        MIN_OBSTACLE_DISTANCE: 10
    },
    
    CAMERA: {
        FOV: 75,
        NEAR: 0.1,
        FAR: 1000,
        POSITION: {
            Y: 18,
            Z: -16
        },
        SMOOTHING: 0.05
    },
    
    COLORS: {
        BACKGROUND: 0x000011,
        GRID: {
            MAIN: 0x444444,
            SECONDARY: 0x222222
        },
        LASER: 0x00ffff,
        BOUNCE: 0x00ff99,
        GRENADE: 0xff4500
    },
    
    EFFECTS: {
        PULSE_SPEED: 0.2,
        TRAIL_OPACITY: 0.5,
        GLOW_INTENSITY: 2
    }
};

// Weapon type constants
export const WEAPON_TYPES = {
    LASER: 'LASER',
    BOUNCE: 'BOUNCE',
    GRENADE: 'GRENADE'
}; 