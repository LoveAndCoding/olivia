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
