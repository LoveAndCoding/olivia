# Assumptions Log

## Purpose
This log tracks meaningful assumptions that currently shape Olivia's direction. Assumptions are not facts. They should remain visible until validated, disproven, or replaced.

## Entry Template
Use this structure for future entries:

### A-XXX: Short assumption title
- Date:
- Area:
- Statement:
- Confidence: low | medium | high
- Why it matters:
- Evidence so far:
- Validation path:
- Status: active | validated | disproven | superseded
- Related docs:

## Current Assumptions

### A-001: Shared household state is the best first wedge
- Date: 2026-03-08
- Area: product strategy
- Statement: Olivia will create the most early value by focusing first on shared household state and follow-through rather than on a single narrow utility or a general assistant experience.
- Confidence: high
- Why it matters: this assumption shapes roadmap sequencing, feature prioritization, and MVP scope.
- Evidence so far: stakeholder goals emphasize reducing mental load across tasks, reminders, planning, and memory; a shared-state wedge best unifies those needs.
- Validation path: draft early feature specs and test whether one narrow shared-state workflow can plausibly deliver value in real household use.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`

### A-002: Advisory-only behavior is the right trust model for early phases
- Date: 2026-03-08
- Area: product behavior
- Statement: Olivia should begin by suggesting, organizing, and drafting rather than taking consequential actions autonomously.
- Confidence: high
- Why it matters: this assumption shapes permissions, workflows, risk posture, and product ethos.
- Evidence so far: stakeholder direction favors local control, explicit approvals, and low-risk household support.
- Validation path: evaluate whether advisory behavior is useful enough on its own to create household value without premature automation.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`

### A-003: Early interaction can remain channel-agnostic
- Date: 2026-03-08
- Area: interface strategy
- Statement: The project can defer locking in a long-term interface because the earliest product value is defined more by workflow usefulness than by surface choice.
- Confidence: medium
- Why it matters: this assumption preserves optionality around Slack, local app, web UI, or hybrid paths.
- Evidence so far: the stakeholder is open to multiple surfaces and has Slack available for experimentation.
- Validation path: define the first implementation-ready workflow and test which surface enables the fastest local-first validation.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`

### A-004: A 14-day staleness threshold will surface genuinely stale items without creating excessive noise
- Date: 2026-03-08
- Area: feature behavior
- Statement: Inbox items that have had no status update for 14 or more days and remain open or in-progress should be surfaced by Olivia as potentially stale. This threshold will produce useful signal rather than noise in a typical household context.
- Confidence: low
- Why it matters: the staleness threshold directly shapes how often Olivia surfaces items to the stakeholder. Too short and it creates noise; too long and genuinely forgotten items go unnoticed.
- Evidence so far: none — this is a placeholder value chosen for plausibility. No household usage data exists yet.
- Validation path: observe stakeholder behavior during the first weeks of real inbox use. If the stakeholder ignores or dismisses stale item flags regularly, increase the threshold or adjust the logic. If items are being missed, consider shortening it.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`
