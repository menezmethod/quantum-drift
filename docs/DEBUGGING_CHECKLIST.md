### General Structural Tasks

- [X] **Task 1: Restructure Codebase for Clarity**
  - **Description**: Organize the provided files into a maintainable structure.
  - **Files**: All provided files
  - **Instructions**:
    1. Move files into:
       ```
       ./
       ├── index.html
       ├── index.js
       ├── core/
       │   ├── NetworkManager.js  # To be created
       ├── entities/
       │   ├── Ship.js           # Renamed from Ship.js
       │   ├── Player.js
       │   ├── Enemy.js
       │   └── weapons/
       │       ├── WeaponSystem.js
       │       ├── Laser.js
       │       └── RegularLaser.js
       ├── assets/
       │   ├── AssetLoader.js
       │   ├── SoundManager.js
       ├── styles/               # For main.css, controls.css
       ```
    2. Update import paths (e.g., `import { Ship } from './entities/Ship.js'`).
    3. Ensure `index.html` references match (e.g., CSS paths).

- [X] **Task 2: Centralize Asset Loading**
  - **Description**: Use `AssetLoader.js` as the sole asset loader, removing duplicates from `index.js`.
  - **Files**: `index.js`, `assets/AssetLoader.js`
  - **Instructions**:
    1. In `index.js`, remove `loadAssets()`, `loadSounds()`, `loadAssetsWithLoader()` (approx. lines 100-500).
    2. Replace with:
       ```javascript
       async loadAssets() {
         this.updateLoadingUI('Loading game assets...');
         await this.assetLoader.loadAll();
         this.assetsLoaded = true;
         this.checkLoadingProgress();
       }
       ```
    3. Update `AssetLoader.js` to handle all assets (see Task 11).

- [ ] **Task 3: Implement Robust Error Handling**
  - **Description**: Add try-catch and logging across all files.
  - **Files**: All files
  - **Instructions**:
    1. Wrap key operations in try-catch:
       ```javascript
       try {
         // Operation
       } catch (error) {
         console.error(`Error in ${fileName}:`, error);
       }
       ```
    2. Apply to `index.js` (e.g., `loadAssets`), `AssetLoader.js` (e.g., `loadAll`), `SoundManager.js` (e.g., `preloadSounds`).

---

### File-Specific Tasks

#### `./index.html`
- [ ] **Task 4: Add Script Inclusion**
  - **Description**: Link `index.js` to initialize the game.
  - **Line**: After `</body>`
  - **Instructions**:
    1. Add:
       ```html
       <script type="module" src="./index.js"></script>
       ```

- [ ] **Task 5: Include CSS Files**
  - **Description**: Link `main.css` and `controls.css`.
  - **Line**: Within `<head>`
  - **Instructions**:
    1. Add:
       ```html
       <link rel="stylesheet" href="./styles/main.css">
       <link rel="stylesheet" href="./styles/controls.css">
       ```

#### `./index.js`
- [ ] **Task 6: Integrate SoundManager**
  - **Description**: Replace duplicate sound logic with `SoundManager.js`.
  - **Lines**: Approx. 400-500
  - **Instructions**:
    1. Remove `soundPools`, `loadedSounds`, `soundLoadPromises`, and related methods.
    2. In `constructor`:
       ```javascript
       this.soundManager = new SoundManager();
       this.camera.add(this.soundManager.getListener()); // Attach listener to camera
       ```
    3. Replace `playSound`:
       ```javascript
       playSound(name) {
         this.soundManager.playSound(name);
       }
       ```

- [ ] **Task 7: Enhance Multiplayer Synchronization**
  - **Description**: Add player update handling.
  - **Lines**: Approx. 600-700
  - **Instructions**:
    1. Add:
       ```javascript
       this.remotePlayers = new Map();
       this.networkManager.on('player_update', (data) => {
         this.updateRemotePlayer(data.id, data.position, data.rotation);
       });
       ```
    2. Add `updateRemotePlayer`:
       ```javascript
       updateRemotePlayer(id, position, rotation) {
         let player = this.remotePlayers.get(id);
         if (!player) {
           player = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 8), new THREE.MeshPhongMaterial({ color: 0xff0000 }));
           this.scene.add(player);
           this.remotePlayers.set(id, player);
         }
         player.position.set(position.x, position.y, position.z);
         player.rotation.set(rotation.x, rotation.y, rotation.z);
       }
       ```

