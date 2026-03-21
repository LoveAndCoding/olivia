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

### D-062: Release criteria and versioning policy documented
- Date: 2026-03-21
- Area: process / release management
- Decision: Documented a release policy at `docs/release-policy.md` covering release criteria (feature completion, critical bug fix, accumulation threshold), semantic versioning rules (PATCH for fixes, MINOR for features, MAJOR reserved for 1.0.0), branching strategy (no release branches — keep it simple), incremental vs. batched release guidance, and role responsibilities (VP of Product assesses readiness and drafts changelog; Founding Engineer bumps version and opens upstream PR; board merges).
- Rationale: The team needed a clear, documented policy so release decisions are consistent and the Founding Engineer knows when to prepare upstream PRs without ad-hoc coordination.
- Alternatives considered: (1) Fixed cadence releases (e.g., weekly) — rejected as premature before M29 household validation produces regular usage feedback. (2) Release branches for hotfixes — rejected as unnecessary for current team size.
- Trade-offs: Simple process optimized for a small team; may need revision if team grows or release frequency increases.
- Status: active
- Related docs: `docs/release-policy.md`, OLI-195, `agents/founding-engineer/AGENTS.md` (git workflow section)

### D-061: Landscape orientation spec approved — CEO resolved open questions and added no-FOUC criterion
- Date: 2026-03-21
- Area: feature spec / layout
- Decision: Approve the landscape orientation support spec (OLI-183) with three resolved open questions: (1) Side rail nav on iPad landscape deferred. (2) App frame landscape max-width uses fluid `clamp()`. (3) iPad testing scope is verify-no-breakage only. Additionally, a 14th acceptance criterion was added: orientation change must not cause a visible layout flash or FOUC.
- Rationale: graceful adaptation, not a redesign. Portrait remains the primary design surface.
- Status: active
- Related docs: `docs/specs/landscape-orientation-support.md`, OLI-183, OLI-184

### D-060: Adopt spec-level CSS completeness checklist to prevent unstyled components from shipping
- Date: 2026-03-17
- Area: process / quality / UI delivery
- Decision: Add a mandatory acceptance criterion to the spec template requiring that all UI components have corresponding CSS styles before shipping. Also add a PR review template with a style completeness check.
- Rationale: OLI-136 revealed that NudgeCard, NudgeTray, and PushOptInPrompt shipped with BEM class names but zero CSS.
- Status: active
- Related docs: `docs/specs/spec-template.md`, OLI-136, OLI-138, L-028

### D-059: Phase 2 Data Freshness implementation validated — all 20 acceptance criteria pass
- Date: 2026-03-17
- Area: delivery / data freshness
- Decision: Phase 2 Data Freshness implementation is validated and ready to ship. 57 tests passing. Implementation covers extended staleness detection, monthly health check, freshness nudges, and "Still active?" confirmation pattern.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, OLI-121, OLI-124, OLI-125, D-058

### D-058: Phase 2 Data Freshness spec approved — CEO resolved 5 open questions
- Date: 2026-03-17
- Area: data freshness / product approval
- Decision: Approved Phase 2 Data Freshness standalone spec with decisions on all 5 open questions: monthly health check, 10-item cap, separate 2/day freshness nudge cap, health-check-only for meal plans, "Update" deep-link in health check.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, OLI-121, OLI-123, D-056, D-057

### D-057: Phase 1 Onboarding shipped — CEO final validation passed
- Date: 2026-03-17
- Area: delivery / onboarding
- Decision: Phase 1 Conversational Onboarding approved to ship. 7/8 acceptance criteria fully pass; inline edit of drafts deferred to fast-follow. 294 tests passing. Phase 2 (data freshness) planning begins immediately.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117, OLI-118, OLI-119, OLI-120, D-056

### D-056: Onboarding & Data Freshness spec approved — conversational brain-dump with phased rollout
- Date: 2026-03-17
- Area: onboarding / data freshness
- Decision: Approved the Improved Onboarding & Data Freshness spec. Key decisions: onboarding trigger ≤2 entities, monthly health check, conservative starter templates (5-7 routines, 2-3 lists), spouse onboarding deferred, batch creation inline in chat. Phase 1 (onboarding) ships first; Phase 2 (data freshness) after validation.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117

### D-055: Home Screen Declutter spec approved — Today-Forward layout
- Date: 2026-03-16
- Area: home screen / UI design
- Decision: Approved Home Screen Declutter replacing 7-day grid with Today-Forward layout. Today is hero zone, persistent workflow nav row, upcoming days as summary rows (max 3), new `/week` route, two new semantic tokens for WCAG AA compliance.
- Status: active
- Related docs: `docs/plans/home-screen-declutter-visual-implementation-spec.md`, OLI-111, OLI-114

