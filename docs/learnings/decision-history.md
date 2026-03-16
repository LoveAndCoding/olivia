# Decision History

## Purpose
This log records meaningful product and project decisions so future agents can understand not only what was chosen, but why.

## Entry Template
Use this structure for future entries:

### D-XXX: Short decision title
- Date:
- Area:
- Decision:
- Rationale:
- Alternatives considered:
- Trade-offs:
- Status: active | superseded
- Related docs:

## Current Decisions

### D-001: Olivia will be positioned as a household command center
- Date: 2026-03-08
- Area: product strategy
- Decision: Define Olivia primarily as a household command center rather than a general AI companion.
- Rationale: this framing creates a more focused product boundary and better aligns with the stakeholder's goal of reducing household management overhead.
- Alternatives considered: a general personal assistant framing; a narrower single-purpose reminder or task tool.
- Trade-offs: gains focus and execution clarity, but intentionally delays broader assistant ambitions.
- Status: active
- Related docs: `docs/vision/product-vision.md`

### D-002: Olivia will start with an advisory-only trust model
- Date: 2026-03-08
- Area: product behavior
- Decision: Olivia should suggest, summarize, draft, and organize, but not take consequential actions without explicit approval in the first major phase.
- Rationale: advisory behavior matches the project's privacy-first, trust-building posture and reduces early product risk.
- Alternatives considered: human-in-the-loop execution; limited low-risk autonomy.
- Trade-offs: reduces automation upside in the near term, but increases user trust and product legibility.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`

### D-003: Durable learnings will be documented as a first-class system
- Date: 2026-03-08
- Area: project operations
- Decision: Maintain a dedicated learnings system for assumptions, learnings, and decision history.
- Rationale: future agents may begin with minimal context, so durable memory must exist outside any single conversation.
- Alternatives considered: relying primarily on conversation transcripts or ad hoc project notes.
- Trade-offs: adds documentation discipline overhead, but greatly improves continuity and reduces rediscovery.
- Status: active
- Related docs: `docs/learnings/README.md`, `docs/strategy/agentic-development-principles.md`

### D-005: Reminders are not a first-class object in the inbox spec
- Date: 2026-03-08
- Area: feature scope
- Decision: In the shared household inbox spec, reminders are represented as a property of inbox items (due date and timeframe) rather than as a separate entity type.
- Rationale: keeping reminders as item properties reduces the data model complexity for the first spec and avoids locking in a reminder architecture before inbox usage patterns are understood. A dedicated reminder spec can be written once real use reveals what reminders need to do.
- Alternatives considered: modeling reminders as first-class objects from the start with links to inbox items.
- Trade-offs: simpler initial data model and narrower spec scope, but may require a data migration or model expansion later if reminders turn out to need richer behavior.
- Status: superseded
- Related docs: `docs/specs/shared-household-inbox.md`

### D-006: The inbox spec is channel-agnostic and does not prescribe an interface surface
- Date: 2026-03-08
- Area: feature scope
- Decision: The shared household inbox feature spec defines the workflow and data model without specifying a delivery surface (Slack, web UI, CLI, or other).
- Rationale: this preserves the optionality described in A-003 and ensures the spec can be used regardless of which surface the stakeholder decides to validate first.
- Alternatives considered: writing a Slack-specific spec; writing a web UI-specific spec.
- Trade-offs: the spec is more portable, but the project later needed a separate interface decision for implementation planning. That later decision is captured in D-007.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`, `docs/learnings/assumptions-log.md` (A-003), `docs/learnings/decision-history.md` (D-007)

