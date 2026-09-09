# R1 systems critique — rankings 6.8/10, below 8.5

Independent review against a high-end indie bar for fair scoring, reliable reconnect, durable records and a useful return-play loop. **Not passed.** The storage module and presentation are credible; reproducible integration faults prevent an 8.5. No production changes.

## Prioritized defects

### P1 SYS-1: Reconnect bypasses respawn and restores combat resources

**Where:** `server/server.js:132`, `server/server.js:135`, `shared/simulation.js:364`.

**Reproduce:** Keep a second human in the room. Kill or damage pilot A, disconnect A, reconnect with the same profileToken and join the same code before respawnAt. Targeted probe used tick:false and a dead fixture with health=1, energy=0, respawnAt=3, time=0; join/disconnect traversed real sockets.

**Observed / impact:** Rejoined pilot was alive with health=100, energy=100, respawnAt=0 and protectedUntil=1.5 at time=0. Kills=4/deaths=2 remained intact; departed entry was consolidated. A player can evade the three-second death penalty or repeatedly heal/recharge by reconnecting without losing accrued score.

**Fix / check:** Restore authoritative combat state and remaining respawn/protection timers for a reconnecting profile; do not unconditionally spawn it. Disconnect/rejoin living damaged and dead pilots; assert no resource gain or shortened death timer.

### P2 SYS-2: Repeated join can reassign accumulated stats to another profile

**Where:** `server/server.js:124`, `server/server.js:132`, `server/server.js:133`.

**Reproduce:** Join as token A, accumulate round counters, wait >400ms, then emit join to the same room on the same socket using token C. End the round and record its authoritative recap. Probe used deterministic 4 kills, 2 deaths, 430 damage, 20 fired, 7 hit.

**Observed / impact:** Same player object kept four kills but profileId changed. RankingStore credited C with four kills and score 686; A had no record. Identity is mutable mid-round and attribution is lost. This does not permit taking over an unknown bearer token; it permits transferring stats between tokens the caller supplies.

**Fix / check:** Bind a connected participant to its canonical profile identity. Reject identity changes while participating, or close the old participation explicitly without transferring counters. A repeated join with a different token must not change ownership of existing counters.

### P2 SYS-3: Sole-human connection loss destroys the room before automatic rejoin

**Where:** `server/server.js:61`, `server/server.js:68`, `src/index.js:441`.

**Reproduce:** Create a room with one human and bots. Disconnect the human, reconnect with the same token, and join the original room code.

**Observed / impact:** Room was deleted immediately; rejoin returned Room not found. Check the code or create a new room. The normal solo-online-with-bots flow cannot recover from a transient disconnect; in-progress stats disappear. This is an explicit cleanup behavior in current tests, but conflicts with the client promise of rejoining the room.

**Fix / check:** Use a bounded empty-room reconnect grace period, distinguishing intentional leave from transport loss where practical. Reconnect within grace resumes room/counters; an expired abandoned room is cleaned up.

### P2 SYS-4: Reconnect during intermission loses the local recap view

**Where:** `src/interface/Interface.js:342`, `src/interface/Interface.js:352`, `server/server.js:135`.

**Reproduce:** Complete a round with another human connected, disconnect/rejoin with the same profileToken during the ten-second recap.

**Observed / impact:** Authoritative recap still contains old socket ID. Rejoin supplies a new socket ID; local recap lookup has no match although profileId matches. UI takes the No pilot statistics for this round branch despite a recorded round. Stored career totals are not lost.

**Fix / check:** Resolve online recap identity by canonical profileId with socket fallback for practice. Same-token intermission reconnect displays original kills, score and XP without adding another match.

## Evidence and tests

- Independently ran `npm test`: **52 passed, 0 failed**, 5.17 seconds. Parent subsequently reports **61 passing tests** and the full browser regression passing with zero errors. Accepted as parent evidence; no repeated matrix.
- Targeted real-socket probes reproduced all four findings. Server fixture counters/timers were set deterministically; socket join/disconnect handling was unmodified. SYS-4 UI consequence is established by the returned recap and the exact source lookup, not a screenshot of the error branch.
- Same-token score-counter restoration and departed consolidation passed. Exact rotation passed: **Foundry → Canopy → Glacier → Classic → Foundry**. An initial probe wrongly expected three maps; corrected against the registry. This was a probe error, not a game defect.
- After the matrix finished, an independent Playwright harness served the existing bundle from an isolated memory-mode server. Two real sockets completed a Canopy round with a laser input; only spawn positions, victim health and frag limit were controlled. The actual leaderboard showed **354 score / 217 XP**, the local pilot highlight, both human rows, correct Canopy filtering and an empty Foundry board. **Zero captured browser errors.** No fake leaderboard rows or production records were written.
- Visually inspected `docs/gauntlet/evidence/r1-foundry-ui-tactical-recap.png` and the independent actual leaderboard screenshot. Recap is readable, with eight stats and explicit practice exclusion. Records has clear tabs, legible rows and an honest browser-token disclaimer. All 14 available r1 JSON receipts reported no console/page/request errors; this is not a visual inspection of every image.
- **Own screenshot is retained losslessly in `r1-systems.json` at `browser.screenshot.base64` (image/png)** to keep repository writes to the two authorized report files. Its temporary inspection copy was `/tmp/qd-r1-systems-leaderboard.png`.

## Durability, scoring and retention

Nine RankingStore tests and online restart integration passed: atomic persistence, fsync, idempotency, concurrent writes, failure/retry, invalid-file refusal, bot exclusion, deterministic ordering and last-ten retention. Latest Dockerfile copies rankings; Compose mounts the named rankings volume. These fixes are acknowledged; no container lifecycle verification claimed.

Scoring matches the declared formula; splash counts each successful projectile once and suicide does not create negative counters. Round reset/safe-spawn coverage passed. Lifetime/per-map totals, XP-derived level and ten recaps rebuild from disk. However, `Interface.js:316` only renders career rounds/wins/score/XP: **“View your history” leads to aggregates, with no recent-round list or level**. This is a retention/product gap, separate from the four correctness bugs.

The entire unbounded JSON ledger is serialized on each save and replayed on startup. That is a documented single-writer small-server limitation, not a measured failure. No scale or power-loss testing was performed. Private/bot-filled online rounds share cumulative score boards; this is not a verified skill-ranking system. The inspected desktop board had two rows, so long-table and mobile leaderboard quality remain unverified.

Fix SYS-1 first, then attribution and both reconnect failures; expose stored recent history/progression and rerun focused regressions before reassessment. Score is a judgment of the delivered system, not an average of passing tests.
