# AcústicaSounds – Web (Next.js)

## Overview
- Frontend client for the AcústicaSounds platform built with Next.js App Router
- Integrates with the backend API (`apps/api`) for auth and tracks
- Uses NextAuth credentials provider + JWT refresh flow

## Prerequisites
- Node.js >= 18
- pnpm
- Backend API running (`pnpm --filter ./apps/api dev`)

## Environment
Create `apps/web/.env.local` (already gitignored) with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=<random string>
NEXTAUTH_URL=http://localhost:3000
```
> `NEXTAUTH_SECRET` should match the backend JWT strength (32+ chars). When deploying, set these via the hosting provider.

## Install & Run
From the repo root:
```bash
pnpm install
pnpm --filter ./apps/web dev
```
Then open http://localhost:3000.

## Auth Flow
1. **Create user:** visit `/signup` or call `POST /auth/register` on the API.
2. **Login:** `/login` posts credentials to the API via NextAuth, stores access/refresh tokens, and keeps session.currentUser.
3. **Token refresh:** tokens refresh automatically about 1 minute before expiry; on failure the session includes `session.error` so you can react.

## Tracks Page (`/courses`)
- Requires session; redirects UI messaging if unauthenticated.
- Calls `GET /tracks` with `Authorization: Bearer <accessToken>` and shows the list returned by the API.

## Testing & Linting
```bash
pnpm --filter ./apps/web lint
```
(There are no frontend unit tests yet.)

## Notes
- The navigation (`NavClient`) uses `useSession` to show login/logout links and the user email.
- `SessionProviderClient` wraps the app to provide NextAuth context.
- For admin-only actions (e.g. create tracks), promote a user via the backend script:
  ```bash
  pnpm --filter ./apps/api promote-admin <email> [password]
  ```

## API quick test
```bash
curl -i -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@example.com\",\"password\":\"Secret123!\"}"
curl -i -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@example.com\",\"password\":\"Secret123!\"}"
curl -i http://localhost:3001/tracks \
  -H "Authorization: Bearer <accessToken>"
```

## Screenshots
- Capture UI states (login, signup, courses) with the browser dev server running (`pnpm --filter ./apps/web dev`).
- Save images under `apps/web/public/screenshots/` and reference them here, e.g. `![Login](./public/screenshots/login.png)`.
- Keep them light (<1MB) so the repo stays slim.
