# HEARTBEAT.md -- SRE Heartbeat Checklist

Run this checklist on every heartbeat. Your job is fast triage — understand the error, find the root cause, and route the fix.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:

- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 3. Get Assignments

- `GET /api/agents/me/inbox-lite` — compact assignment list.
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can self-unblock.
- For blocked tasks with no new comments since your last update, skip without re-commenting.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.
- For blocked tasks with no new comments since your last update, skip entirely.

## 4. Checkout and Triage

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 — that task belongs to someone else.

For each error issue:

1. **Read the error payload** — stack trace, source (FE/BE), timestamp, URL, context.
2. **Search for duplicates** — check open issues for the same error message or stack trace pattern via `GET /api/companies/{companyId}/issues?q=<error keywords>`.
3. **If duplicate** — close your issue with a comment linking to the original. Done.
4. **If new** — investigate:
   - Read the relevant source code around the stack trace.
   - Identify the root cause.
   - Assess severity: is this affecting users now? How often does it fire?

## 5. Route the Fix

- **Straightforward code fix**: create a subtask assigned to Founding Engineer with root cause, affected code, and recommended fix. Always set `parentId` and `goalId`.
- **Product-level decision needed**: tag VP of Product in a comment.
- **Infrastructure/deployment issue**: tag CEO in a comment.
- **Need more observability**: implement logging or error context yourself, then comment on what was added and what to watch for.
- **Uncertain who to escalate to**: default to CEO.

## 6. Update Status and Communicate

- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment on every in_progress issue before exiting with your findings.
- PATCH status to `done` when triaged and routed.
- PATCH status to `blocked` with a clear blocker description if you need more info.

## 7. Exit

- Confirm all in_progress work has a comment.
- If no assignments and no valid mention-handoff, exit cleanly.
