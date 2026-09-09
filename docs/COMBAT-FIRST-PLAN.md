# Quantum Drift — Combat-first improvement plan

Planning document · 9 September 2026 · baseline: released v1.0.0

**Delivery update:** Follow [ROADMAP.md](ROADMAP.md) for the current effort-ranked sequence. Start with one map using existing assets, refine obstacles, and add systems incrementally. Original Blender art is deferred until gameplay layouts are proven. Tight, intense combat zones are a required map feature.

This supersedes earlier suggestions where they conflict. No implementation or hosting changes are authorized by this document alone. The local checkout was on an older commit when this plan was written; implementation must first identify the actual release/deployment checkout and preserve other ongoing work.

## 1. The promise

An immediately playable multiplayer arena fighter with an unmistakable visual identity: precise movement, lethal bank shots, limited energy, dangerous grenades, decisive pickups, and exhilarating portal chases.

The fight is the attraction. Industrial detail, story, progression, machinery, and modes support that promise. If a feature does not improve attacking, dodging, positioning, teamwork, or a comeback, remove it from the gameplay scope. It can remain scenery if it earns its rendering cost.

The outcome is not “more features.” It is a game that looks authored, feels responsive, generates memorable fights, and makes another match attractive.

## 2. Protect what already works

- Preserve screen-relative movement, independent aiming, existing drift feel, and the stable overhead camera. Do not restore heading-relative controls or a directional arrow.
- Preserve alternate views as options. New art must work in each supported view; the recommended overhead view receives first priority.
- Preserve classic FFA, quick practice, private invitations, readable weapons, and short respawns.
- Keep the server authoritative and shared gameplay rules consistent between practice and multiplayer. No engine replacement without a reproduced limitation that justifies it.
- Baseline weapon costs remain laser 25, ricochet 50, grenade 100, with a shared 100-energy capacitor regenerating at 24/second. Continuous recharge permits roughly four/five laser shots or two initial ricochets. One active grenade per pilot; maximum throw distance 20 world units.
- Ricochets are lethal weapons first. Optional environmental interactions cannot consume their identity or make them unreliable against players.

## 3. What counts as WOW

A numerical score or polished still image cannot establish combat quality. The plan is not yet a demonstrated WOW result, and previous independent criticism did not approve these proposed features.

The flagship experience must demonstrate all four beats:

1. **Arrival:** within the first few seconds, the arena has a memorable silhouette and focal landmark, the ship is identifiable, and the player understands where combat happens.
2. **Contact:** the first exchange makes each weapon recognizable through shape, motion, impact, and sound. Hits, danger, and depleted energy are unambiguous.
3. **Mastery:** an ordinary live match can produce a bank-shot elimination, a readable portal pursuit, or a contested-pickup comeback without scripted staging.
4. **Return:** the end of a match communicates what happened and makes rematching effortless.

Review captured motion, sound, actual input, and two-client behavior—not screenshots alone. Use a small fresh-player test as a milestone: at least four of five participants should independently understand movement/aiming and identify a memorable moment; record confusion and willingness to replay without coaching. This is qualitative feedback, not proof of market demand.

A visual/combat critic scores combat clarity, impact, arena quality, artistic identity, and multiplayer usability separately. Target at least 8.5/10 in every category, with written reasons and evidence. No averaging away a weak category. Broken collisions, obscured threats, unfair spawn situations, or material network regressions block the milestone regardless of scores. A score can remain below target; never raise it to declare completion.

## 4. A cohesive world and art direction

Working premise: pilots compete inside a once-functioning industrial network now divided among rival crews. The arenas are places with a former purpose, not disconnected boxes on a floor. Story arrives through machinery, signage, wear, sound, and crew markings. No mandatory exposition before a fight.

This premise is a creative direction, not a verified invention. ARC/Spark/Armor Critical is a close mechanical reference. “Quantum Drift” has existing name collisions; perform a naming comparison before a major branding campaign. Do not rename the current release automatically.

### Visual language

