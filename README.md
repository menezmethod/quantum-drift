# Quantum Drift

Spaceship arena combat with drift movement, independent mouse aim, and authoritative multiplayer. Four selectable arenas, four camera views, overhead hull/protection indicators, bot practice, private rooms, persistent pilot records, and match recaps. The original arena and three weapon systems remain playable.

## Play

Install Node.js 20 or newer, then run from this directory:

```sh
npm ci
npm start
```

Open **http://localhost:8080**. `npm start` builds the client and starts the server. The same process serves both the game and multiplayer. No second installation or server is required.

- **Practice with bots** starts immediately and runs locally in your browser. Once loaded, practice does not need a network connection. Menu pauses practice.
- **Play online** joins a public arena. Bots fill vacant seats up to four pilots and leave as humans join.
- **Create room** gives you a private room code. Turn off bot fill for human-only matches.
- **Copy invite** copies a link for friends. They enter a callsign and press Join. Up to eight humans fit in a room.
- Rounds end after 20 eliminations or five minutes. The next round starts automatically after ten seconds.

For another computer on your LAN, open the **LAN play** address printed by the server (for example `http://192.168.0.9:8080`). Create/copy the invite from that address so friends get a reachable link; `localhost` always means their own computer. Allow incoming connections to the chosen port if your firewall prompts.

For friends outside your LAN, run the same server on a reachable host or use a shared private network such as Tailscale. The production deployment uses Coolify; see [hosting and operations](docs/HOSTING.md). Serve it through HTTPS for public browser access and clipboard support. Active rooms are in memory. An intentional last-human exit closes the room; transport loss keeps it paused for 30 seconds so automatic reconnect can recover it. Completed online round results persist in `server/data/rankings.json` (override with `RANKINGS_FILE`). Rejoining an active round under the same browser pilot identity preserves its combat resources, death timers and performance counters. If everyone disconnected and the room closed, create a new one.

## v1.0 release

