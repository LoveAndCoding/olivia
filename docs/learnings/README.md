# Olivia Learnings System

## Purpose
The learnings system exists so future agents and collaborators can inherit durable project memory without needing access to the full conversational history that produced it.

This is not a transcript archive. It is a curated memory layer for the project.

## What Belongs Here
Use the learnings docs to capture:
- important assumptions that guide current work
- validated or disproven beliefs
- notable lessons from design, implementation, or use
- meaningful product or project decisions and why they were made
- stable facts that future agents should not need to rediscover

## What Does Not Belong Here
Do not use this area for:
- raw chat dumps
- exhaustive meeting notes
- every minor edit or thought
- low-signal status updates that do not change future decisions

## Structure
- `assumptions-log.md`: current assumptions, their confidence, and validation status
- `learnings-log.md`: durable lessons and takeaways over time
- `decision-history.md`: major product or project decisions, rationale, and reversals

## Information Types
Future agents should treat the three logs differently:

- `Assumptions` are working beliefs that may still be wrong.
- `Learnings` are durable takeaways from experience, discovery, or iteration.
- `Decisions` are chosen directions that should guide future work until superseded.

## Update Rules
Add or update entries when:
- a new assumption materially affects product direction
- an assumption is validated or disproven
- a discussion resolves a meaningful trade-off
- a prototype or implementation reveals a reusable lesson
- actual household use changes understanding of what matters

## Entry Quality Standard
Each entry should be:
- concise
- dated
- specific enough to influence future decisions
- linked to the relevant doc, milestone, spec, or event if available
- written so a new agent can understand why it matters

## Maintenance Guidance
- Prefer updating an existing entry over creating near-duplicates.
- If a decision is reversed, do not delete the old record; mark it superseded.
- If an assumption becomes a fact, update its status and reflect the consequence in the relevant strategic docs.
- If a learning changes roadmap or spec direction, link both places.

## Consumption Guidance For Future Agents
Before proposing major new work, agents should review:
1. the relevant strategic doc
2. `decision-history.md`
3. `assumptions-log.md`
4. `learnings-log.md`

This should reduce repeated debates, rediscovery, and product drift.
