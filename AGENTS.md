# KinMeet — Agent Notes

## Cursor Cloud specific instructions

KinMeet is a two-package repo (`back-end/` API + `front-end/` React SPA). There is no root `package.json`; install and run each package independently.

### Node.js

- Use **Node 22** from `.nvmrc`: `nvm use 22` (or `nvm install` on first setup).
- CI pins **22.22.2**; any 22.x is fine locally.

### MongoDB (required for running the app, seed, and E2E)

- This VM has **mongodb-org 7** installed, but **systemd is not available** — start Mongo manually before the API or seed:

```bash
sudo -u mongodb mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017 --fork --logpath /var/log/mongodb/mongod.log
```

- Default URI: `mongodb://localhost:27017/kinmeet` (see `back-end/.env.example`).
- **Back-end unit tests** use `mongodb-memory-server` — no running Mongo needed for `npm test` in `back-end/`.

### Environment files

- Create `back-end/.env` from `back-end/.env.example` (required). `JWT_SECRET`, `MONGODB_URI`, and `CLOUDINARY_*` are validated at API startup; dummy Cloudinary values work for non-upload flows.
- Optional `front-end/.env` — defaults to `VITE_API_URL=http://localhost:8080/api` if unset.
- **Cloud agents:** prefer Dashboard → Cloud Agents → Secrets over committing `.env` files. Map the same variable names (`JWT_SECRET`, `MONGODB_URI`, `CLOUDINARY_*`).

### Running the stack (two terminals)

| Package | Directory | Command | URL |
|---------|-----------|---------|-----|
| API + Socket.io | `back-end/` | `npm run dev` | `http://localhost:8080` |
| React SPA | `front-end/` | `npm run dev` | `http://localhost:5173` |

Health check: `GET http://localhost:8080/` returns `{ status: "ok" }`.

### Demo data

From `back-end/`: `npm run seed` — creates fictional users; all share password **`Password123`** (e.g. `lucia.martinez@example.com`). See `onboard.md` for the full list.

### Lint / test / build

| Package | Lint | Typecheck | Unit tests | Production build |
|---------|------|-----------|------------|------------------|
| `back-end/` | — | `npx tsc --noEmit` | `npm test` | `npm run build` |
| `front-end/` | `npm run lint` | `npx tsc --noEmit` | `npm test` | `npm run build` |

### E2E (optional)

Requires Mongo on `localhost:27017`. From `front-end/`: `npx playwright install --with-deps chromium` (once), then `npx playwright test`. Playwright auto-starts both dev servers via `playwright.config.ts`.

### Todoist dev flow (cloud / automation)

- Config: `.cursor/todoist-dev.config.json`
- Skill: `.cursor/skills/todoist-dev-flow/SKILL.md`
- Use repo root as `working_directory` for git/gh; use `front-end/` or `back-end/` for npm.
- Todoist MCP must be configured in the Cursor dashboard (cursor.com/agents) for scheduled cloud runs.

### Gotchas

- Cloudinary env vars are **required at API boot** even if you are not uploading photos.
- Firebase / FCM (web push) is optional; omit or leave empty for local dev unless testing push.
- `npm run seed:reset` drops the entire DB named in `MONGODB_URI` — local throwaway DBs only.
