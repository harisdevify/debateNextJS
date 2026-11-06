# Authentication and UI findings

## Implemented
- Auth initial-state check is race-safe: a slow /auth/me cannot overwrite a successful login.
- Network failures are not treated as confirmed logout. Protected screens offer retry.
- Guest homepage does not advertise an immediately available video session: CTA routes to login and identifies its requirement.
- Header avoids guest-only actions while auth is unresolved.
- Homepage's unverified usage/latency/profanity claims are removed.
- API request timeout increased from 5 to 10 seconds to reduce false failures on slow networks.

## Deployment blocker to verify
The API issues a host-only HTTP-only cookie with production SameSite=None. If Next frontend and Nest API are on separate unrelated sites, browsers may block the third-party cookie, causing /auth/me, ICE endpoint and socket authorization failures even after login returned 200. This cannot be corrected solely by client state or React code.

Production should use same-site HTTPS frontend/API subdomains (e.g. app.example.com and api.example.com under the same registrable domain), or a tested same-origin reverse proxy for HTTP and Socket.IO. Verify CLIENT_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL, HTTPS and browser cookie storage. Never put raw JWTs in localStorage as a shortcut.

## Browser verification
Full interactive desktop/mobile checks were not available because the connected browser extension rejected access outside its originating browser context. Automated CI checks are not a substitute for manually verifying real browser cookie behavior, WebRTC, layout or device permissions.