Browser arena shooter with one connected, expanding world, bot practice, private invites, and server-authoritative multiplayer. Download a ready-built Node server from [GitHub Releases](https://github.com/menezmethod/quantum-drift/releases). Extract it, run `npm ci --omit=dev`, then `npm run serve`. Node.js 20+ is required; there is no native desktop installer.

See [release notes](CHANGELOG.md), [hosting](docs/HOSTING.md), and the [next milestones](docs/ROADMAP.md).

## Controls

| Input | Action |
| --- | --- |
| W / S, up / down | Move up / down the screen |
| A / D, left / right | Move left / right on screen |
| Q / E | Alternative left / right movement |
| Mouse | Aim independently of movement |
| Hold left click or Space | Fire selected weapon |
| 1 / 2 / 3 | Laser / grenade / ricochet |
| X | Cycle weapon |
| V | Arena / full-map toggle (other views in Flight menu) |
| M | Toggle radar |
| Tab | Toggle scoreboard |
| C | Controls and weapon guide |
| Escape | Flight menu |

Touch screens get directional movement and fire buttons. Aim by touching the arena; without a target, fire follows the last movement direction. Keyboard and mouse give the most precise control.

## Combat

- **Laser:** 24 damage, 0.25-second cooldown, 25 energy. Stopped by cover.
- **Grenade:** arcs to your cursor, at most 20 meters, then explodes after 0.85 seconds. Up to 80 damage with distance falloff in a five-meter radius; 100 energy; one active grenade per pilot. Cover blocks the blast. Self-damage is halved.
- **Ricochet:** 34 damage, 0.5-second cooldown, 50 energy. Reflects off cover and arena edges up to three times; expires after three seconds.
- A full capacitor supports four laser shots (up to five during continuous recharge), two ricochets, or one grenade. Switching weapons shares the same energy pool. Energy recharges at 24/second (about 4.2 seconds from empty to full). Hull repairs at 4/second after five seconds without damage.
- Destruction respawns you after three seconds in a clear position away from other ships. Spawn protection lasts 1.5 seconds and ends when you fire.

## Development and verification

```sh
npm run dev          # Client rebuilds on :8080, server on :3000 through a proxy
npm run build        # Production client in dist/
npm run serve        # Serve an existing build on :8080
npm test             # Simulation and real Socket.IO integration tests
npm run test:browser # Production-browser end-to-end tests; run build first
```

The browser suite uses installed Google Chrome on macOS, `CHROME_PATH` when provided, or Playwright Chromium (`npx playwright install chromium`). It tests independent clients, room invites, replicated controls, all three weapons, death/respawn, cameras, network loss/reconnect, practice, mobile layout, and asset-independent procedural ships. Screenshots go in `test-results/`.

Production container:

```sh
docker compose up --build -d
```

The container serves everything on port 8080 and keeps completed results in the named `rankings` volume. Override `PORT` for a direct Node deployment. If you intentionally host the frontend separately, set `CLIENT_URL` to the allowed frontend origin(s), comma-separated, and proxy `/socket.io/` to this server. The default same-origin setup needs no CORS configuration.

## Engine

- `shared/simulation.js`: one fixed-step 60 Hz simulation for server and practice. Owns movement, map collision, swept projectile hits, grenade blast damage, energy, bots, safe spawns, and rounds.
- `server/server.js`: room lifecycle, input validation/rate limits, server stepping, and 20 Hz state snapshots. Clients cannot submit health, damage, projectile speed, or positions.
- `src/index.js`: controls, lobby/HUD, predicted movement with acknowledged-input replay, remote interpolation, audio, and reconnect handling.
- `src/core/ArenaRenderer.js`: Three.js rendering, procedural ships, integrated environment/camera modules, targeting, and bounded transient effects.

Multiplayer is designed for a single server process. Pilot identity is a random token retained in browser storage; clearing it creates a new pilot. Records are scoped to one server and are not authenticated cross-device accounts. Horizontal scaling and cross-region matchmaking are not implemented.

## Arenas and pilot records

Confluence is one 120×120 world: a tight industrial core, forest biodome, orbital rail yard, and frozen relay. Online play starts in the core; 3, 5, and 7 connected humans unlock additional districts after five seconds. Bots do not expand the map. Open territory remains available until the next round, when everyone safely respawns within the new population boundary. Practice opens the entire world immediately. Two crossings on each district border provide flanking routes. Previous maps remain only as internal regression fixtures; public matches no longer rotate between arenas.

Arena is the default overhead camera with a fixed angle and distance, smooth ship tracking, and no cursor-driven movement. V toggles Arena / full map. Chase, isometric, and zoom remain under Advanced camera views in Flight menu. Portrait framing preserves a useful lateral view. Overhead segments show actual hull; PROTECTED means temporary spawn protection, not energy.

Pilot records include lifetime and per-map score, wins, kills/deaths, damage, accuracy, XP, and level. Match recaps separate practice results from saved online rounds. Score is 100 per kill, one point per five damage, minus 25 per death, plus 250 for the round winner (minimum zero). XP is 25 participation, 40 per kill, one per ten damage, and 150 for a win. Level is `1 + floor(sqrt(totalXP / 250))`. Bots never enter persistent leaderboards.

## Visual Gauntlet

`npm run test:browser` verifies combat, cameras, reconnect and mobile practice. `node scripts/verification/confluence.cjs` checks two browsers, seven connected pilots, and synchronized expansion/reset; receipts are in `docs/gauntlet/confluence/`. Historical tooling: `node scripts/verification/matrix.cjs r1` captures a serial map/view/light/state matrix. `npm run capture -- --map foundry --camera tactical --time dusk --state combat --out test-results/capture` captures one scene. These staged diagnostics require `?showcase`; their synthetic counters never become online records. PNGs and JSON telemetry live in `docs/gauntlet/evidence/`; independent evaluations and unresolved defects are tracked in `docs/STATUS.json`. Headless SwiftShader FPS is a regression measure, not a native GPU benchmark.

Capacity defaults to eight rooms (up to eight humans each) and 96 connected sockets. These are protective admission limits, not a measured 64-player performance guarantee. Configure `MAX_ROOMS` and `MAX_CONNECTIONS` only after load testing your host.

## Junction mini-release (v1.1.0)

Select Junction for offset central cover, tight side pockets, and quick flanks using the existing Foundry art. It is optional and does not alter the original rotation. See [release loop](docs/RELEASE-LOOP.md) for incremental delivery and [critic evidence](docs/gauntlet/junction-review/REVIEW.md) for the limits of the first review.
