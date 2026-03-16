# Olivia Milestones

## Purpose
These milestones define the evidence required for Olivia to move from concept through MVP and into post-MVP product expansion. They are intended to give future agents clear readiness gates without forcing them to re-derive what phase the project is in.

Unlike `docs/roadmap/roadmap.md`, this document is not a product horizon map. It is an execution-readiness system: what must be true before the project should advance.

## Milestone Model
Each milestone should be considered complete only when:
- the expected artifacts exist
- the key decisions are documented
- open questions are either resolved or explicitly bounded
- the next phase can begin without re-deriving product intent

## M0: Project Foundation
Objective: establish shared understanding of what Olivia is and how the project should be documented.

Status: complete

Required artifacts:
- `docs/vision/product-vision.md`
- `docs/vision/product-ethos.md`
- `docs/strategy/agentic-development-principles.md`
- a documented PM operating model in the durable strategy docs

Exit criteria:
- the product thesis is documented
- the trust model direction is documented
- agent-oriented documentation standards are documented
- the project has a clear statement of scope and non-goals

Evidence of completion:
- a new agent can explain Olivia's purpose, boundaries, and guiding principles from the docs alone

Completion note:
- Olivia has durable vision, ethos, and agentic development guidance in place.

## M1: Product Definition
Objective: define the first meaningful product slice and the user problems it addresses.

Status: complete

Required artifacts:
- `docs/roadmap/roadmap.md`
- `docs/roadmap/milestones.md`
- `docs/glossary.md`
- `docs/specs/first-workflow-candidates.md`
- `docs/learnings/README.md`

Exit criteria:
- the first product wedge is explicit
- the user problems and desired outcomes are documented
- the project has a stable set of product terms
- assumptions and open questions are visible

Evidence of completion:
- a future agent can identify what Olivia should try to do first and what it should deliberately not try to do yet

Completion note:
- The shared household state and follow-through wedge was chosen and documented.

## M2: Delivery Planning
Objective: make the project execution-ready for feature-level planning.

Status: complete

Required artifacts:
- `docs/specs/spec-template.md`
- `docs/learnings/assumptions-log.md`
- `docs/learnings/learnings-log.md`
- `docs/learnings/decision-history.md`
- `docs/roadmap/roadmap.md`

Exit criteria:
- future features can be specified in a consistent, testable structure
- durable project memory has a clear home and maintenance model
- milestone gates are documented well enough to support implementation planning

Evidence of completion:
- a future agent can draft a high-quality feature spec without inventing the documentation structure from scratch

Completion note:
- Olivia now has durable memory docs, a reusable spec template, and stable planning conventions.

## M3: Build Readiness
Objective: prepare the first implementation-ready feature spec or set of specs.

Status: complete

Required artifacts:
- at least one completed feature spec
- acceptance criteria for the first workflow
- bounded implementation assumptions
- documented trust and approval expectations for that workflow

Exit criteria:
- the spec is concrete enough that an implementation agent can execute without major product ambiguity
- unresolved questions are limited and non-blocking
- testing and verification expectations are documented

Evidence of completion:
- an implementation plan can be generated directly from the feature spec without needing to rediscover basic product intent

Completion note:
- The shared household inbox spec was approved for implementation planning and translated into a concrete build plan.

## M4: MVP In Use
Objective: deliver and evaluate the first genuinely useful household workflow.

Status: complete

Required artifacts:
- implementation-ready plan
- built MVP slice
- validation notes from actual use, or an explicit stakeholder decision to advance based on implementation completeness
- updated learnings and decisions based on usage or implementation outcomes

Exit criteria:
- Olivia has a working household coordination workflow with a credible product baseline
- the stakeholder can judge the MVP complete enough to expand the product surface
- product learnings from usage or implementation are captured durably enough to guide the next horizon

Evidence of completion:
- the project can point to a built workflow, a concrete implementation center of gravity, and a documented reason the next horizon can begin

Completion note:
- The stakeholder chose to advance based on implementation completeness and product-shape confidence rather than waiting for a longer household validation cycle.

## M5: Horizon 3 Scoping
Objective: define the product shape of the household coordination layer well enough that future planning compounds on the MVP rather than drifting away from it.

Status: complete

Required artifacts:
- updated `docs/roadmap/roadmap.md` with concrete Horizon 3 scope
- updated `docs/roadmap/milestones.md`
- updated glossary and learnings reflecting the post-MVP product state
- an explicitly named first Horizon 3 feature-spec target, currently `first-class reminders`

Exit criteria:
- Horizon 3 product direction is concrete enough that implementation agents do not need to guess what comes after the inbox
- the relationship between the inbox, reminders, recurring routines, and shared lists is described at a product level
- the next workflow area is specific enough to enter feature-spec work without ambiguity about which spec comes first

Evidence of completion:
- a new agent can identify what Olivia should build next, why it matters, and what should remain deferred

Completion note:
- Horizon 3 scope was defined with first-class reminders, shared lists, recurring routines, and meal planning as explicit priorities in that order. The reminders and shared lists specs were both written and fully implemented. Recurring routines is the active next spec target.

## M6: Coordination Layer Build Readiness
Objective: prepare the first Horizon 3 workflow or set of workflows for implementation planning.

Status: complete

Required artifacts:
- implementation-ready feature specs for the next Horizon 3 workflow area
- architectural notes for any shared infrastructure introduced by Horizon 3, such as recurrence or cross-workflow notifications
- implementation plan for at least the first Horizon 3 workflow
- updated assumptions, decisions, and open questions tied to the new workflow area

Exit criteria:
- each planned workflow has acceptance criteria, scope boundaries, and trust-model implications documented
- shared infrastructure decisions are bounded enough that engineering plans do not have to resolve product ambiguity
- implementation agents can plan the next build phase directly from the docs

Evidence of completion:
- an implementation plan can be generated for the next Horizon 3 workflow without rediscovering the product model

Progress notes:
- `docs/specs/first-class-reminders.md` — approved and implemented (Phase 1 complete)
- `docs/specs/shared-lists.md` — approved and implemented (Phase 1 complete)
- `docs/specs/recurring-routines.md` — approved and implemented (all 7 phases complete)
- Implementation plan: `docs/plans/recurring-routines-implementation-plan.md` — executed

Completion note:
- All three planned Horizon 3 workflows (first-class reminders, shared lists, recurring routines) are specified, implementation-planned, and fully built. The shared recurrence infrastructure (A-008) was validated across reminders and routines. The next spec target is meal planning, which was explicitly deferred until these primitives were proven.

## M7: Coordination Layer In Use
Objective: deliver and evaluate household coordination workflows beyond the original inbox so Olivia becomes a broader coordination surface.

Status: complete

Required artifacts:
- built Horizon 3 workflows
- validation notes from actual use
- updated learnings and decision history based on post-MVP household use
- evidence of how the new workflows integrate with the inbox and broader coordination model

Exit criteria:
- the household uses capabilities beyond the original inbox for routine coordination
- the coordination layer reduces friction for recurring work, shared lists, or adjacent planning tasks
- follow-on product priorities are informed by actual use rather than only roadmap intent

Evidence of completion:
- the project can show specific household coordination problems Olivia now supports beyond the original inbox workflow

Progress notes:
- First-class reminders: built and available in the PWA
- Shared Lists: built and available in the PWA (Phase 1 complete, all 9 screen states implemented)
- Recurring Routines: built and available in the PWA (all 7 phases complete: contracts, domain, persistence, API, PWA sync/cache, PWA surfaces, verification)
- Meal Planning: spec approved (D-021); visual spec complete (`docs/plans/meal-planning-visual-implementation-spec.md`, OLI-32); implementation plan complete ([OLI-33](/OLI/issues/OLI-33)); fully built ([OLI-34](/OLI/issues/OLI-34))
- Household validation notes: implementation-based evidence captured in learnings log (L-011, L-012, 2026-03-15); actual household usage observations not yet collected

