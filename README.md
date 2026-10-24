# Debate — Islamic Discussion Platform

A respectful discussion platform with live video (WebRTC), real-time chat (Socket.IO), and cookie-based authentication.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Axios, Sonner |
| Backend | NestJS 11, TypeScript, JWT httpOnly cookie, bcrypt |
| Database | PostgreSQL + Prisma ORM |
| Realtime | Socket.IO + WebRTC (STUN configured; TURN is a deployment follow-up) |

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

The existing API client defaults to `http://localhost:8800/api/v1`; Socket.IO defaults to the API origin. The frontend source and styling have not been redesigned as part of this migration.

## Existing API contract

- `POST /api/v1/auth/register` — create an account; returns a message.
- `POST /api/v1/auth/login` — sets the httpOnly `accessToken` cookie and returns public user fields.
- `POST /api/v1/auth/logout` — clears the auth cookie.
- `GET /api/v1/auth/me` — returns the current user's public fields.
- `PATCH /api/v1/auth/me` — updates fullname, gender, education and country.
- Socket.IO events remain `find-partner`, `waiting`, `matched`, `offer`, `answer`, `ice-candidate`, `chatMessage`, `leave`, and `peer-left`.

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