### D-004: The earliest workflow will use a primary-operator model
- Date: 2026-03-08
- Area: MVP definition
- Decision: The first implementation-ready workflow should assume the stakeholder is the primary operator, while allowing household-shared context and possible spouse visibility or lightweight participation.
- Rationale: this preserves the household focus without forcing premature complexity around full multi-user collaboration, permissions, and interface design.
- Alternatives considered: full two-user parity from the first spec; purely single-user operation with no household-shared context.
- Trade-offs: increases early focus and feasibility, but delays richer collaboration design until later horizons.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`, `docs/specs/first-workflow-candidates.md`

### D-007: The MVP interface will be an installable mobile-first PWA
- Date: 2026-03-08
- Area: interface strategy
- Decision: Olivia's MVP should use an installable, mobile-first PWA as its canonical interface surface, with notifications aimed primarily at the stakeholder and native clients deferred unless later usage justifies them.
- Rationale: the stakeholder's current household workflow requires low-friction mobile capture and structured review, while the product still benefits from reversible implementation choices. A PWA provides app-like installability, cross-device reach, and sufficient support for the current advisory-only inbox workflow without forcing an early native commitment.
- Alternatives considered: Slack as the primary interface; a desktop-first local web app; fully native mobile apps from the start.
- Trade-offs: gains speed, reversibility, and a shared cross-platform surface, but may later require a native shell if notification depth, widgets, or richer cross-app capture become core product needs.
- Status: active
- Related docs: `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`, `docs/vision/product-vision.md`

### D-008: Near-term implementation planning will target a local-first modular monolith
- Date: 2026-03-09
- Area: system architecture
- Decision: For near-term implementation planning, Olivia should target a TypeScript modular monolith with an installable PWA client, a household-controlled SQLite canonical store, browser-local offline cache and outbox, explicit versioned command sync, and AI behind a narrow provider adapter boundary.
- Rationale: this architecture best matches Olivia's current product shape: advisory-only writes, local-first handling of sensitive household data, mobile-first capture, and low expected write concurrency. It also keeps the system legible enough for future implementation agents without prematurely committing to heavier infrastructure.
- Alternatives considered: a broader all-in-one TanStack-centered stack; a cloud-first SaaS architecture; a native-mobile-first architecture; a CRDT-heavy local-first design.
- Trade-offs: gains clear boundaries, easier reasoning about trust and sync, and more reversible infrastructure choices, but uses a composed stack rather than a single ecosystem and may later need revision if notifications, concurrency, or native-only capabilities become more important than expected.
- Status: active
- Related docs: `docs/strategy/system-architecture.md`, `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`

### D-010: Non-destructive user-initiated actions execute immediately; agentic actions still require confirmation
- Date: 2026-03-13
- Area: product behavior / trust model
- Decision: Differentiate between agentic actions (Olivia-proposed) and user actions (directly commanded by the user). Agentic actions continue to require explicit user confirmation before execution. Non-destructive user actions execute immediately — reversibility is built into the normal UI rather than being a separate undo mechanism. Destructive actions (archive, permanent delete) always require confirmation regardless of whether they were user-initiated or suggested.
- Rationale: The advisory-only trust model exists to prevent Olivia from acting on its own judgment without human approval. When the human is already expressing their own judgment through a direct command, the preview → confirm dance adds no meaningful protection and increases friction. Non-destructive actions are inherently reversible through normal UI interactions, so no special undo mechanism is needed. Destructive actions remain gated because they cannot be easily reversed.
- Alternatives considered: Keeping the uniform confirm model for all writes. Removing all confirmation from user actions including destructive ones.
- Trade-offs: More responsive for direct user commands; slightly more implementation complexity to distinguish action sources in the UI. Advisory protection is unchanged for agentic suggestions.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/specs/shared-household-inbox.md`, `docs/glossary.md`

