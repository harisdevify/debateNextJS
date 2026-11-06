# Formal debate turn system

- The server owns one 10-minute clock: four 2-minute turns and two 1-minute turns, totaling 5 speaking minutes for each participant.
- Socket.IO `formal-state` carries absolute epoch times and the local user's speaker permission. Client renders a clock adjusted for server skew; it cannot change server turn decisions.
- A disconnected formal participant has a 20-second grace period; on reconnect the existing match and timestamps resume and WebRTC renegotiates. Past the grace period the match ends.
- The server sends `formal-completed` at the deadline. The client stops camera/microphone tracks and offers a new debate.
- Non-speakers' audio tracks are disabled locally; manually muted speakers remain muted when their next turn begins. This is client-side enforcement, not server media moderation.
- Friendly mode is unchanged. Auth, blocks, single-account active debate and chat behavior remain in place.
- This is still single-instance in-memory state. An API restart or a reconnect landing on another instance cannot resume the clock; distributed session persistence is future work.
