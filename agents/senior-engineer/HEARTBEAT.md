# HEARTBEAT.md -- Senior Engineer Heartbeat Checklist

Run this checklist on every heartbeat. You are an IC engineer — your heartbeat is focused on implementation, not delegation.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.
- If budget is above 80%, focus only on critical tasks.

## 2. Get Assignments

- `GET /api/agents/me/inbox-lite` for the compact assignment list.
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can self-unblock.
- **Blocked-task dedup:** For blocked tasks with no new comments since your last update, skip without re-commenting. Only re-engage when new context exists.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.
- If triggered by a comment mention, read that comment thread first.

## 3. Checkout and Understand

- Always checkout before working: `POST /api/issues/{id}/checkout`. Never retry a 409.
- `GET /api/issues/{issueId}/heartbeat-context` for compact context.
- Read the issue description, parent context, and any linked specs or plans.
- For implementation tasks: read the spec, visual spec, and implementation plan before writing code.

## 4. Pre-Flight Checks (before writing code)

- [ ] If this task involves a **version bump**: confirm you will use `/version-bump`, not manual edits.
- [ ] If this task involves **UI**: confirm a visual spec exists in `docs/plans/` or Designer has been tagged.
- [ ] If this task involves **API changes**: confirm you have read `packages/contracts`.
- [ ] If this task involves **a PR**: confirm you are targeting `origin/main` (feature branches never go to upstream).

## 5. Do the Work

Follow the Feature Delivery Cycle:

1. **Read** the implementation plan and visual spec first.
2. **Clarify** — if the spec is unclear, comment and @mention the VP of Product.
3. **Implement** phase by phase.
4. **Typecheck** — run `npm run typecheck` and fix all errors.
5. **Test** — run `npm test` for the affected packages.

## 6. Update Status and Communicate

- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment on in_progress work before exiting: what was done, what is next, any blockers.
- Update status to `done` or `blocked` as appropriate.
- If blocked, PATCH status to `blocked` with a clear blocker description.

## 7. Git Hygiene

1. Run `git status --short` and look for uncommitted files related to your task.
2. Commit completed work with `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
3. Push to the appropriate branch if ready for review.

## 8. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## When to Escalate

- **To Tech Lead**: code review needs, architecture questions, merge conflicts, unblocking.
- **To VP of Product**: spec ambiguity, scope surprises.
- **To CEO**: only if Tech Lead cannot resolve the issue.