### D-009: The shared household inbox spec is approved for implementation planning
- Date: 2026-03-09
- Area: delivery planning
- Decision: Treat `docs/specs/shared-household-inbox.md` as approved and implementation-ready for planning purposes, and use it as the first workflow artifact for the next planning stage.
- Rationale: the spec now has concrete workflow scope, acceptance criteria, trust-model constraints, testing expectations, and bounded open questions, so another agent should be able to produce an implementation plan without re-deriving basic product intent.
- Alternatives considered: leaving the spec in draft pending more product refinement; approving only the workflow direction without approving the full spec for planning.
- Trade-offs: gains momentum and a clearer handoff into implementation planning, but shifts remaining execution ambiguity into explicit planning work rather than allowing further open-ended product refinement first.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`, `docs/roadmap/milestones.md`, `docs/strategy/system-architecture.md`

### D-011: Horizon 2 is complete enough to move Olivia into Horizon 3
- Date: 2026-03-13
- Area: roadmap progression
- Decision: Treat Horizon 2 and the associated MVP milestones as complete, and move Olivia into Horizon 3 planning and documentation.
- Rationale: Olivia now has a working shared household inbox implementation and a clear enough product baseline to expand into the next product horizon without reopening the original MVP wedge.
- Alternatives considered: waiting for a longer household-validation period before broadening the roadmap; continuing to treat the project as an MVP-only effort.
- Trade-offs: gains product momentum and clearer post-MVP planning, but accepts that some Horizon 2 validation remains implementation-shaped rather than usage-shaped.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`

### D-012: Horizon 3 priorities are reminders, shared lists, recurring routines, and later meal planning
- Date: 2026-03-13
- Area: product strategy
- Decision: Horizon 3 should focus first on first-class reminders, then shared lists, then recurring household routines, with meal planning explicitly positioned as a later Horizon 3 workflow. The first new feature-spec target should therefore be `first-class reminders`.
- Rationale: these priorities extend Olivia's household coordination model directly from the MVP while staying close to the stakeholder's highest-priority household pain points.
- Alternatives considered: broadening Horizon 3 evenly across all possible coordination features; prioritizing spouse collaboration or memory-first workflows before reminders and lists.
- Trade-offs: improves focus and sequencing, but intentionally defers some attractive adjacent workflows until shared coordination primitives are clearer.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/vision/product-vision.md`

### D-013: Reminders will be reconsidered as a first-class Horizon 3 capability
- Date: 2026-03-13
- Area: feature scope
- Decision: Horizon 3 should explicitly revisit the MVP choice to model reminders only as inbox item properties and should treat first-class reminders as an active product-scoping area.
- Rationale: the MVP simplification served the inbox workflow well, but Horizon 3 expands into recurring routines and planning support where reminder behavior likely deserves its own product model.
- Alternatives considered: keeping reminders embedded in inbox items indefinitely; immediately defining the final reminder architecture during roadmap refresh.
- Trade-offs: creates some product and modeling work in Horizon 3, but avoids forcing future coordination workflows into an MVP-specific simplification.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md`, `docs/specs/shared-household-inbox.md`

### D-014: First-class reminders will use a hybrid standalone-or-linked model
- Date: 2026-03-13
- Area: feature scope
- Decision: The first Horizon 3 reminder spec should treat reminders as first-class objects that may either stand alone or link to an existing inbox item, while keeping the inbox as Olivia's capture and action foundation.
- Rationale: this model preserves the MVP inbox as the center of household follow-through while making room for legitimate reminder-only use cases that do not belong as active inbox work.
- Alternatives considered: requiring every reminder to belong to an inbox item; treating reminders as a primarily separate standalone workflow with optional inbox links later.
- Trade-offs: introduces more product-model complexity than keeping reminders as due fields alone, but avoids forcing reminder-only use cases into the inbox and avoids creating a disconnected second workflow.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/specs/shared-household-inbox.md`, `docs/roadmap/roadmap.md`

### D-015: The first reminder implementation slice will stay narrowly bounded
- Date: 2026-03-13
- Area: feature scope
- Decision: The first implementation slice for first-class reminders should defer direct reminder-to-inbox conversion, use a minimal reminder notification settings model consisting of overall enable or disable plus per-type controls for `due reminders` and `daily summary`, and preserve missed recurring reminder history only in the reminder timeline rather than as a separate workflow or state.
- Rationale: these choices keep the first reminder implementation concrete and useful without reopening adjacent product areas such as inbox conversion flows, rich notification policy, or recurring-routine complexity.
- Alternatives considered: allowing reminder-to-inbox conversion in the first slice; using only a single notification toggle; introducing quiet hours or richer notification controls; creating explicit missed-occurrence state.
- Trade-offs: keeps the first implementation focused and easier to execute, but intentionally defers some convenience behaviors and richer control that may later prove valuable in real household use.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/specs/shared-household-inbox.md`

