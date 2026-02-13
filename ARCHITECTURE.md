# Quantum Drift - Architecture Documentation

**Last Updated:** 2026-02-13
**Analyst:** RICO

---

## Overview

**Quantum Drift** is a fast-paced neon maze shooter game built with Three.js and WebGL. It features isometric ship combat with weapons, obstacles, and planned multiplayer capabilities.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| 3D Engine | Three.js (v0.160.0) |
| Rendering | WebGL |
| Build Tool | Webpack 5 |
| Multiplayer (planned) | Socket.io Client |
| Audio | Three.js Audio system |
| Language | JavaScript (ES6+) |

---

## Project Structure

```
quantum-drift/
├── src/
│   ├── index.js              # Main game entry point (SimpleGame class)
│   ├── index.html            # HTML template
│   ├── core/                # Game engine core
│   │   ├── Engine.js
│   │   ├── Game.js
│   │   ├── GameEngine.js
│   │   └── Scene.js
│   ├── entities/
│   │   ├── player/Player.js
│   │   ├── enemies/         # Enemy AI (not fully implemented)
│   │   └── weapons/         # Weapon systems
│   ├── ui/                  # Game UI components
│   │   ├── GameUI.js
│   │   ├── GameRoom.js
│   │   └── MiniMap.js
│   ├── assets/
│   │   ├── ModelLoader.js   # GLB model loading
│   │   ├── SoundManager.js
│   │   └── AssetLoader.js
│   ├── config/
│   │   ├── Controls.js      # Keyboard mappings
│   │   └── GameConfig.js
│   └── styles/
│       └── main.css
├── dist/                    # Production build output
├── docs/
├── package.json
├── webpack.config.js
├── docker-compose.yml
└── QUANTUM_DRIFT_CHECKLIST.md  # Feature tracking
```

---

## Core Components

### 1. SimpleGame (index.js)
Main game class that orchestrates everything:
- **Scene Setup**: Three.js scene, camera, renderer
- **Asset Loading**: Sounds, 3D models (GLB)
- **Player Control**: WASD movement, rotation, firing
- **Game Loop**: Animation loop via `requestAnimationFrame`
- **Weapons System**: Laser, Grenade, Bounce Laser

### 2. Player Controls
- **W/↑**: Forward
- **S/↓**: Backward  
- **A/←**: Rotate left
- **D/→**: Rotate right
- **Q/E**: Strafe left/right
- **Space**: Fire weapon
- **1/2/3**: Select weapon type

### 3. Weapons System
- **Regular Laser**: Basic projectile
- **Grenade**: Click to target, explodes on impact
- **Bounce Laser**: Ricochets off walls (not fully implemented)

### 4. UI Components
- **GameUI**: HUD, weapon display
- **MiniMap**: Player position indicator
- **GameRoom**: Multiplayer lobby (not functional)

---

## Game State

### Implemented Features ✅
- Basic Three.js setup with scene, camera, renderer
- Player ship with WASD controls
- Boundary collision detection
- Obstacle generation with neon glow effects
- Regular laser weapon with firing
- Weapon switching (3 types)
- Energy system (depletes on firing, recharges)
- Mini-map (toggle with M)
- Start screen / loading screen
- Control indicators
- Touch controls for mobile

### Missing/Incomplete Features ⚠️
- **Ship model loading**: Requires GLB files in `assets/models/ships/`
- **Sound effects**: Requires MP3 files in `assets/sounds/`
- **Multiplayer**: Socket.io client included but server not built
- **Grenade weapon**: Targeting UI exists but explosion incomplete
- **Bounce laser**: Ricochet mechanics not implemented
- **Enemy AI**: Basic structure exists but no enemies spawned
- **Power-ups**: Not implemented
- **Game modes**: Single player only
- **Score system**: Basic timer, no persistence
- **Mobile support**: Touch controls exist but untested

---

## Known Issues / Troubleshooting

### 1. Game Not Loading
- Check browser console for errors
- Verify WebGL is enabled
- Ensure assets (models/sounds) are present

### 2. Ship Model Not Loading
- GLB files must exist in `src/assets/models/ships/`
- Game falls back to simple cone geometry if missing
- Check network tab for 404 errors on model files

### 3. No Sound
- MP3 files must exist in `src/assets/sounds/`
- Browser may block autoplay - interact with page first
- Check browser console for audio loading errors

### 4. Build Issues
- Run `npm install` first
- Use `npm run build` for production
- Use `npm start` for development with hot reload

---

## Development Commands

```bash
npm install          # Install dependencies
npm start            # Dev server with hot reload
npm run build        # Production build
npm run dev          # Watch mode development
```

---

## Architecture Diagram (Simplified)

```
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SimpleGame                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Scene    │  │ Player   │  │ WeaponSystem         │ │
│  │ Camera   │  │ Ship     │  │ - Laser              │ │
│  │ Renderer │  │ Controls │  │ - Grenade            │ │
│  └──────────┘  └──────────┘  │ - BounceLaser        │ │
│                               └──────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ UI       │  │ MiniMap  │  │ AssetLoader          │ │
│  │ GameUI   │  │          │  │ - Models (GLB)      │ │
│  └──────────┘  └──────────┘  │ - Sounds (MP3)       │ │
│                               └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Three.js / WebGL
```

---

## Next Steps for Full Functionality

1. **Complete Multiplayer**: Build WebSocket server, implement room system
2. **Finish Weapons**: Grenade explosions, bounce laser ricochet
3. **Add Enemies**: Enemy AI, spawning system, combat
4. **Power-ups**: Health, speed, weapon upgrades
5. **Polish**: Particle effects, screen shake, sound effects
6. **Mobile**: Test and optimize touch controls
7. **PWA**: Add service worker for offline play

---

*Generated by RICO - 2026-02-13*
