# Step 13 — Production TURN and real-network video verification

## Scope and honest status

This PR improves browser-side TURN credential freshness and exposes the **selected WebRTC connection path** (Direct peer / TURN relay / Detecting). It does **not** install, host, provision, or test a real TURN server. A green CI run checks mocked WebRTC behavior; it is not evidence that real devices can connect across restrictive NATs.

This app already returns short-lived coturn REST-style TURN credentials from the authenticated `GET /api/v1/auth/ice-servers` endpoint. The shared secret remains only in the backend environment. A browser never receives the shared secret, only an expiring HMAC credential for the authenticated user.

## Deployment inputs required

- A dedicated public hostname, for example `turn.example.com`, and a public IP, preferably in/near the user population's region.
- A VPS with enough **egress bandwidth and a bandwidth budget**, preferably separate from the main app. TURN relays users' encrypted WebRTC packets, so bandwidth grows with call count and resolution.
- Firewall/security-group ability to expose TURN signaling on **UDP/TCP 3478**, optional **TLS/TCP 5349**, and an explicit relay UDP port range, e.g. `49160-49200`. Increase the relay range after capacity testing.
- If TLS/TURN-over-TLS is used, an issued certificate for the TURN hostname and restricted private-key access.

## Example Ubuntu coturn configuration (adapt before production)

Install Ubuntu's `coturn` package using your supported package manager. Set an independently generated random secret on the TURN host; **do not paste the same secret into a repository, public issue, browser variable or screenshots**.

Example `/etc/turnserver.conf` entries:

```ini
listening-port=3478
tls-listening-port=5349
fingerprint
use-auth-secret
static-auth-secret=GENERATE_A_UNIQUE_RANDOM_SHARED_SECRET
realm=turn.example.com
server-name=turn.example.com
min-port=49160
max-port=49200
no-loopback-peers
no-multicast-peers
no-cli
stale-nonce=600
# If behind a 1:1 NAT, configure external-ip appropriately.
# external-ip=PUBLIC_IPV4/PRIVATE_IPV4
# Only enable TLS after configuring valid certificate and key paths.
# cert=/etc/letsencrypt/live/turn.example.com/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.example.com/privkey.pem
```

Avoid opening privileged networks as relay peers. Restrict SSH and firewall access to your operators; do not use the application database credentials for TURN.

When using UFW (and only after checking firewall policy for the actual host), a typical relay host needs `3478/udp`, `3478/tcp`, `49160:49200/udp`, and `5349/tcp` **only if TLS is configured**. Cloud network/security group rules must allow the same range. Run coturn under a restricted service user; verify service and certificate permissions with your distro's documentation.

API environment (server-side **only**):

```env
TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp
TURN_SECRET=EXACT_SAME_RANDOM_SECRET_AS_THE_TURN_SERVER
```

After valid TLS setup, add `turns:turn.example.com:5349?transport=tcp` to `TURN_URLS`. Public `NEXT_PUBLIC_*` environment variables must **never** contain `TURN_SECRET`.

**One-hour credentials**: The backend HMAC username contains an expiry and authenticated user ID. Step 13 refreshes credentials before creating each *new* WebRTC peer, even after a long matchmaking wait. Already-running connections do not automatically change their authentication token; very long calls and recovery after credential expiration require additional real-network verification.

## Verification checklist (required before launch)

1. **Server readiness:** Confirm DNS resolves the TURN hostname to the expected public IP. Check service status, allocated relay ports, cloud firewall rules and server logs without logging passwords. Validate any `turns:` TLS certificate hostname and chain.
2. **TURN authentication:** While logged in, open `/api/v1/auth/ice-servers` from the frontend origin. Expect STUN plus TURN URIs with temporary `username` and `credential`, and a `Cache-Control: no-store` response. Do not share the response or credentials publicly.
3. **Direct path control:** Start two users on an uncomplicated network. The connected debate should show **Direct peer** when the browser's selected ICE candidate pair is direct. A connection might use relay anyway; do not force an unsupported expectation.
4. **TURN relay validation:** Test two real devices on separate restrictive networks (home Wi-Fi versus mobile 4G/5G, behind corporate NAT where permitted). In Chrome `chrome://webrtc-internals`, identify a **selected candidate pair with candidateType=relay** and a stable live remote video/audio stream. Debate page should say **TURN relay**. A relay *candidate existing* is insufficient; it must be selected and exchanging packets.
5. **Firewall fallback:** Verify UDP and TCP TURN paths as permitted, plus TURNS/TCP when configured. Test network handoff and a dropped transport. Ensure the user receives the reconnect/failed message and can retry.
6. **Performance:** Use real participants; measure median/95th percentile setup time, disconnection rate, video freeze time, packet loss and jitter, relay bandwidth and server CPU/egress. Do not collect personally identifying IP addresses or media content in telemetry.
7. **Formal debate:** Test controlled turn muting, timer progress through a disconnect, reconnect within the grace period, and the correct end state after the grace period.
8. **Existing behavior:** Test Next, Cancel, report/block, camera/mic switching and login/logout with fresh and expired accounts. Check Chrome desktop, Firefox, Android Chrome and iOS Safari, including denied camera/mic permission.
9. **Operational safety:** Establish relay egress budget/monitoring, alerting, log retention and incident/rollback procedure. Server provisioning is still required.

## Troubleshooting decision table

| Symptom | Likely area | Check |
|---|---|---|
| Match succeeds but endless Connecting | ICE candidate reachability | Selected pair, remote track, TURN firewall |
| No relay candidate after TURN configuration | TURN auth, DNS or firewall | 401/403, HMAC time skew, UDP/TCP ports |
| TURN candidate exists but never selected | Normal if direct path succeeds | Selected pair (not just candidate list) |
| Drops on network switch | ICE restart / credential age | Browser state and ICE restart signaling |
| TURN relay appears but media is choppy | Egress bandwidth, routing, network | Packet loss, jitter and relay host load |
| Cannot start call before match | Camera permissions, Socket.IO auth or API | Browser permissions, /auth/ice-servers, socket ticket |

## Known limits

- WebRTC signaling and matchmaking remain single-instance/in-memory; this PR does not implement distributed sessions.
- Client-only route diagnostics never send public/private IP addresses to the application or server.
- Actual TURN server provisioning, credentials, firewall changes, monitoring and network testing require real infrastructure access, and were intentionally not performed by the PR.
