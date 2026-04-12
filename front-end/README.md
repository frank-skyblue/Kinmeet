# KinMeet front-end

React SPA for KinMeet. Repository overview, full stack setup, and contributor workflow live in the **[root README](../README.md)** and **[onboard.md](../onboard.md)**.

## Stack

React 19, TypeScript, Vite, React Router, Tailwind CSS v4 (PostCSS), Axios, Socket.io client, Vitest + Testing Library, Playwright (E2E).

## Scripts

| Command                 | Description                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server (default `http://localhost:5173`)                                         |
| `npm run build`         | Typecheck and production build                                                            |
| `npm test`              | Vitest (single run)                                                                       |
| `npm run test:watch`    | Vitest watch mode                                                                         |
| `npm run test:coverage` | Vitest with coverage                                                                      |
| `npm run lint`          | ESLint                                                                                    |
| `npx playwright test`   | E2E tests (starts API + app via `playwright.config.ts`; local MongoDB on `27017` for E2E) |

First-time Playwright browsers:

```bash
npx playwright install --with-deps chromium
```

## Environment

Optional `front-end/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

Match this to your running back-end (see root README).

## Architecture

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — provider tree, routing, contexts, services, and when to update the doc

### Web push (FCM)

Copy [`.env.example`](./.env.example) and set the `VITE_FIREBASE_*` and `VITE_FIREBASE_VAPID_KEY` values from the Firebase Console (Web app + Cloud Messaging → Web Push certificates). Optional **`VITE_FIREBASE_MEASUREMENT_ID`** (`G-…`) enables Firebase Analytics events when users opt in or out of web push (see `src/services/pushNotifications.ts`).

For **`npm run dev`** only, add **`VITE_ENABLE_WEB_PUSH=true`** when you want to test push locally; otherwise the app skips FCM registration and the notification permission prompt even if Firebase vars are set. **Production** (`npm run build` / Vercel) ignores this flag and registers push whenever Firebase is configured.

On **`npm run dev`** and **`npm run build`**, Vite writes [`public/firebase-messaging-sw.js`](./public/firebase-messaging-sw.js) from those variables. That file is **gitignored** so local Firebase config is not committed.

**iOS (Safari):** install the app with **Share → Add to Home Screen**, open it from the home screen icon, then allow notifications. In-browser Safari alone does not get the same PWA push behavior.

**Back-end:** set `FIREBASE_SERVICE_ACCOUNT_JSON` (service account JSON as one line) and optional `WEB_APP_URL` (HTTPS origin of this SPA, no trailing slash) on the API server so FCM can send messages and set click links. See [`back-end/.env.example`](../back-end/.env.example).

## Layout

- `src/components/` — feature UI (auth, chat, connections, matching, profile, common, dashboard)
- `src/contexts/` — Auth, Socket
- `src/services/` — API client and socket helpers
- `src/types/`, `src/constants/`, `src/utils/`
- `src/**/__tests__/` — component and context tests
- `e2e/` — Playwright specs

Config: `vite.config.ts`, `postcss.config.js` (Tailwind), `playwright.config.ts`.
