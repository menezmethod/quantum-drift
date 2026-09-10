/** Stable, frame-rate independent camera control. Map.size is a half extent. */
export const CAMERA_PRESETS = Object.freeze({ tactical: 0, chase: 1, overview: 2, isometric: 3 });
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const bounded = (x, z, limit) => {
  const scale = Math.min(1, limit / (Math.hypot(x, z) || 1));
  return { x: x * scale, z: z * scale };
};

/** Pure pose calculation, also usable without WebGL. Larger zoom means closer. */
export function cameraPose({ player, aim, map, lobby = false, view = 0, zoom = 1, aspect = 1, fov = 60 } = {}) {
  zoom = clamp(finite(zoom, 1), 0.7, 1.5);
  aspect = Math.max(0.25, finite(aspect, 1));
  const size = Math.max(4, finite(map?.size, 25));
  const tan = Math.tan(clamp(finite(fov, 60), 20, 110) * Math.PI / 360);
  if (lobby || !player) view = 3;
  if (![0, 1, 2, 3].includes(view)) view = 0;
  const overview = view === 2 || lobby || !player;
  let x = finite(player?.x), z = finite(player?.z);
  let offset;
  if (view === 1) {
    offset = { x: 0, y: 18, z: -16 };
  } else {
    // A fixed overhead angle and distance: ship turning and cursor aim never
    // rotate, pan or zoom the arena. Tracking is damped by CameraRig below.
    offset = view === 3 ? { x: 21, y: 32, z: -21 } : { x: 0, y: 37, z: -12 };

  }
  if (overview) {
    const bounds = map?.activeBounds || {minX:-size,maxX:size,minZ:-size,maxZ:size};
    x = (bounds.minX + bounds.maxX) / 2;
    z = (bounds.minZ + bounds.maxZ) / 2;
    // Fit all four ground corners, including perspective depth, with HUD margin.
    const direction = view === 2 ? { x: 0, y: 1, z: -0.001 } : { x: 0.46, y: 0.76, z: -0.46 };
    const length = Math.hypot(direction.x, direction.y, direction.z);
    const n = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
    const horizontal = Math.hypot(n.x, n.z);
    const right = { x: n.z / horizontal, z: -n.x / horizontal };
    const up = { x: -n.y * n.x / horizontal, z: -n.y * n.z / horizontal };
    let distance = 0;
    for (const cx of [bounds.minX-x, bounds.maxX-x]) for (const cz of [bounds.minZ-z, bounds.maxZ-z]) {
      const depth = n.x * cx + n.z * cz;
      distance = Math.max(distance, depth + Math.abs(right.x * cx + right.z * cz) / (tan * aspect * 0.86), depth + Math.abs(up.x * cx + up.z * cz) / (tan * 0.78));
    }
    offset = { x: n.x * distance, y: n.y * distance, z: n.z * distance };
  }
  // Preserve a useful horizontal threat radius on portrait screens. Overview
  // already fits the arena, so do not shrink it a second time.
  const portraitScale = overview ? 1 : Math.max(1, .78 / aspect);
  const scale = portraitScale / zoom;
  offset = { x: offset.x * scale, y: offset.y * scale, z: offset.z * scale };
  if (!overview) {
    // Reduce exterior void while retaining the pilot near screen center at walls.
    const margin = Math.min(size * 0.28, offset.y * tan * Math.min(1, aspect) * 0.32);
    x = clamp(x, -size + margin, size - margin);
    z = clamp(z, -size + margin, size - margin);
    x = clamp(x, finite(player.x) - 6, finite(player.x) + 6);
    z = clamp(z, finite(player.z) - 6, finite(player.z) + 6);
  }
  return { target: { x, y: 0, z }, position: { x: x + offset.x, y: offset.y, z: z + offset.z }, view, zoom };
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.baseFar = camera.far;
    this.preset = 0;
    this.reset();
  }
  reset() { this.ready = false; this.target = { x: 0, y: 0, z: 0 }; this.previousPlayer = null; }
  setPreset(name) {
    if (!Object.prototype.hasOwnProperty.call(CAMERA_PRESETS, name)) throw new RangeError(`Unknown camera preset: ${name}`);
    this.preset = CAMERA_PRESETS[name];
  }
  update(options = {}) {
    const pose = cameraPose({ ...options, view: options.view ?? this.preset, aspect: this.camera.aspect, fov: this.camera.fov });
    const p = options.player;
    const teleport = p && this.previousPlayer && Math.hypot(p.x - this.previousPlayer.x, p.z - this.previousPlayer.z) > 12;
    const snap = !this.ready || teleport || pose.view !== this.previousView || Boolean(options.lobby) !== this.previousLobby;
    const blend = snap ? 1 : 1 - Math.exp(-7 * clamp(finite(options.dt, 1 / 60), 0, 0.1));
    for (const axis of ['x', 'y', 'z']) {
      this.camera.position[axis] += (pose.position[axis] - this.camera.position[axis]) * blend;
      this.target[axis] += (pose.target[axis] - this.target[axis]) * blend;
    }
    const distance = Math.hypot(pose.position.x-pose.target.x,pose.position.y-pose.target.y,pose.position.z-pose.target.z);
    const far = Math.max(this.baseFar,distance+Math.max(4,finite(options.map?.size,25))*3);
    if (this.camera.far !== far) { this.camera.far=far;this.camera.updateProjectionMatrix(); }
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target.x, this.target.y, this.target.z);
    this.camera.updateMatrixWorld();
    this.ready = true;
    this.previousView = pose.view;
    this.previousLobby = Boolean(options.lobby);
    this.previousPlayer = p ? { x: p.x, z: p.z } : null;
    return pose;
  }
}
export default CameraRig;
