# Iteration 08 — Frozen Relay momentum field

A 15×22 ellipse at (0,48) now carries drift momentum. Shared map metadata and
`surfaceAt` drive server, Practice and acknowledged-input replay. Traction is .23
of normal; acceleration and braking change, maximum speed remains 13. Dry routes
at x±24 stay clear; respawn selection excludes the field. The flush opaque ice
surface and radar ellipse match the physics bounds; Flight help explains braking.

93 tests / production build pass. Browser verifies all three authoritative weapon
hits on the ice as well as Nexus, independent aim, keyboard and native CDP touch
coasting, prediction, human-count expansion and round reset. Release coasting:
2.76m ice vs 0.98m dry deck after identical keyboard hold/release. 28 captures,
zero page errors, ~60fps; full metrics in verification.json. No generated assets,
new dependency, shader, dynamic light or collision obstacle.

Fresh read-only critic: movement 7, readability 7, identity 4, silhouette 5,
materials 3, implementation 9, performance safety 9. The movement choice is real,
but the flat teal oval and hairline spokes do not read as convincing frozen
terrain against the concept. Screenshots are live; still images alone do not
establish the control feel. Overall exit criteria NOT met.

Next: replace the flat ice fill/spokes with an opaque static procedural texture:
broad irregular blue plates and a frosted inner edge. Keep exact movement bounds.
