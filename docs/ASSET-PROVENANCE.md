# Asset Provenance and Approved Sources

## Rule

No provenance = no canonical release.

For each external asset record:
- asset name
- creator/source
- URL
- license at download time
- attribution requirement
- modifications
- importer/contributor
- original archive/source file when practical

## Preferred clean sources

### Kenney — first choice

Current asset pages for these packs state **CC0** (verify at download time — Kenney can change license terms per pack over time; verified for this doc in September 2026).

| Need | Pack | Source |
|---|---|---|
| 3D ships / planets / props | Space Kit | https://kenney.nl/assets/space-kit |
| Modular stations / structures | Modular Space Kit | https://kenney.nl/assets/modular-space-kit |
| Sci-fi UI | UI Pack - Sci-Fi | https://kenney.nl/assets/ui-pack-sci-fi |
| VFX | Particle Pack | https://kenney.nl/assets/particle-pack |
| Smoke/explosions | Smoke Particles | https://kenney.nl/assets/smoke-particles |
| Sci-fi SFX | Sci-fi Sounds | https://kenney.nl/assets/sci-fi-sounds |
| Impact SFX | Impact Sounds | https://kenney.nl/assets/impact-sounds |
| UI SFX | Interface Sounds | https://kenney.nl/assets/interface-sounds |
| Space backgrounds | Skyboxes | https://kenney.nl/assets/skyboxes |

Use these to replace questionable assets quickly. Over time, replace signature ships/landmarks with original community-created art so the game develops its own visual identity.

### Quaternius

Useful for 3D prototyping:
- Ultimate Space Kit: https://quaternius.com/packs/ultimatespacekit.html
- Spaceships Pack: https://quaternius.com/packs/spaceships.html
- License info: https://quaternius.com/license.html

Important: verify the **specific pack's license at download time**. Do not assume every pack from a creator uses the same license forever.

## Current repo assets requiring review

| Path | Status | Action |
|---|---|---|
| `src/assets/models/ships/avrocar_vz-9-av_experimental_aircraft.glb` | provenance unclear | replace or document exact license |
| `src/assets/models/ships/cryptos_saucer.glb` | provenance unclear / high risk | replace (do not attempt to document — risk profile too high to keep) |
| `src/assets/models/ships/ufo.glb` | provenance unclear | replace or document |
| Suno music/SFX | generated asset | preserve commercial-rights evidence |

All three ship models above remain in-tree as of this PR; none has been replaced or documented yet. Do not use them in marketing screenshots/trailers — see the marketing-capture note in `docs/PUBLIC-LAUNCH-FOUNDATION.md`.

## Preferred original-art pipeline

For signature content:

`concept -> provenance check -> original model -> gameplay LOD -> community review -> canonical asset -> optional printable version`

For 3D-printable items, keep the printable mesh license explicit and separate marketplace/commercial rights from in-game use rights.

## Contributor asset checklist

A PR adding visual/audio content must answer:

- Did you create this?
- If not, where did it come from?
- What exact license applies?
- Is commercial use allowed?
- Is modification allowed?
- Is attribution required?
- Was AI used?
- If AI was used, what model/service and what source/reference material was supplied?
- Can this asset legally appear in merchandise/3D prints, or only in-game?

If any answer is unknown, the asset stays out of the canonical release.
