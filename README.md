# Debate — Islamic Discussion Platform

A respectful discussion platform with live video (WebRTC), real-time chat (Socket.IO), and cookie-based authentication.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Axios, Sonner |
| Backend | NestJS 11, TypeScript, JWT httpOnly cookie, bcrypt |
| Database | PostgreSQL + Prisma ORM |
| Realtime | Socket.IO + WebRTC (STUN + optional authenticated TURN configuration) |

## Repository layout

```
api/
  prisma/                 # PostgreSQL schema and SQL migration
  src/
    auth/                 # Register, login, logout, profile, JWT guard and DTOs
    prisma/               # Shared Prisma service
    realtime/              # Socket.IO auth, matchmaking, signaling and chat
    app.module.ts
    main.ts
client/                   # Existing Next.js frontend; UI files intentionally preserved
```

## Requirements

- Node.js 22.18 or newer (required by Prisma 7)
- PostgreSQL 15 or newer (or Docker, see below)
- npm

## Local setup

### 1. Create a fresh PostgreSQL database

**With Docker (easiest):** from the repository root run `docker compose up -d`. This starts PostgreSQL 16 with a `debate` database and the credentials used in the example below.

**Without Docker:** create an empty database named `debate` using your PostgreSQL admin tool, or run `CREATE DATABASE debate;` in `psql`.

The old MySQL data is intentionally not migrated.

### 2. Configure and run the API

```bash
cd api
cp .env.example .env
```

Edit `api/.env` and set a strong, unique `JWT_SECRET` and your PostgreSQL `DATABASE_URL`. Then run:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

The API listens on `http://localhost:8800`. Health check: `GET /api/v1/health`.

The Prisma client is generated code and is **not** committed: `npm run dev`, `npm run build`, `npm run typecheck` and `npm run test:e2e` generate it automatically (or run `npm run prisma:generate`).

#### Tests

With the database running and migrated:

```bash
cd api
npm run test:e2e   # auth, validation, matchmaking, signaling and chat against real PostgreSQL
```

### 3. Run the existing frontend

In a separate terminal:

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

Useful checks: `npm run typecheck` (tsc) and `npm run lint` (ESLint).

The existing API client defaults to `http://localhost:8800/api/v1`; Socket.IO defaults to the API origin. The frontend source and styling have not been redesigned as part of this migration.

## Existing API contract

- `POST /api/v1/auth/register` — create an account; returns a message.
- `POST /api/v1/auth/login` — sets the httpOnly `accessToken` cookie and returns public user fields.
- `POST /api/v1/auth/logout` — clears the auth cookie.
- `GET /api/v1/auth/me` — returns the current user's public fields.
- `PATCH /api/v1/auth/me` — updates fullname, gender, education and country.
- `POST /api/v1/auth/accept-rules` — accepts the Code of Conduct and confirms 18+ (`{ acceptRules: true, confirmAge: true }`). Registration requires the same two flags.
- `GET /api/v1/auth/ice-servers` — authenticated STUN/TURN configuration.
- Socket.IO events: `find-partner`, `waiting`, `matched`, `offer`, `answer`, `ice-candidate`, `chatMessage`, `leave`, `peer-left`.
  - `matched` includes `matchId`; signaling uses `{ matchId, data }`, and chat sends `{ matchId, text }` with an acknowledgement.
  - `find-partner` is refused with `rules-required` until the rules are accepted.
  - `report-partner` (`{ reason, details? }`, with ack) stores a report about the latest partner. Reports are only saved for now; review, strikes and bans come later.
  - `block-partner` (with ack) blocks the latest partner, ends the debate, and the two are never matched again.

## Environment variables

`api/.env` (never commit this file):

```env
PORT=8800
NODE_ENV=development
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace-with-a-unique-random-secret
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/debate?schema=public
```

## Verification notes

A GitHub Actions workflow checks backend build/type safety and the existing frontend production build. A source commit alone is not proof that builds passed; check workflow results and run local database/auth/video smoke tests before deploying.

## Security

