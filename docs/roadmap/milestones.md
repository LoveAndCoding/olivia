# Olivia Milestones

## Purpose
These milestones define the evidence required for Olivia to move from concept to implementation. They are intended to prevent premature building and to give future agents clear readiness gates.

Unlike `docs/roadmap/roadmap.md`, this document is not a product horizon map. It is an execution-readiness system: what must be true before the project should advance.

## Milestone Model
Each milestone should be considered complete only when:
- the expected artifacts exist
- the key decisions are documented
- open questions are either resolved or explicitly bounded
- the next phase can begin without re-deriving product intent

## M0: Project Foundation
Objective: establish shared understanding of what Olivia is and how the project should be documented.

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

## M1: Product Definition
Objective: define the first meaningful product slice and the user problems it addresses.

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

## M2: Delivery Planning
Objective: make the project execution-ready for feature-level planning.

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

## M3: Build Readiness
Objective: prepare the first implementation-ready feature spec or set of specs.

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

## M4: MVP In Use
Objective: deliver and evaluate the first genuinely useful household workflow.

Required artifacts:
- implementation-ready plan
- built MVP slice
- validation notes from actual use
- updated learnings and decisions based on usage

Exit criteria:
- Olivia is used for at least one meaningful household coordination workflow
- the workflow produces visible value for the stakeholder
- product learnings from real usage are captured durably

Evidence of completion:
- the project can show a specific household problem that Olivia now helps solve better than the prior ad hoc process

## Milestone Gate Questions
Before moving to the next milestone, ask:
- Do the docs make the current phase legible to a new agent?
- Have the most important decisions been recorded durably?
- Are remaining unknowns explicitly visible?
- Is the next phase narrow enough to execute well?
- Is there evidence, not optimism, that the project is ready to advance?

## Decisions
- Milestones are defined by readiness and evidence, not by volume of output.
- The project should not move into implementation until feature-level ambiguity is low enough for agent execution.

## Open Questions
- What level of household validation should be required before broadening scope?
- Should milestone reviews later become a recurring template or checklist?
