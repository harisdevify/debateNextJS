# Debate preferences and matchmaking

The /video route now shows an accessible setup form before requesting camera/microphone permission. Users choose a discussion topic, language and mode; the values are sent in the Socket.IO `find-partner` payload and reused by Next. Change preferences unmounts the existing room, closes its media/peer connections and opens the form again.

The backend validates these exact values against the existing `DebatePreferencesDto` and matches only sockets with all three choices equal. Incompatible users retain their FIFO queue position. Block relationships, rule acceptance, token revocation, one-active-debate-per-account and match-bound SDP/ICE/chat remain intact.

For older clients, emitting `find-partner` without a payload defaults to `religion/en/friendly`. Invalid payloads emit `search-error` and do not join the queue. The selected preferences are ephemeral: a new session starts with defaults; no schema migration is required.

Formal mode currently changes matching preferences only; timed turns are not implemented. Realtime queue remains single-instance/in-memory.

## Verify

```sh
cd api && npm ci && npm run typecheck && npm run test:unit && npm run test:e2e && npm run build
cd ../client && npm ci && npm run typecheck && npm run lint && npm run test && npm run build
```

Use a disposable PostgreSQL test database for `test:e2e`.
