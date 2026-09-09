# Mini-release Gauntlet

Adapted from https://www.thepromptindex.com/ai-loop-engineering-gauntlet-loop-guide.html. Objective, evidence and stopping boundaries matter more than endless iterations. This protocol governs incremental execution of ROADMAP.md; hosting is owned separately.

## One cycle
1. Read STATUS.json and ROADMAP.md; inspect the actual checkout and outstanding changes. Check account usage. Select exactly one smallest complete player-facing feature.
2. Save an acceptance card: feature, files owned, invariants, rough effort, required tests/play checks, planned release version. No architecture rewrite or extra features.
3. Build using existing systems. Delegate bounded work only when it saves effort; one builder and at most one fresh critic. Cursor is an optional external handoff, not assumed to be callable.
4. Run focused checks and inspect real output. Critic reads/plays the artifact rather than the builder's summary. New gameplay requires two-client verification. Map/art changes need comparable captures; feel claims need actual input/motion. Critical defects block release regardless of score.
5. Fix the most consequential finding. After two unsuccessful refinements, split/simplify the feature or save it as unfinished. Never fabricate a pass. Automated correctness and candid provisional human-balance limitations can support an experimental opt-in feature; broad WOW completion still requires the full design gate.
6. Accepted feature: commit code, relevant tests, evidence, changelog, and updated STATUS together; push its feature branch, create an immutable version tag and GitHub release with a prebuilt runtime archive and checksums. Do not change hosting, live routing or automatically deploy. Default-branch merges require checking concurrent hosting work first.
7. Recheck usage and save next step. Continue only if another bounded feature fits with verification reserve. If not, leave a clean checkpoint. Unfinished work may be committed to a clearly named WIP branch, but receives no stable release/tag and does not enter the last-good release.

## Capacity and estimates

Account snapshots are percentages shared across tasks, not a token meter. There is no reliable conversion from feature tokens to percentage usage. The following are initial planning ranges for total model effort, including one review; compare estimates with observed work and revise rather than promising accuracy:

| Slice | Planning estimate | Example |
| --- | --- | --- |
| XS | 2–5k tokens | One HUD wording/readability correction |
| S | 6–12k tokens | Existing-asset map plus focused geometry/play verification |
| M | 12–25k tokens | One pickup type with authoritative collection and UI |
| L | Split before starting | Portals, team rules, new objective mode |

Estimate orchestration/review as part of the feature, not free overhead. A new session's context reload may increase the cost. Record before/after account snapshots but label deltas as shared-account observations, not exclusive feature cost.

Keep at least 20% of both reported windows in reserve. As a conservative starting admission rule, only start an S feature with at least 40% five-hour and 25% weekly remaining; require more headroom or split M. Recheck after building and before extra refinement. Finish verification/checkpoint first if usage drops unexpectedly. Missing usage data means only inspect/checkpoint until availability is known. Do not consume reset credits without explicit user authorization.

A scheduler can request continuation, but cannot bypass usage limits, guarantee execution during an outage, or revive a paused goal itself. Existing legacy goal was usage-limited when this protocol was established; do not claim it was resumed. Durable git/STATUS checkpoints make recovery independent of conversation memory.

## Versions and completion

Use patch versions for fixes and small compatible refinements; minor versions for new maps/systems/modes. A release is a runnable, tested increment—not a claim that the entire game is finished. Do not reuse or move published tags. Resolve tag collisions by inspecting existing releases first.

The finite completion scope is the agreed ROADMAP.md: maps/cover, combat clarity, pickups, portals, teams, objective mode, then original art. Every accepted stage must satisfy its own gates; optional machinery is removable. Final completion requires the combat-first plan's actual-play and independent quality evidence. If a human feedback gate is missing, report it honestly rather than loop indefinitely manufacturing scores.

Each resume reads one compact checkpoint: baseline, active feature, accepted commits/releases, verification paths, defects, usage snapshot, next action. Do not repeat broad audits or spawn reviewers just to consume another round.

## Scheduled continuation

Codex heartbeat `quantum-drift-mini-releases` checks every six hours. It runs at most one accepted slice per invocation and skips low-allowance windows. Its prompt reads these files; changing the roadmap does not require rebuilding an orchestrator. It cannot guarantee execution while account limits or the local environment block work.

After the accepted commit, `npm run release:pack` creates a runtime archive and SHA256SUMS in ignored release-artifacts/. Run build/tests first; packaging alone does not grant a quality pass. Publish the archive for the matching immutable git tag.