### D-054: M29 defined as post-chat household validation gate
- Date: 2026-03-16
- Area: milestone definition / product strategy
- Decision: Define M29 as a usage-observation milestone requiring 2+ weeks of household usage, documented observations, and a usage-informed direction decision. Restores the validation gate that M28 was designed to provide but was bypassed by board directive (D-053).
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M29), D-053, D-052

### D-053: Chat interface chosen as H5 Phase 3 direction — board directive, M28 validation gate bypassed
- Date: 2026-03-16
- Area: product direction / H5 Phase 3
- Decision: The chat interface is the active Phase 3 direction. Board assigned OLI-95 directly, bypassing the M28 validation gate. The chat feature lets users interact with Olivia as a household-aware assistant. M28's usage-observation exit criteria were not met; assumptions A-007, A-008, A-009 remain unvalidated by household usage.
- Status: active
- Related docs: OLI-95, D-052, `docs/roadmap/roadmap.md`

## Archived Decisions (D-023 through D-052)

These decisions are milestone completions and spec approvals from the H4–H5 build cycle. Full text is in `decision-history-archive.md`. Consult that file only when you need the specific rationale or trade-offs.

| ID | Date | Summary |
|---|---|---|
| D-052 | 2026-03-16 | H5 Phase 2 complete — household validation pause before Phase 3 |
| D-051 | 2026-03-16 | M27 complete — completion-window push timing implemented |
| D-050 | 2026-03-16 | M26 complete — completion-window push timing build readiness |
| D-049 | 2026-03-16 | Completion-window implementation plan — 5 open questions resolved |
| D-048 | 2026-03-16 | Completion-window push timing spec approved |
| D-047 | 2026-03-16 | M25 complete — AI-enhanced nudge timing scoped (two-layer approach) |
| D-046 | 2026-03-16 | M24 complete — push notifications fully built |
| D-045 | 2026-03-15 | Push notifications spec approved |
| D-044 | 2026-03-16 | M21+M22 complete — real AI provider wiring built and validated |
| D-043 | 2026-03-15 | Real AI provider wiring spec approved |
| D-042 | 2026-03-15 | M20 complete — H5 Phase 2 scoped; real AI wiring first |
| D-041 | 2026-03-16 | M19 complete — H5 Phase 1 complete |
| D-040 | 2026-03-16 | M18 complete — proactive nudges build-ready |
| D-039 | 2026-03-15 | Proactive household nudges spec approved |
| D-038 | 2026-03-15 | M17 complete — proactive nudges named as second H5 target |
| D-037 | 2026-03-15 | M17 complete — AI-assisted summaries built; FK insert order pattern |
| D-036 | 2026-03-16 | M16 complete — AI-assisted summaries implementation plan approved |
| D-035 | 2026-03-15 | AI-assisted ritual summaries spec approved |
| D-034 | 2026-03-16 | M15 complete — H5 scoping; AI-assisted summaries first target |
| D-033 | 2026-03-16 | M14 complete — H4 third workflow built, temporal loop closed |
| D-032 | 2026-03-16 | Planning ritual support spec approved — M13 complete |
| D-031 | 2026-03-16 | M13 defined — H4 third workflow build readiness |
| D-030 | 2026-03-16 | M12 complete — H4 second workflow built |
| D-029 | 2026-03-16 | M11 complete — H4 second workflow build readiness |
| D-028 | 2026-03-15 | Activity history spec approved |
| D-027 | 2026-03-16 | M10 complete — H4 first workflow built |
| D-026 | 2026-03-16 | M9 complete — H4 build readiness achieved |
| D-025 | 2026-03-16 | Planning ritual support spec drafted (third H4 target) |
| D-024 | 2026-03-16 | M8 complete — H4 scoping achieved |
| D-023 | 2026-03-16 | M7 complete — coordination layer advanced on implementation completeness |

## Foundational Decisions

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
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`

### D-003: Durable learnings will be documented as a first-class system
- Date: 2026-03-08
- Area: project operations
- Decision: Maintain a dedicated learnings system for assumptions, learnings, and decision history.
- Rationale: future agents may begin with minimal context, so durable memory must exist outside any single conversation.
- Status: active
- Related docs: `docs/learnings/README.md`, `docs/strategy/agentic-development-principles.md`

### D-004: The earliest workflow will use a primary-operator model
- Date: 2026-03-08
- Area: MVP definition
- Decision: The first workflow assumes the stakeholder is the primary operator, with household-shared context and possible spouse visibility.
- Rationale: preserves household focus without forcing premature multi-user collaboration complexity.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`

