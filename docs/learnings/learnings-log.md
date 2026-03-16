# Learnings Log

## Purpose
This log captures durable lessons that future agents and collaborators should inherit. Entries should focus on reusable understanding, not session-by-session narration.

## Entry Template
Use this structure for future entries:

### L-XXX: Short learning title
- Date:
- Area:
- Learning:
- Why it matters:
- Implication:
- Source:
- Related docs:

## Current Learnings

### L-001: The product should be framed as a household command center, not a general AI assistant
- Date: 2026-03-08
- Area: product framing
- Learning: The most useful and executable product framing is a household command center focused on reducing coordination overhead, not a broad assistant identity.
- Why it matters: this creates a clearer product boundary and improves roadmap discipline.
- Implication: future specs should bias toward household operations, shared state, reminders, planning, and memory rather than open-ended assistant capabilities.
- Source: initial product-definition planning with the stakeholder
- Related docs: `docs/vision/product-vision.md`

### L-002: Durable project memory is a core project need, not optional process overhead
- Date: 2026-03-08
- Area: project operations
- Learning: Because Olivia is intended to be built agentically over time, learnings, assumptions, and decisions must be curated into durable docs rather than left in transient conversation history.
- Why it matters: future agents may start with limited context and still need to make coherent product decisions.
- Implication: strategic docs, learnings logs, and decision history should be maintained as part of normal delivery work.
- Source: stakeholder requirement during planning
- Related docs: `docs/strategy/agentic-development-principles.md`, `docs/learnings/README.md`

### L-003: Product management guidance must be explicit for agent-authored documentation
- Date: 2026-03-08
- Area: process design
- Learning: The project benefits from a documented PM operating model so future agents know they are expected to synthesize stakeholder input into recommendations rather than merely transcribe ideas.
- Why it matters: without this guidance, future agents may produce passive or low-signal documentation.
- Implication: product docs should reflect recommendation, rationale, and trade-offs rather than only option catalogs.
- Source: planning refinement with the stakeholder
- Related docs: `docs/strategy/agentic-development-principles.md`

### L-004: Local-first shared household products need a canonical shared store plus device-local caches
- Date: 2026-03-09
- Area: system architecture
- Learning: For Olivia's household use case, local-first should not mean browser-local-only storage. Shared household continuity works better when a household-controlled canonical store exists alongside device-local caches and offline outboxes.
- Why it matters: this clarifies a key architectural ambiguity that would otherwise recur whenever the project discusses privacy, offline behavior, or spouse visibility.
- Implication: future implementation work should distinguish clearly between canonical durable memory, client caches, and sync semantics rather than treating all local storage as equivalent.
- Source: architecture exploration for the shared household inbox workflow
- Related docs: `docs/strategy/system-architecture.md`, `docs/specs/shared-household-inbox.md`

### L-005: Stack cohesion matters less than keeping product-shaping seams explicit
- Date: 2026-03-09
- Area: architecture decision-making
- Learning: A single broader ecosystem can reduce integration overhead, but for Olivia's current phase the more important property is explicit control over product-shaping seams such as persistence, sync, approvals, and AI boundaries.
- Why it matters: this helps future agents evaluate frameworks without over-valuing single-stack consistency at the expense of trust, reversibility, or architectural legibility.
- Implication: Olivia should use TanStack heavily where it clearly fits the client problem, but remain selective about adopting broader ecosystem pieces when they would also define core data or AI boundaries prematurely.
- Source: architecture recommendation and follow-up stack evaluation
- Related docs: `docs/strategy/system-architecture.md`

### L-006: Once implementation exists, code and tests become meaningful orientation artifacts
- Date: 2026-03-13
- Area: agent workflow
- Learning: Olivia's docs remain the source of truth for product intent, but once the MVP exists, the codebase structure, shared contracts, domain rules, and tests become essential context for understanding current system behavior.
- Why it matters: future agents should not spend their token budget re-reading every strategic doc for routine implementation work when task-relevant code and tests provide more precise context.
- Implication: orientation guidance should be tiered by task, and implementation work should read the relevant spec or plan plus the corresponding code paths rather than defaulting to a full strategic reread.
- Source: Horizon 3 documentation refresh
- Related docs: `docs/strategy/agentic-development-principles.md`, `AGENTS.md`

