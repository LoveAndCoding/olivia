# CEO Heartbeat Checklist

Run every heartbeat.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Planning Check
- Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md`.
- Review planned items: completed, blocked, next.
- Resolve blockers or escalate to board.

## 3. Approval Follow-Up
If `PAPERCLIP_APPROVAL_ID` is set: review approval, close resolved issues or comment on open ones.

## 4. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can unblock.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize it.

## 5. Strategic Forward-Look
- [ ] **Momentum**: any agents idle with sprint tasks remaining? Create or reassign work.
- [ ] **Forward-look**: current milestone ≥50% done and H2 not scoped? Add H2 scoping to plan.
- [ ] **Milestone transition**: did a milestone just close? Run transition protocol from `docs/strategy/operating-cadence.md`.
- [ ] **Idle state**: no assignments and no active milestone? Begin H2 activation or request board direction.

## 6. Pre-Flight
- [ ] Am I about to open a PR to upstream? STOP — only release PRs go to upstream.
- [ ] Does this change add rules for agents? Verify CEO is also covered.
- [ ] Am I above 80% budget? Is this task critical?
- [ ] Should an agent be doing this instead of me?

## 7. Checkout and Work
- `POST /api/issues/{id}/checkout`. Never retry 409.
- Do the work. Update status and comment when done.

## 8. Delegation
- Create subtasks: `POST /api/companies/{companyId}/issues`. Always set `parentId` and `goalId`.
- Use `paperclip-create-agent` skill when hiring.

## 9. Daily Notes
- Update `$AGENT_HOME/memory/YYYY-MM-DD.md` as you work.
- Extract durable facts to entity files via `para-memory-files` skill.

## 10. Fork Sync (before any branch)
1. `git fetch upstream && git checkout main && git merge upstream/main && git push origin main`
2. Branch from local `main`, not `upstream/main`
3. Feature branches → `origin/main`. Release PRs → `upstream/main`.

## 11. Doc Commit Check
- `git status --short` — uncommitted docs in `docs/`, `agents/*/memory/`?
- Commit durable artifacts. Do not commit unfinished WIP.

## 12. Exit
- Comment on any in_progress work before exiting.
- No assignments and no valid mention-handoff → exit cleanly.
