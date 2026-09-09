const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  Simulation,
  MAP,
  RULES,
  WEAPONS,
  STEP,
  blocked,
  movePlayer,
  sanitizeInput,
  traceWalls,
} = require("../shared/simulation");
const empty = { id: "test", size: 25, obstacles: [] };
function duel(map = empty) {
  const sim = new Simulation({ map });
  const a = sim.addPlayer("a", "Alpha"),
    b = sim.addPlayer("b", "Bravo");
  Object.assign(a, { x: 0, z: -8, angle: 0, protectedUntil: 0 });
  Object.assign(b, { x: 0, z: 8, angle: Math.PI, protectedUntil: 0 });
  sim.drainEvents();
  return { sim, a, b };
}
function advance(sim, duration, input) {
  for (let i = 0; i < Math.ceil(duration / STEP); i++) {
    if (input) sim.setInput("a", { ...input, seq: sim.tick + 1 });
    sim.step();
  }
}

test("untrusted input cannot set position, damage, health, speed, or invalid numbers", () => {
  const { sim, a } = duel();
  const raw = {
    seq: 1,
    thrust: 999,
    turn: NaN,
    strafe: Infinity,
    fire: "yes",
    weapon: "__proto__",
    x: 999,
    health: 999,
    aim: { x: NaN, z: 0 },
  };
  sim.setInput("a", raw);
  sim.step();
  assert.equal(a.health, 100);
  assert.equal(a.weapon, "LASER");
  assert.equal(a.input.thrust, 1);
  assert.equal(a.input.turn, 0);
  assert.equal(a.input.strafe, 0);
  assert.equal(a.input.aim, null);
  assert.ok(Math.abs(a.x) < 1);
  assert.doesNotThrow(() => sanitizeInput(null));
  const malformed = { toString: null, valueOf: null };
  assert.equal(sanitizeInput({ weapon: malformed }).weapon, "LASER");
  assert.equal(sim.addPlayer("malformed", malformed).name, "Pilot");
});
test("same movement at different render frequencies, normalized diagonal speed, solid arena walls", () => {
  const initial = { alive: true, x: 0, z: 0, vx: 0, vz: 0, angle: 0 };
  const a = { ...initial },
    b = { ...initial },
    c = { ...initial },
    input = sanitizeInput({ thrust: 1, strafe: 1 });
  for (let i = 0; i < 60; i++) movePlayer(a, input, 1 / 60, empty);
  for (let i = 0; i < 144; i++) movePlayer(b, input, 1 / 144, empty);
  for (let i = 0; i < 60; i++)
    movePlayer(c, sanitizeInput({ thrust: 1 }), 1 / 60, empty);
  assert.ok(Math.abs(Math.hypot(a.x, a.z) - c.z) < 1e-6);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.1);
  for (let i = 0; i < 600; i++)
    movePlayer(c, sanitizeInput({ thrust: 1 }), STEP, empty);
  assert.ok(c.z <= 25 - RULES.radius);
  assert.ok(!blocked(c.x, c.z, RULES.radius, empty));
});
test("player collision slides along boxes and never crosses them", () => {
  const map = {
    ...empty,
    obstacles: [{ type: "box", x: 0, z: 3, w: 20, d: 2 }],
  };
  const p = { alive: true, x: 0, z: 0, vx: 0, vz: 0, angle: 0 };
  for (let i = 0; i < 60; i++)
    movePlayer(p, sanitizeInput({ thrust: 1, strafe: 0.3 }), STEP, map);
  assert.ok(p.z < 1.21);
  assert.ok(p.x > 2);
  assert.ok(!blocked(p.x, p.z, RULES.radius, map));
});
test("laser hits exactly once, costs energy, and respects cooldown", () => {
  const { sim, a, b } = duel();
  a.input = sanitizeInput({ aim: { x: b.x, z: b.z } });
  a.aimAngle = 0;
  sim.fire(a);
  sim.fire(a);
  assert.equal(sim.projectiles.size, 1);
  assert.equal(a.energy, 75);
  advance(sim, 0.5);
  assert.equal(b.health, 76);
  assert.equal(sim.projectiles.size, 0);
  assert.equal(sim.drainEvents().filter((e) => e.type === "hit").length, 1);
});
test("laser cannot tunnel through thin cover or hit a ship behind it", () => {
  const { sim, a, b } = duel({
    ...empty,
    obstacles: [{ type: "box", x: 0, z: 0, w: 3, d: 0.1 }],
  });
  a.aimAngle = 0;
  sim.fire(a);
  advance(sim, 0.6);
  assert.equal(b.health, 100);
  assert.equal(sim.projectiles.size, 0);
  assert.ok(traceWalls(0, -10, 0, 20, 0.15, sim.map));
});
test("ricochet reflects from boundary and cover then expires after bounded bounces", () => {
  const { sim, a } = duel();
  a.x = 0;
  a.z = 23;
  a.weapon = "BOUNCE";
  a.aimAngle = 0;
  sim.fire(a);
  advance(sim, 0.12);
  const shot = [...sim.projectiles.values()][0];
  assert.ok(shot);
  assert.equal(shot.bounces, 1);
  assert.ok(shot.vz < 0);
  advance(sim, 3.2);
  assert.equal(sim.projectiles.size, 0);
});
test("grenade arcs to the selected point and damages nearby ships with falloff", () => {
  const { sim, a, b } = duel();
  a.weapon = "GRENADE";
  a.input = sanitizeInput({ aim: { x: 0, z: 8 } });
  a.aimAngle = 0;
  sim.fire(a);
  assert.equal(a.energy, 0);
  advance(sim, 0.5);
  assert.equal(b.health, 100);
  advance(sim, 0.36);
  assert.equal(b.health, 20);
  assert.equal(sim.projectiles.size, 0);
});
test("cover blocks grenade blast and range is capped; close blasts hurt the shooter", () => {
  const { sim, a, b } = duel({
    ...empty,
    obstacles: [{ type: "box", x: 0, z: 0, w: 8, d: 1 }],
  });
  b.z = 2;
  sim.explode({ x: 0, z: -2, owner: "a", weapon: "GRENADE" });
  assert.equal(b.health, 100);
  a.z = -2;
  sim.explode({ x: 0, z: -2, owner: "a", weapon: "GRENADE" });
  assert.equal(a.health, 60);
  a.weapon = "GRENADE";
  a.aimAngle = 0;
  a.input = sanitizeInput({ aim: { x: 0, z: 100 } });
  sim.fire(a);
  const shot = [...sim.projectiles.values()][0];
  assert.ok(
    Math.hypot(shot.targetX - a.x, shot.targetZ - a.z) <= WEAPONS.GRENADE.range,
  );
});
test("every lethal weapon awards one kill, dead players cannot act, and respawn restores state", () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { sim, a, b } = duel();
    sim.damage(b, 100, { owner: a.id, weapon });
    sim.damage(b, 100, { owner: a.id, weapon });
    assert.equal(b.alive, false);
    assert.equal(a.kills, 1);
    assert.equal(b.deaths, 1);
    const before = sim.projectiles.size;
    sim.fire(b);
    assert.equal(sim.projectiles.size, before);
    advance(sim, 3.1);
    assert.equal(b.alive, true);
    assert.equal(b.health, 100);
    assert.equal(b.energy, 100);
    assert.ok(b.protectedUntil > sim.time);
    assert.ok(!blocked(b.x, b.z, RULES.radius, sim.map));
  }
});
test("stale inputs stop movement and firing; older packets cannot replace newer input", () => {
  const { sim, a } = duel();
  sim.setInput("a", { seq: 2, thrust: 1, fire: true });
  sim.setInput("a", { seq: 1, thrust: -1 });
  assert.equal(a.input.thrust, 1);
  advance(sim, 1.5);
  assert.equal(a.input.fire, false);
  assert.ok(Math.abs(a.vz) < 0.01);
});
test("spawn protection prevents damage and ends immediately when firing", () => {
  const { sim, a, b } = duel();
  sim.spawn(b);
  sim.damage(b, 100, { owner: a.id, weapon: "LASER" });
  assert.equal(b.health, 100);
  sim.fire(b);
  assert.equal(b.protectedUntil, 0);
  sim.damage(b, 24, { owner: a.id, weapon: "LASER" });
  assert.equal(b.health, 76);
});
test("frag limit and round timer finish matches and start a fresh round", () => {
  const { sim, a, b } = duel();
  sim.fragLimit = 1;
  sim.damage(b, 100, { owner: a.id, weapon: "LASER" });
  assert.equal(sim.winner, "Alpha");
  assert.ok(sim.restartAt);
  advance(sim, 10.1);
  assert.equal(sim.round, 2);
  assert.equal(a.kills, 0);
  assert.equal(b.alive, true);
  const timed = new Simulation({ roundTime: 0.1 });
  timed.addPlayer("a", "Alpha");
  advance(timed, 0.2);
  assert.ok(timed.restartAt);
});
test("all original arena spawns are clear and four bots can navigate and fight", () => {
  const sim = new Simulation();
  for (let i = 0; i < 4; i++) sim.addPlayer(`b${i}`, `Bot ${i}`, true);
  for (const p of sim.players.values())
    assert.equal(blocked(p.x, p.z, RULES.radius + 0.1, MAP), false);
  const start = [...sim.players.values()].map((p) => ({ x: p.x, z: p.z }));
  let kills = 0;
  for (let i = 0; i < 60 * 40; i++) {
    sim.step();
    kills += sim.drainEvents().filter((e) => e.type === "kill").length;
  }
  assert.ok(kills >= 2, `Expected bots to fight; got ${kills} eliminations`);
  for (const [i, p] of [...sim.players.values()].entries()) {
    assert.ok(!blocked(p.x, p.z, RULES.radius, MAP));
    assert.ok(Math.hypot(p.x - start[i].x, p.z - start[i].z) > 1);
  }
});
test("identical inputs produce identical authoritative and practice simulations", () => {
  const a = duel().sim,
    b = duel().sim;
  for (let i = 1; i <= 300; i++) {
    const input = {
      seq: i,
      thrust: Math.sin(i * 0.1),
      turn: 0.4,
      fire: i % 3 === 0,
      weapon: "BOUNCE",
    };
    a.setInput("a", input);
    b.setInput("a", input);
    a.step();
    b.step();
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
});

// Continuous recharge permits a short burst, but held fire must become energy-limited.
test("weapon economy allows four/five lasers, two bouncers, one grenade then recovers", () => {
  for (const [weapon, duration, expected] of [["LASER",1.1,5],["BOUNCE",1.1,2],["GRENADE",1.1,1]]) {
    const {sim,a}=duel();
    advance(sim,duration,{weapon,fire:true,aim:{x:20,z:-8}});
    assert.equal(a.shotsFired,expected,weapon);
    assert.ok(a.energy < WEAPONS[weapon].cost,weapon);
    advance(sim,5,{weapon,fire:false});
    assert.equal(a.energy,100);
    const before=a.shotsFired;
    advance(sim,STEP,{weapon,fire:true});
    assert.equal(a.shotsFired,before+1);
  }
});
test("grenade range and active grenade limit survive an artificial energy refill", () => {
  const {sim,a}=duel();a.weapon="GRENADE";a.aimAngle=0;
  a.input=sanitizeInput({aim:{x:0,z:100}});sim.fire(a);
  const shot=[...sim.projectiles.values()][0];
  assert.ok(Math.hypot(shot.targetX-a.x,shot.targetZ-a.z)<=20);
  a.energy=100;a.nextFire=0;sim.fire(a);
  assert.equal(sim.projectiles.size,1);
  assert.equal(a.energy,100);
});
