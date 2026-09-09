# R3 systems — correctness 8.0/10; retention verification pending

**Original SYS-1–3 fixes independently verified. Overall rankings remains below 8.5 because one accepted identity-change sequence rejects a whole round.** No production edits; no broad suite or new browser matrix.

## Targeted results

- `node --test tests/reconnect.test.js`: **3 passed, 0 failed**, 1.08s.
- **SYS-1 fixed:** regression covers living damaged and dead pilots, resources, cooldown/protection/respawn timers, position, weapon and no extra spawn. My additional tick-enabled transport-loss probe retained dead state, health 0, energy 7, kills 4 and departed consolidation.
- **SYS-2 original case fixed:** participating socket cannot change profile; both parent regression and independent socket probe reject it without transferring counters. See SYS-5 for the leave/rejoin edge.
- **SYS-3 fixed:** independent tick-enabled probe confirms empty rooms freeze simulation time/tick/round, same-token reconnect restores state and cancels expiry. Parent regression confirms eventual cleanup. Default grace is **30 seconds** by source inspection; tests used 250/350ms rather than waiting 30 seconds.

**Disconnect semantics:** transport loss gets grace. The explicit `leave` event and client/server namespace disconnect are intentional exits; they clean up immediately when the room becomes empty. Client namespace cleanup passed the regression; server namespace cleanup passed my probe. Immediate cleanup on explicit exit is not an unresolved SYS-3 failure.

## P2 SYS-5 — leave then change identity on the same socket rejects the whole round

Locations: `server/server.js:90`, `shared/simulation.js:342`, `shared/simulation.js:637`, `server/rankings/index.js:63`.

**Reproduce:** keep two humans A/B in a room. Give A round stats (probe: four kills), wait past the 400ms join throttle, emit `leave` from A without disconnecting its socket, then join the same room on that socket with a different valid token C. End the round. This follows the server’s instruction to leave before changing identity.

**Actual server result:** new identity accepted; recap contains three participants but only two socket IDs. Server logs **“Ranking save failed: Duplicate player socket id”**, emits **“Last round records could not be saved.”**, reports rankings **degraded**, and records **zero leaderboard rows**, including for unaffected B. Reproduced through the actual tick/event/save/API path, not only by calling the store.

Departed A retains the same socket ID now assigned to C. RankingStore correctly rejects their concatenated recap. This is an accepted socket-API edge case; ordinary UI Leave may disconnect, so no claim that the usual UI flow reproduces it.

**Fix:** reject a new identity when that socket already represents a different departed participant in the current round, or allocate unique participation identities while preserving both profiles and winner attribution. Do not discard departed stats or remove store validation. Add a two-human leave/same-socket/new-token regression requiring safe rejection or successful recording of each distinct participation.

## Correctness versus retention

**Server correctness / provisional rankings: 8.0/10**, improved from r1’s 6.8 but short of the high-end indie 8.5 bar. Core reconnect fixes are credible; SYS-5 still loses a completed round.

**Retention: ungraded pending independent UI verification.** Latest Interface source now includes profile-based recap lookup (SYS-4), history and level/progression rendering. Those are present in source, so the old missing-history finding is not asserted as current. No fresh screenshot, shipped-bundle or intermission-reconnect UI claim is made here. Interface builder/integrator verification remains separate.

Prior durability evidence is carried forward; no new full durability or container suite. Exact source hashes, test results and reproduction details are in `r3-systems.json`.