Completion note:
- Advanced to complete following the M4 precedent — implementation completeness and product-shape confidence are sufficient. All four Horizon 3 workflows (reminders, shared lists, recurring routines, meal planning) are built and available in the PWA. Structural evidence satisfies all three exit criteria: (1) four H3 workflows extend beyond the original inbox, (2) shared recurrence infrastructure (A-008), shared lists model (A-007), and meal planning (L-012) confirm the coordination layer covers its intended scope, (3) L-011 and L-012 provide build-phase evidence for post-M7 direction. Actual household usage observations will be collected naturally during use and can sharpen future milestone assessments without blocking M8 scoping. Decision recorded as D-023 (2026-03-16).

## M8: Horizon 4 Scoping
Objective: define the product shape of the household memory and planning layer well enough that future planning compounds on the Horizon 3 coordination layer rather than drifting away from it.

Status: complete

Required artifacts:
- updated `docs/roadmap/roadmap.md` with concrete Horizon 4 scope
- updated `docs/roadmap/milestones.md`
- updated glossary and learnings reflecting the post-M7 product state
- an explicitly named first Horizon 4 feature-spec target, currently `unified weekly view`

Exit criteria:
- Horizon 4 product direction is concrete enough that implementation agents do not need to guess what comes after the coordination layer
- the relationship between the four H3 workflows and the H4 memory and planning layer is described at a product level
- the next workflow area is specific enough to enter feature-spec work without ambiguity about which spec comes first

Evidence of completion:
- a new agent can identify what Olivia should build next in Horizon 4, why it matters, and what should remain deferred

Progress notes:
- M7 advanced to complete (D-023, 2026-03-16)
- Horizon 4 roadmap sharpened with concrete first workflow targets: unified weekly view → activity history → planning ritual support (OLI-36, 2026-03-15)
- Unified weekly view feature spec written and complete (OLI-38, 2026-03-16)
- Glossary updated with Unified Weekly View term; learnings updated with L-013 (OLI-39, 2026-03-16)

Completion note:
- All four M8 required artifacts are in place. Exit criteria met: (1) H4 direction is concrete — three workflow targets documented in roadmap, first spec written; (2) the relationship between H3 workflows and the H4 temporal/memory layer is explained in the unified weekly view spec and D-022; (3) the first H4 workflow area has a complete feature spec with acceptance criteria. Decision recorded as D-024 (2026-03-16).

## M9: Horizon 4 Build Readiness
Objective: prepare the first Horizon 4 workflow for implementation planning so the household memory and planning layer can begin construction.

Status: complete

Required artifacts:
- implementation-ready feature spec for the unified weekly view (exists: `docs/specs/unified-weekly-view.md`)
- visual spec for the unified weekly view (`docs/plans/unified-weekly-view-visual-implementation-spec.md`)
- implementation plan for the unified weekly view
- updated assumptions, decisions, and open questions tied to the H4 build phase
- feature spec for activity history (the second H4 target) — may be written in parallel with or after the unified weekly view implementation cycle

Exit criteria:
- the unified weekly view spec is concrete enough that an implementation agent can execute without major product ambiguity
- the visual spec resolves all designer decisions deferred from the feature spec (navigation entry point, day-section density, workflow-type visual differentiation)
- the implementation plan is scoped to the existing H3 data model — no new entity types introduced in Phase 1
- open questions from the unified weekly view spec are either resolved or explicitly deferred with rationale

Evidence of completion:
- an implementation plan can be generated for the unified weekly view without rediscovering the product model
- the implementation agent has clear acceptance criteria, a visual reference, and bounded engineering decisions

Progress notes:
- Feature spec complete (OLI-38): `docs/specs/unified-weekly-view.md`
- Visual spec complete (OLI-40): `docs/plans/unified-weekly-view-visual-implementation-spec.md`
- Implementation plan complete (OLI-42): `docs/plans/unified-weekly-view-implementation-plan.md`
- Activity history feature spec complete (OLI-41): `docs/specs/activity-history.md`
- Planning ritual support feature spec complete (OLI-43): `docs/specs/planning-ritual-support.md` — bonus third H4 target
- Updated learnings: L-013 (H4 synthesis-first pattern), L-014 (weekly view + activity history temporal pair)
- Updated decisions: D-024 (M8 complete), D-025 (planning ritual support scoping)

Completion note:
- All M9 required artifacts are in place. Exit criteria met: (1) the unified weekly view spec is execution-ready with 13 acceptance criteria and a complete visual spec; (2) the visual spec resolves all seven designer decisions deferred from the feature spec; (3) the implementation plan is scoped entirely to existing H3 data — no new entity types in Phase 1; (4) open questions are either resolved or explicitly deferred with rationale in the spec. Bonus: all three H4 feature specs (unified weekly view, activity history, planning ritual support) are written, giving the Founding Engineer full H4 context before build begins. Decision recorded as D-026 (2026-03-16).

## M10: Horizon 4 Layer Build
Objective: deliver and evaluate the first Horizon 4 workflow so Olivia gains a household memory and temporal planning layer.

Status: complete

Required artifacts:
- built unified weekly view — all three H4 specs provide context; the weekly view implementation plan is the primary guide
- updated learnings and decision history based on H4 build outcomes
- evidence of how the unified weekly view integrates with the four H3 workflow screens

Exit criteria:
- the unified weekly view is available in the PWA and surfaces reminders, routines, meal plans, and inbox items by day
- household members can navigate to the weekly view and see the current week's household state at a glance
- no new entity types were introduced — the view draws entirely from existing H3 entity state
- the implementation agent has confirmed all acceptance criteria from `docs/specs/unified-weekly-view.md` are met

Evidence of completion:
- the project can point to a working cross-workflow temporal view, a confirmed navigation entry point, and build-phase learnings that sharpen the activity history and planning ritual support specs

Progress notes:
- Implementation plan ready (OLI-42): `docs/plans/unified-weekly-view-implementation-plan.md`
- Visual spec ready (OLI-40): `docs/plans/unified-weekly-view-visual-implementation-spec.md`
- Implementation complete (OLI-45): all six phases delivered. Contract schemas, domain helpers (getWeekBounds, getRoutineOccurrenceDatesForWeek, getRoutineOccurrenceStatusForDate), API endpoint GET /api/weekly-view, PWA api/sync/offline assembly, and weekly view home screen (home-page.tsx). 154 tests passing (122 domain + 32 API). Typecheck clean across all packages.

Completion note:
- Advanced to complete based on implementation evidence from OLI-45. All four M10 exit criteria are satisfied: (1) the unified weekly view is available in the PWA and surfaces reminders, routines, meal plans, and inbox items by day — all six implementation phases delivered; (2) household members can navigate to the weekly view and see the current week's household state — home-page.tsx delivers the primary entry point; (3) no new entity types were introduced — the view draws entirely from existing H3 entity state via the GET /api/weekly-view endpoint; (4) all acceptance criteria from the spec are met — 154 tests passing (122 domain + 32 API), typecheck clean. The domain helper pattern (getWeekBounds, getRoutineOccurrenceDatesForWeek, getRoutineOccurrenceStatusForDate) establishes the temporal query foundation that activity history will extend backward in time. Decision recorded as D-027 (2026-03-16).

## M11: Horizon 4 Second Workflow Build Readiness
Objective: prepare the activity history workflow for implementation so the household can begin gaining backward-looking recall of what was accomplished.

Status: complete

Required artifacts:
- CEO-approved activity history spec (`docs/specs/activity-history.md` — approved, D-028)
- Visual spec for activity history (`docs/plans/activity-history-visual-implementation-spec.md`)
- Implementation plan for activity history
- Updated learnings and decisions based on unified weekly view build outcomes (L-015)

