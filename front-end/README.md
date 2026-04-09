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

## Layout

- `src/components/` — feature UI (auth, chat, connections, matching, profile, common, dashboard)
- `src/contexts/` — Auth, Socket
- `src/services/` — API client and socket helpers
- `src/types/`, `src/constants/`, `src/utils/`
- `src/**/__tests__/` — component and context tests
- `e2e/` — Playwright specs

Config: `vite.config.ts`, `postcss.config.js` (Tailwind), `playwright.config.ts`.
