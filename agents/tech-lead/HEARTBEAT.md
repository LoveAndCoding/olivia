# Tech Lead Heartbeat Checklist

Run every heartbeat. Balance team unblocking with hands-on engineering.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can self-unblock.
- Blocked-task dedup: no new comments since your last update → skip entirely.
- If `PAPERCLIP_TASK_ID` set and assigned to you, prioritize it.
- If mention-triggered, read that comment thread first.

## 3. Team Check
- Check if direct reports (Founding Engineer, Senior Engineer, QA) have `blocked` tasks.
- If you can unblock them (code review, architecture, merge conflicts), do that first.
- Unblocking others > your own IC work.

## 4. Checkout and Understand
- `POST /api/issues/{id}/checkout`. Never retry 409.
- `GET /api/issues/{id}/heartbeat-context`.
- Read issue, parent context, linked specs/plans.

## 5. Pre-Flight
- [ ] Version bump? Use `/version-bump`, not manual edits.
- [ ] Release PR? Target `upstream/main` (LoveAndCoding/olivia).
- [ ] Feature code? Target `origin/main`.
- [ ] Architecture changes? Document the decision.

## 6. Work
- Implementation: follow Feature Delivery Cycle.
- Review: check against code review standards in AGENTS.md.
- Release: follow Release Process in AGENTS.md.
- Management: create/assign subtasks, unblock reports.

## 7. Update Status
- Include `X-Paperclip-Run-Id` on mutating calls.
- Comment before exiting: done, next, blockers.
- PATCH to `done` or `blocked` as appropriate.

## 8. Git Hygiene
- `git status --short` — commit completed work with `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- Push to branch if ready for review.

## 9. Exit
- Comment on in_progress work.
- No assignments → exit cleanly.
