# Tools -- Designer Toolchain

## Paperclip API

Primary coordination layer. Issue management and communication with the team.

| Endpoint pattern | Usage |
|---|---|
| `GET /api/agents/me` | Identity check on every heartbeat |
| `GET /api/agents/me/inbox-lite` | Compact assignment inbox |
| `POST /api/issues/:id/checkout` | Lock a task before working. Always include `X-Paperclip-Run-Id`. |
| `GET /api/issues/:id/heartbeat-context` | Compact context with ancestors, goal, comment cursor |
| `PATCH /api/issues/:id` | Status updates, comments |
| `POST /api/issues/:issueId/comments` | Add comments to issues |

## Paperclip Skills

| Skill | When to use |
|---|---|
| `paperclip` | All issue coordination — assignments, checkout, status, comments |
| `olivia-spec` | Drafting feature specs (when product context is needed) |
| `olivia-review` | Reviewing documentation quality |
| `olivia-orient` | Session orientation at start of design work |

## Design System References

The authoritative design system lives in `docs/vision/`. These are the files you must read before any design work:

| File | Contents |
|---|---|
| `docs/vision/design-foundations.md` | Color system, typography scale, spacing scale, elevation, theming architecture |
| `docs/vision/design-components.md` | Reusable component patterns — cards, buttons, inputs, modals, lists |
| `docs/vision/design-screens.md` | Screen layout patterns — conversation, list, detail, settings |
| `docs/vision/design-motion-voice.md` | Animation timing, easing curves, interaction feedback, Olivia's voice personality |
| `docs/vision/design-checklist.md` | Pre-delivery verification checklist — run this before marking any visual spec done |
| `docs/vision/product-ethos.md` | Behavioral principles that inform UX decisions |

## Visual Spec Template

Visual implementation specs go to `docs/plans/{feature-name}-visual-implementation-spec.md`. Each spec covers:

- Screen inventory (every state and view)
- Per-screen layout with component usage
- State transitions and interaction patterns
- Token usage (CSS custom properties mapped to visual elements)
- Dark mode notes
- Edge cases and empty states
- Open design questions

Reference: `docs/plans/reminders-visual-implementation-spec.md` is a completed example.

## File System

| Tool | Purpose |
|---|---|
| Read | Read files — specs, vision docs, implementation code for review |
| Edit | Modify existing files — update specs, vision docs |
| Write | Create new files — new visual specs |
| Glob | Find files by name pattern |
| Grep | Search file contents — find token usage, component patterns in code |

## Git and GitHub

- **git** — commits for specs and design docs. Always add `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
- **gh** (GitHub CLI) — PR-related work when specs need review.
- Design docs go through the same git workflow as code.

## Notes

- Always read the full design system before starting a visual spec. Skipping this leads to inconsistencies.
- The design checklist (`docs/vision/design-checklist.md`) is mandatory before marking any spec complete.
- When reviewing implementation, read both the spec and the actual component code — screenshots alone miss token-level details.
- `inbox-lite` is preferred over the full issues endpoint for normal heartbeat inbox checks.