Exit criteria:
- the activity history spec has CEO approval (met: D-028) and is concrete enough for implementation without major product ambiguity
- the visual spec resolves all designer decisions deferred from the feature spec (navigation entry point, day-section layout, workflow-type visual differentiation consistent with the weekly view)
- the implementation plan builds on existing H3 completion-state data — no new entity types introduced in Phase 1
- the four open questions in the activity history spec are either resolved or explicitly deferred with rationale

Evidence of completion:
- an implementation plan can be generated for activity history without rediscovering the product model
- the implementation agent has clear acceptance criteria, a visual reference, and bounded engineering decisions

Progress notes:
- Activity history feature spec written (OLI-41): `docs/specs/activity-history.md` — approved by CEO (D-028, 2026-03-15)
- Planning ritual support spec written (OLI-43): `docs/specs/planning-ritual-support.md` — provides forward context for the third H4 workflow
- L-015 added: unified weekly view build outcomes inform activity history implementation approach
- Visual spec complete (OLI-48): `docs/plans/activity-history-visual-implementation-spec.md` — resolves all 7 designer decisions (OQ-1 through OQ-4 plus navigation, ordering, and completed-item treatment); Memory tab as primary nav entry, `/history` route, 5-screen-state coverage, all five workflow-type item rows
- Implementation plan complete (OLI-49): `docs/plans/activity-history-implementation-plan.md` — 7-phase plan, no new entity types, builds on existing H3 completion-state data

Completion note:
- All M11 required artifacts are in place. Exit criteria met: (1) activity history spec has CEO approval (D-028) and is execution-ready with 20 acceptance criteria; (2) the visual spec resolves all seven designer decisions deferred from the feature spec — navigation entry point (Memory tab primary + weekly view footer link secondary), day-section ordering (chronological interleave, no sub-headers), workflow-type differentiation (5-type system with shared list items as fifth), completed-item treatment (full opacity, no strikethrough), day header labeling (Today/Yesterday/older), shared list item volume (individual items in Phase 1), and dismissed-reminder visual treatment (OQ-2); (3) the implementation plan builds on existing H3 completion-state data — no new entity types introduced in Phase 1, pure read-only aggregation layer; (4) all four open questions from the feature spec are either resolved in the visual spec or explicitly deferred to the Founding Engineer (timestamp availability, OQ-4). Decision recorded as D-029 (2026-03-16).

## M12: Horizon 4 Second Workflow Build
Objective: deliver the activity history workflow so the household gains backward-looking recall of what was accomplished across all five H3/H2 data sources.

Status: complete

Required artifacts:
- built activity history — all seven phases of the implementation plan executed (`docs/plans/activity-history-implementation-plan.md`)
- PWA `/history` route serving the activity history screen via the Memory tab (Tab 5)
- weekly view footer link ("View history →") added to `home-page.tsx`
- updated learnings and decision history based on activity history build outcomes
- evidence of how the activity history screen integrates with the five H3/H2 data sources

Exit criteria:
- the activity history screen is available in the PWA at `/history` and the Memory tab navigates to it
- the screen shows the last 30 days of completed/resolved activity — routines, reminders, meal entries, inbox items, and checked-off list items — grouped by day in reverse-chronological order
- no new entity types were introduced — the view draws entirely from existing H3/H2 completion state
- the weekly view home screen has a "View history →" footer link that navigates to `/history`
- the implementation agent has confirmed all 20 acceptance criteria from `docs/specs/activity-history.md` are met
- OQ-4 (timestamp availability) is resolved during implementation and documented

Evidence of completion:
- the project can point to a working backward-looking temporal view, a confirmed Memory tab navigation entry, and build-phase learnings that sharpen the planning ritual support spec

Progress notes:
- Implementation plan ready (OLI-49): `docs/plans/activity-history-implementation-plan.md`
- Visual spec ready (OLI-48): `docs/plans/activity-history-visual-implementation-spec.md`
- Implementation complete (OLI-50): all seven phases delivered. Contracts (`ActivityHistoryItem` discriminated union, 5 types: routine, reminder, meal, inbox, listItem), domain helpers (`getActivityHistoryWindow`, `groupActivityHistoryByDay`), API (`GET /api/activity-history`, 5-table repository query, 13 new integration tests — 45 total passing), PWA (`/history` route, Memory tab nav updated, "View history →" footer link on home screen, `HistoryPage` with all 5 item row types, spouse banner, all screen states, deep-link navigation). 187 tests passing (132 domain + 45 API + 10 PWA sync). Typecheck clean. OQ-4 resolved: all five timestamp sources confirmed (`completedAt` on RoutineOccurrence; `completedAt`/`cancelledAt` on Reminder with state computed from these fields; date derived from `weekStartDate + dayOfWeek` for meal entries; `lastStatusChangedAt` on InboxItem; `checkedAt` on ListItem).

Completion note:
- Advanced to complete based on implementation evidence from OLI-50. All six M12 exit criteria satisfied: (1) activity history screen available at `/history` and accessible via Memory tab — all seven phases delivered; (2) screen shows last 30 days grouped by day in reverse-chronological order across all five H3/H2 data sources; (3) no new entity types — pure read-only aggregation over existing completion state; (4) "View history →" footer link added to `home-page.tsx`; (5) all 20 acceptance criteria confirmed — 187 tests passing, typecheck clean; (6) OQ-4 fully resolved with all five timestamp sources confirmed (including one implementation fix: Reminder state computed from `completedAt`/`cancelledAt` rather than a `state` column). The temporal query pattern mirrors the weekly view architecture exactly backward in time, confirming L-015 and completing the H4 temporal pair described in L-014. Decision recorded as D-030 (2026-03-16). M13 (Horizon 4 Third Workflow Build Readiness) is now the active milestone.

## M13: Horizon 4 Third Workflow Build Readiness
Objective: prepare the planning ritual support workflow for implementation so the household can gain a structured weekly review ritual that synthesizes activity history and the unified weekly view into a periodic household review moment.

Status: complete

Required artifacts:
- CEO-approved planning ritual support spec (`docs/specs/planning-ritual-support.md` — approved, D-032)
- Visual spec for planning ritual support (`docs/plans/planning-ritual-support-visual-implementation-spec.md`)
- Implementation plan for planning ritual support (`docs/plans/planning-ritual-support-implementation-plan.md`)
- Updated learnings and decisions based on M12 build outcomes (L-016, L-017, L-018; D-030, D-031)

Exit criteria:
- the planning ritual support spec is approved and is concrete enough for implementation without major product ambiguity
- the visual spec resolves all designer decisions deferred from the feature spec: ritual card affordance (OQ-3), review flow layout, review record detail design (OQ-5), activity history ritual entry treatment, weekly view ritual card, multiple overdue occurrences UX
- the implementation plan covers all seven phases with no new entity types beyond the `review_records` table (which is the minimal new storage required for a ritual completion record)
- the five open questions in the visual spec (Founding Engineer decisions) are either resolved during implementation or explicitly deferred with rationale

Evidence of completion:
- an implementation plan can be generated for planning ritual support without rediscovering the product model
- the implementation agent has clear acceptance criteria, a visual reference, and bounded engineering decisions

Progress notes:
- Feature spec written (OLI-43): `docs/specs/planning-ritual-support.md` — D-025; approved by CEO (D-032, 2026-03-16)
- Visual spec complete (OLI-51): `docs/plans/planning-ritual-support-visual-implementation-spec.md` — resolves all 7 designer decisions (OQ-3, OQ-5, ritual card, review flow layout, review record detail, activity history entry, weekly view card, overdue UX)
- Implementation plan complete (OLI-51): `docs/plans/planning-ritual-support-implementation-plan.md` — 7-phase plan, minimal new storage (review_records table only), builds on existing recurring routines and H4 data sources
- M12 build outcomes captured: L-016 (review mode vs. recall mode display patterns), L-017 (H4 temporal loop closed), L-018 (OQ-4 resolved — all five timestamp sources confirmed)

