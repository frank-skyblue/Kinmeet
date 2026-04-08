# Contributor onboarding

This document is the **first read for new engineers**: tech stack, hosting, how we work, and what CI expects. For product features, prerequisites, full `.env` examples, and how to run the apps locally, see the [README](README.md).

---

## Tech stack

### Backend (`back-end/`)

Node.js, Express, TypeScript, MongoDB with Mongoose, JWT (bcryptjs), Zod, Socket.io, Cloudinary, Multer.

### Frontend (`front-end/`)

React 19, TypeScript, Vite, React Router, Tailwind CSS, Axios, Socket.io client.

### Testing

- **Backend:** Vitest, Supertest, `mongodb-memory-server` (see `back-end/src/__tests__/`).
- **Frontend:** Vitest, Testing Library (see `front-end/src/**/__tests__/`).
- **E2E:** Playwright in `front-end/` (see `front-end/playwright.config.ts`).

---

## Hosted services

| Area | Service |
|------|---------|
| Frontend | **Vercel** |
| Backend API | **Render** |
| Images | **Cloudinary** |
| Database (production) | **MongoDB Atlas** |

Production URLs, dashboards, and shared credentials are team-internal. Do not put real secrets in this repo or in public channels.

---

## Local development environment

### Node and repo layout

- Use **Node.js 22**, matching [`.nvmrc`](.nvmrc) and [CI](.github/workflows/ci.yml). With [nvm](https://github.com/nvm-sh/nvm): from the repo root run `nvm install` (once) and `nvm use`, then confirm `node -v` is `v22.x.x`.
- The monorepo has two npm packages: **`back-end/`** and **`front-end/`**. Install dependencies in **each** directory (see [Dependencies](#dependencies-npm-ci-vs-npm-install) below).

### Environment variables

- Add **`back-end/.env`** and (if needed) **`front-end/.env`**. **Never commit `.env` files.**
- For **shared or sensitive values** (MongoDB Atlas URI, Cloudinary keys, JWT secret, deployment-related URLs), **ask your team lead** or use whatever secret store the team uses. Do not paste production secrets into chat or documentation.
- Variable names and example placeholders are in the [README](README.md) (Getting Started / back-end and front-end setup).

### Local MongoDB with Docker

If you prefer not to install MongoDB on the host or use Atlas for local dev, you can run **MongoDB 7** in Docker (same major version as the Mongo service in [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)).

1. Install and start [Docker](https://docs.docker.com/get-docker/).
2. Start a container:

   ```bash
   docker run -d --name kinmeet-mongo -p 27017:27017 mongo:7
   ```

3. In **`back-end/.env`**, set:

   ```env
   MONGODB_URI=mongodb://localhost:27017/kinmeet
   ```

4. **Lifecycle:** `docker stop kinmeet-mongo` / `docker start kinmeet-mongo`. To remove the container (data in the container is lost unless you use a volume): `docker rm -f kinmeet-mongo`.

For a native MongoDB install or Atlas, follow the [README](README.md).

---

## Testing and CI/CD

### GitHub Actions

- **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** runs on **pull requests** and **pushes to `main`**. It runs **backend** and **frontend** jobs in parallel: `npm ci`, `npx tsc --noEmit`, `npm test`, and on the frontend **`npm run build`**.
- **[`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)** runs **Playwright** E2E with a **MongoDB service container** on **PRs into `main`**, on **push to `main`**, and on any extra push branches listed there. Add **E2E / e2e-tests** as a **required status check** on `main` if merges should wait until E2E passes.

### What we expect from you

- Add or update **unit tests for API routes/endpoints** when you change backend HTTP behavior.
- Add or update **frontend unit tests** for components (or flows) when the behavior is non-trivial or easy to regress.
- Follow existing patterns under `back-end/src/__tests__/` and `front-end/src/**/__tests__/`.

### Useful local commands

| Location | Command |
|----------|---------|
| `back-end/` | `npm test`, `npm run test:watch` |
| `front-end/` | `npm test`, `npm run test:watch` |
| `front-end/` (E2E) | `npx playwright test` (see Playwright docs and `playwright.config.ts` for env needs) |

---

## Development flow

1. Create a branch from **`main`** (use your team’s naming convention if you have one, e.g. `feat/…`, `fix/…`).
2. Implement your change; **run tests and typecheck locally** before opening a PR.
3. Open a **pull request**, get **code review**, and ensure **CI is green**.
4. After approval, merge into **`main`**. In normal process, **failing CI blocks merging**.

---

## Dependencies: `npm ci` vs `npm install`

- When you **clone** the repo or **pull changes that did not touch dependencies**, prefer **`npm ci`** in **`back-end/`** and **`front-end/`**. That installs exactly what is in each **`package-lock.json`**, matching CI and avoiding surprise lockfile edits.
- When you **add, upgrade, or remove** packages, use **`npm install`** (or `npm install <package>`), then commit **`package.json`** and **`package-lock.json`** together in the same change.
- Use the same **Node 22** (and a recent npm) as CI to reduce unnecessary lockfile churn.

---

## Security hygiene

- Do not commit secrets. If something was committed by mistake, tell the team lead and **rotate** affected credentials.
- Share `.env` content only through approved team channels.

## Repository layout

- **`back-end/`** — API server.
- **`front-end/`** — Vite + React SPA.

If you use Cursor, architecture notes for AI and humans live under [`.cursor/rules/`](.cursor/rules/).

## Before you open a PR

- `npm test` in both `back-end/` and `front-end/`.
- `npx tsc --noEmit` in both packages (CI runs this too).

## Getting unstuck

Questions about access, env values, or process: **ask your team lead** or use your team’s usual chat channel.
