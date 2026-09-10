# Iteration 01 — District geometry differentiation

**Change:** `shared/maps/world.js` — four per-district obstacle kits rewritten so
each district creates a distinct movement problem; Industrial core given its own
inline kit (no longer reuses the Junction map). `tests/confluence-geometry.test.js`
added as the regression gate.

**Implementation:** fresh GPT-6 Astra (Codex), fenced to those two files.
**Validation:** Sonnet — `npm test` 84/84, `npm run build` pass,
`scripts/verification/confluence.cjs` 0 errors / 60 fps, live in-engine inspection.

## Captures

Interior views (teleport-captured in a live staged room, stage 3):

- `core-centre.png` — dense factory: four heat-exchanger blocks + central forge
  + flanking conduit strips, tight shortcut lanes.
- `forest-centre.png` — wide-open clearing, sparse offset round cover.
- `rails-centre.png` — four parallel rail platforms, ~8-unit lanes, transverse hub.
- `ice-centre.png` — three asymmetric baffles, long open diagonals.

Refreshed gauntlet set (same framing as iteration-00 for direct comparison):

- `whole-world.png` `core-online.png` `forest.png` `ice.png` `rails.png`
  `practice-mobile.png` · `verification.json`

## Scores vs iteration-00

Zone identity 3→7 · Gameplay space 5→7 · Combat readability 5→7 ·
Composition 4→6 · Materials/VFX 5→5 · Impl realism 8→8 · Perf risk 8→8.

## Not done yet

Macro topology still a symmetric 2×2 grid (concept wants radial hub-and-spoke +
always-on Nexus Core). Forest/Ice still visually bare. Rail platforms all equal
length. See `../../ASTRA_LOOP_STATE.md` for the next action.
