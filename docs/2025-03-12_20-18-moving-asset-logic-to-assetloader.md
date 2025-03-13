# Moving Asset Logic from Game.js to AssetLoader.js

## Overview

This document outlines the approach taken to refactor the Quantum Drift codebase by moving asset-related logic from `Game.js` to `AssetLoader.js`. The goal was to improve code organization, reduce duplication, and establish clearer separation of concerns.

## Approaches Considered

Several approaches were considered for this refactoring:

1. **Direct Method Transfer**: Moving methods directly from Game.js to AssetLoader.js, updating references.
2. **Composition Pattern**: Making Game use AssetLoader as a service.
3. **Inheritance Restructuring**: Modifying the inheritance chain to better separate concerns.
4. **Event-Based Communication**: Using events to decouple asset loading from game logic.
5. **Facade Pattern**: Creating a simplified interface in AssetLoader that Game can use.
6. **Service Locator Pattern**: Registering AssetLoader as a service that Game can access.
7. **Dependency Injection**: Injecting AssetLoader into Game constructor.

## Chosen Approach: Composition with Scene Reference

We chose a composition-based approach where:

1. `AssetLoader` is enhanced with methods that were previously in `Game.js`
2. `Game` maintains a reference to `AssetLoader` and delegates asset-related tasks to it
3. `AssetLoader` is given a reference to the scene when needed for operations that require adding objects to the scene
4. Methods in `Game.js` are updated to call the corresponding methods in `AssetLoader`

This approach avoids circular dependencies while maintaining a clean separation of concerns.

## Methods Moved

The following methods were moved from `Game.js` to `AssetLoader.js`:

- `createFloor()`: Creates the game floor using the Terrain.glb model
- `setShipModel()`: Sets a ship model for a player
- `addThrusterGlow()`: Adds a thruster glow effect to a player mesh
- UI-related methods for handling loading screens and errors

## Implementation Details

### Scene Reference

To avoid circular dependencies, we added a `setScene()` method to `AssetLoader` that allows `Game` to provide a reference to the scene:

```javascript
// In AssetLoader.js
setScene(scene) {
    this.scene = scene;
    return this;
}

// In Game.js (setupScene method)
setupScene() {
    // ... scene setup code ...
    this.assetLoader.setScene(this.scene);
}
```

### Method Adaptations

Methods moved to `AssetLoader` were adapted to:
- Accept a scene parameter (with fallback to the stored scene reference)
- Return created objects rather than storing them internally
- Use callbacks for asynchronous operations

For example:

```javascript
// In AssetLoader.js
createFloor(scene) {
    const sceneToUse = scene || this.scene;
    // ... implementation ...
    return { floor, raycastFloor };
}

// In Game.js
createFloor() {
    const floorObjects = this.assetLoader.createFloor(this.scene);
    this.floor = floorObjects.floor;
    this.raycastFloor = floorObjects.raycastFloor;
    this.createPlayerHighlight();
}
```

### Callback Pattern

For methods that need to perform additional operations after completion, we used a callback pattern:

```javascript
// In AssetLoader.js
setShipModel(type, scene, existingShip, onComplete) {
    // ... implementation ...
    if (onComplete && typeof onComplete === 'function') {
        onComplete(model);
    }
    return model;
}

// In Game.js
setShipModel(type) {
    const newShip = this.assetLoader.setShipModel(
        type, 
        this.scene, 
        this.playerShip,
        (model) => {
            this.playerShip = model;
            this.addPlayerNameLabel();
        }
    );
    return newShip;
}
```

## Benefits of This Approach

1. **Clear Separation of Concerns**: Asset loading and management is now fully encapsulated in `AssetLoader`
2. **Reduced Duplication**: Common asset-related code is now in one place
3. **Improved Maintainability**: Changes to asset loading only need to be made in one place
4. **No Circular Dependencies**: The design avoids circular dependencies between `Game` and `AssetLoader`
5. **Flexible Integration**: The callback pattern allows for flexible integration with game logic

## Potential Future Improvements

1. **Event-Based Communication**: Consider using an event system for more decoupled communication
2. **Asset Preloading**: Implement asset preloading for improved performance
3. **Asset Unloading**: Add methods for unloading assets when they're no longer needed
4. **Asset Versioning**: Add support for asset versioning and updates
5. **Asset Bundles**: Implement asset bundling for more efficient loading 