# Hosting handoff

Finish hosting Quantum Drift v1.0.0. Do not change gameplay or expand scope.

- Repository: https://github.com/menezmethod/quantum-drift, master. Local checkout: /Users/luisgimenez/Development/07-archive/qd.
- Coolify: https://cp.menezmethod.com. Existing application UUID aoeefnsohotlncnvmpgwmaao, Web Projects / production, logisticsPc (192.168.0.222). SSH alias logisticsPc works. Owner authorized changing its Coolify build-only role to deployment-capable; this was done.
- App: Dockerfile, container port 8080, 1 CPU / 512 MiB, eight-room admission limit (not proven capacity). Persistent rankings bind /data/quantum-drift/rankings → /app/server/data, UID 1000. Health check must use http://127.0.0.1:8080/health, not localhost (IPv6 caused failed probes). Last container was observed healthy; verify current deployment ktlnvbiqgdxhwbdxfdeik6zd before proceeding.
- Desired public URL: https://qd.menezmethod.com. Previously returned “no available server”; public ingress is unfinished. Existing routing is Cloudflare. Wrangler is installed and authenticated. `wrangler tunnel list` found healthy coolify-tunnel, UUID 19bf9243-3d61-4db1-bd9a-60665e2b675d, account 2d7646c1abf06ea447a855a7d6b4f3e1. Inspect its existing ingress/DNS; update only qd routing, preserving every other service. No Cloudflare configuration was changed in this task.
- Auto-deployment is disabled intentionally. Deploy the tested release commit explicitly. Existing authenticated Coolify curl config is /tmp/qd-coolify-auth on this Mac; contains a secret—never print, commit, or package it. Request credentials if working on another machine.
- Verification: 70 tests pass, production build passes, native browser multiplayer/weapons/reconnect/120ms latency passes, GitHub CI passes, production npm audit has zero known vulnerabilities. Download is a prebuilt Node server, not a native desktop app.
- Finish: verify TLS, static game assets, real WebSocket upgrade, two public clients, saved rankings across restart, and container resource limits. `node scripts/verification/live.cjs https://qd.menezmethod.com 2` runs a bounded ten-second smoke check. Then update README live link and docs/STATUS.json. Report actual measured capacity only. Do not touch unrelated services or launch a broad refactor.

Upgrade scope is in docs/ROADMAP.md: preserve movement/camera; first portal arena, energy/instant repair/shield pickups, limited-shot quantum overcharge, collision clarity, then measured scaling.
