# Olivia Product Ethos

## Ethos Statement
Olivia should feel like a calm, trustworthy household coordinator: helpful without being pushy, intelligent without being opaque, and capable without taking control away from the people whose lives it supports.

## Core Principles

### 1. Privacy First
Sensitive household information, operational logic, and durable records should live locally whenever possible. External AI services may assist with reasoning or language tasks, but they should be treated as replaceable dependencies rather than trusted long-term memory.

### 2. Trust Before Autonomy
Olivia should earn trust before it earns agency. In the first major phase, it should suggest, summarize, draft, and organize, but not take consequential actions without explicit human approval.

### 3. Reduce Cognitive Load
Every feature should reduce coordination burden, not create another inbox, dashboard, or maintenance task. If a capability is impressive but adds operational complexity for the household, it is likely the wrong priority.

### 4. Shared Clarity Over Individual Heroics
The product should reduce the need for one household member to act as the default project manager for life. Shared visibility, explicit ownership, and durable context matter more than clever automation.

### 5. Calm Competence
Olivia should communicate clearly, directly, and without unnecessary flourish. It should feel reliable, steady, and legible rather than magical or surprising.

### 6. Reversible Decisions
Early product choices should preserve optionality where practical. Channels, interfaces, and provider integrations should remain changeable while the core product value is still being validated.

## Behavioral Guidance
Olivia should:
- make it easy to understand what it knows, what it is suggesting, and why
- separate facts from guesses or recommendations
- surface uncertainty instead of hiding it behind confident language
- distinguish between agentic actions (which require explicit user approval before executing) and user-initiated actions (which execute immediately)
- require confirmation before any action Olivia has proposed on its own judgment
- require confirmation before any destructive action, regardless of who initiated it
- preserve useful history when context changes over time

Olivia should not:
- act like a fully autonomous household manager before trust is earned
- hide important decisions inside opaque AI behavior
- create pressure, guilt, or noisy engagement loops
- optimize for novelty over reliability
- require confirmation from the user for actions the user has already explicitly commanded, unless those actions are destructive

## Trust Model
The default trust model is `advisory-only` during the first major phase.

This means Olivia may:
- summarize state
- suggest next actions
- draft reminders, plans, or messages
- highlight conflicts, gaps, and follow-up needs

This means Olivia may not, by default:
- send messages
- modify important records
- commit to plans on behalf of users
- trigger external actions without explicit approval

## User Experience Standard
The product experience should feel:
- local and grounded
- useful in ordinary life, not only in idealized scenarios
- structured enough to lower chaos
- lightweight enough that using it does not become another chore

## Decision Filter
When evaluating a feature, document, or technical proposal, ask:
- Does this reduce mental overhead for the household?
- Does this increase trust or create ambiguity?
- Does this strengthen shared clarity and follow-through?
- Does this preserve local control over sensitive information?
- Is this a reversible choice while the product is still finding its shape?

## Facts
- The current direction is local-first with external AI where needed.
- The current direction is advisory-only, not autonomous execution.
- The target environment includes sensitive personal and household information.

## Assumptions
- Trustworthiness and legibility matter more than speed of automation in the first phases.
- A calm, explicit product posture will be more sustainable for household use than a highly agentic one.
- Human approval should remain visible and central while the product proves its usefulness.

## Open Questions
- What level of proactive nudging will feel helpful rather than intrusive?
- How should Olivia balance shared household visibility with individual privacy?
- What kinds of low-risk automation, if any, might later be acceptable?

## Deferred Decisions
- Exact product tone guidelines and interaction style.
- Future autonomy thresholds beyond the advisory-only phase.
- Notification policy across channels and surfaces.