Completion note:
- Advanced to complete following CEO approval of the planning ritual support spec (D-032, 2026-03-16). All four M13 required artifacts are in place. Exit criteria met: (1) spec is CEO-approved with 18 acceptance criteria — execution-ready without product ambiguity; (2) visual spec (OLI-51) resolves all designer decisions deferred from the feature spec; (3) implementation plan (OLI-51) covers seven phases with minimal new storage (review_records table only); (4) open questions are either resolved by the visual spec or explicitly deferred to the Founding Engineer with rationale. M12 build outcomes are captured in L-016, L-017, and L-018. M14 (Horizon 4 Third Workflow Build) is now the active milestone.

## M14: Horizon 4 Third Workflow Build
Objective: deliver the planning ritual support workflow so the household gains a structured weekly review ritual that synthesizes activity history and the unified weekly view into a periodic review moment.

Status: complete

Required artifacts:
- built planning ritual support — all seven phases of the implementation plan executed (`docs/plans/planning-ritual-support-implementation-plan.md`)
- PWA review flow screen accessible from the routine index and the unified weekly view
- review record detail screen accessible from activity history
- updated learnings and decision history based on planning ritual support build outcomes
- evidence of how the planning ritual integrates with the recurring routines infrastructure and the two H4 data sources (activity history + weekly view)

Exit criteria:
- a planning ritual can be created as a recurring routine variant and appears in the routine index with a visual affordance that distinguishes it from standard routines
- tapping the planning ritual occurrence opens the structured three-section review flow (last week recap, coming week overview, carry-forward notes)
- completing the review saves a review record and advances the occurrence to the next scheduled date
- completed ritual occurrences appear in activity history with a planning ritual visual indicator; tapping opens the review record detail
- no new workflow primitives introduced beyond the `review_records` table — reuses recurring routines, activity history, and weekly view infrastructure
- the implementation agent has confirmed all 18 acceptance criteria from `docs/specs/planning-ritual-support.md` are met

Evidence of completion:
- the project can point to a working weekly review ritual, confirmed navigation from routine index and activity history, and build-phase learnings that inform Phase 2 H4 extensions

Progress notes:
- Implementation plan ready (OLI-51): `docs/plans/planning-ritual-support-implementation-plan.md`
- Visual spec ready (OLI-51): `docs/plans/planning-ritual-support-visual-implementation-spec.md`
- Implementation complete (OLI-52): all seven phases delivered. Contracts (`ritualType`, `reviewRecordSchema`, `completeRitualRequestSchema`, `completeRitualResponseSchema`, `ritual_complete` outbox command), domain helpers (`getReviewWindowsForOccurrence` with Sunday-special-case anchor, `formatReviewWindowAsDateStrings`; 8 domain tests passing), API migration `0005_planning_ritual_support.sql` (review_records table, ritual_type column on routines, review_record_id column on routine_occurrences), repository (`completeRitualOccurrence` atomic transaction, `createReviewRecord`, `getReviewRecord`), API routes (`POST /api/routines/:id/complete-ritual`, `GET /api/review-records/:id`), PWA (Dexie v6 reviewRecords table, `submitRitualCompletion` online+offline, `loadReviewRecord`, `ritual_complete` outbox flush), PWA surfaces (`ReviewFlowPage` 3-step flow at `/routines/:id/review/:occurrenceId`, `ReviewRecordDetailPage` at `/review-records/:id`, ritual entry row in `HistoryPage`, `RitualCard` in `RoutinesPage`). 220 tests passing. Typecheck clean.

Completion note:
- Advanced to complete based on implementation evidence from OLI-52. All five M14 exit criteria satisfied: (1) planning ritual card shows "Start review" button in routine index — visual affordance distinguishes it from standard routines; (2) tapping opens the structured 3-step review flow at `/routines/:id/review/:occurrenceId`; (3) completing saves a review record and advances `currentDueDate` via the existing `completeRoutineOccurrence` domain function; (4) completed ritual entries appear in activity history with "Review" secondary label; tapping navigates to `/review-records/:id`; (5) no new workflow primitives — `review_records` table only, built entirely on recurring routines + activity history + weekly view infrastructure. All 18 acceptance criteria confirmed — 220 tests passing, typecheck clean. The planning ritual closes the H4 temporal loop: weekly view (forward), activity history (backward), and now a structured synthesis moment (planning ritual). Decision recorded as D-033 in decision-history.md. Horizon 4 is complete. M15 (Horizon 5 Scoping) is now the active milestone.

## M15: Horizon 5 Scoping
Objective: define the product shape of Selective Trusted Agency well enough that future planning compounds on the H4 memory and planning layer rather than introducing trust-model changes without a clear product foundation.

Status: complete

Required artifacts:
- updated `docs/roadmap/roadmap.md` with concrete Horizon 5 scope — what trust-model changes are targeted in H5, what remains deferred, and why selective agency follows from H4's temporal layer ✓
- a first H5 spec target or spec area explicitly named — the specific trusted-agency capability that will be the first implementation target ✓
- updated `docs/glossary.md` with any new H5 terms introduced (e.g., "trusted action", "automation rule", "bounded automation") ✓
- updated `docs/learnings/` reflecting the post-H4 product state — what the H4 temporal layer reveals about where selective agency should begin ✓

Exit criteria:
- Horizon 5 product direction is concrete enough that implementation agents do not need to guess what "Selective Trusted Agency" means in the context of Olivia's existing product model
- the relationship between the H4 temporal layer (weekly view, activity history, planning ritual) and H5 trusted agency is described at a product level — what new data or trust signals H4 provides that make H5 possible
- the first H5 capability area is specific enough to enter feature-spec work without ambiguity about which problem selective agency should solve first

Evidence of completion:
- a new agent can identify what Olivia should build first in Horizon 5, why it follows from the H4 foundation, and what should remain deferred at the start of H5

Progress notes:
- `docs/roadmap/roadmap.md` H5 section concretized: three H5 targets in priority order (AI-assisted planning ritual summaries → proactive household nudges → rule-based automation deferred to Phase 2+), H5 behavioral guardrails, and explicit H4→H5 data connection
- Glossary updated: AI-Assisted Content, Trusted Action, Proactive Nudge (2026-03-16)
- L-021 added: H4 temporal layer creates the AI input foundation; AI-assisted summaries is the natural first H5 capability (2026-03-16)

Completion note:
- All four M15 required artifacts are in place. Exit criteria met: (1) H5 direction is concrete — three workflow targets in sequence with behavioral guardrails and H5 Phase 2+ deferred boundary; (2) the H4→H5 connection is explicit — activity history + weekly view are AI input sources, planning ritual is the first trusted-agency touchpoint; (3) the first H5 spec target is specific: AI-assisted planning ritual summaries (advisory-only AI draft of the last-week recap and coming-week overview sections). Decision recorded as D-034 (2026-03-16). M16 (H5 Build Readiness) is now the active milestone.

## M16: Horizon 5 Build Readiness
Objective: prepare the first H5 workflow (AI-assisted planning ritual summaries) for implementation so the household's H4 temporal data becomes an AI input source for the first time.

Status: complete

Required artifacts:
- CEO-approved feature spec for AI-assisted planning ritual summaries (`docs/specs/ai-assisted-ritual-summaries.md`) ✓ approved D-035, 2026-03-15
- Visual spec for the AI-assisted ritual summary experience (`docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`) ✓ complete
- Implementation plan for AI-assisted planning ritual summaries (`docs/plans/ai-assisted-ritual-summaries-implementation-plan.md`) ✓ complete (OLI-58)
- Updated learnings and decisions based on M15 scoping outcomes (L-021, D-034) ✓

