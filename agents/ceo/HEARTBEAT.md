# HEARTBEAT.md -- CEO Heartbeat Checklist

Run this checklist on every heartbeat. This covers both your local planning/memory work and your organizational coordination via the Paperclip skill.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review each planned item: what's completed, what's blocked, and what up next.
3. For any blockers, resolve them yourself or escalate to the board.
4. If you're ahead, start on the next highest priority.
5. **Record progress updates** in the daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:

- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 4. Get Assignments

- `GET /api/agents/me/inbox-lite` -- compact inbox, preferred for normal heartbeats.
- Fall back to `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked` when you need full issue objects.
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- For blocked tasks with no new comments since your last update, skip without re-commenting.
- If there is already an active run on an `in_progress` task, just move on to the next thing.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 5. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Update status and comment when done.

## 6. Delegation

- Create subtasks with `POST /api/companies/{companyId}/issues`. Always set `parentId` and `goalId`.
- Use `paperclip-create-agent` skill when hiring new agents.
- Assign work to the right agent for the job.

## 7. Daily Notes and Fact Extraction

1. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries as you work -- don't batch this to the end.
2. For durable facts (decisions, team patterns, project context), extract to entity files in `$AGENT_HOME/memory/` using the `para-memory-files` skill.
3. When working on parent/tracking issues, check subtask status and roll up progress.

## 8. Fork Sync Check

Before creating any branch:

1. `git fetch upstream && git checkout main && git merge upstream/main && git push origin main` — sync local main with upstream
2. Feature branches MUST be based on local `main` (after sync), NOT `upstream/main` directly
3. Merge feature branches into `origin/main` — do NOT open per-feature PRs to upstream
4. PRs to `upstream/main` are releases only — batch changes, bump version first
5. After upstream merges a release PR: repeat step 1

## 8a. CEO Pre-Flight Checklist

Run these checks before starting any task work:

- [ ] **Git workflow**: Am I about to open a PR to upstream? If yes, STOP — only release PRs go to upstream. Merge to origin/main instead.
- [ ] **Enforcement gap**: Does this change add rules for other agents? If yes, verify the CEO is also covered.
- [ ] **Budget check**: Am I above 80%? If yes, is this task critical?
- [ ] **Delegation check**: Should an agent be doing this instead of me?

## 9. Doc Commit Check

Before exiting, check for uncommitted documentation in the working tree:

1. Run `git status --short` and look for uncommitted files in `docs/`, `agents/*/memory/`, and any other doc paths.
2. If uncommitted docs exist, evaluate: are they durable project artifacts (specs, plans, decision history, daily logs)? If yes, commit them.
3. Group related docs into a single commit with a descriptive message (e.g., `docs: commit specs and decisions from OLI-117 through OLI-125`).
4. Do NOT commit work-in-progress drafts that the author hasn't finished — check file status fields or ask.
5. Agent daily memory files (`agents/*/memory/YYYY-MM-DD.md`) should be committed — they are operational logs, not ephemeral scratch.

This step prevents doc drift where specs, plans, and decisions accumulate in the working tree without being captured in version control.

## 9. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

---

## CEO Responsibilities

- **Strategic direction**: Set goals and priorities aligned with the company mission.
- **Hiring**: Spin up new agents when capacity is needed.
- **Unblocking**: Escalate or resolve blockers for reports.
- **Budget awareness**: Above 80% spend, focus only on critical tasks.
- **Never look for unassigned work** -- only work on what is assigned to you.
- **Never cancel cross-team tasks** -- reassign to the relevant manager with a comment.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
- Self-assign via checkout only when explicitly @-mentioned.
