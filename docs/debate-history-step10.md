# Step 10 — Private debate history

## What gets saved
Only a match identifier, two internal participant IDs (needed to authorize access), topic, language, mode, start/end timestamps and the final status. **No call recordings, video, audio, private messages, WebRTC signaling, partner name, email or profile snapshot.**

Rows are created when a match ENDS, not when users enter the matchmaking queue. Friendly sessions have `ENDED`; only fully timed formal sessions have `COMPLETED`. If the NestJS process terminates before it can record an end, that session may not appear in history. Persistence is best-effort in V1.

## API
`GET /api/v1/debates/history?page=1` requires the normal httpOnly login cookie. Returns a maximum of 12 items per page, reverse chronological order; each item includes topic, language, mode, start/end ISO timestamps, elapsed seconds, and `endReason`. Partner user IDs are **never** returned. Queries are always filtered by the authenticated user ID; administrative accounts do not gain unrestricted history access.

## User experience
`/history` is accessible through authenticated navigation and the profile page. No session data is placed in localStorage. Empty, loading, failure and pagination states are supported.

## Schema and migration
`api/prisma/migrations/20261107000000_debate_history/migration.sql` adds a `debate_history` table with FKs to users and indexes on (participant, ended time). User deletion cascades to their session history. Apply with `npx prisma migrate deploy` **against the correct database**, then regenerate Prisma client. Never run `migrate reset` on an existing database.

## QA
- Guest: 401 from the endpoint.
- Participant A/B: sees a record after leave. Unrelated users: see none.
- Before end: no history record. After a second leave: no duplicate.
- Invalid page params return 400.
- Formal clock finish: status COMPLETED; early leave: ENDED.
- Client: empty, error/retry, pagination and responsive design.
- No partner PII, transcript or media data in API response.
- Device/browser WebRTC integration remains in prior CI, but the end-state persistence is server-side and does not depend on camera permission.

No deployment is part of this PR.
