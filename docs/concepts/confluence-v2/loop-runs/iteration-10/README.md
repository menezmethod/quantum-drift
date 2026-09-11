# Iteration 10 — opposing Forge conveyors

Two flush 4×32 conveyor lanes sit at Forge x=±24, z=-54. They carry ships
at ±4.5 units/s around factory cover. Full thrust can countersteer or exit
sideways; the 13-unit/s cap remains intact. Shared rectangular surface lookup
and `movePlayer` serve server, Practice, prediction and replay. Dry outer
flanks, safe spawn selection and paired Nexus bridges remain available.

Procedural moving tread textures, stationary amber arrows and radar markings
share the authoritative footprints. No dependencies, imported assets, raised
collision lips or extra lights. Flight help and README explain the mechanic.

Validation: **95/95 tests**, production build pass, Chrome gauntlet pass with
**30 captures, 0 page errors, 60.11–60.95 fps**, max 107 frame draw calls.
Overview visibleFraction 0.209–0.811 (whole-world 0.367). Both belts carried
~2.7 units in 0.6s; countersteering moved 4.12 units against the flow in 0.6s.
Live mouse laser/grenade/ricochet damage, independent heading, prediction
reconciliation, native touch carry/side exit and expansion/reset all passed.
`tests.txt`, `build.txt`, `browser.txt`, `verification.json` contain receipts.
Frame samples are a regression check, not a server-capacity benchmark.

Screenshots: `forge-conveyor.png` and `forge-mobile.png` show the lanes in play;
`unlock-stage-3.png` and `whole-world.png` show their place in the factory.
Compared with iteration 09, Forge now provides a controlled route choice, not
just denser cover. Compared with the manufacturing-wing concept, machinery
and lighting remain plain and repetitive; the overall visual bar is not met.

Fresh read-only critic scores (higher better): movement 7, combat readability
6, zone identity 6, composition 5, materials/lighting/VFX 5, implementation
realism 8, performance safety 7 provisional. The critic only saw screenshots;
Astra's tests establish movement/collision/authority, and measured frames
support performance safety 9 for this pass. Largest actionable criticism:
boxed nameplates overlap ships and hide aim space, especially around Nexus.
Next pass: compact hull bars above ships, with pilot names in the scoreboard.
