# Feature Spec: Task Steps

## Status
- Ready to build (spec complete; implementation deferred until M29 usage signal)

## Summary
Some household tasks are not single actions but multi-step processes that unfold over time — scheduling a fridge repair involves identifying the problem, finding a technician, booking an appointment, getting it fixed, and paying the bill. Today, Olivia's inbox items are flat: a task is either open or done, with no way to break it into smaller pieces. This spec defines task steps — an ordered list of actionable steps within a single inbox item — so that complex household tasks can be tracked incrementally without requiring the household to manage a separate project-management system. If this works well, fewer multi-step obligations are dropped mid-process, and the household can see exactly where a complex task stands at a glance.

## User Problem
- Many household tasks require multiple actions spread across days or weeks (home repairs, insurance claims, travel planning, medical follow-ups). Today these are tracked as a single inbox item, and all intermediate progress lives in the user's head.
- When a task stalls partway through, there is no record of what has been done or what remains. The user must reconstruct the state from memory.
- Different steps may involve different household members, but the current owner model is per-item only — there is no way to assign a specific step to the spouse.
- The current workaround — creating multiple separate inbox items — loses the relationship between steps and makes it hard to see the overall progress of a single effort.

## Target Users
- **Primary user:** Stakeholder — creates tasks, adds and manages steps, assigns step ownership, marks steps complete.
- **Secondary user:** Spouse — may own individual steps and mark them complete (within existing read/write permissions as they evolve).
- **Future users:** AI assistant — may suggest steps for common multi-step tasks and help track progress.

## Desired Outcome
If this feature works well:
- A household member can capture a complex task and its known steps in one place.
- Progress is visible at a glance — the user can see "3 of 5 steps done" without opening the full item.
- Steps can be added incrementally as the task unfolds — the user does not need to know all steps upfront.
- Different steps can be owned by different people, enabling lightweight task delegation within a single effort.
- The household no longer drops multi-step tasks because the intermediate state was only in someone's head.