Use salvage-built engineering with a distinctive combination of rounded ceramic armor, exposed magnetic assemblies, chunky mechanical joints, and narrow illuminated channels. Make the silhouette recognizable before adding surface detail. Avoid generic glowing cubes and indiscriminate neon outlines.

Industrial richness should evoke the satisfaction of a connected, purposeful place. Do not copy Factorio assets, interface, layouts, or visual signatures. Our scale, silhouettes, palette, typography, and effects must form their own identity.

Establish a hierarchy:

- Ships and immediate threats have the strongest local contrast.
- Functional cover has clear, calm outlines and readable height.
- Landmarks orient the player without overpowering combat.
- Background machinery carries most decorative motion and intricate detail.
- Team identifiers remain visible against every environment and effect.

Create an art bible covering palette, materials, proportions, lighting, damage language, typography, sound references, and examples of acceptable versus distracting detail. Retain source files and asset-license records; AI-assisted creation is not proof of originality.

### Blender production

Use Blender MCP for deliberate asset production after validating footprints: one hero ship, modular cover, a portal assembly, and a signature landmark first.

Each shipped asset needs a source .blend, game-ready glTF/GLB, consistent scale/origin, separate collision proxy, reusable materials, and an appropriate lower-detail variant where measurement warrants it. Preview at actual combat distance in all supported views. No asset passes because it looks impressive in a close-up Blender render.

Set geometry, material, texture, and draw-call budgets from measured scene performance. Favor shared materials, instancing, static lighting where suitable, and a procedural fallback during loading/failure. Do not load production .blend files in the browser.

## 5. Obstacles: the first gameplay/art problem to solve

Audit every visible obstacle against authoritative collision, local prediction, remote interpolation, and actual ship footprint. Reproduce the reported pass-through appearance; distinguish real tunneling from cosmetic overlap, occlusion silhouettes, and smoothing across corners. The earlier sparse offline samples did not prove the problem absent.

Define a small visual vocabulary:

| Class | Fight purpose | Readability rule |
| --- | --- | --- |
| Solid machinery | Break line of sight, flank, block movement | Visible base matches collision; no invisible shoulders |
| Deliberate bank surfaces | Enable skilled ricochets | Flat, understandable surfaces; consistent reflection |
| Cover behind which ships can hide | Create tactical occlusion | Ship indicators/silhouettes distinguish concealment from passing through geometry |
| Portal structures | Reposition, chase, escape | Entrance and exit clear of solid collision and spawn zones |
| Background machinery | Establish scale and identity | Outside playable space or unmistakably decorative |

Replace repetitive blocks with purposeful assemblies: turbine housings, reactor bases, cargo fixtures, coolant vessels, and structural supports. Do not introduce a special collision rule for every prop. Keep a small reliable set of gameplay shapes under richer visual shells.

Acceptance: no reproduced penetration or corner-cutting in normal movement at tested latency; grenades and ricochets respect documented geometry; rendered hulls do not misleadingly overlap solid cover; decorative pipes do not secretly snag players.

## 6. Combat feel and weapon identity

Tune sound, projectile presentation, hit confirmation, and threat communication before adding weapons.

- **Laser:** crisp burst identity, a distinct hit sound, clear energy expenditure, and a restrained recharge-ready cue. Current 24 damage means four hits total 96: explicitly evaluate that finishing-shot tension before changing damage or recharge.
- **Ricochet:** long traveling beam/bolt, readable direction, sharp reflection flash and sound, and satisfying confirmation for bank-shot eliminations. Visual length must not suggest a damaging area the simulation does not support. Avoid a persistent maze of bright trails.
- **Grenade:** visibly capped landing reticle, clear arc/fuse, one active grenade, unmistakable blast timing, distance falloff, cover protection, and readable self-danger. No unlimited cursor-range illusion.
- **Damage and destruction:** brief hull response, directional cues where helpful, a strong but short explosion core, expanding shockwave, and bounded debris. Preserve visibility of surviving threats.
- **Audio:** distinguish launch, ricochet, impact, depletion, pickup, shield break, and destruction. Prioritize nearby danger, cap simultaneous sounds, provide volume controls, and avoid constant announcer interruption.

