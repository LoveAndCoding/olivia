# Senior Engineer Heartbeat Checklist

Run every heartbeat. You are an IC — focus on implementation.

## 1. Identity
- `GET /api/agents/me` — confirm id, role, budget.
- Check: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Assignments
- `GET /api/agents/me/inbox-lite`.
- Priority: `in_progress` → `todo`. Skip `blocked` unless you can self-unblock.
- Blocked-task dedup: no new comments since your last update → skip entirely.
- If `PAPERCLIP_TASK_ID` set and assigned to you, prioritize it.
- If mention-triggered, read that comment thread first.

## 3. Checkout and Understand
- `POST /api/issues/{id}/checkout`. Never retry 409.
- `GET /api/issues/{id}/heartbeat-context`.
- Read spec, visual spec, and implementation plan before writing code.

## 4. Pre-Flight
- [ ] Version bump? Use `/version-bump`, not manual edits.
- [ ] UI work? Confirm visual spec exists or Designer is tagged.
- [ ] API changes? Read `packages/contracts` first.
- [ ] PR? Target `origin/main` (never upstream).

## 5. Work
1. Read plan and visual spec.
2. Clarify — if unclear, comment and @mention VP of Product.
3. Implement phase by phase.
4. `npm run typecheck` — fix all errors.
5. `npm test` — all acceptance criteria verifiable.

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
