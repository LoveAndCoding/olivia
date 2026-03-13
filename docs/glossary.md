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

### Milestone
A readiness gate that indicates the project can move to the next phase based on documented evidence, not just effort expended.

### Non-Goal
Something the project intentionally does not aim to solve in the current phase, usually to preserve focus and avoid scope creep.

### Open Question
An unresolved issue that should remain visible until answered by evidence or stakeholder input.

### PM Operating Model
The documented decision-making posture for product-management work on Olivia: gather focused input, recommend a direction, document rationale, and leave behind execution-ready artifacts.

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

### User Action
An action explicitly and directly commanded by the user. Non-destructive user actions execute immediately — no confirmation step is needed, since they can be reversed through the normal UI (e.g., status changed again, ownership reassigned). Destructive user actions (archive, permanent delete) always require explicit confirmation regardless of source.

### Workflow
A concrete sequence of user and system interactions that delivers value around a specific household task or need.
