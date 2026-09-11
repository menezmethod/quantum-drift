# Quantum Drift — Soundtrack & SFX

Original score and sound effects generated with **Suno v6** (base model, instrumental,
"seamless loop" prompting). This document is the spec: what each cue is, where it plays,
where to chop it, and how to wire it into the client.

The game currently ships **no music** and only oscillator-synth weapon blips
(`src/index.js:629 playSound()`). Everything below is additive. The oscillator SFX stay
as the zero-latency fallback; sampled SFX are an opt-in upgrade layered on the same
`AudioContext` (`src/index.js:620`).

---

## 1. Asset status

**All 15 cues generated, downloaded, chopped and encoded into the repo.** Raw WAV masters
are in `./_raw/` (gitignored, 207 MB); re-run `scripts/audio/build-soundtrack.sh` to
rebuild from them.

| Cue | File in repo | Loop len | Size | Suno clip |
|---|---|---|---|---|
| Menu / lobby bed | `src/assets/music/signal-hub.ogg` | 43.6 s | 664 K | [9d3e424c](https://suno.com/song/9d3e424c-a533-4d61-9558-efc9953a5262) |
| Pre-combat / practice bed | `src/assets/music/standby.ogg` | 34.8 s | 532 K | [7a2bbc85](https://suno.com/song/7a2bbc85-8d72-4c7e-aa6f-e6932a7c711e) |
| Industrial core combat (`core`) | `src/assets/music/foundry.ogg` | 59.0 s | 768 K | [1359efb2](https://suno.com/song/1359efb2-6b2a-4a8e-8846-fe2e9ee82591) |
| Forest biodome combat (`forest`) | `src/assets/music/biodome.ogg` | 63.9 s | 956 K | [ab3020f5](https://suno.com/song/ab3020f5-d395-4c04-9ff1-d6d95a47576f) |
| Orbital rail yard combat (`rails`) | `src/assets/music/rail-yard.ogg` | 60.9 s | 840 K | [a919a371](https://suno.com/song/a919a371-7aa9-423c-a9cc-5828244416fd) |
| Frozen relay combat (`ice`) | `src/assets/music/cold-relay.ogg` | 49.6 s | 692 K | [12baa6fb](https://suno.com/song/12baa6fb-fb63-4c36-93d9-4eea07f7be97) |
| District-unlock riser | `src/assets/music/sting-district-unlock.ogg` | 4.5 s | 56 K | [5212779c](https://suno.com/song/5212779c-5e0d-436b-b995-805a75778bf0) |
| Round-end / recap sting | `src/assets/music/sting-recap.ogg` | 3.5 s | 56 K | [031dde67](https://suno.com/song/031dde67-2548-4035-b018-c087f6239350) |
| Round-winner flourish | `src/assets/music/sting-victory.ogg` | 3.0 s | 44 K | [0e521bb3](https://suno.com/song/0e521bb3-a671-4779-bb08-450ca9e7412e) |
| SFX — laser fire | `src/assets/sounds/laser.mp3` | 0.35 s | 8 K | [cc392f24](https://suno.com/song/cc392f24-0897-452b-ac9b-1a13b9ddb4e8) |
| SFX — ricochet | `src/assets/sounds/ricochet.mp3` | 0.45 s | 12 K | [d2409c3e](https://suno.com/song/d2409c3e-1b6e-444b-8dd1-49778ca8ca27) |
| SFX — grenade launch | `src/assets/sounds/grenade-launch.mp3` | 0.40 s | 8 K | [d33f6650](https://suno.com/song/d33f6650-5a53-4dfa-bb94-9ee01d35cf7c) |
| SFX — explosion | `src/assets/sounds/explosion.mp3` | 0.90 s | 16 K | [18076d73](https://suno.com/song/18076d73-c073-4424-989a-a2764a7176ae) |
| SFX — ship destroyed | `src/assets/sounds/ship-destroyed.mp3` | 2.2 s | 36 K | [b68c6191](https://suno.com/song/b68c6191-e5c6-420b-a8a6-1d0b9a8a98de) |
| SFX — respawn | `src/assets/sounds/respawn.mp3` | 1.6 s | 28 K | [c4520896](https://suno.com/song/c4520896-1277-4029-8285-eeae44fa18fb) |

Music total **~4.5 MB** OGG/Opus 112 kbps 48 kHz stereo. SFX ~90 KB MP3 128 kbps mono
(explosion stereo). Nothing is wired into the client yet — see §7.

**Notes on the source files:**

- Each generation made **two takes**; these are the A take. The B take is the adjacent
  workspace row (same title) — swap if a take doesn't sit right. All takes are unlocked,
  so re-downloading is free.
- The 6 beds downloaded as Suno's `_paid_wm.wav` (a low-level perceptual watermark). It's
  inaudible in a game mix but it *is* in the file; regenerate/redownload later if that
  ever matters for a standalone OST release.
- `bounce.mp3` / `laser-bounce.mp3` / `grenade-laser.mp3` are old dead assets from a
  previous build — unreferenced, safe to delete. `laser.mp3` was overwritten with the new
  one.
- `build-soundtrack.sh` uses **libopus at 48 kHz** (this box's ffmpeg has no libvorbis);
  every `ffmpeg` call carries `-nostdin` so the bar-table `while read` loop isn't eaten.

### How the raw files were pulled (for next time)

Suno v6 serves encrypted streaming audio — no plain file URL, `<audio>` is an MSE blob
you can't `fetch()`, and the automated browser's download queue wedges after ~2 files.
What works: trigger the UI download (**⋯ → Download → WAV → Unlock & Download**) to make
the app hit `studio-api-prod.suno.com/api/download/clip/<id>?format=wav`, which redirects
to a **presigned S3 URL** (`suno-data-uploads.s3.amazonaws.com/studio/uploads/<id>*.wav`,
~1 h expiry, no auth). Read that URL out of the network log and `curl` it directly —
Brave's own download completing is irrelevant.

---

## 2. Soundtrack map — cue ↔ game state

All hooks are in `src/index.js`. `this.mode` is `"lobby" | "connecting" | <playing>`;
round-over is `state.restartAt` truthy; district stage is `this.map.stage` (0–3, shown as
`N/4 open`); `event(e)` already fans out combat events.

| Game state | Cue | Trigger / hook | Behaviour |
|---|---|---|---|
| Main menu, lobby, room screen | **Signal Hub** | `this.mode === "lobby"` (set at `:36`, `:476`, `:560`) | Loop at −18 LUFS. Fade in 1.5 s on first `unlockAudio()`. |
| Practice (bots) | **Standby** | `practice()` `:373` | Loop. Practice is low-stakes → keep the calm bed, don't switch to a combat track. |
| Connecting to online | **Signal Hub** (keep playing) | `this.mode === "connecting"` `:706` | No change; let it ride under the connecting spinner. |
| Online combat — industrial core | **Foundry** | entered online play in district `core` | Crossfade from Signal Hub over 2 s. |
| Online combat — forest biodome | **Biodome** | local ship inside `forest` district (`round-label` logic at `:730` already resolves the district by position) | See §3 crossfade. |
| Online combat — orbital rail yard | **Rail Yard** | local ship inside rail-yard district | See §3. |
| Online combat — frozen relay | **Cold Relay** | local ship inside relay district | See §3. |
| District unlocks (3 / 5 / 7 humans) | **District-unlock riser** (one-shot) | `event({type:'mapChanged', announcement})` `:596` — already drives `this.notice()` | Duck the current bed −6 dB for the riser's length (~13 s → trim to ~4 s, see §4), then back up. The boundary opens 5 s after this event; time the riser to resolve on the open. |
| Local death | duck bed −9 dB, low-pass 800 Hz | `event({type:'kill', player:this.playerId})` `:604` and `p.alive===false` | 3 s respawn window (`p.respawnAt`). |
| Respawn | **SFX respawn** + release the duck | `p.alive` flips true / `#respawn-time` (`:752`), `#death-panel` (`:749`) | One-shot; bed returns to full over 0.4 s. |
| Round over / recap | **Recap sting** (one-shot) then bed → −12 dB | `state.restartAt` truthy, `#round-panel` shown `:754` | 10 s intermission. Sting on entry; hold bed quiet under the "Next round in N" panel (`:757`). |
| Round winner is local player | **Victory flourish** (one-shot) over the recap sting | `state.winner` vs local callsign, `#winner` `:755` | Plays instead of / on top of the recap sting. |
| Next round starts | bed back to combat level, re-evaluate district | `state.restartAt` clears, `state.round` increments | Everyone respawns inside the new population boundary — re-run the §3 district check. |
| Menu opened mid-match (Esc) | bed −6 dB | `menu(true)` `:544` | Pause is UI-only; don't stop the loop, just duck. |

**Keys/tempo (for anyone re-scoring or layering):**

| Cue | BPM | Key | Notes |
|---|---|---|---|
| Signal Hub | 88 | D minor | tonic of the set |
| Standby | 110 | D minor | shares key with hub → seamless lobby→practice |
| Foundry | 130 | F minor | relative-ish, hardest-hitting |
| Biodome | 120 | A minor | |
| Rail Yard | 126 | C minor | |
| Cold Relay | 116 | D minor | back to tonic; menu→relay is a clean cut |
| Stings | ~120 | D minor | sit under any bed |

BPMs above are **what the prompt asked for, not measured** — Suno may not have honoured
them exactly. Confirm each with `ffmpeg -i in.wav -af ebur128` plus a beat-detect / manual
tap before trusting the bar math in §4. Keys are likewise the request, not verified.

All natural-minor and mutually compatible, so any two beds can crossfade without a
key clash even across a district border.

---

## 3. District crossfades

Confluence (`shared/maps/world.js`) is one connected world, sim size 60, four districts
centred at (±30, ±30). Each border has **two crossings**, so a pilot can be near a
boundary with two beds "valid" at once. Don't hard-switch on district enter.

The district records are:

| `id` | `name` | `label` | centre (x, z) | unlocks at |
|---|---|---|---|---|
| `core`   | Industrial core   | FORGE  | (−30, −30) | 1 human (always open) |
| `forest` | Forest biodome    | GARDEN | (−30, +30) | 3 humans |
| `rails`  | Orbital rail yard | DOCK   | (+30, −30) | 5 humans |
| `ice`    | Frozen relay      | RELAY  | (+30, +30) | 7 humans |

Logic (music manager, per frame or on a 250 ms timer):

1. Resolve current district from local ship position — reuse the coarse quadrant test
   already in `hud()` (`src/index.js:730`):
   `this.map.districts?.find(d => Math.abs(p.x-d.x)<30 && Math.abs(p.z-d.z)<30)`.
   (Districts also carry `w`/`d` extents if you want a tighter box.)
2. Map `id` → bed: `core → Foundry`, `forest → Biodome`, `rails → Rail Yard`,
   `ice → Cold Relay`. Menu/practice → Signal Hub / Standby.
3. On change, **equal-power crossfade over 2.0 s** (2× `GainNode`, one ramping
   `1→0`, the other `0→1` with `setValueCurveAtTime` on a `cos/sin` curve). Keep both
   `AudioBufferSourceNode`s playing during the fade; stop the outgoing one on `onended`
   of the ramp.
4. Debounce: ignore a change that reverts within 3 s (pilot skimming a border crossing).
5. Only one combat bed audible at a time; the unlock riser and stings are separate
   one-shot buses that duck whatever bed is playing.

---

## 4. Chop points — beds

Suno renders an intro ramp, a full arrangement, and a hard ending. For a game loop you
want an **integer number of bars** from the middle, looped with a short seam crossfade.

`barLen = 4 * 60 / BPM`. Recommended: trim in at **bar 8** (past the intro), take a
**16–32 bar** body, discard the rest.

| Cue | BPM | barLen (s) | trim-in `-ss` | body bars | body length `-t` | loop |
|---|---|---|---|---|---|---|
| Signal Hub | 88  | 2.7273 | `21.818` | 16 | `43.636` | whole file, `loop=true` |
| Standby    | 110 | 2.1818 | `17.455` | 16 | `34.909` | whole file |
| Foundry    | 130 | 1.8462 | `14.769` | 32 | `59.077` | whole file |
| Biodome    | 120 | 2.0000 | `16.000` | 32 | `64.000` | whole file |
| Rail Yard  | 126 | 1.9048 | `15.238` | 32 | `60.952` | whole file |
| Cold Relay | 116 | 2.0690 | `16.552` | 24 | `49.655` | whole file |

These are **estimates** — Suno's downbeat is not exactly at t=0 and its tempo drifts
±1 %. Before committing each loop:

```sh
# visualise the first ~30 s to find the true first downbeat, then nudge -ss to it
ffmpeg -v error -i in.wav -t 30 -lavfi showwavespic=s=1800x240 seam-check.png
# after cutting, check the loop seam is click-free: last 0.5 s vs first 0.5 s
ffmpeg -v error -sseof -0.5 -i loop.wav -af astats=metadata=1 -f null - 2>&1 | grep RMS
```

Nudge `-ss` so the cut lands 1–2 ms *before* a kick transient; the trailing
`acrossfade` (below) hides the wrap.

### ffmpeg recipe — all six beds

Put the downloaded WAV/M4A files in `./_raw/` named `signal-hub`, `standby`, `foundry`,
`biodome`, `rail-yard`, `cold-relay`.

```sh
#!/usr/bin/env bash
set -euo pipefail
mkdir -p src/assets/music
# name  ss       t
rows="
signal-hub  21.818  43.636
standby     17.455  34.909
foundry     14.769  59.077
biodome     16.000  64.000
rail-yard   15.238  60.952
cold-relay  16.552  49.655
"
XF=0.12   # seam crossfade seconds (~1/16 bar)
echo "$rows" | while read name ss t; do
  [ -z "$name" ] && continue
  raw=$(ls _raw/$name.* | head -1)
  # 1. cut body, 2. wrap-crossfade tail over head for a seamless loop, 3. normalise
  ffmpeg -nostdin -y -v error -ss "$ss" -t "$t" -i "$raw" -filter_complex "
      [0:a]asplit=2[a][b];
      [a]atrim=0:$(echo "$t-$XF"|bc)[main];
      [b]atrim=$(echo "$t-$XF"|bc):$t,asetpts=PTS-STARTPTS[tail];
      [tail][main]acrossfade=d=$XF:c1=tri:c2=tri[loop];
      [loop]loudnorm=I=-18:TP=-1.5:LRA=11[out]" \
    -map "[out]" -ac 2 -ar 48000 -c:a libopus -b:a 112k "src/assets/music/$name.ogg"
  printf '%-12s -> %s\n' "$name" "$(du -h src/assets/music/$name.ogg | cut -f1)"
done
```

Output: ~0.4–0.9 MB per bed as OGG Vorbis q5 44.1 kHz stereo. Total music payload
**~4 MB**. Ship `.ogg` (all target browsers support it); add a `.m4a` sibling only if you
still care about old Safari.

**Do not bundle the beds into the initial download.** Lazy-load per state: Signal Hub +
Standby on menu, the four combat beds fetched when `online()` resolves the starting
district, the rest prefetched during the first round. See §7.

---

## 5. Chop points — stings (one-shots)

Short cues; just trim silence and tail, no looping.

| Cue | Raw ~ | Keep | Notes |
|---|---|---|---|
| District-unlock riser | 13 s | **last ~4.5 s** | Suno front-loads a long swell; keep the payoff + burst. `-ss 8.5`. Time it so the burst lands on the boundary open (5 s after `mapChanged`). |
| Recap sting | 7 s | **first ~3.5 s** | swell → resolve; fade out `d=0.4`. |
| Victory flourish | 7 s | **first ~3 s** | chord stab + rise; hard-ish out at the tail, `afade d=0.3`. |

```sh
mkdir -p src/assets/music
ffmpeg -nostdin -y -v error -ss 8.5 -i _raw/rising-synth-riser.wav -t 4.5 \
  -af "afade=t=in:st=0:d=0.05,afade=t=out:st=4.0:d=0.5,loudnorm=I=-16:TP=-1.5" \
  -ac 2 -ar 48000 -c:a libopus -b:a 112k src/assets/music/sting-district-unlock.ogg

ffmpeg -nostdin -y -v error -i _raw/short-cinematic-resolve-sting.wav -t 3.5 \
  -af "silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=3.1:d=0.4,loudnorm=I=-16:TP=-1.5" \
  -ac 2 -ar 48000 -c:a libopus -b:a 112k src/assets/music/sting-recap.ogg

ffmpeg -nostdin -y -v error -i _raw/short-triumphant-synthwave-victory-flourish.wav -t 3.0 \
  -af "silenceremove=start_periods=1:start_threshold=-50dB,afade=t=out:st=2.7:d=0.3,loudnorm=I=-16:TP=-1.5" \
  -ac 2 -ar 48000 -c:a libopus -b:a 112k src/assets/music/sting-victory.ogg
```

---

## 6. SFX — event map & chop

Sampled SFX replace / augment the oscillator in `playSound()` (`src/index.js:629`).
Keep them **mono, ~64–128 kbps, ≤ 40 KB** each. Trim leading silence hard, cap length,
tiny fade-out so rapid re-triggers don't click.

| Event | Hook (`src/index.js`) | Asset | Keep | Volume |
|---|---|---|---|---|
| Laser fire | `event({type:'fire', weapon:'LASER'})` `:598` | `laser.mp3` | ~0.35 s | 1.0 own / 0.18 remote (as today) |
| Ricochet fire | `event({type:'fire', weapon:'BOUNCE'})` `:598` | `ricochet.mp3` | ~0.45 s | same |
| Grenade launch | `event({type:'fire', weapon:'GRENADE'})` `:598` | `grenade-launch.mp3` | ~0.4 s | same |
| Grenade explosion | `event({type:'explosion'})` `:614` | `explosion.mp3` | ~0.9 s | 0.5 |
| Hull hit (taking damage) | `event({type:'hit', player:this.playerId})` `:602` | — reuse `explosion.mp3` at 0.2 gain, or generate a dedicated "metallic thud" later | quiet |
| Ship destroyed | `event({type:'kill', player:this.playerId})` `:604` | `ship-destroyed.mp3` ⚠︎ built, 2.2 s (ear-check trim) | as-is | 0.7 |
| Respawn | `p.alive` false→true near `:749`–`:752` | `respawn.mp3` ⚠︎ built, 1.6 s (ear-check trim) | 0.6 |
| Weapon switch | `selectWeapon()` | keep oscillator / none | — |
| UI select, menu | button `onclick` | keep silent or a soft blip — not worth an asset | — |

```sh
# laser / ricochet / grenade-launch / explosion — run per file
ffmpeg -nostdin -y -v error -i _raw/tight-sci-fi-laser-shot.wav \
  -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01,afade=t=out:st=0.30:d=0.05,loudnorm=I=-15:TP=-1.5" \
  -t 0.35 -ac 1 -ar 44100 -c:a libmp3lame -b:a 128k src/assets/sounds/laser.mp3
# ricochet: -t 0.45, st=0.40 ; grenade-launch: -t 0.40, st=0.35 ; explosion: -t 0.9, st=0.75, keep -ac 2
```

`ship-destroyed.mp3` and `respawn.mp3` were built this way from their raw exports.

### Suno prompts used (for regen / B-variants / new SFX)

```
laser         : tight sci-fi laser shot, single short bright zap with fast downward pitch tail, dry and punchy, no reverb
ricochet      : metallic ricochet ping, single short zinging pitch-bend ricochet off steel, dry, minimal reverb
grenade launch: muffled grenade launch, single soft thunk pop with short airy whoosh, dry, close-mic
explosion     : compact sci-fi explosion, tight sub boom with short crackling debris, fast decay, dry
ship destroyed: sci-fi spaceship destruction, sharp metallic crack into descending power-down whoosh and deep sub boom, about one and a half seconds, dry
respawn       : rising digital materialize shimmer, quick bright reconstitution whoosh with sparkle tail, about one second, clean
```

All generated on the **Sounds** tab, Type = One-Shot, BPM Auto, Key Any.

### Bed prompts used

```
Signal Hub : instrumental sci-fi menu loop, 88 BPM, D minor, slow analog sub bass, patient synth arpeggio, distant sonar pings, wide cold reverb, weightless hovering calm, hypnotic and restrained, seamless loop, clean modern mix, no vocals
Standby    : instrumental sci-fi pre-battle tension bed, 110 BPM, D minor, soft muted kick pulse, low analog bass, sparse metallic taps, brooding pads, held breath before combat, minimal and steady, seamless loop, dry clean mix, no vocals
Foundry    : instrumental industrial darksynth combat loop, 130 BPM, F minor, heavy distorted analog bass, punchy driving kick, clanging metallic percussion, furnace hiss, molten-metal aggression, relentless, seamless loop, dry physical mix, no vocals, no breakdown
Biodome    : instrumental synthwave combat loop, 120 BPM, A minor, warm analog bass, glassy FM bells, wet syncopated percussion, humid chlorophyll pads, luminous greenhouse energy, propulsive but organic, seamless loop, lush clean mix, no vocals, no breakdown
Rail Yard  : instrumental darksynth combat loop, 126 BPM, C minor, propulsive arpeggiated bassline, magnetic-rail electric zaps, fast clattering metal percussion, vacuum reverb leads, cold orbital gantry rush, relentless forward momentum, seamless loop, punchy dry mix, no vocals, no breakdown
Cold Relay : instrumental darksynth combat loop, 116 BPM, D minor, pulsing sub bass, brittle glassy arpeggios, frostbitten metallic percussion, howling wind pads, distant frozen relay-station hum, tense steady drive, seamless loop, cold clean mix, no vocals, no breakdown
```

Sting prompts:

```
district-unlock: rising synth riser, sub-bass rumble swell, metallic shimmer sweep building tension, release into a bright cyan burst, sci-fi territory unlock transition, clean modern mix
recap          : short cinematic resolve sting, warm synth pad swell settling into calm, soft mallet arpeggio tail, mission debrief mood, clean modern mix
victory        : short triumphant synthwave victory flourish, bright supersaw chord stab, quick rising arpeggio, gated reverb, sci-fi champion fanfare, punchy dry mix
```

---

## 7. Integration recipe (separate task — not done here)

A minimal music manager on the existing `AudioContext`. ~120 lines; hangs off
`unlockAudio()` and `event()`.

```js
// src/audio/MusicBus.js  (sketch)
export class MusicBus {
  constructor(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);
    this.buffers = new Map();      // name -> AudioBuffer
    this.current = null;           // { name, src, gain }
    this.duckTarget = 1;
  }
  async load(name, url) {
    if (this.buffers.has(name)) return;
    const buf = await this.ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    this.buffers.set(name, buf);
  }
  play(name, { loop = true, fade = 1.5 } = {}) {
    if (this.current?.name === name) return;
    const buf = this.buffers.get(name); if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = loop;
    const g = this.ctx.createGain(); g.gain.value = 0;
    src.connect(g).connect(this.master);
    src.start();
    const now = this.ctx.currentTime;
    g.gain.setValueCurveAtTime(eqPowerUp(fade), now, fade);      // 0 -> 1 cos/sin
    const out = this.current;
    if (out) {
      out.gain.gain.setValueCurveAtTime(eqPowerDown(fade), now, fade);
      out.src.stop(now + fade + 0.05);
    }
    this.current = { name, src, gain: g };
  }
  oneShot(name, { gain = 1 } = {}) { /* buffer -> gain -> master, no loop */ }
  duck(db, ms = 300) { /* ramp this.master.gain to 10**(db/20) */ }
  unduck(ms = 400)   { /* ramp back to 0.6 */ }
}
```

Wiring in `src/index.js`:

- **create**: in `unlockAudio()` after `this.audio` exists →
  `this.music = new MusicBus(this.audio)` then `music.load('signal-hub', …)` and
  `music.play('signal-hub')`.
- **respect the toggle**: in `updateSound()` / the `sound-button` handler, when
  `!this.soundOn` call `this.music?.master.gain` → 0 (or `suspend`), restore on re-enable.
  Storage key `qd-sound` already persists it.
- **state changes**: `practice()` → `music.play('standby')`; `online()` → after district
  resolves, `music.play(<bed>)`; back to `mode==='lobby'` → `music.play('signal-hub')`.
- **combat events**: extend `event(e)` —
  `mapChanged` → `music.duck(-6); music.oneShot('sting-district-unlock'); …unduck`;
  `kill` w/ `player===playerId` → `music.duck(-9)`;
  respawn → `music.oneShot('respawn'); music.unduck()`;
  `restartAt` truthy (in `hud()`), once → `music.oneShot(state.winner===me ? 'sting-victory' : 'sting-recap'); music.duck(-12)`;
  `restartAt` clears → `music.unduck()` + re-resolve bed.
- **SFX**: give `playSound()` an optional sample path: if `this.sfx?.[weapon]` buffer is
  loaded, play it through a gain node; else fall back to the current oscillator. Same
  40 ms debounce (`this.lastSound`) already there.
- **lazy-load**: `music.load()` the four combat beds inside `online()` before the first
  snapshot; prefetch stings + remaining beds on `requestIdleCallback` during round 1.

Keep it behind the existing `soundOn` gate and the `unlockAudio()` user-gesture unlock —
no autoplay before interaction.

---

## 8. Loudness targets

| Bus | Target | Why |
|---|---|---|
| Combat beds | −18 LUFS integrated, −1.5 dBTP | sit under SFX + HUD |
| Menu / practice beds | −20 LUFS | quieter, non-fatiguing |
| Stings | −16 LUFS | punch through the ducked bed |
| SFX | −15 LUFS, mono | short, need presence |
| `MusicBus.master` | 0.6 gain default, user-adjustable later | headroom for ducking |

`loudnorm` values in the ffmpeg blocks above already encode these.

---

## 9. Does it fit? — how to validate

Nothing here has been heard in context yet. The cues were written *to* the game (per-
district BPM/key/instrumentation, SFX lengths matched to weapon cooldowns — laser 0.25 s
cd → 0.35 s sample, ricochet 0.5 s → 0.45 s, grenade 0.85 s fuse → 0.4 s launch +
explosion on detonation), but "fits" is an ear call. Check in this order:

1. **Audition the raw loops solo.** `afplay _raw/foundry.wav` etc. Each combat bed should
   read as *tense, driving, background* — not a lead melody that competes with gunfire. If
   a bed is too melodic/foregrounded, swap to its B take or regenerate with
   "more minimal, more percussive, less melodic lead" added to the prompt.
2. **Check the loop seam.** Play `src/assets/music/<bed>.ogg` on repeat (`afplay -l 3`).
   The wrap should be inaudible — the build script cross-fades a 0.12 s tail over the
   head. If you hear a bump, the `-ss` trim-in didn't land on a downbeat: open the raw in
   an editor, find the true first kick, adjust `ss` in `build-soundtrack.sh` §BEDS, rerun.
3. **SFX in isolation.** `afplay src/assets/sounds/laser.mp3`. Want: instant attack, no
   pre-roll silence, dry. `respawn.mp3` (1.6 s) and `ship-destroyed.mp3` (2.2 s) are
   trimmed from longer raws — confirm the trim didn't cut the payoff; loosen `-t` in
   `build-soundtrack.sh` §sfx if so.
4. **In-context, the real test.** Wire §7's `MusicBus` behind the `soundOn` toggle, then:
   play a practice round (Standby bed + laser/ricochet/grenade/explosion + a death →
   respawn), and an online round through a district unlock (riser + bed crossfade) and a
   round end (recap/victory sting). Judged live: does the combat bed disappear under
   fire? does the duck-on-death read? does the district crossfade land or lurch? does any
   SFX mask the others at fire rate?
5. **Levels.** After wiring, meter the master bus — beds should sit ~−18 LUFS, SFX peaks
   under −6 dBFS, stings audible over a ducked bed. Adjust `MusicBus.master` gain and the
   per-SFX volumes in `playSound()` (the table in §6), not the files.

Fastest useful signal: step 1 + step 3 take five minutes and catch the "this take is
wrong" cases before any code. Step 4 is the only thing that proves the *system* fits.
