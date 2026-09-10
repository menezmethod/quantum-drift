import * as THREE from "three";

// No texture fetches, DOM, postprocessing or renderer configuration mutations.
// All repeated architecture is collected into static geometry/material batches.
const TAU = Math.PI * 2;
const PALETTES = {
  foundry: { floor: "#343d44", seam: "#242c33", body: "#52616c", cap: "#8d999d", dark: "#202e39", accent: "#e59c50", glow: "#ffb75e", secondary: "#89b9c4", sky: "#111c2c", ground: "#38303a" },
  canopy: { floor: "#445d59", seam: "#344a46", body: "#b1b7a5", cap: "#d0d8bd", dark: "#314e48", accent: "#659b76", glow: "#a7f2c3", secondary: "#d4bd79", sky: "#192d36", ground: "#30433b" },
  glacier: { floor: "#627d8b", seam: "#506d7c", body: "#b4d0d5", cap: "#e0e9e4", dark: "#384e64", accent: "#7495ac", glow: "#a2e4ed", secondary: "#eab377", sky: "#26374c", ground: "#424e6a" },
};

function themeFor(map) {
  if (PALETTES[map.id]) return map.id;
  const hint = typeof map.theme === "string" ? map.theme : map.theme?.id;
  if (PALETTES[hint]) return hint;
  return "foundry";
}