### D-005: Reminders are not a first-class object in the inbox spec
- Date: 2026-03-08
- Area: feature scope
- Decision: In the shared household inbox spec, reminders are item properties rather than separate entities.
- Status: superseded
- Related docs: `docs/specs/shared-household-inbox.md`

### D-006: The inbox spec is channel-agnostic
- Date: 2026-03-08
- Area: feature scope
- Decision: The inbox spec defines workflow and data model without prescribing a delivery surface.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`

### D-007: The MVP interface will be an installable mobile-first PWA
- Date: 2026-03-08
- Area: interface strategy
- Decision: Olivia's MVP uses an installable, mobile-first PWA. Native clients deferred unless usage justifies them.
- Status: active
- Related docs: `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`

### D-008: Near-term implementation planning will target a local-first modular monolith
- Date: 2026-03-09
- Area: system architecture
- Decision: TypeScript modular monolith with installable PWA client, household-controlled SQLite store, browser-local offline cache and outbox, explicit versioned command sync, and AI behind a narrow provider adapter boundary.
- Rationale: matches advisory-only writes, local-first privacy, mobile-first capture, and low write concurrency.
- Status: active
- Related docs: `docs/strategy/system-architecture.md`

### D-009: The shared household inbox spec is approved for implementation planning
- Date: 2026-03-09
- Area: delivery planning
- Decision: Treat the inbox spec as approved and implementation-ready.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`

### D-010: Non-destructive user actions execute immediately; agentic actions require confirmation
- Date: 2026-03-13
- Area: product behavior / trust model
- Decision: Differentiate between agentic actions (require confirmation) and non-destructive user actions (execute immediately). Destructive actions always require confirmation regardless of source.
- Rationale: advisory-only trust model protects against Olivia acting autonomously, not against user-expressed intent. Reversibility is built into normal UI.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/specs/shared-household-inbox.md`

### D-011: Horizon 2 is complete enough to move into Horizon 3
- Date: 2026-03-13
- Area: roadmap progression
- Decision: Treat H2 and associated MVP milestones as complete. Move into H3 planning.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`

### D-012: Horizon 3 priorities are reminders, shared lists, recurring routines, and meal planning
- Date: 2026-03-13
- Area: product strategy
- Decision: H3 priorities in order: first-class reminders → shared lists → recurring routines → meal planning.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`

### D-013: Reminders will be reconsidered as a first-class Horizon 3 capability
- Date: 2026-03-13
- Area: feature scope
- Decision: H3 should explicitly revisit the MVP choice to treat reminders as item properties and scope reminders as an active product area.
- Status: active

### D-014: First-class reminders will use a hybrid standalone-or-linked model
- Date: 2026-03-13
- Area: feature scope
- Decision: Reminders are first-class objects that may stand alone or link to an inbox item.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`

### D-015: The first reminder implementation slice will stay narrowly bounded
- Date: 2026-03-13
- Area: feature scope
- Decision: Defer reminder-to-inbox conversion, use minimal notification settings, preserve missed history in timeline only.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`

### D-016: Shared Lists A-007 validated — shared lists are behaviorally distinct from inbox
- Date: 2026-03-15
- Area: feature scope
- Decision: A-007 validated. Checklist behavior differs enough from inbox behavior to justify the separate workflow model.
- Status: active
- Related docs: `docs/specs/shared-lists.md`, `docs/learnings/assumptions-log.md` (A-007)

### D-017: Recurring Routines is the next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: After Shared Lists, the next H3 target is Recurring Routines.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/recurring-routines.md`

### D-018: M6 complete — all planned H3 workflows built
- Date: 2026-03-15
- Area: roadmap progression
- Decision: M6 (Coordination Layer Build Readiness) complete. All three H3 workflows specified, planned, and built.
- Status: active

### D-019: Meal planning confirmed as next H3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: Meal planning is the next H3 target. Scoped narrowly to weekly meal planning with grocery list via shared lists.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md` (A-009)

### D-020: Meal planning spec drafted
- Date: 2026-03-15
- Area: delivery planning
- Decision: Meal planning spec drafted, scoped to weekly meal planning → grocery list via Shared Lists.
- Status: active
- Related docs: `docs/specs/meal-planning.md`

### D-021: Meal planning spec approved by CEO
- Date: 2026-03-15
- Area: delivery planning
- Decision: Approved `docs/specs/meal-planning.md` for implementation planning.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, D-019, D-020

### D-022: Horizon 4 first spec target is unified weekly view
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: First H4 target is the unified weekly view — cross-workflow week-at-a-glance surface. Activity history second, planning ritual support third.
- Rationale: adds the temporal and cross-workflow dimension missing after four H3 workflows all operate in their own views. No new entities — surfaces existing H3 state.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`
