# Operating Cadence

## Purpose

This document defines how the team plans, executes, and transitions between milestones. It ensures the team always has forward momentum — no sprint gaps, no idle agents, no reactive-only planning.

## Three Rolling Horizons

The CEO maintains three concurrent planning horizons at all times:

| Horizon | Timeframe | Owner | State |
|---|---|---|---|
| H1: Current Sprint | 0–2 weeks | CEO + Tech Lead | Active execution with subtasks assigned |
| H2: Next Sprint | 2–6 weeks | CEO + VP Product | Scoped, objectives defined, draft subtask structure |
| H3: Strategic Direction | 1–3 months | CEO | Roadmap-level view, candidate tracks, assumption validation |

### H1: Current Sprint
- The active milestone and its subtasks
- CEO monitors progress, unblocks, delegates, rolls up status
- Tech Lead owns engineering execution pipeline
- VP Product owns spec quality and completeness

### H2: Next Sprint
- The next milestone, scoped and ready to activate when H1 completes
- Has defined objectives, priority areas, and at least draft subtask structure
- VP Product has spec pipeline seeded for H2 work
- **Trigger**: When H1 hits 50% completion, CEO begins H2 scoping if not already started
- **Gate**: H2 must be board-reviewed before H1 closes, so there is zero gap between sprints

### H3: Strategic Direction
- Which product horizon are we in, what tracks are candidates, what assumptions need validation
- Updated when milestones close or when significant new signal arrives
- Captured in `docs/roadmap/roadmap.md` and this document's Strategic Brief section

## Heartbeat Additions

Every CEO heartbeat includes (in addition to standard assignment work):

1. **Momentum check** — If any agent has no assigned work and the sprint has remaining tasks, create or reassign within 1 heartbeat
2. **Forward-look trigger** — If current milestone is ≥50% done and H2 is not yet scoped, add H2 scoping to today's plan
3. **Idle detection** — If no assignments exist and no milestone is active, begin H2 activation or request board direction

## Milestone Transition Protocol

When a milestone closes:

1. **Retrospective** — What worked, what didn't, what surprised us. Captured as learnings (L-series) in `docs/learnings/learnings-log.md`.
2. **Feedback collection** — If the milestone included user-facing changes, request household feedback from the board.
3. **Assumptions review** — Review active assumptions in `docs/learnings/assumptions-log.md`. Validate, challenge, or retire based on milestone evidence.
4. **H2 activation** — The already-scoped next milestone becomes H1. Create subtasks, assign agents, start execution.
5. **H3 refresh** — Update the roadmap and strategic brief with any new signal.
6. **No dead air** — The team should have new assignments within 1 heartbeat of the old milestone closing.

## Backlog Management

The CEO maintains a living backlog of validated work items not in the current sprint:

- **Sources**: board requests, usage feedback, team discoveries, deferred decisions, spec pipeline overflow
- **Storage**: Paperclip issues with status `backlog`, tagged with relevant track
- **Grooming**: When scoping H2, pull from the backlog first before inventing new work
- **Decay**: Items in backlog >2 milestones without being pulled should be reviewed — cancel or re-prioritize

## Spec Pipeline

VP Product maintains a spec pipeline 1 sprint ahead:

- At least 2 draft specs ready for H2 when H1 is 50% done
- Specs should address the highest-priority items from the backlog or H2 objectives
- Designer provides visual specs in parallel with product specs where UI changes are involved

## Momentum Rules

1. No agent idle >1 heartbeat when sprint has remaining tasks — CEO creates or reassigns
2. Milestone blocked >2 heartbeats — CEO escalates to board
3. Every milestone includes "scope next milestone" as a tracked subtask
4. Zero tolerance for sprint gaps — H2 must be board-reviewed before H1 closes
5. End of every milestone builds to the next — retrospective feeds H2 scoping

## Strategic Brief

Updated by CEO at milestone transitions and when significant signal arrives.

### Current State (as of M30 close, 2026-03-22)

**Where we are:**
- M30 (Stability & Feature Depth) complete — 16/16 subtasks shipped
- Team: 8 agents (CEO, VP Product, Tech Lead, Founding Engineer, Senior Engineer, QA Engineer, Designer, SRE)
- Budget: ~32% monthly spend
- Product: H5 Phase 3 complete, household coordination layer mature, stability sprint hardened daily-use paths
- Release: v0.6.0 live

**Where we're going:**
- M31 direction TBD — awaiting board input on post-M30 household signal
- Candidate tracks from roadmap: Track A (deepen chat), B (broaden household), C (complete H3), D (increase autonomy), E (deepen coordination surface)
- M30 feedback will inform which track(s) are right
- Key question for board: did M30 changes reduce daily friction enough to build on, or is more hardening needed?

**What could change it:**
- A-002 (advisory-only trust model) — validated but chat needed recalibration; may influence autonomy track timing
- A-011 (feature breadth vs depth) — M30 addressed this; need board signal on whether depth is now sufficient
- Board may direct a specific track as they did with M28→chat
- New household feedback post-M30 could surface unexpected priorities

**Backlog (top deferred items):**
1. Task steps / sub-tasks (OLI-242, spec drafted) — deferred pending inbox validation
2. Shared calendar integration (OLI-243, D-063) — Phase 1 enhanced calendar, Phase 2 EventKit
3. In-app feedback mechanism — identified in M30 scope but deferred to second wave
4. Rule-based automation (H5 Phase 3+) — requires validated trust in AI advisory
5. Spouse write access / multi-user roles — Track B, no active demand signal

## Decisions

- D-068: Operating cadence established — three rolling horizons, milestone transition protocol, momentum rules (2026-03-22)
