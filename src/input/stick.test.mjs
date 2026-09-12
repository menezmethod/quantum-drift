import { test } from "node:test";
import assert from "node:assert/strict";
import { stickVector, reanchor } from "./stick.js";

test("dead zone reports inactive zero vector", () => {
  const v = stickVector({ x: 0, y: 0 }, { x: 2, y: 0 }, 40);
  assert.equal(v.active, false);
  assert.equal(v.x, 0);
  assert.equal(v.z, 0);
});

test("past the dead zone reports unit-magnitude direction, screen-y flipped to game-z", () => {
  const right = stickVector({ x: 0, y: 0 }, { x: 30, y: 0 }, 40);
  assert.equal(right.active, true);
  assert.ok(Math.abs(right.x - 1) < 1e-9 && Math.abs(right.z) < 1e-9);

  const up = stickVector({ x: 0, y: 0 }, { x: 0, y: -30 }, 40);
  assert.ok(Math.abs(up.z - 1) < 1e-9, "screen-up drag is game-forward (+z)");

  const diagonal = stickVector({ x: 0, y: 0 }, { x: 30, y: 30 }, 40);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-9, "unit magnitude on diagonals too");
});

test("a drag far beyond the radius still yields the same unit vector as at the radius", () => {
  const atRadius = stickVector({ x: 0, y: 0 }, { x: 40, y: 0 }, 40);
  const farBeyond = stickVector({ x: 0, y: 0 }, { x: 4000, y: 0 }, 40);
  assert.deepEqual(atRadius, farBeyond);
});

test("reanchor leaves the origin alone inside the radius", () => {
  const origin = { x: 100, y: 100 };
  assert.deepEqual(reanchor(origin, { x: 120, y: 100 }, 40), origin);
});

test("reanchor trails the thumb once it exceeds the radius, keeping it exactly radius away", () => {
  const origin = reanchor({ x: 100, y: 100 }, { x: 200, y: 100 }, 40);
  assert.ok(Math.abs(Math.hypot(200 - origin.x, 100 - origin.y) - 40) < 1e-9);
  assert.ok(origin.x > 100, "origin moved toward the thumb");
});
