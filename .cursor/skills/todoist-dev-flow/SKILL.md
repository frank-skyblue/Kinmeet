---
name: todoist-dev-flow
description: >-
  Pick up the next Todoist task from a configured project section, implement it
  in this repo, open a GitHub PR, and update the task in Todoist. Use when the
  user asks to work a Todoist ticket, run the dev flow, or process tasks from
  Todoist.
---

# Todoist Dev Flow (Kinmeet)

Manual workflow: fetch the next task from a Todoist section → implement → PR → update Todoist.

## Prerequisites

- Todoist MCP enabled in `.cursor/mcp.json` (OAuth on first tool use).
- `gh` authenticated (`gh auth login`).
- Config at `.cursor/todoist-dev.config.json`.
- **UI tasks:** MongoDB running locally; `CLOUDINARY_*` in `back-end/.env` for E2E video upload to PR.

## Git setup (required once)

Remote git over SSH fails in the **sandbox** with `Could not resolve hostname github.com`. Even with `git` on the allowlist, Cursor still sandboxes some subcommands (`pull`, `push`, and any command string that contains them). Chaining with `&&` does not fix this — the whole invocation is sandboxed when `pull`/`push` is present.

This repo includes:

| File                       | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `.cursor/permissions.json` | Restricted `terminalAllowlist` + `mcpAllowlist` for this workflow only  |
| `.cursor/sandbox.json`     | Extra GitHub domains when a command still runs sandboxed                |

**GitHub guardrail:** branch protection on `main` blocks direct pushes. The agent must use feature branches + PRs only.

**Cursor settings** (Settings → Agents):

1. **Run Mode**: **`Allowlist`** (recommended). Plain Allowlist runs allowlisted commands outside the sandbox (needed for `git push` / `gh`).
2. **Auto-Run network access**: `sandbox.json + Defaults` (or `Allow All`) if using Allowlist (with Sandbox) instead.
3. **`gh auth login`** done in your normal terminal.

Never use `required_permissions: ["all"]`. Do not rely on `required_permissions: ["full_network"]` to bypass the sandbox — it often still runs sandboxed.

### Allowlisted commands (must match prefix)

Cursor uses **prefix matching** on the full command string. Only these shapes auto-run; anything else prompts for approval. Keep commands aligned with `.cursor/permissions.json`.

| Phase | Allowed command prefix | Example |
| ----- | ---------------------- | ------- |
| Sync base | `git fetch origin` | `git fetch origin` |
| Sync base | `git checkout main` | `git checkout main` |
| Sync base | `git merge origin/` | `git merge origin/main` |
| Branch | `git switch -c todoist/` | `git switch -c todoist/6gXp9cmj8P8V5rpJ-fe-020-slug` |
| Local | `git status`, `git diff`, `git log` | `git status -sb` |
| Commit | `git add`, `git commit` | `git add front-end/src/...` |
| PR | `git push -u origin HEAD` | exactly this push shape — not `git push origin main` |
| PR | `gh pr create` | `gh pr create --title "..." --body "..."` |
| Tests | `npm test -- --run` | Vitest in `front-end` or `back-end` |
| E2E | `npm:run e2e*` / `npm run e2e` | Playwright in `front-end` |
| Video | `npm run upload-e2e-video` | Cloudinary upload in `back-end` |

**Not allowlisted (will prompt or fail):** `git pull`, `git push origin main`, `git push --force`, `git reset`, `gh pr merge`, bare `git` / `gh`, `npm install`, etc.

If `baseBranch` in config ever changes from `main`, update `git checkout main` in `.cursor/permissions.json` to match.

### Agent git rules (critical)

**Command must match an allowlist prefix.** Cursor does not allowlist bare `git` or `gh`. Never prefix with `cd ... &&`.

| Agent behavior (observed) | Command |
| ------------------------- | ------- |
| Usually outside sandbox | `git fetch origin`, `git checkout main`, `git merge origin/main` |
| Sandboxed — SSH/DNS fails | `git pull …`, `git push …`, chains that include `pull` or `push` |
| Sandboxed — may fail on `.cursor/` | `git merge origin/main` when origin changed `.cursor/` files |

