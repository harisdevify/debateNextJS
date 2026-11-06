# Authentication and UI remediation
- Race-safe /auth/me initialization prevents late responses overriding successful login.
- Distinguishes a confirmed unauthorized response (401/403) from timeout/network errors; a temporary failure does not assume logout.
- Login screen remains usable when session verification fails.
- Protected profile/debate routes provide a retry path rather than falsely redirecting to login after a network error.
- Guest homepage CTA says Login to Start Debating; authorized users go to debate or rules.
- Header avoids flashing guest links during initial auth loading.
- Login/register reuse accessible TextField and PrimaryButton components with associated labels and focus states.
- Removes unsupported homepage metrics/profanity claims.
- API timeout raised to 10s.

## Still needs deployment diagnosis
API uses an HTTP-only cookie scoped to the API hostname (SameSite=None in production). If frontend/API are on unrelated sites, third-party-cookie restrictions can break /auth/me and WebSocket authorization despite a 200 login response. Use same-site HTTPS domains or a proven reverse proxy and verify browser cookies, CLIENT_URL, NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL. Do not store JWTs in localStorage as a workaround.

## Manual browser check not performed
Connected browser extension rejected the request outside its originating browser session. GitHub CI is automated validation, not proof of browser/mobile UX or real WebRTC function.
