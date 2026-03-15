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

Status: in progress

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
- Meal Planning: spec drafted (`docs/specs/meal-planning.md`); pending CEO approval before implementation planning
- Household validation notes: not yet collected; to be gathered during real use

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
