# Skill: Olivia Session Orientation

## When To Use

Use this at the start of a new session or before major work so you can recover project context from durable docs instead of chat history.

## Goal

Orient to the current project state, assess milestone progress, surface active assumptions and open questions, and recommend the single highest-value next action.

## Steps

### 1. Read the core docs in order

Read each file completely:

1. `docs/vision/product-vision.md`
2. `docs/vision/product-ethos.md`
3. `docs/strategy/agentic-development-principles.md`
4. `docs/glossary.md`
5. `docs/roadmap/roadmap.md`
6. `docs/roadmap/milestones.md`
7. `docs/learnings/decision-history.md`
8. `docs/learnings/assumptions-log.md`
9. `docs/learnings/learnings-log.md`

### 2. Assess milestone status

- Compare the required artifacts for M0 through M4 in `docs/roadmap/milestones.md` against the current repo state.
- Identify which milestone is currently active.
- Check whether the exit criteria for the active milestone appear satisfied from the docs alone.

### 3. Produce a structured orientation summary

Use this structure:

#### Project Summary
- One or two sentences on what Olivia is and its current phase.

#### Current Milestone
- State the active milestone, its objective, and which required artifacts are present versus missing.

#### Milestone Gate Status
- For each milestone M0 through M4, mark `Complete`, `In Progress`, or `Not Started` with a one-line reason.

#### Active Assumptions
- List all assumptions from `docs/learnings/assumptions-log.md` with their confidence.
- Clearly flag any `low` confidence assumptions.

#### Latest Decisions
- List the three most recent decisions from `docs/learnings/decision-history.md`.

#### Open Questions
- Collect and deduplicate open questions from the docs you read.

#### Recommended Next Action
- Name the single most valuable next action for this session.
- Be specific about the file to create, decision to resolve, or artifact to refine.
- Explain why it is the highest-priority action given the active milestone.

#### Doc Inconsistencies
- If any docs conflict or leave a milestone gate ambiguous, list the inconsistency here.

## Rules

- Use glossary terms from `docs/glossary.md`.
- Do not propose work that contradicts an active decision without naming the conflict.
- Do not start implementing features unless the project is at M3 or the user explicitly asks to work earlier.
- Treat `docs/` as the source of truth if another instruction layer conflicts.
