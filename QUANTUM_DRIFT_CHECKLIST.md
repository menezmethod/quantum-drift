# Quantum Drift Development Checklist (Optimized)

This streamlined roadmap focuses on delivering a fun, isometric ship combat game with multiplayer support, optimized for performance and minimal scope creep.

## Phase 1: Project Setup & Core Environment ✅
- [x] Initialize GitHub repository
- [x] Set up Node.js with Three.js (lightweight dependencies only)
- [x] Create basic HTML/CSS structure and Three.js canvas
- [x] Set up scene, camera, renderer, and animation loop
- [x] Implement window resize handling
- [x] Docker setup for development (Dockerfile + docker-compose)
- [x] Test locally with a simple cube to confirm setup

**Notes:** Keep this lean—no Webpack or complex build tools yet unless needed for production. Focus on getting Three.js running.

---

## Phase 2: Core Gameplay (MVP Focus) ✅
### Arena & Ship ✅
- [x] Isometric camera setup
- [x] Simple arena floor (flat plane, no grid unless critical)
- [x] Arena boundaries with basic collision detection
- [x] Player ship (low-poly model or sprite)
- [x] WASD movement + rotation based on direction
- [x] Collision feedback (e.g., stop on wall hit)
- [x] Optimize ship size (~55% smaller) and collision radius (0.35 units)

### Basic Weapon ✅
- [x] Regular Laser (simple projectile, collision detection, basic VFX)
- [x] Weapon cooldown system (keep it simple: fixed timer)

### Game Loop ✅
- [x] Start screen with play button
- [x] Basic scoring (e.g., time survived or hits landed)
- [x] Game over condition (e.g., timer runs out)
- [x] Restart button

**Notes:** Skip complex UI, model customization, and extra weapons for now. Focus on a tight, playable loop. Use placeholders (e.g., cubes) if models aren't ready.

---

## Phase 3: Multiplayer Basics ✅
### Player Setup ✅
- [x] Player name input on start screen
- [x] Display name above ship (simple text, no icons yet)
- [x] Basic player list UI (names only)

### Game Features ✅
- [x] In-game pause menu (ESC key) with ship change option
- [x] Ship change functionality during gameplay (fixed: seamless ship selection and model updates)

### Backend ✅
- [x] Set up lightweight WebSocket server (e.g., `ws` in Node.js)
- [x] Sync player positions (x, y, rotation)
- [x] Sync laser shots (spawn + collision)
- [x] Connection status indicator (e.g., "Connected" text)

---

## Phase 4: Infinite Alien Map
### Terrain & Environment
- [ ] Design low-poly alien terrain (<500 tris per section)
- [ ] Implement infinite scrolling map system
- [ ] Add procedural terrain generation for new areas
- [ ] Implement object culling for distant elements (>50 units)

### Obstacles & Interactive Elements
- [ ] Add random static obstacles (rocks, ruins, alien structures)
- [ ] Implement laser collision with obstacles
- [ ] Add black holes for teleportation between map areas
- [ ] Create power-ups (speed boost, shield, weapon upgrade)

### Visual Enhancement
- [ ] Add alien atmosphere effects (fog, particles)
- [ ] Implement basic ambient lighting for mood
- [ ] Create simple day/night cycle

**Notes:** Use free assets from Sketchfab or Unity Asset Store for alien terrain and obstacles. Aim for <500 triangles per model to maintain performance. For procedural generation, use simple algorithms with Three.js.

---

## Phase 5: Gameplay Polish
### Weapons
- [x] Regular Laser (keep as-is)
- [ ] Bounce Laser (improve to make sure it bounces against obstables but kills enemies and self, simple VFX, do after infinite map with objecs so we can calibrate better)
- [x] Energy system (basic bar, drains on shot, slow regen)

### Feedback
- [ ] Hit markers (color flash on ship)
- [ ] Score display (top corner, simple text)
- [ ] Weapon switch UI (e.g., 1/2 keys, text indicator)
- [ ] Power-up collection feedback (glow effect, sound)