### D-016: Shared Lists assumption A-007 is validated — shared lists are behaviorally distinct from inbox items
- Date: 2026-03-15
- Area: feature scope / product strategy
- Decision: Treat A-007 as validated. The Shared Lists workflow was specified, implemented, and reviewed with full spec compliance. The behavioral distinction (checklist with immediate check/uncheck vs. tracked work item with owner and status) was confirmed to be real and product-meaningful.
- Rationale: the spec, visual implementation, and working implementation collectively demonstrate that list behavior differs enough from inbox behavior that the separate workflow model was the right choice.
- Alternatives considered: folding lists back into the inbox as a "list mode" item type — this alternative is now confirmed to be the wrong direction.
- Trade-offs: maintaining a separate workflow model adds surface area to the product, but reduces confusion between accountability-style work (inbox) and checklist-style coordination (lists).
- Status: active
- Related docs: `docs/specs/shared-lists.md`, `docs/plans/shared-lists-visual-implementation-spec.md`, `docs/learnings/assumptions-log.md` (A-007)

### D-018: M6 is complete — all planned Horizon 3 workflows are built
- Date: 2026-03-15
- Area: roadmap progression
- Decision: Treat M6 (Coordination Layer Build Readiness) as complete. All three planned Horizon 3 workflows — first-class reminders, shared lists, and recurring routines — have approved specs, implementation plans, and fully executed implementations.
- Rationale: all M6 exit criteria are met: specs have acceptance criteria and trust-model documentation, shared infrastructure decisions (recurrence, see A-008) are bounded and reusable, and implementation agents can begin the next build phase from the existing docs without rediscovering the product model.
- Alternatives considered: waiting for household usage validation before marking M6 complete. Household usage remains M7 territory; M6 is a build-readiness gate, not a usage gate.
- Trade-offs: advancing M6 to complete clarifies that the next product question is what to spec next rather than what to implement next. The open question (meal planning vs. other priorities) is routed to the CEO via OLI-26.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/roadmap/roadmap.md`

### D-019: Meal planning confirmed as next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: Meal planning is confirmed as the next Horizon 3 spec target. VP of Product should proceed with writing the feature spec. The first slice should be scoped narrowly — weekly meal planning — but explicitly designed to generate a grocery shopping list using the shared lists primitive. The spec should not attempt to solve the full meal planning problem.
- Rationale: all prerequisite conditions from A-009 are now met (recurring and list primitives built and validated). The roadmap direction to "connect cleanly to shared lists and routine planning rather than becoming a standalone kitchen app" provides clear scope guidance for the first slice. No documented friction in existing workflows has surfaced to suggest a higher-priority gap. M7 household validation notes are not yet collected, but waiting on them before starting spec work would stall product momentum unnecessarily; if real friction emerges during validation, the spec can be adjusted.
- Alternatives considered: blocking spec work pending M7 household validation; starting with a spouse write-access expansion for existing workflows instead; doing a broader meal planning spec that includes full recipe and nutrition management.
- Trade-offs: proceeding now keeps product momentum; scoping narrowly avoids over-engineering before household use patterns are understood; connecting to shared lists preserves the product coherence principle from the roadmap rather than creating a disconnected kitchen tool.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md` (A-009), `docs/roadmap/milestones.md`

