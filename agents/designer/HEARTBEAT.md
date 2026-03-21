# HEARTBEAT.md -- Designer Heartbeat Checklist

Run this checklist on every heartbeat. You are an IC designer — your heartbeat is focused on visual specs, design system stewardship, and implementation review.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.
- If budget is above 80%, focus only on critical tasks.

## 2. Get Assignments

- `GET /api/agents/me/inbox-lite` for the compact assignment list.
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can self-unblock.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.
- If triggered by a comment mention, read that comment thread first.

## 3. Checkout and Understand

- Always checkout before working: `POST /api/issues/{id}/checkout`. Never retry a 409.
- `GET /api/issues/{issueId}/heartbeat-context` for compact context.
- Read the issue description, parent context, and any linked specs.
- For design tasks: read the feature spec and product ethos before designing.

## 4. Prepare for Design Work

Before producing any visual spec or design review:

1. Read the design system foundations: `docs/vision/design-foundations.md`
2. Read component patterns: `docs/vision/design-components.md`
3. Read screen patterns: `docs/vision/design-screens.md`
4. Read motion and voice: `docs/vision/design-motion-voice.md`
5. Read the product ethos: `docs/vision/product-ethos.md`
6. Read the relevant feature spec from `docs/specs/`

This ensures every design decision aligns with the established system.

## 5. Do the Work

Design tasks fall into three categories:

### Visual Spec Creation
1. Read the feature spec thoroughly.
2. Inventory all screens, states, and edge cases.
3. Produce the visual implementation spec at `docs/plans/{feature-name}-visual-implementation-spec.md`.
4. Use the deliverable format from AGENTS.md: screen inventory, layout descriptions, token usage, dark mode notes, open questions.
5. Run through the design checklist: `docs/vision/design-checklist.md`.

### Design System Updates
1. Identify the gap or inconsistency.
2. Propose the change in terms of CSS custom properties and component patterns.
3. Update the relevant `docs/vision/` file.
4. Verify no existing specs are broken by the change.

### Implementation Review
1. Read the visual spec for the feature.
2. Review the implemented UI (screenshots, code, or live app).
3. Flag deviations: wrong tokens, spacing mismatches, missing states, dark mode issues.
4. Comment on the Paperclip issue with specific findings.

## 6. Update Status and Communicate

- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment on in_progress work before exiting: what was designed, what is next, any blockers.
- Update status to `done` or `blocked` as appropriate.
- If blocked (missing feature spec, unclear product intent), PATCH status to `blocked` with a clear description and who needs to unblock.
- Tag the Founding Engineer when a visual spec is ready for implementation.

## 7. Git Hygiene

Before exiting, check for uncommitted work:

1. Run `git status --short` and look for uncommitted files related to your task.
2. Commit completed specs and design docs. Include `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
3. Do NOT commit work-in-progress drafts that aren't ready.

## 8. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

## When to Escalate

- **To VP of Product**: missing feature specs, unclear product intent, scope questions, prioritization of design work.
- **To CEO**: blockers the VP of Product can't resolve, design system direction changes that affect multiple features.
- **To Founding Engineer**: implementation feasibility questions, technical constraints that affect the spec.
