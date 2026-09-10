# Quantum Drift — Confluence Gameplay Concepts

**Generated with ChatGPT 5.6 Sol**

This branch is the gameplay-first visual/design pass for the expanding Confluence map.

Design priorities:
- larger open combat spaces for drifting and independent aim
- short, readable connectors instead of corridor-heavy layouts
- multiple flank loops and at least two crossings back to the Nexus Core per district
- hazards that create movement choices and skill expression
- physical player-count expansion of the arena
- distinct gameplay geometry for Snow, Forest, Industrial, and Space

Planned concept set:
- full Confluence gameplay-first map
- Snow / Frozen Relay
- Forest / Verdant Basin
- Industrial / Forge District
- Space / Orbital Rail Yard
- ships / GLB modeling references
- modular props and cover
- portals, gates, traversal, and traps

The concept graphics are visual direction / blockout references rather than final gameplay specifications. They are meant to be **beaten by the shipped implementation**, not copied mechanically.

## Astra closed loop

The project-specific autonomous iteration workflow lives here:

- [`ASTRA_DREAM_LOOP.md`](./ASTRA_DREAM_LOOP.md) — gameplay-first closed-loop rules
- [`ASTRA_LOOP_STATE.md`](./ASTRA_LOOP_STATE.md) — durable resume/checkpoint state for quota interruptions
- [`RUN_ASTRA_PROMPT.md`](./RUN_ASTRA_PROMPT.md) — full Codex kickoff prompt plus a short resume prompt

This workflow is inspired by [`achimala/dream-loop`](https://github.com/achimala/dream-loop), but intentionally changes the ownership model: **Astra owns planning, implementation, testing, screenshots, critique, checkpointing, and iteration end-to-end.** Critic subagents are optional reviewers, not the primary builders.