### D-021: Meal planning spec approved by CEO
- Date: 2026-03-15
- Area: delivery planning
- Decision: Approve `docs/specs/meal-planning.md` for implementation planning. The spec is complete, correctly scoped, and properly integrated with the Shared Lists primitive. The VP of Product should proceed with creating a Designer task for the visual spec to begin the standard H3 implementation cycle.
- Rationale: the spec meets all quality gates — full template coverage, correct trust model application (D-002, D-010), 13 concrete acceptance criteria, clean integration with the proven Shared Lists primitive, and appropriate scope boundaries. No open questions block Phase 1. One architectural ambiguity (shopping item storage granularity for the FE) is correctly deferred to the implementation planning stage.
- Alternatives considered: requesting changes to scope or workflow. No changes warranted — the spec follows D-019 guidance exactly and is execution-ready.
- Trade-offs: approving now maintains product momentum; the two FE architecture decisions and three designer decisions are appropriately deferred to implementation planning and the visual spec.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, `docs/learnings/decision-history.md` (D-019, D-020)

### D-020: Meal planning spec drafted and submitted for CEO approval
- Date: 2026-03-15
- Area: delivery planning
- Decision: Treat `docs/specs/meal-planning.md` as drafted and ready for CEO review before implementation planning begins. The spec is scoped narrowly to weekly meal planning (plan meals per day → generate a grocery list via Shared Lists), with recipe management, nutrition tracking, and meal history analytics explicitly deferred.
- Rationale: the spec follows the scope guidance from D-019 (weekly first slice, shared lists connection required, kitchen-app scope excluded). All prerequisite Horizon 3 primitives are proven. The spec leaves implementation ambiguity bounded to two architecture decisions for the Founding Engineer (bulk vs. individual item commands; grocery-list creation sequencing) and several visual spec decisions for the Designer.
- Alternatives considered: broader scope including saved recipes or meal favorites; narrower scope limited to only dinner slots per day.
- Trade-offs: narrow scope reduces Phase 1 value ceiling but maximizes execution clarity and preserves ability to expand based on household usage patterns.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, `docs/learnings/decision-history.md` (D-019), `docs/specs/shared-lists.md`

### D-022: Horizon 4 first spec target is unified weekly view
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: The first Horizon 4 feature-spec target is the unified weekly view — a single surface showing the household's week at a glance across all H3 workflow types (reminders due, routines scheduled, meals planned, inbox items outstanding). Activity history is second priority; planning ritual support is third.
- Rationale: the unified weekly view is the natural "household command center" summary the existing coordination layer implicitly needs. It adds the temporal and cross-workflow dimension that is missing after four H3 workflows all operate in their own views. It does not introduce new entities — it surfaces existing H3 entities in a cross-workflow context, which minimizes product ambiguity and maximizes compounding value. L-011 confirms all four H3 workflows share a coherent model that this view can draw from.
- Alternatives considered: starting with AI-driven smart digest (too dependent on AI tuning before the surface is proven useful); starting with activity history (less actionable on first use than the forward-looking weekly view); opening spouse write-access expansion instead (a different problem class, deferred for good reasons per D-004).
- Trade-offs: the weekly view is narrower than a full household memory model, but sets the right foundation — cross-workflow temporal context — before introducing AI summarization or longer-term recall. Scoping to one week at a time matches the household's natural planning rhythm and keeps the first spec bounded.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`, `docs/learnings/learnings-log.md` (L-011, L-012)

