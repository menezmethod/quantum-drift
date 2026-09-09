# Changelog

## 1.0.0 — 2026-09-09

First playable release of the rebuilt Quantum Drift.

- Four arenas, stable overhead camera, screen-relative movement and independent aiming.
- Authoritative multiplayer for up to eight players per room, private invites, bot fill, and reconnect recovery.
- Laser bursts cost 25 energy; long ricochet bolts cost 50; grenades cost 100, travel at most 20 meters, and allow one active grenade per pilot. Shared energy regenerates at 24/second.
- Grenade blast cover, stronger explosion flashes, overhead hull indicators, match recaps, and persistent pilot records.
- Single Node server and multi-architecture Dockerfile; configurable room/connection admission limits.

Known limits: room state is in memory, deployments interrupt matches, pilot identities are browser-local, and rankings require a persistent single-writer volume. Cosmetic overlap around cover remains under investigation. Portals, pickups, and larger arenas are planned for later releases.