| Bad (sandboxed or prefix mismatch) | Good |
| ------------------------------------ | ---- |
| `cd /path && git fetch origin` | `git fetch origin` with `working_directory: /home/frank/Documents/Projects/Kinmeet` |
| `git fetch origin && git checkout main && git pull origin main` | Three separate calls: `git fetch origin`, then `git checkout main`, then `git merge origin/<baseBranch>` |
| `cd /path && gh pr create ...` | `gh pr create ...` with `working_directory` set |

Rules:

1. Set `working_directory` to the repo root (`/home/frank/Documents/Projects/Kinmeet`). Never prefix git/gh with `cd ... &&`.
2. Run each git/gh command as its **own** shell invocation starting with `git` or `gh`. Never chain `pull` or `push` with `&&`.
3. To update the base branch, use **`fetch` → `checkout` → `merge`** — not `git pull`.
4. Push only with **`git push -u origin HEAD`** on a `todoist/` feature branch — never push to `main` / `<baseBranch>`. **Never** append `--force` or any ref other than `HEAD`.
5. **Before every push**, run pre-push verification (below). If any check fails, **stop** — do not push.
6. If push or `gh pr create` still fails after verification, **stop** — do not continue on stale `main`. Use **Manual fallback** below.
7. Local git (`status`, `diff`, `log`, `add`, `commit`): use only the allowlisted prefixes above.

### Pre-push verification (required)

Run **before** `git push -u origin HEAD`. Use separate allowlisted calls (`git status -sb`, `git log -1 --oneline`, `git diff …`).

1. **Branch name** — from `git status -sb`, current branch must match `todoist/<task-id>-*` for the task being worked (from step 3 / branch created in step 4). Examples: OK `## todoist/6gXp9cmj8P8V5rpJ-fe-020-slug...`; **stop** on `main`, `master`, or any non-`todoist/` branch.
2. **Not base branch** — branch must not equal `<baseBranch>` from config (usually `main`).
3. **Commit present** — `git log origin/<baseBranch>..HEAD --oneline` shows at least one commit for this task (or report if only uncommitted changes remain and commit first).
4. **No secrets in diff** — skim `git diff origin/<baseBranch>...HEAD --stat` (and spot-check suspicious paths). **Stop** if `.env`, credentials, or `test-results/` / video binaries would be pushed.
5. **Push command** — use exactly `git push -u origin HEAD` with no extra flags.

If any check fails, tell the user what failed and do not push. Fix or use **Manual fallback**.

### Manual fallback

When the agent cannot reach GitHub, give the user these commands for **their normal terminal** (chained commands are fine there):

```bash
cd /home/frank/Documents/Projects/Kinmeet
git fetch origin && git checkout main && git pull origin main
git push -u origin HEAD
gh pr create --title "<title>" --body "<body>"
```

## Monorepo layout (critical)

There is **no `package.json` at the repo root**. `npm` commands run from `/home/frank/Documents/Projects/Kinmeet` will fail with `ENOENT`.

| Package | Path | Use for |
| ------- | ---- | ------- |
| Frontend | `/home/frank/Documents/Projects/Kinmeet/front-end` | React UI, Vitest, Playwright |
| Backend | `/home/frank/Documents/Projects/Kinmeet/back-end` | API, backend Vitest, E2E video upload |

**Always set `working_directory` to the package folder.** Never run `cd front-end && npm ...` — use `working_directory` instead (same rule as git).

### npm examples

| Bad (repo root) | Good |
| --------------- | ---- |
| `npm test -- --run src/components/chat/__tests__/Chat.test.tsx` at repo root | `npm test -- --run src/components/chat/__tests__/Chat.test.tsx` with `working_directory: .../front-end` |
| `npm run e2e` at repo root | `npm run e2e -- e2e/chat.spec.ts --project=chromium` with `working_directory: .../front-end` |
| `npm run upload-e2e-video` at repo root | same command with `working_directory: .../back-end` |

Git/gh commands still use repo root as `working_directory`.

## Config

Read `.cursor/todoist-dev.config.json` before starting.

