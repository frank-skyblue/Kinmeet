---
name: commit-note
description: >-
  Generate a paste-ready commit message from staged changes and the current
  branch name. Use when the user asks for a commit note, commit message,
  commit summary, staged-change summary, or changelog-style notes from
  current work.
---

# Commit Note

Produce a **commit message** ready to paste into git — not a wrapped report. Do not create a git commit unless the user explicitly asks.

## Workflow

1. **Inspect staged changes** — Run these in parallel:
   - `git branch --show-current`
   - `git diff --cached --stat`
   - `git diff --cached`

   Use `git status --short` only if you need to explain why nothing is staged.

2. **If nothing is staged** — Say so clearly. Offer to summarize unstaged changes or the full branch diff instead; wait for the user before switching scope.

3. **Base the message on evidence** — Describe only what the diffs show. Do not invent files, features, or behavior.

4. **Mixed concerns** — If staged changes span unrelated areas (e.g. feature + docs + config), either split into two paste-ready messages or call out that a split commit may be cleaner.

## Branch prefix and title

Parse `git branch --show-current`:

| Branch example | Prefix | Inferred title |
|---|---|---|
| `FE-034-move-community-guidelines-to-settings` | `FE-034` | Move Community Guidelines to Settings & Privacy > Community & Safety |
| `BE-012-add-password-reset-email` | `BE-012` | Add Password Reset Email |
| `FE-BE-008-auth-flow-refactor` | `FE-BE-008` | Auth Flow Refactor |

Rules:

- **Prefix:** ticket segment at the start — `FE-`, `BE-`, or `FE-BE-` plus digits (e.g. `FE-034`, `BE-012`, `FE-BE-034`).
- **Title:** from the slug after the prefix — kebab-case → Title Case; refine wording using the diff when the slug is vague.
- **No ticket prefix:** first line is title only (no `PREFIX:`).

## Output format

Reply with **only** the commit message — no headings, code fences, or “here’s your commit note” wrapper unless the user wants commentary.

```
{PREFIX}: {Title inferred from branch}

{One short paragraph: what changed and why.}

- {Imperative bullet}
- {Imperative bullet}
```

**Paragraph:** 2–4 sentences; explain intent and benefit, not a file dump.

**Bullets:**

- Imperative mood (“Add”, “Remove”, “Update”)
- One concrete change per bullet
- Wrap at ~72 characters when lines run long
- Mention `front-end`, `back-end`, tests, config, or docs when relevant
- Skip lockfile-only or formatting-only noise unless that is the whole change

## Git commands

Staged diff (primary):

```bash
git branch --show-current
git diff --cached --stat
git diff --cached
```

Context:

```bash
git status --short
```

Branch-wide context (only if the user asks or staged set is empty):

```bash
git log --oneline -5
git diff main...HEAD --stat
```

## Quality checks

Before responding, verify:

- [ ] First line uses branch prefix + inferred title (or title alone)
- [ ] Summary paragraph explains why, not just what
- [ ] Every bullet maps to something in the diff
- [ ] Output is paste-ready with no markdown wrapper
- [ ] No invented behavior or files
