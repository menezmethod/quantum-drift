# Quantum Drift — Incremental roadmap

Updated 9 September 2026. This delivery order supersedes the sequence in COMBAT-FIRST-PLAN.md; that document remains the longer-term design reference.

## Direction

Gameplay → deeper fights → beautiful game. Preserve the released movement, independent aiming, stable overhead view, weapon economy, and existing maps. The current tight-map experience is a strength, not something to replace with a vast arena.

Build on the current stack. One bounded enhancement per cycle. Original Blender assets and major visual redevelopment come last, after layouts and systems earn their place. This document is planning; no agents have been dispatched and no gameplay has been changed by this update.

## Priority by value, effort, and dependencies

Effort is relative total work, including verification; these are not time or token guarantees. S = localized change; M = several connected pieces; L = simulation, presentation, and network integration. Split L work before implementation.

| Order | Deliverable | Effort | Why this comes here | Ownership |
| --- | --- | --- | --- | --- |
| 1 | One new map using existing geometry and materials | S–M | High gameplay payoff with little engine risk | Astra sets layout; Cursor implements map data |
| 2 | Refine that map’s obstacles and correct reproduced collision/visibility defects | S–M; larger if networking is involved | Makes cover trustworthy and fights intentional | Cursor handles placement; Astra diagnoses shared collision/prediction problems |
| 3 | Small combat-readability improvements identified during play | S each | Cheap targeted improvements; no speculative HUD redesign | Cursor implements one specific issue per task |
| 4 | Energy and instant-health pickups | M | Gives players reasons to contest locations | Astra defines authoritative rules; Cursor builds visuals/HUD |
| 5 | One paired portal shortcut | M–L | Adds pursuit and escapes after map flow is understood | Astra owns teleport/network behavior; Cursor builds presentation |
| 6 | Temporary shield pickup | M | Reuses pickup system but changes damage rules | Astra owns balance/damage contract; Cursor implements indicators |
| 7 | Team colors, team-aware spawns, team deathmatch | L, split into small steps | Adds coordination without objective complexity | Astra owns team rules; delegate UI and fixtures |
| 8 | Second map and private-match options | S–M per piece | Reuses proven systems and lessons | Cursor implements scoped map/settings work |
| 9 | Capture-the-core | L | Requires reliable teams, spawns, scoring, and portal policy | Astra designs/integrates; delegate bounded components |
| 10 | Original Blender ships, cover kit, landmarks, lighting, richer sound | M–L, asset by asset | Beautifies proven gameplay without wasting art on discarded layouts | Astra art direction/acceptance; Blender-capable agent produces assets |

Reorder when play reveals a higher-value defect. Collision bugs that undermine fighting are fixed immediately, not deferred behind a feature. Pickups come before portals because they establish reusable state and contested routes; the portal slot can move earlier if its bounded prototype is demonstrably cheaper and more valuable.

Optional later experiments: limited-shot ricochet overcharge and one machinery interaction. Neither is required for the game’s identity. Drop machinery if it distracts from fighting.

## First enhancement: one map with intense combat pockets

Working name: Junction. Name and art are provisional.

Do not scale every coordinate or replace existing maps. Start with approximately the current arena footprint; expand only enough to fit useful routes. The goal is more distinct encounters, not more ground to cross.

Layout brief:

- **Close-combat pocket:** offset solid cover, deliberate bank-shot surfaces, short sightlines, and at least two exits. Intense without becoming a grenade trap.
- **Contested central pocket:** a compact fight around one readable landmark, approached from multiple directions. Reserve an exposed future pickup location without implementing pickups yet.
- **Flanking pocket:** a short route that breaks sightlines and reconnects quickly. Mix narrow approaches with wider dodge/escape space.
- **Connectors:** short enough to maintain pressure; never force every player through one choke. Avoid a safe perimeter loop that rewards disengagement indefinitely.
- **Future portal locations:** reserve clear, separated footprints that could connect two pockets. The map must work before portals exist.
- **Spawns:** outside direct dominant firing lanes, with more than one usable departure route. Tightness must not create unavoidable spawn kills.

