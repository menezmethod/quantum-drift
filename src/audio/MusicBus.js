// One music + SFX layer over a shared AudioContext.
// Owns looping-bed crossfades, one-shot stings/SFX, a duck bus, and a global mute.
// Cues and their game-state mapping are documented in docs/AUDIO.md (§2, §7).

const MANIFEST = {
  // looping combat / menu beds + one-shot stings
  "signal-hub":            "assets/music/signal-hub.ogg",
  "standby":               "assets/music/standby.ogg",
  "foundry":               "assets/music/foundry.ogg",
  "biodome":               "assets/music/biodome.ogg",
  "rail-yard":             "assets/music/rail-yard.ogg",
  "cold-relay":            "assets/music/cold-relay.ogg",
  "sting-district-unlock": "assets/music/sting-district-unlock.ogg",
  "sting-recap":           "assets/music/sting-recap.ogg",
  "sting-victory":         "assets/music/sting-victory.ogg",
  // short weapon / state SFX
  "laser":                 "assets/sounds/laser.mp3",
  "ricochet":              "assets/sounds/ricochet.mp3",
  "grenade-launch":        "assets/sounds/grenade-launch.mp3",
  "explosion":             "assets/sounds/explosion.mp3",
  "respawn":               "assets/sounds/respawn.mp3",
  "ship-destroyed":        "assets/sounds/ship-destroyed.mp3",
};

// district id (shared/maps/world.js) -> combat bed
export const BED_FOR_DISTRICT = {
  core: "foundry",
  forest: "biodome",
  rails: "rail-yard",
  ice: "cold-relay",
};

const BED_GAIN = 0.55;      // leaves headroom for SFX on top and for ducking
const FLOOR = 0.0001;

export class MusicBus {
  constructor(ctx) {
    this.ctx = ctx;

    this.master = ctx.createGain();          // global mute (sound on/off)
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);

    this.bedBus = ctx.createGain();          // ducked on death / under stings
    this.bedBus.gain.value = BED_GAIN;
    this.bedBus.connect(this.master);

    this.sfxBus = ctx.createGain();          // never ducked
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    this.buffers = new Map();                // name -> AudioBuffer | Promise | null
    this.current = null;                     // { name, src, gain }
    this._pendingBed = null;
    this._duckTimer = null;

    // menu + weapon SFX are wanted first and cheap
    this.prefetch(["signal-hub", "standby", "laser", "ricochet", "grenade-launch", "explosion"]);
  }

  // ---- loading ------------------------------------------------------------
  load(name) {
    const cached = this.buffers.get(name);
    if (cached !== undefined) return cached;
    const url = MANIFEST[name];
    if (!url) return Promise.resolve(null);
    const p = fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status + " " + url); return r.arrayBuffer(); })
      .then((b) => this.ctx.decodeAudioData(b))
      .then((buf) => { this.buffers.set(name, buf); return buf; })
      .catch((err) => { console.warn("[audio] cue unavailable:", name, err.message || err); this.buffers.set(name, null); return null; });
    this.buffers.set(name, p);
    return p;
  }

  prefetch(names) { for (const n of names) this.load(n); }

  async _buffer(name) {
    const v = this.buffers.has(name) ? this.buffers.get(name) : this.load(name);
    return v && typeof v.then === "function" ? await v : v;
  }

  // ---- looping beds -----------------------------------------------------
  async playBed(name, { fade = 1.5 } = {}) {
    if (this.current?.name === name || this._pendingBed === name) return;
    this._pendingBed = name;
    const buf = await this._buffer(name);
    this._pendingBed = null;
    if (!buf || this.current?.name === name) return;

    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    src.connect(g).connect(this.bedBus);
    src.start();
    g.gain.setValueCurveAtTime(fadeCurve(true), t, fade);

    const prev = this.current;
    if (prev) {
      try {
        prev.gain.gain.cancelScheduledValues(t);
        prev.gain.gain.setValueCurveAtTime(fadeCurve(false), t, fade);
        prev.src.stop(t + fade + 0.1);
      } catch {}
    }
    this.current = { name, src, gain: g };
  }

  stopBed(fade = 1.0) {
    const prev = this.current;
    this.current = null;
    if (!prev) return;
    const t = this.ctx.currentTime;
    try {
      prev.gain.gain.cancelScheduledValues(t);
      prev.gain.gain.setValueCurveAtTime(fadeCurve(false), t, fade);
      prev.src.stop(t + fade + 0.1);
    } catch {}
  }

  // ---- one-shots (stings + weapon SFX) --------------------------------
  async oneShot(name, { gain = 1, duckDb = 0, duckSeconds = 0 } = {}) {
    const buf = await this._buffer(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.sfxBus);
    src.start();
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch {} };
    if (duckDb) this.duck(duckDb, duckSeconds || buf.duration);
  }

  sfx(name, gain = 1) { this.oneShot(name, { gain }); }

  // ---- duck ------------------------------------------------------------
  duck(db, holdSeconds = 0.3) {
    const t = this.ctx.currentTime;
    const target = Math.max(FLOOR, BED_GAIN * Math.pow(10, db / 20));
    try {
      this.bedBus.gain.cancelScheduledValues(t);
      this.bedBus.gain.setTargetAtTime(target, t, 0.08);
    } catch {}
    clearTimeout(this._duckTimer);
    this._duckTimer = setTimeout(() => this.unduck(), Math.max(100, holdSeconds * 1000));
  }

  unduck(rampSeconds = 0.4) {
    clearTimeout(this._duckTimer);
    const t = this.ctx.currentTime;
    try {
      this.bedBus.gain.cancelScheduledValues(t);
      this.bedBus.gain.setTargetAtTime(BED_GAIN, t, rampSeconds / 3);
    } catch {}
  }

  // ---- global mute (Sound on / off) ----------------------------------
  setMuted(muted) {
    const t = this.ctx.currentTime;
    try {
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.05);
    } catch {}
  }
}

// 64-point equal-power fade shape for setValueCurveAtTime
function fadeCurve(rising) {
  const n = 64, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (Math.PI / 2);
    c[i] = rising ? Math.sin(x) : Math.cos(x);
  }
  return c;
}
