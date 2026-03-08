# Skill: Olivia Feature Spec Writer

## When To Use

Use this when drafting a new feature or workflow spec, or when revising an existing spec to make it implementation-ready.

## Goal

Produce a complete, durable feature spec that follows Olivia standards, stays inside the product boundary, and is concrete enough for later implementation planning.

## Inputs

- The feature name or idea to spec
- The intended file path, if already chosen

## Steps

### 1. Load project context

Read these before writing:

1. `docs/specs/spec-template.md`
2. `docs/vision/product-ethos.md`
3. `docs/vision/product-vision.md`
4. `docs/learnings/decision-history.md`
5. `docs/learnings/assumptions-log.md`
6. `docs/glossary.md`
7. Existing files in `docs/specs/` to avoid duplication

### 2. Run pre-flight checks

Do not proceed blindly. Confirm:

- the feature fits the product vision
- the feature respects the advisory-only trust model, or any exception is explicit
- a spec for the same feature does not already exist
- the current milestone supports spec work, or the user explicitly wants early exploration

### 3. Draft the spec

- Create or update the relevant file under `docs/specs/`.
- Use every section from `docs/specs/spec-template.md` in order.
- If a section is genuinely not relevant, write `Not applicable - [brief reason]` instead of omitting it.

### 4. Apply section standards

- **Summary:** one short paragraph naming the problem, workflow, and desired household benefit.
- **User Problem:** make the failure mode concrete and specific to ordinary household life.
- **Target Users:** default to stakeholder as primary user and spouse as secondary unless the docs justify a different model.
- **Desired Outcome:** state observable household changes if the feature works well.
- **In Scope:** use concrete behaviors and states, not vague goals.
- **Boundaries, Gaps, And Future Direction:** be explicit about what is deferred.
- **Workflow:** write numbered steps and name who acts at each step.
- **Behavior:** separate facts recorded, suggestions made, and actions proposed for approval.
- **Data And Memory:** distinguish durable state from transient state and flag sensitive data as local-first.
- **Permissions And Trust Model:** state whether the feature remains advisory-only; list every approval point; mark any exception as `ADVISORY EXCEPTION`.
- **AI Role:** separate essential AI use, convenience AI use, and what must still work without AI.
- **Risks And Failure Modes:** include concrete failure scenarios and expected behavior.
- **UX Notes:** name what would feel noisy, unclear, invasive, or burdensome.
- **Acceptance Criteria:** make each item independently testable.
- **Validation And Testing:** distinguish unit tests, integration tests, and manual household validation.
- **Dependencies And Related Learnings:** reference learnings and decisions by ID, not by title alone.
- **Open Questions:** list only genuine blockers or unresolved choices.
- **Facts, Assumptions, And Decisions:** reuse existing log IDs where possible and flag any genuinely new assumption for later logging.
- **Deferred Decisions:** record choices intentionally postponed.

### 5. Self-review before saving

Check that:

- every template section is present
- advisory-only compliance is explicit
- no section contradicts an active decision
- glossary terms are used consistently
- acceptance criteria are specific enough to verify later
- at least one relevant learning, assumption, or decision is cited by ID

### 6. Post-spec follow-up

- If drafting revealed a new assumption, add it to `docs/learnings/assumptions-log.md`.
- If drafting resolved a material trade-off, record the decision in `docs/learnings/decision-history.md`.
- Report the file path, a short summary of the spec, and the most important remaining open question.

## Rules

- Keep the spec lean, explicit, and easy for a future agent to execute against.
- Do not solve unresolved product ambiguity inside engineering details.
- Treat `docs/` as the source of truth if another instruction layer conflicts.
