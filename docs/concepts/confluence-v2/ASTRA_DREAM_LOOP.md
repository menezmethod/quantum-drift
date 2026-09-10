# Quantum Drift — Astra Dream Loop

**Generated with ChatGPT 5.6 Sol**

Inspired by the closed-loop idea in `achimala/dream-loop`, but adapted specifically for Quantum Drift and for the user's preference that **Astra owns the entire loop** rather than acting only as an orchestrator.

Upstream inspiration: https://github.com/achimala/dream-loop

## Goal

Continuously improve Quantum Drift until the **real running game** beats the visual references in this branch while remaining a better game, not merely a prettier screenshot.

The reference images are a floor, not a finish line. Astra should preserve the strongest ideas, discard weak ones, and produce a result that is more coherent, more readable, more performant, and more fun than the examples.

## Non-negotiable priorities

1. **Gameplay first.** Drift movement, aim readability, pursuit, dodging, ricochet geometry, grenade space, and player flow beat decorative density.
2. **Open combat rhythm.** Favor a cadence of open fight space → short connector → flank/shortcut → open fight space. Avoid corridor mazes.
3. **Distinct zone geometry.** Snow, Forest, Industrial, and Space must play differently, not just look different.
4. **Multiple loops.** Major combat areas need alternate exits/flanks. Avoid dead ends unless intentionally high-risk/high-reward.
5. **Hazards create skill expression.** Hazards should alter movement, timing, cover, routes, or momentum rather than feel random.
6. **Population-driven expansion.** Confluence should physically unfold as human player count rises. The world should feel complete at low population and larger—not emptier—at high population.
7. **Performance is part of visual quality.** Preserve responsive controls and stable browser performance. Never trade the feel of the game for screenshot-only detail.
8. **The live game is the source of truth.** Every visual iteration must be tested in the actual running game and compared with a fresh screenshot.

## Astra owns the whole loop

Unlike the Plus workflow in upstream `dream-loop`, do not hand implementation responsibility to another model. Astra is responsible for:

- understanding the existing architecture
- capturing the baseline
- generating or refining target images when useful
- planning the next pass
- editing code and assets
- generating or sourcing 3D assets when permitted
- integrating assets correctly
- running tests
- launching the game
- capturing screenshots
- evaluating gameplay and visuals
- using critic subagents as reviewers when available
- fixing regressions
- committing checkpoints
- deciding when another iteration is justified

Critic subagents are encouraged, but they are reviewers, not owners. Astra makes the final decisions.

## The loop

### 0. Resume before starting anything

Read, in order:

1. `README.md`
2. `docs/concepts/confluence-v2/README.md`
3. this file
4. `docs/concepts/confluence-v2/ASTRA_LOOP_STATE.md`
5. relevant implementation files and tests

If `ASTRA_LOOP_STATE.md` shows an incomplete iteration, resume it instead of restarting.

### 1. Establish the baseline

Run the existing project and capture the current real game state. Inspect the Arena camera and full-map view, then inspect one or more close gameplay views. Do not judge only from static source code.

Record the baseline problems in the state file under four headings:

- Gameplay
- Readability
- Visual fidelity
- Performance / correctness

### 2. Lock a target for the current pass

Use the existing concepts as inspiration, not as exact specifications.

When image generation is available, create a **realistic in-engine target screenshot**, based on the current game screenshot whenever possible. Do not ask for concept art or a cinematic image that the browser game cannot realistically reproduce.

The target should improve the current game while respecting its real camera, ship scale, controls, arena scale, weapon behavior, and multiplayer constraints.

For each pass, define one primary target such as:

- full Confluence macro-layout
- Nexus Core combat readability
- Snow / Frozen Relay
- Forest / Verdant Basin
- Industrial / Forge District
- Space / Orbital Rail Yard
- ships
- portals / traversal systems
- modular props / cover
- VFX / lighting / materials
- HUD / minimap readability

Do not overhaul every system simultaneously unless the current architecture clearly supports it.

### 3. Implement the highest-value gap

Choose the changes that most improve the actual game relative to the target.

Prefer improvements that affect both gameplay and appearance: arena silhouette, open-space proportions, cover spacing, zone transitions, height cues, hazard readability, destructible geometry, portals, moving platforms, ship silhouette, material hierarchy, lighting, particles, and environmental motion.

Avoid spending a pass polishing small props while the macro gameplay layout is still weak.

### 4. Test the real product

At minimum, run the repository's relevant build/tests and launch the game. Exercise the changed area in actual play.

Specifically verify:

- drift movement is not obstructed by decorative geometry
- independent mouse aim remains readable
- laser, grenade, and ricochet interactions still make sense
- collision geometry matches visible geometry
- spawns remain safe
- zone expansion still works at the intended human counts
- two useful crossings/routes remain available where required
- camera framing remains useful
- no asset has incorrect scale/orientation
- multiplayer-authoritative behavior is not accidentally moved client-side
- browser performance remains acceptable

### 5. Capture a fresh screenshot

Capture the same or equivalent camera angle used for the target. Save working captures under `.dream-loop/` locally.

For important milestones, also save a durable comparison image under:

`docs/concepts/confluence-v2/loop-runs/iteration-XX/`

### 6. Critique

Use a fresh critic subagent when available. Give it only:

- the target
- the current live screenshot
- the gameplay priorities above
- enough context to understand the game

Ask it to score 0–10 and explain the largest remaining gap in:

- gameplay space / movement freedom
- combat readability
- zone identity
- composition / silhouette
- materials / lighting / VFX
- implementation realism
- performance risk

The critic should identify the highest-value next change, not produce a giant wishlist.

### 7. Fix, re-test, re-capture

Address the highest-value criticism, then repeat the real test and screenshot comparison.

### 8. Checkpoint aggressively

Quota interruptions are expected. Never rely on one long uninterrupted session.

At the end of every meaningful pass—and earlier if context/tool limits appear near—Astra must:

1. update `docs/concepts/confluence-v2/ASTRA_LOOP_STATE.md`
2. record exactly what changed
3. record test status
4. record the latest visual/gameplay scores
5. write one concrete `NEXT_ACTION`
6. commit all safe progress to `design/confluence-gameplay-v2`
7. push the branch

A future Astra session should be able to continue by reading the repository only.

## Exit criteria

Do not stop merely because the screenshot looks impressive. Stop a pass when all of the following are true:

- the changed area is materially more fun/readable than before
- the live screenshot meets or beats the target in the important dimensions
- no major gameplay regression was introduced
- tests/build pass or any known failure is explicitly documented
- performance remains acceptable
- the critic's largest remaining gap is polish rather than foundational layout/gameplay

The overall project loop ends only when all major zones and the core have reached that bar.

## 3D asset rule

Use detailed 3D assets when they materially improve the scene, but do not make the arena dependent on expensive geometry everywhere. Major visual assets can be image-to-3D or hand-authored/generated when the environment supports it; simple gameplay-critical geometry should remain clean, predictable, and collision-friendly.

Any generated asset must be checked in-engine for scale, orientation, collision, material cost, and silhouette from the actual gameplay camera.

## Design thesis

Quantum Drift should eventually feel less like four decorated rooms connected to a hub and more like **one strange, living combat station whose districts create different movement problems**.

The strongest reference is not any single generated image. The strongest reference is the best version Astra can make after repeatedly comparing imagination against the real game.