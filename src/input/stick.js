// Pure floating-joystick math, independent of DOM/touch so it is unit-testable.
// Screen coordinates: x right-positive, y down-positive (as from pointer events).
// Output matches the game's horizontal/vertical convention: x right-positive,
// z up-positive (away from the screen bottom, matching W/S keys).

// Past the dead zone the stick reports full direction at unit magnitude
// (Brawl Stars / Soul Knight style: the ship's own acceleration/drift supplies
// the "analog" feel, not partial stick push). Flip to proportional scaling by
// returning `clamped/radius` instead of `1` if playtesting prefers finer control.
export function stickVector(origin, point, radius, deadZone = 0.1) {
  const dx = point.x - origin.x,
    dy = point.y - origin.y,
    dist = Math.hypot(dx, dy);
  if (dist === 0 || dist / radius < deadZone) return { x: 0, z: 0, active: false };
  return { x: dx / dist, z: -dy / dist, active: true };
}

// Re-anchors the stick base so it trails the thumb once the drag exceeds the
// radius, instead of pinning the base and letting the thumb wander off it.
export function reanchor(origin, point, radius) {
  const dx = point.x - origin.x,
    dy = point.y - origin.y,
    dist = Math.hypot(dx, dy);
  if (dist <= radius) return origin;
  const t = (dist - radius) / dist;
  return { x: origin.x + dx * t, y: origin.y + dy * t };
}
