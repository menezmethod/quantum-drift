# Iteration 05 — active-territory framing

Shared active bounds now frame Full Map and radar at each human-count stage. Arena camera behavior is unchanged. Ground glyph rows now face the fixed gameplay camera correctly; larger core captures exposed the old vertical inversion.

89/89 tests, production build, native Chrome browser suite and stage/touch verification pass. Full Map fits every active corner at portrait/square/wide aspects. Live captures: 60.15–60.98 fps; full world 99 draws / 35,108 triangles. `nexus-stage-0.png` and `nexus-mobile-stage-0.png` now show a useful core instead of mostly locked territory. Stage 1/2/3 overviews record physical expansion.

Scores (Astra self-critique): movement 8, readability 8, identity 7, composition 7, materials/lighting/VFX 6, implementation realism 9, performance safety 8. The macro footprint remains four square rooms; this still falls short of the radial concept. Next: separate the four district platforms around Nexus with paired short connectors and visible void, preserving their kits and unlock order.
