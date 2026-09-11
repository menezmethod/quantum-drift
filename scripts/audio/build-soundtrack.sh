#!/usr/bin/env bash
# Chop the Suno v6 raw exports into game-ready loops + one-shots.
# See docs/AUDIO.md for the full spec (cue -> game state, loop math, loudness).
#
# Usage:
#   1. Download the 15 clips from Suno (⋯ → Download → WAV/M4A). Links in docs/AUDIO.md §1.
#   2. Drop them in ./_raw/ with these basenames (any audio extension):
#        signal-hub  standby  foundry  biodome  rail-yard  cold-relay
#        rising-synth-riser  short-cinematic-resolve-sting
#        short-triumphant-synthwave-victory-flourish
#        tight-sci-fi-laser-shot  metallic-ricochet-ping
#        muffled-grenade-launch  compact-sci-fi-explosion
#   3. bash scripts/audio/build-soundtrack.sh
#
# ship-destroyed.mp3 and respawn.mp3 are already built (see docs/AUDIO.md §1).
set -euo pipefail
cd "$(dirname "$0")/../.."
RAW="${1:-_raw}"
MUS=src/assets/music
SFX=src/assets/sounds
mkdir -p "$MUS" "$SFX"

pick() { ls "$RAW/$1".* 2>/dev/null | head -1; }
have() { [ -n "$(pick "$1")" ]; }

# ---------- combat / menu beds : cut an integer bar body, wrap-crossfade the seam ----------
# name        raw-basename  trim-in(s)  body-length(s)   (bar math in docs/AUDIO.md §4)
BEDS="
signal-hub  signal-hub  21.818  43.636
standby     standby     17.455  34.909
foundry     foundry     14.769  59.077
biodome     biodome     16.000  64.000
rail-yard   rail-yard   15.238  60.952
cold-relay  cold-relay  16.552  49.655
"
XF=0.12   # seam crossfade (~1/16 bar) — hides the loop wrap
echo "$BEDS" | while read out raw ss t; do
  [ -z "${out:-}" ] && continue
  have "$raw" || { echo "skip $out (no $RAW/$raw.*)"; continue; }
  src=$(pick "$raw")
  main_end=$(echo "$t - $XF" | bc -l)
  ffmpeg -nostdin -y -v error -ss "$ss" -t "$t" -i "$src" -filter_complex "
      [0:a]asplit=2[a][b];
      [a]atrim=0:${main_end}[main];
      [b]atrim=${main_end}:${t},asetpts=PTS-STARTPTS[tail];
      [tail][main]acrossfade=d=${XF}:c1=tri:c2=tri[l];
      [l]loudnorm=I=-18:TP=-1.5:LRA=11[o]" \
    -map "[o]" -ac 2 -ar 48000 -c:a libopus -b:a 112k "$MUS/$out.ogg"
  printf '  %-12s %s\n' "$out.ogg" "$(du -h "$MUS/$out.ogg" | cut -f1)"
done

# ---------- stings : trim, fade, no loop ----------
sting() { # out  raw  ss  t  fade_out_start
  have "$2" || { echo "skip $1 (no $RAW/$2.*)"; return; }
  ffmpeg -nostdin -y -v error -ss "$3" -i "$(pick "$2")" -t "$4" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,afade=t=out:st=$5:d=0.4,loudnorm=I=-16:TP=-1.5" \
    -ac 2 -ar 48000 -c:a libopus -b:a 112k "$MUS/$1.ogg"
  printf '  %-24s %s\n' "$1.ogg" "$(du -h "$MUS/$1.ogg" | cut -f1)"
}
sting sting-district-unlock rising-synth-riser                          8.5 4.5 4.0
sting sting-recap           short-cinematic-resolve-sting               0   3.5 3.1
sting sting-victory         short-triumphant-synthwave-victory-flourish 0   3.0 2.7

# ---------- sfx : hard-trim lead silence, cap, tiny fade, mono mp3 ----------
sfx() { # out  raw  t  fade_out_start  channels
  have "$2" || { echo "skip $1 (no $RAW/$2.*)"; return; }
  ffmpeg -nostdin -y -v error -i "$(pick "$2")" -t "$3" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01,afade=t=out:st=$4:d=0.05,loudnorm=I=-15:TP=-1.5" \
    -ac "${5:-1}" -ar 44100 -c:a libmp3lame -b:a 128k "$SFX/$1.mp3"
  printf '  %-20s %s\n' "$1.mp3" "$(du -h "$SFX/$1.mp3" | cut -f1)"
}
sfx laser          tight-sci-fi-laser-shot   0.35 0.30 1
sfx ricochet       metallic-ricochet-ping    0.45 0.40 1
sfx grenade-launch muffled-grenade-launch    0.40 0.35 1
sfx explosion      compact-sci-fi-explosion  0.90 0.75 2

echo "done. music -> $MUS  sfx -> $SFX"
