"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { RankingStore } = require("./index");

function disk(t) {
  const directory = fs.mkdtempSync(path.join(__dirname, ".test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return path.join(directory, "data", "rankings.json");
}

function player(overrides = {}) {
  return { id: "socket-a", profileId: "hash-a", name: "Aurora", kills: 3, deaths: 1, damageDealt: 125.5, shotsFired: 8, shotsHit: 3, score: 550, xp: 307, ...overrides };
}

function round(overrides = {}) {
  return { id: "room:round:1", mapId: "foundry", players: [player()], winnerId: "socket-a", ...overrides };
}

test("memory mode preserves provided counters and derives lifetime accuracy/level", async () => {
  const store = new RankingStore({ filePath: null });
  assert.deepEqual(await store.recordRound(round()), { id: "room:round:1", recorded: true });
  const profile = store.getProfile("hash-a");
  assert.deepEqual(store.getLeaderboard(), [{ id: "hash-a", name: "Aurora", kills: 3, deaths: 1, wins: 1, matches: 1, score: 550, damageDealt: 125.5, shotsFired: 8, shotsHit: 3, xp: 307, accuracy: 38, level: 2 }]);
  assert.equal(profile.maps.foundry.matches, 1);
  assert.equal(profile.last10[0].id, "room:round:1");
  assert.equal(profile.last10[0].wins, 1);
  assert.equal(store.getProfile("unknown"), null);
  await store.close();
  await assert.rejects(store.recordRound(round({ id: "late" })), /closed/);
});

test("durable reopening, idempotency across sessions, and canonical identity across sockets", async (t) => {
  const filePath = disk(t);
  let store = new RankingStore({ filePath });
  await store.recordRound(round());
  // Acknowledgement itself guarantees a readable durable file, before close.
  assert.equal(JSON.parse(fs.readFileSync(filePath)).rounds.length, 1);
  const before = store.getProfile("hash-a");
  await store.close();
  store = new RankingStore({ filePath });
  assert.deepEqual(store.getProfile("hash-a"), before);
  assert.deepEqual(await store.recordRound({ id: "room:round:1" }), { id: "room:round:1", recorded: false });
  await store.recordRound(round({ id: "room:round:2", mapId: "glacier", players: [player({ id: "socket-new", name: "Nova", shotsFired: 2, shotsHit: 2 })], winnerId: "socket-new" }));
  assert.equal(store.getProfile("hash-a").matches, 2);
  assert.equal(store.getProfile("hash-a").name, "Nova");
  assert.equal(store.getProfile("hash-a").accuracy, 50);
  assert.equal(store.getLeaderboard({ mapId: "foundry" })[0].matches, 1);
  assert.equal(store.getLeaderboard({ mapId: "glacier" })[0].wins, 1);
  assert.deepEqual(store.getLeaderboard({ mapId: "missing" }), []);
  await store.close();
  const reopened = new RankingStore({ filePath });
  assert.equal(reopened.getProfile("hash-a").score, 1100);
  assert.equal(reopened.getProfile("hash-a").xp, 614);
  await reopened.close();
});

test("bots excluded, socket winner identity, departed humans retained, no private payload leakage", async (t) => {
  const filePath = disk(t);
  const store = new RankingStore({ filePath });
  await store.recordRound(round({
    players: [player({ departed: true, token: "SECRET_TOKEN", profileToken: "SECRET_PROFILE", input: { secret: true } }), { id: "bot-a", bot: true, name: "Bot", kills: NaN }, { id: "bot-b", isBot: true }],
    winnerId: "bot-a",
  }));
  assert.equal(store.getLeaderboard().length, 1);
  assert.equal(store.getProfile("hash-a").wins, 0);
  assert.equal(store.getProfile("hash-a").matches, 1);
  const text = fs.readFileSync(filePath, "utf8") + JSON.stringify(store.getProfile("hash-a"));
  for (const secret of ["SECRET", "socket-a", "bot-a", "profileToken", "departed"]) assert.ok(!text.includes(secret), secret);
  await store.close();
});

test("sanitizes names, rejects unsafe counters/identities atomically, and returns isolated copies", async () => {
  const store = new RankingStore({ filePath: null });
  for (const invalid of [NaN, Infinity, -1, "3", null, Number.MAX_SAFE_INTEGER + 1, 1.5]) {
    await assert.rejects(store.recordRound(round({ players: [player({ kills: invalid })] })), /Invalid kills/);
  }
  await assert.rejects(store.recordRound(round({ players: [player(), player({ id: "socket-b" })] })), /Duplicate human/);
  await assert.rejects(store.recordRound(round({ players: [player({ profileId: undefined })] })), /profile id/);
  await assert.rejects(store.recordRound(round({ players: [player({ shotsHit: 9 })] })), /shotsHit/);
  await assert.rejects(store.recordRound(round({ winnerId: "unknown" })), /winnerId/);
  assert.deepEqual(store.getLeaderboard(), []);
  await store.recordRound(round({ players: [player({ name: " \u0000<>\u202eNova\n ", wins: 999, matches: 999 })] }));
  const result = store.getProfile("hash-a");
  assert.equal(result.name, "Nova");
  assert.equal(result.wins, 1);
  assert.equal(result.matches, 1);
  result.maps.foundry.score = 0;
  result.last10[0].score = 0;
  store.getLeaderboard()[0].score = 0;
  assert.equal(store.getProfile("hash-a").maps.foundry.score, 550);
  assert.equal(store.getProfile("hash-a").last10[0].score, 550);
  assert.throws(() => store.getLeaderboard({ limit: Infinity }), /limit/);
  assert.throws(() => store.getLeaderboard({ limit: 0 }), /limit/);
  assert.throws(() => store.getProfile("../private"), /profile/);
  await store.close();
});

test("keeps last ten newest accepted recaps and stable leaderboard tie ordering", async () => {
  const store = new RankingStore({ filePath: null });
  for (let i = 0; i < 12; i++) await store.recordRound(round({ id: `round-${i}`, winnerId: null, players: [player({ id: "z", profileId: "z" }), player({ id: "a", profileId: "a" })] }));
  assert.deepEqual(store.getLeaderboard({ limit: 1 }).map((row) => row.id), ["a"]);
  assert.deepEqual(store.getProfile("a").last10.map((recap) => recap.id), Array.from({ length: 10 }, (_, i) => `round-${11 - i}`));
  await store.recordRound({ id: "round-11" });
  assert.equal(store.getProfile("a").matches, 12);
  await store.close();
});

test("overflow rejects an entire multi-player round before changing profiles or deduplication", async () => {
  const store = new RankingStore({ filePath: null });
  await store.recordRound(round({ players: [player({ score: Number.MAX_SAFE_INTEGER })] }));
  await assert.rejects(store.recordRound(round({ id: "overflow", players: [player({ id: "b", profileId: "b" }), player()] })), /score/);
  assert.equal(store.getProfile("b"), null);
  assert.equal(store.getProfile("hash-a").matches, 1);
  assert.equal((await store.recordRound(round({ id: "overflow", players: [], winnerId: null }))).recorded, true);
  await store.close();
});

test("concurrent calls coalesce, arrivals during IO are ordered, and close waits for all durability", async (t) => {
  const filePath = disk(t);
  const store = new RankingStore({ filePath });
  const originalRename = fs.promises.rename;
  let release;
  let entered;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { entered = resolve; });
  let writes = 0;
  t.mock.method(fs.promises, "rename", async (...args) => {
    writes++;
    if (writes === 1) { entered(); await gate; }
    return originalRename(...args);
  });
  const pending = Array.from({ length: 20 }, (_, i) => store.recordRound(round({ id: `batch-${i}` })));
  pending.push(store.recordRound(round({ id: "batch-0" })));
  await started;
  pending.push(store.recordRound(round({ id: "during-write" })));
  let closed = false;
  const closing = store.close().then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  release();
  const results = await Promise.all(pending);
  await closing;
  assert.equal(results.filter((result) => result.recorded).length, 21);
  assert.equal(writes, 2);
  assert.equal(JSON.parse(fs.readFileSync(filePath)).rounds.length, 21);
  assert.equal(new RankingStore({ filePath }).getProfile("hash-a").matches, 21);
  assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ["rankings.json"]);
});

