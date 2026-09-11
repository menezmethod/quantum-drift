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
const { LEGACY_MAPS, getWorld } = require("../../shared/maps/index.js");
const MAPS=[...LEGACY_MAPS,...Array.from({length:4},(_,i)=>getWorld(i))];

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
  assert.equal(found.size, map.obstacles.filter(o=>!o.void).length);
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

test("Verdant dressing stays on its floor or inside authoritative cover footprints", () => {
  const world = new World(new THREE.Scene(), null), map = getWorld(3);
  world.build(map);
  const district = map.districts.find(d => d.id === 'forest');
  const vertices = [];
  const original = world.part;
  world.part = function(shape, material, position, scale, rotation) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    const points = this.geometry[shape].attributes.position;
    for (let i = 0; i < points.count; i++) vertices.push(new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(matrix));
  };
  world.verdantBasin(district);
  world.part = original;
  for (const p of vertices) {
    assert.ok(Math.abs(p.x - district.x) < 30 && Math.abs(p.z - district.z) < 30, 'inside district');
    if (p.y < 0.1) continue;
    assert.ok(map.obstacles.some(o => o.sector === 1 && (o.type === 'box'
      ? Math.abs(p.x - o.x) <= o.w / 2 && Math.abs(p.z - o.z) <= o.d / 2
      : Math.hypot(p.x - o.x, p.z - o.z) <= o.r)), 'raised foliage inside cover');
  }
  world.root.updateMatrixWorld(true);
  for (const pool of world.root.children.filter(o => o.name === 'verdant-pool')) {
    const bounds = new THREE.Box3().setFromObject(pool);
    assert.ok(bounds.min.x > district.x-30 && bounds.max.x < district.x+30 && bounds.min.z > district.z-30 && bounds.max.z < district.z+30);
    assert.ok(bounds.max.y < 0.1);
  }
  world.build(getWorld(0));
  assert.equal(world.root.children.some(o => o.name === 'verdant-pool'), false, 'closed forest has no pools');
  world.dispose();
});


test("radial overview stays ahead of fog at portrait zoom and restores ground fog", async () => {
  const { cameraPose } = await import(`data:text/javascript;base64,${Buffer.from(await readFile(new URL("../view/CameraRig.js", import.meta.url))).toString("base64")}`);
  const world = new World(new THREE.Scene(), null);
  for (let stage = 0; stage < 4; stage++) {
    const map = getWorld(stage);world.build(map);
    for (const aspect of [.25, .46, 1.6]) for (const zoom of [.7, 1]) {
      const camera = new THREE.PerspectiveCamera(55, aspect, .1, 400);
      const pose = cameraPose({player:{x:0,z:0},map,aspect,fov:55,view:2,zoom});
      camera.position.copy(pose.position);camera.lookAt(pose.target.x,0,pose.target.z);camera.updateMatrixWorld();
      world.update(1,.016,camera);
      for (const x of [map.activeBounds.minX,map.activeBounds.maxX]) for (const z of [map.activeBounds.minZ,map.activeBounds.maxZ]) {
        const depth = -new THREE.Vector3(x,0,z).applyMatrix4(camera.matrixWorldInverse).z;
        assert.ok(depth < world.fog.near, 'combat deck is before fog');
      }
      camera.position.y=37;world.update(2,.016,camera);
      assert.equal(world.fog.near,504);assert.equal(world.fog.far,756);
    }
  }
  world.dispose();
});

test("ice surface visual bounds match shared traction bounds and disappear when locked", () => {
  const world = new World(new THREE.Scene(), null);
  for (let stage=0;stage<4;stage++) {
    const map=getWorld(stage);world.build(map);world.root.updateMatrixWorld(true);
    const fields=world.root.children.filter(o=>o.name==='drift-ice');
    assert.equal(fields.length,map.surfaces.length);
    for (const [i,field] of fields.entries()) {
      const s=map.surfaces[i],b=new THREE.Box3().setFromObject(field);
      assert.ok(Math.abs(b.min.x-(s.x-s.rx))<1e-5&&Math.abs(b.max.x-(s.x+s.rx))<1e-5);
      assert.ok(Math.abs(b.min.z-(s.z-s.rz))<1e-5&&Math.abs(b.max.z-(s.z+s.rz))<1e-5);
      assert.ok(b.max.y<.1&&b.min.y>0,'flush surface');
      assert.equal(field.material.transparent,false);
      const {data,width,height}=field.material.map.image;
      let rim=0,center=0,rimCount=0,centerCount=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        const i=(y*width+x)*4,r=Math.hypot(x/(width-1)*2-1,y/(height-1)*2-1);
        assert.equal(data[i+3],255,'opaque ice texel');
        if(r>.94&&r<1){rim+=data[i+1];rimCount++;}
        if(r<.7){center+=data[i+1];centerCount++;}
      }
      assert.ok(rim/rimCount>center/centerCount*1.3,'frost clearly borders darker ice plates');
    }
  }
  world.dispose();
});
