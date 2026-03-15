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
