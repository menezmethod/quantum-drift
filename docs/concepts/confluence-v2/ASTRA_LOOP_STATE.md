# Astra Loop State

**Branch:** `design/confluence-gameplay-v2`
**Status:** IN PROGRESS — iteration 10 complete; overall exit criteria NOT met
**Owner:** GPT-6 Astra implements; Sonnet supervises/resumes after quota resets

## Completed work

Iterations 00–09 remain intact: district geometry/dressing, always-on Nexus,
low-population Nexus starts, active framing, radial topology, overview fog
regression guard, authoritative Frozen Relay ice, procedural cracked-ice finish.
The stale kickoff's central-junction next action has already been completed.

**Iteration 10:** added opposing Forge conveyor flanks. Shared rectangular
surfaces at x=±24,z=-54,w=4,d=32 supply ±4.5 units/s carry through `movePlayer`.
Server/Practice/prediction/replay use the same code. Thrust overcomes the push;
velocity target remains capped at 13. Spawn selection avoids surfaces. Two dry
outer bypasses and all existing district crossings remain open. Procedural
moving treads and static amber arrows match the exact shared bounds. Radar,
Flight help and README explain the mechanic. No dependencies or imported assets.

## Validation

- `npm test`: **95/95 pass**; `npm run build`: **pass**.
- `node scripts/verification/confluence.cjs`: **pass**, 30 fresh captures,
  0 page errors, 60.11–60.95 fps, max 107 draw calls. Healthy overview content:
  visibleFraction 0.209–0.811, whole-world 0.367.
- Keyboard: ~2.7-unit belt carry in 0.6s; 4.12-unit countersteer in 0.6s on
  both opposing lanes; prediction reconciles within 1.2 units.
- Live mouse laser/grenade/ricochet damage while riding the belt; aim does not
  redirect hull movement. Native touch carry and lateral exit pass.
- Shared checks: speed cap, collision, dry safe spawns, prediction parity;
  existing 3/5/7-human expansion, paired bridges, reset and Practice pass.
- Draw/frame samples establish a rendering regression check, not load capacity.

## Evidence and critique

Durable receipts: `loop-runs/iteration-10/` (README, logs, JSON, four PNGs).
`forge-conveyor.png` / `forge-mobile.png` show readable directional flanks;
`whole-world.png` and `unlock-stage-3.png` show factory context. Better route
choice than iteration 09, but still below the manufacturing-wing concept's
material depth and landmark identity. No claim of overall completion.

Fresh screenshot-only critic scores (0–10, higher better): movement **7**,
combat readability **6**, zone identity **6**, composition **5**,
materials/lighting/VFX **5**, implementation realism **8**, performance safety
**7 provisional**. Astra accepts the visual scores; live verification supports
performance safety **9** for this implementation. Largest immediate gap:
boxed pilot nameplates overlap ships and hide combat/aim space.

## Remaining gaps

- Large boxed nameplates obscure ships and overlap in crowded Nexus/overview.
- Station/district silhouette and landmarks still look like rectangular decks
  with repeated blocks; concept-level visual identity remains incomplete.
- Forest pools show conspicuous triangular bank/water artifacts at overview.
- Rails still has no distinctive authoritative surface mechanic.

## NEXT_ACTION

Replace persistent boxed ship nameplates with compact hull bars immediately
above ships, retaining a clear local-player marker and protection state. Keep
pilot names available in the scoreboard and accessible labels. Inspect
`src/view/ShipIndicators.js`, `indicators.css`, their tests and renderer callers;
validate crowded Nexus and belt combat on desktop/touch plus full-map views.
Run tests/build and the Chrome gauntlet, capture, critique, checkpoint and push.

## Checkpoint contract

Every meaningful pass: rewrite this state with exact results, scores and ONE
NEXT_ACTION; commit with the requested Sonnet attribution and push. On quota,
record only the exact reset text Codex supplies; never invent a reset time.
A fresh Astra context resumes from this file. No implementation delegation.
