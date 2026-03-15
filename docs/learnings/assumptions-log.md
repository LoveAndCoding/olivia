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
- Evidence so far: stakeholder goals emphasized reducing mental load across tasks, reminders, planning, and memory; the shared household inbox was then implemented as the product's MVP and is now the foundation for Horizon 3 expansion.
- Validation path: completed for the MVP wedge. Future validation should focus on whether adjacent workflows still compound on shared household state rather than drifting into disconnected tools.
- Status: validated
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
- Evidence so far: the stakeholder was open to multiple surfaces during product definition. After the shared household inbox workflow was specified and the household's actual capture/review pattern was discussed, the project selected an installable mobile-first PWA as the near-term interface direction.
- Validation path: completed for near-term planning. Future validation should focus on whether the chosen PWA remains sufficient in real household use or whether native-only capabilities become important enough to justify a new decision.
- Status: validated
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`, `docs/strategy/interface-direction.md`, `docs/learnings/decision-history.md` (D-007)

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

### A-005: Web Push will be sufficient for the first PWA notification posture
- Date: 2026-03-09
- Area: system architecture
- Statement: The installable PWA plus Web Push will be reliable enough for Olivia's first notification scope, which is currently limited to calm, primary-operator prompts such as due-soon, stale-item, and optional digest notifications.
- Confidence: medium
- Why it matters: this assumption helps determine whether the PWA remains the right MVP surface or whether a native shell becomes necessary earlier for notification quality alone.
- Evidence so far: the current inbox workflow has a narrow notification scope, and the interface strategy already limits notification ambition to a calm, primary-operator model.
- Validation path: implement the first notification slice and observe whether delivery reliability, open behavior, and user response are good enough in actual household use. If notifications are unreliable or too constrained, revisit the native-shell threshold.
- Status: active
- Related docs: `docs/strategy/interface-direction.md`, `docs/strategy/system-architecture.md`, `docs/specs/shared-household-inbox.md`

### A-006: Versioned command sync is sufficient for early household concurrency
- Date: 2026-03-09
- Area: system architecture
- Statement: Olivia's first household workflow will have low enough concurrency that explicit versioned command sync is sufficient, without needing CRDTs, peer-to-peer sync, or event-sourced conflict machinery.
- Confidence: medium
- Why it matters: this assumption shapes the persistence and sync architecture, implementation complexity, and how much infrastructure is needed before the product has proven real household value.
- Evidence so far: the first workflow uses a primary-operator model, spouse access is read-only, and the current product scope does not imply simultaneous high-conflict edits.
- Validation path: observe real usage once spouse participation or multi-device use increases. If conflicting edits or offline merge failures become common, revisit the sync model and evaluate stronger conflict-resolution infrastructure.
- Status: active
- Related docs: `docs/strategy/system-architecture.md`, `docs/specs/shared-household-inbox.md`, `docs/learnings/decision-history.md` (D-008)

### A-007: Shared lists deserve a distinct workflow model from the inbox
- Date: 2026-03-13
- Area: product strategy
- Statement: Grocery, shopping, packing, and similar shared lists are distinct enough from inbox items that they should be treated as a separate workflow type rather than only a status or category within the inbox.
- Confidence: high
- Why it matters: this assumption shapes Horizon 3 product boundaries and determines whether Olivia extends the inbox model or introduces a sibling workflow.
- Evidence so far: the spec, visual implementation, and full Phase 1 implementation confirmed that list behavior (immediate check/uncheck, no ownership or status semantics) is meaningfully different from inbox item behavior. A separate model was the right choice.
- Validation path: completed. The shared-list spec and implementation validate this assumption.
- Status: validated
- Related docs: `docs/roadmap/roadmap.md`, `docs/glossary.md`, `docs/learnings/decision-history.md` (D-016)

### A-008: Recurring schedule infrastructure can be shared across multiple Horizon 3 workflows
- Date: 2026-03-13
- Area: product architecture
- Statement: A shared recurrence model can support reminders, recurring routines, and later planning workflows without each workflow inventing separate scheduling primitives.
- Confidence: medium
- Why it matters: this assumption affects how much shared infrastructure Horizon 3 should plan for before individual specs are written.
- Evidence so far: the stakeholder prioritized reminders and recurring routines together, and both appear to need schedule-driven behavior.
- Validation path: compare the first reminders and recurring-routines specs. If they share recurrence, notification, and ownership needs cleanly, treat recurrence as shared infrastructure; otherwise narrow it per workflow.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/strategy/system-architecture.md`

### A-009: Meal planning should remain a later Horizon 3 workflow
- Date: 2026-03-13
- Area: roadmap sequencing
- Statement: Meal planning is promising, but should follow reminders, shared lists, and recurring routines rather than being one of the first Horizon 3 implementation targets.
- Confidence: medium
- Why it matters: this assumption protects Horizon 3 from trying to solve too many household workflow shapes at once.
- Evidence so far: the stakeholder prioritized meal planning behind reminders and new workflow primitives such as lists and routines.
- Validation path: revisit after the first shared-list and recurring-workflow specs exist. If meal planning depends heavily on them, keep it later; if it reveals a more urgent pain point, reorder Horizon 3 priorities.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/decision-history.md`

### A-010: Lightweight standalone reminders will reduce pressure to misuse the inbox
- Date: 2026-03-13
- Area: feature behavior
- Statement: Allowing lightweight standalone reminders alongside linked reminders will reduce the need to represent pure "surface this later" prompts as inbox work, without creating a second full task-management workflow.
- Confidence: medium
- Why it matters: this assumption shapes the reminder spec boundary, the relationship between reminders and inbox items, and whether Olivia can support reminder-only use cases without product drift.
- Evidence so far: the implemented inbox already handles active work and due-state well enough to remain the foundation, while stakeholder input favored a hybrid reminder model rather than an inbox-only or standalone-only approach.
- Validation path: observe reminder usage after implementation. If standalone reminders remain narrow and reduce inbox misuse, keep the hybrid model. If they become duplicative or confusing, narrow the workflow or push more reminder cases back toward linked reminders.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/learnings/decision-history.md`
