# Astra Loop State

**Branch:** `design/confluence-gameplay-v2`  
**Status:** IN PROGRESS — iteration 03 validated; overall exit criteria not met  
**Owner:** GPT-6 Astra; Sonnet supervises/resumes

## Completed work

Iterations 00–02 remain complete. Iteration 03 opens an always-on 20×20 Nexus by notching closed district rectangles and deleting central divider stubs. All district kits and both outer crossings remain. Four hub spawn candidates use existing authoritative safe-spawn selection. Shared `regionAt` feeds HUD and music; renderer/radar show the hub independently of district stage. No client-authoritative changes or dependencies.

## Validation

- `npm test`: **87/87 pass**, including full hub reachability, two hub exits per open district, sealed closed district exits, safe spawns, unchanged border crossings, exact renderer collision bounds at every stage.
- `npm run build`: **pass**.
- `CHROME_BACKEND=native npm run test:browser`: **pass**, all weapons, independent aim, death/respawn, replication/reconnect, cameras, mobile and practice.
- `node scripts/verification/confluence.cjs`: **pass**, all 3/5/7-human stages, round contraction, desktop/touch Nexus movement and live server-authoritative Nexus laser/grenade/ricochet bank hits. Zero page errors; 60.09–61.02 fps; whole-world 99 draw calls / 34,792 triangles. Local native headless Chrome measurement only.

## Evidence and comparison

`loop-runs/iteration-03/` contains screenshots, verification.json, full test/build/browser/live receipts and README. `nexus-stage-0.png` and `nexus-expanded.png` show the new hub; `nexus-combat.png` records the live combat fixture. Removed flickering legacy centre-inlay layers after first capture. The centre now works, but the whole-world square grid still falls short of the radial concept. Forest pools show rough full-map triangulation/overlap in this capture, to revisit after macro gameplay.

## Scores (0–10, higher is better; Astra self-critique)

Movement freedom **8**; combat readability **7**; zone identity **7**; composition/silhouette **6**; materials/lighting/VFX **6**; implementation realism **9**; performance safety **8**.

## Remaining gap

The Nexus is a junction, not yet a complete starting arena. Forge remains open at low population; the target calls for a useful self-contained Nexus and district unlocks around it. Radial perimeter and richer environmental routing remain unfinished. No claim of human-tested fun or meeting the concept floor.

## NEXT_ACTION

Make Nexus the self-contained low-population arena: enlarge its court to 28×28, add two sparse staggered authoritative cover islands with clear axes and flank loops, and unlock Snow at 3 humans, Forest at 5, Forge plus Rails at 7. Preserve district kits and two hub exits; update staging, spawns, HUD counts and browser/geometry fixtures. Validate live core combat, all thresholds and touch movement, then capture/critique/checkpoint.
