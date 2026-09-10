# Confluence release review — 1.2.0

Scope: replace the separate-map product direction with one connected world. Parent implementation review, not an independent critic score or a claim of finished art.

Before: `../junction-review/junction-overview.png` and `junction-action.png` document the separately selected 60×60 Junction release. After: `whole-world.png` shows the connected 120×120 map; `core-online.png`, `forest.png`, `rails.png`, and `ice.png` show playable district framing. These are different scenarios, not a controlled visual-quality benchmark.

The industrial core retains compact offset cover. Two crossings per shared district border provide alternatives to a single choke. Forest planters, rail platforms, and ice baffles use existing art; this is a layout milestone. Locked districts have solid deck geometry matching collision and are excluded from spawn candidates. Client and server share each authoritative territory variant.

Verification:
- 80 automated tests pass, including connected movement space in every stage, solid closed districts, projectile gating, human-only delayed expansion, safe round reset, and full-world practice.
- Full native browser suite passes: multiplayer damage/death/respawn, grenade damage, bank-shot kill damage, mouse aiming, cameras, reconnection, 120 ms simulated latency, pause/resume, and mobile fallback.
- `verification.json`: two independent native Chrome browsers plus five Socket.IO clients; both receive expansion and reset. Real keyboard/mouse movement and weapon energy checked. Capture positions are staged server-side to inspect each district; this is not a human play session.
- Desktop capture samples approximately 60 FPS, 37–94 draw calls; the 390px mobile viewport is emulated on the same desktop GPU, not a mobile-hardware benchmark. No page exceptions.
- `bot-probe.json`: 30 simulated seconds each at stages 0 and 3 with four bots; zero invalid positions and damage in both. Local CPU timings are not production capacity estimates.

Open: human encounter-density and threshold tuning, spawn fairness across open districts, bespoke biome art/landmarks, and long-session/low-end performance. No 8.5/10 commercial-polish claim. Next release should refine this world's cover and crossings from actual play, not add another map.

The user deleted the previous schedule. No automation was created or resumed.
