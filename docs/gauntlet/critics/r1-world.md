# Independent r1 world / maps / effects critique

**FAIL against 8.5. Maps 7.0/10; world 6.4/10; effects 5.8/10.**

High-end indie 8.5 threshold, using contract references Nex Machina for combat hierarchy, WipEout for industrial art direction and Battlerite for competitive readability as qualitative yardsticks. No claim of direct side-by-side equivalence or city-scale world content. Scores assess integrated r1 images, not improvement alone.

The baseline is a sparse grid with colored primitive cover. R1 adds authored palettes, readable solid cover, a forge, greenhouse arches, foliage and a relay dish. That is a substantial improvement, but improvement does not make the result high-end indie quality.

- **Maps: 7.0/10.** Sound deterministic connected geometry and distinct central tactics; sparse mirrored layouts and insufficient play/occlusion evidence fall short of polished competitive arena design.
- **World: 6.4/10.** Large improvement from colored primitives, with coherent palettes and recognizable peripheral landmarks; flat materials, repeated kit parts and detached scenery fall short of a high-end indie finish.
- **Effects: 5.8/10.** Basic weapon colors, trails, shield and blast telegraph exist, but differentiation, visual impact and verified event presentation remain weak.

## Prioritized defects

### P1 W1: Environment surfaces lack grounding and material separation

Large flat floor patches, bright ungrounded cover roofs and black inset faces read as assembled primitives. Glacier baffles resemble white equipment blocks more than snow/ice; the same vented box and slotted cylinder language crosses themes. Ships have blob shadows while cover lacks comparable contact grounding.

**Action:** Add inexpensive contact shading at cover feet, restrained bevel/edge highlights, and distinct ice, botanical and industrial surface treatment. Break up broad district rectangles without increasing floor contrast. Keep exact collision footprints.

**Acceptance:** At tactical scale, identify each theme without the background; cover feet read clearly and ships/projectiles remain the first focus.

Source: src/world/World.js:209, src/world/World.js:261, src/world/World.js:522.

Evidence: r1-glacier-health.png, r1-foundry-tactical.png, r1-canopy-arena-tactical-drift.png.

### P1 W2: Effects are weakly differentiated and threat rings compete with floor ornament

Laser and ricochet use the same stretched sphere silhouette with color as their primary distinction. A thin amber grenade ring overlaps a similarly scaled central decorative circle, making urgency ambiguous. The independently inspected effects frame is dominated by circles and small projectile slivers, with little visible impact presence. Fire is a floor ring; impacts/bounces/spawns share a radial particle recipe.

**Action:** Give laser a directional beam/core, ricochet a distinct shape and contact-normal bounce flash, and grenade a legible timing progression plus brief impact core. Reduce decorative circle salience near combat and add a controlled contrast outline to danger markers.

**Acceptance:** Identify weapon and impending blast in grayscale tactical captures; inspect timed fire, bounce, hit and explosion phases in open space, including night.

Source: src/core/CombatFX.js:22, src/core/CombatFX.js:51, src/core/ArenaRenderer.js:72.

Evidence: r1-glacier-arena-tactical-combat.png, r1-foundry-effects-tactical-combat.png, /tmp/qd-r1-world-critic-glacier-effects.png.

### P1 W3: Canonical Foundry FX fixture hides the event inside solid cover

Foundry forge occupies x/z [-4,4]. The staged grenade is (-3,3), its target and repeated explosion are (-3,1), inside that solid footprint. The forge occludes much of the showcase. This is a verification defect, not proof live explosions always spawn inside cover.

**Action:** Place fixture projectiles and explosion on validated free floor per map; capture deterministic onset, peak and decay frames plus a real collision/bounce sequence.

**Acceptance:** Every staged projectile starts outside cover and the full blast is visible in at least one inspected receipt.

Source: src/index.js:119, src/index.js:628, shared/maps/index.js:23.

Evidence: r1-foundry-effects-tactical-combat.png.

### P1 W4: Canopy submits disproportionate geometry for modest visible detail

Serial tactical Canopy receipt submits 105180 triangles versus Foundry 16732 and Glacier 13886; even world-only Canopy submits 98700. Current source geometry test counts 27132 for Canopy, which does not reconcile with runtime receipts. Treat runtime submissions as authoritative evidence, and investigate counting/bundling/culling rather than claiming a specific cause.

**Action:** Profile actual instance submissions, especially tree branches and foliage; simplify repetitive meshes and cull peripheral clusters. Reconcile source and browser geometry totals before claiming the budget is fixed.

**Acceptance:** Fresh isolated canonical receipts show a justified geometry budget and improved frame time without loss of tactical readability; verify on native GPU separately.

Source: src/world/World.js:408, src/world/World.js:442.

Evidence: r1-canopy-arena-tactical-drift.json, r1-canopy-world.json, r1-mobile-health.json.

### P2 W5: Symmetric layouts have limited local identity and peripheral structure

Foundry has a useful central LOS blocker, Canopy an open court and Glacier long crossfire axes. However repeated mirrored cover and broad empty perimeter lanes provide few distinctive local landmarks or changes of rhythm. World views read as square display platforms with rows of detached scenery; Canopy trees repeat almost the same crown silhouette.

