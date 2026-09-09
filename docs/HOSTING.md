# Hosting Quantum Drift

## Initial deployment
One Coolify Dockerfile application on logisticsPc, serving the client and Socket.IO on container port 8080. Route qd.menezmethod.com to the application through the existing HTTPS ingress. No separate game server domain is required. Start with one CPU and 512 MiB RAM, MAX_ROOMS=8 and MAX_CONNECTIONS=96. The host has other workloads: these are conservative starting limits, not validated capacity claims.

Coolify app UUID: `aoeefnsohotlncnvmpgwmaao`. logisticsPc was changed from build-only to deployment-capable with owner approval. Remote-build assignments for other projects should be reviewed separately.

Persist /app/server/data in a dedicated volume or bind directory owned by container UID 1000. Back it up daily; do not share a rankings file between processes. /health reports rooms, human players, and ranking availability. Preserve WebSocket upgrades and disable caching for /socket.io/* and /api/*.

## Releases and rollback
Run npm test, npm run build, and CHROME_BACKEND=native npm run test:browser before release. Coolify auto-deploys pushes to `master` on `menezmethod/quantum-drift` (GitHub App webhook; no separate deploy-on-tag setting). Ship newest releases by merging the release commit to `master` (or pushing that branch); a GitHub release tag alone does not deploy unless `master` advances. Wait for healthy HTTP and check two real remote clients sharing a room. Roll back to the preceding tested commit through Coolify; keep the rankings volume. Deployments end active matches; schedule updates between play sessions. GitHub release downloads include a prebuilt browser client and the Node server, plus checksums.

## Capacity roadmap
1. Measure actual-host event-loop delay, process CPU/RSS, network egress, disconnect rate and round-trip latency at 8, 16, 32, then 64 active pilots. Stop before affecting colocated workloads. Target p95 simulation scheduling delay below one 16.7ms step and stable latency relative to idle baseline. Repeat under realistic movement/fire and a complete round; record host/build and results.
2. Optimize snapshot size and bot cost based on profiles, then raise admission limits with headroom. Saturated rooms must reject joins politely.
3. Scale by assigning whole rooms to independent server processes. Add a room directory, explicit routing/stickiness, and a durable shared results database before multiple replicas. A Socket.IO adapter alone does not distribute simulation ownership.
4. Add authentication, abuse controls, backups with restore drills, dashboards, and match draining as public traffic warrants. Keep infrastructure portable; GCP is optional.

No claim of unlimited players or proven Raspberry Pi capacity is made.
