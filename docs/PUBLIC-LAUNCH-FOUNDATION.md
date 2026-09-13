# Public Launch Foundation

> Working product/IP policy. Not legal advice. Before trademark filing or a meaningful commercial launch, have a U.S. IP attorney review the final name, licenses, contributor terms, and asset register.

## Product identity

This is **not an ARC remake**.

It is an independently built large-scale multiplayer arena game inspired by the *feeling* of older arena games such as ARC: instant controls, fast respawns, chaotic team fights, ricochets, projectiles, and large populations.

We may acknowledge ARC historically, but we do **not** copy or ship ARC source code, art, audio, maps, UI, logos, lore, characters, or other expressive material.

Reference: U.S. Copyright Office guidance states that game ideas/methods of play are not protected by copyright, while specific code, artwork, text, sound, and audiovisual expression can be.
- https://www.copyright.gov/register/tx-games.html

## Non-negotiable IP rules

1. No ripped or mystery assets in canonical releases.
2. Every external asset must be recorded in `docs/ASSET-PROVENANCE.md`.
3. No recreation of another game's logo, map, UI, ship, story, or character closely enough to create confusion.
4. Community/AI submissions must disclose source material, tools used, and rights/license.
5. The official game name/logo remain controlled separately from the source-code license.

## Current repo cleanup before promotion

Replace or prove provenance for:
- `src/assets/models/ships/avrocar_vz-9-av_experimental_aircraft.glb`
- `src/assets/models/ships/cryptos_saucer.glb`
- `src/assets/models/ships/ufo.glb`

Do not use unverified assets in screenshots, trailers, merch, or 3D prints.

## License strategy

### Current reality

The repo is already MIT licensed. Existing MIT releases remain usable under MIT.

### Recommended future direction

My preferred structure is:

- **AGPL-3.0** for future canonical game/server code
- separate trademark/brand policy
- explicit asset licenses
- contributor agreement before accepting substantial external contributions

Why AGPL: it is still open source and commercially usable, but modified network-hosted versions must offer corresponding source to users.

Reference:
- https://choosealicense.com/licenses/agpl-3.0/

Do **not** change the license yet. First:
1. verify code ownership;
2. decide the effective version/date;
3. choose CLA vs DCO;
4. get a short legal review.

If maximum adoption matters more than reciprocity, keeping MIT is also defensible; then the moat is the official brand, servers, community, moderation, marketplace, and physical products.

## ARC acknowledgment

Safe positioning:

> Inspired by memories of classic large-scale arena games such as ARC: Attack Retrieve Capture.

Avoid:
- "ARC remake"
- "ARC 2"
- ARC in the product title
- implying endorsement or affiliation
- ARC artwork/screenshots/logo in marketing

## Name strategy

### Rejected in preliminary search

Do not use without a new legal clearance:
- Quantum Drift
- Shardwake
- Riftwake
- Voidwake
- Driftforge
- **Orbline** — active ORBLINE Co., Ltd. in Japan operates in mobile apps/games; an existing OrbLine Strategy game also exists. Too much same-industry collision risk.

### Working shortlist

These are **not trademark-cleared**:
1. **Fluxward** — strongest current candidate.
2. **Starweld**
3. **Vectorfall**
4. **Phasefront**
5. **Corewake**
6. **Hexwake**

### Final name gate

A finalist must pass:
- USPTO search
- common-law/web search
- Steam / itch.io / app-store search
- GitHub search
- domain availability
- social-handle search
- no confusingly similar game/software brand

USPTO references:
- https://www.uspto.gov/trademarks/basics/why-search-similar-trademarks
- https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks

## AI-generated content

Keep provenance for generated music, art, code, models, and audio.

For Suno or similar tools, retain:
- generation date
- account/tier
- song/asset ID
- applicable commercial-use terms
- source/master when practical

Never prompt for direct replicas of another game's copyrighted character, logo, art, or named visual asset.

## Community governance

Community direction is advisory; maintainers protect the canonical build.

Flow:

`Idea -> Discussion -> RFC -> Prototype PR -> tests -> playable preview -> community feedback -> maintainer decision -> release`

Maintainers may reject proposals for:
- IP/license risk
- security or cheating
- poor scalability
- moderation/safety
- performance
- breaking the game's identity

Before broad contributor outreach, add:
- `CONTRIBUTING.md`
- Code of Conduct
- CLA/DCO decision
- PR template with provenance + AI disclosure
- `SECURITY.md`

## Monetization

Open source does not mean no business.

Good future revenue:
- official hosted servers
- cosmetics / ship skins
- supporter packs
- tournaments/events
- creator marketplace fee
- revenue share for community assets
- official 3D prints/collectibles
- commercial support/private deployment offerings

Avoid pay-to-win.

The durable moat is:
**official brand + canonical universe + community + hosted service + moderation + marketplace + physical goods.**

## Technical north star

Long-term goal:

> One battlefield that grows from a handful of players to hundreds, and eventually thousands, without losing readable instant combat.

Do not market unmeasured concurrency.

Milestones:
`8 -> 32 -> 64 -> 128 -> 256 -> distributed world`

Likely technical path:
- spatial partitioning / interest management
- delta snapshots
- client prediction/interpolation
- authoritative simulation cells
- migration between cells
- load testing before every public population claim

## What makes this game original

Not one isolated weapon or control scheme.

The identity should become:
- population-responsive expanding world
- large faction battles
- skill-based projectile combat
- community-proposed evolution
- AI agents as players and contributors
- community-created ships/lore/art
- digital creations that can become physical collectibles

The goal is **not prettier ARC**.

The goal is to preserve the feeling that made massive arena combat addictive, then build a new universe on top of it.