| Key                   | Purpose                                 |
| --------------------- | --------------------------------------- |
| `projectId`           | Todoist project id                      |
| `readySectionId`      | Section id for tasks ready to implement |
| `inProgressSectionId` | Section id when work starts             |
| `inReviewSectionId`   | Section id after PR is opened           |
| `baseBranch`          | Branch to create feature branches from  |
| `githubRepo`          | `owner/repo` for PR creation            |
| `maxTasksPerRun`      | Usually `1` for manual runs             |
| `e2e`                 | Playwright paths, specs map, upload cmd |

`*Name` fields in the config are labels for humans only — the agent uses ids.

### E2e config (`e2e` object)

| Key | Purpose |
| --- | --- |
| `workingDirectory` | Run Playwright from `front-end` |
| `defaultProject` | Usually `chromium` |
| `specsByArea` | Map feature area → spec file (pick the closest match) |
| `videoUploadCommand` | Upload latest `.webm` to Cloudinary (requires `back-end/.env` Cloudinary vars) |
| `videoUploadWorkingDirectory` | Run upload from `back-end` |

## Todoist MCP tools

Server: `todoist` (configured in `.cursor/mcp.json`). Tool schemas live in Cursor's MCP catalog when the server is connected.

**This flow uses only these tools:**

| Tool            | When                  | Key args                                                                        |
| --------------- | --------------------- | ------------------------------------------------------------------------------- |
| `find-tasks`    | Pick next task        | `projectId`, `sectionId` (= `readySectionId`), optional `limit`                 |
| `find-comments` | Load task spec        | `taskId`; paginate with `cursor` if needed                                      |
| `fetch-object`  | Optional detail       | `id` (= task id) when description/comments need full fetch                      |
| `update-tasks`  | Move between sections | `tasks: [{ id, sectionId }]` — use `inProgressSectionId` or `inReviewSectionId` |
| `add-comments`  | Status updates        | `comments: [{ taskId, content }]` — work started, PR link, blocked notes        |

Before each MCP call, read the tool schema from the connected `todoist` server if argument shape is unclear. Only the five Todoist tools listed above are on `mcpAllowlist`; other MCP tools require approval.

## Execution steps

### 1. Discover and select the next task

1. Call `find-tasks` with `projectId` and `readySectionId` from config (incomplete only).
2. If no tasks: report empty queue and stop.
3. If multiple tasks: pick one by priority (P1 first), then earliest due date, then oldest created.
4. **Gather full task context** (required — see below) before confirming or coding.
5. Present the chosen task (title, description, comment summary, id) and confirm with the user before coding unless they said to proceed automatically.

### 2. Gather task context (required)

Always load comments for the selected task **before** marking it in progress or writing code. Comments often hold acceptance criteria, links, and decisions that are not in the description.

1. Call `find-comments` for the task id (or `fetch-object` if needed for full detail).
2. Read **every** comment in chronological order — do not skip the comment thread.
3. Treat title + description + **all comments** as the implementation spec. If comments contradict the description, prefer the most recent comment and ask the user if unclear.
4. Summarize relevant comment context when presenting the task to the user (key requirements, links, constraints).
5. Re-fetch comments if the user adds new ones mid-session before continuing implementation.

### 3. Mark task in progress

1. Move the task to `inProgressSectionId` via `update-tasks`.
2. Add a comment: branch name you will use and that work has started.

### 4. Implement

Repo root: `/home/frank/Documents/Projects/Kinmeet`. Every git command must **start with `git`** (use `working_directory`, never `cd && git`).

1. Update base branch — **three separate shell calls** (never `git pull`; never chain with `&&`):
   - `git fetch origin`
   - `git checkout <baseBranch>`
   - `git merge origin/<baseBranch>`
2. `git switch -c todoist/<task-id>-<short-slug>` (slug from title, lowercase, hyphens, max ~40 chars).
3. Implement from the full spec gathered in step 2 (title, description, and comments).
4. Follow repo rules in `.cursor/rules/` (backend/frontend architecture, tests for changed features).
5. **Tests** (see **E2E video demo** below when the task touches UI):
   - **Frontend unit:** `npm test -- --run <path-to-test>` with `working_directory: /home/frank/Documents/Projects/Kinmeet/front-end`.
   - **Backend unit:** `npm test -- --run <path>` with `working_directory: /home/frank/Documents/Projects/Kinmeet/back-end`.
   - **UI/user flows:** Playwright E2E with video (see below).
