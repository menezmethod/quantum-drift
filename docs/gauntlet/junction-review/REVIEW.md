# Junction bounded release review

**Verdict: ship as an opt-in first iteration. No release blocker observed in this pass.** Junction provides a visibly different arrangement using the existing Foundry kit, with readable cover and plausible short flanks. This is limited approval for an optional map, not proof of balance or human fun.

Reviewed 2026-09-09 on `codex/mini-releases`: Junction data, registry/selector integration, and existing dist in installed Chrome via `@playwright/test`. Own `createGameServer()` instance listened on an ephemeral loopback port with in-memory rankings; closed after capture. No production edits, commits, build, hosting, or existing-server restart.

## Evidence and integration

- Selected Foundry and Junction through their actual map cards and created rooms through the UI. Junction's second independent browser context joined by room code without choosing Junction locally. Both snapshots report `junction`, room `1796BA`, and two humans/four pilots.
- Keyboard WASD movement and mouse aiming/held fire were real browser inputs, with no position fixtures or simulation writes. Both Junction clients ultimately report Critic A at `(29.1737, -13.7833)`, health 28, grenade selected, seven shots fired. Initial position was `(25, -27)`. This verifies movement and combat-state replication, not merely the menu label.
- Registry inspection confirms Junction is in `MAPS` and absent from `MAP_ROTATION`; no default-rotation inclusion requested or recommended.
- Inspected all five PNGs: [Foundry overview](foundry-overview.png), [Foundry live action](foundry-action.png), [Junction overview](junction-overview.png), [Junction live action](junction-action.png), [Junction second client](junction-peer.png).
- Reproduction: [run.cjs](run.cjs). Raw snapshots, GPU string, console/page errors, and frame telemetry: [telemetry.json](telemetry.json).

## Layout and readability assessment

**Layout: B / promising optional iteration. Readability: B / usable with minor inherited clutter. Human fun: ungraded, untested.** Grades are qualitative judgments of this artifact, not numerical playtest results.

Junction replaces Foundry's dominant central forge/ring with two offset square blocks and longer side conduits. Overview pixels expose a crossing and several ways around individual pieces; the perimeter remains available. It appears easier to cut across the middle than Foundry's central obstruction, while the offset blocks offer short sightline breaks. These are layout observations, not an exhaustive traversal or geometry proof.

The live Junction frame captures a nearby bot firing beside a conduit/pylon while the reviewer moves at the boundary, with hull reduced to 76 in-frame and 28 by the final snapshot. Foundry's corresponding frame has no nearby opponent and full hull. This demonstrates that tight contact can occur; different bot populations (three versus two plus an idle peer), timing, and one route make encounter-rate comparisons invalid.

Cover silhouettes, orange edge accents, and top surfaces are distinguishable from the dark floor in both maps. Junction's lower central pieces give a less visually dominant obstruction than Foundry's forge. Navigation retains the familiar kit and minimap, although repetitive conduit silhouettes and the retained circular center decoration make Junction's identity weaker in a cropped action view than in overview.

## Release-blocking findings

None observed within the reviewed scope. Parent reports 75 passing tests and comparative bot probes with no invalid positions and similar contact/kills at 2/4/8 pilots; those are parent-owned evidence, not independently rerun here. [bot-probe.json](bot-probe.json) was left untouched. This verdict relies on the parent for simulation geometry correctness.

## Future findings and risks

- **Grenade pressure: follow-up human test.** The gaps between paired side conduits are 8 units long, while grenade radius is 5; a well-placed blast can pressure a whole local opening. The surrounding routes and separate cover pieces suggest alternatives rather than sealed rooms. Existing explosion code checks cover occlusion. No successful grenade escape or unavoidable trap was demonstrated: switching after laser fire left insufficient energy, and the captured grenade circle is an aiming indicator, not an explosion. Do not claim grenade balance from this pass.
- **Landmarks and labels: minor polish.** Reused floor labels/center ornament do not clearly communicate Junction's named pockets. Health/name plates obscure some nearby space, as also seen on Foundry. Neither prevents reading the inspected routes; a future targeted landmark/label improvement is sufficient, without an art overhaul.
- **Navigation confidence is bounded.** WASD movement succeeded but this short path stayed near one boundary; central flanks and all escape combinations were visually assessed, not driven exhaustively. Actual opponents may make nominally open routes unsafe.

## Performance and limits

Native renderer confirmed: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Max, Unspecified Version)`, no SwiftShader flags. At 1440×900, approximately 6.5 seconds of requestAnimationFrame sampling gave Foundry **60.15 FPS / 16.8 ms p95** (391 frames) and Junction **58.03 FPS / 16.7 ms p95** (378 frames). Junction ran with a second rendering client; this is a smoke check, not a controlled performance comparison or low-end hardware promise. No console errors or uncaught page errors were captured.

One focused scripted pass; fresh production dist supplied by parent. No full match, human duel, exhaustive camera/device coverage, sustained performance run, network impairment, rotation transition, or successful reviewer hit/kill was tested. The second client stayed idle after joining. Evidence supports working opt-in integration and a worthwhile layout experiment; human enjoyment and competitive balance remain open.
