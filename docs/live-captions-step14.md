# Live Debate Captions — Feature Guide

## What is supported

- **Opt-in** browser speech-to-text. Captions are OFF by default and toggled in the live debate room.
- The speaker sees interim recognition results locally. **Only finalized recognition segments** are sent through the authenticated Socket.IO connection to the currently matched partner.
- Available languages are selected from the debate preferences: English (`en-US`) and Urdu (`ur-PK`), subject to the browser recognition service supporting the locale.
- Speech recognition stops when muted, during another participant's formal speaking turn, on disconnection, or when captions are switched off. Partner captions are ephemeral and expire from the screen.
- Match-bound relay, transcript size validation and quotas prevent stale or unrelated sessions from receiving data. No database model or audio recording was added. No captions are persisted in app history, chat logs or moderation data.

## Limitations & privacy

The Web Speech API `SpeechRecognition` is not supported in every browser or OS. It is commonly available on some Chromium-based desktop/mobile browsers but **must be tested per device**; Safari/Firefox behavior varies. When unavailable, the UI shows that captions are unsupported and disables the toggle. Speech recognition may be processed by the browser vendor's cloud service and may send microphone audio to that provider. Therefore the UI explains the limitation, and recognition only starts after a person explicitly opts in.

Captions are not translated. The recognition language is taken from the matching preferences; Urdu recognition may vary by platform and dialect. Accuracy depends on microphone input, accents, noisy rooms, and speech service availability. Use headphones to avoid recognition of audio played from the partner.

This implementation does not add a commercial transcription provider, external API credentials, server-based ASR, permanent transcripts or AI moderator.

## Local smoke test

1. Use two separate logged-in accounts in two supported browsers. Choose the same topic, language and mode, enable camera/mic and connect.
2. Both participants should see a **Turn captions on** control, OFF by default.
3. Enable captions on speaker A. Speak and verify A sees interim text; when speech is finalized, B can see it **after enabling caption display**. B's own speech recognition must stay off until B enables it.
4. Toggle captions off and confirm speech recognition ends and no further final phrases are sent.
5. Mute speaker A and verify recognition stops. Unmute and verify recognition can start again when captions are still enabled. In structured mode, only the active speaker is transcribed.
6. End the debate or press Next, then verify old captions do not appear in a new match. Check that history and chat do not store captions.
7. Verify unsupported browsers show explicit fallback without affecting the video call.
8. Run `npm --prefix client test`, `npm --prefix client run typecheck`, and API tests with a disposable PostgreSQL database.

## Security model

- WebSocket listeners are already authenticated through socket tickets/session checks.
- Server checks `matchId` and symmetrical peer identity **before and after** rate-limit lookup; only that peer receives the final caption.
- Caption length is limited to 240 characters; rate limited to 15 events per user per 10 seconds.
- The application does not write transcripts to PostgreSQL, files or event telemetry.
- Caption display uses React text nodes (no raw HTML injection).

**Out of scope:** hosted speech recognition, live translation, storing/transcribing recorded media, or production deployment.
