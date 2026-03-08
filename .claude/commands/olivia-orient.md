# Olivia Session Orientation

You are beginning a Claude Code session on the Olivia project — a documentation-first household command center being built agentically. Before doing any work, orient yourself fully to the project state so you can act with coherence and not repeat prior decisions.

## Step 1: Read the docs in this order

Read each file completely:

1. `docs/vision/product-vision.md` — what Olivia is and who it is for
2. `docs/vision/product-ethos.md` — trust model, behavioral principles, non-negotiables
3. `docs/strategy/agentic-development-principles.md` — how docs should be structured, PM operating model
4. `docs/glossary.md` — canonical product terms; use these consistently
5. `docs/roadmap/roadmap.md` — strategic horizons and sequencing rationale
6. `docs/roadmap/milestones.md` — execution-readiness gates with evidence requirements
7. `docs/learnings/decision-history.md` — all major decisions and their rationale
8. `docs/learnings/assumptions-log.md` — active working beliefs and their confidence levels
9. `docs/learnings/learnings-log.md` — durable lessons from prior work

## Step 2: Assess milestone status

For each milestone (M0 through M4), check whether its required artifacts exist and its exit criteria are satisfied. Identify the current active milestone.

Required artifacts per milestone are defined in `docs/roadmap/milestones.md`.

To check artifact existence, list the files under `docs/` and compare against each milestone's requirements.

## Step 3: Produce a structured orientation summary

Output a summary with these sections:

### Project Summary
One to two sentences on what Olivia is and its current development phase.

### Current Milestone
State the active milestone, its objective, and which required artifacts are present vs. missing.

### Milestone Gate Status
For each milestone M0–M4, state: Complete / In Progress / Not Started, with a one-line reason.

### Active Assumptions
List all assumptions from `assumptions-log.md` with their confidence level. Flag any at LOW confidence in bold.

### Latest Decisions
List the three most recent decisions from `decision-history.md` (by date).

### Open Questions
Collect all Open Questions sections across every doc you read. Deduplicate and list them.

### Recommended Next Action
State the single most valuable action for this session, based on the milestone gap. Be specific — name the file to create or the decision to resolve. Do not list multiple options unless they are equally urgent. Explain why this is the highest-priority action given the current state.

## Principles

- Do not propose work that contradicts existing decisions without flagging the conflict.
- If you discover a gap or inconsistency between docs, note it in the orientation summary under a "Doc Inconsistencies" section.
- Use glossary terms from `docs/glossary.md` in your summary.
- Do not start implementing features until you have confirmed the project is at M3 (Build Readiness) or above.
