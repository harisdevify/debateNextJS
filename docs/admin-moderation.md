# Admin moderation setup

Branch: `feat/admin-moderation`. Applies on top of PR #9.

## Setup

1. Stop and restart the API after applying the migration. Keep existing `.env` files.
2. Set `CLIENT_URL` to the exact frontend origin, for example `http://localhost:3000`, without a trailing slash. Admin writes require that Origin and JSON.
3. From `api/`: run `npm ci`, `npx prisma migrate deploy`, `npm run build`, and `npm run test:unit`. Do not use `prisma migrate reset` on existing data.
4. Register your account through the normal app, then from `api/` run `node scripts/promote-admin.mjs "your-registered-email@example.com"`.
5. Log out and log in again. Open `/admin`. Run the API and client using `npm run dev` in separate terminals.

## Checks

From `client/`: `npm ci`, `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Run `npm run test:e2e` from `api/` against a dedicated migrated test database via DATABASE_URL. Tests create/delete test accounts and clear rate-limit rows; never point them at a production database.

Manual acceptance: ordinary users cannot open admin content or call admin APIs; create a report from two member accounts; dismiss or warn with a reason; suspend/ban during an active debate; confirm the old token and new login are denied; restore access from Users and confirm history remains. Check simultaneous review in two admin tabs, mobile layout, keyboard navigation and modal focus.

## Behavior and limits

- Reports: paginated lists, details, dismiss/warn/suspend/ban, atomic review and audit log. Users: search, history and restore.
- Warnings notify connected users and appear on the next login/session check. Internal admin reasons are never sent to the member.
- Temporary restrictions expire without a cron job. Restoring access also re-enables unexpired JWTs; token revocation is not implemented.
- Admin accounts cannot be punished from this panel; self-moderation is denied.
- History shows the latest 50 actions. Database audit rows are retained and deletion is restricted by foreign keys. There is no audit update/delete API, but this is not tamper-proof against a database administrator.
- Immediate socket disconnection is in-process: use one realtime API instance until shared events and a socket adapter are implemented.
- The official client stops media on restriction. Modified peer-to-peer clients need media-server enforcement for a hard media cutoff.
- Appeals inbox, email verification/password reset and automatic strikes are separate features.

The original package was locally checked with 8 backend unit tests, 12 frontend tests, builds/typechecks/lint and a PGlite SQL migration smoke check. GitHub CI on this branch runs the real PostgreSQL integration suite. Real two-device and live browser acceptance remain manual.
