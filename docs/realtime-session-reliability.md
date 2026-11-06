# Realtime session reliability

- Every login signs a unique JWT `jti` so repeated logins in one second remain independent.
- Logout records SHA-256 of that JWT in PostgreSQL until its expiration and emits a process-local event to disconnect matching WebSockets. The token is not stored in plaintext.
- API guards and Socket.IO authentication reject revoked JWTs. Active WebSocket packets are checked against PostgreSQL. A different API instance may retain an idle socket until its next packet; distributed notifications are deferred to the multi-instance realtime migration.
- Within the current single-instance matchmaking architecture, an account can have only one waiting or matched socket. Another tab receives `debate-already-active` and can retry after the original tab leaves. Do not scale realtime horizontally without a distributed matchmaking lock/coordinator.
- Deploy the Prisma migration **before** deploying API code: `cd api && npx prisma migrate deploy`.
- Regression tests cover logout and socket revocation, independent logins, duplicate tabs while waiting/matched, and searching again after leaving.

## Verification

```bash
cd api
npm ci
npx prisma migrate deploy
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
cd ../client
npm ci
npm run typecheck
npm run test
npm run lint
npm run build
```

All e2e tests require an isolated disposable PostgreSQL database.
