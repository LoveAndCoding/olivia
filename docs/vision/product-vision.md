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

## Product Wedge
The product wedge is `shared household state and follow-through`.

That wedge is broad enough to create value across tasks, reminders, planning, and memory, but narrow enough to avoid becoming an unfocused "AI for everything" project. In practice, Olivia helps the household answer:
- What needs doing?
- What is coming up soon?
- What should we remember?
- What needs a nudge or decision?

This wedge has been implemented and expanded across five horizons:
- **H2 (MVP):** shared household inbox workflow
- **H3 (Coordination Layer):** first-class reminders, shared lists, recurring routines, meal planning — all four workflows built and available
- **H4 (Memory & Planning):** unified weekly view, activity history, planning ritual support — temporal layer complete
- **H5 (Selective Trusted Agency):** AI-assisted planning ritual summaries, proactive nudges, push notifications, completion-window timing, conversational chat — three phases of trusted agency shipped

The current active milestone is M29 (Post-Chat Household Validation), which focuses on observing real household usage before deciding the next build direction.

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
- The product is intended to help manage the household lives of the stakeholder and spouse.
- Olivia is a native iOS app (Capacitor) distributed via TestFlight, with a web fallback. Version 0.1.0 released 2026-03-21.
- The product spans five horizons of features: shared household inbox (H2), coordination layer with four workflow types (H3), temporal memory and planning (H4), and selective trusted agency including AI chat (H5).
- Logic and sensitive information are stored locally in a household-controlled SQLite database.
- External AI providers (Claude API) are used for advisory content generation and chat, but are not the system of record.
- The current trust model direction is advisory-only: Olivia proposes, the user decides.

## Assumptions
- A household command center is a stronger first product shape than a general assistant.
- The project owner will be the most active early user and evaluator.
- Shared household state was the right first wedge and remains the foundation for all coordination workflows (validated through H3-H5).
- The advisory-only trust model is appropriate for the current phase; automation should be earned through validated usage.

## Open Questions
- What evidence from M29 household validation should determine the next build direction (Track A-D)?
- When should spouse-specific collaborative flows become first-class rather than secondary?
- What would justify an Android build alongside iOS?

## Deferred Decisions
- Android or other platform support.
- Spouse write access and multi-user roles.
- Rule-based automation and increased autonomy beyond advisory.
- Deployment model beyond single-household local-first.