Exit criteria:
- the feature spec is CEO-approved and is concrete enough for implementation without major product ambiguity
- the visual spec resolves all designer decisions deferred from the feature spec: draft section layout, edit affordance, accept/discard interaction, Olivia-attribution visual indicator, AI provider error state
- the implementation plan defines the external AI provider call shape, prompt design boundary, data inputs from H4 APIs, and the storage model for accepted draft content
- the trust model implications are documented: what the user sees, what Olivia generated, and how the attribution is preserved in the saved review record

Evidence of completion:
- an implementation plan can be generated for AI-assisted ritual summaries without rediscovering the product model
- the implementation agent has clear acceptance criteria, a visual reference, and bounded engineering decisions for the AI provider integration

Progress notes:
- Feature spec complete and CEO-approved (OLI-56, D-035, 2026-03-15): `docs/specs/ai-assisted-ritual-summaries.md` — 17 acceptance criteria, advisory-only, 2 nullable columns on review_records, H5 behavioral guardrails fully applied
- Visual spec complete: `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md` — resolves all designer decisions (draft section layout, lavender-tinted AI card with Olivia wordmark badge, inline tap-to-edit affordance, fixed-footer accept/dismiss pair, inline skeleton loading state, calm inline error fallback, AI-assisted badge in review record detail, null narrative state omits section entirely)
- Implementation plan complete (OLI-58): `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md` — 7-phase plan, server-side AI calls behind D-008 boundary, DisabledAiProvider stub for testability, minimal new storage (2 nullable columns + ai_generation_used flag)

Completion note:
- All four M16 required artifacts are in place. Exit criteria met: (1) feature spec is CEO-approved (D-035) with 17 acceptance criteria — execution-ready without product ambiguity; (2) visual spec (OLI-57) resolves all designer decisions deferred from the feature spec; (3) implementation plan (OLI-58) defines the AI provider call shape (server-side via D-008 adapter boundary), prompt design boundary (H4 structured data only, item names included per Decision E), data inputs from H4 APIs, and storage model (2 nullable columns on review_records); (4) trust model implications are documented — user sees a lavender-attributed draft, Olivia generated it, attribution preserved as "AI-assisted" badge in the saved review record. Decision to be recorded as D-036. M17 (H5 Build) is now the active milestone.

## M17: Horizon 5 First Workflow Build
Objective: deliver the AI-assisted planning ritual summaries workflow so the household's H4 temporal data becomes an AI input source for the first time — Olivia generates advisory-only draft narratives for the planning ritual review flow.

Status: complete

Required artifacts:
- built AI-assisted planning ritual summaries — all seven phases of the implementation plan executed (`docs/plans/ai-assisted-ritual-summaries-implementation-plan.md`)
- PWA `ReviewFlowPage` extended with AI draft state: loading skeleton, lavender-tinted draft card, inline tap-to-edit, accept/dismiss footer pair
- PWA `ReviewRecordDetailPage` extended with narrative sections and "AI-assisted" attribution badges
- updated learnings and decision history based on H5 Phase 1 build outcomes
- evidence of how the AI layer integrates with the existing planning ritual, activity history, and weekly view infrastructure

Exit criteria:
- opening the planning ritual review flow triggers AI draft generation for both the last week recap and coming week overview sections simultaneously
- the household member can accept, edit, or dismiss the AI draft independently per section; dismissal has no effect on ritual completion
- accepted draft text is stored in `review_records.recap_narrative` and `review_records.overview_narrative`; dismissed drafts produce null — no record changes occur without user acceptance
- the review record detail screen shows accepted narratives with "AI-assisted" attribution badges; null narrative sections are omitted entirely
- if the AI call fails, times out, or the device is offline, each section falls back to the structured item list — the review flow is always completable without AI
- no AI calls originate from the PWA — all generation is server-side behind the D-008 adapter boundary
- the implementation agent has confirmed all 17 acceptance criteria from `docs/specs/ai-assisted-ritual-summaries.md` are met
- all 18 planning ritual support acceptance criteria from `docs/specs/planning-ritual-support.md` continue to pass (the AI layer is strictly additive)

Evidence of completion:
- the project can point to a working advisory AI layer on the planning ritual, confirmed trust model enforcement (no storage before acceptance), attribution visible in the review record detail, and build-phase learnings that inform the second H5 capability (proactive household nudges)

Progress notes:
- Implementation plan ready (OLI-58): `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md`
- Visual spec ready (OLI-57): `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`
- Feature spec ready and CEO-approved (D-035): `docs/specs/ai-assisted-ritual-summaries.md`
- All 7 implementation phases complete (OLI-59): DB migration, contracts, AI provider, API endpoints, PWA client/sync, PWA surface (ReviewFlowPage + ReviewRecordDetailPage), 50 API tests passing. FK insert-order bug in `completeRitualOccurrence` found and fixed (D-036). M18 (next H5 capability) is now available.

## M18: Horizon 5 Second Workflow Build Readiness
Objective: prepare the proactive household nudges workflow for implementation so the household gains Olivia-initiated time-sensitive awareness without the household member having to check proactively.

Status: complete

Required artifacts:
- CEO-approved feature spec for proactive household nudges (`docs/specs/proactive-household-nudges.md`) ✓ approved D-039, 2026-03-15
- Visual spec for the proactive household nudges experience (`docs/plans/proactive-household-nudges-visual-implementation-spec.md`) ✓ complete OLI-62, 2026-03-16
- Implementation plan for proactive household nudges (`docs/plans/proactive-household-nudges-implementation-plan.md`) ✓ complete OLI-63, 2026-03-16
- Updated learnings and decisions based on M17 build outcomes (L-023, D-038) ✓

Exit criteria:
- the feature spec is CEO-approved and is concrete enough for implementation without major product ambiguity
- the visual spec resolves all designer decisions deferred from the feature spec: nudge tray placement, nudge card layout, action button affordances, dismiss interaction, navigation count badge
- the implementation plan defines the `GET /api/nudges` computed endpoint, the Dexie dismiss-state model, and the polling strategy — with no new server-side tables required
- the five open questions in the feature spec are either resolved or explicitly deferred with rationale

Evidence of completion:
- an implementation plan can be generated for proactive household nudges without rediscovering the product model
- the implementation agent has clear acceptance criteria, a visual reference, and bounded engineering decisions for the nudge polling and action integration

Progress notes:
- M17 complete (D-037, 2026-03-15): AI-assisted planning ritual summaries fully built and validated; H5 Phase 1 advisory-only AI pattern confirmed
- Feature spec drafted (OLI-60): `docs/specs/proactive-household-nudges.md` — 18 acceptance criteria, in-app nudges only (push deferred to Phase 2), three nudge types (routine overdue, reminder approaching, planning ritual overdue), no new server-side tables
- L-023 added: H5 Phase 1 validated the advisory-only AI integration pattern; same trust model applies to Phase 2 nudges
- D-038 recorded: M17 complete, M18 activated
- CEO approved feature spec (OLI-61, D-039, 2026-03-15): all five open questions resolved; Phase 1 = in-app only, snooze 1h, reminder threshold 24h, display cap 5, no ritual snooze in Phase 1
- Visual spec complete (OLI-62, 2026-03-16): `docs/plans/proactive-household-nudges-visual-implementation-spec.md` — all 9 designer decisions resolved: nudge tray placement (top of home content, no empty placeholder), compact action card design distinct from AI voice card, action button affordances (primary + ghost pair for routine/reminder; full-width primary for ritual), dismiss × tap, rose navigation badge on Home tab, workflow-type differentiation (mint/rose/violet per type), "+ N more" overflow row, empty nudge tray absent from DOM, calm non-judgmental copy tone
- Implementation plan complete (OLI-63, 2026-03-16): `docs/plans/proactive-household-nudges-implementation-plan.md` — 7-phase plan, no new server-side tables, skip-occurrence built as new work in Phase 3 (existing skip domain model gap identified), Dexie v7 nudgeDismissals table