### L-007: The inbox reminder deferral becomes a limiting constraint once Horizon 3 expands into routines and planning
- Date: 2026-03-13
- Area: product scope evolution
- Learning: Treating reminders only as inbox item properties was a useful MVP simplification, but it becomes a constraint once Olivia expands into first-class reminders, recurring routines, and broader planning support.
- Why it matters: Horizon 3 should build on the inbox without forcing every future workflow into the inbox's original data model.
- Implication: reminder and recurrence concepts should be reconsidered explicitly during Horizon 3 scoping rather than inherited unchanged from the MVP.
- Source: Horizon 3 roadmap and milestone update
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/decision-history.md`

### L-008: The tap-checkbox interaction pattern established in Shared Lists should be the standard for all completion interactions in Horizon 3
- Date: 2026-03-15
- Area: design system
- Learning: The Designer explicitly designed the tap-checkbox pattern in Shared Lists to be directly reusable for Recurring Routines. No new design decisions are needed for that primitive.
- Why it matters: this accelerates the Recurring Routines design phase because the core completion interaction has already been validated.
- Implication: Recurring Routines implementation should reuse the checkbox component from Shared Lists rather than introducing a new completion interaction. Drag-to-reorder, swipe-to-complete, and other variations remain deferred.
- Source: Designer review of OLI-16 (Shared Lists implementation), OLI-17 comments
- Related docs: `docs/plans/shared-lists-visual-implementation-spec.md`, `docs/specs/shared-lists.md`

### L-009: The per-screen spouse banner is the standard pattern for communicating read-only role across all Horizon 3 workflows
- Date: 2026-03-15
- Area: design system / trust model
- Learning: The per-screen banner approach (established in reminders, validated in Shared Lists) is now the confirmed standard for communicating the spouse's read-only role. Per-component disabled controls create confusion about whether the interface is broken.
- Why it matters: Recurring Routines and all future Horizon 3 workflows can adopt the banner pattern without reopening the design decision.
- Implication: any new Horizon 3 workflow with a spouse read-only state should use the same `--lavender-soft` bg, `--violet` text banner pinned below the screen header. No new design token or pattern is needed.
- Source: Designer review and visual spec for Shared Lists (Section 2.6 and screen state LIST-IDX-5 / LIST-DET-4)
- Related docs: `docs/plans/shared-lists-visual-implementation-spec.md`

### L-010: Horizon 3 workflows follow a predictable spec-then-design-then-implement cycle; the cycle itself is now stable and documented
- Date: 2026-03-15
- Area: project operations
- Learning: Two full Horizon 3 feature cycles (reminders, shared lists) established a clear pattern: VP of Product writes spec → Designer writes visual spec → Founding Engineer implements. Reviews and milestone updates run at the end of each cycle.
- Why it matters: future agents can follow this cycle without re-deriving process conventions, and each cycle ends with a predictable set of artifacts.
- Implication: the Recurring Routines cycle should follow the same pattern. Implementation tasks should not be created until the spec has CEO approval and the visual spec is complete.
- Source: Shared Lists cycle review (OLI-17)
- Related docs: `docs/roadmap/milestones.md`, `docs/learnings/decision-history.md`

### L-011: All four Horizon 3 workflows share a coherent coordination-layer model that emerged from building rather than design
- Date: 2026-03-15
- Area: product architecture
- Learning: Reminders, Shared Lists, Recurring Routines, and Meal Planning each introduce distinct workflow types, but all share the same underlying household-coordination model: named entities that can be viewed, actioned, and shared in a household context. This coherence was not designed in advance — it emerged from building all four workflows in sequence.
- Why it matters: the coordination layer is more unified than might have been expected. Future workflows can follow this same pattern without needing to re-justify each new surface.
- Implication: post-M7 planning should explicitly build on this model (reminders, lists, routines, meal plans as first-class household entities) rather than introducing disconnected tool surfaces. Adjacent problems — shopping-list integration with meal plans, household calendar, chore rotation — are natural extensions of this model.
- Source: completion of all four Horizon 3 workflows (OLI-34 and predecessors, 2026-03-15)
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/`