// Small deterministic material map: broad offset panels, inset seams, machining
// and mineral/organic grain. No high-contrast checkerboard or animated floor.
function surfaceTexture(theme, palette) {
  const n = 256, data = new Uint8Array(n * n * 4);
  const base = new THREE.Color(palette.floor).getHex();
  const rgb = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const row = Math.floor(y / 128), px = (x + row * 64) % 128;
    const seam = px < 2 || y % 128 < 2;
    const grain = ((x * 73 + y * 151 + x * y * 7) % 23) / 23 - 0.5;
    let value = seam ? -11 : grain * (theme === "glacier" ? 5 : 3);
    if (theme === "foundry" && y % 16 === 0 && px > 14 && px < 114) value -= 2;
    if (theme === "glacier") value += Math.sin(x * 0.037 + Math.sin(y * 0.026) * 3) * 3;
    if (theme === "canopy") value += Math.sin(x * 0.02 + y * 0.009) * 3;
    const i = (y * n + x) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, rgb[c] + value));
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, n, n);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// A curved lanceolate leaf with a raised midrib: recognizable foliage, rather
// than green spheres. Low poly geometry is intentional for software rendering.
function leafGeometry() {
  const points = [], indices = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4, width = Math.sin(t * Math.PI) * 0.46;
    const lift = Math.sin(t * Math.PI) * 0.18 - t * t * 0.22;
    points.push(-width, lift, t, 0, lift + width * 0.27, t, width, lift, t);
    if (i < 4) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function contactTexture(round) {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = Math.abs((x + 0.5) / size * 2 - 1), v = Math.abs((y + 0.5) / size * 2 - 1);
    const distance = round ? Math.hypot(u, v) : Math.pow(u ** 8 + v ** 8, 1 / 8);
    const t = THREE.MathUtils.clamp((1 - distance) / 0.5, 0, 1);
    const i = (y * size + x) * 4;
    pixels[i] = 8; pixels[i + 1] = 13; pixels[i + 2] = 18;
    pixels[i + 3] = Math.round(t * t * (3 - 2 * t) * 180);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Neutral albedo relief, authored in UV space: darker foot, worn upper bevel,
// sparse seam/screw marks. Palette still comes from the material, not noise.
function claddingTexture(theme) {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const edge = Math.min(x, size - 1 - x, y, size - 1 - y);
    const grain = ((x * 29 + y * 47 + x * y) % 11) - 5;
    let value = 174 + y / size * 53 + grain;
    if (edge < 2) value = 241 + grain;
    else if (edge < 5) value = 119 + grain;
    if (theme === "foundry" && (x === 19 || x === 108) && y > 12 && y < 112) value -= 29;
    if (theme === "canopy") value -= Math.max(0, Math.sin(x * 0.19 + y * 0.007)) * Math.max(0, 22 - y * 0.25);
    if (theme === "glacier") value += Math.sin(x * 0.064 + y * 0.13) * 9;
    const bolt = [10, 117].includes(x) && [10, 117].includes(y);
    if (bolt) value = 66;
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = THREE.MathUtils.clamp(value, 0, 255);
    pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// A continuous serrated ice escarpment section, with stratified sloped faces.
function cliffGeometry() {
  const positions = [], indices = [];
  const heights = [0.42, 0.68, 0.56, 1, 0.84, 0.94, 0.55, 0.72, 0.36];
  for (let i = 0; i < heights.length; i++) {
    const x = i / (heights.length - 1) - 0.5, h = heights[i];
    positions.push(x, 0, -0.5, x, h * 0.32, -0.37, x, h, 0.06, x, h * 0.8, 0.5, x, 0, 0.5);
    if (i < heights.length - 1) for (let j = 0; j < 4; j++) {
      const a = i * 5 + j;
      indices.push(a, a + 1, a + 5, a + 1, a + 6, a + 5);
    }
  }
  // End caps keep the escarpment solid from both tactical camera directions.
  indices.push(0, 4, 2, 0, 2, 1, 2, 4, 3, 40, 42, 44, 40, 41, 42, 42, 43, 44);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.root = new THREE.Group();
    this.root.name = "world";
    scene.add(this.root);
    this.timeOfDay = "dusk";
    this.showcase = null;
    this.resources = new Set();
    this.batches = new Map();
    this.previousBackground = scene.background;
    this.previousFog = scene.fog;
    this.background = new THREE.Color();
    this.fog = new THREE.Fog(this.background, 100, 205);
    this.disposed = false;
  }

  own(resource) { this.resources.add(resource); return resource; }

  material(color, options = {}) {
    return this.own(new THREE.MeshStandardMaterial({ color, roughness: 0.79, metalness: 0.12, ...options }));
  }

  build(map) {
    if (this.disposed) throw new Error("Cannot build a disposed World");
    if (!map || !Number.isFinite(map.size) || map.size <= 0 || !Array.isArray(map.obstacles)) {
      throw new TypeError("World.build requires {id, size: positive half-extent, obstacles: []}");
    }
    map.obstacles.forEach((o, index) => {
      const sizes = o?.type === "box" ? [o.w, o.d, o.h] : [o?.r, o?.h];
      if (!o || !["box", "cylinder", "sphere"].includes(o.type) ||
          ![o.x, o.z].every(Number.isFinite) || !sizes.every(n => Number.isFinite(n) && n > 0)) {
        throw new TypeError(`Invalid cover ${index}`);
      }
    });
    this.clear();
    this.map = map;
    this.theme = themeFor(map);
    this.palette = PALETTES[this.theme];
    const p = this.palette;
    this.geometry = {
      box: this.own(new THREE.BoxGeometry(1, 1, 1)),
      cylinder: this.own(new THREE.CylinderGeometry(1, 1, 1, 32)),
      pipe: this.own(new THREE.CylinderGeometry(1, 1, 1, 12)),
      sphere: this.own(new THREE.SphereGeometry(1, 32, 20)),
      pod: this.own(new THREE.SphereGeometry(1, 8, 6)),
      ring: this.own(new THREE.TorusGeometry(1, 0.018, 4, 56)),
      plane: this.own(new THREE.PlaneGeometry(1, 1)),
      leaf: this.own(leafGeometry()),
      cliff: this.own(cliffGeometry()),
    };
    const cladding = this.own(claddingTexture(this.theme));
    this.m = {
      body: this.material(p.body, { map: cladding }), cap: this.material(p.cap, { map: cladding }), dark: this.material(p.dark),
      accent: this.material(p.accent), secondary: this.material(p.secondary),
      glow: this.material(p.glow, { emissive: p.glow, emissiveIntensity: 0.65, roughness: 0.45 }),
      foliage: this.material("#426e58", { side: THREE.DoubleSide, metalness: 0 }),
      leafTip: this.material("#78a78a", { side: THREE.DoubleSide, metalness: 0 }),
      bark: this.material("#536c60", { metalness: 0 }),
      route: this.material(new THREE.Color(p.floor).lerp(new THREE.Color(p.cap), 0.28), { roughness: 1, metalness: 0 }),
      contactBox: this.own(new THREE.MeshBasicMaterial({ map: this.own(contactTexture(false)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })),
      contactRound: this.own(new THREE.MeshBasicMaterial({ map: this.own(contactTexture(true)), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })),
    };
    for (const key of ["dark", "cap", "accent", "glow"]) {
      this.m[key].polygonOffset = true;
      this.m[key].polygonOffsetFactor = -1;
      this.m[key].polygonOffsetUnits = key === "glow" || key === "accent" ? -2 : -1;
    }
    this.floor();
    this.peripheralGround();
    this.boundary();
    const baseMaterials=this.m, baseTheme=this.theme, kits={};
    map.obstacles.forEach((obstacle,index)=>{
      const theme=obstacle.theme || baseTheme;
      if(theme!==baseTheme && !kits[theme]) {
        const palette=PALETTES[theme];
        kits[theme]={...baseMaterials};
        for(const key of ['body','cap','dark','accent','secondary','glow']) kits[theme][key]=this.material(palette[key]);
      }
      this.m=kits[theme]||baseMaterials;this.theme=theme;
      this.cover(obstacle,index);
    });
    this.m=baseMaterials;this.theme=baseTheme;
    for (const district of map.districts || []) {
      if (map.id === "confluence" && district.id === "forest" && district.open) this.verdantBasin(district);
    }
    this.centralInlay();
    this.routeCallouts();
    if (this.theme === "canopy") this.canopy();
    else if (this.theme === "glacier") this.glacier();
    else this.foundry();
    this.flush();
    this.root.traverse(object => {
      if (object.isMesh && !object.material.transparent && object.material.isMeshStandardMaterial) object.receiveShadow = true;
    });
    this.lighting();
    this.setTimeOfDay(this.timeOfDay);
    let draws = 0;
    this.root.traverse(o => { if (o.isMesh || o.isPoints) draws++; });
    this.root.userData = { mapId: map.id, theme: this.theme, revision: "world-r3", environmentDrawCalls: draws };
    this.root.updateMatrixWorld(true);
    return this.root;
  }

  // Shared transforms are immutable once flushed. Cover metadata maps obstacle
  // indices to instances, allowing integration tests to inspect exact bounds.
  part(shape, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], coverIndex) {
    const geometry = this.geometry[shape];
    // Primary solids get their own batch so the floor and decorative cladding
    // do not accidentally become casters merely by sharing their material.
    const key = `${geometry.uuid}:${material.uuid}:${coverIndex === undefined ? "detail" : "solid"}`;
    if (!this.batches.has(key)) this.batches.set(key, { geometry, material, matrices: [], cover: [] });
    const batch = this.batches.get(key);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    if (coverIndex !== undefined) batch.cover.push({ instance: batch.matrices.length, obstacle: coverIndex });
    batch.matrices.push(matrix);
  }

  box(material, x, y, z, w, h, d, rotation = 0) {
    this.part("box", material, [x, y, z], [w, h, d], [0, rotation, 0]);
  }

  beam(material, from, to, width, depth = width) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    this.part("box", material, a.add(b).multiplyScalar(0.5).toArray(), [width, direction.length(), depth], [rotation.x, rotation.y, rotation.z]);
  }

  ring(material, x, y, z, radius, rotation = [Math.PI / 2, 0, 0]) {
    this.part("ring", material, [x, y, z], [radius, radius, radius], rotation);
  }

  flush() {
    for (const { geometry, material, matrices, cover } of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.name = cover.length ? "collision-cover" : "world-architecture";
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.cover = cover;
      mesh.castShadow = cover.length > 0 || material === this.m.bark || geometry === this.geometry.cliff;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      this.root.add(mesh);
    }
    this.batches.clear();
  }

  floor() {
    const s = this.map.size;
    const texture = this.own(surfaceTexture(this.theme, this.palette));
    texture.repeat.set(s / 9, s / 9);
    const material = this.material("#ffffff", { map: texture, roughness: this.theme === "glacier" ? 0.68 : 0.91, metalness: this.theme === "foundry" ? 0.3 : 0.04 });
    // Top surface is y=0. Layered edge reveals make the arena a real platform.
    this.box(material, 0, -0.18, 0, s * 2, 0.36, s * 2);
    this.box(this.m.dark, 0, -0.75, 0, s * 2 + 0.35, 0.8, s * 2 + 0.35);
    this.box(this.m.body, 0, -1.35, 0, s * 2 - 1, 0.4, s * 2 - 1);
    // District metadata is floor finish only. It never raises or blocks a lane.
    for (const [districtIndex, district] of (this.map.districts || []).entries()) {
      if (![district.x, district.z, district.w, district.d].every(Number.isFinite) || district.w <= 0 || district.d <= 0) continue;
      const left = Math.max(-s, district.x - district.w / 2), right = Math.min(s, district.x + district.w / 2);
      const near = Math.max(-s, district.z - district.d / 2), far = Math.min(s, district.z + district.d / 2);
      if (right <= left || far <= near) continue;
      // Preserve the finish inside route regions: r1's solid rectangles erased
      // the panel texture and read as flat placemats beneath cover.
      const tint = new THREE.Color("#ffffff").lerp(new THREE.Color(district.color || this.palette.floor), this.map.id==='confluence'?0.38:0.12);
      let finish=texture;
      if(this.map.id==='confluence') {finish=this.own(surfaceTexture(district.theme,PALETTES[district.theme]));finish.repeat.set(60/9,60/9);}
      this.box(this.material(tint, { map: finish }), (left + right) / 2, 0.002 + districtIndex * 0.001, (near + far) / 2, right - left, 0.002, far - near);
    }
    // Broad service strips are directional floor material, not a fine grid.
    for (const sign of [-1, 1]) {
      this.box(this.m.dark, sign * s * 0.62, 0.008, 0, 0.28, 0.012, s * 1.78);
      this.box(this.m.dark, 0, 0.009, sign * s * 0.62, s * 1.78, 0.012, 0.28);
      for (let i = -4; i <= 4; i++) {
        this.box(this.m.body, sign * s * 0.62, 0.018, i * s * 0.18, 0.22, 0.01, 0.055);
        this.box(this.m.body, i * s * 0.18, 0.018, sign * s * 0.62, 0.055, 0.01, 0.22);
      }
    }
    // Low-contrast inset corner stencils belong to the deck, below every ship.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * s * 0.8, z = sz * s * 0.8;
      this.box(this.m.body, x, 0.025, z, 2.2, 0.012, 0.11);
      this.box(this.m.body, x - sx * 1.05, 0.025, z - sz * 0.55, 0.11, 0.012, 1.1);
    }
  }

  contact(x, z, w, d, round = false, y = 0.083) {
    this.part("plane", round ? this.m.contactRound : this.m.contactBox, [x, y, z], [w + 2.2, d + 2.2, 1], [-Math.PI / 2, 0, 0]);
  }

  peripheralGround() {
    const s = this.map.size;
    if (this.theme === "foundry") {
      // The external machinery is bolted to connected catwalks and a structural
      // ring, not detached boxes in space. Everything is beyond/below play.
      for (const side of [-1, 1]) {
        this.box(this.m.dark, side * (s + 5), -2.05, 0, 7.6, 0.45, s * 2 + 12);
        this.box(this.m.body, side * (s + 8.6), -1.76, 0, 0.3, 0.18, s * 2 + 12);
        for (let i = -3; i <= 3; i++) {
          this.beam(this.m.body, [side * (s - 2), -1.7, i * s / 3.4], [side * (s + 7), -6, i * s / 3.4], 0.4);
        }
      }
      this.box(this.m.dark, 0, -3.2, s + 13, s * 2 + 17, 0.5, 8);
      const ring = new THREE.Mesh(this.own(new THREE.RingGeometry(s * 1.76, s * 1.84, 64)), this.m.dark);
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, -17, 8);
      this.root.add(ring);
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        this.beam(this.m.body, [Math.sin(a) * s * 0.91, -2, Math.cos(a) * s * 0.91], [Math.sin(a) * s * 1.8, -17, 8 + Math.cos(a) * s * 1.8], 0.75);
      }
      return;
    }
    // Layered research island / ice shelf: broad continuous ground under the
    // existing trees and cliffs gives those silhouettes a physical context.
    const positions = [], colors = [], indices = [], steps = 64;
    const soil = new THREE.Color(this.theme === "canopy" ? "#263f38" : "#698795");
    const deep = new THREE.Color(this.theme === "canopy" ? "#182d2b" : "#344d68");
    for (let layer = 0; layer < 4; layer++) for (let i = 0; i <= steps; i++) {
      const a = i / steps * TAU;
      const radius = s * [0.7, 1.43, 1.78, 2.02][layer] * (1 + Math.sin(a * 7) * 0.025 + Math.cos(a * 11) * 0.014);
      positions.push(Math.sin(a) * radius, [-2.2, -1.15, -4.5, -10][layer], Math.cos(a) * radius);
      const color = soil.clone().lerp(deep, layer / 3).multiplyScalar(0.94 + Math.sin(a * 5) * 0.06);
      colors.push(color.r, color.g, color.b);
      if (layer < 3 && i < steps) {
        const p = layer * (steps + 1) + i, q = p + steps + 1;
        indices.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
    const geometry = this.own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const shelf = new THREE.Mesh(geometry, this.material("#ffffff", { vertexColors: true, roughness: 1, metalness: 0 }));
    shelf.name = "peripheral-ground";
    this.root.add(shelf);
    for (const side of [-1, 1]) this.box(this.m.dark, side * (s + 3.5), -1, 0, 5, 0.3, s * 2 + 5);
  }

  boundary() {
    const s = this.map.size;
    for (const sign of [-1, 1]) {
      // Keep the inside edge at the collision boundary; no rail intrudes.
      this.box(this.m.cap, sign * (s + 0.14), 0.12, 0, 0.28, 0.24, s * 2 + 0.56);
      this.box(this.m.cap, 0, 0.12, sign * (s + 0.14), s * 2, 0.24, 0.28);
      this.box(this.m.dark, sign * (s + 0.9), -0.08, 0, 1.25, 0.22, s * 2);
      this.box(this.m.dark, 0, -0.08, sign * (s + 0.9), s * 2 + 2.5, 0.22, 1.25);
      for (let i = -3; i <= 3; i++) {
        const t = i * s / 3.5;
        this.box(this.m.glow, sign * (s + 0.14), 0.247, t, 0.14, 0.012, 1.2);
        this.box(this.m.glow, t, 0.247, sign * (s + 0.14), 1.2, 0.012, 0.14);
        this.box(this.m.accent, sign * (s + 0.6), -0.85, t, 1.4, 1.4, 0.65);
        this.box(this.m.accent, t, -0.85, sign * (s + 0.6), 0.65, 1.4, 1.4);
      }
    }
  }

  cover(o, index) {
    const { x, z, h } = o;
    if (![x, z, h].every(Number.isFinite) || h <= 0) throw new TypeError(`Invalid cover ${index}`);
    const box = o.type === "box", sphere = o.type === "sphere";
    this.contact(x, z, box ? o.w : o.r * 2, box ? o.d : o.r * 2, !box);
    if (box ? !(o.w > 0 && o.d > 0) : !(o.r > 0)) throw new TypeError(`Invalid cover footprint ${index}`);
    this.part(box ? "box" : sphere ? "sphere" : "cylinder", this.m.body, [x, h / 2, z], box ? [o.w, h, o.d] : [o.r, sphere ? h / 2 : h, o.r], [0, 0, 0], index);
    if(o.closedSector) {
      this.box(this.m.dark,x,h+0.01,z,o.w,0.02,o.d);
      for(const side of [-1,1]) {
        this.box(this.m.accent,x+side*(o.w/2-0.2),h+0.04,z,0.2,0.03,o.d);
        this.box(this.m.accent,x,h+0.04,z+side*(o.d/2-0.2),o.w,0.03,0.2);
      }
      return;
    }
    if (box) {
      if (this.theme === "canopy") {
        this.planter(o);
        return;
      }
      if (this.theme === "glacier" && o.role === "ice-baffle") {
        this.iceBaffle(o);
        return;
      }
      // Raised panel seams remain on the roof and inside the exact footprint.
      this.box(this.m.dark, x, h + 0.008, z, o.w * 0.92, 0.012, o.d * 0.9);
      this.box(this.m.cap, x, h + 0.022, z, o.w * 0.82, 0.014, o.d * 0.78);
      for (const side of [-1, 1]) {
        this.box(this.m.accent, x + side * o.w * 0.4, h + 0.033, z, Math.min(0.14, o.w * 0.07), 0.012, o.d * 0.78);
      }
      if (this.theme === "glacier") {
        // Relay housing: blue ceramic solar collectors, not ventilation grilles.
        this.box(this.m.dark, x, h + 0.04, z, o.w * 0.64, 0.02, o.d * 0.64);
        for (let i = -1; i <= 1; i++) for (const side of [-1, 1]) this.box(this.m.accent, x + side * o.w * 0.15, h + 0.06, z + i * o.d * 0.19, o.w * 0.25, 0.012, o.d * 0.15);
      } else if (o.role === "conduit") {
        const alongZ = o.d > o.w;
        for (let i = -1; i <= 1; i++) this.part("pipe", i === 0 ? this.m.accent : this.m.dark,
          [x + (alongZ ? i * o.w * 0.22 : 0), h + 0.16, z + (alongZ ? 0 : i * o.d * 0.22)],
          [0.18, (alongZ ? o.d : o.w) * 0.7, 0.18], alongZ ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]);
      } else {
        const count = Math.max(2, Math.floor(o.w / 1.1));
        for (let i = 0; i < count; i++) this.box(this.m.dark, x + (i - (count - 1) / 2) * o.w * 0.68 / count, h + 0.09, z, o.w * 0.36 / count, 0.13, o.d * 0.42);
      }
      // Surface-mounted facade panels, inset into the solid cover volume.
      for (const side of [-1, 1]) {
        // Polygon offset makes flush cladding visible without widening physics.
        this.box(this.m.dark, x, h * 0.5, z + side * (o.d / 2 - 0.006), o.w * 0.76, h * 0.68, 0.012);
        this.box(this.m.accent, x, h * 0.23, z + side * (o.d / 2 - 0.006), o.w * 0.65, Math.min(0.16, h * 0.08), 0.012);
        this.box(this.m.cap, x + side * (o.w / 2 - 0.006), h * 0.5, z, 0.012, h * 0.7, o.d * 0.66);
      }
      if (this.theme === "foundry" && o.role === "forge") this.forgeCore(o);
    } else if (!sphere) {
      if (this.theme === "canopy") {
        this.part("cylinder", this.m.dark, [x, h + 0.012, z], [o.r * 0.89, 0.018, o.r * 0.89]);
        this.ring(this.m.cap, x, h + 0.04, z, o.r * 0.95);
        this.roofGarden(x, h + 0.05, z, o.r * 1.42, o.r * 1.42);
        // Tension hoops distinguish ceramic cultivation vats from relay pylons.
        for (const py of [h * 0.22, h * 0.78]) this.ring(this.m.accent, x, py, z, o.r * 0.98);
        return;
      }
      this.part("cylinder", this.m.dark, [x, h + 0.009, z], [o.r * 0.92, 0.015, o.r * 0.92]);
      this.part("cylinder", this.m.cap, [x, h + 0.028, z], [o.r * 0.76, 0.02, o.r * 0.76]);
      this.ring(this.m.accent, x, h + 0.045, z, o.r * 0.6);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8;
        this.box(this.m.dark, x + Math.sin(a) * o.r * 0.96, h * 0.48, z + Math.cos(a) * o.r * 0.96, o.r * 0.13, h * 0.76, o.r * 0.055, a);
      }
    } else {
      // Sphere cover remains the supplied ellipsoid, clad as a pressure vessel.
      this.part("ring", this.m.dark, [x, h / 2, z], [o.r * 0.98, o.r * 0.98, o.r * 0.98], [Math.PI / 2, 0, 0]);
    }
  }

  planter({ x, z, h, w, d }) {
    this.box(this.m.dark, x, h + 0.025, z, w * 0.89, 0.045, d * 0.9);
    for (const side of [-1, 1]) {
      this.box(this.m.cap, x + side * w * 0.46, h + 0.07, z, w * 0.07, 0.13, d * 0.96);
      this.box(this.m.cap, x, h + 0.07, z + side * d * 0.46, w * 0.86, 0.13, d * 0.07);
      // Inlaid ceramic ribs remain flush with the exact collision box.
      for (let i = -1; i <= 1; i++) this.box(this.m.accent, x + side * (w / 2 - 0.006), h * 0.5, z + i * d * 0.24, 0.012, h * 0.65, d * 0.055);
    }
    for (let i = -1; i <= 1; i++) this.roofGarden(x, h + 0.07, z + i * d * 0.25, w * 0.66, d * 0.32);
  }

  forgeCore({ x, z, h, w, d }) {
    const radius = Math.min(w, d) * 0.34;
    this.part("cylinder", this.m.dark, [x, h + 0.05, z], [radius, 0.024, radius]);
    this.part("ring", this.m.glow, [x, h + 0.07, z], [radius * 0.77, radius * 0.77, 0.3], [Math.PI / 2, 0, 0]);
    this.part("cylinder", this.m.accent, [x, h + 0.066, z], [radius * 0.3, 0.025, radius * 0.3]);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      this.box(this.m.cap, x + Math.sin(a) * radius * 0.68, h + 0.09, z + Math.cos(a) * radius * 0.68, 0.25, 0.035, radius * 0.5, a + 0.3);
    }
    for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) {
      this.box(this.m.glow, x + i * w * 0.13, h * 0.55, z + side * (d / 2 - 0.006), w * 0.035, h * 0.38, 0.012);
    }
  }

  iceBaffle({ x, z, w, d, h }) {
    // Snow crust is a shallow ridge on the true rectangular glacier baffle.
    // The primary solid still spans precisely w × d × h.
    this.box(this.m.cap, x, h + 0.012, z, w * 0.98, 0.022, d * 0.96);
    this.part("cliff", this.m.cap, [x, h + 0.024, z], [w * 0.92, 0.22, d * 0.83]);
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 3; layer++) this.box(this.m.accent, x, h * (0.2 + layer * 0.21), z + side * (d / 2 - 0.006), w * (0.93 - layer * 0.08), 0.045, 0.012);
      this.box(this.m.dark, x + side * w * 0.42, h + 0.028, z, w * 0.07, 0.015, d * 0.93);
    }
  }

  roofGarden(x, y, z, w, d) {
    this.box(this.m.foliage, x, y, z, w * 0.55, 0.035, d * 0.55);
    const length = Math.min(w, d) * 0.38;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      this.part("leaf", i % 2 ? this.m.foliage : this.m.leafTip, [x, y + 0.14, z], [length * 0.85, 1.15, length], [-0.48, a, 0]);
    }
    this.part("pod", this.m.secondary, [x, y + 0.43, z], [0.07, 0.18, 0.07]);
  }

  verdantBasin(district) {
    // Flush shallow pools and groundcover: hover routes stay entirely open.
    // Static opaque batches avoid transparency sorting and per-frame work.
    const water = this.material("#286a70", { roughness: 0.32, metalness: 0.22, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -5 });
    const bank = this.material("#61785c", { roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    for (const [dx, dz, rx, rz] of [[-17, 5, 7, 9], [9, 17, 10, 6], [12, -19, 8, 4]]) {
      const x = district.x + dx, z = district.z + dz;
      const shape = new THREE.Shape();
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * TAU, r = 1 + 0.08 * Math.sin(a * 3) + 0.05 * Math.cos(a * 5);
        const px = Math.cos(a) * r, pz = Math.sin(a) * r;
        if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz);
      }
      const geometry = this.own(new THREE.ShapeGeometry(shape));
      for (const [material, scale, y] of [[bank, 1, 0.035], [water, 0.91, 0.045]]) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "verdant-pool";
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, y, z);
        mesh.scale.set(rx * scale, rz * scale, 1);
        this.root.add(mesh);
      }
      for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24, radius = 0.92 + 0.04 * Math.sin(i * 7);
        // Leaf relief stays below 0.06 units, never resembling solid cover.
        this.part("leaf", i % 3 ? this.m.foliage : this.m.leafTip,
          [x + Math.cos(a) * rx * radius, 0.055, z + Math.sin(a) * rz * radius],
          [0.65, 0.015, 1.1], [0, a + 0.7, 0]);
      }
    }
    for (const o of this.map.obstacles.filter(o => o.sector === this.map.districts.indexOf(district) && !o.closedSector)) {
      const radius = o.type === "box" ? Math.min(o.w, o.d) / 2 : o.r;
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + layer * 0.4;
        this.part("leaf", (i + layer) % 3 ? this.m.foliage : this.m.leafTip,
          [o.x, o.h + 0.2 + layer * 0.23, o.z],
          [radius * 0.7, 0.8, radius * (0.86 - layer * 0.14)], [-0.22, a, 0]);
      }
    }
  }

  centralInlay() {
    // Flush machinery, botanical water lens or relay calibration rose. Never
    // creates a central obstacle when the authoritative layout has none.
    const radius = Math.min(5.6, this.map.size * 0.18);
    this.part("cylinder", this.m.dark, [0, 0.012, 0], [radius, 0.016, radius]);
    this.part("cylinder", this.m.body, [0, 0.024, 0], [radius * 0.93, 0.008, radius * 0.93]);
    this.part("cylinder", this.m.dark, [0, 0.034, 0], [radius * 0.85, 0.008, radius * 0.85]);
    // Torus tube height scaled independently to stay below hover/collision y.
    this.part("ring", this.m.route, [0, 0.05, 0], [radius * 0.72, radius * 0.72, 0.25], [Math.PI / 2, 0, 0]);
    const count = this.theme === "glacier" ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count, r = radius * 0.52;
      this.box(this.m.body, Math.sin(a) * r, 0.045, Math.cos(a) * r, radius * 0.08, 0.012, radius * 0.46, a);
    }
    this.part("cylinder", this.m.secondary, [0, 0.056, 0], [0.42, 0.01, 0.42]);
  }

  routeCallouts() {
    // Ground-painted stencil lettering, one opaque batch. No font requests or
    // canvas dependency. These are location names, never threat indicators.
    const glyphs = {
      A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30], C:[14,17,16,16,16,17,14],
      D:[30,17,17,17,17,17,30], E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
      G:[14,17,16,23,17,17,14], I:[31,4,4,4,4,4,31], K:[17,18,20,24,20,18,17],
      L:[16,16,16,16,16,16,31], N:[17,25,21,19,17,17,17], O:[14,17,17,17,17,17,14],
      R:[30,17,17,30,20,18,17], S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4],
      U:[17,17,17,17,17,17,14], Y:[17,17,10,4,4,4,4],
    };
    const s = this.map.size;
    const labels = this.map.id==='confluence' ? this.map.districts.filter(d=>d.open).map(d=>[d.label,d.x,d.z-24]) : this.theme === "foundry" ? [["FORGE",0,-7],["DOCK",-s*0.82,-13],["COILS",s*0.82,13]]
      : this.theme === "canopy" ? [["COURT",0,-8],["GARDEN",-18,-10],["LAB",18,10]]
        : [["RELAY",0,22],["RIDGE",-25,10],["RIDGE",25,-10]];
    const positions = [], indices = [], step = 0.145;
    for (const [text, x, z] of labels) {
      for (let letter = 0; letter < text.length; letter++) {
        const rows = glyphs[text[letter]];
        for (let row = 0; row < 7; row++) for (let column = 0; column < 5; column++) {
          if (!(rows[row] & (1 << (4 - column)))) continue;
          const px = x - (letter * 6 + column - text.length * 3) * step;
          const pz = z - (3 - row) * step, p = positions.length / 3;
          positions.push(px,0.033,pz, px-step,0.033,pz, px-step,0.033,pz-step, px,0.033,pz-step);
          indices.push(p,p+2,p+1,p,p+3,p+2);
        }
      }
      this.box(this.m.route, x, 0.03, z - 0.8, text.length * step * 6, 0.008, 0.045);
    }
    const geometry = this.own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.m.route);
    mesh.name = "route-callouts";
    this.root.add(mesh);
  }

  foundry() {
    const s = this.map.size, z = s + 13, y = 7;
    // Orbital induction gate: concentric structural ribs, radial heat shields,
    // a separated inner hot channel and paired load-bearing pylons.
    this.ring(this.m.dark, 0, y, z, 13.5, [0, 0, 0]);
    this.ring(this.m.cap, 0, y, z - 0.7, 12.8, [0, 0, 0]);
    this.ring(this.m.glow, 0, y, z - 0.82, 11.9, [0, 0, 0]);
    this.ring(this.m.accent, 0, y, z + 0.7, 12.8, [0, 0, 0]);
    for (let i = 0; i < 32; i++) {
      const a = i * TAU / 32, x = Math.cos(a) * 12.75, py = y + Math.sin(a) * 12.75;
      this.part("box", i % 4 === 0 ? this.m.accent : this.m.body, [x, py, z], [0.8, 1.5, 1.7], [0, 0, a - Math.PI / 2]);
      this.part("box", this.m.glow, [Math.cos(a) * 11.7, y + Math.sin(a) * 11.7, z - 0.95], [0.24, 0.62, 0.12], [0, 0, a - Math.PI / 2]);
    }
    for (const side of [-1, 1]) {
      this.box(this.m.dark, side * 11, -3, z, 5, 12, 6);
      this.box(this.m.body, side * 11, -0.2, z - 1, 4, 6, 4);
      this.box(this.m.accent, side * 11, 2.9, z - 1, 4.3, 0.35, 4.3);
      this.beam(this.m.cap, [side * 16, -5, z], [side * 11, 5, z], 0.5);
      // Dockside heat exchangers; nothing extends inside the playable square.
      for (let i = 0; i < 4; i++) {
        const pz = -s * 0.6 + i * s * 0.4, px = side * (s + 5);
        this.box(this.m.dark, px, -0.5, pz, 5, 3, 7);
        for (let fin = 0; fin < 7; fin++) this.box(this.m.body, px, 1.25, pz + (fin - 3) * 0.7, 4.2, 1.3, 0.24);
        this.box(this.m.glow, px - side * 2.12, 0.2, pz, 0.08, 0.14, 5.8);
      }
      // Long underslung conduits lend depth from the near edge without towers.
      this.box(this.m.accent, side * s * 0.7, -2.7, 0, 1.1, 1.1, s * 2 + 9);
      this.box(this.m.dark, side * s * 0.7, -3.45, 0, 1.6, 0.45, s * 2 + 9);
    }
    // A distant orbital arc below the play deck provides a composed horizon.
    this.ring(this.m.body, 0, -17, 8, s * 1.8, [Math.PI / 2 - 0.18, 0.1, 0]);
    this.ring(this.m.accent, 0, -17.5, 8, s * 1.8 + 1.1, [Math.PI / 2 - 0.18, 0.1, 0]);
    this.starfield();
  }

  canopy() {
    const s = this.map.size;
    // Retired greenhouse arches frame the garden from beyond its north edge.
    for (let k = 0; k < 3; k++) {
      const z = s + 9 + k * 4;
      const curve = new THREE.EllipseCurve(0, 0, s * 0.7, 17, 0, Math.PI, false, 0);
      const points = curve.getPoints(24);
      for (let i = 0; i < points.length - 1; i++) this.beam(this.m.cap, [points[i].x, points[i].y - 1, z], [points[i + 1].x, points[i + 1].y - 1, z], 0.22);
      this.box(this.m.dark, 0, -1.8, z, s * 1.5, 0.6, 1);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = side * (s + 9 + (i % 2) * 2), z = -s * 0.65 + i * s * 0.48;
        const height = 6 + i * 1.35;
        this.tree(x, z, height, 4.3 + (i % 2) * 0.8);
        this.box(this.m.dark, side * (s + 3.5), -0.4, z, 4, 1.1, 7.5);
        this.box(this.m.foliage, side * (s + 3.5), 0.2, z, 3.6, 0.08, 7);
        for (let j = 0; j < 5; j++) {
          const pz = z + (j - 2) * 1.05;
          this.part("leaf", this.m.leafTip, [side * (s + 3.3), 0.3, pz], [0.7, 1.1, 1.4], [-0.6, side * 1.2, 0]);
        }
      }
    }
    // Hero specimen grows behind the far court, not over navigable space.
    this.tree(-s * 0.25, s + 17, 14, 8);
    // Flush quiet lens lends a botanical identity to the center.
    this.part("cylinder", this.m.foliage, [0, 0.065, 0], [1.65, 0.008, 1.65]);
    for (let i = 0; i < 7; i++) this.part("leaf", this.m.leafTip, [0, 0.077, 0], [1.1, 0.03, 1.5], [0, i * TAU / 7, 0]);
  }

  tree(x, z, height, crown) {
    this.beam(this.m.bark, [x, -1, z], [x + 0.35, height, z + 0.3], 0.65, 0.8);
    for (let branch = 0; branch < 7; branch++) {
      const a = branch * TAU / 7;
      const bx = x + Math.sin(a) * crown * 0.48, bz = z + Math.cos(a) * crown * 0.48;
      this.beam(this.m.bark, [x, height * 0.53, z], [bx, height * 0.95, bz], 0.22);
      this.beam(this.m.bark, [x, 0.5, z], [x + Math.sin(a) * 1.8, -0.3, z + Math.cos(a) * 1.8], 0.28);
      for (let layer = 0; layer < 2; layer++) {
        // Start at the trunk rather than the branch tip: r1's outward-only
        // leaves made every crown a hollow wreath. Offset lower foliage by age.
        const angle = a + layer * 0.38 + height * 0.03;
        this.part("leaf", layer ? this.m.leafTip : this.m.foliage,
          [x + Math.sin(angle) * crown * 0.1, height - layer * 1.1, z + Math.cos(angle) * crown * 0.1],
          [crown * 0.88, crown * 0.52, crown * (1.03 - layer * 0.1)], [-0.1 + layer * 0.08, angle, 0]);
      }
      // Contained hanging tendrils with terminal luminescent seed pods.
      this.beam(this.m.foliage, [bx, height - 1, bz], [bx + 0.12, height - 3, bz], 0.045);
      this.part("pod", this.m.glow, [bx + 0.12, height - 3.05, bz], [0.09, 0.2, 0.09]);
    }
  }

  glacier() {
    const s = this.map.size;
    // Continuous escarpments, not independent cones or floating crystals.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        this.part("cliff", i % 2 ? this.m.body : this.m.cap, [side * (s + 9), -2, (i - 1) * s * 0.85], [s * 0.9, 5.5 + i * 2, 8], [0, side * Math.PI / 2, 0]);
      }
      this.box(this.m.dark, side * 8, -1, s + 10, 4, 4, 7);
      this.box(this.m.secondary, side * 8, 1.05, s + 10, 4.1, 0.22, 7.1);
      this.beam(this.m.body, [side * 8, 1, s + 10], [side * 3.5, 7, s + 13], 0.65);
    }
    // Parabolic relay dish: a curved lathed bowl with radial braces and feed.
    const profile = [];
    for (let i = 0; i <= 16; i++) { const r = i / 16 * 7.5; profile.push(new THREE.Vector2(r, r * r * 0.044)); }
    const dishGeometry = this.own(new THREE.LatheGeometry(profile, 48));
    const dish = new THREE.Mesh(dishGeometry, this.material(this.palette.cap, { side: THREE.DoubleSide, metalness: 0.35, roughness: 0.6 }));
    const mount = new THREE.Group();
    mount.position.set(0, 7, s + 15);
    mount.rotation.x = -0.42;
    mount.add(dish);
    this.root.add(mount);
    // Batch dish braces with full parent transform, avoiding per-brace draws.
    mount.updateMatrixWorld(true);
    const at = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(mount.matrix).toArray();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      for (let j = 0; j < 4; j++) {
        const r0 = 0.6 + j * 1.7, r1 = r0 + 1.7;
        this.beam(this.m.accent, at(Math.sin(a) * r0, r0 * r0 * 0.044 + 0.07, Math.cos(a) * r0), at(Math.sin(a) * r1, r1 * r1 * 0.044 + 0.07, Math.cos(a) * r1), 0.09);
      }
      if (i % 4 === 0) this.beam(this.m.dark, at(Math.sin(a) * 6.8, 2.1, Math.cos(a) * 6.8), at(0, 6.1, 0), 0.12);
    }
    this.beam(this.m.dark, at(0, 0, 0), at(0, 5.8, 0), 0.3);
    this.part("sphere", this.m.secondary, at(0, 6.1, 0), [0.35, 0.35, 0.35]);
    this.box(this.m.body, 0, 1.6, s + 15, 3, 10, 3);
    this.box(this.m.dark, 0, -3, s + 15, 12, 1.4, 11);
    for (let i = 0; i < 5; i++) this.part("cliff", this.m.body, [(i - 2) * 16, -5, s + 35], [20, 11 + (i % 3) * 4, 12]);
    // An elevated distant auroral ribbon, opaque and restrained: no expensive
    // full-screen additive layers or custom shader compatibility requirements.
    const ribbon = new THREE.BufferGeometry(), positions = [], colors = [];
    const lower = new THREE.Color("#497c8b"), upper = new THREE.Color(this.palette.sky);
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40 - 0.5) * 130, y = 23 + Math.sin(i * 0.19) * 4, z = s + 54 + Math.sin(i * 0.16) * 7;
      positions.push(x, y, z, x, y + 7 + Math.sin(i * 0.4) * 2, z);
      colors.push(lower.r, lower.g, lower.b, upper.r, upper.g, upper.b);
    }
    const indices = [];
    for (let i = 0; i < 40; i++) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    ribbon.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    ribbon.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    ribbon.setIndex(indices);
    this.aurora = new THREE.Mesh(this.own(ribbon), this.own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true })));
    this.root.add(this.aurora);
  }

  starfield() {
    const positions = [];
    for (let i = 0; i < 200; i++) {
      const a = i * 2.399963, r = 95 + i % 31;
      positions.push(Math.cos(a) * r, -17 + (i % 41), Math.sin(a) * r);
    }
    const geometry = this.own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.root.add(new THREE.Points(geometry, this.own(new THREE.PointsMaterial({ color: "#7f98b4", size: 0.11, sizeAttenuation: true }))));
  }

  lighting() {
    this.hemisphere = new THREE.HemisphereLight("#d9e9ee", this.palette.ground, 2);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.5);
    this.sun.position.set(-24, 40, -15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const extent = this.map.size * 1.65;
    Object.assign(this.sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.5, far: this.map.size * 7 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.00012;
    this.sun.shadow.normalBias = 0.045;
    this.sun.shadow.autoUpdate = false;
    this.sun.shadow.needsUpdate = true;
    this.rim = new THREE.DirectionalLight(this.palette.secondary, 0.8);
    this.rim.position.set(15, 12, 25);
    this.root.add(this.hemisphere, this.sun, this.sun.target, this.rim);
  }

  setTimeOfDay(value) {
    this.timeOfDay = ["day", "dusk", "night"].includes(value) ? value : "dusk";
    if (!this.sun) return;
    const settings = {
      day: { ambient: 1.45, sun: 3.1, rim: 0.45, color: "#fff4e1", sky: 1.35, glow: 0.32 },
      dusk: { ambient: 1.2, sun: 2.65, rim: 0.7, color: "#ffd4aa", sky: 0.85, glow: 0.7 },
      night: { ambient: 1.05, sun: 1.35, rim: 0.85, color: "#b4d4ff", sky: 0.38, glow: 1.05 },
    }[this.timeOfDay];
    this.hemisphere.intensity = settings.ambient;
    this.sun.intensity = settings.sun;
    this.sun.color.set(settings.color);
    const s = this.map.size;
    this.sun.position.set(-s * 0.9, s * (this.timeOfDay === "dusk" ? 0.95 : 1.5), -s * 0.65);
    this.sun.shadow.needsUpdate = true;
    this.root.userData.shadowNeedsUpdate = true;
    this.rim.intensity = settings.rim;
    this.m.glow.emissiveIntensity = settings.glow;
    this.background.set(this.palette.sky).multiplyScalar(settings.sky);
    this.fog.color.copy(this.background);
    this.scene.background = this.background;
    this.scene.fog = this.fog;
    if (this.aurora) this.aurora.visible = this.timeOfDay !== "day";
  }

  setShowcase(module) {
    // The integrator owns hiding ships/HUD. All showcase modes retain identical
    // collision cover and scenery; this is intentionally not a second world.
    this.showcase = module;
  }

  update(time, dt) {
    if (this.disposed || !this.m || !Number.isFinite(time)) return;
    // One slow peripheral signal. No moving floor, cover, leaves or allocations.
    if (this.aurora) this.aurora.position.y = Math.sin(time * 0.08) * 0.3;
  }

  clear() {
    this.sun?.shadow.dispose();
    // InstancedMesh.dispose releases renderer-side instance buffers separately.
    this.root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    this.root.clear();
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
    this.batches.clear();
    this.aurora = null;
    this.sun = this.rim = this.hemisphere = null;
  }

  dispose() {
    if (this.disposed) return;
    this.clear();
    this.root.removeFromParent();
    if (this.scene.background === this.background) this.scene.background = this.previousBackground;
    if (this.scene.fog === this.fog) this.scene.fog = this.previousFog;
    this.disposed = true;
  }
}
