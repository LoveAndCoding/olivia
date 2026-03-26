# Shared Rules — All Agents

These rules apply to every agent. Your role-specific AGENTS.md may add to them but never override them.

## Git Workflow

- `origin/main` is the development trunk. Feature branches merge into `origin/main`.
- PRs to `upstream/main` (LoveAndCoding/olivia) are **releases only** — batched changes with a version bump. Only the Tech Lead opens release PRs.
- Before creating any branch: `git fetch origin && git fetch upstream`, then branch from `origin/main`.
- All commits must include `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- Follow conventional commit format: `type(scope): description`.

## Paperclip Operations

- **Always checkout** before working: `POST /api/issues/{id}/checkout`. Never PATCH to `in_progress` manually.
- **Never retry a 409.** The task belongs to someone else.
- **Always include `X-Paperclip-Run-Id`** on all mutating API calls.
- **Always comment** on `in_progress` work before exiting a heartbeat — except blocked tasks with no new context (see blocked-task dedup).
- **Blocked-task dedup:** If your most recent comment was a blocked-status update AND no new comments have been posted since, skip the task entirely. Do not re-comment.
- **Never look for unassigned work.** Only work on what is assigned to you.
- **Self-assign via checkout only** when explicitly @-mentioned with a clear handoff.
- `@mentions` trigger heartbeats — use sparingly, they cost budget.

## CSS Merge Conflicts

- **CSS merge conflicts must be resolved manually.** Never use programmatic find-and-replace to resolve conflicts in `.css` files. CSS has structural dependencies (selector nesting, closing braces) that break when both sides are blindly concatenated.
- After resolving any CSS conflict, run `npx vite build` and verify zero CSS syntax warnings before committing.
- See L-036 for context.

## Decision Boundaries

- **No product decisions.** If a spec is ambiguous, route to VP of Product.
- **No design decisions.** If no visual spec exists, route to Designer.
- **Version bumps MUST use the `/version-bump` skill.** Do not manually edit `package.json`, Xcode `MARKETING_VERSION`, or `CHANGELOG.md` for version changes.

## Budget

- Above 80% monthly spend, focus on critical tasks only.

## Safety

- Never exfiltrate secrets or private data.
- Never take destructive actions without explicit board or CEO approval.
- Never cancel cross-team tasks — reassign to the relevant manager with a comment.
