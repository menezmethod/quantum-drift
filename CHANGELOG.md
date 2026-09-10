# Changelog

## 1.2.0 — 2026-09-09

- Replaced public map selection and rotation with Confluence: one connected 120×120 world with industrial, forest, rail, and ice districts.
- Preserved tight core combat; connected districts have two border crossings for flanks.
- Server-authoritative territory unlocks at 3/5/7 humans after five seconds. Bots do not unlock territory; shrinking waits until safe round respawn.
- Practice exposes all four districts. District status appears in the HUD. Current movement, camera, and weapon economy are unchanged.
- Verified 80 tests, two native browser clients plus five sockets, synchronized expansion/reset, weapon energy, and mobile practice. Bespoke art and human population-balance tuning remain future work.

## 1.1.0 — 2026-09-09

- Added Junction, an optional close-quarters map using existing Foundry art: offset central cover, side fighting pockets, and clear flanking routes. Select it explicitly; existing default map rotation is unchanged.
- Added a usage-aware mini-release workflow and reproducible runtime packaging.
- Verified 75 tests, connected movement space and spawn exits, 2/4/8-bot comparisons, and independent native-browser two-client selection/replication.
- Critic approved an opt-in first iteration. Human balance, grenade escape playtesting, and low-end performance remain open; this is not the final art/WOW milestone.

## 1.0.0 — 2026-09-09

First playable release of the rebuilt Quantum Drift.

- Four arenas, stable overhead camera, screen-relative movement and independent aiming.
- Authoritative multiplayer for up to eight players per room, private invites, bot fill, and reconnect recovery.
- Laser bursts cost 25 energy; long ricochet bolts cost 50; grenades cost 100, travel at most 20 meters, and allow one active grenade per pilot. Shared energy regenerates at 24/second.
- Grenade blast cover, stronger explosion flashes, overhead hull indicators, match recaps, and persistent pilot records.
- Single Node server and multi-architecture Dockerfile; configurable room/connection admission limits.

Known limits: room state is in memory, deployments interrupt matches, pilot identities are browser-local, and rankings require a persistent single-writer volume. Cosmetic overlap around cover remains under investigation. Portals, pickups, and larger arenas are planned for later releases.
