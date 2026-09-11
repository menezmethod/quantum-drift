// This module is used unchanged by Node and the browser. Distances are world units;
// time is seconds. Only inputs cross the trust boundary, never positions or damage.
const {getWorld,stageForHumans,surfaceAt}=require('./maps/world');
const STEP = 1 / 60;
const RULES = Object.freeze({
  radius: 0.8,
  speed: 13,
  turnSpeed: 2.5,
  acceleration: 12,
  energyRegen: 24,
  respawn: 3,
  protection: 1.5,
  roundTime: 300,
  fragLimit: 20,
});
const WEAPONS = Object.freeze({
  LASER: {
    name: "Laser",
    cost: 25,
    cooldown: 0.25,
    speed: 58,
    damage: 24,
    life: 1.4,
    color: "#5eeaff",
  },
  GRENADE: {
    name: "Grenade",
    cost: 100,
    cooldown: 1,
    speed: 22,
    damage: 80,
    radius: 5,
    range: 20,
    life: 0.85,
    color: "#ffae69",
  },
  BOUNCE: {
    name: "Ricochet",
    cost: 50,
    cooldown: 0.5,
    speed: 39,
    damage: 34,
    life: 3,
    bounces: 3,
    color: "#95ff9f",
  },
});
const COLORS = [
  "#5eeaff",
  "#ff7199",
  "#ffc875",
  "#b99aff",
  "#95ff9f",
  "#87aaff",
  "#ff925e",
  "#f4a4ff",
];
const MAP = {
  id: "quantum-arena-v1",
  size: 25,
  obstacles: [
    { type: "box", x: 10, z: 5, w: 2, d: 2, h: 4, color: "#ef577a" },
    { type: "box", x: -8, z: -3, w: 3, d: 3, h: 5, color: "#83eba1" },
    { type: "box", x: 5, z: -8, w: 2.5, d: 2.5, h: 3, color: "#7c91ff" },
    { type: "box", x: -12, z: 8, w: 2, d: 2, h: 4, color: "#ffc875" },
    { type: "box", x: 15, z: -5, w: 3, d: 3, h: 5, color: "#d785ed" },
    { type: "cylinder", x: 0, z: 12, r: 1.5, h: 6, color: "#5eeaff" },
    { type: "cylinder", x: -15, z: 0, r: 1, h: 5, color: "#ffad75" },
    { type: "cylinder", x: 8, z: -12, r: 2, h: 7, color: "#ac91ee" },
    { type: "cylinder", x: -5, z: 15, r: 1.2, h: 4, color: "#fa81b8" },
    { type: "cylinder", x: 18, z: 2, r: 1.8, h: 6, color: "#b7e789" },
    { type: "sphere", x: -10, z: -8, r: 2, h: 4, color: "#ffad75" },
    { type: "sphere", x: 3, z: 18, r: 1.5, h: 3, color: "#83eba1" },
    { type: "sphere", x: -18, z: -5, r: 2.5, h: 5, color: "#7c91ff" },
    { type: "sphere", x: 12, z: -15, r: 1.8, h: 4, color: "#ef577a" },
    { type: "sphere", x: -2, z: -18, r: 1.2, h: 3.6, color: "#5eeaff" },
    { type: "sphere", x: 20, z: 10, r: 2.2, h: 4.4, color: "#ffc875" },
  ],
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const finite = (v, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
function sanitizeInput(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  return {
    seq: clamp(Math.floor(finite(raw.seq)), 0, Number.MAX_SAFE_INTEGER),
    thrust: clamp(finite(raw.thrust), -1, 1),
    strafe: clamp(finite(raw.strafe), -1, 1),
    turn: clamp(finite(raw.turn), -1, 1),
    move: raw.move && Number.isFinite(raw.move.x) && Number.isFinite(raw.move.z)
      ? {x:clamp(raw.move.x,-1,1),z:clamp(raw.move.z,-1,1)} : null,
    fire: raw.fire === true,
    weapon:
      typeof raw.weapon === "string" && Object.hasOwn(WEAPONS, raw.weapon)
        ? raw.weapon
        : "LASER",
    aim:
      raw.aim && Number.isFinite(raw.aim.x) && Number.isFinite(raw.aim.z)
        ? { x: clamp(raw.aim.x, -100, 100), z: clamp(raw.aim.z, -100, 100) }
        : null,
  };
}
function blocked(x, z, radius = RULES.radius, map = MAP) {
  if (Math.abs(x) > map.size - radius || Math.abs(z) > map.size - radius)
    return true;
  return map.obstacles.some((o) =>
    o.type === "box"
      ? Math.hypot(
          x - clamp(x, o.x - o.w / 2, o.x + o.w / 2),
          z - clamp(z, o.z - o.d / 2, o.z + o.d / 2),
        ) < radius
      : Math.hypot(x - o.x, z - o.z) < o.r + radius,
  );
}
// Swept segment tests prevent fast shots tunneling through cover or other ships.
function hitCircle(x, z, dx, dz, cx, cz, r) {
  const ox = x - cx,
    oz = z - cz,
    a = dx * dx + dz * dz;
  if (a < 1e-12) return null;
  const b = ox * dx + oz * dz,
    c = ox * ox + oz * oz - r * r;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const t = c <= 0 ? 0 : (-b - Math.sqrt(disc)) / a;
  if (t < 0 || t > 1) return null;
  const nx = x + dx * t - cx,
    nz = z + dz * t - cz,
    len = Math.hypot(nx, nz) || 1;
  return { t, nx: nx / len, nz: nz / len };
}
function hitBox(x, z, dx, dz, o, radius) {
  let near = -Infinity,
    far = Infinity,
    nx = 0,
    nz = 0;
  for (const [p, d, min, max, axis] of [
    [x, dx, o.x - o.w / 2 - radius, o.x + o.w / 2 + radius, "x"],
    [z, dz, o.z - o.d / 2 - radius, o.z + o.d / 2 + radius, "z"],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < min || p > max) return null;
      continue;
    }
    const a = (min - p) / d,
      b = (max - p) / d,
      entry = Math.min(a, b);
    if (entry > near) {
      near = entry;
      nx = axis === "x" ? -Math.sign(d) : 0;
      nz = axis === "z" ? -Math.sign(d) : 0;
    }
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  if (far < 0 || near > 1) return null;
  return { t: Math.max(0, near), nx, nz };
}
function traceWalls(x, z, dx, dz, radius = 0.15, map = MAP) {
  let best = null;
  const consider = (hit) => {
    if (hit && (!best || hit.t < best.t)) best = hit;
  };
  for (const o of map.obstacles)
    consider(
      o.type === "box"
        ? hitBox(x, z, dx, dz, o, radius)
        : hitCircle(x, z, dx, dz, o.x, o.z, o.r + radius),
    );
  const edge = map.size - radius;
  if (dx > 0 && x + dx >= edge)
    consider({ t: Math.max(0, (edge - x) / dx), nx: -1, nz: 0 });
  if (dx < 0 && x + dx <= -edge)
    consider({ t: Math.max(0, (-edge - x) / dx), nx: 1, nz: 0 });
  if (dz > 0 && z + dz >= edge)
    consider({ t: Math.max(0, (edge - z) / dz), nx: 0, nz: -1 });
  if (dz < 0 && z + dz <= -edge)
    consider({ t: Math.max(0, (-edge - z) / dz), nx: 0, nz: 1 });
  return best;
}
function movePlayer(p, input, dt, map = MAP) {
  if (!p.alive) return;
  p.angle = Math.atan2(
    Math.sin(p.angle + input.turn * RULES.turnSpeed * dt),
    Math.cos(p.angle + input.turn * RULES.turnSpeed * dt),
  );
  const magnitude = Math.max(1, Math.hypot(input.thrust, input.strafe));
  let vx =
    ((Math.sin(p.angle) * input.thrust + Math.cos(p.angle) * input.strafe) /
      magnitude) *
    RULES.speed;
  let vz =
    ((Math.cos(p.angle) * input.thrust - Math.sin(p.angle) * input.strafe) /
      magnitude) *
    RULES.speed;
  if(input.move){
    const length=Math.max(1,Math.hypot(input.move.x,input.move.z));
    vx=input.move.x/length*RULES.speed;vz=input.move.z/length*RULES.speed;
    if(Math.hypot(vx,vz)>.01)p.angle+=angleDiff(Math.atan2(vx,vz),p.angle)*(1-Math.exp(-15*dt));
  }
  const surface = surfaceAt(map,p);
  if (surface?.kind === 'conveyor') {
    vz += surface.pushZ;
    const scale = Math.max(1, Math.hypot(vx,vz) / RULES.speed);
    vx /= scale; vz /= scale;
  }
  const blend = 1 - Math.exp(-RULES.acceleration * (surface?.traction ?? 1) * dt);
  p.vx += (vx - p.vx) * blend;
  p.vz += (vz - p.vz) * blend;
  const steps = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vz) * dt) / 0.3));
  for (let i = 0; i < steps; i++) {
    const x = p.x + (p.vx * dt) / steps,
      z = p.z + (p.vz * dt) / steps;
    if (!blocked(x, p.z, RULES.radius, map)) p.x = x;
    else p.vx = 0;
    if (!blocked(p.x, z, RULES.radius, map)) p.z = z;
    else p.vz = 0;
  }
}
// A small navigation grid lets bots route around the original arena's cover.
function findPath(from, to, map) {
  const step = 2,
    n = Math.floor((map.size * 2) / step),
    center = (i) => -map.size + step / 2 + i * step;
  const cell = (p) => [
    clamp(Math.floor((p.x + map.size) / step), 0, n - 1),
    clamp(Math.floor((p.z + map.size) / step), 0, n - 1),
  ];
  const [sx, sz] = cell(from),
    [tx, tz] = cell(to),
    start = sz * n + sx,
    goal = tz * n + tx;
  const queue = [start],
    parent = new Map([[start, null]]);
  let reached = start,
    closest = Infinity;
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head],
      x = id % n,
      z = Math.floor(id / n),
      d = Math.hypot(tx - x, tz - z);
    if (d < closest) {
      reached = id;
      closest = d;
    }
    if (id === goal) break;
    for (const [nx, nz] of [
      [x - 1, z],
      [x + 1, z],
      [x, z - 1],
      [x, z + 1],
    ]) {
      const next = nz * n + nx;
      if (
        nx < 0 ||
        nz < 0 ||
        nx >= n ||
        nz >= n ||
        parent.has(next) ||
        blocked(center(nx), center(nz), 1.05, map)
      )
        continue;
      if (
        traceWalls(
          center(x),
          center(z),
          (nx - x) * step,
          (nz - z) * step,
          RULES.radius,
          map,
        )
      )
        continue;
      parent.set(next, id);
      queue.push(next);
    }
  }
  const path = [];
  for (let id = reached; id !== start && id != null; id = parent.get(id))
    path.unshift({ x: center(id % n), z: center(Math.floor(id / n)) });
  return path;
}
class Simulation {
  constructor({
    map = MAP,
    roundTime = RULES.roundTime,
    fragLimit = RULES.fragLimit,
    mapRotation = [],
    populationExpansion = true,
  } = {}) {
    this.map = map;
    this.populationExpansion=populationExpansion;
    this.expansionSince=null;
    this.expansionTarget=0;
    this.mapRotation = mapRotation;
    this.departed = new Map();
    this.recap = null;
    this.winnerId = null;
    this.players = new Map();
    this.projectiles = new Map();
    this.events = [];
    this.time = 0;
    this.tick = 0;
    this.nextId = 0;
    this.round = 1;
    this.roundTime = roundTime;
    this.fragLimit = fragLimit;
    this.roundEndsAt = roundTime;
    this.restartAt = 0;
    this.winner = null;
  }
  emit(type, data) {
    this.events.push({ id: ++this.nextId, type, ...data });
  }
  addPlayer(id, name, bot = false, restore = null) {
    if (this.players.has(id)) return this.players.get(id);
    const used = new Set([...this.players.values()].map((p) => p.color));
    const p = {
      id,
      name:
        (typeof name === "string" ? name : "Pilot")
          .replace(/[\u0000-\u001f<>]/g, "")
          .trim()
          .slice(0, 18) || "Pilot",
      bot,
      color: COLORS.find((c) => !used.has(c)) || COLORS[0],
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      angle: 0,
      aimAngle: 0,
      health: 100,
      energy: 100,
      alive: true,
      kills: 0,
      deaths: 0,
      damageDealt: 0, shotsFired: 0, shotsHit: 0,
      weapon: "LASER",
      nextFire: 0,
      respawnAt: 0,
      protectedUntil: 0,
      lastDamage: -100,
      input: sanitizeInput(),
      ack: 0,
      lastInput: this.time,
      path: [],
      navigateAt: 0,
    };
    this.players.set(id, p);
    if(restore){
      for(const key of ['name','x','z','angle','aimAngle','health','energy','alive','kills','deaths','damageDealt','shotsFired','shotsHit','weapon','nextFire','respawnAt','protectedUntil','lastDamage'])p[key]=restore[key];
    }else this.spawn(p);
    return p;
  }
  removePlayer(id) {
    const player = this.players.get(id);
    if (player && !player.bot) this.departed.set(id, {...player});
    this.players.delete(id);
    for (const [key, shot] of this.projectiles)
      if (shot.owner === id) this.projectiles.delete(key);
  }
  spawn(p) {
    let best = null,
      score = -Infinity;
    const candidates = [...(this.map.spawnPoints || [])];
    for (let x = -this.map.size + 3; x <= this.map.size - 3; x += 4)
      for (let z = -this.map.size + 3; z <= this.map.size - 3; z += 4) candidates.push({x,z});
    for (const {x,z} of candidates) {
        if (blocked(x, z, RULES.radius + 0.4, this.map) || surfaceAt(this.map,{x,z})) continue;
        const other = [...this.players.values()].filter(
          (q) => q.id !== p.id && q.alive,
        );
        const separation = other.length
          ? Math.min(...other.map((q) => Math.hypot(x - q.x, z - q.z)))
          : 20 - Math.hypot(x + 10, z + 14);
        if (separation > score) {
          score = separation;
          best = { x, z };
        }
      }
    Object.assign(p, best || { x: 0, z: 0 }, {
      vx: 0,
      vz: 0,
      health: 100,
      energy: 100,
      alive: true,
      respawnAt: 0,
      protectedUntil: this.time + RULES.protection,
      nextFire: this.time,
      input: sanitizeInput(),
      lastInput: this.time,
      path: [],
      navigateAt: 0,
    });
    p.angle = Math.atan2(-p.x, -p.z);
    p.aimAngle = p.angle;
    this.emit("spawn", { player: p.id, x: p.x, z: p.z });
  }
  setInput(id, raw) {
    const p = this.players.get(id);
    if (!p) return;
    const input = sanitizeInput(raw);
    if (input.seq <= p.ack) return;
    p.input = input;
    p.ack = input.seq;
    p.lastInput = this.time;
  }
  botInput(p) {
    const targets = [...this.players.values()].filter(
      (q) => q.id !== p.id && q.alive,
    );
    targets.sort((a, b) => distance(p, a) - distance(p, b));
    const target = targets[0];
    if (!target) return sanitizeInput();
    const d = distance(p, target),
      los = !traceWalls(
        p.x,
        p.z,
        target.x - p.x,
        target.z - p.z,
        0.2,
        this.map,
      );
    let waypoint = target;
    if (!los) {
      if (this.time >= p.navigateAt) {
        p.path = findPath(p, target, this.map);
        p.navigateAt = this.time + 0.6;
      }
      while (p.path.length && distance(p, p.path[0]) < 1.2) p.path.shift();
      waypoint = p.path[0] || target;
    }
    const heading = Math.atan2(waypoint.x - p.x, waypoint.z - p.z),
      turn = clamp(angleDiff(heading, p.angle) * 3, -1, 1);
    const aimNoise = Math.sin(this.time * 1.8 + p.color.charCodeAt(2)) * 1.7;
    const weapon =
      Math.floor(this.time / 7 + p.color.charCodeAt(1)) % 5 === 0 && d < 23
        ? "GRENADE"
        : "LASER";
    return {
      seq: 0,
      thrust: los && d < 10 ? -0.4 : Math.abs(turn) < 0.8 ? 0.7 : 0.2,
      strafe: los && d < 17 ? Math.sin(this.time + p.x) * 0.45 : 0,
      turn,
      fire:
        los &&
        d < 30 &&
        target.protectedUntil < this.time &&
        Math.sin(this.time * 2) > -0.5,
      weapon,
      aim: {
        x: target.x + (target.vx * d) / 65 + aimNoise,
        z: target.z + (target.vz * d) / 65 + aimNoise,
      },
    };
  }
  fire(p) {
    const w = WEAPONS[p.weapon];
    if (this.time < p.nextFire || p.energy < w.cost || !p.alive) return;
    if (p.weapon === "GRENADE" && [...this.projectiles.values()].some(shot => shot.owner === p.id && shot.weapon === "GRENADE")) return;
    p.nextFire = this.time + w.cooldown;
    p.energy -= w.cost;
    p.shotsFired++;
    p.protectedUntil = 0;
    const dx = Math.sin(p.aimAngle),
      dz = Math.cos(p.aimAngle);
    const shot = {
      id: `s${++this.nextId}`,
      owner: p.id,
      weapon: p.weapon,
      x: p.x,
      z: p.z,
      vx: dx * w.speed,
      vz: dz * w.speed,
      age: 0,
      bounces: 0,
    };
    if (p.weapon === "GRENADE") {
      const range = p.input.aim
        ? Math.min(distance(p, p.input.aim), w.range)
        : 16;
      shot.startX = p.x;
      shot.startZ = p.z;
      shot.targetX = clamp(
        p.x + dx * range,
        -this.map.size + 0.5,
        this.map.size - 0.5,
      );
      shot.targetZ = clamp(
        p.z + dz * range,
        -this.map.size + 0.5,
        this.map.size - 0.5,
      );
    }
    this.projectiles.set(shot.id, shot);
    this.emit("fire", { player: p.id, weapon: p.weapon, x: p.x, z: p.z });
  }
  damage(target, amount, shot) {
    if (!target.alive || target.protectedUntil > this.time || this.restartAt)
      return;
    const damage = Math.min(target.health, amount);
    target.health -= damage;
    target.lastDamage = this.time;
    const attacker = this.players.get(shot.owner);
    if (attacker && attacker.id !== target.id && damage > 0) {
      attacker.damageDealt += damage;
      if (!shot.countedHit) { attacker.shotsHit++; shot.countedHit = true; }
    }
    this.emit("hit", {
      player: target.id,
      attacker: shot.owner,
      damage,
      x: target.x,
      z: target.z,
    });
    if (target.health > 0) return;
    target.alive = false;
    target.deaths++;
    target.vx = target.vz = 0;
    target.respawnAt = this.time + RULES.respawn;
    const killer = this.players.get(shot.owner);
    if (killer && killer.id !== target.id) killer.kills++;
    this.emit("kill", {
      killer: killer?.name || "Disconnected pilot",
      victim: target.name,
      player: target.id,
      attacker: shot.owner,
      weapon: shot.weapon,
      x: target.x,
      z: target.z,
    });
    if (killer && killer.kills >= this.fragLimit) this.endRound();
  }
  explode(shot) {
    const w = WEAPONS.GRENADE;
    this.emit("explosion", { x: shot.x, z: shot.z, radius: w.radius });
    for (const p of this.players.values()) {
      const d = distance(p, shot);
      if (d >= w.radius) continue;
      if (traceWalls(shot.x, shot.z, p.x - shot.x, p.z - shot.z, 0, this.map))
        continue;
      this.damage(
        p,
        Math.round(
          w.damage * (1 - d / w.radius) * (p.id === shot.owner ? 0.5 : 1),
        ),
        shot,
      );
    }
  }
  updateTerritory() {
    if(this.map.id!=='confluence'||!this.populationExpansion)return;
    const target=stageForHumans([...this.players.values()].filter(p=>!p.bot).length);
    if(target<=this.map.stage){this.expansionSince=null;return;}
    if(this.expansionSince===null||target!==this.expansionTarget){this.expansionSince=this.time;this.expansionTarget=target;}
    if(this.time-this.expansionSince>=5){
      this.map=getWorld(target);this.expansionSince=null;
      for(const p of this.players.values()){p.path=null;p.navigateAt=0;}
      this.emit('mapChanged',{map:this.map,announcement:this.map.districts.filter(z=>z.open).map(z=>z.name).join(' · ')+' open'});
    }
  }
  step(dt = STEP) {
    this.time += dt;
    this.tick++;
    if (this.restartAt) {
      if (this.time >= this.restartAt) this.newRound();
      return;
    }
    if (this.time >= this.roundEndsAt) {
      this.endRound();
      return;
    }
    this.updateTerritory();
    for (const p of this.players.values()) {
      if (!p.alive) {
        if (this.time >= p.respawnAt) this.spawn(p);
        continue;
      }
      if (p.bot) p.input = this.botInput(p);
      else if (this.time - p.lastInput > 0.3)
        p.input = { ...sanitizeInput(), weapon: p.weapon };
      movePlayer(p, p.input, dt, this.map);
      p.weapon = p.input.weapon;
      p.aimAngle = p.input.aim
        ? Math.atan2(p.input.aim.x - p.x, p.input.aim.z - p.z)
        : p.angle;
      p.energy = Math.min(100, p.energy + RULES.energyRegen * dt);
      if (this.time - p.lastDamage > 5)
        p.health = Math.min(100, p.health + 4 * dt);
      if (p.input.fire) this.fire(p);
    }
    for (const [id, shot] of this.projectiles) {
      if (this.restartAt) break;
      const w = WEAPONS[shot.weapon];
      shot.age += dt;
      if (shot.weapon === "GRENADE") {
        const t = Math.min(1, shot.age / w.life);
        shot.x = shot.startX + (shot.targetX - shot.startX) * t;
        shot.z = shot.startZ + (shot.targetZ - shot.startZ) * t;
        if (t >= 1) {
          this.explode(shot);
          this.projectiles.delete(id);
        }
        continue;
      }
      if (shot.age > w.life) {
        this.projectiles.delete(id);
        continue;
      }
      let remaining = dt;
      for (let iteration = 0; iteration < 5 && remaining > 0; iteration++) {
        const dx = shot.vx * remaining,
          dz = shot.vz * remaining;
        let hit = traceWalls(shot.x, shot.z, dx, dz, 0.15, this.map),
          victim = null;
        for (const p of this.players.values()) {
          if (!p.alive || p.id === shot.owner || p.protectedUntil > this.time)
            continue;
          const candidate = hitCircle(
            shot.x,
            shot.z,
            dx,
            dz,
            p.x,
            p.z,
            RULES.radius + 0.15,
          );
          if (candidate && (!hit || candidate.t < hit.t)) {
            hit = candidate;
            victim = p;
          }
        }
        shot.x += dx * (hit ? hit.t : 1);
        shot.z += dz * (hit ? hit.t : 1);
        if (!hit) break;
        if (victim) {
          this.damage(victim, w.damage, shot);
          this.projectiles.delete(id);
          break;
        }
        if (shot.weapon === "BOUNCE" && shot.bounces < w.bounces) {
          const dot = shot.vx * hit.nx + shot.vz * hit.nz;
          shot.vx -= 2 * dot * hit.nx;
          shot.vz -= 2 * dot * hit.nz;
          shot.bounces++;
          shot.x += hit.nx * 0.02;
          shot.z += hit.nz * 0.02;
          remaining *= 1 - hit.t;
          this.emit("bounce", { x: shot.x, z: shot.z, nx: hit.nx, nz: hit.nz, weapon: shot.weapon });
        } else {
          this.emit("impact", { x: shot.x, z: shot.z, weapon: shot.weapon });
          this.projectiles.delete(id);
          break;
        }
      }
    }
  }
  endRound() {
    const sorted = [...this.players.values()].sort(
      (a, b) => b.kills - a.kills || a.deaths - b.deaths,
    );
    if (this.restartAt) return;
    this.winner = sorted[0]?.name || "Nobody";
    this.winnerId = sorted[0]?.id || null;
    const participants = [...this.departed.values(), ...this.players.values()];
    this.recap = {round:this.round,mapId:this.map.id,winnerId:this.winnerId,winner:this.winner,players:participants.map(p=>({
      id:p.id,profileId:p.profileId,name:p.name,bot:p.bot,kills:p.kills,deaths:p.deaths,damageDealt:Math.round(p.damageDealt),shotsFired:p.shotsFired,shotsHit:p.shotsHit,
      accuracy:p.shotsFired?Math.round(p.shotsHit/p.shotsFired*100):0,
      score:Math.max(0,p.kills*100+Math.floor(p.damageDealt*.2)-p.deaths*25+(this.winnerId===p.id?250:0)),
      xp:Math.max(25,25+p.kills*40+Math.floor(p.damageDealt/10)+(this.winnerId===p.id?150:0))
    }))};
    this.restartAt = this.time + 10;
    this.projectiles.clear();
    this.emit("roundEnd", { winner: this.winner, recap:this.recap });
  }
  newRound() {
    this.round++;
    this.recap = null; this.winnerId = null; this.departed.clear();
    if(this.map.id==='confluence'){
      if(this.populationExpansion)this.map=getWorld(stageForHumans([...this.players.values()].filter(p=>!p.bot).length));
      this.expansionSince=null;this.emit('mapChanged',{map:this.map});
    } else if (this.mapRotation.length) {
      const index = this.mapRotation.findIndex(map => map.id === this.map.id);
      this.map = this.mapRotation[(index + 1) % this.mapRotation.length];
      this.emit("mapChanged", {map:this.map});
    }
    this.restartAt = 0;
    this.winner = null;
    this.roundEndsAt = this.time + this.roundTime;
    this.projectiles.clear();
    for (const p of this.players.values()) {
      p.kills = p.deaths = p.damageDealt = p.shotsFired = p.shotsHit = 0;
      p.alive = false;
    }
    for (const p of this.players.values()) this.spawn(p);
  }
  snapshot() {
    return {
      mapId:this.map.id,
      mapStage:this.map.stage,
      recap:this.recap,
      tick: this.tick,
      time: this.time,
      round: this.round,
      roundEndsAt: this.roundEndsAt,
      restartAt: this.restartAt,
      winner: this.winner,
      fragLimit: this.fragLimit,
      players: [...this.players.values()].map(
        ({ input, path, navigateAt, lastInput, ...p }) => ({ ...p }),
      ),
      projectiles: [...this.projectiles.values()].map((p) => ({ ...p })),
    };
  }
  drainEvents() {
    return this.events.splice(0);
  }
}
module.exports = {
  Simulation,
  MAP,
  RULES,
  WEAPONS,
  COLORS,
  STEP,
  sanitizeInput,
  movePlayer,
  blocked,
  traceWalls,
  hitCircle,
  angleDiff,
  clamp,
  findPath,
};
