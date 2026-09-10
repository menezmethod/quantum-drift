# Codex / Astra Kickoff Prompt

Paste the block below into Codex with GPT-6 Astra selected.

---

You own the entire Quantum Drift visual/gameplay improvement loop on branch `design/confluence-gameplay-v2`.

Start by reading:
- `README.md`
- `docs/concepts/confluence-v2/README.md`
- `docs/concepts/confluence-v2/ASTRA_DREAM_LOOP.md`
- `docs/concepts/confluence-v2/ASTRA_LOOP_STATE.md`

Then inspect the actual implementation before deciding what to change.

Your mission is not to copy the current concept references. **Beat them.** They are examples of direction, not a ceiling. The shipped running game must become both more beautiful and more fun.

Run this as a closed loop:
1. launch the current game and capture the real baseline from Arena / Full Map plus useful close gameplay views;
2. score the baseline for gameplay space, combat readability, zone identity, composition, materials/lighting/VFX, implementation realism, and performance risk;
3. generate/refine a realistic in-engine target screenshot when image generation is available, grounded in the actual current game rather than a cinematic fantasy render;
4. choose the single highest-value gap between the live game and the target;
5. implement it yourself across code, procedural geometry, shaders, materials, VFX, generated assets, UI, collision, layout, or gameplay systems as needed;
6. run builds/tests, launch the game, actually play through the changed area, and fix correctness issues;
7. capture a new live screenshot;
8. use a fresh critic subagent when available to compare target vs live result and identify the highest-value remaining gap;
9. fix that gap and repeat.

You are the owner, implementer, tester, and final decision-maker. Subagents may critique, inspect, or research, but do not hand the project off to them.

GAMEPLAY RULES:
- Quantum Drift's drift movement and independent mouse aim come first.
- Create real open combat spaces, not just attractive corridors.
- Favor `open fight -> short connector -> flank/shortcut -> open fight` rhythm.
- Preserve multiple loops and alternate exits.
- Snow, Forest, Industrial, and Space must play differently, not merely use different textures.
- Hazards should produce skill expression, movement choices, temporary routes, cover changes, acceleration, sliding, low-gravity opportunities, timing decisions, or high-risk shortcuts.
- Keep visual geometry readable from the actual overhead gameplay camera.
- Avoid prop density that interferes with drifting or projectile readability.
- Laser, grenade, and ricochet behavior must remain tactically useful.
- Maintain authoritative multiplayer architecture and safe spawning.
- Confluence must continue to expand with real human player count. Low-population matches should feel intentionally complete; higher population should physically unfold more of the world.

VISUAL RULES:
- Treat the existing generated references as minimum ambition.
- Improve macro silhouette and combat geometry before obsessing over tiny props.
- Use stronger ship silhouettes, better materials, lighting hierarchy, environmental motion, portals, VFX, and zone transitions where they improve readability.
- Generated 3D assets are allowed when useful, but validate every asset in-engine for scale, orientation, material cost, collision, and gameplay-camera silhouette.
- Never optimize only for one pretty screenshot at the expense of the live game.

AUTONOMY:
- Do not ask me for routine confirmations.
- Make reasonable creative and engineering decisions yourself.
- If something is weak, replace it.
- If an example can be improved, improve it.
- If a proposed visual feature hurts gameplay, reject or redesign it.
- Keep going until the current pass reaches the exit criteria in `ASTRA_DREAM_LOOP.md` or you hit a real environment/quota limit.

CRITICAL RESUME / LIMIT BEHAVIOR:
Quota interruptions are expected. Work in resumable passes.

After every meaningful iteration, and immediately when you suspect context/tool/quota limits are approaching:
- update `docs/concepts/confluence-v2/ASTRA_LOOP_STATE.md` with what changed, current scores, tests, remaining problems, and exactly one concrete `NEXT_ACTION`;
- commit all safe progress to `design/confluence-gameplay-v2`;
- push the branch;
- leave the repository in a state where a fresh Astra session can resume without needing chat history.

If this prompt is being run after an interrupted session, do NOT restart the redesign. Read `ASTRA_LOOP_STATE.md`, inspect the latest branch diff and screenshots, execute `NEXT_ACTION`, and continue the loop.

Begin now. Do not stop at planning. Launch the game, establish the baseline, and make the first implementation pass.

---

## Short resume prompt

Use this after a quota reset or interrupted Codex session:

> Resume the Quantum Drift Astra loop on `design/confluence-gameplay-v2`. Read `docs/concepts/confluence-v2/ASTRA_DREAM_LOOP.md` and `ASTRA_LOOP_STATE.md`, inspect the latest branch state/diff, execute the recorded `NEXT_ACTION`, then continue the closed screenshot → implement → test/play → screenshot → critic → improve loop. Do not restart from scratch, do not ask routine questions, and checkpoint/push before any new limit interruption. The existing concept examples are a floor; beat them while keeping gameplay first.
