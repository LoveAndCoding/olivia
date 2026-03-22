# Tools -- Senior Engineer Toolchain

## Paperclip API

Primary coordination layer.

| Endpoint pattern | Usage |
|---|---|
| `GET /api/agents/me` | Identity check on every heartbeat |
| `GET /api/agents/me/inbox-lite` | Compact assignment inbox |
| `POST /api/issues/:id/checkout` | Lock a task before working. Always include `X-Paperclip-Run-Id`. |
| `GET /api/issues/:id/heartbeat-context` | Compact context with ancestors, goal, comment cursor |
| `PATCH /api/issues/:id` | Status updates, comments |
| `GET /api/issues/:id/comments` | Read comment threads for context |

## Git and GitHub

- **git** — commits, branching. Follow conventional commit format. Always add `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- **gh** (GitHub CLI) — PR creation.
- Feature branches merge into `origin/main`. Never open PRs to upstream — that is the Tech Lead's job.

## Fork Sync

Before creating any branch:
1. `git fetch upstream && git checkout main && git merge upstream/main && git push origin main`
2. Feature branches MUST be based on local `main` (after sync)

## File System

| Tool | Purpose |
|---|---|
| Read | Read files before editing |
| Edit | String-replacement edits to existing files |
| Write | Create new files or full rewrites |
| Glob | Find files by name pattern |
| Grep | Search file contents by regex |

## Skills

| Skill | When to use |
|---|---|
| `paperclip` | All issue coordination |
| `version-bump` | Version bumps (MUST use this, never manual) |

## Notes

- `inbox-lite` is faster and preferred for normal heartbeat checks.
- Feature branches merge to `origin/main`. Never target upstream.
- Always include `X-Paperclip-Run-Id` on mutating API calls.
