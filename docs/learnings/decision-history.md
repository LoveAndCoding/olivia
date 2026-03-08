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
- Status: active
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
