export const SHIP_TYPES = {
    SCOUT: 'SCOUT',
    INTERCEPTOR: 'INTERCEPTOR',
    HEAVY: 'HEAVY'
};

export const SHIP_STATUS = {
    FREE: 'FREE',
    PREMIUM: 'PREMIUM'
};

export const SHIP_CONFIGS = {
    [SHIP_TYPES.SCOUT]: {
        name: 'Scout',
        description: 'Fast and agile, but lightly armored',
        status: SHIP_STATUS.FREE,
        stats: {
            health: 80,
            speed: 0.2,
            size: 0.8,
            turnSpeed: 0.15,
            acceleration: 0.12
        },
        model: 'SCOUT',
        abilities: ['Quick Boost', 'Stealth Mode']
    },
    [SHIP_TYPES.INTERCEPTOR]: {
        name: 'Interceptor',
        description: 'Balanced combat vessel',
        status: SHIP_STATUS.FREE,
        stats: {
            health: 100,
            speed: 0.15,
            size: 1.0,
            turnSpeed: 0.1,
            acceleration: 0.1
        },
        model: 'INTERCEPTOR',
        abilities: ['Shield Burst', 'EMP Blast']
    },
    [SHIP_TYPES.HEAVY]: {
        name: 'Heavy Destroyer',
        description: 'Premium battle cruiser with superior firepower',
        status: SHIP_STATUS.PREMIUM,
        stats: {
            health: 150,
            speed: 0.12,
            size: 1.2,
            turnSpeed: 0.08,
            acceleration: 0.08
        },
        model: 'HEAVY',
        abilities: ['Heavy Shield', 'Missile Barrage', 'Area Denial']
    }
};

export class ShipSelector {
    static getAvailableShips(isPremium = false) {
        return Object.entries(SHIP_CONFIGS)
            .filter(([_, config]) => 
                config.status === SHIP_STATUS.FREE || 
                (isPremium && config.status === SHIP_STATUS.PREMIUM)
            )
            .map(([type, config]) => ({
                type,
                ...config
            }));
    }

    static getShipConfig(type) {
        return SHIP_CONFIGS[type];
    }

    static isShipAvailable(type, isPremium = false) {
        const config = SHIP_CONFIGS[type];
        return config && (
            config.status === SHIP_STATUS.FREE || 
            (isPremium && config.status === SHIP_STATUS.PREMIUM)
        );
    }
} 