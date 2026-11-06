# Browser E2E Quality Gate (Step 8)

The `e2e/` suite runs **Chromium against actual Next.js and NestJS servers with a disposable PostgreSQL database**. It covers real browser navigation, cookie persistence after login/refresh, protected routes, registration, matchmaking preferences, camera/mic permission and preview with Chromium fake devices, cancellation/retry between two authenticated accounts, and responsive layout at 320/390/768/1280px.

## Running locally

Prerequisites: Node.js 22, PostgreSQL 16 and the environment variables from `api/.env.example` (including a database created just for tests). **Never run E2E registration tests against production or a valuable local database.**

```sh
npm ci --prefix api
npm ci --prefix client
npm install --prefix e2e
npm --prefix e2e exec -- playwright install chromium
# Point DATABASE_URL to a dedicated test database.
npm --prefix api exec -- prisma migrate deploy
npm --prefix e2e test
```

Set `DATABASE_URL`, `JWT_SECRET` and `CLIENT_URL=http://localhost:3000` in the shell before the last two commands. Playwright automatically starts and stops NestJS on 8800 and Next.js on 3000; it reuses already-running local servers outside CI, so stop your development instances if you need exact fixture parity.

The GitHub Actions `browser-e2e` job provisions a fresh PostgreSQL container, performs migrations, and runs Chromium with `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream`. Screenshots, Playwright traces and HTML reports upload on failure. Only synthetic accounts are created. Tests do not use real cameras or permission dialogs.

## Scope and limits
- Browser tests do not prove real camera/microphone hardware, network jitter, TURN traversal, or Safari mobile usability.
- Never use static/mock JWT cookies. Registration/login is done against the real API via the same-origin frontend rewrite.
- With concurrent CI workers disabled, registration and rate limit behavior is deterministic.
- The Playwright runner is pinned in `e2e/package.json`; it installs independently so `api/` and `client/` lockfiles remain unchanged.
