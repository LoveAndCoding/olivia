# Olivia Glossary

## Purpose
This glossary defines stable project and product language so future docs, specs, and agents use the same terms consistently.

## Terms

### Action
An operation Olivia could potentially take or propose within a workflow. Actions are classified as either agentic (Olivia-proposed) or user-initiated, and the trust model treats them differently.

### Agentic Action
An action Olivia proposes or suggests based on its own inference, rule evaluation, or pattern detection, without the user having explicitly commanded it. Agentic actions always require explicit user confirmation before execution.

### Advisory-Only
A trust posture where Olivia may organize, suggest, summarize, draft, and highlight, but does not take consequential actions without explicit user approval.

### Assumption
A working belief that influences current planning or execution but has not yet been fully validated.

### Decision
A chosen direction that should guide future work until it is explicitly revised or superseded.

### Durable Memory
Information intentionally preserved so future agents or collaborators can recover important context without relying on raw conversation history.

### External AI Provider
A third-party model or service used for reasoning or language tasks. External providers are dependencies, not the source of truth for household data or project memory.

### Fact
Something currently known to be true and reliable enough to guide work without caveat.

### Follow-Through
The process of ensuring a household responsibility, plan, or commitment moves from awareness to completion.

### Household Command Center
The current product framing for Olivia: a system for coordinating shared state, responsibilities, reminders, and household context rather than a generic assistant for all possible tasks.

### Household Memory
Retrievable information the household may need over time, such as plans, notes, decisions, preferences, or important contextual details.

### Household State
The current, shared operational picture of what is happening in the household, including responsibilities, upcoming needs, status, and relevant context.

### Learnings
Durable takeaways from planning, implementation, or usage that should shape future product or project decisions.

### Local-First
A design principle where sensitive logic and data are stored and controlled locally wherever practical, with external services used selectively rather than as the authoritative core of the system.

### Meal Plan
A structured plan for household meals over a defined time period, potentially linked to shared lists, preparation tasks, and recurring planning rituals.

### Milestone
A readiness gate that indicates the project can move to the next phase based on documented evidence, not just effort expended.

### Non-Goal
Something the project intentionally does not aim to solve in the current phase, usually to preserve focus and avoid scope creep.

### Open Question
An unresolved issue that should remain visible until answered by evidence or stakeholder input.

### PM Operating Model
The documented decision-making posture for product-management work on Olivia: gather focused input, recommend a direction, document rationale, and leave behind execution-ready artifacts.

### Reminder
A first-class household follow-through object that represents something Olivia should surface or prompt about at a meaningful time, potentially linked to an inbox item, a recurring routine, or a future planning workflow.

### Recurrence Rule
The schedule definition for a recurring reminder, routine, or task, such as daily, weekly, monthly, or a custom interval pattern.

### Recurring Routine
A household task or obligation that repeats on a defined schedule, such as cleaning, maintenance, bills, or other ongoing coordination work.

### Shared List
A collaborative list for a specific household purpose, such as grocery shopping, packing, or other lightweight collection-based coordination.

### Shared Household State
The subset of household state that should be visible or understandable across household members for coordination purposes.

### Source Of Truth
The artifact or system that should be treated as authoritative for a given kind of information.

### Spec
A product-level document defining the scope, workflow, constraints, and acceptance criteria for a feature before implementation planning begins.

### Stakeholder
The person providing product direction and decision authority for Olivia. In the current project, the primary stakeholder is the project owner.

### Trust Model
The set of rules defining what Olivia may do, what requires approval, and what the system must not do automatically.

### AI-Assisted Content
Content drafted by Olivia using an external AI provider and H4 temporal data (activity history, unified weekly view) as input, which the user reviews and accepts or edits before it becomes the canonical record. Distinct from advisory output: AI-assisted content is generated without a direct user command, but always requires explicit user acceptance before it is saved. First introduced in H5's AI-assisted planning ritual summaries workflow.

### Trusted Action
An H5 Selective Trusted Agency operation — either AI-assisted content generation or a proactive nudge — that Olivia initiates based on pattern detection or scheduled data rather than a direct user command. All trusted actions in H5 Phase 1 remain advisory-only: they propose or surface, but do not modify records without explicit user approval.

### Proactive Nudge
An Olivia-initiated prompt that surfaces actionable household state without the user having commanded it. Examples: "Weekly cleaning is overdue — mark done or skip to next week?" or "Planning ritual is due this Sunday." Proactive nudges are agentic actions — they require user response before any record change occurs.

### Activity History
A reverse-chronological log of completed and resolved household activity across all four Horizon 3 workflow types (completed routines, resolved reminders, past meal plan entries, closed inbox items, and checked-off shared list items). The second Horizon 4 surface; pairs with the Unified Weekly View to form Olivia's temporal layer — the weekly view shows the present and near future, activity history shows the recent past.

### Unified Weekly View
The first Horizon 4 surface in Olivia: a single read-only screen that assembles the household's scheduled and due items from all four Horizon 3 workflow types (reminders, recurring routines, meal plans, inbox items) into a day-by-day picture of the current calendar week (Monday through Sunday). Introduces no new entities — it surfaces existing H3 state in a cross-workflow temporal context.

### Push Notification
An OS-level device notification delivered outside the PWA when the app is not in the foreground. In Olivia's context, push notifications are the Phase 2 delivery extension for proactive nudges — the same nudge content that appears in the in-app nudge tray in Phase 1, surfaced to the device lock screen or notification center. Requires device token storage and server-side scheduling infrastructure; deferred from H5 Phase 1 until in-app nudge utility is household-validated.

### Completion Window
The time-of-day range when the household typically completes a specific routine, derived from historical completion timestamps in `routine_occurrences.completedAt`. Used by AI-enhanced nudge timing to shift push notification delivery to more relevant times rather than delivering immediately when the scheduler detects an overdue state. A completion window requires a minimum number of historical completions (recommended: 4) before it is considered reliable enough to influence delivery timing. First introduced in H5 Phase 2 AI-enhanced nudge timing (Layer 1).

### Timing Signal
A data point derived from household activity patterns that influences when Olivia delivers a proactive nudge, as opposed to the trigger condition (which determines whether a nudge should exist at all). Timing signals are strictly about delivery optimization — they do not change what nudges exist or suppress nudges permanently. Examples: per-routine completion windows, per-household active hours, cross-workflow schedule context. The trust model is unchanged: timing signals affect when Olivia speaks, not what Olivia can do.

### User Action
An action explicitly and directly commanded by the user. Non-destructive user actions execute immediately — no confirmation step is needed, since they can be reversed through the normal UI (e.g., status changed again, ownership reassigned). Destructive user actions (archive, permanent delete) always require explicit confirmation regardless of source.

### Chat
Olivia's conversational AI interface (H5 Phase 3). Users can ask about household state, request task creation, set reminders, add list items, and interact with the full H2-H5 feature surface through natural conversation. Olivia suggests and drafts but never auto-executes; all state changes require explicit user confirmation. Chat complements rather than replaces structured workflow screens.

### Workflow
A concrete sequence of user and system interactions that delivers value around a specific household task or need.