Use existing boxes/cylinders and current materials. Vary obstacle proportions, orientation where the current collision model supports it, and grouping. Do not introduce decorative geometry with unsupported collision merely to make a screenshot more interesting.

Design for an intensity rhythm: approach → close exchange → dodge/retreat → quick re-engagement. Open space earns its place by enabling that rhythm. Test grenade escape opportunities, ricochet angles, visibility behind tall cover, and ship clearance at actual movement speed.

Acceptance:

1. Available as an additional map; existing maps and default controls unchanged.
2. All spawns and navigable routes are clear under actual ship collision rules; bots can leave spawns and navigate between pockets.
3. Two-player matches can find each other without prolonged searching; four/eight-player fights retain room to escape and identify threats.
4. Compare time to first contact, gaps between fights, repeated deaths after spawning, and dominant camping positions with the existing tight map. Measurements inform tuning, not invented universal thresholds.
5. Test with real inputs and two clients; use a bounded bot run to expose navigation problems. Bot results do not substitute for player feedback.
6. Comparable before/after captures plus a short gameplay check; no material frame-time or draw-call regression from simple map geometry.
7. If it is less fun than the current map, shrink/rework it. Do not defend it just because it is larger or newer.

## First delegated task brief

Implement only the new map definition using the agreed Junction layout and existing map/rendering contracts. First identify the active v1.0.0-or-newer checkout and coordinate with any hosting work. Add the map without replacing existing ones. Keep changes within the map module and its relevant tests unless a separately reviewed integration change is necessary. Do not alter movement, camera, weapons, physics, networking, dependencies, or art systems. Report changed files, verified spawn/route geometry, captures, and unresolved issues. Do not add portals, pickups, or new modes in this task.

Astra must provide or approve the concrete layout before this brief is dispatched; a vague instruction to “make a great map” is not sufficient delegation.

## How we spend Astra and other-model effort

Astra owns high-leverage work: selecting the next problem, map flow, combat tradeoffs, authoritative state contracts, difficult bugs, integration, and final acceptance. Reserve fresh-context criticism for a meaningful playable milestone, not every tiny edit.

Cursor or another available model can own bounded implementation: approved map data, straightforward UI styling, spawn assertions, asset wiring, documentation, and reproducible verification. Assign one output, narrow file ownership, explicit invariants, and a stopping condition. Model availability and quality vary; delegation is an option, not a promise of equal results or guaranteed savings.

Do not create broad agent swarms. Usually use one builder; add another only for genuinely independent files. No concurrent edits to core simulation or server contracts. Integration failures return to one owner.

Every cycle:

1. Read the saved checkpoint and select one deliverable.
2. Specify the behavior and evidence required to accept it.
3. Implement once, with focused verification.
4. Review the highest-impact issue; refine only when evidence warrants it.
5. Save a compact checkpoint: commit/branch, what changed, checks, open defects, next task.
6. Publish a small playable enhancement when it is complete. Leave unfinished work clearly marked.

No repeated whole-repo audits, speculative rewrites, artificial critic-score inflation, or automatic reruns of already-passing suites without relevant changes. If limits interrupt a cycle, the checkpoint must make continuation cheap.

## Beauty after gameplay

Art is deferred, not abandoned. The final world needs original ships, purposeful machinery silhouettes, memorable landmarks, cohesive materials, clear team accents, readable effects, and strong sound. Develop it around proven map footprints and real combat camera distances. Upgrade one asset family at a time, preserve collision proxies, and measure the result.

The final WOW requirement remains: instantly readable fighting, memorable unscripted combat moments, a recognizable visual identity, and dependable multiplayer. A beautiful map that weakens the fight fails.
