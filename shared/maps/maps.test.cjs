'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LEGACY_MAPS: MAPS, MAP_ROTATION, getMap } = require('./index');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function clearance(o, x, z) {
  return o.type === 'box'
    ? Math.hypot(x - clamp(x, o.x - o.w / 2, o.x + o.w / 2), z - clamp(z, o.z - o.d / 2, o.z + o.d / 2))
    : Math.hypot(x - o.x, z - o.z) - o.r;
}
function clear(map, x, z, radius) {
  return Math.max(Math.abs(x), Math.abs(z)) <= map.size - radius &&
    map.obstacles.every(o => clearance(o, x, z) >= radius - 1e-9);
}
function gap(a, b) {
  if (a.type !== 'box' && b.type === 'box') return gap(b, a);
  if (a.type === 'box' && b.type === 'box') {
    return Math.hypot(Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2),
      Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2));
  }
  return a.type === 'box' ? clearance(a, b.x, b.z) - b.r
    : Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
}
function connected(map, radius) {
  // Half-unit grid; four-way edges also test midpoints so diagonal corner cuts
  // cannot masquerade as usable passages. Radius 2 probes four-unit corridors.
  const step = 0.5;
  const n = map.size * 4 + 1;
  const cells = new Uint8Array(n * n);
  let count = 0, start = -1;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const i = z * n + x;
    if (clear(map, x * step - map.size, z * step - map.size, radius)) {
      cells[i] = 1; count++; start = i;
    }
  }
  assert.ok(count > n * n * 0.5, 'arena must retain substantial playable floor');
  const queue = [start]; cells[start] = 2;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % n, z = Math.floor(i / n);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, next = nz * n + nx;
      if (nx < 0 || nz < 0 || nx >= n || nz >= n || cells[next] !== 1) continue;
      if (!clear(map, (x + dx / 2) * step - map.size, (z + dz / 2) * step - map.size, radius)) continue;
      cells[next] = 2; queue.push(next);
    }
  }
  assert.equal(queue.length, count, `${map.id}: disconnected floor for radius ${radius}`);
  for (const p of map.spawnPoints) {
    const i = Math.round((p.z + map.size) / step) * n + Math.round((p.x + map.size) / step);
    assert.equal(cells[i], 2, 'spawn must be in the connected play space');
  }
}

test('registry has stable IDs, safe fallback, legacy alias, and immutable JSON data', () => {
  assert.ok(Array.isArray(MAPS));
  assert.deepEqual(MAPS.map(map => map.id), [...MAP_ROTATION, 'junction']);
  assert.deepEqual(MAP_ROTATION, ['foundry', 'canopy', 'glacier', 'classic']);
  for (const id of MAP_ROTATION) assert.equal(getMap(id), MAPS.find(map => map.id === id));
  for (const id of [undefined, null, '', 'invalid', '__proto__', 'constructor', {}, ['classic']]) {
    assert.equal(getMap(id), getMap('foundry'));
  }
  assert.equal(getMap('quantum-arena-v1'), getMap('classic'));
  assert.deepEqual(JSON.parse(JSON.stringify(MAPS)), MAPS);
  assert.throws(() => { getMap('foundry').obstacles[0].w = 1; }, TypeError);
  assert.throws(() => { MAP_ROTATION.push('invalid'); }, TypeError);
});

for (const map of MAPS) {
  test(`${map.id}: finite, bounded cover and clear spawn exits`, () => {
    assert.ok(map.size >= 25 && map.size <= 34);
    assert.ok(MAP_ROTATION.includes(map.theme), 'map reuses a supported visual kit');
    assert.ok(map.name && map.subtitle);
    assert.ok(map.spawnPoints.length >= 8);
    for (const o of map.obstacles) {
      assert.ok(['box', 'sphere', 'cylinder'].includes(o.type));
      for (const key of ['x', 'z', 'h', ...(o.type === 'box' ? ['w', 'd'] : ['r'])]) assert.ok(Number.isFinite(o[key]));
      assert.ok(o.h > 0);
      assert.match(o.color, /^#[\da-f]{6}$/i);
      const rx = o.type === 'box' ? o.w / 2 : o.r;
      const rz = o.type === 'box' ? o.d / 2 : o.r;
      assert.ok(rx > 0 && rz > 0);
      assert.ok(Math.abs(o.x) + rx < map.size && Math.abs(o.z) + rz < map.size);
    }
    for (let i = 0; i < map.spawnPoints.length; i++) {
      const p = map.spawnPoints[i];
      assert.ok(clear(map, p.x, p.z, 2), `unsafe spawn ${JSON.stringify(p)}`);
      const exits = [[3, 0], [-3, 0], [0, 3], [0, -3]].filter(([dx, dz]) =>
        [0.25, 0.5, 0.75, 1].every(t => clear(map, p.x + dx * t, p.z + dz * t, 0.8)));
      assert.ok(exits.length >= 2, 'spawn needs multiple usable exits');
      for (const q of map.spawnPoints.slice(i + 1)) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) >= 8);
    }
  });
  test(`${map.id}: all sampled ship movement space and spawns are connected`, () => connected(map, 0.8));
  if (map.id === 'classic') continue; // Preserve legacy geometry, including its narrower gaps.
  test(`${map.id}: four-unit corridors remain connected and every obstacle gap is at least four`, () => {
    connected(map, 2);
    for (let i = 0; i < map.obstacles.length; i++) {
      const o = map.obstacles[i];
      const rx = o.type === 'box' ? o.w / 2 : o.r;
      const rz = o.type === 'box' ? o.d / 2 : o.r;
      assert.ok(map.size - Math.abs(o.x) - rx >= 4 && map.size - Math.abs(o.z) - rz >= 4);
      for (const other of map.obstacles.slice(i + 1)) assert.ok(gap(o, other) >= 4, `${JSON.stringify(o)} too close to ${JSON.stringify(other)}`);
    }
  });
  test(`${map.id}: balanced cover and decorative metadata stays out of collision space`, () => {
    for (const o of map.obstacles) assert.ok(map.obstacles.some(q =>
      q.x === -o.x && q.z === -o.z && q.type === o.type && q.w === o.w && q.d === o.d && q.r === o.r));
    for (const p of map.props) {
      assert.ok(Math.abs(p.x) - p.w / 2 > map.size || Math.abs(p.z) - p.d / 2 > map.size);
    }
    for (const d of map.districts) assert.ok(Math.abs(d.x) + d.w / 2 <= map.size && Math.abs(d.z) + d.d / 2 <= map.size);
  });
}

test('layouts encode different tactical decisions', () => {
  assert.equal(clear(getMap('foundry'), 0, 0, 0.8), false, 'forge interrupts central fire');
  for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) {
    assert.ok(clear(getMap('canopy'), x, z, 0.8), 'court remains open');
  }
  for (let z = -29; z <= 29; z += 0.5) assert.ok(clear(getMap('glacier'), 0, z, 2), 'long relay axis');
  for (let x = -19; x <= 19; x += 0.5) assert.ok(clear(getMap('glacier'), x, 0, 2), 'crossfire lane');
  assert.equal(getMap('classic').obstacles.length, 16);
});