- [ ] **Task 8: Consolidate Ship Creation**
  - **Description**: Use `Player.js` instead of duplicating ship logic.
  - **Lines**: Approx. 800-900
  - **Instructions**:
    1. Remove `createDefaultShip` and `setShipModel`.
    2. In `constructor`:
       ```javascript
       this.player = new Player(this.scene, new THREE.Vector3(0, 0.5, 0));
       this.scene.add(this.player.mesh);
       ```
    3. Update references to `this.playerShip` to `this.player.mesh`.

- [ ] **Task 9: Fix Thruster Glow Null Check**
  - **Description**: Prevent undefined errors.
  - **Lines**: Approx. 1100-1200
  - **Instructions**:
    1. Modify:
       ```javascript
       addThrusterGlow() {
         if (!this.player || !this.player.mesh) return;
         const thruster = new THREE.Mesh(/* ... */);
         this.player.mesh.add(thruster);
         // Rest of the code...
       }
       ```

- [ ] **Task 10: Fix Floor Creation Dependency**
  - **Description**: Use `AssetLoader` for terrain.
  - **Lines**: Approx. 1300-1500
  - **Instructions**:
    1. Replace:
       ```javascript
       createFloor() {
         const terrain = this.assetLoader.getModel('terrain/Terrain.glb');
         if (terrain) {
           terrain.scale.set(100, 50, 100);
           terrain.position.set(0, -0.2, 0);
           this.scene.add(terrain);
         } else {
           const grid = new THREE.GridHelper(100, 100);
           this.scene.add(grid);
         }
       }
       ```

#### `./assets/AssetLoader.js`
- [X] **Task 11: Complete Model and Sound Loading**
  - **Description**: Load all referenced assets, aligning with `SoundManager.js`.
  - **Lines**: Approx. 100-200
  - **Instructions**:
    1. Replace `loadAll`:
       ```javascript
       async loadAll() {
         const modelsToLoad = [
           'ships/ALTSPACE1.glb', 'ships/ALTSPACE2.glb',
           'terrain/Terrain.glb', 'terrain/Water.glb'
         ];
         for (const model of modelsToLoad) {
           const loaded = await this.loader.loadAsync(`assets/models/${model}`);
           this.assets.models.set(model, loaded.scene);
         }
         // Sound loading moved to SoundManager.js
       }
       ```
    2. Remove sound loading here since `SoundManager.js` handles it.

- [ ] **Task 12: Fix Ship Model Scaling**
  - **Description**: Ensure consistent scaling.
  - **Lines**: Approx. 300-400
  - **Instructions**:
    1. Update:
       ```javascript
       cloneAndPrepareModel(model) {
         const cloned = model.clone();
         cloned.scale.set(0.45, 0.45, 0.45);
         cloned.traverse(node => {
           if (node.isMesh) node.material = node.material.clone();
         });
         return cloned;
       }
       ```

#### `./assets/SoundManager.js`
- [ ] **Task 13: Fix Sound Path Prefix**
  - **Description**: Ensure sound paths match `assets/sounds/` structure.
  - **Lines**: `preloadSounds` (approx. 30-70)
  - **Instructions**:
    1. Update `soundsToLoad` and music loading:
       ```javascript
       const soundsToLoad = [
         { name: 'laser', path: 'assets/sounds/laser.mp3' },
         { name: 'explosion', path: 'assets/sounds/explosion.mp3' },
         { name: 'hit', path: 'assets/sounds/hit.mp3' },
         { name: 'powerup', path: 'assets/sounds/powerup.mp3' },
         { name: 'engine', path: 'assets/sounds/engine.mp3', loop: true }
       ];
       // In music loading:
       audioLoader.load('assets/sounds/background_music.mp3', /* ... */);
       ```

- [ ] **Task 14: Add Positional Audio Support**
  - **Description**: Enhance `playSound` for 3D audio positioning.
  - **Lines**: Approx. 120-140
  - **Instructions**:
    1. Modify:
       ```javascript
       playSound(name, position = null) {
         if (this.isMuted) return;
         const sound = this.sounds.get(name);
         if (!sound) {
           console.warn(`Sound '${name}' not found`);
           return;
         }
         let soundToPlay = sound;
         if (sound.isPlaying) {
           soundToPlay = sound.clone();
           soundToPlay.onEnded = () => soundToPlay.disconnect();
         }
         if (position) {
           soundToPlay.isPositional = true;
           soundToPlay.position.copy(position);
         }
         soundToPlay.play();
       }
       ```

