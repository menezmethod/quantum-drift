"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const FIELDS = ["kills", "deaths", "wins", "matches", "score", "damageDealt", "shotsFired", "shotsHit", "xp"];
const INPUT_FIELDS = FIELDS.filter((key) => key !== "wins" && key !== "matches");
const emptyStats = () => Object.fromEntries(FIELDS.map((key) => [key, 0]));
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function identifier(value, label, pattern = /^[A-Za-z0-9_.:-]+$/) {
  if (typeof value !== "string" || value.length < 1 || value.length > 160 || !pattern.test(value)) {
    throw new TypeError(`Invalid ${label}`);
  }
  return value;
}

function name(value) {
  return typeof value === "string"
    ? Array.from(value.normalize("NFC").replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "").trim()).slice(0, 18).join("") || "Pilot"
    : "Pilot";
}

function counter(value, key) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER || (key !== "damageDealt" && !Number.isSafeInteger(value))) {
    throw new TypeError(`Invalid ${key}: expected a nonnegative safe ${key === "damageDealt" ? "number" : "integer"}`);
  }
  return value;
}

function statsFrom(player) {
  const stats = emptyStats();
  for (const key of INPUT_FIELDS) stats[key] = counter(player[key] === undefined ? 0 : player[key], key);
  if (stats.shotsHit > stats.shotsFired) throw new TypeError("shotsHit cannot exceed shotsFired");
  return stats;
}

function derived(stats) {
  return {
    ...stats,
    accuracy: stats.shotsFired ? Math.round(stats.shotsHit / stats.shotsFired * 100) : 0,
    level: 1 + Math.floor(Math.sqrt(stats.xp / 250)),
  };
}

function addStats(a, b) {
  return Object.fromEntries(FIELDS.map((key) => [key, counter(a[key] + b[key], key)]));
}

function normalizeRound(input) {
  if (!input || typeof input !== "object") throw new TypeError("Round must be an object");
  const id = identifier(input.id, "round id");
  const mapId = identifier(input.mapId, "map id");
  if (!Array.isArray(input.players) || input.players.length > 1024) throw new TypeError("players must be an array of at most 1024 players");
  const sockets = new Set();
  const profiles = new Set();
  const players = [];
  const winnerId = input.winnerId == null ? null : identifier(input.winnerId, "winner socket id");
  for (const player of input.players) {
    if (!player || typeof player !== "object") throw new TypeError("Invalid player");
    const socketId = identifier(player.id, "player socket id");
    if (sockets.has(socketId)) throw new TypeError("Duplicate player socket id");
    sockets.add(socketId);
    if (player.bot || player.isBot) continue;
    const profileId = identifier(player.profileId, "profile id", /^[A-Za-z0-9_-]+$/);
    if (profiles.has(profileId)) throw new TypeError("Duplicate human profile id in round");
    profiles.add(profileId);
    const stats = statsFrom(player);
    stats.matches = 1;
    stats.wins = socketId === winnerId ? 1 : 0;
    players.push({ id: profileId, name: name(player.name), ...stats });
  }
  if (winnerId !== null && !sockets.has(winnerId)) throw new TypeError("winnerId must identify a supplied player or be null");
  return { id, mapId, endedAt: new Date().toISOString(), players };
}

// The on-disk format contains only allowlisted public fields: never sockets or tokens.
function readLedger(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.rounds)) throw new TypeError("Unsupported rankings file schema");
  const ids = new Set();
  return data.rounds.map((round) => {
    const id = identifier(round?.id, "stored round id");
    const mapId = identifier(round.mapId, "stored map id");
    if (ids.has(id)) throw new TypeError("Duplicate stored round id");
    ids.add(id);
    if (typeof round.endedAt !== "string" || !Number.isFinite(Date.parse(round.endedAt)) || new Date(round.endedAt).toISOString() !== round.endedAt) throw new TypeError("Invalid stored round timestamp");
    if (!Array.isArray(round.players) || round.players.length > 1024) throw new TypeError("Invalid stored players");
    const profiles = new Set();
    let winners = 0;
    const players = round.players.map((player) => {
      const profileId = identifier(player?.id, "stored profile id", /^[A-Za-z0-9_-]+$/);
      if (profiles.has(profileId)) throw new TypeError("Duplicate stored profile id");
      profiles.add(profileId);
      for (const key of FIELDS) counter(player[key], key);
      if (player.matches !== 1 || player.wins > 1 || (winners += player.wins) > 1) throw new TypeError("Invalid stored match counts");
      return { id: profileId, name: name(player.name), ...statsFrom(player), wins: player.wins, matches: 1 };
    });
    return { id, mapId, endedAt: round.endedAt, players };
  });
}

