# Olivia Product Vision

## Purpose
Olivia is a household command center designed to reduce the mental tax of managing day-to-day life. It should help a small household stay aligned on what needs doing, what is coming up, what matters now, and what has already been decided, without requiring one person to carry that coordination burden alone.

## Product Thesis
The best first version of Olivia is not a general-purpose AI companion. It is a focused household operations assistant that keeps shared context organized, surfaces the right information at the right time, and helps household members follow through on plans and responsibilities.

If Olivia becomes excellent at shared household state and follow-through, it can naturally support reminders, planning, memory, and coordination without trying to solve every assistant use case on day one.

## Primary Users
- Primary stakeholder and initial power user: the project owner.
- Secondary day-one user: the stakeholder's spouse.
- Possible future users: other household members, but not a core design target yet.

## MVP User Boundary
For the first implementation-ready workflow, Olivia should assume the stakeholder is the primary operator and evaluator. The spouse should remain part of the product context and may have visibility or lightweight participation where helpful, but the earliest spec should not require full two-user collaboration or role parity.

This keeps the product grounded in real household value while avoiding premature complexity around permissions, collaboration, and interface design.

## Core Problem
Household management creates invisible labor:
- Tasks are remembered by people instead of systems.
- Context is split across conversations, calendars, messages, and memory.
- Follow-through depends on one person manually checking, reminding, and coordinating.
- Important household information is easy to forget and hard to retrieve later.

The result is avoidable cognitive load, dropped responsibilities, and repeated coordination work.

## Desired Outcomes
Olivia should help the household:
- reduce the number of things that must be actively remembered
- improve visibility into shared responsibilities and plans
- make follow-through easier without creating more management overhead
- preserve important household context in a retrievable form
- feel more organized and less mentally fragmented

## Recommended First Wedge
The first wedge should be `shared household state and follow-through`.

That wedge is broad enough to create value across tasks, reminders, planning, and memory, but narrow enough to avoid becoming an unfocused "AI for everything" project. In practice, this means Olivia should first be designed around helping the household answer:
- What needs doing?
- What is coming up soon?
- What should we remember?
- What needs a nudge or decision?

## What Olivia Is
- A local-first household coordination system with AI-assisted support where useful.
- A durable source of household context, reminders, plans, and follow-through.
- A product intended to reduce cognitive overhead, not increase it.

## What Olivia Is Not
- Not a fully autonomous agent in its first major phase.
- Not a general chatbot whose main value is conversation for its own sake.
- Not a broad life operating system for every domain from the start.
- Not a system that treats external AI providers as the source of truth.

## Success Signals
Early product success should look like:
- fewer dropped household tasks and obligations
- less repeated coordination between spouses
- faster recall of important household information
- more confidence about what is happening, who owns what, and what is next
- reduced dependence on one person's memory as the default operating system

## Facts
- The project is greenfield.
- The product is intended to help manage the household lives of the stakeholder and spouse.
- Logic and sensitive information should be stored locally.
- External AI providers may be used where helpful, but are not the system of record.
- The current trust model direction is advisory-only.
- The recommended MVP surface is an installable mobile-first PWA.
- The next product-definition step is to turn the shared household inbox workflow and chosen interface direction into an implementation-ready plan.

## Assumptions
- A household command center is a stronger first product shape than a general assistant.
- The project owner will be the most active early user and evaluator.
- Shared household state is a better first wedge than a single narrow utility such as reminders alone.
- Text interaction is sufficient for early value, even if richer interfaces arrive later.

## Open Questions
- What is the minimum notification set that creates useful signal without creating noise?
- What evidence would justify moving beyond the PWA to a native shell or shared-display mode?
- What level of spouse visibility or lightweight interaction is most useful in the earliest version without requiring full collaboration parity?

## Deferred Decisions
- Whether native clients or a dedicated shared-display surface are warranted beyond the PWA.
- Deployment model beyond local-first constraints.
- Specific implementation stack and infrastructure choices.
