# Step 12 — Production readiness and security review

**Deployment status: NOT DEPLOYED.** This is an audit and controlled hardening PR, not evidence that the product is production-ready.

## Implemented safeguards

- **HTTP cookie policy:** the browser uses the frontend's same-origin `/api/v1` rewrite, so the login cookie can use `SameSite=Lax` in production as well as development. The cookie remains `HttpOnly` and `Secure` when `NODE_ENV=production`; existing server-side Origin and JSON protections remain.
- **Health checks:** `GET /api/v1/health` is process liveness (no DB dependency). `GET /api/v1/health/ready` checks PostgreSQL and returns 503 with a generic message if unavailable. Configure your load balancer's *readiness* probe against `/health/ready`, not process liveness. No DB URL is returned.
- **Startup validation:** production requires an HTTPS frontend origin, non-placeholder JWT secret, valid port number and paired TURN settings if configured. Local HTTP development remains allowed. `X-Powered-By` is disabled.
- **Preflight:** run `npm run preflight:prod` from `api/` with deployment env vars injected. It checks HTTPS/WSS, TURN settings, strong JWT secret, and warns about relay TLS/proxy exposure. Exit code 1 blocks a release on missing required conditions. It does NOT connect to or verify a deployed TURN server.

## Release gate (manual; do not infer from CI green)

1. **Secrets** — rotate unique JWT/TURN secrets. Use a secrets manager; do not commit `.env`, database URLs, access tokens or relay keys. Set `NODE_ENV=production`, `CLIENT_URL=https://your-frontend-domain`, `DATABASE_URL`, `JWT_SECRET`, `TURN_URLS`, `TURN_SECRET`. Configure `client/API_PROXY_TARGET` server-side to the reachable Nest API (internal private network allowed), and public `NEXT_PUBLIC_SOCKET_URL` to an HTTPS browser-reachable Socket.IO host. Rebuild Next.js after modifying `NEXT_PUBLIC_*` values.
2. **HTTPS/TLS** — terminate TLS at a trusted reverse proxy; verify certificates, renewal, HTTP-to-HTTPS redirects, WebSocket upgrade, secure origin and HSTS. Limit API and database network access to approved clients/networks. Avoid exposing PostgreSQL port 5432 publicly.
3. **Trusted proxy and IP rate limits** — existing auth rate limiting uses `request.ip` without trusting arbitrary `X-Forwarded-For`. Behind a reverse proxy, per-IP rate limits may be shared by all users. Explicitly design and test trust-proxy configuration for the actual proxy addresses before relying on IP-specific protection; never trust all arbitrary forwarded headers.
4. **WebRTC/TURN** — deploy coturn with `use-auth-secret`, matching static auth secret, UDP and TCP relay paths, TLS if available, correctly mapped public/external IP and permitted relay port range. Verify a real `relay` ICE candidate in `chrome://webrtc-internals` from separate networks, including restrictive NAT/mobile data. CI fake-media tests **cannot** prove audio quality or relay reachability. Also test switching mic/camera and interrupted-network recovery on real devices.
5. **Scale constraints** — in-memory matchmaking and formal timers must stay on **one** backend realtime process. Do not add PM2 cluster/multi-pod replicas without a shared distributed matchmaking system, Socket.IO adapter and durable formal-session state. This is a launch constraint, not solved by this PR.
6. **Database/backups** — run `npx prisma migrate deploy` on the target DB during a controlled rollout. Schedule encrypted PostgreSQL backups, restore drills, retention and access controls; confirm recovery point/time targets with the owner. Validate free disk, CPU, connection limits and alerts.
7. **Observability** — add centralized redacted logs, 5xx and Socket.IO disconnect/ICE failure alerting, latency and packet-loss trend metrics, uptime checks, dashboard and incident runbooks. Never log access cookies, full JWTs, chat messages, camera/mic data or TURN credentials.
8. **Load/security validation** — test rate-limit behavior behind real proxy, concurrent matching, brute force/abuse, auth cookie boundaries, expired bans, report actions, CSRF Origin checks, and database constraints. Verify Content Security Policy on **frontend** and dependency audits with release-appropriate remediation.
9. **Rollback** — take a restorable backup before schema changes. Deploy by an immutable release artifact/tag; have a documented app rollback and database migration compatibility plan. **Never use `prisma migrate reset` in production**.

## Useful commands

From `api/`, in a configured deployment environment:

```bash
npm ci
npm run test:preflight
npm run preflight:prod
npx prisma migrate deploy
npm run build
npm run typecheck
```

Before enabling public traffic, check both:

```bash
curl -fsS https://api.example.com/api/v1/health
curl -fsS https://api.example.com/api/v1/health/ready
```

Test locally on a **disposable database** with `npm run test:e2e`. No CI database should point at production.

## Unresolved blockers

- TURN service provisioning and real cross-network testing; managed outside this repository.
- Single-instance realtime limitations; no multi-node queue/session replication.
- Production infrastructure setup, backups/restore testing, reverse proxy trust, HTTPS monitoring.
- Browser hardware matrix (Safari/iOS/Android), media permissions and accessibility checks.
- Consent/privacy/retention policy and operator decisions for moderation audit data.

**Do not merge or deploy based solely on this checklist.**
