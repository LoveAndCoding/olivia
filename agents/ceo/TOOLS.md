# Tools -- CEO Toolchain

## Paperclip API

Primary coordination layer. All issue management, agent management, and workflow orchestration goes through this.

| Endpoint pattern | Usage |
|---|---|
| `GET /api/agents/me` | Identity check on every heartbeat |
| `GET /api/agents/me/inbox-lite` | Compact assignment inbox — preferred over full issue list |
| `POST /api/issues/:id/checkout` | Lock a task before working. Always include `X-Paperclip-Run-Id`. |
| `GET /api/issues/:id/heartbeat-context` | Compact context with ancestors, goal, comment cursor |
| `PATCH /api/issues/:id` | Status updates, reassignment, comments |
| `POST /api/companies/:id/issues` | Create subtasks. Always set `parentId` and `goalId`. |
| `GET /api/issues/:id/comments` | Read comment threads for context |
| `PUT /api/issues/:id/documents/:key` | Create/update plan documents on issues |
| `GET /api/companies/:id/dashboard` | Company-wide status overview |

## Paperclip Skills

| Skill | When to use |
|---|---|
| `paperclip` | All issue coordination — assignments, checkout, status, comments, delegation |
| `paperclip-create-agent` | Hiring new agents with governance-aware workflow |
| `para-memory-files` | Memory operations — daily notes, entity files, recall, weekly synthesis |
| `olivia-spec` | Drafting feature specs |
| `olivia-review` | Reviewing documentation quality |
| `olivia-orient` | Session orientation at start of product work |
| `olivia-log` | Updating decision history and assumptions log |

## Git and GitHub

- **git** — commits, branching, cherry-picks. Follow conventional commit format. Always add `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- **gh** (GitHub CLI) — PR creation and management. Release PRs target upstream (`LoveAndCoding/olivia`); feature work merges into `origin/main`.
- Feature branches merge into `origin/main` directly. PRs to upstream are releases only — batch changes and bump version first.

## File System

| Tool | Purpose |
|---|---|
| Read | Read files before editing. Read screenshots, PDFs, notebooks. |
| Edit | String-replacement edits to existing files. Preferred over Write for modifications. |
| Write | Create new files or full rewrites. |
| Glob | Find files by name pattern. Faster than Bash `find`. |
| Grep | Search file contents by regex. Faster than Bash `grep`/`rg`. |

## Agent Delegation

- Create subtasks assigned to reports (Founding Engineer, VP of Product, SRE, Designer).
- Always set `parentId` and `goalId` on subtasks.
- Use `@AgentName` mentions sparingly — they cost budget.
- Check subtask status when working on parent/tracking issues.

## Memory System

Three-layer PARA-based system at `$AGENT_HOME/memory/`:

- **Daily notes** (`YYYY-MM-DD.md`) — timeline of heartbeats, decisions, and context. Commit these as operational logs.
- **Entity files** — durable facts about projects, people, patterns.
- **MEMORY.md** — index of all memory files. Kept under 200 lines.

## Notes

- `inbox-lite` is faster and preferred over the full issues endpoint for normal heartbeat inbox checks.
- Feature branches merge to `origin/main`. Only release PRs go to upstream `LoveAndCoding/olivia`.
- Board prefers batched release PRs over many small ones — save their review time.
