# After v1.0

Protect the current movement and aiming. Ship one focused enhancement per release.

## v1.1 — Portal arena and pickup control
- One larger three-zone arena with paired, momentum-preserving portals, clear exits, and a re-entry cooldown. Ships only initially; server owns teleport events and clients snap interpolation.
- Energy cells restore the shared weapon capacitor; exposed placement rewards deliberate routing.
- Instant repair restores a capped amount of hull, never above maximum. Start with 35 hull and tune through play.
- Temporary shield absorbs a capped amount of damage, expires visibly, and cannot stack. Begin with 40 shield for eight seconds.
- Quantum overcharge: the next two ricochet shots gain an extra reflection, not permanent damage inflation. Obvious pickup sound and ship effect; tune cost and spawn timing.
- All pickups have server-owned respawn timers and atomic single-player collection. Prefer fixed contested locations over random luck. Bots must understand pickup routes.
- Resolve observed visual obstacle overlap and any reproduced collision/interpolation defects before adding more detailed cover.

## v1.2 — Memorable fights
Distinctive portal/landmark assets through Blender, richer positional audio, clearer bank-shot and elimination feedback, and a concise recap of clutch escapes and pickup control. Keep aim and threats readable. Avoid camera rotation, involuntary zoom, and full-screen explosion flashes.

## Infrastructure milestones
See HOSTING.md. Measure the actual host under active rooms, establish admission limits with headroom, and only then expand capacity. Preserve whole-room ownership when adding processes. Add shared results storage and routing before multiple replicas. No platform migration is required to validate the game.

Deferred: many new modes, large weapon catalogs, destructible worlds, paid power, and another engine rewrite.
