# RankingStore — ready for parent integration

Only `server/rankings/` was changed. No build, commit, server restart, or integration edit was performed. The baseline inspected was `docs/gauntlet/evidence/baseline-health-night.png`; this backend module makes no visual improvement claim or score. Parent should wire and verify completed authoritative online rounds after the other modules are integrated.

## Exact CommonJS API

```js
const { RankingStore } = require('./rankings'); // from server/server.js
const rankings = new RankingStore({ filePath: configuredAbsoluteDataFile });
// Explicit memory mode for tests/practice isolation: { filePath: null }.

const result = await rankings.recordRound({
  id: 'globally-unique-room-session:round-number',
  mapId: 'foundry',
  winnerId: 'socket-id', // socket id, never a profile id; null/undefined = no winner
  players: [{
    id: 'socket-id',
    profileId: 'server-computed-durable-profile-hash',
    name: 'Aurora',
    bot: false,
    kills: 3,
    deaths: 1,
    damageDealt: 125.5,
    shotsFired: 8,
    shotsHit: 3,
    score: 550,
    xp: 307,
  }],
});
// result: { id: 'globally-unique-room-session:round-number', recorded: true }
// Same id again: { id, recorded: false }; the first accepted payload wins.

const total = rankings.getLeaderboard();
const map = rankings.getLeaderboard({ mapId: 'foundry', limit: 50 });
const profile = rankings.getProfile('server-computed-durable-profile-hash');
await rankings.close();
```

- Constructor synchronously loads and validates an existing version-1 file. Only `ENOENT` initializes an empty ledger; invalid JSON/schema, unreadable files, and unsupported versions throw. `filePath` is required, either a nonempty path string or `null`. Relative paths resolve at construction; parent should pass an absolute configured path outside the static web root. Missing directories are created on first write.
- `recordRound(round): Promise<{id: string, recorded: boolean}>`. Applies a validated round to memory synchronously and resolves after durable persistence. First accepted round ID wins globally across maps, rooms, calls, and reopen. A duplicate requires only `{id}`; its other fields are ignored. Validation or storage errors reject. No swallowed background promises: the caller must handle rejection.
- `getLeaderboard({mapId = null, limit = 50} = {}): Row[]`. Synchronous. Omit `mapId` or use `null` for totals; unknown maps return `[]`. `limit` must be an integer 1–1000. Ordered by score descending, wins descending, kills descending, deaths ascending, then canonical profile ID ascending using code-point comparison. Names are the latest accepted name, including on per-map boards. Rows are detached copies.
- `Row = {id, name, kills, deaths, wins, matches, score, damageDealt, shotsFired, shotsHit, xp, accuracy, level}`. `id` is always the public canonical profile hash, never the socket ID or bearer token.
- `getProfile(id): Profile | null`. Synchronous; unknown valid IDs return `null`. `Profile = {...Row, maps, last10}`. `maps` is an object keyed by map ID; each value contains the nine additive stats plus accuracy and level. `last10` is newest-first by accepted round order, with at most ten entries across all maps: `{id, mapId, endedAt, kills, deaths, wins, matches, score, damageDealt, shotsFired, shotsHit, xp, accuracy, level}`. Recap `id` is the round ID; `endedAt` is the store's UTC ISO acceptance timestamp. `wins` is 0 or 1; `matches` is 1. Recap accuracy/level derive from that round's stats, while top-level and map accuracy/level derive from their respective totals. All nested returns are detached copies.
- `close(): Promise<void>` immediately prevents new records, waits for pending persistence, and is repeatable. Reads remain available. It rejects if durability fails. After repairing storage, calling `close()` again retries outstanding data, even though the store remains closed for new records.

## Scoring and validation

Parent computes authoritative round scores exactly as requested:

```js
score = Math.max(0, kills * 100 + Math.floor(damageDealt * .2) - deaths * 25 + (winnerId === id ? 250 : 0));
xp = Math.max(25, 25 + kills * 40 + Math.floor(damageDealt / 10) + (winnerId === id ? 150 : 0));
```

The store sums supplied `score`/`xp`; it does not recompute or substitute these formulas. All counters other than wins/matches default to zero only when absent/undefined. Values must be nonnegative finite safe integers, except `damageDealt`, which accepts nonnegative finite fractional values up to `Number.MAX_SAFE_INTEGER`. Strings, nulls, negatives, NaN, infinities, unsafe values, and `shotsHit > shotsFired` reject the whole round. Aggregate overflow also rejects before any profile changes. The integrator must define `shotsHit` as successful shots, at most one hit per fired shot, including explosions and ricochets.