### L-012: Meal planning confirms the household command center thesis extends credibly into proactive planning
- Date: 2026-03-15
- Area: product validation
- Learning: Meal planning's recipe catalog plus weekly scheduling model goes beyond task and reminder management into proactive household planning. Its successful implementation confirms that the "household command center" framing can encompass planning workflows without losing coherence or overreaching into disconnected territory.
- Why it matters: this is the strongest structural evidence to date that Olivia's scope (shared state, reminders, routines, and planning) holds together as a coordination platform rather than a loosely related feature collection.
- Implication: the household command center is now validated as a product frame across four distinct workflow types. Post-M7 prioritization should identify adjacent planning and coordination problems that compound on these primitives — not new categories that would fragment the platform model.
- Source: meal planning spec (OLI-28), visual spec (OLI-32), implementation plan (OLI-33), full implementation (OLI-34)
- Related docs: `docs/specs/meal-planning.md`, `docs/plans/meal-planning-visual-implementation-spec.md`

### L-015: The unified weekly view established the cross-workflow temporal query pattern — activity history should follow the same shape backward in time
- Date: 2026-03-16
- Area: product architecture
- Learning: The unified weekly view implementation (OLI-45) delivered three domain helpers (getWeekBounds, getRoutineOccurrenceDatesForWeek, getRoutineOccurrenceStatusForDate) and a dedicated API endpoint (GET /api/weekly-view) that assembles cross-workflow scheduled state for a given calendar week. This pattern — a single query boundary, a domain layer that provides temporal helpers, a dedicated read-only API endpoint, and PWA assembly from cached H3 state — is the right shape for activity history as well, but looking backward at completed state rather than forward at scheduled state.
- Why it matters: the activity history implementation does not need to invent a new architectural approach. It can follow the weekly view pattern directly, substituting `completed_at`/`resolved_at` window queries for the weekly view's schedule-projection logic.
- Implication: the activity history implementation plan should describe the GET /api/activity-history endpoint, the 30-day window domain helper, and per-workflow-type completed-state queries in explicit parallel to the weekly view's domain and API layers. The Founding Engineer should confirm completion timestamp availability for all five H3 data sources before beginning Phase 1 implementation.
- Source: unified weekly view implementation (OLI-45, 2026-03-16)
- Related docs: `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/plans/unified-weekly-view-implementation-plan.md`

### L-014: Activity history and the unified weekly view form a complete temporal pair for Olivia's H4 layer
- Date: 2026-03-16
- Area: product architecture
- Learning: The unified weekly view (forward-looking: current week) and activity history (backward-looking: last 30 days) together provide continuous household time coverage without gaps or overlap. This temporal pair is the defining architectural pattern for Horizon 4's memory layer — present and future in one surface, recent past in the other.
- Why it matters: future H4 work (planning ritual support, AI summaries) should treat this pair as the foundation, not as two isolated features. Planning ritual support in particular will draw on activity history data to auto-populate weekly review content.
- Implication: the planning ritual support spec (the third H4 target) should explicitly reference activity history as its data source rather than re-deriving a separate history model. The data contract between the two should be defined in the planning ritual spec.
- Source: activity history feature spec (OLI-41, 2026-03-16)
- Related docs: `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/roadmap/roadmap.md`

### L-013: The unified weekly view is the natural first Horizon 4 surface — cross-workflow temporal context was the missing layer after four H3 workflows
- Date: 2026-03-16
- Area: product architecture
- Learning: After four Horizon 3 workflows (reminders, shared lists, recurring routines, meal planning), each operating in its own dedicated screen, the most immediately valuable Horizon 4 contribution is not a new entity type or AI capability — it is a unified temporal view that assembles existing H3 entities into a day-by-day picture of the household's week. The unified weekly view introduces no new data entities; it surfaces existing scheduled state in a cross-workflow context.
- Why it matters: this confirms that Olivia's H4 layer should start by synthesizing what already exists, not by introducing new primitives. The weekly view has clear value without AI — its value comes from aggregation and temporal context, not inference.
- Implication: future H4 specs (activity history, planning ritual support) should follow the same pattern: synthesize and surface existing H3 state before adding AI-generated narrative or new entity types. AI enhancement is a Phase 2 addition, not a Phase 1 requirement.
- Source: unified weekly view spec (OLI-38), D-022, D-024
- Related docs: `docs/specs/unified-weekly-view.md`, `docs/roadmap/roadmap.md`
