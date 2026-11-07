# Step 15 — Debate Screen Sharing

## Scope
Screen sharing is **opt-in** and only available during a connected 1-to-1 debate. It uses the browser's `getDisplayMedia` picker and replaces the existing outgoing camera video track with the selected display track using `RTCRtpSender.replaceTrack`. **No extra peer connection, media server, recording, database migration or backend deployment** is required.

The speaker keeps seeing their own camera preview locally and their microphone, live captions, formal speaking turns, and chat continue normally. **The partner sees the shared screen instead of the camera** while capture is active; this version does not transmit two simultaneous remote video tracks. When sharing stops, the original local camera track is restored. This is intentional to preserve the existing one-video-track WebRTC signaling design without renegotiation.

## User workflow
1. Join a debate with the existing camera/microphone check.
2. During an active connection, press **Share screen**. Select a window, tab or screen from the browser dialog; permission cannot be silently bypassed.
3. Partner's video tile adjusts to **contain** the desktop content rather than crop it, and shows **Partner is sharing their screen**.
4. Press **Stop screen sharing**, or use the browser's own Stop sharing control. The remote camera track is restored, and status is updated.
5. End call, change preferences or press Next: desktop capture stops immediately and old match status is cleared.

## Browser limitations
Desktop Chrome/Edge generally support `getDisplayMedia`, subject to OS screen-recording permission (on macOS this may require enabling browser screen recording in **System Settings → Privacy & Security → Screen & System Audio Recording**, then restarting the browser). Browser support and capture of individual windows/tabs differ by OS and browser. Mobile Safari/Chrome may have no `getDisplayMedia`; the button is disabled.

When the browser permission picker is cancelled, no video switching occurs. Display capture is not saved. System audio is intentionally **not** shared (`audio: false`) to prevent audio routing/feedback and preserve debate microphone rules.

## QA test
- Connect two users in separate browser sessions, check camera/audio and captions.
- Share a tab/window from A; B must see readable, uncropped screen content. A still sees local camera preview and can chat.
- Stop by the in-app button; B must return to A's camera. Repeat using the browser's **Stop sharing** UI.
- Cancel OS/browser permission picker: camera must keep working.
- Press Next/End during sharing; browser capture indicator must disappear.
- Switch camera while sharing, then stop; B must see the newly selected camera when sharing ends.
- Verify disabled state when not connected or `getDisplayMedia` is missing.
- Test both Friendly and Formal modes. Formal turn muting must remain enforced; no screen audio is captured.
- Verify no cross-match screen-share events reach third-party sockets.

## Security
- Browser handles capture consent; the app never silently grants permission.
- Only active, symmetrically matched socket peers receive screen state notifications, scoped to their `matchId`; the video pixels stay on the existing encrypted WebRTC media connection.
- Screen content is not stored and no screenshot/transcript is created.
- Private OS windows and notifications may be exposed by user-selected full-screen sharing. Show this warning to participants before sharing sensitive content.

**Status:** This PR is application feature development only. No production deployment, TURN provisioning or infrastructure changes.
