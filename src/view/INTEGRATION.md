# View module integration request

Ready for parent integration. Builder changed only `src/view/`; no builds, server restarts, commits, core changes, scores, or visual-improvement claims.

## CameraRig.js

Named/default `CameraRig(camera)` accepts the renderer's Three PerspectiveCamera. Named `CAMERA_PRESETS = {tactical:0,chase:1,overview:2,isometric:3}` and pure `cameraPose(options)` are exported.

- `update({player,aim,map,dt,lobby,view,zoom})`: call once per frame after ship interpolation and before rendering / indicator projection. `player={x,z,angle,vx,vz}`; use local rendered x/z/angle combined with predicted velocity. `aim={x,z}` is a world-space point. `map.size` is the arena HALF extent. `dt` is seconds. `lobby` defaults false. Explicit numeric `view` overrides the selected preset. `zoom` defaults 1 and clamps to 0.7–1.5; larger means closer. Returns desired `{position,target,view,zoom}`; actual camera follows exponentially.
- `reset()`: snap on next update; call on respawn, map changes and showcase resets. Large teleports and preset/lobby transitions already snap. The tactical heading stays fixed even while turning or aiming. Velocity/aim lookahead is capped jointly at 3.5 world units.
- `setPreset('tactical'|'chase'|'overview'|'isometric')`: persists a default when update omits `view`; invalid names throw RangeError.
- 0 = stable tactical follow (new default), 1 = legacy rotating chase, 2 = centered map overview, 3 = fixed isometric follow. Lobby/missing player uses a fitted isometric map composition. Overview fits all ground corners at zoom 1 including portrait aspect; zoom >1 deliberately crops the overview. Far plane must remain >=250 for current map sizes. Camera `up` is world Y; default heading does not orbit. CameraRig owns position/orientation only; resize and projection remain renderer-owned.

Replace the entire previous camera block in ArenaRenderer.draw with this rig, rather than running both camera controllers. Instantiate once. Set camera aspect/projection as before. Update all camera labels/cycles/showcase lookup to four indices; the previous indices differ.

## ShipIndicators.js

Named/default `ShipIndicators(container)` creates one absolute, non-interactive DOM overlay and imports `indicators.css` using the existing webpack CSS pipeline. Mount in an existing **positioned** container matching the canvas CSS viewport; `#game` is suitable only if it has position relative/fixed and full viewport dimensions. Root z-index is 4; HUD/modals must remain above this. Hide the container during lobby/world-only showcase, or call update with `players:[]`.

`update({players,localId,camera,width,height,time})`:

- `players`: array of `{id,name,alive,health,maxHealth?,protectedUntil,renderPosition:{x,y,z}}`. `renderPosition` MUST be the ship group's current world position (not its server target) to avoid jitter/sliding. A Three Vector3 works; it is not mutated. Flat x/z with y optional is supported as a fallback, assuming ship center y=0.9. Feed interpolated/predicted local coordinates too.
- Example inside the renderer after all ship positions and CameraRig are updated:

```js
const indicatorPlayers = state.players.map(p => ({
  ...p,
  renderPosition: this.ships.get(p.id)?.group.position,
}));
this.indicators.update({
  players: indicatorPlayers,
  localId: playerId,
  camera: this.camera,
  width: this.canvas.clientWidth,
  height: this.canvas.clientHeight,
  time: state.time,
});
```

- `width/height` are CSS pixels, never drawing-buffer/device-pixel dimensions. `time` is simulation time in seconds, the same timebase as `protectedUntil`.
- Local pilot is included with `YOU · name`. Hull is ten partially filled segments with an exact rounded percentage; maxHealth defaults 100. Protection is a separate violet shield-outline badge reading `PROTECTED`, shown strictly while protectedUntil > time. Energy does not control this badge.
- Disable all old `ship.label` sprites (including the line that restores their visibility every frame), retaining Three ship shields. Otherwise names will be duplicated.
- Labels reject behind-camera/offscreen positions. Close ships get deterministic separate positions, local first, with connector stems to their rendered anchors. Known HUD elements are avoided using their actual bounding rectangles. Mark additional HUD boxes with `data-ship-indicator-obstacle` (use individual content boxes, not a full-screen HUD root).
- Every living pilot is considered; labels with no free nearby slot are hidden instead of placed over HUD/other labels. This is an explicit crowded/edge fallback requiring integrated capture review, not a guarantee all pilots can be labeled simultaneously on every viewport. Long visible names ellipsize; full names remain in the accessible label. Geometry occlusion does not suppress overhead labels.
- `dispose()` removes only the owned overlay/nodes; safe twice. Call from renderer teardown.

## Validation and remaining integration work

`node --test src/view/view.test.cjs` passes 7 tests covering bounded/fixed tactical orientation, zoom/wall transforms, overview corner fit at several aspect ratios/map sizes, damping/reset/teleport, partial hull segments, timed protection distinct from energy, safe text/local name, rendered coordinates, offscreen/dead/departed cleanup, collision/HUD suppression and disposal. Tests import the actual ES module source via data URL (Three module resolved locally), excluding only CSS; no webpack build needed. DOM tests use a minimal fake DOM and do not prove CSS layout.

Inspected before implementation: `docs/gauntlet/evidence/baseline-health-night.png` and `docs/gauntlet/evidence/baseline-isometric-dusk.png`. They show missing overhead health/protection and small world-space identity labels. No integrated after captures exist from this builder. Parent should integrate then capture tactical/chase/overview/isometric and health mode, including zoom endpoints, wall positions, clustered ships, portrait viewport, protection expiry, and lobby/world hiding; inspect images before any quality claim. In particular check HUD selector coverage against concurrent UI changes and nearby cover height.

Changed paths:
- `src/view/CameraRig.js`
- `src/view/ShipIndicators.js`
- `src/view/indicators.css`
- `src/view/view.test.cjs`
- `src/view/INTEGRATION.md`