## In Scope
- Adding an ordered list of steps to any existing inbox item.
- Each step has: a title (required), an owner (optional, defaults to the item's owner), and a status (pending or done).
- Steps are displayed in order within the item detail view.
- Steps can be added, reordered, marked done, and removed by the item owner.
- A step owner can mark their own step as done.
- Progress summary visible on the item card (e.g., "2/4 steps done").
- Adding steps to an existing item at any time (progressive discovery — not all steps need to be known at creation).
- Empty steps list is the default — steps are opt-in, not required.

## Boundaries, Gaps, And Future Direction

**Not handled in this spec:**
- Nested steps (steps within steps). Steps are a single flat list per item. If deeper hierarchy is needed, it should be a separate inbox item linked as a related task — a future capability.
- Due dates on individual steps. Step-level scheduling is deferred; the parent item's due date provides the overall timeline.
- Step-level notifications or nudges. Proactive nudges continue to operate at the item level.
- Automatic step suggestions by AI. AI-assisted step generation is a strong future direction but is out of scope for the initial implementation.
- Step-level notes or descriptions. Steps are titles only (decided — see Facts, Assumptions, And Decisions). A step that needs detailed context should be promoted to its own inbox item.
- Dependencies between steps (step B cannot start until step A is done). The list order implies sequence, but the system does not enforce it.

**Known gaps acceptable for this phase:**
- No AI involvement in step creation or management. Steps are entirely user-driven initially.
- No step-level activity history. Step completions are reflected in the parent item's history as a generic update.
- Steps cannot be converted to standalone inbox items (or vice versa) in this phase.

**Likely future direction:**
- AI-suggested steps for common task patterns (e.g., "This looks like a home repair — would you like me to suggest steps?").
- Step-level due dates and nudges for time-sensitive multi-step tasks.
- Converting a step to a full inbox item when it becomes complex enough to warrant its own tracking.
- Related/linked items as an alternative to deep nesting.

## Workflow

**Adding steps to a task:**

1. **User** opens an existing inbox item's detail view.
2. **User** taps "Add step" (or similar affordance) below the item's existing content.
3. **System** presents an inline text input for the step title.
4. **User** enters the step title and optionally assigns an owner.
5. **System** appends the step to the ordered list and updates the progress summary.
6. **User** repeats to add more steps as needed.

**Completing a step:**

1. **User** (item owner or step owner) taps the step's checkbox or completion affordance.
2. **System** marks the step as done, updates the progress summary, and records the change in item history.
3. When all steps are marked done, **System** prompts: "All steps complete — mark the task as done?" (advisory — does not auto-close).

**Adding steps via chat:**

1. **User** describes a multi-step task in chat (e.g., "I need to fix the fridge — add steps for finding a repair person, scheduling the appointment, and getting it fixed").
2. **Olivia** drafts the inbox item with proposed steps and presents for confirmation.
3. **User** confirms, edits, or adds additional steps.
4. **System** creates the item with steps attached.

**Reordering and editing steps:**

1. **User** long-presses or drags a step to reorder within the list.
2. **User** taps a step title to edit it inline.
3. **User** swipes or taps delete to remove a step (non-destructive — the step simply disappears from the list).

## Behavior
- Steps are an optional extension of inbox items. An item with zero steps behaves exactly as it does today.
- The progress summary ("2/4 steps") appears on the item card in the inbox list view, providing at-a-glance status.
- Step completion does not automatically change the parent item's status. The parent item remains in its current status until the user explicitly changes it.
- When all steps are complete, Olivia may surface an advisory prompt suggesting the user close the parent item. This is a suggestion, not an automatic action.
- Steps are ordered. The display order reflects the user's intended sequence, but the system does not enforce sequential completion — any step can be marked done at any time.
- Step ownership defaults to the parent item's owner but can be overridden per step.

## Data And Memory
- Steps are stored as an ordered array on the inbox item entity.
- Each step: `{ id, title, owner, status, position, createdAt, completedAt }`.
- Steps are local-first, stored in the same local database as inbox items.
- Step data is included in the item's sync payload if/when sync is implemented.
- Step changes generate history entries on the parent item (e.g., "Step 'Schedule appointment' marked done").
- No sensitive data considerations beyond what already applies to inbox items.

## Permissions And Trust Model
- This feature remains advisory-only for AI involvement.
- **User-initiated actions (execute immediately):** Adding a step, editing a step title, reordering steps, marking a step done, removing a step. These are all non-destructive and reversible.
- **Agentic actions (propose → confirm):** AI-suggested steps (future), auto-closing a task when all steps are done.
- **Destructive actions (always confirm):** Removing all steps from an item at once (bulk delete).
- Olivia should never auto-complete steps or auto-close items based on step completion.

## AI Role
- **Phase 1 (this spec):** No AI involvement. Steps are entirely user-created and user-managed.
- **Phase 2 (future):** AI may suggest steps when a user creates a task that matches a common multi-step pattern (e.g., "home repair", "insurance claim", "travel planning"). Suggestions are presented as a draft list the user can accept, edit, or dismiss.
- **Phase 3 (future):** AI may proactively suggest adding steps to stale, complex-sounding tasks that have no steps ("This task has been open for a week — would breaking it into steps help?").
- **If AI is unavailable:** The feature works fully without AI. Step management is a pure UI/data capability.

## Risks And Failure Modes
- **Over-structuring simple tasks:** If adding steps feels heavyweight, users will avoid it even when it would help. Mitigation: steps must be extremely fast to add (single tap + type) and entirely optional.
- **Step bloat:** Users might add too many fine-grained steps, making the list unwieldy. Mitigation: no artificial limit, but UX should gently discourage more than ~10 steps per item through visual density.
- **Confusion with shared lists:** Steps on a task could feel similar to shared list items. Key distinction: steps are sequential actions toward completing a single task; list items are independent items in a collection. The glossary should clarify this.
- **Orphaned steps:** If a parent item is archived or closed, steps should be archived/closed with it — never orphaned.

## UX Notes
- Adding a step should feel as lightweight as adding a line to a checklist. No modals, no forms — inline input only.
- The progress indicator ("2/4 steps") should be visible from the inbox list view without opening the item.
- Completed steps should remain visible (struck through) so the user can see what was done, but they should not dominate the view.
- The "all steps complete" advisory prompt should be gentle, not urgent. A small banner or inline message, not a modal.
- Steps should feel like a natural extension of the existing item, not a separate feature bolted on.

## Acceptance Criteria
1. A user can add one or more steps to any inbox item.
2. Each step has a title (required) and an owner (optional, defaults to parent item owner).
3. Steps display in user-defined order within the item detail view.
4. A step can be marked as done by the item owner or the step's assigned owner.
5. A progress summary (e.g., "2/4 steps") is visible on the item card in the inbox list view.
6. Steps can be added at any time after item creation (progressive discovery).
7. Steps can be reordered via drag or similar interaction.
8. Steps can be removed individually.
9. When all steps are marked done, an advisory prompt suggests closing the parent item.
10. Completing all steps does NOT automatically change the parent item's status.
11. An item with zero steps behaves identically to current behavior (no regression).
12. Step changes are reflected in the parent item's activity history.
13. All step UI component class names have corresponding CSS styles — unstyled components must not ship.
14. `npm run typecheck` passes with zero errors.

## Validation And Testing
- **Unit tests:** Step CRUD operations, ordering logic, progress calculation, owner inheritance.
- **Integration tests:** Step lifecycle within an item (add, complete, reorder, remove), history entry generation.
- **Manual validation:** Household uses steps on at least one real multi-step task and reports whether it reduces the tracking burden.
- **Regression protection:** Items without steps must remain unaffected. Existing inbox behavior is the primary regression target.
- `npm run typecheck` must pass.

## Dependencies And Related Learnings
- Depends on the existing inbox item data model (`InboxItem` in `packages/contracts`).
- Related: shared household inbox spec (`docs/specs/shared-household-inbox.md`) — steps extend the inbox item entity.
- Related: chat feature spec (`docs/specs/chat-feature.md`) — chat is one pathway for creating items with steps.
- Assumption A-007 (household will use structured state) is relevant — steps add more structure and should be validated against household willingness to maintain it.
- Decision D-060 (CSS completeness) applies to all step UI components.

## Open Questions
_All open questions resolved — see Decisions below._

## Facts, Assumptions, And Decisions
- **Fact:** The current `InboxItem` model has no parent-child or step relationship. Steps would be a new data structure.
- **Fact:** The `ListItem` entity (used in shared lists) has a `checked` boolean and `position` — similar to what steps need, but semantically different.
- **Assumption:** Household members will use steps for complex tasks if the interaction cost is low enough. Needs validation.
- **Assumption:** A flat step list (no nesting) is sufficient for household task complexity. Most household tasks have 3–7 steps.
- **Decision:** Steps are part of the inbox item, not separate entities. This keeps the data model simple and avoids the complexity of cross-entity relationships.
- **Decision:** No AI involvement in Phase 1. Steps must prove useful as a pure user-driven capability before AI is layered on.
- **Decision:** Steps are titles only — no descriptions. A step that needs a description is complex enough to be its own inbox item. Revisit if household feedback shows people consistently wanting to attach context to individual steps. _(CEO, 2026-03-22)_
- **Decision:** Step creation is available only after an item exists in the UI. Item creation stays fast and focused. The chat path naturally supports creating items with steps inline — that is the "create with steps" flow. No need to complicate the direct UI creation form. _(CEO, 2026-03-22)_
- **Decision:** Implementation deferred until M29 household usage signal. The spec is worth completing now, but building on top of an inbox that households are not actively using would be premature. _(CEO, 2026-03-22)_
- **Decision:** Visual spec from Designer required before implementation. The UX interactions (inline add, drag reorder, progress indicator on cards, completion advisory prompt) all need visual definition before engineering starts. _(CEO, 2026-03-22)_

## Deferred Decisions
- Step-level due dates and scheduling.
- AI-suggested steps and step templates.
- Step-to-item promotion (converting a step into its own inbox item).
- Step-level notifications and nudges.
- Cross-item step dependencies.