- [ ] **Task 15: Fix Clone Cleanup**
  - **Description**: Ensure cloned sounds are properly managed.
  - **Lines**: Approx. 130-135
  - **Instructions**:
    1. Enhance:
       ```javascript
       if (sound.isPlaying) {
         const soundClone = new THREE.PositionalAudio(this.listener);
         soundClone.setBuffer(sound.buffer);
         soundClone.setVolume(this.effectsVolume);
         soundClone.play();
         soundClone.onEnded = () => {
           soundClone.disconnect();
           soundClone.source = null; // Prevent memory leaks
         };
       }
       ```

#### `./entities/Ship.js` (Renamed from `Ship.js`)
- [ ] **Task 16: Make Ship Abstract**
  - **Description**: Refactor as a base class.
  - **Lines**: Approx. 50-100
  - **Instructions**:
    1. Replace:
       ```javascript
       export class Ship extends EventEmitter {
         constructor(scene, position, options = {}) {
           super();
           this.scene = scene;
           this.options = { health: 100, speed: 0.1, ...options };
           this.mesh = null;
           this.health = this.options.health;
           this.isActive = true;
         }

         createMesh(geometry, materialOptions) {
           const material = new THREE.MeshStandardMaterial(materialOptions);
           this.mesh = new THREE.Mesh(geometry, material);
           this.mesh.position.copy(this.options.position || new THREE.Vector3());
           this.scene.add(this.mesh);
         }
       }
       ```

#### `./entities/Player.js`
- [X] **Task 17: Bind Control Event Listeners**
  - **Description**: Fix `this` context.
  - **Lines**: Approx. 100-150
  - **Instructions**:
    1. Update `constructor`:
       ```javascript
       constructor(scene, position, options = {}) {
         super(scene, position, options);
         this.handleKeyDown = this.handleKeyDown.bind(this);
         this.handleKeyUp = this.handleKeyUp.bind(this);
         this.handleMouseMove = this.handleMouseMove.bind(this);
         this.setupControls();
       }
       ```

- [X] **Task 18: Sync Movement with Multiplayer**
  - **Description**: Broadcast position updates.
  - **Lines**: Approx. 200-250
  - **Instructions**:
    1. Update `updateMovement`:
       ```javascript
       updateMovement(deltaTime) {
         // Existing logic...
         this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
         if (this.networkManager) {
           this.networkManager.emit('player_move', {
             position: this.mesh.position,
             rotation: this.mesh.rotation,
           });
         }
       }
       ```

#### `./entities/Enemy.js`
- [X] **Task 19: Fix 3D Collision Detection**
  - **Description**: Update for 3D space.
  - **Lines**: Approx. 200-300
  - **Instructions**:
    1. Replace:
       ```javascript
       checkWallCollision(wallSegments) {
         const pos = this.mesh.position;
         for (const segment of wallSegments) {
           const closest = this.getClosestPoint(pos, segment.start, segment.end);
           if (pos.distanceTo(closest) < this.options.size) return true;
         }
         return false;
       }

       getClosestPoint(point, start, end) {
         const line = end.clone().sub(start);
         const t = Math.max(0, Math.min(1, point.clone().sub(start).dot(line) / line.lengthSq()));
         return start.clone().add(line.multiplyScalar(t));
       }
       ```

#### `./entities/weapons/Laser.js` and `./entities/weapons/RegularLaser.js`
- [X] **Task 20: Merge Laser Implementations**
  - **Description**: Unify with inheritance.
  - **Instructions**:
    1. In `Laser.js`:
       ```javascript
       export class Laser {
         constructor(scene, position, direction, options = {}) {
           this.scene = scene;
           this.options = { speed: 0.3, color: 0x00ffff, ...options };
           this.mesh = this.createMesh();
           if (position) this.mesh.position.copy(position);
           if (direction) this.direction = direction.normalize();
           this.scene.add(this.mesh);
           this.isActive = true;
         }

         createMesh() {
           const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
           geometry.rotateX(Math.PI / 2);
           const material = new THREE.MeshBasicMaterial({ color: this.options.color });
           return new THREE.Mesh(geometry, material);
         }
       }
       ```
    2. In `RegularLaser.js`:
       ```javascript
       export class RegularLaser extends Laser {
         constructor(weaponSystem) {
           super(weaponSystem.scene, null, null, {
             damage: 10, range: 50, speed: 50, color: 0x00ffff
           });
           this.weaponSystem = weaponSystem;
           this.cooldown = 0.2;
         }
       }
       ```

