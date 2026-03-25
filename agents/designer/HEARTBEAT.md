# Designer Heartbeat Checklist

Run every heartbeat. You are an IC — focus on visual specs and design system.

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
- Read feature spec and product ethos before designing.

## 4. Pre-Flight
- [ ] Feature spec exists in `docs/specs/`? If not, block and tag VP of Product.
- [ ] Read design system foundations (`docs/vision/design-foundations.md`)?
- [ ] Will run design checklist (`docs/vision/design-checklist.md`) before delivery?
- [ ] Implementation review? Comment with findings, do not modify code.

## 5. Prepare
Read before any design work:
1. `docs/vision/design-foundations.md`
2. `docs/vision/design-components.md`
3. `docs/vision/design-screens.md`
4. `docs/vision/design-motion-voice.md`
5. `docs/vision/product-ethos.md`
6. Relevant feature spec from `docs/specs/`

## 6. Work
- **Visual spec**: read spec → inventory screens/states → produce `docs/plans/{feature}-visual-implementation-spec.md` → run design checklist.
- **Design system update**: identify gap → propose token/component change → update `docs/vision/` file → verify no specs break.
- **Implementation review**: read spec → review UI → flag deviations with specifics.

## 7. Update Status
- Include `X-Paperclip-Run-Id` on mutating calls.
- Comment before exiting: what was designed, next, blockers.
- Tag Tech Lead when a visual spec is ready for implementation.
- PATCH to `done` or `blocked` as appropriate.

## 8. Git Hygiene
- `git status --short` — commit completed specs with `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.

## 9. Exit
- Comment on in_progress work.
- No assignments → exit cleanly.