async function atomicWrite(filePath, contents) {
  const directory = path.dirname(filePath);
  await fs.promises.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.promises.open(temporary, "wx", 0o600);
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.promises.rename(temporary, filePath);
    // Persist the directory entry as well as the contents (POSIX filesystem).
    handle = await fs.promises.open(directory, "r");
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await fs.promises.unlink(temporary).catch(() => {});
    throw error;
  }
}

class RankingStore {
  #filePath;
  #rounds;
  #ids = new Set();
  #profiles = new Map();
  #revision = 0;
  #durableRevision = 0;
  #flushing = null;
  #closed = false;

  constructor({ filePath } = {}) {
    if (filePath !== null && (typeof filePath !== "string" || !filePath.trim())) throw new TypeError("Provide filePath or explicit null for memory mode");
    this.#filePath = filePath === null ? null : path.resolve(filePath);
    this.#rounds = this.#filePath === null ? [] : readLedger(this.#filePath);
    for (const round of this.#rounds) {
      this.#apply(round);
      this.#ids.add(round.id);
    }
  }

  #apply(round) {
    // Stage every update first so overflow/validation cannot partially record a round.
    const updates = round.players.map((player) => {
      const previous = this.#profiles.get(player.id);
      const maps = new Map(previous?.maps);
      maps.set(round.mapId, addStats(maps.get(round.mapId) || emptyStats(), player));
      const total = addStats(previous?.total || emptyStats(), player);
      const recap = { id: round.id, mapId: round.mapId, endedAt: round.endedAt, ...derived(Object.fromEntries(FIELDS.map((key) => [key, player[key]]))) };
      return [player.id, { id: player.id, name: player.name, total, maps, last10: [recap, ...(previous?.last10 || [])].slice(0, 10) }];
    });
    for (const [id, profile] of updates) this.#profiles.set(id, profile);
  }

  async recordRound(input) {
    if (this.#closed) throw new Error("RankingStore is closed");
    const id = identifier(input?.id, "round id");
    let recorded = false;
    // First accepted payload wins, including retries with changed/omitted payloads.
    if (!this.#ids.has(id)) {
      const round = normalizeRound(input);
      this.#apply(round);
      this.#rounds.push(round);
      this.#ids.add(id);
      this.#revision++;
      recorded = true;
    }
    await this.#flush();
    return { id, recorded };
  }

  #flush() {
    if (this.#filePath === null) {
      this.#durableRevision = this.#revision;
      return Promise.resolve();
    }
    if (this.#flushing) return this.#flushing;
    // Defer the snapshot one microtask to coalesce synchronous batches. There is
    // only one writer; new arrivals during IO trigger another ordered snapshot.
    this.#flushing = Promise.resolve().then(async () => {
      while (this.#durableRevision < this.#revision) {
        const revision = this.#revision;
        const contents = JSON.stringify({ version: 1, rounds: this.#rounds });
        await atomicWrite(this.#filePath, contents);
        this.#durableRevision = revision;
      }
    }).finally(() => { this.#flushing = null; });
    return this.#flushing;
  }

  getLeaderboard({ mapId = null, limit = 50 } = {}) {
    if (mapId !== null) identifier(mapId, "map id");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new TypeError("limit must be an integer from 1 to 1000");
    const rows = [];
    for (const profile of this.#profiles.values()) {
      const stats = mapId === null ? profile.total : profile.maps.get(mapId);
      if (stats) rows.push({ id: profile.id, name: profile.name, ...derived(stats) });
    }
    return rows.sort((a, b) => b.score - a.score || b.wins - a.wins || b.kills - a.kills || a.deaths - b.deaths || compareId(a.id, b.id)).slice(0, limit);
  }

  getProfile(id) {
    identifier(id, "profile id", /^[A-Za-z0-9_-]+$/);
    const profile = this.#profiles.get(id);
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      ...derived(profile.total),
      maps: Object.fromEntries([...profile.maps].sort(([a], [b]) => compareId(a, b)).map(([mapId, stats]) => [mapId, derived(stats)])),
      last10: profile.last10.map((recap) => ({ ...recap })),
    };
  }

  async close() {
    this.#closed = true;
    await this.#flush();
  }
}

module.exports = { RankingStore };