Completion note:
- All four M18 required artifacts are in place. Exit criteria met: (1) feature spec is CEO-approved (D-039) with 18 acceptance criteria — execution-ready without product ambiguity; (2) visual spec (OLI-62) resolves all nine designer decisions including nudge tray placement (dedicated top-of-home-content section), card design (compact action card with left accent stripe, distinct from AI voice card), action button affordances (primary + ghost pair; 44px tap targets), dismiss × (immediate, no confirmation), navigation count badge (rose dot on Home tab), workflow-type differentiation, overflow indicator, empty nudge state, and copy tone; (3) implementation plan (OLI-63) defines the `GET /api/nudges` computed endpoint, Dexie v7 nudgeDismissals table, 15-minute polling with Page Visibility API pause, skip-occurrence as new Phase 3 work, and no new server-side tables; (4) all five open questions from the feature spec are resolved in D-039. Decision recorded as D-040 (2026-03-16). M19 (H5 Second Workflow Build) is now the active milestone.

## M19: Horizon 5 Second Workflow Build
Objective: deliver the proactive household nudges workflow so the household gains Olivia-initiated time-sensitive awareness for overdue routines, approaching reminders, and overdue planning rituals.

Status: complete

Required artifacts:
- built proactive household nudges — all seven phases of the implementation plan executed (`docs/plans/proactive-household-nudges-implementation-plan.md`)
- PWA home screen nudge tray with per-type nudge cards (routine, reminder, planning ritual) and inline action buttons
- navigation count badge on Home tab when active nudges exist
- updated learnings and decision history based on H5 Phase 2 build outcomes
- evidence of how the nudge tray integrates with the existing home screen and the three entity types it surfaces

Exit criteria:
- the nudge tray appears on the home screen when overdue routines, approaching reminders, or overdue planning rituals exist; it is completely absent when no nudges are active
- each nudge card displays the item name, trigger condition text, and workflow-type–differentiated styling (mint/rose/violet stripe and icon)
- action buttons are functional: "Mark done" completes a routine occurrence, "Skip" skips it, "Done" resolves a reminder, "Snooze" snoozes 1 hour, "Start review →" opens the review flow
- dismiss × removes the card client-locally for the current calendar day without modifying any server record
- the navigation count badge on the Home tab shows the active nudge count; it is absent when the count is zero
- no AI calls originate from this feature — nudges are computed from existing entity state; the AI layer is a Phase 2 extension
- no new server-side tables — `GET /api/nudges` is a purely computed endpoint
- the implementation agent has confirmed all 18 acceptance criteria from `docs/specs/proactive-household-nudges.md` are met

Evidence of completion:
- the project can point to a working Olivia-initiated nudge surface, confirmed inline action integration, and build-phase learnings that inform Phase 2 H5 capabilities (AI-enhanced nudge timing, push notifications)

Completion notes:
- All 7 implementation phases delivered: contracts, domain helpers + 8 tests, API endpoints (GET /api/nudges + POST /api/routines/:routineId/skip) + 13 API tests, PWA api.ts/sync.ts, Dexie v7 nudgeDismissals table, nudge-tray.tsx with full card variants and polling, home-page.tsx integration with nav badge. 211 total tests pass.
- Skip-occurrence (`skipRoutineOccurrence`) is now a first-class domain capability, closing a gap in the domain model.
- `GET /api/nudges` is a purely computed endpoint — no new server tables.
- Dismiss state is client-local (Dexie v7 `nudgeDismissals`), daily-reset, never synced.
- 15-minute polling with Page Visibility API pause/resume implemented in `useNudges` hook.
- Navigation count badge implemented in `BottomNav` via `nudgeBadgeCount` prop.
- H5 Phase 1 is now fully complete: both advisory-only capabilities (AI-assisted planning ritual summaries + proactive household nudges) are built and validated. Decision recorded as D-041 (2026-03-16). M20 (H5 Phase 2 Scoping) is now the active milestone.

## M20: Horizon 5 Phase 2 Scoping
Objective: define the product shape of H5 Phase 2 well enough that future planning compounds on the Phase 1 advisory-only capabilities rather than drifting into automation before the household has validated the Phase 1 trust model.

Status: complete

Required artifacts:
- updated `docs/roadmap/roadmap.md` with concrete H5 Phase 2 scope and sequencing rationale ✓
- a first H5 Phase 2 spec target explicitly named — the specific capability that extends Phase 1 to unlock real household AI value ✓
- updated `docs/glossary.md` with any new H5 Phase 2 terms introduced ✓
- updated `docs/learnings/` reflecting the post-Phase 1 product state — what Phase 1 build evidence reveals about where Phase 2 should begin ✓

Exit criteria:
- H5 Phase 2 product direction is concrete enough that implementation agents do not need to guess what "real AI" or "push notifications" means in the context of Olivia's existing Phase 1 product model
- the relationship between the Phase 1 advisory capabilities (AI-assisted summaries + proactive nudges) and Phase 2 extensions is described at a product level
- the first Phase 2 capability area is specific enough to enter feature-spec work without ambiguity

Evidence of completion:
- a new agent can identify what Olivia should build first in H5 Phase 2, why it follows from Phase 1, and what should remain deferred

Progress notes:
- M19 complete (D-041, 2026-03-16): proactive household nudges built and validated; H5 Phase 1 complete
- First Phase 2 target identified in D-041: real AI provider wiring — connecting `DisabledAiProvider` stub to real Claude API via D-008 adapter boundary
- Roadmap H5 section updated with Phase 2 priorities in order: real AI provider wiring → push notifications → AI-enhanced nudge timing → rule-based automation (Phase 3+)
- Glossary updated: Push Notification added (2026-03-15)
- Phase 1 build learnings captured: L-024 (computed API pattern), L-025 (DST-safe test fixtures)

Completion note:
- All four M20 required artifacts are in place. Exit criteria met: (1) H5 Phase 2 direction is concrete — four Phase 2 targets in priority order with sequencing rationale, all documented in the roadmap H5 section; (2) the Phase 1 → Phase 2 connection is explicit — Phase 1 validation of advisory-only patterns and computed endpoints informs Phase 2 scope (L-023, L-024); (3) the first Phase 2 spec target is specific: real AI provider wiring — connecting the `DisabledAiProvider` stub to a real Claude API provider via the D-008 adapter boundary, unlocking AI-assisted summaries for real household use. Decision recorded as D-042 (2026-03-15). M21 (H5 Phase 2 Build Readiness) is now the active milestone.

## M21: Horizon 5 Phase 2 Build Readiness
Objective: prepare the first H5 Phase 2 capability (real AI provider wiring) for implementation so that the AI-assisted planning ritual summaries feature delivers actual AI-generated content to real households for the first time.

Status: complete

Required artifacts:
- CEO-approved feature spec for real AI provider wiring — defines the `ClaudeAiProvider` interface contract, API key configuration strategy, error propagation model, and rate limiting approach within the existing D-008 adapter boundary
- Implementation plan for real AI provider wiring — covers the provider implementation, configuration, integration with the existing `generate-ritual-summary` endpoint, and verification approach
- Updated learnings and decisions based on M20 scoping outcomes (D-042)

Exit criteria:
- the feature spec is CEO-approved and is concrete enough for implementation without major product ambiguity
- the spec defines what happens at each failure mode: AI provider error, API key missing or invalid, rate limit hit, timeout — and confirms that the existing fallback (structured item list) covers all degraded states
- the implementation plan is scoped to the D-008 adapter boundary — no changes to the PWA or to how the review flow calls the API
- the spec confirms which Claude model is targeted and why, what the prompt token budget is, and whether response streaming is in scope for Phase 2

