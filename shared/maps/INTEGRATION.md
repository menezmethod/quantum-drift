# Map module — integration request

Ready for parent integration. Only `shared/maps/` was changed. No builds, commits,
server restarts, core changes, or integrated visual claims were made.

## Exact API

```js
const { MAPS, getMap, MAP_ROTATION } = require('./maps'); // from shared/simulation.js
const map = getMap('foundry');
const selectableMaps = MAPS; // array of map objects, ready for UI
```

- `MAPS`: deeply frozen **array of map objects**, ordered `foundry`, `canopy`,
  `glacier`, `classic`. Pass it directly to UI. ID lookup stays private.
- `MAP_ROTATION`: frozen array `['foundry', 'canopy', 'glacier', 'classic']`.
- `getMap(id)`: returns a shared immutable map. Missing/unknown/non-string IDs
  resolve to Foundry. `quantum-arena-v1` resolves to Classic for old saved IDs.
  Prototype keys cannot select inherited objects. No IO, randomness, or imports
  from simulation or rendering. Maps survive JSON serialization unchanged.
- Every map has `{id,name,subtitle,size,obstacles,theme,spawnPoints}`. `size` is
  the **half-extent**: playable x/z each span `[-size, +size]`, as in the existing
  physics. Ground is continuous at y=0. Obstacle coordinates are centers;
  box w/d are full widths/depths, circle r is radius, h is full height.
- Classic preserves all 16 original obstacle values and size=25. Its public ID
  is `classic`; legacy name lookup is handled by `getMap`. The new four-unit gap
  guarantee applies to the new maps; Classic retains historical narrow gaps.

## Parent integration requests

1. Replace the inline simulation map dependency with this registry and pass the
   selected map into both authoritative simulation and `World.build(map)`.
   Server defaults to `getMap('classic')` for old clients; new UI defaults to
   `getMap('foundry')`. Preserve the legacy simulation `MAP.id`
   `quantum-arena-v1` where old tests require it; this module's Classic ID is
   always `classic`. Do not create a circular import to extract Classic.
2. Publish selectable maps to the interface via the array above and share the
   authoritative selected map ID with clients. Rebuild the world and reset the
   camera on map changes. Rotate only between rounds.
3. Integration now uses map-sized spawn search and rotates on `newRound`. Keep
   preferring each map's `spawnPoints`, recheck collision with player radius
   plus clearance, and rank by living-opponent separation (and line of sight if
   available). These are safe **geometry candidates**, not guarantees of safety
   from live fire or occupancy. Preserve a map-bounded fallback search when all
   candidates are occupied. Never use `{x:0,z:0}` as an unchecked fallback:
   Foundry has a solid central forge. Do not assign IDs/state onto frozen points;
   copy their x/z into the player.
4. Run integrated captures for all maps after publishing dependencies; inspect
   gameplay, projectile occlusion, bot movement, and each time-of-day variant.
   Builder tests establish geometry only, not visual quality or combat balance.

## World metadata contract

`theme` is the literal map ID (`foundry`, `canopy`, `glacier`, `classic`), so
World can use `map.id` as its fallback without translating theme names. World
must render all collision obstacles even if it ignores every optional field.

- `palette` (new maps): hex colors `{floor,cover,accent,background}`. These are
  art-direction hints; obstacle `color` remains usable by the basic renderer.
- `obstacles[].role`: optional visual hint attached to actual solid cover.
  Foundry: `forge`, `heat-exchanger`, `conduit`; Canopy: `planter`, `growth-vat`,
  `root-vat`; Glacier: `ice-baffle`, `relay-housing`, `relay-pylon`. Enrich these
  **inside their collision footprints**; do not add wider bases or blocking
  silhouettes that imply collision outside them. No obstacle rotations/slopes.
- `districts`: `{id,name,x,z,w,d,color}` rectangular **floor marking** regions,
  not barriers, walls, platforms, water hazards, or gameplay zones. Overlap is
  intentional; array order may determine decal layering. Keep floor treatment
  flat and low contrast. Names are optional callouts.
- `props`: `{kind,x,z,w,d,h}` peripheral landmark bounding envelopes. All lie
  completely outside the arena. Render at ground level outside the play boundary
  or ignore them. Keep any generated geometry within its envelope; no collision,
  no overhanging canopy hiding pilots. `furnace-stack`, `research-dome`, and
  `relay-dish` are hints, not required renderer implementations.
- `spawnPoints`: array of eight `{x,z}` locations per map. New map point sets and
  cover are symmetric under 180-degree rotation. Spawns are at least two units
  clear of solids/bounds and have at least two three-unit ship-sized exit paths.

## Tactical intent

| Map | Half-extent | Cover count | Route decisions |
| --- | --- | --- | --- |
| Foundry | 30 | 9 | Central 8×8 forge cuts direct center fire; six-unit gaps to exchanger banks form an inner ring. Conduit blocks separate outer runs, encouraging corner fights and ricochets. |
| Canopy | 30 | 10 | Clear central court invites direct engagements; paired flank planters offer escape routes, with round vats changing bank-shot angles and breaking outer sightlines. |
| Glacier | 32 | 10 | Long north–south axis and broad central crossing create crossfire; long horizontal baffles shelter staging areas, with outer relay housings offering longer flanks. |
| Classic | 25 | 16 | Original mixed shape layout retained for legacy play. |

## Verification and receipts

Run `node --test shared/maps/maps.test.cjs` (no dependencies or build required).
All 16 tests passed. Tests cover array registry/fallback/immutability, numeric shape bounds, spawn clearance
and exits, full sampled movement connectivity at ship radius 0.8, and connectivity
with radius 2 for four-unit corridors on new maps. Every new obstacle pair and
boundary gap is also checked analytically for >=4 units. Flood fill uses a 0.5
unit grid with four-neighbor movement and midpoint collision checks. Peripheral
metadata bounds, rotational cover symmetry, and distinct tactical axes are checked.
Sampling is not a substitute for integrated navigation and gameplay validation.

Baseline inspected before changes:
`docs/gauntlet/evidence/baseline-isometric-dusk.png`.
No integrated after captures have been inspected; no visual score is assigned.

Changed paths:
- `shared/maps/index.js`
- `shared/maps/classic.js`
- `shared/maps/maps.test.cjs`
- `shared/maps/INTEGRATION.md`