### Effects
- [ ] Ship thruster particles (small, low-count)
- [ ] Obstacle destruction effect (disappear + particles)
- [ ] Black hole visual effect (simple spiral texture + glow)

**Notes:** Limit to three weapons max for MVP. 

---

## Phase 6: Audio & Final Polish
### Audio
- [x] Laser sound (simple pew)
- [ ] Hit sound (src/assets/sounds/weapon-armor-hit.mp3)
- [ ] Background ambient music (looped, subtle)
- [x] Power-up collection sound (src/assets/sounds/weapon-charging.mp3)
- [ ] Black hole teleportation sound
- [x] Laser bounce sound (src/assets/sounds/bounce.mp3)

### UI
- [ ] Modernize start screen to look like a top game (name input + play button)
- [ ] Player list polish (border + scroll if needed)
- [x] Add minimap for infinite terrain navigation
- [ ] Simple settings menu (volume, graphics quality)

**Notes:** Keep effects minimal—focus on gameplay feel over flashiness. Audio is cheap polish; don't skip it.

--- DO NOT WORK ON THE BELOW YET, IT WILL BE EXPERIMENTAL ---

## Phase 7: Optimization for Raspberry Pi 4 (4GB)
The Raspberry Pi 4 (4GB) has limited CPU/GPU power (quad-core Cortex-A72, VideoCore VI GPU) and 4GB RAM. Here's how to ensure *Quantum Drift* runs smoothly:

### Rendering
- [ ] Cap frame rate at 30 FPS (reduce CPU/GPU load)
- [ ] Use low-poly models (<500 tris per ship/obstacle)
- [ ] Disable shadows and limit lights to 1-2
- [ ] Reduce canvas resolution (e.g., 800x600 or dynamic scaling)
- [ ] Implement object pooling for lasers (reuse instead of spawn/destroy)

### Multiplayer
- [ ] Minimize network packets (send position every 100ms, not 16ms)
- [ ] Compress data (e.g., x/y as integers, not floats)
- [ ] Limit active players to 4-6 in view (cull others)

### Map & Physics
- [ ] Keep terrain height variation minimal
- [ ] Use simple AABB collision (axis-aligned bounding boxes)
- [ ] Cap obstacles at 20-30 visible at once
- [ ] Implement distance-based LOD (level of detail)

### Testing
- [ ] Test on Pi 4 with Chromium in kiosk mode
- [ ] Monitor RAM usage (target <2GB) and CPU (<50%)
- [ ] Add toggle for "low graphics" mode (fewer particles, no fog)

**Notes:** Pi 4 can handle Three.js, but it hates high poly counts and frequent object creation. Prioritize simplicity and reuse.

---

## Asset Acquisition Strategy
### Finding Low-Poly Assets
- Check [Sketchfab](https://sketchfab.com/) for free GLB files under Creative Commons
- Browse [Unity Asset Store](https://assetstore.unity.com/) for free low-poly packs
- Use [Blender](https://www.blender.org/) with Geometry Nodes for procedural terrain
- Consider [Stable Diffusion](https://stability.ai/stable-diffusion) for concept art, then model in Blender

### Asset Requirements
- Ship models: <500 triangles each
- Terrain sections: <500 triangles per section
- Obstacles: <200 triangles each
- Textures: 512x512 or smaller, compressed

**Notes:** Many free assets on Sketchfab are community-created, offering unique alien designs that fit your theme, potentially saving hours compared to modeling from scratch.

---

## Revised Development Notes
- **MVP Goal:** Infinite alien map with obstacles, power-ups, and black holes; smooth multiplayer experience.
- **Cut Features:** Complex UI, grenades, mobile support, social features, advanced multiplayer (teams, matchmaking)—add these post-MVP if needed.
- **Performance Focus:** Keep poly counts low, cull aggressively, and test on weak hardware early.
- **Multiplayer Priority:** Sync only essentials (position, shots); avoid bloating network traffic.
- **Ship Size:** Stick with 55% reduction and 0.35 collision radius—works well per your notes.
