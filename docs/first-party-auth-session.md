# First-party authentication and realtime ticket

## Why
The login cookie was set on the API domain while the Next.js application lived on another origin. Browsers that block third-party cookies could show a successful login immediately, then return 401 after refresh and reject ICE/Socket.IO authentication.

## Fix
- All browser REST calls use `/api/v1` on the Next.js frontend origin. The Next.js rewrite proxies those paths to NestJS, so HTTP-only login cookies are first-party.
- `GET /api/v1/auth/socket-ticket` requires the HTTP-only login cookie and returns a 30-second signed ticket. The browser holds the ticket only for Socket.IO handshake; it is not stored in localStorage.
- Socket.IO validates signed tickets and the revocation status of the **original** login session, both at handshake and per packet. Logout disconnects sockets bound to that session.
- Tickets are short-lived but not single-use; they are transient connection credentials. Never log ticket values. Reconnection obtains a new ticket.
- Existing cookie-based Socket.IO connections are accepted for older clients during transition.

## Deployment
Set `API_PROXY_TARGET=https://YOUR_API_HOST/api/v1` in the **Next.js server/build** environment, and `NEXT_PUBLIC_SOCKET_URL=https://YOUR_API_HOST` in the Next.js build environment. `NEXT_PUBLIC_API_URL` is retained as a fallback backend origin. Set `CLIENT_URL=https://YOUR_FRONTEND_HOST` on NestJS, matching the exact browser origin. All sites must use HTTPS in production.
A Next.js rewrite needs a live Next.js server/platform capable of external rewrites; a pure static export will not proxy requests.
Restart/redeploy **both** API and Next.js to activate the change.

## Verify
1. Open frontend, log in, inspect DevTools: request `/api/v1/auth/login` must be to frontend origin and response Set-Cookie stored under frontend site.
2. Refresh /profile: `/api/v1/auth/me` returns 200.
3. Open /video: `/api/v1/auth/ice-servers` and `/api/v1/auth/socket-ticket` return 200. WebSocket connects to the realtime origin using ticket.
4. Test both accounts on separate devices and different networks, then logout and confirm socket access is revoked.
5. If login is still rejected, check reverse proxy request/response headers, HTTPS, cookie policy, and backend logs; do not add tokens to localStorage.

The GitHub test suite validates API/ticket semantics, not the deployed proxy nor actual browser policies. A live-browser smoke test remains necessary.
