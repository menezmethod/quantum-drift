# SaucerJam — Incremental roadmap

Updated 13 September 2026.

## Direction

Gameplay -> deeper fights -> scale -> beautiful game.

Preserve the released movement, independent aiming, stable overhead view, weapon economy, and intense fighting pockets. Build ONE connected world with variable population boundaries; do not fragment players across unnecessary selectable arenas.

## Current product goal

**Make a 128-player SaucerJam battle genuinely fun and stable.**

Do not jump directly to "thousands." The distributed-world architecture becomes worthwhile only after:
- 128 players are measured and stable;
- players actually want larger battles;
- we understand the real bottleneck from production telemetry.

Scale progression:

`8 -> 32 -> 64 -> 128 -> demand validation -> distributed-world research`

## Scale workstream

Before increasing hard caps, measure:
- authoritative simulation tick time
- CPU/memory per active player
- outgoing/incoming bandwidth per player
- snapshot size and frequency
- projectile/collision cost
- client render cost with many visible players
- latency / packet loss behavior
- reconnect behavior under load

Likely optimizations toward 128:
1. spatial interest management
2. compact/delta replication
3. object pooling and projectile budgets
4. simulation profiling and hot-path cleanup
5. bot-driven reproducible load tests

If demand later justifies thousands, research:
- authoritative simulation cells
- seamless cell handoff
- hierarchical interest management
- server-to-server state transfer
- geographically distributed world regions

## Gameplay roadmap

| Order | Deliverable | Why |
| --- | --- | --- |
| 1 | Refine Confluence cover/collision | Fighting must feel trustworthy |
| 2 | Combat readability fixes from real play | Preserve simple, readable chaos |
| 3 | Energy + instant-health pickups | Creates contested locations |
| 4 | Portal shortcut | Enables pursuit/escapes |
| 5 | Temporary shield pickup | Adds tactical timing |
| 6 | Team colors + team spawns + TDM | Large battles need coordination |
| 7 | Capture-the-core | Gives factions a reason to collide |
| 8 | 32-player measured test | First real scale milestone |
| 9 | 64-player Jam Night | Match the classic large-battle feeling |
| 10 | 128-player Big Jam | Current scale target |
| 11 | Original signature ships/landmarks/audio | Build SaucerJam's own identity |
| 12 | Distributed-world research | Only if player demand earns it |

## World foundation

Confluence is one connected world containing multiple districts. Territory expands with human population so a small lobby remains dense while a large lobby gains room to breathe.

Future expansion should be **population-driven**, not map-menu-driven.

The map itself becomes part of SaucerJam's identity:
- low population = tight fight
- medium population = districts open
- high population = full battlefield
- future scale = more territory/cells open as population requires it

## Art direction

Temporary clean licensed assets are acceptable for prototyping.

Signature SaucerJam ships, landmarks, factions, and collectibles should become original work with tracked provenance.

Art follows gameplay. Do not spend heavily on assets for systems/maps that may be discarded.

## Community evolution

Long-term feature loop:

`Idea -> Discussion -> RFC -> Prototype -> Playtest -> Vote/feedback -> Maintainer decision -> Canonical release`

Community voting guides priority; it does not bypass performance, security, moderation, or IP review.

## North star

> **128 players first. Thousands only when players give us a reason to solve thousands.**
