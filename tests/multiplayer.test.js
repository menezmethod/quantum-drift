const { test } = require("node:test");
const assert = require("node:assert/strict");
const { io } = require("socket.io-client");
const { createGameServer: createServer } = require("../server/server");
const createGameServer = options => createServer({allowLegacyMaps:true,...options});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function connect(url) {
  const socket = io(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}
function join(socket, data) {
  return new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit("join", data, (error, result) =>
        error ? reject(error) : resolve(result),
      ),
  );
}
function until(check, timeout = 3000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (check()) return resolve();
      if (Date.now() - start > timeout)
        return reject(new Error("Timed out waiting for state"));
      setTimeout(poll, 20);
    };
    poll();
  });
}

test("real sockets share an authoritative room: movement, shots, death, respawn, isolation, disconnect and rejoin", async (t) => {
  const game = createGameServer();
  await new Promise((resolve) => game.server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${game.server.address().port}`,
    clients = [];
  t.after(async () => {
    clients.forEach((c) => c.disconnect());
    await game.close();
  });
  const a = await connect(url),
    b = await connect(url),
    c = await connect(url);
  clients.push(a, b, c);
  const roomA = await join(a, { mode: "create", name: "Alpha", bots: false });
  assert.ok(roomA.code);
  const roomB = await join(b, {
    mode: "join",
    code: roomA.code,
    name: "Bravo",
  });
  assert.equal(roomA.map.id, roomB.map.id);
  assert.equal(roomB.state.players.length, 2);
  const roomC = await join(c, { mode: "create", name: "Charlie", bots: false });
  assert.notEqual(roomA.code, roomC.code);
  let stateA, stateB, stateC;
  const eventsA = [];
  a.on("state", (s) => (stateA = s));
  b.on("state", (s) => (stateB = s));
  c.on("state", (s) => (stateC = s));
  a.on("events", (events) => eventsA.push(...events));
  await until(() => stateA && stateB && stateC);
  assert.equal(stateC.players.length, 1);
  assert.equal(stateA.players.length, 2);
  const room = game.rooms.get(roomA.code),
    pa = room.sim.players.get(a.id),
    pb = room.sim.players.get(b.id);
  // Deterministic test fixture puts ships in a clear lane; gameplay inputs still cross actual sockets.
  Object.assign(pa, { x: 0, z: -7, vx: 0, vz: 0, angle: 0, protectedUntil: 0 });
  Object.assign(pb, { x: 0, z: 3, protectedUntil: 0 });
  let seq = 0;
  a.emit("input", { seq: ++seq, thrust: 1 });
  await until(() => stateB.players.find((p) => p.id === a.id)?.z > -6.8);
  a.emit("input", { seq: ++seq, thrust: 0 });
  await wait(350);
  const sender = setInterval(
    () =>
      a.emit("input", {
        seq: ++seq,
        weapon: "LASER",
        fire: true,
        aim: { x: pb.x, z: pb.z },
        damage: 9999,
        health: 9999,
      }),
    16,
  );
  try {
    await until(() =>
      eventsA.some((e) => e.type === "kill" && e.player === b.id),
    );
  } finally {
    clearInterval(sender);
  }
  a.emit("input", { seq: ++seq, fire: false });
  await until(() => stateA.players.find((p) => p.id === b.id)?.alive === false);
  assert.equal(stateB.players.find((p) => p.id === a.id).kills, 1);
  assert.ok(pa.health <= 100);
  await until(
    () => stateA.players.find((p) => p.id === b.id)?.alive === true,
    4500,
  );
  assert.equal(stateA.players.find((p) => p.id === b.id).health, 100);
  assert.equal(stateC.players.length, 1);
  assert.equal(stateC.players[0].kills, 0);
  const oldId = b.id;
  b.disconnect();
  await until(() => !room.sim.players.has(oldId));
  const replacement = await connect(url);
  clients.push(replacement);
  const rejoined = await join(replacement, {
    mode: "join",
    code: roomA.code,
    name: "Bravo",
  });
  assert.equal(rejoined.state.players.length, 2);
  assert.notEqual(rejoined.playerId, oldId);
  a.disconnect();
  replacement.disconnect();
  await until(() => !game.rooms.has(roomA.code));
});

test("invalid rooms, malformed packets, capacity, bot fill, and HTTP serving", async (t) => {
  const game = createGameServer();
  await new Promise((resolve) => game.server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${game.server.address().port}`,
    clients = [];
  t.after(async () => {
    clients.forEach((c) => c.disconnect());
    await game.close();
  });
  const a = await connect(url);
  clients.push(a);
  const invalid = await join(a, { mode: "join", code: "MISSING" });
  assert.match(invalid.error, /not found/);
  await wait(420);
  const created = await join(a, { mode: "create", bots: true });
  assert.equal(created.state.players.length, 4);
  assert.equal(created.state.players.filter((p) => p.bot).length, 3);
  for (let i = 1; i < 9; i++) {
    const socket = await connect(url);
    clients.push(socket);
    const result = await join(socket, { mode: "join", code: created.code });
    if (i < 8) assert.ok(result.playerId);
    else assert.match(result.error, /full/);
  }
  const room = game.rooms.get(created.code);
  assert.equal(room.sim.players.size, 8);
  assert.equal([...room.sim.players.values()].filter((p) => p.bot).length, 0);
  a.emit("input", null);
  a.emit("input", { seq: 1, thrust: Infinity, aim: "bad" });
  a.emit("playerDamaged", { damage: 9999, targetId: clients[1].id });
  await wait(80);
  assert.ok([...room.sim.players.values()].every((p) => p.health === 100));
  const health = await (await fetch(`${url}/health`)).json();
  assert.equal(health.status, "ok");
  assert.equal(health.players, 8);
  const html = await (await fetch(url)).text();
  assert.match(html, /Quantum Drift/);
});

test("configured room capacity rejects new rooms while allowing an existing room join", async t => {
  const game=createGameServer({maxRooms:1});
  await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${game.server.address().port}`;
  const a=await connect(url),b=await connect(url);
  t.after(async()=>{a.disconnect();b.disconnect();await game.close();});
  const first=await join(a,{mode:'create',bots:false});
  const rejected=await join(b,{mode:'create',bots:false});
  assert.match(rejected.error,/busy/);
  assert.equal(game.rooms.size,1);
  await wait(420);
  const admitted=await join(b,{mode:'join',code:first.code});
  assert.equal(admitted.code,first.code);
});
