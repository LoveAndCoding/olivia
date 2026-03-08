# Olivia Interface Direction

## Purpose
This document records the current interface recommendation for Olivia so future agents can plan implementation work without reopening the same surface-selection debate from scratch.

It should be read alongside:
- `docs/vision/product-vision.md`
- `docs/vision/product-ethos.md`
- `docs/specs/shared-household-inbox.md`
- `docs/learnings/decision-history.md`

## Status
Current recommendation for MVP and near-term planning.

## Decision Summary
Olivia should launch first as an installable, mobile-first PWA that acts as the canonical interface for the shared household inbox workflow.

This does **not** mean "just a website." It means:
- app-shaped UX
- home screen installability
- offline-tolerant behavior where practical
- push notifications where supported and useful
- the same core experience working on phone and desktop

## Why This Is The Right Near-Term Surface

### 1. The product need is mobile capture plus deliberate review
The stakeholder's current household workflow lives mostly in heads, conversations, text messages, a grocery note, and a physical whiteboard/calendar. Tasks arise in many contexts, often away from a desktop. That makes quick mobile capture essential.

At the same time, the expected "getting things done" behavior is still a direct review experience: checking what is open, what is coming up, and what needs attention. Olivia therefore needs both:
- low-friction capture throughout the day
- a calm structured review surface for follow-through

A mobile-first PWA supports both without forcing the project into a native-only implementation path too early.

### 2. The first workflow does not yet require native-only capabilities
The current inbox workflow is centered on:
- adding an item from text
- confirming the parsed result before save
- reviewing grouped household state
- updating status, ownership, and notes
- allowing spouse read-only visibility

That workflow fits well inside an installable web app.

### 3. This preserves reversibility while product habits are still unknown
Olivia's current product posture favors reversible early decisions. The riskiest unknown is still whether the household inbox workflow becomes genuinely useful in real life, not whether the product can take advantage of every possible mobile OS integration on day one.

Starting with an installable PWA preserves the option to:
- continue with the PWA if it proves sufficient
- add a native shell later if notifications, widgets, or capture integrations become central
- support desktop and future shared-display modes from the same product center

## Why Not Slack As The Primary Surface
Slack may be useful for experiments, but it should not be the main product interface.

Reasons:
- Olivia needs structured shared state, not a message stream as the source of truth.
- Household review is better served by calm lists, ownership views, and item detail than by conversational history.
- Slack brings noise, interruption, and weak long-term state legibility compared with a dedicated household surface.

Slack or messaging bridges may still become secondary capture paths later if they reduce friction without displacing the canonical household store.

## Why Not Fully Native First
Native may become the right long-term shell, but it is not the best first commitment.

Reasons:
- the product still needs to validate the core workflow before locking in a heavier client strategy
- the MVP data and interaction model are compatible with a PWA
- cross-platform installability is useful immediately
- a PWA keeps implementation effort concentrated on the household model, capture flow, and review loop

## Notification Direction
Notifications should be included in the near-term product direction, but with a narrow and calm posture.

Recommended early notification use:
- due soon
- overdue or stale items needing review
- optional digest or summary

Recommended early notification audience:
- primary operator first

Notifications should bring the user back into Olivia's structured review experience. They should not become a second inbox or chat-like interaction stream.

## Multi-User Implications
This interface direction is compatible with the current primary-operator model.

Near term:
- stakeholder is the primary operator
- spouse has read-only visibility
- push and proactive prompts primarily target the stakeholder

Later:
- spouse participation can expand without changing the canonical product surface
- household-shared displays, such as a tablet replacing the physical whiteboard/calendar, remain open future options

## Native Revisit Triggers
The project should revisit whether a native shell is warranted if one or more of the following become central to real use:
- richer or more reliable notification workflows than the PWA can comfortably support
- home screen widgets or other glanceable household surfaces
- share-sheet or cross-app capture from email, messages, or photos
- stronger background behavior requirements
- a tablet or kiosk-like shared household display that benefits from deeper platform integration

## Non-Goals Of This Decision
This document does not decide:
- the implementation stack
- the sync architecture
- the exact push provider or notification plumbing
- whether native apps will eventually exist
- later AI-driven email or external-input automation

## Open Questions
- What is the minimum notification set that feels useful without adding noise?
- What installation and onboarding path will make an installable PWA feel natural for both users?
- When should spouse participation move beyond read-only visibility?
- What shared-display mode, if any, becomes useful enough to replace the current wall whiteboard/calendar?

## Summary
The recommended near-term interface is:
- canonical surface: installable mobile-first PWA
- primary interaction: fast text capture plus structured review
- notification posture: narrow, calm, primary-operator focused
- long-term stance: native remains an option, but should be earned by usage evidence rather than assumed up front
