# KinMeet front-end architecture

This document describes how the React SPA is structured: entry point, global state, routing, API/socket usage, and where feature code lives. For stack versions, scripts, and env vars, see [../README.md](../README.md). For day-to-day coding rules (types, Tailwind, testing expectations), see [`.cursor/rules/frontend-architecture.mdc`](../../.cursor/rules/frontend-architecture.mdc). Theme tokens and visual system notes live in [THEME_IMPLEMENTATION.md](../THEME_IMPLEMENTATION.md).

---

## Runtime entry

| Piece | Role |
|--------|------|
| `index.html` | Vite mount; `#root` |
| `src/main.tsx` | `StrictMode`, renders `App` |
| `src/index.css` | Tailwind v4 / global styles |

---

## Application shell (`App.tsx`)

### Provider order (outer → inner)

1. **`AuthProvider`** — JWT in `localStorage`, `user` / `token`, login/register/logout, `refreshUser`.
2. **`SocketProvider`** — connects Socket.io when authenticated; exposes `socket` for real-time features.
3. **`ChatInboxProvider`** — loads conversation list + unread count via REST; subscribes to socket events to keep inbox in sync; debounces refetch on visibility.
4. **`ConnectionRequestsProvider`** — loads pending connection requests for nav badge / requests UI.
5. **`Router`** — React Router `BrowserRouter` + `Routes`.

**Why this order:** Socket and inbox/providers depend on `useAuth()`; chat inbox depends on `useSocket()` as well as auth.

### Routing model

- **Public:** `/login`, `/signup`.
- **Protected:** `Route element={<ProtectedRoute />}` wraps an `Outlet`; child `Route element={<Layout />}` wraps dashboard pages. Unauthenticated users are redirected to `/login`; `ProtectedRoute` shows a loading state while auth hydrates from storage.
- **Layout children:** `/discover`, `/connections` (tabbed hub: **My kins** and **Requests**, `?tab=requests` for the requests panel), legacy `/requests` redirects to `/connections?tab=requests`, `/profile`, `/profile/:userId` (read-only view of a member), `/settings`, `/settings/account` (account management including delete account), `/chat`, `/chat/:userId` — all share `Layout` (nav, header chrome, chat entry).
- **Fallbacks:** `/` and unknown paths `Navigate` to `/discover`.

---

## Directory map (`src/`)

| Area | Responsibility |
|------|----------------|
| **`types/index.ts`** | Shared domain/API TypeScript types. Prefer adding here over inline interfaces in components. |
| **`constants/`** | Static options and validation helpers (e.g. profile options). Must not import from `components/`. |
| **`utils/`** | Pure helpers (e.g. `getErrorMessage` in `error.ts`). |
| **`services/api.ts`** | Axios instance with auth header interceptor; grouped exports: `authAPI`, `profileAPI`, `matchingAPI`, `connectionsAPI`, `chatAPI`, `blockAPI`; `getPhotoUrl()` for relative vs absolute image URLs; default `api` export. |
| **`services/socketService.ts`** | Singleton-style Socket.io client: `connect` / `disconnect` / `getSocket`. |
| **`contexts/`** | React context + providers. Some features split **context definition** (`.ts`) from **provider component** (`.tsx`) to satisfy Fast Refresh when the file exports both hooks and non-component values. |
| **`components/`** | Feature UI, grouped by domain: `auth/`, `dashboard/`, `matching/`, `connections/`, `chat/`, `profile/`, `settings/`, `common/`. |
| **`test/setup.ts`** | Vitest: Testing Library cleanup, `localStorage` clear, common DOM mocks. |
| **`test/mocks/wrappers.tsx`** | Shared test providers / router wrappers where needed. |

---

## Global state (contexts)

| Context | Source files | Consumption |
|---------|----------------|-------------|
| Auth | `AuthContext.tsx` | `useAuth()` — app-wide identity and token. |
| Socket | `SocketContext.tsx` | `useSocket()` — real-time connection after login. |
| Chat inbox | `chatInboxContext.ts`, `ChatInboxProvider.tsx` | `useChatInbox()` — conversations, unread count, refetch, merge helpers for new messages. |
| Connection requests | `connectionRequestsContext.ts`, `ConnectionRequestsProvider.tsx` | `useConnectionRequests()` — pending requests + refetch. |

Local and page-level state stay in components unless multiple distant trees need the same data (then consider context or lifting state deliberately).

---

## Data access

- **HTTP:** Single `axios` base URL from `VITE_API_URL` (see README). Bearer token attached per request from `localStorage`.
- **Photos:** `getPhotoUrl(path)` resolves backend-relative paths against the API origin.
- **WebSocket:** URL derived from API URL (strip `/api`); auth payload includes JWT.

New REST surfaces should get typed payloads in `types/index.ts`, functions in `services/api.ts`, and callers in services/components — not ad hoc `fetch` scattered in UI.

---

## UI composition

- **`Layout`** (`components/dashboard/Layout.tsx`): Shell for authenticated app — navigation, profile menu, chat affordance, outlet for child routes.
- **Feature pages** compose smaller pieces (e.g. chat: `Chat.tsx` orchestrates `ChatSidebar` + `ChatThread`).
- **`components/common/`**: Reusable primitives (`Logo`, `SearchableSelect`, `DynamicListField`, `LookingForCheckboxes`, etc.).

Styling is **Tailwind-only** in components (no separate CSS modules per feature). Design tokens / theme are documented in `THEME_IMPLEMENTATION.md`.

---

## Testing

| Layer | Location / tool |
|-------|------------------|
| Unit / integration | Vitest + Testing Library; colocated `__tests__` next to components or under `contexts/__tests__/`. |
| E2E | Playwright; specs under `front-end/e2e/` (see README for running against API + MongoDB). |

Tests rely on `src/test/setup.ts` for a consistent DOM and storage baseline.

---

## Configuration files (front-end root)

- **`vite.config.ts`** — React plugin, dev/build.
- **`postcss.config.js`** — Tailwind pipeline.
- **`playwright.config.ts`** — E2E browser and webServer hooks.
- **`eslint.config.js`** — Lint rules for TS/TSX.

---

## When to update this document

Update **`docs/ARCHITECTURE.md`** when you change any of the following (ideally in the same change as the code):

- Provider tree or order in `App.tsx`
- Public vs protected routes or layout nesting
- New global context or a split between context file and provider file
- New top-level `services/api.ts` namespace or a significant socket contract change
- New first-class `src/` area (e.g. new folder with a defined role)

Cosmetic or single-component changes that do not alter boundaries above do not require an update.