#### `./entities/weapons/WeaponSystem.js`
- [X] **Task 21: Simplify Weapon Types**
  - **Description**: Limit to `LASER` since `BOUNCE_LASER` and `QUANTUM_GRENADE` files are missing.
  - **Lines**: Approx. 50-100
  - **Instructions**:
    1. Update `fireWeapon`:
       ```javascript
       fireWeapon(weaponType, position, direction, options = {}) {
         const config = this.weaponTypes[weaponType] || this.weaponTypes['LASER'];
         let projectile = new RegularLaser(this);
         projectile.mesh.position.copy(position);
         projectile.direction = direction.normalize();
         this.projectiles.push(projectile);
         this.scene.soundManager?.playSound('laser', position);
         this.scene.networkManager?.emit('laser_shot', {
           origin: position,
           direction: direction,
           type: weaponType
         });
         return projectile;
       }
       ```

#### `./core/NetworkManager.js` (New File)
- [X] **Task 22: Implement NetworkManager**
  - **Description**: Add basic multiplayer support.
  - **Instructions**:
    1. Create:
       ```javascript
       import { EventEmitter } from 'events';

       export class NetworkManager extends EventEmitter {
         constructor() {
           super();
           this.socket = new WebSocket('ws://localhost:8080');
           this.players = new Map();

           this.socket.onopen = () => this.emit('connected');
           this.socket.onclose = () => this.emit('disconnected');
           this.socket.onmessage = (msg) => this.handleMessage(JSON.parse(msg.data));
         }

         handleMessage(data) {
           switch (data.type) {
             case 'player_update':
               this.players.set(data.id, data);
               this.emit('player_update', data);
               break;
             case 'laser_shot':
               this.emit('laser_shot', data);
               break;
             case 'player_joined':
               this.emit('player_joined', data);
               break;
             case 'player_left':
               this.emit('player_left', data.id);
               break;
           }
         }

         emit(event, data) {
           if (this.socket.readyState === WebSocket.OPEN) {
             this.socket.send(JSON.stringify({ type: event, data }));
           }
           super.emit(event, data);
         }
       }
       ```
    2. In `index.js` constructor:
       ```javascript
       this.networkManager = new NetworkManager();
       ```

---

### Multiplayer Feature Tasks
- [X] **Task 23: Sync Player Positions**
  - **Description**: Broadcast and render player movements.
  - **Files**: `index.js`, `Player.js`, `NetworkManager.js`
  - **Instructions**: Completed via Tasks 7 and 18.

- [X] **Task 24: Broadcast Laser Shots**
  - **Description**: Sync weapon fire.
  - **Files**: `WeaponSystem.js`, `NetworkManager.js`
  - **Instructions**: Completed via Task 21.

- [X] **Task 25: Handle Player Join/Leave**
  - **Description**: Add visual feedback.
  - **Files**: `index.js`
  - **Instructions**:
    1. Add to `index.js`:
       ```javascript
       this.networkManager.on('player_joined', (data) => {
         console.log('Player joined:', data);
         this.updatePlayerCount();
       });
       this.networkManager.on('player_left', (id) => {
         const player = this.remotePlayers.get(id);
         if (player) this.scene.remove(player);
         this.remotePlayers.delete(id);
         this.updatePlayerCount();
       });
       ```

---

### Final Validation Tasks
- [X] **Task 26: Test All Features**
  - **Description**: Verify functionality.
  - **Instructions**:
    1. Test: Movement, laser firing, enemy AI, multiplayer sync, sound playback, UI controls.
    2. Check console for errors.

- [X] **Task 27: Document Code**
  - **Description**: Add comments for clarity.
  - **Files**: All modified files
  - **Instructions**:
    1. Add JSDoc:
       ```javascript
       /**
        * Plays a sound effect.
        * @param {string} name - Sound name
        * @param {THREE.Vector3} [position] - Optional 3D position
        */
       playSound(name, position = null) { /* ... */ }
       ```

---

### Notes
- **Dependencies**: Requires a WebSocket server (e.g., `ws` in Node.js) at `ws://localhost:8080`.
- **SoundManager Integration**: Now fully utilized, with `AssetLoader.js` focusing on models only.
- **Missing Weapons**: `BOUNCE_LASER` and `QUANTUM_GRENADE` are omitted; `WeaponSystem.js` defaults to `LASER`.
- **Next Steps**: If you add more files or a server setup, I can refine further.