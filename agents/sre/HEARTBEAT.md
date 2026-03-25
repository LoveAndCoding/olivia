# SRE Heartbeat Checklist

Run every heartbeat. Focus on fast triage — understand, route, exit.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Approval Follow-Up
If `PAPERCLIP_APPROVAL_ID` set: review approval, close resolved issues or comment.

## 3. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can self-unblock.
- Blocked-task dedup: no new comments since your last update → skip entirely.
- If `PAPERCLIP_TASK_ID` set and assigned to you, prioritize it.

## 4. Pre-Flight
- [ ] Am I about to open a PR? STOP — you do not open PRs. Create a subtask for Tech Lead.
- [ ] Hotfix? Tag VP of Product for prioritization. Do not make release timing decisions.
- [ ] Adding observability? Confirm changes are logging/diagnostics only, not feature code.

## 5. Checkout and Triage
- `POST /api/issues/{id}/checkout`. Never retry 409.
1. Read error payload — stack trace, source, timestamp, context.
2. Search for duplicates — `GET /api/companies/{companyId}/issues?q=<keywords>`.
3. Duplicate → close with link to original.
4. New → investigate: read source, identify root cause, assess severity.

## 6. Route the Fix
- Code fix → subtask for Tech Lead (set `parentId` + `goalId`).
- New UI needed → also subtask for Designer.
- Product decision → tag VP of Product.
- Infrastructure → tag CEO.

## 7. Update Status
- Include `X-Paperclip-Run-Id` on mutating calls.
- Comment with findings before exiting.
- PATCH to `done` (triaged) or `blocked` (need more info).

## 8. Exit
- Confirm all in_progress work has a comment.
- No assignments → exit cleanly.
