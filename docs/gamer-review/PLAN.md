# Quantum Drift: focused next milestone

Planning only; no game changes. September 9, 2026.

## Review receipts and limits
The independent critic completed browser input capture but hit its usage limit before delivering a written verdict. The parent reviewed its script, telemetry, and three action screenshots. This is a parent synthesis, not an independent critic pass or human playtest.

Evidence: `evidence.json`, reproducible offline input script `play.cjs`, 18 PNGs across Foundry and Canopy, all three weapons, 216 sampled positions. Native Apple M4 Max GPU; zero captured page exceptions; 33–56 draw calls at captured frames. FPS was not measured. Records APIs were intentionally blocked; multiplayer, persistence, and audio quality were not evaluated in this run.

Findings:
- Foundry laser fired 64 shots by simulation time 12.6 seconds, retaining 58.4 energy at the final sample. Continuous recharge largely cancels shot cost. This supports the reported unlimited-fire feeling.
- `foundry-bounce-27.png`: ricochets look like small green fragments, not a powerful long laser.
- `canopy-grenade-12.png`: grenade danger ring is visible; large ship labels and environmental outlines compete with it. Browser text selection is also visible; investigate pointer interaction.
- `foundry-laser-27.png`: considerable screen area shows the arena exterior near the boundary. Refine edge framing without changing movement or introducing camera rotation.
- No sampled local position intersected collision geometry at radius .799. Sparse offline sampling does not disprove the reported obstacle issue. Check visual hull versus collider, cover silhouettes, and remote interpolation before selecting a fix.

## Direction
Keep the current movement, aiming, camera orientation, and stack. Build memorable fights around energy-limited bursts, bank shots, and portal flanks. More meaningful decisions per fight are the priority.

## Ordered implementation plan
1. Trustworthy obstacles: reproduce the reported issue with two clients, align visible solid geometry and colliders, ensure smoothing never cuts through cover, and distinguish behind-cover silhouettes from solid ships.
2. Weapon identity: prototype a four-charge laser capacitor (25% per shot), a short recharge delay after firing, and a long traveling ricochet beam with clear reflection flashes. Keep grenades as cover pressure. Current laser damage is 24: four hits total 96, so explicitly compare 24 versus 25 damage rather than accidentally making a full burst unable to kill. Test shared-energy starvation across weapon switching. Strengthen kill explosions and distinct impact/fire audio without obscuring aim or globally pausing multiplayer.
3. One flagship portal map: start around 80×80 versus Foundry’s 60×60, with three recognizable combat zones, two alternative routes per zone, deliberate bank-shot walls, and one paired portal shortcut. Preserve momentum, clearly identify paired gates, ensure clear exits, prevent immediate re-entry, and snap network interpolation on teleport. Ships only through portals initially. Tune size against encounter frequency; extra empty space is not the goal.
4. Three timed pickups: energy refill on exposed routes, a capped temporary shield, and a limited-shot overcharge at a contested location. Server owns spawn timers and single-winner collection. Make effects recognizable by shape and sound as well as color. No permanent combat upgrades.
5. Finish the slice: reduce idle HUD clutter, improve boundary framing, polish explosions/audio, then use Blender for distinctive portal and landmark meshes with proven collision footprints. Add bank-shot and pickup contributions to recaps only after the rules settle.

## Acceptance gate
- Two clients agree on wall collisions, portal exits, pickup ownership, damage, and reconnect state, including injected latency.
- Four consecutive laser shots exhaust a full charge before recharge; no weapon-switch exploit or unexplained inability to fire.
- New players understand portal pairing, remaining shots, and incoming grenade danger without explanation.
- Compare first-contact time and time between engagements with the current map at 2, 4, and 8 players; shrink routes if travel dominates.
- Before/after action captures and frame-time measurements on the same hardware; target sustained 60 FPS on the current Mac, with no claim about untested hardware.

Defer additional modes, extensive map production, destructible worlds, a stack rewrite, and a broad progression overhaul. Work in bounded slices with one focused verification pass each. Commercial success cannot be inferred from screenshots or an automated score.