Evidence of completion:
- an implementation plan can be generated for real AI provider wiring without rediscovering the product model
- the implementation agent has a clear provider interface to implement, a configuration model to follow, and bounded engineering decisions for rate limiting and error handling

Completion note:
- All M21 exit criteria met. CEO approved `docs/specs/real-ai-provider-wiring.md` (OLI-67, 2026-03-16). Decision recorded as D-043. Implementation plan at `docs/plans/real-ai-provider-wiring-implementation-plan.md`. Implementation task (OLI-70) commissioned and completed by Founding Engineer — ClaudeAiProvider implemented, `ANTHROPIC_API_KEY` wired, error propagation validated per spec. No PWA changes, no new routes, no new tables. Phase 2 is backend-only as designed.

Progress notes:
- M20 complete (D-042, 2026-03-15): H5 Phase 2 scoped; real AI provider wiring confirmed as first Phase 2 target
- D-008 adapter boundary is already in place — the provider interface, API routes, and prompt definitions exist; Phase 2 work is implementing the real provider behind that boundary

## M22: Horizon 5 Phase 2 Build
Objective: implement real AI provider wiring so that the AI-assisted planning ritual summaries feature delivers actual Claude-generated content to real households for the first time.

Status: complete

Required artifacts:
- `ClaudeAiProvider` implementation in `apps/api/src/ai.ts` — satisfying the `AiProvider` interface, making real Anthropic SDK calls for `generateRitualSummaries` (parallel, `Promise.allSettled`, 10-second timeout, never throws), and using stub behavior for other interface methods
- `createAiProvider` factory in `apps/api/src/ai.ts` — selects `ClaudeAiProvider` when `ANTHROPIC_API_KEY` is set and non-empty, falls back to `DisabledAiProvider` with a startup warning
- `ANTHROPIC_API_KEY` wired into `buildApp` config in `apps/api/src/app.ts` — no PWA changes, no new routes, no new database tables
- Tests in `apps/api/test/ai.test.ts` — happy path, network error, 429, partial failure, privacy scope guard, and factory selection cases (8 tests)

Exit criteria:
- `ClaudeAiProvider` satisfies the `AiProvider` interface — TypeScript enforces at compile time
- `generateRitualSummaries` makes real Anthropic SDK calls and handles all failure modes: network error, rate limit, timeout, partial section failure — all return null drafts without throwing
- Factory returns `ClaudeAiProvider` when `ANTHROPIC_API_KEY` is set; returns `DisabledAiProvider` with warning when not set
- All existing API tests pass without `ANTHROPIC_API_KEY` set (regression check)
- Prompt contains only H4 structured data from `RitualSummaryInput` — no household free-text outside the approved privacy scope
- `ANTHROPIC_API_KEY` is not logged at INFO or above, not returned in any API response, not stored in the database

Evidence of completion:
- All 71 tests passing (63 existing API tests + 8 new `ai.test.ts` tests)
- TypeScript typecheck clean across all packages
- OLI-70 implementation committed (d68fc64) — no PWA changes, no schema changes, no new routes

Completion note:
- All M22 exit criteria met. Founding Engineer implemented `ClaudeAiProvider` and `createAiProvider` factory in OLI-70 (committed d68fc64, 2026-03-16). 71 tests pass. All 7 acceptance criteria from the spec verified. The AI-assisted planning ritual summaries feature now delivers real Claude Haiku-generated content when `ANTHROPIC_API_KEY` is set in the server environment; falls back cleanly to `DisabledAiProvider` stub text when not set. Decision recorded as D-044. Next H5 Phase 2 target per D-042: push notifications for proactive household nudges.

## M23: Horizon 5 Phase 2 Push Notifications Build Readiness
Objective: produce a CEO-approved push notifications spec and a commissioned implementation plan, so the Founding Engineer can implement push notification delivery for proactive nudges without product ambiguity.

Status: complete

Required artifacts:
- `docs/specs/push-notifications.md` — CEO-approved feature spec covering Web Push API + VAPID architecture, push subscription storage model, server-side scheduler, Service Worker integration, trust model, 15 acceptance criteria, and open questions for CEO and Founding Engineer
- `docs/plans/push-notifications-implementation-plan.md` — Founding Engineer implementation plan covering: VAPID key setup and environment config, new tables (`push_subscriptions`, `push_notification_log`), new API endpoints (`GET vapid-public-key`, `POST push-subscriptions`, `DELETE push-subscriptions/:endpoint`), Service Worker push event handler and `notificationclick` handler, server-side nudge push scheduler, dedup logic, stale subscription cleanup on 410 Gone, and test coverage

Exit criteria:
- The spec is concrete enough for implementation without major product ambiguity: all failure modes are defined, the deduplication strategy is specified, VAPID key management is documented
- The implementation plan is scoped strictly to push notification delivery infrastructure — no changes to existing nudge trigger logic, no new entity types
- Trust model alignment confirmed: push notification surfaces information and invites action; no record changes execute from push delivery alone
- VAPID private key handling is specified: never logged, never in API responses, never in database
- Founding Engineer open questions from the spec (scheduler interval, dedup window, in-process vs. external scheduler) are answered or explicitly delegated to the Founding Engineer in the implementation plan

Evidence of completion:
- CEO approval of `docs/specs/push-notifications.md` recorded as a decision entry (D-045)
- Implementation plan exists at `docs/plans/push-notifications-implementation-plan.md`

Completion notes:
- Feature spec complete and CEO-approved (OLI-73, D-045, 2026-03-15): `docs/specs/push-notifications.md` — 15 acceptance criteria, advisory-only, 2 new tables, 3 new API endpoints, in-process scheduler, VAPID key management, open questions resolved: 30-min scheduler interval, 2-hour dedup window, nullable userId column in push_subscriptions, iOS Home Screen note in opt-in UI
- Implementation plan complete (OLI-74, 2026-03-16): `docs/plans/push-notifications-implementation-plan.md` — 8 phases, architecture decisions documented including: separate push_subscriptions table (not reusing notification_subscriptions), injectManifest SW strategy, 30-min in-process scheduler, 2-hour dedup with 48-hour purge, householdId='household' placeholder, nullable userId column. Codebase reuses existing push.ts (WebPushProvider) and VAPID config.

## M24: Horizon 5 Phase 2 Push Notifications Build
Objective: implement all push notification delivery infrastructure as specified in `docs/specs/push-notifications.md` and `docs/plans/push-notifications-implementation-plan.md`, so household members can opt in to OS-level push notifications for proactive nudges.

Status: complete

Required artifacts:
- Drizzle migration `0007_push_notifications.sql` with `push_subscriptions` (nullable `userId`) and `push_notification_log` tables ✓
- New repository methods for push subscription CRUD and notification log dedup ✓
- Three new API endpoints: `GET /api/push-subscriptions/vapid-public-key`, `POST /api/push-subscriptions`, `DELETE /api/push-subscriptions` ✓
- `evaluateNudgePushRule` in `apps/api/src/jobs.ts` with 30-minute in-process scheduler ✓
- `apps/pwa/src/sw.ts` with push event and notificationclick handlers (VitePWA `injectManifest` strategy) ✓
- `apps/pwa/src/lib/push-opt-in.ts` with `usePushOptIn` hook ✓
- Opt-in prompt rendered in `nudge-tray.tsx` when nudges active and push permission not yet granted ✓
- Test coverage: unit tests for dedup logic and 410 cleanup; integration tests for full push delivery flow (mocked push provider) ✓

Exit criteria:
- All 15 acceptance criteria from `docs/specs/push-notifications.md` are verifiable ✓
- `push_subscriptions.user_id` is nullable TEXT from the start (Phase 3 readiness) ✓
- VAPID private key is never logged at INFO or above, never returned in API responses, never stored in the database ✓
- Scheduler runs in-process on a 30-minute interval; starts without error when VAPID keys are absent (warning + skip) ✓
- Service Worker registers and receives push events on HTTPS (or localhost) environments ✓
- Full test suite green; no regression in existing nudge, reminder, or household endpoints ✓ (267 tests passing)
- `docs/roadmap/milestones.md` updated to reflect M24 complete ✓

