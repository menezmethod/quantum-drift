# Iteration 04 — Nexus-first population progression

Nexus is now a self-contained 28×28 starting court with two staggered authoritative cover islands. Central aim axes and an outer drift loop remain clear. Snow opens at 3 humans, Forest at 5, Forge plus Rails at 7. All four existing district kits are preserved; district inner spawn candidates now belong to the Nexus, and four clear hub spawn candidates remain. HUD counts actual open districts.

88/88 tests, production build and native browser suite pass. Live staged receipts include all weapons with independent aim in the Nexus, each newly opened district, contraction and native touch movement. 60.06–61.00 fps; whole-world 99 draw calls / 35,108 triangles. Fresh four-bot, 30-second probes at every stage: zero invalid positions and 56/36/36/36 hits. These are diagnostic probes, not human playtesting.

Compare `nexus-combat.png` and `nexus-stage-0.png` against iteration 03. The core now supports cover decisions and a complete low-population match. Full Map still frames the entire locked world, leaving the playable Nexus tiny: this is the highest-value next correction. The overall square silhouette and simple district visuals remain below the concept floor.

Scores (Astra self-critique): movement 8, readability 8, identity 7, composition 6, materials/lighting/VFX 6, implementation realism 9, performance safety 8.

Next: derive shared active territory bounds and use them to frame Full Map and radar at every population stage, with corner-fit and live stage/mobile checks.
