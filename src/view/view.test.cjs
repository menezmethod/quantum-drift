const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const THREE = require('three');
let CameraRig, cameraPose, ShipIndicators, hullState;
before(async () => {
  const cameraSource = await fs.readFile(path.join(__dirname, 'CameraRig.js'), 'utf8');
  ({ CameraRig, cameraPose } = await import(`data:text/javascript;base64,${Buffer.from(cameraSource).toString('base64')}`));
  const threeURL = pathToFileURL(path.resolve(require.resolve('three'), '../../build/three.module.js')).href;
  const indicatorSource = (await fs.readFile(path.join(__dirname, 'ShipIndicators.js'), 'utf8')).replace("from 'three'", `from '${threeURL}'`).replace("import './indicators.css';", '');
  ({ ShipIndicators, hullState } = await import(`data:text/javascript;base64,${Buffer.from(indicatorSource).toString('base64')}`));
});
const player = { id: 'p', name: 'Pilot', x: 0, z: 0, angle: 0, vx: 0, vz: 0, health: 100, alive: true };
test('arena view ignores turning, velocity and cursor position', () => {
  const a = cameraPose({ player });
  const b = cameraPose({ player: { ...player, angle: 2.8, vx: 1000, vz: 1000 }, aim: { x: 1e6, z: 1e6 } });
  assert.deepEqual(b,a);
  for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs((a.position[axis] - a.target[axis]) - (b.position[axis] - b.target[axis])) < 1e-10);
});
test('zoom clamps, wall framing retains pilot, all presets produce finite matrices', () => {
  assert.equal(cameraPose({ zoom: -100 }).zoom, 0.7);
  assert.equal(cameraPose({ zoom: 100 }).zoom, 1.5);
  for (const view of [0, 1, 2, 3]) for (const aspect of [0.55, 1, 2.4]) {
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 250);
    new CameraRig(camera).update({ player: { ...player, x: 24, z: 24 }, view, map: { size: 25 } });
    assert.ok(camera.matrixWorld.elements.every(Number.isFinite));
    if (view === 0 || view === 3) {
      const projected = new THREE.Vector3(24, 0.9, 24).project(camera);
      assert.ok(Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9);
    }
  }
});
test('overview fits every ground corner across map sizes and aspect ratios', () => {
  for (const size of [25, 34]) for (const aspect of [0.55, 1, 2.4]) {
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 250);
    new CameraRig(camera).update({ player, map: { size }, view: 2 });
    for (const x of [-size, size]) for (const z of [-size, size]) {
      const p = new THREE.Vector3(x, 0, z).project(camera);
      assert.ok(Math.abs(p.x) <= 0.87 && Math.abs(p.y) <= 0.79);
    }
  }
});
test('damping is frame-rate independent and reset / teleport snaps', () => {
  const run = hz => {
    const c = new THREE.PerspectiveCamera();
    const rig = new CameraRig(c);
    rig.update({ player });
    for (let i = 0; i < hz; i++) rig.update({ player: { ...player, x: 5 }, dt: 1 / hz });
    return { c, rig };
  };
  const a = run(30), b = run(120);
  assert.ok(a.c.position.distanceTo(b.c.position) < 1e-8);
  a.rig.update({ player: { ...player, x: -20 }, dt: 0 });
  assert.ok(Math.abs(a.c.position.x - cameraPose({ player: { ...player, x: -20 }, aspect: a.c.aspect, fov: a.c.fov }).position.x) < 1e-8);
  a.rig.reset();
  a.rig.setPreset('chase');
  a.rig.update({ player, dt: 0 });
  assert.equal(a.c.position.y, 18);
  assert.throws(() => a.rig.setPreset('invalid'), RangeError);
});
class Element {
  constructor(doc) { this.ownerDocument = doc; this.children = []; this.dataset = {}; this.attributes = {}; this.style = { setProperty: (k, v) => this.style[k] = v }; this.hidden = false; }
  append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
  appendChild(node) { this.append(node); }
  setAttribute(k, v) { this.attributes[k] = v; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); }
  getBoundingClientRect() { return this.rect || { left: 0, top: 0, right: 1000, bottom: 800 }; }
  getClientRects() { return [this.getBoundingClientRect()]; }
}
const fixture = () => {
  const doc = { createElement: () => new Element(doc), querySelectorAll: () => [] };
  const container = new Element(doc);
  const indicators = new ShipIndicators(container);
  const camera = new THREE.PerspectiveCamera(60, 1.25, 0.1, 250);
  camera.position.set(0, 32, -14); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return { doc, container, indicators, args: { players: [player], localId: 'p', camera, width: 1000, height: 800, time: 10 } };
};
test('hull segments represent partial damage; protection is time based, never energy', () => {
  assert.deepEqual(hullState({ health: 82, energy: 100, protectedUntil: 12 }, 10), { percent: 82, protected: true });
  assert.equal(hullState({ health: 100, protectedUntil: 10 }, 10).protected, false);
  const { indicators, args } = fixture();
  indicators.update({ ...args, players: [{ ...player, health: 82, protectedUntil: 12, name: '<img onerror=bad>' }] });
  const e = indicators.entries.get('p');
  assert.equal(e.node.hidden, false);
  assert.equal(e.name.textContent, 'YOU · <img onerror=bad>');
  assert.equal(e.segments[8].style['--fill'], '20%');
  assert.equal(e.shield.hidden, false);
  indicators.update({ ...args, players: [{ ...player, energy: 100, protectedUntil: 10 }] });
  assert.equal(e.shield.hidden, true);
});
test('uses rendered ship positions, hides offscreen, removes dead and departed nodes', () => {
  const { indicators, args, container } = fixture();
  indicators.update(args);
  const first = indicators.entries.get('p').node.style.transform;
  indicators.update({ ...args, players: [{ ...player, x: 10000, renderPosition: { x: 0, y: 0.9, z: 0 } }] });
  assert.equal(indicators.entries.get('p').node.style.transform, first);
  indicators.update({ ...args, players: [{ ...player, x: 10000 }] });
  assert.equal(indicators.entries.get('p').node.hidden, true);
  indicators.update({ ...args, players: [{ ...player, alive: false }] });
  assert.equal(indicators.entries.size, 0);
  indicators.update(args);
  indicators.update({ ...args, players: [] });
  assert.equal(indicators.entries.size, 0);
  indicators.dispose(); indicators.dispose();
  assert.equal(container.children.length, 0);
});
test('avoids HUD and overlapping labels, with local priority', () => {
  const { indicators, args, doc } = fixture();
  indicators.update({ ...args, players: [{ ...player, id: 'other' }, player] });
  const local = indicators.entries.get('p').node;
  const other = indicators.entries.get('other').node;
  assert.equal(local.hidden, false);
  assert.notEqual(local.style.transform, other.style.transform);
  const hud = new Element(doc);
  doc.querySelectorAll = () => [hud];
  indicators.update(args);
  assert.equal(local.hidden, true);
});
