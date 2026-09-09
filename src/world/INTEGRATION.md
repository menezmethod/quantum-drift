# World module — ready for parent integration

Only `src/world/` was edited. No build, server restart, commit or core edit.

## Exact API

```js
import { World } from "../world/World"; // from src/core/ArenaRenderer.js

const world = new World(scene, renderer);
world.setTimeOfDay("dusk"); // can also be called before build
const root = world.build(authoritativeMap);
world.setShowcase("world");
world.update(state.time, dt); // seconds
// On map switch, reuses root and releases the previous world's GPU resources:
world.build(nextAuthoritativeMap);
// Final teardown:
world.dispose();
```

- `constructor(scene, renderer)`: immediately attaches `world.root` to the scene.
  Renderer is accepted for the contract but never mutated. No camera, DOM,
  renderer tone mapping, pixel ratio, shadow settings, ships or projectiles touched.
- `build(map) -> THREE.Group`: requires `{id, size, obstacles}`. `size` is the
  half-extent; surface y=0. Synchronous, deterministic, no asset loads. Uses the
  exact passed obstacle array; does not import map data or core modules.
- Obstacles: boxes use full `w,h,d`; cylinders use `r,h`; sphere cover uses
  ellipsoids with x/z radius `r` and full y height `h`, centered at `h/2`.
  All primary cover is opaque and retains the supplied collision dimensions.
  Flush face cladding stays within the footprint. Roof panels, plants and snow
  crust are cosmetic; they stay within the footprint and can rise slightly above
  `h`. No extra gameplay blocker is created. Peripheral structures sit outside
  `[-size,+size]` on at least one horizontal axis. Center decoration is floor inlay.
- `id` selects `foundry`, `canopy` or `glacier`; `theme` string (or `theme.id`) is
  the fallback. Classic and unknown IDs get Foundry materials with their own
  supplied cover. This is intentional compatibility, not a fourth art biome.
- Optional `obstacles[].role`: `forge` gets the central induction core,
  `ice-baffle` gets ice stratification and snow crust. Canopy cover gets planted
  roofs. Every obstacle renders if roles are absent.
- Optional `districts`: clamped flat floor finish rectangles; never physical
  zones. Other metadata (`props`, `palette`, `spawnPoints`) is not required or
  consumed. Composed peripheral landmarks use map half-extent and the local art
  palette, so map generation and world building remain independent.
- `setTimeOfDay('day'|'dusk'|'night')`: changes hemisphere/key/rim intensities,
  key color/direction, emissive material, scene background/fog and aurora
  visibility. Invalid values select dusk. Choice persists across map rebuilds.
- `setShowcase(module)`: records the mode, preserving identical world geometry.
  **Parent hides ships/HUD for map-only showcase.** It must not hide `world.root`.
- `update(time, dt)`: absolute time and delta in seconds; only the distant aurora
  moves slowly. Ignores nonfinite time. No per-frame allocations or new geometry.
- `dispose()`: idempotent; removes root and disposes geometry, materials, texture,
  and InstancedMesh buffers. Restores the original background/fog only if they
  are still owned by this instance. A disposed World cannot be rebuilt.
- `root.userData.environmentDrawCalls`: scene submission count before frustum
  culling, not measured renderer telemetry. Cover batches expose
  `mesh.userData.cover = [{instance, obstacle}]` for inspection/testing.

## Parent integration requests

1. Replace the previous `buildArena` geometry with `world.build(map)`, using the
   same authoritative map as simulation. Remove the old constructor environment
   lights, old grid/floor/cover/stars and old scene fog ownership. Keeping either
   old lights or old arena produces duplicate illumination/geometry.
2. Keep a single World per arena scene. `world.root` is already attached; do not
   recreate, dispose externally, or add separate environment lights on map
   switches. World owns environment lighting for ships as well as scenery.
3. Wire existing showcase/time query values to `setShowcase`/`setTimeOfDay`, call
   update each draw, and rebuild only when the authoritative map changes.
4. Run integrated after captures for all three new maps, with world-only and
   combat views, including day/dusk/night. Inspect front/back cover visibility,
   terrain/ship contrast, and peripheral silhouettes in tactical/isometric
   cameras. World uses two directional lights and a hemisphere with no shadows,
   no transparent architecture, no postprocessing and no texture downloads.
5. Measure actual integrated draw calls/FPS on SwiftShader. Module counts below
   exclude ships, HUD and effects and are not an FPS claim or a visual score.

## Art direction implemented

- Foundry: graphite decking, copper cladding, central induction core on the
  authoritative forge, large segmented orbital gate, dock heat exchangers and
  underslung service conduits. A distant orbital arc gives the deck depth.
- Canopy: stone research containers with planted roofs, curved leaf geometry,
  branching umbrella specimens, hanging luminous seed pods, retired greenhouse
  ribs and a quiet botanical lens in the open court.
- Glacier: pale stratified baffles, continuous serrated escarpments, a lathed
  parabolic relay with radial braces and feed struts, layered polar horizon and
  a restrained distant auroral ribbon at dusk/night.

All repeats use InstancedMesh by geometry/material. Structured floor texture is
a deterministic 256px DataTexture with mipmaps; no browser canvas dependency.

## Verification

`node --test src/world/World.test.mjs` — 7 tests pass. Checks all current maps'
primary cover bounds, opaque materials, finite vertices, bounded scene geometry,
actual time-of-day state changes, mode preservation, resource disposal on map
switch, preservation of unrelated scene objects and invalid-map rejection.
The test loader imports the ES module without changing the root CommonJS setup.

Static scene counts from that test (before culling, no GPU render):

| Map | Environment submissions | Mesh triangles |
| --- | ---: | ---: |
| Foundry | 19 | 12,868 |
| Canopy | 22 | 27,132 |
| Glacier | 23 | 11,198 |
| Classic | 19 | 28,676 |

Inspected before implementation:
- `docs/gauntlet/evidence/baseline-isometric-dusk.png`
- `docs/gauntlet/evidence/baseline-chase-day.png`

No integrated after capture has been inspected by this builder. No visual
improvement claim, score, runtime-error claim or hardware performance claim.

Changed paths:
- `src/world/World.js`
- `src/world/World.test.mjs`
- `src/world/INTEGRATION.md`


## Parent-integrated round 3

World now owns static directional shadow configuration and opaque cover casting/receiving. Renderer enables PCF soft shadows with autoUpdate=false; map rebuilds and lighting changes explicitly refresh them. Ships retain contact shadows and do not enter the static shadow map. Route callouts, themed cover treatment and connected scenery were added. Prior no-shadow notes describe r1 only. Parent updated cover tests to require opaque cover casting and transparent decoration exclusion. Latest integrated screenshots live under docs/gauntlet/evidence/r4-*. No new independent world pass has been awarded.