6. `git add` + `git commit` (message body references the Todoist task id). Do not commit `test-results/`, `playwright-report/`, or video files.

### E2E video demo (UI tasks)

Required when the task changes visible UI or user flows (pages, components, navigation, chat, etc.). Skip for backend-only or non-visual changes.

Playwright is configured with `video: 'on'` in `front-end/playwright.config.ts`. Videos are saved as `.webm` under `front-end/test-results/`.

1. **Pick a spec** from `e2e.specsByArea` in config (e.g. chat task → `e2e/chat.spec.ts`). Add or extend the spec if the flow is not covered.
2. **Run E2E** from `e2e.workingDirectory` — command must start with `npm`:
   ```bash
   npm run e2e -- e2e/chat.spec.ts --project=chromium
   ```
   Use `working_directory: /home/frank/Documents/Projects/Kinmeet/front-end`. MongoDB must be running locally (`mongodb://localhost:27017`).
3. **Confirm tests pass.** Do not open a PR if E2E fails.
4. **Upload the video** from `e2e.videoUploadWorkingDirectory` — requires real `CLOUDINARY_*` in `back-end/.env`:
   ```bash
   npm run upload-e2e-video -- --latest todoist-<task-id>
   ```
   Capture the HTTPS URL printed to stdout. If upload fails (missing env), note in the PR that video upload was skipped and attach the local path for manual upload.
5. **Keep the video URL** for the PR body (step 5).

### 5. Open PR

Commands must start with `git` or `gh`; set `working_directory` to repo root.

1. Run **Pre-push verification** (see above). Abort if not on `todoist/<task-id>-*`.
2. `git push -u origin HEAD` (only this push form — no `--force`; never `git push origin main`)
3. `gh pr create` with a body that includes:
   - **Summary** and **Test plan** (checkboxes)
   - **Todoist task id**
   - **Video demo** (when E2E ran) — embed the Cloudinary URL on its own line so GitHub renders a player:
     ```markdown
     ## Video demo

     https://res.cloudinary.com/<cloud>/video/upload/.../e2e-demo.webm

     _E2E spec: `e2e/chat.spec.ts`_
     ```
4. Return the PR URL. If push/gh fails, use **Manual fallback** (include the video URL in the body text you give the user).

### 6. Update Todoist

1. Add comment via `add-comments` with the PR URL.
2. Move task to `inReviewSectionId` via `update-tasks`.
3. Do **not** complete the task — the user merges the PR and completes it manually.

## Task writing conventions (for humans)

Write Todoist tasks so the agent can implement without guessing:

- **Title**: imperative, specific (e.g. "Add email verification resend button").
- **Description**: acceptance criteria, files/areas if known, edge cases.
- **Comments**: extra context, links, screenshots, or clarifications — the agent reads these on every run.
- **E2E hint**: for UI tasks, name the user flow or spec area (e.g. "chat", "auth") so the agent picks the right Playwright spec.
- **Section**: only put tasks in **AI (Ready for Dev)** when they are scoped and testable.

## Failure handling

- **Blocked / unclear spec**: comment on the task, move back to ready or leave in progress, ask the user.
- **Tests fail**: fix or stop; do not open a PR with failing tests.
- **E2E / MongoDB down**: start MongoDB locally or stop and tell the user; do not skip E2E for UI tasks without asking.
- **Video upload fails**: still open the PR; note the local `test-results/.../*.webm` path in the description and Todoist comment.
- **MCP auth error**: tell user to re-authenticate Todoist MCP in Cursor settings.
- **gh not authenticated**: run `gh auth login` guidance; stop before push.
- **`Could not read package.json` / ENOENT on npm**: command ran at repo root — re-run with `working_directory` set to `front-end` or `back-end` per **Monorepo layout**.
- **`Could not resolve hostname github.com` on git**: command was sandboxed — use fetch/checkout/merge instead of pull; split into separate invocations; if push/gh still fails, use **Manual fallback**.
- **Pre-push verification failed** (wrong branch, on `main`, secrets in diff, no commits): stop and report; never push until fixed.

## Example user prompts

- "Work the next Todoist ticket"
- "Pick up the next task from Ready for dev"
- "Run the Todoist dev flow"
