# Olivia Agent Guide

This file is a derivative convenience layer for agentic tools such as Cursor. The `docs/` directory remains the source of truth. If any instruction here, in `.cursor/rules/`, or in `skills/` conflicts with `docs/`, follow `docs/` and update the derivative files later.

## Required Orientation

Before substantial work, read these docs in order:

1. `docs/vision/product-vision.md`
2. `docs/vision/product-ethos.md`
3. `docs/strategy/agentic-development-principles.md`
4. `docs/glossary.md`
5. `docs/roadmap/roadmap.md`
6. `docs/roadmap/milestones.md`
7. `docs/learnings/decision-history.md`
8. `docs/learnings/assumptions-log.md`
9. `docs/learnings/learnings-log.md`

Then read the relevant feature spec, planning artifact, or learnings doc for the task at hand.

## Source-Of-Truth Hierarchy

When multiple artifacts touch the same topic, prefer:

1. vision and ethos docs for product intent
2. roadmap and milestone docs for sequencing and readiness
3. learnings and decision-history docs for durable context
4. feature specs for workflow scope and acceptance criteria
5. implementation plans for execution details
6. transient chat history only when no durable artifact exists yet

## Repo Posture

- Olivia is a documentation-first, agentic project.
- Durable docs are part of the delivery system, not project overhead.
- Product-definition work should follow the PM operating model: gather focused input, recommend a direction, record rationale, and leave execution-ready artifacts.
- Avoid reopening settled decisions without naming the conflict and the reason to revisit it.

## Product Guardrails

- Build toward a household command center, not a general-purpose assistant.
- Preserve a local-first posture for sensitive household data and durable records.
- Treat external AI providers as replaceable dependencies, never the source of truth.
- Default to an advisory-only trust model: Olivia may suggest, summarize, draft, and organize, but should not take consequential actions without explicit approval.
- Optimize for reduced cognitive load, shared clarity, calm competence, and reversible decisions.
- In early workflows, assume the stakeholder is the primary operator; spouse visibility or lightweight participation may be useful, but full collaboration parity is deferred.

## Writing And Artifact Rules

- Use glossary terms consistently.
- Explicitly separate `Facts`, `Decisions`, `Assumptions`, `Open Questions`, and `Deferred Decisions` in durable docs when relevant.
- Optimize every artifact for handoff: state the problem, intended outcome, rationale, and linked upstream or downstream docs.
- Prefer curated memory over transcript history. If a discussion changes direction or resolves a trade-off, update durable docs.
- Keep writing explicit, structured, concise, and honest about uncertainty.

## Specs, Plans, And Milestones

- Check `docs/roadmap/milestones.md` before claiming readiness or starting major implementation work.
- Do not begin implementation unless the project is at M3 (Build Readiness) or the user explicitly asks to work earlier.
- Use `docs/specs/spec-template.md` for new feature or workflow specs.
- Implementation plans should reference the source docs they derive from, define verification evidence, and avoid resolving product ambiguity inside engineering tasks.

## Durable Memory Maintenance

Update the learnings system when:

- an assumption is validated, disproven, or superseded
- a meaningful product or project decision is made or reversed
- a prototype or implementation reveals a reusable lesson
- a user interaction changes understanding of the problem

Use the correct log:

- `docs/learnings/assumptions-log.md` for active beliefs
- `docs/learnings/learnings-log.md` for durable takeaways
- `docs/learnings/decision-history.md` for chosen directions

## Available Skills

- `skills/olivia-orient.md`: use at the start of a session to orient, assess milestones, and recommend the next action.
- `skills/olivia-feature-spec.md`: use when drafting or revising a feature spec.
- `skills/olivia-doc-review.md`: use when reviewing a strategic doc, spec, or plan for compliance and clarity.
- `skills/olivia-learnings-update.md`: use when adding or updating assumptions, learnings, or decisions.
- `skills/olivia-implementation-plan.md`: use when turning an approved spec into an execution-ready implementation plan.
