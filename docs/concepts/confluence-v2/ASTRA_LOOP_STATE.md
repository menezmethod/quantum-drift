# Astra Loop State

**Branch:** `design/confluence-gameplay-v2`  
**Status:** IN PROGRESS — iteration 04 validated; overall exit criteria not met  
**Owner:** GPT-6 Astra; Sonnet supervises/resumes

## Completed work

Iterations 00–03 remain complete. Iteration 04 enlarges Nexus to 28×28 and adds two sparse staggered authoritative cover islands. Nexus alone opens initially; Frozen Relay at 3 humans, Forest at 5, Forge and Rails at 7. District kits are preserved. Hub axes and the outer drift loop remain clear, cover shelters grenade blasts, and two exits into each open district remain. Safe hub spawn candidates replace district spawn candidates inside the hub. HUD counts real open districts. Browser fixtures now exercise the starting Nexus instead of closed Forge.

## Validation

- `npm test`: **88/88 pass**: explicit unlock identities, reachability, sealed closed exits, two hub exits, both border crossings, safe spawns, hub drift loop, blast shelter and exact renderer bounds at every stage.
- `npm run build`: **pass**.
- `CHROME_BACKEND=native npm run test:browser`: **pass**: live Nexus weapons, independent aim, death/respawn, replication/reconnect, cameras, mobile and practice.
- `node scripts/verification/confluence.cjs`: **pass**: each new district stage captured, 3/5/7 thresholds, contraction, desktop/touch hub movement, server-authoritative Nexus laser/grenade/ricochet hits. Zero page errors; 60.06–61.00 fps; whole-world 99 draws / 35,108 triangles. Local native headless Chrome only.
- Fresh four-bot probes, 30 simulated seconds per stage: zero invalid positions, 56/36/36/36 hits. No claim of human-tested fun.

## Evidence and comparison

`loop-runs/iteration-04/` has fresh stage/core/district/mobile captures, verification.json, bot probe, test/build/browser/live receipts and README. Core is now a complete playable starting court, with more tactical cover than iteration 03. Removed an accidentally copied stale iteration-02 bot probe from iteration-03 evidence; iteration-04's probe is fresh.

## Scores (0–10, higher is better; Astra self-critique)

Movement **8**; combat readability **8**; zone identity **7**; composition/silhouette **6**; materials/lighting/VFX **6**; implementation realism **9**; performance safety **8**.

## Remaining gap

Full Map still frames locked territory: at stage 0 the useful court occupies a tiny fraction of the image, despite working well in Arena view. Radar has the same problem. Radial outer silhouette, district environmental routing and simple materials remain unfinished; Forest pool full-map rendering needs a later correction.

## NEXT_ACTION

Derive shared active territory bounds from Nexus plus open districts and use them to frame Full Map and radar at every stage. Preserve Arena camera distance/orientation and independent aim. Add portrait/wide corner-fit checks and capture stage-0/1/2/3 overviews plus mobile Nexus, then validate, critique and checkpoint.
