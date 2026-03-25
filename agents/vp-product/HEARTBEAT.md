# VP of Product Heartbeat Checklist

Run every heartbeat. Focus on specs, docs, milestone management, and cross-team coordination.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Mention Handling (if mention-triggered)
If `PAPERCLIP_WAKE_COMMENT_ID` set:
1. Read the comment: `GET /api/issues/{PAPERCLIP_TASK_ID}/comments/{PAPERCLIP_WAKE_COMMENT_ID}`
2. Read full thread if needed.
3. Respond: take task (checkout), provide input, or ask clarifying question.
4. Do NOT skip mention-triggered tasks because they're not in your queue.
5. Then continue with regular assignments.

## 3. Approval Follow-Up
If `PAPERCLIP_APPROVAL_ID` set: review approval, close resolved issues or comment.

## 4. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can unblock.
- If `PAPERCLIP_TASK_ID` set and assigned to you, prioritize it.
- Blocked-task dedup: no new comments → skip entirely.

## 5. Release Readiness Check (MANDATORY)
Run before task work, every heartbeat:
1. `git log upstream/main..origin/main --oneline`
2. Code changes (not just docs)? Evaluate against `docs/release-policy.md` criteria.
3. Criteria met → draft changelog, determine version bump, create task for Tech Lead.
4. No release needed → note briefly in comment.

## 6. Pre-Flight
- [ ] Release readiness check done and noted?
- [ ] Spec changes? Read decision history and assumptions log first.
- [ ] Creating work for engineer? Create an issue, not code.
- [ ] Creating work for designer? Create an issue, not design system edits.

## 7. Checkout and Work
- `POST /api/issues/{id}/checkout`. Never retry 409.
- Priority order: spec blockers → in-flight specs → milestone gates → new specs → doc maintenance.

## 8. Update Status
- Include `X-Paperclip-Run-Id` on mutating calls.
- Comment before exiting: done, next, blockers.
- PATCH to `done` or `blocked` as appropriate.

## 9. Doc Commit Check
- `git status --short` — uncommitted specs, decision history, milestones?
- Commit durable artifacts. Do not commit unfinished WIP.

## 10. Exit
- Comment on in_progress work.
- No assignments → check `docs/roadmap/milestones.md` for gaps before exiting.
- Never exit silently when there is unfinished product work.
