import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as THREE from "three";

// The application uses webpack ES modules inside a CommonJS package. Import
// the module directly for headless geometry checks without changing root config.
const require = createRequire(import.meta.url);
const threeURL = pathToFileURL(require.resolve("three").replace("three.cjs", "three.module.js")).href;
const source = (await readFile(new URL("./World.js", import.meta.url), "utf8")).replace('from "three"', `from "${threeURL}"`);
const { World } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const { MAPS } = require("../../shared/maps/index.js");

for (const map of MAPS) test(`${map.id}: exact primary collision cover, bounded geometry and draw submissions`, () => {
  const scene = new THREE.Scene(), world = new World(scene, null);
  const root = world.build(map);
  assert.equal(root, world.root);
  assert.equal(root.parent, scene);
  const found = new Set();
  let draws = 0, triangles = 0;
  root.traverse(object => {
    if (!(object.isMesh || object.isPoints)) return;
    draws++;
    if(object.userData.cover?.length)assert.equal(object.castShadow,true);
    if(object.material?.transparent)assert.equal(object.castShadow,false);
    if (object.isMesh) triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    const array = object.geometry.attributes.position.array;
    assert.ok(array.every(Number.isFinite), `${object.name}: finite vertices`);
    for (const entry of object.userData.cover || []) {
      assert.ok(!found.has(entry.obstacle));
      found.add(entry.obstacle);
      const o = map.obstacles[entry.obstacle], matrix = new THREE.Matrix4();
      object.getMatrixAt(entry.instance, matrix);
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox.clone().applyMatrix4(matrix);
      const width = o.type === "box" ? o.w : o.r * 2;
      const depth = o.type === "box" ? o.d : o.r * 2;
      const actual = [...bounds.min.toArray(), ...bounds.max.toArray()];
      const expected = [o.x - width / 2, 0, o.z - depth / 2, o.x + width / 2, o.h, o.z + depth / 2];
      actual.forEach((n, i) => assert.ok(Math.abs(n - expected[i]) < 0.00001, `cover ${entry.obstacle}, bound ${i}: ${n} vs ${expected[i]}`));
      assert.equal(object.material.transparent, false);
    }
  });
  assert.equal(found.size, map.obstacles.length);
  assert.ok(draws <= 150, `${draws} environment draw submissions`);
  assert.ok(triangles < 100000, `${triangles} triangles`);
  assert.equal(root.userData.environmentDrawCalls, draws);
  console.log(`${map.id}: ${draws} scene draw submissions, ${triangles} mesh triangles (not GPU telemetry)`);
  world.dispose();
});

test("day/dusk/night change real lighting, persist across builds and retain readable cover", () => {
  const scene = new THREE.Scene(), world = new World(scene, null);
  world.setTimeOfDay("night");
  world.build(MAPS[0]);
  const states = [];
  for (const time of ["day", "dusk", "night"]) {
    world.setTimeOfDay(time);
    states.push([world.sun.intensity, world.hemisphere.intensity, scene.background.getHex()]);
    assert.ok(world.hemisphere.intensity >= 1);
    world.setShowcase("world");
    world.update(1, 0.016);
    assert.equal(world.root.visible, true);
  }
  assert.equal(new Set(states.map(s => JSON.stringify(s))).size, 3);
  world.build(MAPS[1]);
  assert.equal(world.timeOfDay, "night");
  assert.equal(world.sun.intensity, states[2][0]);
  world.dispose();
});

test("rebuild and disposal release owned GPU resources once and preserve unrelated scene objects", () => {
  const scene = new THREE.Scene();
  const background = new THREE.Color("red"), fog = new THREE.Fog("red", 5, 50);
  scene.background = background;
  scene.fog = fog;
  const unrelated = new THREE.Group();
  scene.add(unrelated);
  const world = new World(scene, null);
  world.build(MAPS[0]);
  const disposed = new Map();
  for (const resource of world.resources) resource.addEventListener("dispose", () => disposed.set(resource, (disposed.get(resource) || 0) + 1));
  const resourceCount = world.resources.size;
  world.build(MAPS[1]);
  assert.equal(disposed.size, resourceCount);
  assert.ok([...disposed.values()].every(count => count === 1));
  assert.equal(scene.children.filter(o => o.name === "world").length, 1);
  world.dispose();
  world.dispose();
  assert.equal(world.resources.size, 0);
  assert.deepEqual(scene.children, [unrelated]);
  assert.equal(scene.background, background);
  assert.equal(scene.fog, fog);
});

test("invalid map input leaves the existing world intact; unknown IDs use Foundry theming", () => {
  const world = new World(new THREE.Scene(), null);
  world.build({ id: "custom", size: 25, obstacles: [] });
  assert.equal(world.theme, "foundry");
  const children = [...world.root.children];
  assert.throws(() => world.build({ size: 25, obstacles: [{ type: "box", x: 0, z: 0, w: Infinity, d: 1, h: 1 }] }), /Invalid cover/);
  assert.deepEqual(world.root.children, children);
  world.dispose();
  assert.throws(() => world.build(MAPS[0]), /disposed/);
});
