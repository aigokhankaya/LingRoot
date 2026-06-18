# Security Best Practices Report

## Executive Summary

This repository has three high-impact security issues that should be prioritized:

1. A Gemini API key is intentionally injected into a browser bundle and used directly from client-side code.
2. The web frontend persists bearer and refresh tokens in `localStorage`, which makes account takeover possible if any XSS lands in the frontend.
3. Several frontend API proxy routes use permissive wildcard CORS and, in two cases, reflect or return authorization data in responses.

There is also a medium-severity backend issue where multiple modules still silently fall back to insecure default JWT secrets, even though other parts of the backend correctly fail closed in production.

## Critical Findings

### SBP-001
- Severity: Critical
- Location: [newDesign/vite.config.ts](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/newDesign/vite.config.ts:13), [newDesign/components/TTSOverlay.tsx](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/newDesign/components/TTSOverlay.tsx:19)
- Evidence:

```ts
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

```ts
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

- Impact: Any user opening the `newDesign` app can extract the Gemini API key from the shipped JavaScript bundle and use it outside the app, leading to quota theft, billing abuse, and full compromise of that provider credential.
- Fix: Remove all client-side API key injection. Move Gemini calls behind a backend endpoint or server-only function, and keep the provider key exclusively server-side.
- Mitigation: Immediately rotate the exposed Gemini key. Audit usage and billing for abuse.
- False positive notes: None. The key is explicitly injected into the client bundle and consumed in browser code.

## High Findings

### SBP-002
- Severity: High
- Location: [frontend/src/lib/apiClient.ts](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/frontend/src/lib/apiClient.ts:50), [frontend/src/lib/auth.tsx](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/frontend/src/lib/auth.tsx:85)
- Evidence:

```ts
getToken: () => {
  if (!isBrowser) return null;
  return localStorage.getItem(TOKEN_KEY);
},

setToken: (token: string) => {
  if (!isBrowser) return;
  localStorage.setItem(TOKEN_KEY, token);
},

getRefreshToken: () => {
  if (!isBrowser) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
},

setRefreshToken: (token: string) => {
  if (!isBrowser) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
},
```

```ts
if (data.data?.token) {
  localStorage.setItem('lingroot_token', data.data.token);
}
```

- Impact: Any successful XSS in the frontend can immediately read and exfiltrate access and refresh tokens from `localStorage`, resulting in persistent user session theft and account takeover.
- Fix: Move session handling to secure, `HttpOnly` cookies with deliberate `SameSite` settings and server-side refresh flow. If bearer tokens must remain, keep them in memory only and shorten their lifetime aggressively.
- Mitigation: Tighten CSP and eliminate DOM XSS sinks to reduce exposure until token storage is redesigned.
- False positive notes: This is a real risk even if no current XSS is known, because `localStorage` is readable by any script executing in the origin.

### SBP-003
- Severity: High
- Location: [frontend/src/pages/api/youtube-transcript.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/frontend/src/pages/api/youtube-transcript.js:3), [frontend/src/pages/api/auth/me.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/frontend/src/pages/api/auth/me.js:4), [frontend/pages/api/youtube-subtitle.ts](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/frontend/pages/api/youtube-subtitle.ts:2)
- Evidence:

```js
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Origin', '*');
```

```js
if (authHeader) {
  res.setHeader('Authorization', authHeader);
}
```

```js
data: {
  user: demoUser,
  token: authHeader.split(' ')[1]
}
```

- Impact: These routes break least-privilege CORS policy and, in two cases, reflect authorization material back into responses. Even where browser credential rules reduce exploitability, this is still a dangerous pattern that can leak tokens or normalize insecure cross-origin access assumptions.
- Fix: Remove wildcard CORS from these routes. Use a strict origin allowlist or same-origin only behavior. Do not echo `Authorization` headers or bearer tokens back to callers. If these are debug/demo routes, remove them from production builds entirely.
- Mitigation: Audit all `pages/api` proxy routes for similar “temporary” or demo logic. Add integration tests asserting no auth header reflection and no wildcard CORS on privileged routes.
- False positive notes: The risk is highest if these routes are reachable in production and clients send bearer tokens to them, which the current code explicitly supports.

## Medium Findings

### SBP-004
- Severity: Medium
- Location: [backend/services/oauthService.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/services/oauthService.js:16), [backend/routes/configRoutes.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/routes/configRoutes.js:40)
- Evidence:

```js
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "lingroot-refresh-secret-key";
```

```js
const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
const decoded = jwt.verify(token, JWT_SECRET);
```

- Impact: The backend does have fail-closed checks in other auth modules, but these duplicate fallback secrets remain embedded in runtime code paths. This creates future regression risk, makes scripts/utilities easy to misconfigure, and can silently normalize insecure token signing/verification behavior outside the main guarded entrypoints.
- Fix: Remove all default JWT secret fallbacks from runtime modules. Require environment secrets explicitly and fail fast everywhere, not only in selected auth middleware/controllers.
- Mitigation: Add a shared secret-loading helper that throws if required secrets are missing, and import it everywhere JWT signing or verification is performed.
- False positive notes: Main production auth flow appears to guard against missing secrets elsewhere, so this is not currently assessed as a proven production bypass. It is still contrary to secure-by-default practice and should be removed.

## Additional Notes

- Backend baseline security posture has some good controls already in place, including `helmet`, `hpp`, explicit CORS allowlists in the main Express app, and rate limiting on auth-sensitive routes: [backend/server.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/server.js:86), [backend/middleware/security.js](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/backend/middleware/security.js:68).
- This report focused on the highest-confidence issues found during a targeted audit rather than exhaustively cataloging every lower-risk improvement.
