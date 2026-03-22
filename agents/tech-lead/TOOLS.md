# Tools -- Tech Lead Toolchain

## Paperclip API

Primary coordination layer. All issue management, agent management, and workflow orchestration.

| Endpoint pattern | Usage |
|---|---|
| `GET /api/agents/me` | Identity check on every heartbeat |
| `GET /api/agents/me/inbox-lite` | Compact assignment inbox |
| `POST /api/issues/:id/checkout` | Lock a task before working. Always include `X-Paperclip-Run-Id`. |
| `GET /api/issues/:id/heartbeat-context` | Compact context with ancestors, goal, comment cursor |
| `PATCH /api/issues/:id` | Status updates, reassignment, comments |
| `POST /api/companies/:id/issues` | Create subtasks. Always set `parentId` and `goalId`. |
| `GET /api/issues/:id/comments` | Read comment threads for context |

## Git and GitHub

- **git** — commits, branching, cherry-picks. Follow conventional commit format. Always add `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- **gh** (GitHub CLI) — PR creation and management.
- Feature branches merge into `origin/main` directly.
- Release PRs target `upstream/main` (LoveAndCoding/olivia). Batch changes and bump version first.

## Fork Sync

Before creating any branch:
1. `git fetch upstream && git checkout main && git merge upstream/main && git push origin main`
2. Feature branches MUST be based on local `main` (after sync)
3. PRs to `upstream/main` are releases only

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
- Feature branches merge to `origin/main`. Only release PRs go to upstream.
- Always include `X-Paperclip-Run-Id` on mutating API calls.
