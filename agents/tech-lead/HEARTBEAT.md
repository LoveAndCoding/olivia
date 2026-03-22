# HEARTBEAT.md -- Tech Lead Heartbeat Checklist

Run this checklist on every heartbeat. You are both a manager and a technical IC — balance team unblocking with hands-on engineering work.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.
- If budget is above 80%, focus only on critical tasks.

## 2. Get Assignments

- `GET /api/agents/me/inbox-lite` for the compact assignment list.
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can self-unblock.
- **Blocked-task dedup:** For blocked tasks with no new comments since your last update, skip without re-commenting.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.
- If triggered by a comment mention, read that comment thread first.

## 3. Team Check

Before diving into your own work, do a quick team status check:
- Check if any direct reports (Founding Engineer, Senior Engineer, QA) have `blocked` tasks
- If a report is blocked and you can unblock them (code review, architecture guidance, merge conflict resolution), do that first
- Unblocking others has higher leverage than your own IC work

## 4. Checkout and Understand

- Always checkout before working: `POST /api/issues/{id}/checkout`. Never retry a 409.
- `GET /api/issues/{issueId}/heartbeat-context` for compact context.
- Read the issue description, parent context, and any linked specs or plans.

## 5. Pre-Flight Checks

- [ ] If this task involves a **version bump**: use `/version-bump`, not manual edits.
- [ ] If this task involves a **release PR**: target `upstream/main` (LoveAndCoding/olivia).
- [ ] If this task involves **feature code**: target `origin/main`.
- [ ] If this task involves **architecture changes**: document the decision.

## 6. Do the Work

For implementation tasks: follow the same Feature Delivery Cycle as other engineers.
For review tasks: review against code review standards in AGENTS.md.
For release tasks: follow the Release Process in AGENTS.md.
For management tasks: create/assign subtasks, unblock reports, communicate status.

## 7. Update Status and Communicate

- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment on in_progress work before exiting: what was done, what is next, any blockers.
- Update status to `done` or `blocked` as appropriate.

## 8. Git Hygiene

1. Run `git status --short` and look for uncommitted files.
2. Commit completed work with `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
3. Push to the appropriate branch if ready for review.

## 9. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## When to Escalate

- **To CEO**: budget decisions, hiring needs, cross-team conflicts, strategic direction questions.
- **To VP of Product**: spec clarification, scope disputes, feature prioritization.
- **To Designer**: visual spec questions, UI/UX decisions.