test("write errors reject callers and close; retry preserves idempotency and existing atomic file", async (t) => {
  const filePath = disk(t);
  const store = new RankingStore({ filePath });
  await store.recordRound(round());
  const original = fs.readFileSync(filePath, "utf8");
  const mocked = t.mock.method(fs.promises, "rename", async () => { const error = new Error("simulated storage failure"); error.code = "EIO"; throw error; });
  await assert.rejects(store.recordRound(round({ id: "retry" })), { code: "EIO" });
  assert.equal(fs.readFileSync(filePath, "utf8"), original);
  assert.deepEqual(fs.readdirSync(path.dirname(filePath)), ["rankings.json"]);
  await assert.rejects(store.recordRound({ id: "retry" }), { code: "EIO" });
  await assert.rejects(store.close(), { code: "EIO" });
  mocked.mock.restore();
  await store.close();
  const reopened = new RankingStore({ filePath });
  assert.equal(reopened.getProfile("hash-a").matches, 2);
  assert.equal((await reopened.recordRound({ id: "retry" })).recorded, false);
  await reopened.close();
});

test("fails loudly on corrupt/unreadable/unsupported storage without replacing it", async (t) => {
  const filePath = disk(t);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  for (const contents of ["{broken", '{"version":2,"rounds":[]}', '{"version":1,"rounds":[{}]}']) {
    fs.writeFileSync(filePath, contents);
    assert.throws(() => new RankingStore({ filePath }));
    assert.equal(fs.readFileSync(filePath, "utf8"), contents);
  }
  assert.throws(() => new RankingStore({ filePath: path.dirname(filePath) }), { code: "EISDIR" });
  assert.throws(() => new RankingStore(), /filePath/);
  const memory = new RankingStore({ filePath: null });
  await memory.recordRound(round({ players: [player({ kills: undefined, deaths: undefined, shotsFired: undefined, shotsHit: undefined, xp: undefined, score: undefined })] }));
  assert.equal(memory.getProfile("hash-a").accuracy, 0);
  assert.equal(memory.getProfile("hash-a").level, 1);
  await memory.close();
});
