# Step 9 — Media quality and device switching

## Added
- **Connection indicator:** polls the active RTCPeerConnection's inbound RTP stats once every four seconds while connected. Labels start at `checking` until two comparable samples exist. Uses packet loss and audio jitter deltas, not an estimated round-trip time or fake network speed.
- **Microphone activity:** local-only Web Audio analyser; no audio is played through the speakers or uploaded for metering. Sampling updates the UI around 10 times/second. AudioContext is closed when no longer needed.
- **In-call camera/microphone selection:** enumerate devices with permission, request selected device individually, replace the corresponding RTP sender track, stop old track **only after success**, and preserve muted/camera-off and formal speaking-turn restrictions.
- Failed device switching leaves the previous track active and shows a recoverable error.

## Browser validation before merge
1. Two accounts on different browsers: complete friendly video call, switch each participant's camera and microphone and verify remote playback continues without a new match.
2. Muted microphone: change mic and confirm it stays muted until user enables it.
3. Formal debate: switch microphone while it is the partner's turn and confirm it stays disabled; verify turn authorization re-enables it only according to user intent.
4. Change to an unplugged/blocked device: previous track should remain live and usable.
5. Temporarily throttle/disconnect network: quality badge must distinguish measuring from observed poor quality; existing ICE restart must still recover when possible.
6. Mobile viewport, reduced motion, Safari, Android Chrome: check device list, microphone bar and selectors.
7. End call and navigate away: verify camera/microphone lights go off and AudioContext closes.

## Known limits
- Quality thresholds are advisory heuristics and should not be presented as latency/bandwidth measurements. No synthetic quality values are shown without inbound RTP samples.
- Some browsers omit detailed RTP metrics, and `getStats` may remain in `checking`.
- Fake-media Playwright and CI cannot prove real hardware selection, cross-network TURN traversal, poor-network recovery or microphone audibility.
- Existing backend ICE/TURN and formal debate sequencing are unchanged.

No database changes or deployment.
