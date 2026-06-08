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

Remote git fails in the **sandbox** with `Could not resolve hostname github.com`. The allowlist only helps when commands **start with** `git` or `gh` — not when prefixed with `cd`.

This repo includes:

| File                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `.cursor/permissions.json` | `terminalAllowlist`: `git`, `gh` — bypass sandbox      |
| `.cursor/sandbox.json`     | Allows `api.github.com` when `gh` runs sandboxed       |

**Cursor settings** (Settings → Agents):

1. **Run Mode**: **`Allowlist (with Sandbox)`** — allowlisted commands run outside the sandbox. Auto-review may still sandbox allowlisted commands.
2. **Auto-Run network access**: `sandbox.json + Defaults` (or `Allow All`).
3. **`gh auth login`** done in your normal terminal.

Never use `required_permissions: ["all"]`.

### Agent git rules (critical)

**Command must start with `git` or `gh`.** Cursor matches the allowlist on the command prefix only.

| Bad (sandboxed — DNS fails) | Good (allowlisted — works) |
| --------------------------- | -------------------------- |
| `cd /path && git fetch origin` | `git fetch origin` with `working_directory: /home/frank/Documents/Projects/Kinmeet` |
| `cd /path && gh pr create ...` | `gh pr create ...` with `working_directory` set |

Rules:

1. Set `working_directory` to the repo root (`/home/frank/Documents/Projects/Kinmeet`). Never prefix git/gh with `cd ... &&`.
2. Run each git/gh command as its own shell invocation starting with `git` or `gh`.
3. Pass `required_permissions: ["git_write", "full_network"]` on remote git/gh calls if prompted.
4. If remote git/gh still fails, **stop** — do not continue on stale `main`. Use **Manual fallback** below.
5. Local git (`status`, `diff`, `log`, `checkout`, `switch -c`, `add`, `commit`): `git_write` when needed; command still must start with `git`.

### Manual fallback

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

Before each MCP call, read the tool schema from the connected `todoist` server if argument shape is unclear.

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

1. `git fetch origin` — then `git checkout <baseBranch>` — then `git pull origin <baseBranch>` (separate calls or one command starting with `git`: `git fetch origin && git checkout <baseBranch> && git pull origin <baseBranch>`).
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

1. `git push -u origin HEAD`
2. `gh pr create` with a body that includes:
   - **Summary** and **Test plan** (checkboxes)
   - **Todoist task id**
   - **Video demo** (when E2E ran) — embed the Cloudinary URL on its own line so GitHub renders a player:
     ```markdown
     ## Video demo

     https://res.cloudinary.com/<cloud>/video/upload/.../e2e-demo.webm

     _E2E spec: `e2e/chat.spec.ts`_
     ```
3. Return the PR URL. If push/gh fails, use **Manual fallback** (include the video URL in the body text you give the user).

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

## Example user prompts

- "Work the next Todoist ticket"
- "Pick up the next task from Ready for dev"
- "Run the Todoist dev flow"
