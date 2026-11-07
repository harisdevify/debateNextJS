# Debate — Islamic Discussion Platform

A web platform for respectful one-to-one discussions with live video, audio, and real-time chat.

## Features

- Account registration, login, profile management, and community rules acceptance
- Topic, language, and discussion-style selection before matchmaking
- Camera/microphone preview and device selection
- One-to-one WebRTC calls, live chat, and optional live captions
- Partner reporting/blocking, moderator tools, and account restrictions
- Debate history and partner ratings
- Responsive member and admin interfaces

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Real-time | Socket.IO, WebRTC (STUN / optional TURN) |
| Authentication | JWT in httpOnly cookies |
| Testing | Vitest, Jest, Playwright, GitHub Actions |

## Project Structure

```text
client/     Next.js web application
api/        NestJS REST API, WebSocket signaling, Prisma schema and migrations
e2e/        Playwright browser tests
docs/       Architecture and moderation documentation
```

## Run Locally

**Requirements:** Node.js 22.18+, npm, and PostgreSQL 15+ (or Docker).

1. Start PostgreSQL from the repository root:

   ```bash
   docker compose up -d
   ```

   This uses the local development database configured in `docker-compose.yml`. If PostgreSQL is already running, configure your own database connection instead.

2. Start the API:

   ```bash
   cd api
   cp .env.example .env
   npm ci
   npx prisma migrate deploy
   npm run dev
   ```

   Review `api/.env` before starting, especially `DATABASE_URL` and `JWT_SECRET`. Use a unique secret.

3. In another terminal, start the frontend:

   ```bash
   cd client
   cp .env.example .env.local
   npm ci
   npm run dev
   ```

- Web: **http://localhost:3000**
- API: **http://localhost:8800**
- Health check: **http://localhost:8800/api/v1/health**

## Quality Checks

Run in the relevant directory:

```bash
# client/
npm run lint
npm run typecheck
npm run test
npm run build

# api/
npm run build
npm run typecheck
npm run test:unit
```

Backend integration tests require a **dedicated test database**. Browser E2E tests live in `e2e/` and require the application and its test services to be configured. GitHub Actions runs the automated checks for pull requests.

## Development Notes

- Keep changes focused and preserve existing REST, WebSocket, and matchmaking contracts.
- The API enforces authorization and moderation rules; frontend UI checks are not a security boundary.
- Use a single real-time server instance with the current in-memory matchmaking queue.
- Configure authenticated TURN relay services for reliable WebRTC connections across restrictive networks. TURN credentials and secrets belong on the backend only.
- Never commit `.env` files, tokens, or database credentials.

For details, read [Backend Architecture](docs/backend-architecture.md), [Admin Moderation](docs/admin-moderation.md), and [Contributing](CONTRIBUTING.md).