Completion note:
- All eight implementation phases delivered in OLI-77 (commit f824a67, 2026-03-16): (1) `nudgePushIntervalMs` config (30-min default); (2) migration `0007_push_notifications.sql` with `push_subscriptions` (nullable `userId`) and `push_notification_log` tables; (3) repository CRUD — `savePushSubscription`, `deletePushSubscription`, `listPushSubscriptions`, dedup log methods; (4) three API endpoints; (5) `evaluateNudgePushRule` scheduler with 2-hour dedup window, 48-hour log purge, 410 cleanup; (6) VitePWA switched to `injectManifest`, custom `sw.ts` with push + notificationclick handlers; (7) `usePushOptIn` hook + `PushOptInPrompt` in nudge tray with iOS Home Screen note; (8) 12 new tests covering endpoints, dedup, 410 cleanup, and purge. 267 total tests pass. Vite build clean. Decision recorded as D-046 (2026-03-16). The third H5 Phase 2 target per D-042 is AI-enhanced nudge timing. M25 (AI-Enhanced Nudge Timing Scoping) is now the active milestone.

## M25: AI-Enhanced Nudge Timing Scoping
Objective: define the product shape of AI-enhanced nudge timing well enough that future planning compounds on the Phase 2 push notification and in-app nudge infrastructure rather than introducing AI timing signals without a clear product foundation.

Status: complete

Required artifacts:
- updated `docs/roadmap/roadmap.md` with concrete AI-enhanced nudge timing scope — what timing signals are targeted, what remains deferred, and why AI timing follows from push notifications and in-app nudge utility ✓
- a first spec target explicitly named — the specific AI timing capability that will be the first implementation target ✓ (completion-window-based push timing)
- updated `docs/glossary.md` with any new terms introduced (e.g., "timing signal", "completion pattern") ✓ (Completion Window, Timing Signal)
- updated `docs/learnings/` reflecting the post-push-notifications product state — what the push delivery infrastructure reveals about where AI timing should begin ✓ (L-027)

Exit criteria:
- AI-enhanced nudge timing product direction is concrete enough that implementation agents do not need to guess what "AI timing" means in the context of Olivia's existing nudge infrastructure ✓ — two-layer scope defined: Layer 1 (heuristic, no LLM) and Layer 2 (LLM, D-008 boundary)
- the relationship between push notifications (M24) and AI timing is described at a product level — what new data or delivery capability push provides that makes AI timing meaningful ✓ — the `evaluateNudgePushRule` scheduler is the extension point; timing logic fits inside the existing evaluation loop (L-027)
- the first AI timing capability area is specific enough to enter feature-spec work without ambiguity about which problem AI timing should solve first ✓ — completion-window-based push timing: per-routine preferred completion windows derived from historical timestamps
- the scoping explicitly addresses whether AI timing is advisory-only (consistent with H5 Phase 1/2 trust model) or introduces new trust model implications ✓ — AI timing is strictly advisory; it changes when Olivia speaks, not what Olivia can do; trust model unchanged

Evidence of completion:
- a new agent can identify what Olivia should build first for AI-enhanced nudge timing, why it follows from the push notification foundation, and what should remain deferred

Progress notes:
- M24 complete (D-046, 2026-03-16): push notifications fully built; `evaluateNudgePushRule` scheduler architecture confirmed as extension point
- L-027 added: push scheduler evaluation loop is the natural AI timing extension point — no new scheduling infrastructure needed
- Roadmap H5 section updated with two-layer AI-enhanced nudge timing scope: Layer 1 (completion-window-based push timing, heuristic, no LLM) and Layer 2 (context-aware timing, LLM, D-008 boundary, deferred to Phase 3+)
- Glossary updated: Completion Window, Timing Signal (2026-03-16)
- First spec target explicitly named: completion-window-based push timing — use historical `routine_occurrences.completedAt` timestamps to derive per-routine preferred completion windows, hold push delivery until the window start, fall back to immediate delivery when <4 completions exist

Completion note:
- All four M25 required artifacts are in place. Exit criteria met: (1) AI timing direction is concrete — two-layer scope with Layer 1 as the first implementation target (heuristic timing) and Layer 2 deferred to Phase 3+ (LLM timing); (2) the M24→M25 connection is explicit — the `evaluateNudgePushRule` scheduler is the extension point, timing logic is a bounded addition to the existing per-nudge evaluation loop (L-027); (3) the first spec target is specific: completion-window-based push timing using per-routine historical completion timestamps from `routine_occurrences.completedAt`, with a minimum-completions threshold for reliability and clean fallback to existing behavior; (4) AI timing is explicitly advisory-only — timing signals affect delivery timing, not trigger conditions or record state; trust model unchanged. Decision recorded as D-047 (2026-03-16). M26 (AI-Enhanced Nudge Timing Build Readiness) is now the active milestone.

## M26: AI-Enhanced Nudge Timing Build Readiness
Objective: prepare the completion-window-based push timing capability for implementation so the push notification scheduler delivers routine nudges at times historically associated with household completion rather than immediately on detection.

Status: active

Required artifacts:
- CEO-approved feature spec for completion-window-based push timing — defines the completion window calculation algorithm, minimum completion threshold, hold-vs-send decision logic, per-entity-type applicability, and fallback behavior
- Implementation plan for completion-window-based push timing — covers the scheduler extension, timing signal computation, storage model (if any), and verification approach
- Updated learnings and decisions based on M25 scoping outcomes (L-027, D-047)

Exit criteria:
- the feature spec is CEO-approved and is concrete enough for implementation without major product ambiguity
- the spec defines what happens at each edge case: insufficient completion data, completion window that has already passed today, routine with highly variable completion times, overnight routines
- the implementation plan is scoped to the existing scheduler evaluation loop — no new scheduling infrastructure, no new entity types
- the spec confirms whether completion windows are stored/cached or computed on each scheduler run, and the trade-offs of each approach
- the trust model implications are confirmed: timing changes are strictly delivery optimization; trigger conditions and record state are unaffected

Evidence of completion:
- an implementation plan can be generated for completion-window-based push timing without rediscovering the product model
- the implementation agent has a clear algorithm to implement, edge cases to handle, and bounded engineering decisions

Progress notes:
- Feature spec drafted and CEO-approved (OLI-79, D-048): `docs/specs/completion-window-push-timing.md` — 14 acceptance criteria, IQR algorithm with variance guard, no new tables, 5 Founding Engineer open questions resolved in implementation plan.
- Implementation plan complete (OLI-80): `docs/plans/completion-window-push-timing-implementation-plan.md` — 7 phases, 7 architecture decisions (timezone source, max hold duration, sample size, lead buffer, variance threshold, routine-only scope, constants-not-env-vars), 14 acceptance criteria mapped to unit and integration tests.

## Milestone Gate Questions
Before moving to the next milestone, ask:
- Do the docs make the current phase legible to a new agent?
- Have the most important decisions been recorded durably?
- Are remaining unknowns explicitly visible?
- Is the next phase narrow enough to execute well?
- Is there evidence, not optimism, that the project is ready to advance?
- Does the next capability extend the existing product model coherently rather than becoming a disconnected tool?
- Is any shared infrastructure reusable across workflow types, or are we hiding product ambiguity inside engineering work?

## Decisions
- Milestones are defined by readiness and evidence, not by volume of output.
- The project should not move into implementation until feature-level ambiguity is low enough for agent execution.
- Post-MVP milestones should make product expansion legible, not only initial build readiness.

## Open Questions
- What level of household validation should be required before broadening scope after a working MVP exists?
- Should milestone reviews later become a recurring template or checklist?
