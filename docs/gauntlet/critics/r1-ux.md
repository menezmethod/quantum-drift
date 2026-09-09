# R1 independent UX critique

**View-health: 6.4/10. Interface: 6.6/10. Neither passes 8.5.**

Judged against the requested commercial high-end indie bar: combat state must stay readable during play, controls must navigate reliably, and results must lead somewhere useful. The contract’s Nex Machina / Battlerite / WipEout references are quality yardsticks, not claims of equivalence. Baseline is visibly prototype-grade; r1 is a meaningful improvement, not yet a polished release.

| Camera | Inspected result |
|---|---|
| Tactical | Canopy/Glacier desktop are readable; Foundry cover partially hides Nova. Portrait severely reduces lateral awareness and enemy health visibility. |
| Chase | Larger ships, but Foundry central block hides much of Nova and part of Vector. Core occlusion is a P1, owned by parent. |
| Overview | Fits the map; desktop ships are small against fixed-width labels. Touch overview produces roughly 10px ships beneath 128px cards. |
| Isometric | Best staged balance on Canopy/Glacier; hull conditions and protection read clearly. Moving edge/corner cases remain unproven. |

## Priorities

### P1 · UX-01 · Tab in Flight menu opens standings over the menu instead of advancing focus

Gate gameplay shortcuts behind modal ownership. Give menu/help/standings focus entry, Tab containment and focus restoration. Receipt: Resume focused, Tab pressed, menuHidden=false and scoreboardHidden=false; focus remains resume behind overlay.

Source: `src/index.js:243; src/index.js:259; src/index.js:515`. Receipt: [r1-ux-menu-tab-navigation.png](r1-ux-menu-tab-navigation.png).

### P1 · VH-01 · Portrait framing has no satisfactory combat view

Tune portrait camera distance and playable viewport around touch HUD; use compact responsive indicators. Tactical shows only local health and a partially radar-covered enemy with no health; overview shrinks ships to roughly 10px while 128px cards dominate the arena. Verify moving enemies at screen edges and dense combat, not only four staged positions.

Source: `src/view/CameraRig.js:32; src/view/CameraRig.js:46; src/view/ShipIndicators.js:90`. Receipt: [r1-ux-touch-mobile-health.png](r1-ux-touch-mobile-health.png), [r1-ux-touch-mobile-overview.png](r1-ux-touch-mobile-overview.png).

### P1 · UX-02 · Touch vitals overlap the recap footer; gameplay controls remain visually active

Give recap exclusive visual space on touch devices, hide or dim unrelated HUD, and reposition vitals. At 390x844 the hull panel begins around y531 and intrudes into the recap ending around y552.

Source: `src/styles/main.css:814; src/interface/Interface.css:75; src/index.html:106`. Receipt: [r1-ux-touch-mobile-recap.png](r1-ux-touch-mobile-recap.png).

### P1 · VH-02 · Foundry central cover obscures opponents in chase and partially in tactical

Parent/core ownership: implement deliberate cover occlusion treatment or adjust gameplay camera elevation. Keep collision cover honest. In chase, Nova is largely hidden by the central block and Vector is partly hidden; labels cannot replace readable ship silhouettes.

Source: `src/view/CameraRig.js:21; src/core/ArenaRenderer.js:57`. Receipt: [r1-foundry-view-chase-drift.png](../evidence/r1-foundry-view-chase-drift.png), [r1-foundry-arena-tactical-combat.png](../evidence/r1-foundry-arena-tactical-combat.png).

### P2 · VH-03 · Health cards can obscure the aim reticle and combat space

Pass projected aim/reticle bounds into label placement and reserve that area, including leaders. Current above-only placement does not protect an arbitrary mouse target; pointer-events:none preserves input but not visibility. Own receipt places pointer at Nova card center and no reticle is visible there; source confirms canvas reticle is behind DOM and aim is not a placement obstacle.

Source: `src/view/ShipIndicators.js:88; src/view/ShipIndicators.js:94; src/core/ArenaRenderer.js:76; src/core/ArenaRenderer.js:84`. Receipt: [r1-ux-aim-under-health-label.png](r1-ux-aim-under-health-label.png), [r1-ux-touch-mobile-overview.png](r1-ux-touch-mobile-overview.png).

### P2 · UX-03 · Empty records directs players toward practice, which cannot create a record

Keep truthful empty data, but make Play online the primary empty-state action. Explain practice separately. Scope-specific action should use the selected records arena or avoid saying this arena. Live API returned HTTP 200, rows=[], error=null; no fake players were injected.

Source: `src/interface/Interface.js:208; src/interface/Interface.js:293`. Receipt: [r1-ux-live-empty-leaderboard.png](r1-ux-live-empty-leaderboard.png).

### P2 · UX-04 · Recap is a ten-second stats sheet with no direct records or review action

Add direct records access and a way to review the previous round after next launch; present result and key stats before the eight equal-weight metrics. Own DOM receipt contains zero recap buttons. Ten-second automatic reset is source-confirmed; natural online round completion was not exercised.

Source: `src/interface/Interface.js:338; shared/simulation.js:642`. Receipt: [r1-foundry-ui-tactical-recap.png](../evidence/r1-foundry-ui-tactical-recap.png), [r1-ux-touch-mobile-recap.png](r1-ux-touch-mobile-recap.png).

## What to retain

The readable percentages, damaged/critical colors, YOU marker and separate protection status are a substantial advance over baseline. The desktop lobby has coherent destination cards and selected states. The live records dialog honestly shows no rows; its ArrowRight scope change and Escape/focus restoration worked. Preserve these improvements while fixing navigation and combat hierarchy.

## Evidence and limits

Inspected four baseline PNGs and ten r1 PNGs with image tools, including r1-glacier-health.png. Then captured and visually inspected six independent PNGs serially after matrix PID 49459 exited. Own captured errors: zero; supplied matrix JSON reports zero console/page errors. No native-GPU performance claim. Touch receipts use 390×844 with isMobile/hasTouch; the supplied mobile matrix did not.

The empty leaderboard is live HTTP 200 with rows=[], error=null, without seeded ranking data. Recap uses the actual showcase → Simulation.endRound → UI path, with staged stats; natural online completion/persistence was not exercised. All four cameras were inspected, but not every camera/map/moving-boundary combination. These limits prevent a release pass even aside from the reproduced defects.

No production edits, build, restart, or matrix rerun. Only this report, the JSON, and six own evidence PNGs were written.

Refinement order: fix modal Tab ownership and touch recap overlap first; address portrait framing/compact labels in parallel with the parent’s core occlusion work; then protect aim visibility and improve empty-state/recap actions. Recheck those targeted flows before rescoring.