**Action:** Keep collision fairness but vary local visual landmarks and cover dressing; use restrained route markings and connected peripheral structures. Validate whether broad perimeter lanes need additional meaningful cover with actual play sessions.

**Acceptance:** Players can name and recognize distinct routes from tactical views; demonstrate meaningful flank choices and balanced spawns through play evidence, not symmetry alone.

Source: shared/maps/index.js:19, shared/maps/index.js:44, shared/maps/index.js:70.

Evidence: r1-canopy-world.png, r1-foundry-world-isometric-damaged.png.

### P2 W6: Tall Foundry cover obscures ships and portrait framing loses combat context

The central forge partly hides Nova in tactical and hides substantial ship silhouettes in chase. Labels remain visible but cannot communicate precise hull position or aim. Portrait Canopy crops most of the arena and places a remote ship behind the minimap.

**Action:** Add a restrained occluded-ship silhouette/ground locator and adjust chase/portrait framing to retain a useful threat radius. Coordinate with view owner rather than changing map colliders to solve projection.

**Acceptance:** Move behind the forge and around portrait frame edges; ship location and nearby threats remain understandable without relying solely on the minimap.

Source: src/core/ArenaRenderer.js:59, src/view/CameraRig.js.

Evidence: r1-foundry-view-chase-drift.png, r1-foundry-tactical.png, r1-mobile-health.png.

### P2 W7: Projectile trail density depends on render rate

The trail gate reads shot._trailAt but never updates it; after the initial 0.01 seconds it emits once per update. Consequently trail density varies with FPS and a fixed particle cap can drop other effects sooner at high render rates. This is code-derived; still screenshots cannot establish the perceived motion difference.

**Action:** Track emission time or distance per projectile ID, with cleanup on removal, and verify the same trajectory at different frame rates.

**Acceptance:** Comparable trail length/density at 30 and 60 FPS; simultaneous explosions remain legible under the particle cap.

Source: src/core/CombatFX.js:55.

Evidence: /tmp/qd-r1-world-critic-glacier-effects.json.

## Collision and verification

23/23 existing map/world tests passed. Read shared/simulation.js blocked/traceWalls and World.cover. Primary render bounds match shared obstacle footprints, and boundary rails start outside the playable edge. Existing tests passed for exact primary cover, four-unit new-map corridors and spawn connectivity. This checks primary bounds, not every cosmetic vertex, all live collision contacts, camera occlusion or sustained multiplayer balance. No demonstrated primary collider mismatch in the new maps.

## Screenshot and console/performance receipts

Observed matrix PID 49459 running; repeated ps check showed no node scripts/verification/matrix or capture process before launching own capture. Own capture used capture.cjs against localhost:8080. PNG/JSON stored in /tmp to honor report-only repository writes. User reported concurrent ephemeral-server regression suite: own timing is informational only and not used for FPS comparison.

Independent [screenshot](/tmp/qd-r1-world-critic-glacier-effects.png) and [JSON receipt](/tmp/qd-r1-world-critic-glacier-effects.json): console errors 0, page errors 0, failed requests 0; 57 draw calls; 15294 triangles; 21.00 FPS and p95 66.7 ms. Timing may overlap the regression suite; do not compare its FPS. Full receipt is embedded in r1-world.json.

**Software SwiftShader, not native GPU.** All browser performance receipts use software SwiftShader, NOT native GPU. Canonical matrix is serial per user; different states/content mean no controlled map-only causal benchmark. No native-GPU frame-rate claim.

Canonical serial tactical receipts: Canopy 105,180 triangles / 52 calls / 21.20 FPS; Foundry 16,732 / 52 / 31.66; Glacier 13,886 / 55 / 31.08. These flag a Canopy budget concern, not proof of its precise bottleneck. All r1 JSON error arrays inspected were empty.

Inspected with image tools:

- [baseline.png](../evidence/baseline.png)
- [baseline-chase-day.png](../evidence/baseline-chase-day.png)
- [baseline-health-night.png](../evidence/baseline-health-night.png)
- [r1-foundry-tactical.png](../evidence/r1-foundry-tactical.png)
- [r1-canopy-world.png](../evidence/r1-canopy-world.png)
- [r1-glacier-health.png](../evidence/r1-glacier-health.png)
- [r1-canopy-arena-tactical-drift.png](../evidence/r1-canopy-arena-tactical-drift.png)
- [r1-glacier-arena-tactical-combat.png](../evidence/r1-glacier-arena-tactical-combat.png)
- [r1-foundry-effects-tactical-combat.png](../evidence/r1-foundry-effects-tactical-combat.png)
- [r1-foundry-view-chase-drift.png](../evidence/r1-foundry-view-chase-drift.png)
- [r1-foundry-world-isometric-damaged.png](../evidence/r1-foundry-world-isometric-damaged.png)
- [r1-mobile-health.png](../evidence/r1-mobile-health.png)

## Limits

- Static showcase plus source review, not a full live-match motion/audio assessment.
- Own effects frame does not capture a guaranteed explosion peak; phase-specific follow-up evidence is required.
- Source Canopy geometry and integrated runtime triangle counts differ; cause unverified.

No production files edited. Only the requested two reports were written inside the repository; independent capture artifacts are in /tmp.