- Never commit `.env` files or reuse exposed secrets.
- Use HTTPS in production; cookies are httpOnly and secure in production.
- Configure a TURN service before relying on WebRTC across restrictive NATs/firewalls.

## Reliability fixes and verification (October 2026)

Run the new migration before starting the API:

```bash
cd api
npm ci
npx prisma migrate deploy
npm run build
npm run typecheck
npm run test:e2e
cd ../client
npm ci
npm run test
npm run typecheck
npm run lint
npm run build
```

- Authentication: protected pages wait for `/auth/me`. Next no longer requires the
  API's host-only cookie to be present on the frontend host. API guards remain the
  authorization boundary. Cross-site cookies still depend on browser policy;
  prefer same-site frontend/API domains or a same-origin reverse proxy if third-party
  cookies are blocked. HTTPS is required for production cookies.
- Video: matchmaking shows **Connecting video**; **Connected** is set only after
  WebRTC connects. Failed negotiation and a 30-second connection timeout show a
  retry action. Temporary media disconnections get a 10-second recovery window.
  Each debate has its own ID, so late SDP/ICE/chat cannot affect the next debate.
- Matchmaking: only the latest pending search can join the queue. Leave/disconnect
  invalidates unfinished searches. The queue is still in-memory: run one realtime
  instance until distributed matchmaking and a Socket.IO adapter are implemented.
- Quotas: PostgreSQL atomically limits login to 10/account and 100/IP per 15 minutes,
  registration to 10/account and 50/IP per 15 minutes, matchmaking to 10/account per
  10 seconds, and chat to 20/account per 10 seconds. Counters survive reconnects and
  process restarts; expired counters are periodically removed on activity. IPs come
  from the connection, not arbitrary forwarded headers; reverse proxy deployments
  must deliberately configure trusted proxy handling before relying on per-client IPs.
  Reports lock the reporter row inside a transaction to enforce 20 per rolling day.
- Chat: maximum 1,000 characters; invalid messages are rejected rather than silently
  truncated. Drafts clear and sent bubbles appear only after server acceptance. A
  timeout means delivery is unconfirmed, not necessarily failed; check before retrying.
- Dialog: native modal containment, Escape/backdrop close, scroll lock and return
  focus to the trigger. Avatar storage uses the authenticated user ID; the legacy
  shared avatar key is intentionally not migrated because its owner is unknown.

### TURN setup

The API supports coturn REST-style time-limited credentials. Set `TURN_URLS` and
`TURN_SECRET` in `api/.env` and configure coturn with the same `static-auth-secret`
and `use-auth-secret`. Never put the shared secret in a `NEXT_PUBLIC_` variable.
The authenticated `/api/v1/auth/ice-servers` endpoint returns one-hour credentials
with `Cache-Control: no-store`. Credentials refresh when looking for the next partner.
Without these settings, only STUN is used; reliable calling on restrictive networks
is **not** guaranteed. This change does not provision a relay server.

### Manual acceptance checklist

1. Login, then directly open/refresh `/profile` and `/video`. Repeat with frontend
   and API on different hosts where API cookies are allowed. Logout and confirm
   protected content does not mount. Repeat in a private window.
2. Use two accounts in separate browsers/devices. Confirm searching → connecting
   → actual video/audio. Try rapid Next clicks, partner disconnect, and reconnect.
   No previous partner's video/chat should appear in the new debate.
3. Send a 1,000-character message; both sides should see the same text. Attempt to
   send while disconnected or before connection: the draft must remain. Send quickly
   enough to hit the quota: rejected messages stay in the input.
4. Open Report/Block with the keyboard, Tab and Shift+Tab through controls, press
   Escape, and confirm focus returns to the opener. Check mobile and tablet widths.
5. Set account A's avatar, logout, login as B: B must not inherit A's avatar.
   Login as A again: A's avatar remains on that browser.
6. With a configured TURN service, test two restrictive/different networks and
   inspect WebRTC stats for a relay candidate. A local mock test is not evidence
   that the deployed relay, microphone, or camera works on real devices.