No global hit-stop in multiplayer. Any camera shake is subtle, optional, and must not alter aim. Do not use full-screen flashes to manufacture spectacle.

## 7. Flagship arena and portals

Complete one exceptional arena before upgrading every map. Working arena: **The Crucible**, a foundry built around a visually striking reactor. Name is provisional.

Start near 80×80 world units versus the 60×60 Foundry baseline, but tune to encounter frequency. Bigger is useful only when routes and opponents justify it.

Three connected combat areas:

- An exposed central crossing with a desirable pickup and multiple approaches.
- A tighter machinery flank with intentional bank-shot walls and escape options.
- A wider outer route for movement, pursuit, and a portal connection.

Avoid long safe perimeter laps, blind dead ends, dominant spawn sightlines, and an unavoidable central bottleneck. Landmarks should orient players without floor labels being essential.

Start with one paired portal shortcut. Preserve speed, transform direction consistently with the exit orientation, and preserve understandable screen-relative controls. Pair entrances using shape, animation, and color. Mark exit direction and prevent immediate re-entry loops. Exit clearance and occupied-exit behavior must be explicit and server-owned; never resolve a teleport inside cover or another ship. Avoid automatic invulnerability unless testing demonstrates a need.

Ships travel through portals initially. Projectile-through-portal behavior is deferred because it can make attack origins confusing. On teleport, reset prediction/interpolation appropriately rather than drawing a ship sliding across the map.

## 8. Pickups that create fights

Use fixed, recognizable, exposed spawn locations and server-controlled timers. Values below are starting hypotheses, not settled balance.

| Pickup | Initial prototype | Intended decision |
| --- | --- | --- |
| Energy cell | Restore 50 energy, capped at 100 | Re-engage quickly versus hold safer cover |
| Instant repair | Restore 35 hull, capped at maximum | Contest recovery instead of waiting out of combat |
| Temporary shield | Absorb up to 40 damage for eight seconds; no stacking | Commit to a push with a visible short advantage |
| Quantum overcharge | Next two ricochets gain one extra reflection; expires if unused | Create a temporary bank-shot opportunity, not guaranteed kills |

Launch the first arena with energy, repair, and shield. Add overcharge only after those are legible and balanced. Shield damage precedes hull damage and its expiration/break must be obvious. Bots need navigation and decision support for pickups and portals.

No random instant-win drops, permanent damage upgrades, unexplained stacking, or client-authorized collection. Test two players touching a pickup on the same tick and reconnecting during a temporary effect.

## 9. Team play and modes

Build shared team infrastructure once: teams in authoritative state, balanced assignment, explicit private-room selection, safe team-aware spawns, team scores, friendly-fire rules, bot behavior, and recap attribution.

Same-team ships share strong accent colors and symbols across hull, indicators, radar, and scoreboard. Cosmetics cannot hide allegiance. Friendly fire defaults off; custom matches can enable it. Team rules must also apply to grenades, ricochets, shields, and future environment damage. Prevent easy mid-round team switching exploits.

Release modes in order:

1. **FFA:** preserve the current uncomplicated foundation.
2. **Team deathmatch:** the first team release; meaningful coordination without new objectives.
3. **Capture the core:** attack, escort, return, and interception. Prototype carrier speed and portal policy; document rules before balancing maps. No trivial portal scoring loops.
4. **Power control, experimental:** only if combat tests show stronger fights. Capturing a junction may change a route; avoid automatic damage buffs and maintenance chores.

Initially expose only FFA and team combat as public queues. Put other modes in private rooms or a rotating playlist until population supports more queues. Private matches expose map, teams, bots, time/score limits, and friendly fire without a wall of settings.

## 10. Machinery has to earn its place

Interactive machinery is optional, not a promised pillar. Prototype at most one mechanic: for example, a clearly marked receiver briefly rotates a bank-shot wall when hit.

