# Iteration 06 — radial cardinal topology (Astra iteration interrupted by quota; checkpointed by Sonnet)

**What Astra changed** (`shared/maps/world.js`, `src/world/World.js`,
`src/view/CameraRig.js`, `src/index.js`, `README.md`, plus tests
`tests/world-expansion.test.js`, `tests/confluence-geometry.test.js`,
`src/world/World.test.mjs`, `src/view/view.test.cjs`):

- Districts moved off the 2×2 grid to **cardinal positions around the Nexus**:
  Forge `(0,-50)`, Forest `(50,0)`, Orbital Rails `(-50,0)`, Frozen Relay `(0,50)`.
  World half-extent `size` 60 → 84.
- New `partition(areas, size)` in `world.js`: from the union of Nexus + open
  districts + paired short connectors it emits disjoint **deck** tiles, a solid
  **void** complement (closed area), and **boundary** guardrail segments that
  share exact edges — so collision, the visible platform edges, the radar and the
  camera all read the same rectangle partition. `map` now carries
  `deck`, `boundaries`, `connectors`.
- District unlock is per-district `stage` metadata (ice→1, forest→2, forge+rails→3).
- `World.js`: deck-tile floor renderer, guardrail `boundary()` renderer, `cover()`
  skips `void` colliders, fog re-tuned to `size*6 .. size*9`.
- `CameraRig.js`: far plane now grows with camera distance + `map.size`.
- `index.js`: minimap draws deck tiles and skips voids.

**Validation (Sonnet, on the interrupted tree):**

- `npm test` → **90/90 pass** (incl. new "radial deck and void partition is
  exact, guardrails follow it, expansion never blocks existing flight space" and
  "Nexus cover shelters blasts while the outer drift loop stays clear").
- `npm run build` → pass.
- `node scripts/verification/confluence.cjs` → 0 page errors, **60 fps** on all
  21 captures, draw calls 28–104, ≤35k triangles. Staged 3/5/7-human expansion
  and safe reset observed; keyboard + native CDP touch movement exercised.
- **Ground / in-play rendering is correct and looks good** — see
  `nexus-combat.png`: a clean 28×28 always-on Nexus court with gold guardrails,
  drift ring and cover, matching the concept's "Nexus Core — always active".

**KNOWN REGRESSION (why this is a checkpoint, not a finished iteration):**

- The **full-map / overview `V` view renders near-black** — see
  `overview-stage-3.png`, `whole-world.png` (PNG collapses to ~95 KB of mostly
  background). The radial `size:84` world sits far enough from the zoomed-out
  camera that the ground-tuned fog (`near size*6`, `far size*9`) and/or the
  overview camera distance swallow the whole deck. The minimap renders the new
  cross topology correctly; only the 3D overview is broken.
- Codex hit its ChatGPT usage limit at the critique/commit step, before catching
  this in loop step 6 and before writing this checkpoint. Sonnet committed the
  green, ground-validated work so it is not lost, with the regression documented.

**Not done:** the overview render regression above; Nexus-as-complete-low-pop-arena
polish; Forest/Ice materials; concept-level silhouette.
