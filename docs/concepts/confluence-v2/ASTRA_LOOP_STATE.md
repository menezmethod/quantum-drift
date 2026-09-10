# Astra Loop State

**Branch:** `design/confluence-gameplay-v2`  
**Status:** IN PROGRESS — iteration 01 complete, validated, checkpointed  
**Owner:** GPT-6 Astra in Codex (implementation) · Sonnet (orchestration + validation)  
**Design source:** ChatGPT 5.6 Sol concept pass (`docs/concepts/confluence-v2/images/`) + live game  

## Current objective

Turn Confluence into a gameplay-first, visually exceptional single expanding arena whose shipped implementation beats the concept references rather than merely reproducing them.

## Iteration 01 — district geometry differentiation

**Task given to Astra (fresh, non-forked GPT-6 Astra context):** redesign the four
per-district obstacle kits in `shared/maps/world.js` so each district creates a
distinct movement problem, staying inside the current 2×2 topology. Implementation
only — no screenshots, scoring, gauntlet, commits, or iteration.

### Exact changes (Astra)

- `shared/maps/world.js` — dropped the `require('./junction')` import; the
  Industrial core now has its own inline kit instead of reusing the Junction map's
  obstacle set. All four kits rewritten:
  - **Industrial core / Forge District** — 8 obstacles: two long `conduit`
    conveyor strips flanking four `heat-exchanger` blocks + one central `forge`
    block, with ~4-unit shortcut gaps. Densest, close-quarters, ricochet-heavy.
  - **Forest / Verdant Basin** — 5 obstacles: three offset `growth-vat` cylinders
    + two small `planter` boxes around a ≥14-unit-radius clear central clearing.
    Sparsest; free dogfighting and loops.
  - **Orbital Rail Yard** — 5 obstacles: four long `rail-platform` strips along Z
    with ~8-unit lanes + one transverse `relay-housing` hub. Channelled, long
    sightlines, lane commitment.
  - **Frozen Relay** — 5 obstacles: three asymmetric `ice-baffle` boxes (no longer
    the symmetric 4-corner pattern) + two `relay-pylon` cylinders. Wide open with
    long diagonal sightlines.
- `tests/confluence-geometry.test.js` — NEW. Asserts for `getWorld(0..3)`: local
  extent cap (|coord−centre|+half ≤ 24), ≥4-unit gaps within a district, ≥3-unit
  clear disk around every spawn, crossing throats clear at radius 2 for every
  stage where both adjacent districts are open, forest clearing ≥14, and a
  distinctness check (forest cover area < core/2; core densest; forest sparsest;
  3–4 long rail platforms with ≥6-unit lanes; both ice diagonals clear).

Fenced to those two files only. `junction.js`, simulation, server, renderer,
spawn logic, dividers, staging: untouched.

### Validation (Sonnet)

- `npm test` — **84/84 pass** (incl. new geometry test, `world-expansion`,
  `simulation`, `movement`, real-socket multiplayer).
- `npm run build` — **passes** (`webpack ... compiled successfully`).
- `node scripts/verification/confluence.cjs` — **0 page errors**; two headless
  Chrome clients + five real sockets; synchronized 7-human expansion to stage 3;
  **60 fps** on every capture (core-online 60.8, whole-world 61.0, forest 60.4,
  ice 60.3, rails 60.7, practice-mobile 60.7); draw calls 36–93, triangles
  14.8k–32.3k — in line with the baseline, no perf regression.
- Live inspection: launched Practice (`getWorld(3)`, all districts open) and a
  headless staged room; teleport-captured each district centre + lanes. Screens
  in `docs/concepts/confluence-v2/loop-runs/iteration-01/`
  (`*-centre.png` = interior views, plus the refreshed gauntlet set).
- Collision = render parity: no new obstacle types; all axis-aligned box/cylinder
  cover on the existing shared collision model; known `role` values only, so
  renderer detailing stays inside collision footprints.
- Multiplayer authority: `world.js` is pure data consumed unchanged by the
  authoritative simulation; no client-side logic moved.

### Comparison vs concept + baseline

- Concept target: `quantum_drift_confluence_arena_map.png` (radial hub-and-spoke,
  four districts each with a spatial signature).
- Baseline (iteration-00): four near-identical scattered-crate kits; districts
  differed only by floor tint/prop skin ("four decorated rooms").
- After iteration-01: the four quadrants now read as four different spatial
  problems — dense factory / open clearing / channelled lanes / asymmetric open
  ice. This is the concept's per-district *feel*, delivered inside the current
  topology. Macro topology is still the symmetric 2×2 grid, not the concept's
  radial Nexus-Core layout.

## Current scores (0–10) — iteration-00 → iteration-01

- Gameplay space / movement freedom: 5 → **7**
- Combat readability: 5 → **7**
- Zone identity: 3 → **7**  (was the single biggest failure)
- Composition / silhouette: 4 → **6**
- Materials / lighting / VFX: 5 → **5**  (untouched this pass — deliberately no cosmetic work)
- Implementation realism: 8 → **8**
- Performance risk: 8 → **8**

## Test status

`npm test` 84/84 pass · `npm run build` pass · confluence gauntlet 0 errors, 60 fps.

## Last completed work

- iteration-00 baseline captured and checkpointed (`loop-runs/iteration-00/`).
- iteration-01: four district kits differentiated; regression test added;
  validated live; evidence in `loop-runs/iteration-01/`.

## Remaining gaps

1. **Macro topology** still a symmetric 2×2 grid. The concept wants a radial
   hub-and-spoke with a distinct always-on **Nexus Core** and fast exits. This is
   the next large macro pass and will touch spawn-corner math, the divider loop,
   the minimap, staging, and the `traceWalls` fixtures — scope carefully.
2. **Forest & Ice read visually bare** — no foliage/water (forest) or ice-field
   flourish; concept has lush detail. Cosmetic/materials pass.
3. **Rail platforms are all equal length**; concept shows staggered platforms and
   varied lane depth. Minor layout polish.
4. `zones[].humans` unlock order (1/3/5/7 → core/forest/rails/ice) differs from
   the concept (core always-on / snow 3+ / forest 5+ / industrial+space 7+).
   Reconcile only alongside the topology pass.

## NEXT_ACTION

Launch a fresh GPT-6 Astra context to run one cosmetic/materials pass on the
**Forest / Verdant Basin** district only: add non-colliding ground foliage,
shallow-water decal, and canopy/vegetation dressing kept strictly inside the
existing obstacle footprints and the district floor (no new collision, no
silhouette outside footprints, no change to `world.js` obstacle geometry), so the
open clearing reads as a living biodome instead of a bare green floor. Then Sonnet
validates in-engine (build, tests, gauntlet, live screenshots, 60 fps check) and
compares against `quantum_drift_verdant_basin_blueprint.png` before the next
macro-topology pass.

## Checkpoint contract

Before any quota/context interruption, replace this file's contents with the newest status, scores, test result, last completed work, and exactly one concrete `NEXT_ACTION`, then commit and push the branch.
