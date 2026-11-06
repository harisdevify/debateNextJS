# Debate journey UX (Step 7)

## Flow
Authenticated users with accepted rules now complete:
1. Topic/language/mode selection
2. Explicit browser camera/microphone permission and live local preview
3. Optional camera/microphone device selection, then **Find a debate partner**
4. Server-confirmed waiting state and elapsed wait timer (no invented queue size or ETA)
5. Cancel search, resume search, or change preferences
6. Standard friendly/formal WebRTC debate with existing chat, reports, blocks, and timed formal turns

## Media ownership
The device-check component owns its MediaStream until the user joins. Going back or unmounting releases its tracks; successful joining transfers the stream to `useDebateRoom` and prevents re-requesting permission. The debate hook stops tracks upon leaving the debate. Dev StrictMode replay uses a microtask cleanup guard to avoid prematurely stopping the transferred stream.

## Status feedback
The client shows "Checking preferences with the debate server" before the server confirms queue placement via `waiting`; afterward it shows "Waiting for someone with the same topic, language and mode." The elapsed clock starts on the search request, not a fabricated matching estimate. The queue cancellation sends `leave` and ignores late `waiting` or `matched` messages.

## Limitations
- Device check validates the existence of live audio/video tracks and offers source switching. It does not measure microphone audio amplitude or guarantee the remote side will hear the user; real-device testing remains necessary.
- Cancellation is socket-event based; the existing backend `leave` handler removes the socket from the queue. No database changes.
- Reconnection uses existing WebRTC recovery and formal session resume logic. Backend single-process constraints remain.
- Real-world camera permissions, TURN/NAT, Safari/mobile layouts require human-device validation in addition to CI.
