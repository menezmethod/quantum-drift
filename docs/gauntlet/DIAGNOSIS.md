# Baseline diagnosis / 2026-09-06

Inspected baseline-chase-day.png, baseline-health-night.png and baseline-isometric-dusk.png in docs/gauntlet/evidence before core edits. Requested lighting variants are not implemented: time-of-day is currently a no-op. Static showcase health is synthetic diagnostic data, not match history.

The arena is a geometry demonstration: unrelated candy-colored spheres/cylinders, translucent cover with no material hierarchy, a flat infinite-looking grid, no environment narrative. Silhouettes do not identify routes or decisions. Fine grid lines and bright cover compete with small ships. In chase view the whole battle rotates with heading; overview shrinks combatants; isometric wastes top screen on void. Names disappear in geometry and no overhead health or protection is available. Results end with a winner name; there is nothing to retain, compare or improve next match. There are no before/after claims yet.

Baseline receipts: 18.9–23.4 FPS, 101–107 draw calls, 121792–122832 triangles, zero runtime errors on headless Chrome SwiftShader. These are software rendering comparisons, not a hardware FPS benchmark.

## Roadmap and taste bar

1. View / health: stable north-oriented tactical follow, velocity and aim lookahead without camera spin, deliberate zoom, bounded edges, legible identity and segmented hull bars. Inspired by Battlerite recognition over HUD hunting.
2. Maps: Foundry (hot industrial ring/lanes), Canopy (garden flanks and open court), Glacier (cold relay crossfire). Cover must match physics. Verify connected movement grids, multiple routes, spawns, combat activity.
3. World: material/light hierarchy, architecture and recognizable landmarks, low noisy geometry, focal center with quiet combat floor. WipEout-style industrial clarity; peripheral spectacle must not become fake blockers.
4. Competitive loop: persistent server-owned profile history, per-map boards, round recap, damage/accuracy/score/XP, readable next-round transition. Never present bots or showcase numbers as real rankings.
5. Effects: distinct projectile silhouettes/trails, readable ground telegraphs, contained impacts, directional drift wake and restrained energy spectacle. Nex Machina-style hierarchy is an aspiration, not proof of parity.

## References

- https://housemarque.com/games/nexmachina
- https://www.playstation.com/en-us/games/wipeout-omega-collection/
- https://arena.battlerite.com/

## Gate

Independent critics inspect running captures and telemetry, grade 0–10, flag exact defects. 8.5 is required, not promised. Parent owns core integration; module builders cannot grade themselves. Lowest score drives the next round; regressions reopen passed areas.