### D-024: M8 is complete — Horizon 4 scoping achieved with unified weekly view spec and H4 roadmap
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M8 (Horizon 4 Scoping) to complete. All required artifacts exist and all exit criteria are met. The H4 roadmap defines three workflow targets (unified weekly view → activity history → planning ritual support). The first H4 feature spec is written and approved. M9 (Horizon 4 Build Readiness) is now the active milestone.
- Rationale: (1) The H4 roadmap is documented and concrete — sequencing and rationale are in `docs/roadmap/roadmap.md` and D-022. (2) The relationship between the H3 coordination layer and the H4 memory/planning layer is described in both the roadmap and the unified weekly view spec. (3) The next workflow area (unified weekly view) is specific enough to enter implementation planning without ambiguity — the spec exists and acceptance criteria are written. L-013 captures the architectural learning that H4 should synthesize existing H3 state before introducing new primitives or AI.
- Alternatives considered: waiting for household usage data before closing M8; requiring a second H4 spec before advancing.
- Trade-offs: advancing now enables M9 build readiness to begin immediately; activity history and planning ritual support specs remain as pending M9 work.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/specs/unified-weekly-view.md`, `docs/learnings/learnings-log.md` (L-013), D-022, D-023

### D-023: M7 is complete — coordination layer advanced based on implementation completeness
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M7 (Coordination Layer In Use) to complete following the M4 precedent — implementation completeness and product-shape confidence are sufficient to move forward. Do not wait for household usage observations before beginning M8 scoping.
- Rationale: all four Horizon 3 workflows (reminders, shared lists, recurring routines, meal planning) are built and available in the PWA. Structural evidence satisfies all three exit criteria. L-011 and L-012 provide build-phase evidence adequate for post-M7 direction. Blocking M8 scoping on usage data would stall product momentum without proportionate benefit; the household will validate during use.
- Alternatives considered: requiring actual household usage notes before marking M7 complete; partial advancement pending specific usage evidence.
- Trade-offs: advancing now keeps product momentum and allows M8 scoping to begin immediately; usage-shaped learning is accepted as ongoing rather than a required gate condition.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/learnings/learnings-log.md` (L-011, L-012), `docs/learnings/decision-history.md` (D-022)

### D-025: Planning ritual support spec drafted as the third H4 target
- Date: 2026-03-16
- Area: delivery planning
- Decision: Draft `docs/specs/planning-ritual-support.md` as the third Horizon 4 spec target, scoped to a weekly household review ritual that uses the existing recurring routines infrastructure for scheduling and draws from activity history and unified weekly view data sources for content. The Phase 1 review flow has three sections: last week recap, coming week overview, and carry-forward notes. No AI is required for Phase 1.
- Rationale: this spec follows the H4 sequencing confirmed in D-022 and the architectural principle in L-013 (synthesize existing H3 state before introducing AI or new primitives). Planning ritual support completes the H4 temporal layer: the weekly view covers the present and near future, activity history covers the recent past, and the planning ritual creates a structured synthesis moment. Using the recurring routines infrastructure avoids introducing a new workflow primitive and reuses proven scheduling and lifecycle behavior. The three-section review flow is the minimum viable ritual that adds meaningful synthesis value over using the weekly view and activity history separately.
- Alternatives considered: scoping Phase 1 with AI-generated summaries included (rejected — L-013 establishes synthesis-first before AI enhancement); defining a new "ritual" entity type separate from recurring routines (rejected — the recurring routines infrastructure handles all scheduling, lifecycle, and occurrence tracking needs without modification).
- Trade-offs: narrow Phase 1 scope maximizes execution clarity but defers carry-forward action conversion, shared spouse participation, and AI narrative — all of which are the high-value extensions that make the ritual feel fully realized. Phase 2 scope is clear and well-bounded.
- Status: active
- Related docs: `docs/specs/planning-ritual-support.md`, `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/specs/recurring-routines.md`, D-022, L-013, L-014

### D-017: Recurring Routines is the next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: After Shared Lists implementation completes, the next Horizon 3 feature spec target is Recurring Routines — household tasks that repeat on a defined schedule such as chores, maintenance, and bills.
- Rationale: recurring routines are the third explicit Horizon 3 priority and are the natural next workflow after shared lists. The recurrence model introduced by first-class reminders provides a foundation that recurring routines can extend. The tap-checkbox pattern from shared lists is directly reusable for routine completion.
- Alternatives considered: jumping to meal planning; expanding shared lists with spouse write access before moving to routines.
- Trade-offs: focuses on a new workflow type rather than deepening existing workflows; meal planning and spouse write parity remain deferred.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/recurring-routines.md`
