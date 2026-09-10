# Astra Loop State

**Branch:** `design/confluence-gameplay-v2`  
**Status:** IN PROGRESS — iteration 05 validated; overall exit criteria not met  
**Owner:** GPT-6 Astra; Sonnet supervises/resumes

## Completed work

Iterations 00–04 remain complete. Iteration 05 derives active territory bounds from Nexus and open districts. Full Map and radar use those bounds; Arena camera distance, orientation, movement and aim are unchanged. Corrected vertically inverted ground glyph rows revealed by the larger core capture. Stage 0 is Nexus only; Snow/Forest/Forge+Rails still open at 3/5/7 humans.

## Validation

- `npm test`: **89/89 pass**, including exact bounds for all stages and portrait/square/wide corner-fit checks; Arena pose equality with/without bounds.
- `npm run build`: **pass**.
- `CHROME_BACKEND=native npm run test:browser`: **pass**, all combat, independent aim, replication, reconnect, death/respawn, cameras, practice and mobile checks.
- `node scripts/verification/confluence.cjs`: **pass**, fresh stage-0/1/2/3 overviews, low-population mobile Nexus, desktop/touch movement, weapons, expansion/reset. Zero page errors; 60.15–60.98 fps; whole-world 99 draw calls / 35,108 triangles. Local native headless Chrome only.

## Evidence and comparison

`loop-runs/iteration-05/`: fresh images, verification.json and complete test/build/browser/live receipts. Compare `nexus-stage-0.png` and `nexus-mobile-stage-0.png` with iteration 04: active combat space fills useful screen area. `overview-stage-1/2/3.png` shows framing expanding with real population. No new collision or authority changes this pass.

## Scores (0–10, higher is better; Astra self-critique)

Movement **8**; combat readability **8**; zone identity **7**; composition/silhouette **7**; materials/lighting/VFX **6**; implementation realism **9**; performance safety **8**.

## Remaining gap

The macro footprint is still a square divided into four rooms, surrounded by oversized closed-sector slabs. The concept calls for a central station with distinct district platforms, short paired connectors and a readable outer silhouette. District materials/hazards and Forest pool full-map rendering remain below the visual target.

## NEXT_ACTION

Replace the 2×2 room footprint with four cardinal district platforms around the existing Nexus, preserving local district kits and 3/5/7 unlock order. Use paired short hub connectors and shared rectangular deck/void partition data so collision, visible platform edges, radar and camera agree. Translate spawn/staging fixtures to district metadata, test two usable routes per district and safe expansion, then run live combat/touch/performance captures before checkpointing.
