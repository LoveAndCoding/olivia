# Olivia Agentic Development Principles

## Purpose
Olivia is intended to be built and iterated on primarily through agents. That means the project must be documented in a way that allows a capable but context-light agent to make good decisions, avoid inventing product intent, and leave behind clean handoffs for the next agent.

This document defines the standards for writing docs, specs, plans, tests, and code guidance so the project remains durable across many separate agent sessions.

## Design Goal
Every important artifact in the project should answer three questions for a future agent:
- What is true?
- What is decided?
- What still needs judgment?

## Source-of-Truth Hierarchy
When multiple artifacts touch the same topic, future agents should prefer:
1. product vision and ethos docs for product intent
2. roadmap and milestone docs for sequencing and readiness
3. learnings and decision-history docs for durable context
4. feature specs for scope and acceptance criteria
5. implementation plans for execution details
6. transient conversations only when a durable artifact does not exist yet

## Documentation Rules

### Separate Information Types
Strategic and product docs should explicitly distinguish:
- `Facts`: things known to be true right now
- `Decisions`: choices that have been made and should guide future work
- `Assumptions`: beliefs not yet validated
- `Open Questions`: unresolved issues requiring input or evidence
- `Deferred Decisions`: choices intentionally postponed

### Optimize For Handoff
A document should be readable by a new agent with no prior conversation context. That means:
- state the problem plainly
- define the intended outcome
- explain why a recommendation was chosen
- link to upstream and downstream documents
- avoid relying on implied context or personal memory

### Prefer Curated Memory Over Raw History
Conversation history is not durable product memory. If a discussion changes direction, reveals a lasting insight, or resolves a trade-off, the important takeaway should be captured in a maintained project doc.

### Preserve Reversibility
When a decision is still premature, document the evaluation criteria and trade-offs instead of forcing a false sense of certainty.

## PM Operating Model
For product-definition work, agents should act as product managers rather than passive scribes.

That means agents should:
- gather targeted stakeholder input instead of asking for every detail up front
- synthesize that input into a recommendation with rationale and trade-offs
- document decisions, assumptions, and open questions explicitly
- leave behind artifacts that future agents can execute against without re-deriving product intent

In practice, the default PM workflow is:
1. identify the product decision that needs to be made
2. gather the minimum stakeholder input needed to make it well
3. recommend a direction and explain why
4. record the outcome in durable project docs
5. preserve unresolved issues as open questions rather than burying them in prose

## Feature Spec Standard
Every future feature spec should aim to include:
- summary and intended outcome
- user problem
- target users
- scope
- boundaries, known gaps, and likely future direction
- user workflow
- system behavior
- data and memory handling
- permissions and approval model — distinguish between agentic actions (Olivia proposes → user confirms before execution), user actions (user commands directly → executes immediately for non-destructive changes), and destructive actions (always confirm regardless of initiator)
- AI role and non-AI fallback where relevant
- failure modes
- UX notes when behavior could create noise or confusion
- acceptance criteria
- validation and testing
- dependencies
- related learnings or prior decisions
- open questions
- explicit facts, assumptions, and decisions where relevant

## Implementation Plan Standard
Implementation plans should:
- reference the strategic and feature docs they are derived from
- be explicit enough for an agent to execute without guessing the goal
- define verification steps and evidence required
- avoid solving product ambiguity inside engineering tasks

## Learning Capture Standard
Durable learning docs should be updated when:
- an assumption is validated or disproven
- a product decision is made or reversed
- a prototype or implementation reveals a reusable insight
- a user interaction changes understanding of the problem

Each learning entry should be concise, dated, and connected to the decision, doc, or spec it informs.

## Writing Standard
Project writing should be:
- explicit rather than clever
- structured rather than stream-of-consciousness
- concise but not cryptic
- opinionated where decisions exist
- transparent about uncertainty where decisions do not exist

## Anti-Patterns
Future agents should avoid:
- treating chat transcripts as the main source of truth
- writing vague specs that require product intent to be inferred later
- mixing settled decisions with open questions in the same prose
- locking implementation details too early when only constraints are known
- creating docs that describe activity instead of clarifying direction

## Definition Of A Good Artifact
A good artifact for Olivia:
- reduces ambiguity
- helps the next agent make better decisions faster
- captures why something matters, not only what exists
- makes verification and iteration easier
- leaves less room for accidental product drift

## Facts
- Olivia is intended to be developed agentically with minimal exceptions.
- Future agents may begin with very little session context.
- Durable documentation is therefore part of the product delivery system, not an afterthought.

## Decisions
- Product docs should explicitly separate facts, assumptions, open questions, and deferred decisions.
- Durable learnings should be curated into dedicated docs rather than left in raw conversation history.
- Strategic documentation should guide implementation agents before stack-level details are finalized.
- The PM operating model should live in the durable docs, not only in planning-session artifacts.

## Open Questions
- Should the project adopt a formal document metadata standard later, such as status, owner, and last-reviewed fields?
- How strict should template compliance be for future feature specs and implementation plans?
