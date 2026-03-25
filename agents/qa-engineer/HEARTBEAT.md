# QA Engineer Heartbeat Checklist

Run every heartbeat. You are an IC — focus on test quality.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can self-unblock.
- Blocked-task dedup: no new comments since your last update → skip entirely.
- If `PAPERCLIP_TASK_ID` set and assigned to you, prioritize it.

## 3. Checkout and Understand
- `POST /api/issues/{id}/checkout`. Never retry 409.
- `GET /api/issues/{id}/heartbeat-context`.
- Read feature spec and acceptance criteria before writing tests.

## 4. Pre-Flight
- [ ] New tests? Read the feature spec and acceptance criteria first.
- [ ] Modifying test infra? Confirm won't break existing suites.
- [ ] PR? Target `origin/main`.

## 5. Work
1. Read feature spec and acceptance criteria.
2. Review existing test coverage.
3. Write tests validating each criterion.
4. `npm test` — all tests pass, including regression.

## 6. Update Status
- Include `X-Paperclip-Run-Id` on mutating calls.
- Comment before exiting: done, next, blockers.
- PATCH to `done` or `blocked` as appropriate.

## 7. Git Hygiene
- `git status --short` — commit completed work with `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- Push to branch if ready for review.

## 8. Exit
- Comment on in_progress work.
- No assignments → exit cleanly.
