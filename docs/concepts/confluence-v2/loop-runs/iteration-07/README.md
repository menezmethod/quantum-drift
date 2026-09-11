# Iteration 07 — verify and protect overview visibility

Fresh production build disproved the stored diagnosis: the already-committed
504–756 fog range renders the full desktop map correctly at camera height 197.
The iteration-06 near-black screenshots were stale relative to that source.
No camera-pose retune was needed. World fog now follows altitude only when the
camera rises beyond the existing ground range, protecting narrow portrait and
minimum zoom; returning to Arena restores the exact 504–756 range.

The browser receipt now measures the luminance of the central image, outside
edge HUD. At least 8% must exceed luminance 45. The saved broken iter-06 frame
scores 2.15%; new whole-world scores 36.11%, portrait 33.8%, minimum-zoom portrait
19.63%. This is an empty-frame regression guard, not an art-quality score.

91/91 tests and production build pass. Native headless Chrome: 27 captures,
zero page errors, minimum 60.15 fps, maximum 104 calls / 35,064 triangles.
Live checks cover independent aim and three weapon hits, keyboard and CDP touch,
all four bridge approaches, human-count 3/5/7 expansion and safe round reset.
Headless frame pacing is not a multi-device native-GPU performance guarantee.

Compared with the concept: deck, topology and pilots are legible again, but this
is still an orthogonal station blockout. Forest pools show triangular artifacts,
Ice lacks an authored movement surface, and overview nameplates crowd the deck.
Read-only fresh critic scores: movement 7, readability 7, identity 4, silhouette 4,
materials 4, realism 9, performance safety 8. Overall exit criteria NOT met.

Next: visibly bounded low-traction ice in Frozen Relay, with normal-traction
routes on both sides and shared authoritative/predicted movement.