Keep it only if it creates an understandable attack, dodge, ambush, or escape during an ongoing fight. Compare matches with it enabled and disabled. Reject it if players stop fighting to operate equipment, cannot predict the result, or die without understanding what changed.

Never introduce factory construction, production chains, repairs as chores, power puzzles, or map-wide outages that disable movement/weapons. If the prototype fails, put the effort into art, audio, and better geometry instead.

## 11. Multiplayer quality, performance, and retention

Rendering runs on players’ machines; room simulation and network traffic run on the host. Optimize and measure them separately.

- Validate two real clients first, then full eight-player rooms, including movement/fire, portals, pickups, team damage, death/respawn, round changes, and reconnects.
- Test simulated 120ms round-trip latency and an additional worse-network case. Critical actions remain server-owned; clear feedback must not promise a pickup or hit the server later rejects without reconciliation.
- Keep frame-time and effect budgets bounded under simultaneous explosions and portal effects. Target stable 60 FPS on explicitly named reference hardware; test a lower-spec integrated GPU and a supported touch device before making broader claims. Record frame-time percentiles, not only average FPS.
- Measure host CPU, RSS, tick scheduling, network egress, and latency while raising active players gradually. Admission limits are protective settings, not capacity guarantees. Hosting remains a separate handoff.
- Keep rematch fast. Recaps emphasize result, useful performance, and earned moments; add a bank-shot counter only once its definition is reliable.
- Cosmetics, crew identity, and mastery challenges provide long-term expression. Do not make competitive strength depend on grind.

## 12. Delivery sequence and gates

| Stage | Concrete deliverable | Exit gate |
| --- | --- | --- |
| A: Baseline and direction | Identify release checkout; capture real combat; obstacle reproduction; art bible and ship/landmark concepts | Agreed identity and measurable defects; no movement regressions |
| B: Combat foundation | Collision fixes, weapon impact/audio, energy cues, cleaner HUD | Reliable two-client fights; readable weapons and cover |
| C: Flagship experience | Blender asset kit, complete Crucible arena, one portal pair, three pickups, bots that use them | Actual matches create the four WOW beats; performance and fairness gates pass |
| D: Team release | Team colors/symbols, teams, TDM, custom-room settings | Full-room team rules, safe spawns, understandable results |
| E: Objective expansion | Capture-the-core and a second fully authored arena | Objectives improve pursuit/teamwork; no population fragmentation |
| F: Optional experiments | One machinery/control prototype; overcharge; richer cosmetics | Retain only demonstrated combat improvements |
| G: Broader scale | Remaining arena art, measured optimization, infrastructure capacity work | Proven experience and capacity before wider claims |

Stages are scope boundaries, not promised dates. Each release must be playable on its own. Do not combine every stage into one expensive rewrite.

## 13. Verification and efficient execution

Use one bounded builder pass and one focused critic pass per meaningful stage. Parallel work is justified only when ownership is separate and integration is clear. One integrator owns simulation/server contracts; asset and HUD work must not silently change gameplay rules.

Before claiming improvement, retain comparable before/after receipts from the same map, camera, hardware, and gameplay scenario. Include live-match motion/audio for feel claims and controlled captures for visual comparison. Clearly label staged scenes. Record build, findings, scores, blockers, and evidence paths in docs/STATUS.json.

Start the next pass with the lowest-scoring high-impact defect. Fix critical reliability issues before cosmetic additions. If a feature fails two focused attempts, simplify or remove it; do not burn tokens chasing a score through narration. A blocked or substandard stage stays openly incomplete.

Keep updates brief. Reuse verified information. Run tests appropriate to changes; repeat broader suites when integration, dependency changes, or failures justify them. Save decisions and remaining work so later sessions resume without another whole-repository audit.

The final milestone is earned only when the game demonstrates distinctive art, immediately readable combat, memorable unscripted fights, dependable multiplayer, and a clear desire to replay. More detail and more modes do not substitute for that result.