`wins` is derived from human socket ID equality with `winnerId`; `matches` increments once per supplied human. Caller-supplied wins/matches/accuracy/level are ignored. Accuracy is `shotsFired ? Math.round(shotsHit / shotsFired * 100) : 0`, recomputed from aggregate counters rather than averaged percentages. Level is `1 + Math.floor(Math.sqrt(xp / 250))`. Empty profiles start at level 1 when first recorded with zero XP.

`players` must be an array with at most 1024 entries. Each needs a unique socket `id`. Truthy `bot` or `isBot` excludes the entry before profile/stat validation. Every human, including departed humans, needs a unique `profileId` within the round. Duplicate profiles are rejected to prevent a reconnect/double-tab from counting twice; parent must consolidate their counters before submission. `winnerId` must identify a supplied human or bot, or be null/undefined. Bot-only and empty rounds (with no winner) are deduplicated but create no profile rows.

Round/map/socket IDs allow 1–160 ASCII letters, digits, `_`, `.`, `:`, and `-`. Profile IDs allow 1–160 ASCII letters, digits, `_`, and `-`, preserving case exactly. The server owns canonical hashing and token validation. This module does not authenticate identities or detect cheating. Round IDs must be globally unique and must never embed bearer tokens. Names normalize to NFC, strip angle brackets, control/bidi/zero-width formatting characters, trim, and truncate to 18 Unicode code points, falling back to `Pilot`. UI must still render names as text. Only allowlisted fields persist/return; socket IDs, input objects, tokens, and arbitrary player properties are discarded.

## Durability and error handling

One store instance owns one JSON path; do not run multiple processes/stores writing the same file. This is a small-server round ledger, not a multiwriter database. Version 1 stores `{version: 1, rounds: [...]}`; profiles and map aggregates rebuild from validated rounds on startup. All round IDs/history are retained for permanent deduplication, so disk size and startup/full-snapshot cost grow with history; only the latest ten recaps are returned per profile. There is no silent pruning that could allow old rounds to count again.

Writes are serialized and same-turn calls coalesce. A snapshot is written to a unique same-directory file opened exclusively with mode `0600`, file-synced, closed, atomically renamed over the destination, then directory-synced. Arrivals during IO trigger a subsequent snapshot before the shared flush promise resolves. This targets the server's POSIX filesystem; directory-sync failures on unsupported filesystems are surfaced. No build-time database dependency is needed.

On IO failure, accepted rounds remain in memory and reads can show them, but `recordRound` rejects and durability is **not** claimed. Parent must surface/log this failure and avoid acknowledging durable save. Retrying the same round ID or recording another round retries all dirty data without double counting. `close()` also retries. Temporary files are removed on handled failure; process-crash leftovers are ignored on startup. Pre-rename failures leave the prior file intact; post-rename sync failures can leave the new complete file present but still reject. Corrupt input files are never reset or overwritten by construction.

## Integration requests

1. Instantiate one store at server startup with configured persistent data path (or explicit `null` for tests); catch startup failures rather than resetting history.
2. Call `recordRound` exactly at authoritative **completed online** round boundaries, before counters reset. Supply round-only counters and score/XP, a globally unique round ID stable across retries, canonical hashed `profileId`, socket `winnerId`, bots flagged, and departed participant snapshots consolidated by profile.
3. Await/catch its promise. Publish persisted leaderboard/profile/recap updates after success; expose a meaningful save failure on rejection. Never ingest rankings from client-provided round results or offline/showcase data.
4. Expose only returned rows/profile data; keep bearer tokens and filesystem error details private. Map filtering uses actual map IDs; totals omit `mapId`.
5. Await `close()` during server shutdown and fail/report shutdown persistence errors. Integrator owns route/socket plumbing, schema of client events, graceful shutdown, and root test-script inclusion.

## Verification and changed paths

Run `node --test server/rankings/rankings.test.js`. All 9 tests pass: memory/derived stats; reopen/dedup/multi-map; bots/departed humans/privacy; sanitization/copy isolation; last-ten/tie ordering; transactional overflow; coalesced/ordered IO and close; atomic IO failure/retry; corrupt/unreadable startup handling. Tests create and remove temporary files only inside this module.

Changed paths:

- `server/rankings/index.js`
- `server/rankings/rankings.test.js`
- `server/rankings/INTEGRATION.md`
