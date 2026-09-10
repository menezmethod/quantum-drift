# Quantum Drift — Incremental roadmap

Updated 9 September 2026. This delivery order supersedes the sequence in COMBAT-FIRST-PLAN.md; that document remains the longer-term design reference.

## Direction

Gameplay → deeper fights → beautiful game. Preserve the released movement, independent aiming, stable overhead view, weapon economy, and intense fighting pockets. Build ONE connected world with variable population boundaries; do not add selectable arenas.

Build on the current stack. One bounded enhancement per cycle. Original Blender assets and major visual redevelopment come last, after layouts and systems earn their place. Confluence is implemented in v1.2.0. Continue only on user request; the previous schedule was deleted.

## Priority by value, effort, and dependencies

Effort is relative total work, including verification; these are not time or token guarantees. S = localized change; M = several connected pieces; L = simulation, presentation, and network integration. Split L work before implementation.

| Order | Deliverable | Effort | Why this comes here | Ownership |
| --- | --- | --- | --- | --- |
| 1 | Delivered: Confluence connected world and population gates | S–M | High gameplay payoff with little engine risk | Astra sets layout; Cursor implements map data |
| 2 | Refine that map’s obstacles and correct reproduced collision/visibility defects | S–M; larger if networking is involved | Makes cover trustworthy and fights intentional | Cursor handles placement; Astra diagnoses shared collision/prediction problems |
| 3 | Small combat-readability improvements identified during play | S each | Cheap targeted improvements; no speculative HUD redesign | Cursor implements one specific issue per task |
| 4 | Energy and instant-health pickups | M | Gives players reasons to contest locations | Astra defines authoritative rules; Cursor builds visuals/HUD |
| 5 | One paired portal shortcut | M–L | Adds pursuit and escapes after map flow is understood | Astra owns teleport/network behavior; Cursor builds presentation |
| 6 | Temporary shield pickup | M | Reuses pickup system but changes damage rules | Astra owns balance/damage contract; Cursor implements indicators |
| 7 | Team colors, team-aware spawns, team deathmatch | L, split into small steps | Adds coordination without objective complexity | Astra owns team rules; delegate UI and fixtures |
| 8 | District refinement and private-match options | S–M per piece | Reuses proven systems and lessons | Cursor implements scoped map/settings work |
| 9 | Capture-the-core | L | Requires reliable teams, spawns, scoring, and portal policy | Astra designs/integrates; delegate bounded components |
| 10 | Original Blender ships, cover kit, landmarks, lighting, richer sound | M–L, asset by asset | Beautifies proven gameplay without wasting art on discarded layouts | Astra art direction/acceptance; Blender-capable agent produces assets |

Reorder when play reveals a higher-value defect. Collision bugs that undermine fighting are fixed immediately, not deferred behind a feature. Pickups come before portals because they establish reusable state and contested routes; the portal slot can move earlier if its bounded prototype is demonstrably cheaper and more valuable.

Optional later experiments: limited-shot ricochet overcharge and one machinery interaction. Neither is required for the game’s identity. Drop machinery if it distracts from fighting.

## Delivered world foundation — v1.2.0

One 120×120 world containing four 60×60 districts. Industrial core remains open; forest, rails, and ice unlock at 3/5/7 humans after five seconds. Bots do not trigger expansion. Territory closes only at round reset. Practice opens everything. Two crossings per adjacent border preserve flanking routes.

Next small release: playtest the core and district crossings with humans, then refine cover density and escape routes. Do not introduce another map. Thresholds are provisional balance settings, not a claim that eight players fill every district equally well.

Then add contested energy/health pickups, one portal pair, shields, teams, and game modes one verified release at a time. Bespoke Blender landmarks and ships come after the combat layout is proven. Machinery must intensify fights to justify inclusion.
