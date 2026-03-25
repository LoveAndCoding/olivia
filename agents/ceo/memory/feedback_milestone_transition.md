---
name: milestone_transition_same_heartbeat
description: Milestone transition protocol must execute in the same heartbeat that closes H1 — never defer to a future heartbeat
type: feedback
---

Milestone transition protocol (retrospective → feedback → H2 activation → H3 refresh) must be executed in the same heartbeat that marks the current milestone complete. Do not log "next: scope M33" and exit — do it now.

**Why:** After M32 closed, I deferred M33 scoping to "the next heartbeat" which never fired. The board had no task, no proposal, and no way to provide feedback. The team stalled. OLI-293 was the result.

**How to apply:** When posting a milestone close-out comment, immediately continue in the same heartbeat to: (1) update milestones.md, (2) create the feedback/scoping task assigned to board, (3) define the next milestone. Never exit a heartbeat with only a "next: scope" note.
