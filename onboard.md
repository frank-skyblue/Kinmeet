# Contributor onboarding

Your **first read** for working on Kinmeet: environment, how to run things, CI expectations, and seed data for local demos. Product overview, full `.env` examples, and feature-level docs live in the [README](README.md).

---

## First day checklist

1. **Node 22** — from the repo root: `nvm install` (once) and `nvm use` (see [`.nvmrc`](.nvmrc)).
2. **Dependencies** — in both `back-end/` and `front-end/`: `npm ci` (see [Dependencies](#dependencies-npm-ci-vs-npm-install)).
3. **Env files** — create `back-end/.env` (and `front-end/.env` if needed). Never commit them. Ask your lead for shared secrets (Atlas, Cloudinary, JWT, etc.).
4. **MongoDB** — local install, [Docker](#local-mongodb-with-docker), or Atlas; `MONGODB_URI` must match where Mongo is listening.
5. **Run the stack** — [Run the app locally](#run-the-app-locally).
6. **Optional seed data** — [Seed users](#seed-users-demo-data) so you can log in with fixed accounts and exercise connections, chat, requests, and blocks.

---

## Run the app locally

Use **two terminals** from the repo root (after `back-end/.env` and `front-end/.env` exist as needed):

| Terminal | Directory   | Command        | URL                     |
|----------|-------------|----------------|-------------------------|
| 1        | `back-end/` | `npm run dev`  | API `http://localhost:8080` |
| 2        | `front-end/` | `npm run dev` | App `http://localhost:5173` |

The front-end expects the API (see `VITE_API_URL` in the README — typically `http://localhost:8080/api`).

---

## Seed users (demo data)

The script [`back-end/src/scripts/seedUsers.ts`](back-end/src/scripts/seedUsers.ts) creates **10 fictional Argentine–Canadian profiles**, a small **connection graph**, **pending connection requests**, **mock chat messages**, and a few **blocks** — useful for UI work without clicking through signup for every scenario.

### How to run it

From `back-end/` (loads `MONGODB_URI` / `MONGO_URL` from your environment; same `.env` as the API):

```bash
cd back-end
npm run seed
```

- **`npm run seed`** — Upserts users by email, then adds missing connections, requests, messages, and blocks. Safe to re-run on a dev DB; it skips work that is already present.
- **`npm run seed:reset`** — **Drops the entire MongoDB database** named in your connection string, then seeds from scratch. Use only on a **throwaway local** database. Never point this at production or a shared Atlas cluster.

In **VS Code**, you can also use **Run and Debug → “Seed Users”** (see [`.vscode/launch.json`](.vscode/launch.json)); that configuration uses `--reset` and loads `back-end/.env`.

### Log in (all accounts)

**Password for every seed user:** `Password123`

| # | First name | Email |
|---|------------|-------|
| 0 | Lucia | lucia.martinez@example.com |
| 1 | Mateo | mateo.gomez@example.com |
| 2 | Valentina | valentina.lopez@example.com |
| 3 | Santiago | santiago.fernandez@example.com |
| 4 | Camila | camila.ruiz@example.com |
| 5 | Nicolas | nicolas.silva@example.com |
| 6 | Sofia | sofia.moreno@example.com |
| 7 | Joaquin | joaquin.garcia@example.com |
| 8 | Martina | martina.aguirre@example.com |
| 9 | Tomas | tomas.perez@example.com |

### What gets created (summary)

- **Connections** — Lucia (#0) is the **hub**: she is connected to all nine others. **Tomas** (#9) is also connected to Mateo, Valentina, and Santiago (#1–3), so Tomas ends up with **four** connections. Several others only connect to Lucia (good for testing “single connection” UX).
- **Pending incoming requests** — Varied counts per user (targets are defined in the script). The algorithm picks eligible senders in a deterministic way; details are in the file header comment in `seedUsers.ts`.
- **Messages** — Short mock threads between pairs that are connected **before** blocks run (e.g. Lucia ↔ Mateo, Santiago ↔ Tomas).
- **Blocks** — Three blocks, including **Mateo blocking Tomas**, which removes their mutual connection and any requests between them (same behavior as the real block API).

For the **exact** edge list, request targets, block list, and message threads, read the **large reference comment at the top of** `seedUsers.ts` — it stays in sync with the constants in that file.

---

## Tech stack

| Area | Stack |
|------|--------|
| **Backend** (`back-end/`) | Node.js, Express, TypeScript, MongoDB + Mongoose, JWT (bcryptjs), Zod, Socket.io, Cloudinary, Multer |
| **Frontend** (`front-end/`) | React 19, TypeScript, Vite, React Router, Tailwind CSS, Axios, Socket.io client |
| **Backend tests** | Vitest, Supertest, `mongodb-memory-server` — `back-end/src/__tests__/` |
| **Frontend tests** | Vitest, Testing Library — `front-end/src/**/__tests__/` |
| **E2E** | Playwright — `front-end/playwright.config.ts` |

---

## Hosted services (high level)

| Concern | Typical hosting |
|---------|-----------------|
| Frontend | Vercel |
| Backend API | Render |
| Images | Cloudinary |
| Production DB | MongoDB Atlas |

URLs, dashboards, and credentials are **team-internal**. Do not commit real secrets or paste them into public channels.

---

## Environment variables

- **`back-end/.env`** and optionally **`front-end/.env`** — required names and example placeholders are in the [README](README.md) (Getting Started).
- **Secrets** (Atlas URI, Cloudinary, JWT, etc.) — get them from your team lead or approved secret store.

---

## Local MongoDB with Docker

If you do not want MongoDB installed on the host:

1. Install [Docker](https://docs.docker.com/get-docker/).
2. Start MongoDB 7 (aligned with CI’s Mongo image):

   ```bash
   docker run -d --name kinmeet-mongo -p 27017:27017 mongo:7
   ```

3. In `back-end/.env`:

   ```env
   MONGODB_URI=mongodb://localhost:27017/kinmeet
   ```

4. **Lifecycle:** `docker stop kinmeet-mongo` / `docker start kinmeet-mongo`. Remove with `docker rm -f kinmeet-mongo` (data inside the container is lost unless you use a volume).

Native MongoDB or Atlas: see the [README](README.md).

---

## Where things live in the repo

| Path | Purpose |
|------|---------|
| `back-end/` | REST API + Socket.io server |
| `front-end/` | Vite + React SPA |
| `.cursor/rules/` | Architecture and conventions for humans and AI assistants |
| `front-end/docs/ARCHITECTURE.md` | Frontend system map (update when you change routing, providers, or `services/api.ts` organization) |

---

## Testing and CI

### GitHub Actions

- **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** — On PRs and pushes to `main`: `npm ci`, `npx tsc --noEmit`, `npm test`, and on the frontend **`npm run build`** (backend and frontend jobs run in parallel).
- **[`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)** — Playwright with a **MongoDB service container** on PRs to `main`, push to `main`, and any extra branches listed there. Consider requiring **E2E / e2e-tests** on `main` before merge.

### What we expect when you change code

- **Backend** — Add or update route/service tests when HTTP behavior changes (`back-end/src/__tests__/`).
- **Frontend** — Add or update tests when UI behavior is non-trivial or easy to regress (`front-end/src/**/__tests__/`).

### Commands

| Location | Command |
|----------|---------|
| `back-end/` | `npm test`, `npm run test:watch` |
| `front-end/` | `npm test`, `npm run test:watch` |
| `front-end/` (E2E) | `npx playwright test` — needs Mongo on `localhost:27017` for local runs; see `playwright.config.ts` |

Backend unit tests use an **in-memory MongoDB** — no running database required for `npm test` in `back-end/`.

---

## Development flow

1. Branch from **`main`** (use your team’s naming convention: `feat/…`, `fix/…`, etc.).
2. Implement, then run **tests and typecheck** locally before opening a PR.
3. Open a **pull request**, get **review**, and keep **CI green**.
4. Merge to **`main`** after approval — failing CI should block merges.

---

## Dependencies: `npm ci` vs `npm install`

- After **clone** or when **lockfiles did not change**, prefer **`npm ci`** in **`back-end/`** and **`front-end/`** so installs match `package-lock.json` and CI.
- When you **add, upgrade, or remove** packages, use **`npm install`**, then commit **`package.json`** and **`package-lock.json`** together.
- Use **Node 22** (see `.nvmrc`) to avoid noisy lockfile churn.

---

## Security hygiene

- Do not commit secrets. If something leaked, tell your lead and **rotate** affected credentials.
- Share `.env` values only through approved channels.

---

## Before you open a PR

- `npm test` in **`back-end/`** and **`front-end/`**.
- `npx tsc --noEmit` in **both** packages (CI runs this too).

---

## Getting unstuck

Access, env values, or process questions: ask your **team lead** or use your team’s usual chat channel.
