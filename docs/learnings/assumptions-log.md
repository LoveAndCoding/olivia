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
- Evidence so far: stakeholder direction favors local control, explicit approvals, and low-risk household support. M29 household feedback (2026-03-22) reinforced this: the chat interface violated advisory-only by creating 8-9 unsolicited tasks, producing negative value. The board explicitly stated "trust and automation is maybe a better immediate fix" over expanding AI capabilities. Advisory-only is validated, but the chat surface needs to be brought into compliance with it.
- Validation path: completed for the trust model itself. Ongoing validation: ensure all AI surfaces (especially chat) enforce advisory-only behavior consistently.
- Status: validated
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`, L-032

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
- Confidence: low
- Why it matters: this assumption helps determine whether the PWA remains the right MVP surface or whether a native shell becomes necessary earlier for notification quality alone.
- Evidence so far: the current inbox workflow has a narrow notification scope, and the interface strategy already limits notification ambition to a calm, primary-operator model. M29 household feedback (2026-03-22) indicates push notifications have not been reliably functional — the native migration means the household hasn't been able to test push at all. The board called integration a top blocker: "reminders haven't really been functional until very recently and due to the native migration I still haven't even been able to test push notifications."
- Validation path: get push notifications working on the native (Capacitor) app and validate delivery reliability in actual household use. This is now a prerequisite for M30.
- Status: active (challenged — needs native validation)
- Related docs: `docs/strategy/interface-direction.md`, `docs/strategy/system-architecture.md`, `docs/specs/shared-household-inbox.md`, L-029

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
- Confidence: high
- Why it matters: this assumption affects how much shared infrastructure Horizon 3 should plan for before individual specs are written.
- Evidence so far: both first-class reminders and recurring routines were implemented sharing recurrence, notification, and scheduling primitives. The shared model held cleanly across both workflow types with no per-workflow scheduling re-invention.
- Validation path: completed. The reminders and recurring-routines implementations confirm shared schedule infrastructure is viable.
- Status: validated
- Related docs: `docs/roadmap/roadmap.md`, `docs/strategy/system-architecture.md`

### A-009: Meal planning should remain a later Horizon 3 workflow
- Date: 2026-03-13
- Area: roadmap sequencing
- Statement: Meal planning is promising, but should follow reminders, shared lists, and recurring routines rather than being one of the first Horizon 3 implementation targets.
- Confidence: medium
- Why it matters: this assumption protects Horizon 3 from trying to solve too many household workflow shapes at once.
- Evidence so far: all three predecessor workflows (reminders, shared lists, recurring routines) are now built and validated. The deferred condition is now met. CEO confirmed meal planning as the next spec target via D-019 (OLI-26).
- Validation path: completed. The prerequisite condition is met and the decision is made. See D-019.
- Status: validated
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/decision-history.md` (D-019)

### A-010: Lightweight standalone reminders will reduce pressure to misuse the inbox
- Date: 2026-03-13
- Area: feature behavior
- Statement: Allowing lightweight standalone reminders alongside linked reminders will reduce the need to represent pure "surface this later" prompts as inbox work, without creating a second full task-management workflow.
- Confidence: medium
- Why it matters: this assumption shapes the reminder spec boundary, the relationship between reminders and inbox items, and whether Olivia can support reminder-only use cases without product drift.
- Evidence so far: first-class reminders are now built and available in the PWA. The hybrid model (standalone + linked) was implemented as designed. M29 household feedback (2026-03-22) indicates reminders are used "in theory" but the UX friction (cumbersome date/time entry, snooze keeping items on home screen) limits practical value. The standalone vs. linked distinction was not mentioned as confusing — the friction is in the interaction mechanics, not the model.
- Validation path: improve reminder UX (date/time picker, snooze behavior) and re-evaluate. If reminders become useful after UX fixes, mark validated.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/learnings/decision-history.md`, L-031

### A-011: Feature breadth across H3 workflows creates compound daily utility
- Date: 2026-03-22
- Area: product strategy
- Statement: Building all four H3 workflows (reminders, shared lists, recurring routines, meal planning) creates compound household value greater than any single deep workflow.
- Confidence: low
- Why it matters: this assumption drove the decision to build breadth across H3 before deepening any single workflow.
- Evidence so far: M29 household feedback (2026-03-22) challenges this assumption. The board reported that "all features contain the barebones of what I want, but don't contain enough of the actual functionality I need to be helpful." Each feature has specific friction points preventing daily use. The compound value theory is undermined when no individual feature crosses the usability threshold.
- Validation path: M30 should deepen the most-used features (lists, reminders, routines) to the daily-use threshold and then re-evaluate whether breadth + depth creates the expected compound value.
- Status: active (challenged)
- Related docs: L-031, D-012, D-065
