# Feature Spec: Meal Planning

## Status
- Approved (CEO, 2026-03-15)

## Summary
Olivia supports shared lists for lightweight household coordination and recurring routines for repeating obligations, but neither workflow helps the household answer the weekly question: what are we eating this week, and what do we need to buy? This spec defines weekly meal planning as a focused Horizon 3 workflow. A meal plan is a titled weekly grid where the household can assign meals to days, note the shopping items needed for each meal, and generate a grocery shopping list via the existing Shared Lists workflow. The goal is not a recipe database or nutrition tracker — it is a lightweight weekly planning surface that reduces the overhead of figuring out dinner every night and eliminates the separate "remember to buy ingredients" step by connecting directly to shared lists. If this workflow works well, the household gains a place to think through the week's meals once and turn that plan into a grocery list without any extra coordination.

## User Problem
- The household faces a recurring weekly question — what are we eating this week? — that currently has no home in Olivia.
- Without a shared planning surface, one household member holds the week's meal plan mentally or in a private notes app, recreating invisible coordination labor.
- Grocery runs are disconnected from the meal plan: without a link from planned meals to a shopping list, someone must manually review what was planned and translate it into a list.
- The inbox and shared lists do not fit this use case well. Inbox items are for tracked responsibilities; lists are for items to check off. Neither supports the "assign a meal to a day" interaction that makes weekly meal planning legible.

## Target Users
- Primary user: stakeholder, who creates meal plans, assigns meals to days, adds shopping items, and generates the grocery list.
- Secondary user: spouse, with shared read visibility into all meal plans, following the same read-only pattern established across Horizon 3 workflows.
- Future users: spouse write access and collaborative meal planning are likely future directions but not a target in this phase.

## Desired Outcome
- The household has a single, shared place to plan meals for the week.
- Creating a plan and assigning meals to days feels fast — no more overhead than maintaining a private notes list.
- When the household is ready to shop, generating a grocery list from the plan requires one action and produces a usable Shared List.
- Both household members can see the week's plan without one person relaying it.
- Olivia does not become a recipe manager or nutrition tracker; it stays in its lane as a lightweight coordination layer.

## In Scope
- Creating a named weekly meal plan (title defaults to "Week of [Monday date]"; editable).
- Assigning a meal name to any day in the plan (Monday through Sunday, any time slot — no enforced breakfast/lunch/dinner types in Phase 1).
- Each day may have multiple meal entries (e.g., a breakfast and a dinner); meals are listed in creation order per day.
- Adding optional shopping items to each meal (a plain text list of ingredients or items needed for that meal).
- Editing or removing meals and their shopping items.
- Viewing the current week's active plan as a weekly grid: days as rows or columns, meals listed per day.
- Viewing past meal plans in an archive-style list, browseable but not editable once archived.
- Generating a grocery shopping list from a meal plan: creates a new Shared List named "Grocery — [plan title]" with all shopping items from all meals in the plan, deduplicated by label in the item list (items are still added individually — no automatic merge, just grouped by day in append order).
- Archiving a meal plan when the week is done (confirmation required).
- Deleting a meal plan (higher-friction confirmation; permanent).
- Spouse read-only view with a clear role indicator, consistent with all Horizon 3 workflows.
- Offline-tolerant creation and edits using the same client outbox pattern as other Horizon 3 workflows.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Recipe management: no recipe database, no saved recipes, no nutrition information.
  - Nutrition tracking or caloric targets.
  - Ingredient quantities or units on shopping items (items are plain text only in Phase 1).
  - Shopping item deduplication across meals (if two meals both need "olive oil," two items appear in the generated list; the user decides how to consolidate).
  - Automatic meal suggestions or AI-generated meal ideas (deferred; Phase 1 is fully manual).
  - Recurring meal plans (e.g., auto-generate next week's plan from a template).
  - Linking a meal plan to a recurring routine (e.g., "every Sunday, generate next week's plan").
  - Pushing shopping items to an existing list rather than creating a new one.
  - Editing a generated grocery list from within the meal plan view (users edit it in Shared Lists directly).
  - Spouse write access to meal plans.
  - Meal plan history analytics or reports.
  - Drag-to-reorder meals within a day.
  - Multi-week planning or planning horizons beyond the current week.
  - Export or sharing of meal plans outside the app.
- Known gaps acceptable for this phase:
  - Shopping items are free-text per meal; no structured quantity, unit, or category.
  - Two meals requiring the same ingredient create two separate items in the generated list.
  - There is no batch-clear for all meals in a day.
  - No push notifications for meal plans or generated grocery lists.
- Likely future direction:
  - Spouse write access (natural next step after primary workflow is validated).
  - AI-assisted meal suggestions based on past plans or user preferences.
  - Saved meal favorites or "commonly used meals" for faster entry.
  - Linking meal plans to a recurring "weekly planning" routine.
  - Pushing shopping items to an existing grocery list instead of always creating a new one.
  - Shopping item quantities and categories for more useful grocery lists.

## Workflow
- Primary workflow: create a meal plan for the week
  1. User navigates to the Meal Planning surface.
  2. User taps "New Plan."
  3. A new plan is created with a default title ("Week of [Monday of current week]") and the current week pre-filled as the date range.
  4. User may edit the title.
  5. Plan is saved immediately (user-initiated, non-destructive).
  6. User is taken to the plan detail view showing seven days as a scrollable list.

- Primary workflow: assign a meal to a day
  1. User views a meal plan detail.
  2. User taps the inline add input under any day (e.g., "Add meal for Monday").
  3. User types a meal name (e.g., "Pasta Bolognese") and submits.
  4. The meal appears under that day immediately.
  5. Optionally, user taps the meal to expand it and add shopping items — one item per line or comma-separated in a plain text input.
  6. Shopping items save immediately.

- Primary workflow: generate a grocery list
  1. User views a meal plan with at least one meal that has shopping items.
  2. User taps "Generate Grocery List."
  3. Olivia creates a new Shared List named "Grocery — [plan title]" containing all shopping items from all meals in the plan, appended in day order and then meal order within each day.
  4. User is navigated to the new Shared List in the Shared Lists surface.
  5. The meal plan retains a reference to the generated list (shown as a link in the plan detail for future reference).
  6. Generating a list does not archive or modify the meal plan.
  7. Generating a list a second time creates a new Shared List (does not overwrite the previous one); the plan detail shows all generated lists with timestamps.

- Secondary workflow: view the current plan
  1. User navigates to Meal Planning.
  2. The active plan for the current week (if one exists) is shown at the top.
  3. User sees each day with its meals listed; each meal shows the name and item count (not the full items list in the index view).
  4. User taps a meal to see full detail and shopping items.

- Secondary workflow: browse past plans
  1. User navigates to Meal Planning.
  2. User scrolls or filters to see past plans.
  3. Past plans are read-only; no editing is permitted after archiving.
  4. User can view plan detail and items but cannot generate a new list from an archived plan (deferred).

- Secondary workflow: archive a plan
  1. User selects the archive action from the plan card or plan detail.
  2. System presents a confirmation: "Archive this plan? It will move to your plan history and can no longer be edited."
  3. User confirms.
  4. Plan moves to archived status.

- Secondary workflow: delete a plan
  1. User selects the delete action from an active or archived plan.
  2. System presents a higher-friction confirmation: "Permanently delete [plan title]? This will remove the plan and all its meals. This cannot be undone."
  3. User confirms.
  4. Plan and all meals are permanently removed. Any previously generated Shared Lists are not deleted.

- Secondary workflow: spouse read-only view
  1. Spouse opens the app and navigates to Meal Planning.
  2. Spouse sees the same plan index and detail as the stakeholder.
  3. Write actions are not available; a per-screen role banner communicates the read-only constraint.
  4. Spouse can view the week's meals without needing to ask the stakeholder.

## Behavior
- Facts the system records per meal plan:
  - Plan id.
  - Plan title.
  - Week start date (ISO date, always a Monday).
  - Status: `active` or `archived`.
  - Created timestamp, updated timestamp, archived timestamp when applicable.
  - Version counter for optimistic concurrency.
  - Generated list references: array of `{ listId, generatedAt }` for all Shared Lists generated from this plan.

- Facts the system records per meal entry:
  - Meal id.
  - Parent plan id.
  - Day of week: 0 (Monday) through 6 (Sunday).
  - Meal name (required; plain text).
  - Shopping items: ordered list of plain text strings (may be empty).
  - Position (integer; append-order within the day for Phase 1).
  - Created timestamp, updated timestamp.
  - Version counter.

- Derived state Olivia surfaces:
  - Meal count per day (shown on plan index card).
  - Total shopping item count across all meals in a plan (shown on plan index card).
  - Whether the plan has any generated grocery lists and when the most recent was created.
  - Days with no meals assigned (presented as empty day rows, not errors).

- Actions and approval requirements:

| Action | User-initiated | Agentic (Olivia-proposed) |
|---|---|---|
| Create plan | Execute immediately | Confirm before save |
| Edit plan title | Execute immediately | Confirm before apply |
| Add meal to a day | Execute immediately | Confirm before save |
| Edit meal name | Execute immediately | Confirm before apply |
| Add shopping item to a meal | Execute immediately | Confirm before save |
| Edit shopping item | Execute immediately | Confirm before apply |
| Remove meal | Execute immediately | Confirm before apply |
| Generate grocery list | Execute immediately | Confirm before save |
| Archive plan | Always confirm | Always confirm |
| Delete plan | Always confirm | Always confirm |
| Restore archived plan | Execute immediately | Confirm before apply |

## Data And Memory
- Durable state:
  - Meal plan records with full property set.
  - Meal entry records per plan, including shopping item lists.
  - Generated list references (links from plans to Shared List ids).
- Transient state:
  - Inline meal input field text before submission.
  - Shopping item input field text before submission.
  - Optimistic state for new meals and items before server acknowledgment.
  - Offline outbox commands awaiting reconnect flush.
- Sensitive data handling:
  - Meal names and shopping items are household-contextual but not typically sensitive in the same way as medical or financial data.
  - However, all meal plan data is local-first and household-controlled by default. No meal plan content should be sent to an external AI provider unless the user explicitly invokes an AI-assisted feature.
  - If AI-assisted meal suggestions are added in a future slice, only the minimum necessary content should be sent and no external provider becomes the system of record.

## Permissions And Trust Model
- This feature remains advisory-only; no Olivia-proposed action may create or modify a meal plan without explicit user confirmation.
- Non-destructive user-initiated actions (create plan, add meal, edit name, add shopping item) execute immediately without a confirmation step.
- Generating a grocery list is user-initiated and non-destructive (it creates a new Shared List; it does not modify the plan or any existing list). It executes immediately.
- Destructive actions (archive plan, delete plan) always require confirmation regardless of initiator.
- Spouse access is read-only; spouse cannot create, edit, add meals, or generate lists.
- The read-only state is communicated via a per-screen role banner, following the established Horizon 3 pattern.
- Olivia must never:
  - Auto-generate a meal plan from observed household history.
  - Auto-archive a plan at the end of the week.
  - Modify an existing Shared List when generating a grocery list (it always creates a new one).
  - Send meal plan contents to an external AI provider without explicit user action.

## AI Role
- Where AI adds potential value (deferred to future slices):
  - Suggesting meals based on past plans, preferences, or household dietary notes.
  - Parsing natural-language meal assignment: "Add pasta and salad to Tuesday" → structured plan entries.
  - Generating a structured ingredient list from a meal name when no items have been added manually.
  - Summarizing the week's plan on request ("What are we eating this week?").
- What must work without AI:
  - Creating a meal plan and assigning meals to days.
  - Adding and editing shopping items.
  - Generating a grocery list from plan items.
  - Viewing current and past plans.
- Fallback behavior if AI is unavailable:
  - All structured interactions remain fully functional.
  - No AI dependency in the first implementation slice.

## Risks And Failure Modes
- Risk 1: meal planning becomes a lightweight recipe manager.
  - Users may be tempted to use the shopping items field to store full recipes rather than just shopping items.
  - Mitigation: the field label and placeholder copy should set expectations ("What do you need to buy for this meal?"). Phase 1 has no recipe-length input — if a user wants a recipe, Olivia is not the right tool yet.
- Risk 2: the generated grocery list is not useful because it lacks quantities.
  - A list with "olive oil" and "olive oil" from two meals is only marginally better than no list.
  - Mitigation: document this as a known gap acceptable for Phase 1. The workflow still reduces coordination overhead: the household has one list rather than two separate mental notes. Quantities and deduplication belong in a future slice.
- Risk 3: generating a grocery list multiple times creates confusing duplicate Shared Lists.
  - Mitigation: the plan detail shows all generated lists with timestamps. The user sees the history and can manage which list to use. Future direction may add a "regenerate and replace" option.
- Risk 4: spouse finds the read-only constraint frustrating for collaborative meal planning.
  - Mitigation: communicate the constraint clearly via the role banner. Spouse write access is the obvious next evolution; the spec explicitly defers it rather than blocking the workflow.
- Risk 5: the meal planning surface is underused because it adds overhead without habit-forming value.
  - Mitigation: the generate-grocery-list action is the primary value driver. If the household uses Olivia for grocery shopping (which shared lists suggests they do), the meal plan → grocery list connection creates a natural usage trigger. Household validation will reveal whether the planning step is worth the setup cost.

## UX Notes
- The meal plan should feel like a lightweight weekly whiteboard, not a complex scheduling tool. Simple day rows with meal names is enough.
- The primary interaction is: open plan → tap day → type meal name → optionally add shopping items → done.
- Shopping items per meal should be a plain text input (one item per line, or comma-separated) — not a structured list-within-a-list modal. Simplicity matters more than structure here.
- The "Generate Grocery List" button should be prominent in the plan detail view once at least one shopping item exists. It is the workflow's payoff action.
- After generating a list, navigate the user directly to the new Shared List so they can review and edit it immediately. Do not leave them on the meal plan detail with only a confirmation toast.
- The plan index should show only the title, week date range, meal count, and whether a grocery list has been generated. Details belong in the plan detail.
- Past plans should be visually distinct from the active plan — muted styling, clear "Archived" label, no write affordances.
- Day rows with no meals should be visible (not hidden), to encourage the user to fill them in without making the empty state feel like a broken interface.
- Anti-patterns to avoid:
  - Hiding empty days, which breaks the visual weekly structure.
  - Requiring a modal for adding a meal to a day.
  - Automatically generating a grocery list when the user archives a plan.
  - Treating the grocery list generation as a one-time action that prevents re-generation.
  - Making shopping items a required field before saving a meal.

## Acceptance Criteria
- 1. Given a stakeholder creates a new meal plan, when the plan is saved, then it appears in the plan index with the correct default title (based on current week's Monday date) and persists across sessions.
- 2. Given a stakeholder assigns a meal to a day, when the meal name is submitted, then the meal appears under that day immediately in the plan detail view.
- 3. Given a stakeholder adds shopping items to a meal, when the items are saved, then the items persist on the meal entry and the plan's total shopping item count reflects the update.
- 4. Given a meal plan has at least one meal with shopping items, when the stakeholder taps "Generate Grocery List," then a new Shared List is created named "Grocery — [plan title]" containing all shopping items from all meals in the plan in day and meal order.
- 5. Given the grocery list is generated, when the action completes, then the user is navigated to the new Shared List in the Shared Lists surface, and the plan detail records a reference to the generated list.
- 6. Given the stakeholder generates a grocery list a second time, when the action completes, then a new Shared List is created (the previous list is not modified), and the plan detail shows both generated lists with timestamps.
- 7. Given a stakeholder archives a meal plan, when the archive is confirmed, then the plan moves to archived status, is no longer presented as the active plan, and is visible in the plan history view.
- 8. Given a stakeholder deletes a meal plan, when the higher-friction delete confirmation is accepted, then the plan and all its meal entries are permanently removed. Any previously generated Shared Lists are not deleted.
- 9. Given the spouse is logged in, when the spouse navigates to Meal Planning, then the spouse sees the same plan index and plan detail as the stakeholder but cannot create, edit, add meals, add shopping items, generate lists, archive, or delete anything.
- 10. Given the spouse is logged in, when Olivia renders the meal plan index or detail, then a clear per-screen role banner communicates that the spouse is in read-only view.
- 11. Given the user is offline, when the stakeholder adds a meal or shopping items, then the action is recorded in the outbox and the UI reflects the optimistic state, and the action is flushed to the server on reconnect.
- 12. Given external AI is unavailable, when the stakeholder creates a plan and assigns meals from structured fields, then the plan is saved, listed, and managed correctly without AI dependency.
- 13. Given Olivia proposes creating or modifying a meal plan on its own initiative, when the proposal is presented, then the user must explicitly confirm before any write executes.

## Validation And Testing
- Unit-level:
  - Meal entry ordering within a day (append order maintained).
  - Shopping item list parsing and persistence.
  - Grocery list generation: shopping items from all meals are collected in the correct day and meal order.
  - Role enforcement returning read-only errors for spouse write attempts.
  - Versioned command conflict detection for concurrent plan edits.
- Integration-level:
  - Create, edit, add-meal, add-items, archive, delete flows persist correctly across sessions.
  - Generating a grocery list creates a correctly named and populated Shared List record.
  - Generated list reference is stored on the plan and retrievable.
  - Archived plans are not returned in the active plan query and appear in the history view.
  - Delete permanently removes the plan and all meal entries; Shared List records are not deleted.
  - Spouse read queries succeed; spouse write commands return a read-only error.
  - Offline outbox commands for plan edits flush correctly on reconnect.
- Household validation:
  - The stakeholder uses meal planning for a real week and reports whether the day-assignment interaction is fast enough to replace private notes or mental planning.
  - The household uses the generated grocery list for a real grocery run and evaluates whether the list is useful despite lacking quantities.
  - The spouse reports whether the read-only plan view reduces the need to ask the stakeholder "what are we eating this week?"
  - The household evaluates whether the meal plan → grocery list connection reduces the shopping coordination overhead compared to the current workflow.

## Dependencies And Related Learnings
- `D-002`: advisory-only trust model remains in force; Olivia cannot create or modify meal plans on its own initiative.
- `D-004`: primary-operator model continues; spouse write parity is deferred to a later slice.
- `D-007`: installable mobile-first PWA is the canonical surface; all meal planning UX is designed for mobile-first interaction.
- `D-008`: local-first modular monolith with SQLite and Dexie remains the architecture center.
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes still require confirmation; destructive writes always require confirmation.
- `D-012`: meal planning is the fourth Horizon 3 spec target, deferred until recurring and list primitives were proven.
- `D-016`: shared lists are a distinct, proven workflow; meal planning's grocery list generation depends on and extends this primitive.
- `D-019`: meal planning is confirmed as the next Horizon 3 spec target; first slice is weekly meal planning that generates a grocery list via shared lists.
- `A-006`: versioned command sync is sufficient for household-level meal plan concurrency.
- `A-008`: shared recurrence infrastructure exists but is not used in Phase 1 of this spec; recurring meal plan templates are a future direction.
- `docs/specs/shared-lists.md`: the grocery list generation action creates a Shared List record using the same data model and workflow as user-created lists. The implementation must ensure that generated lists are indistinguishable from manually created ones in the Shared Lists surface.
- `docs/specs/recurring-routines.md`: a future integration may link a weekly meal planning routine to auto-prompt for a new plan each week; this is deferred.

## Open Questions
- None blocking the first implementation slice.
- Architecture decision for Founding Engineer: when generating a grocery list, should the system collect all shopping items across meals and pass them as a bulk create command to the Shared Lists domain, or should each item be a separate command? Bulk create is more efficient; individual commands are more consistent with the offline outbox pattern.
- Design decision deferred to visual spec: where does "Meal Planning" appear in the main nav? A new tab, or consolidated under a household section with Lists and Routines?
- Design decision deferred to visual spec: how is the weekly plan displayed on mobile — days as rows (scrollable list) or a condensed grid? Rows are more readable for multi-meal days; a grid gives a better at-a-glance weekly view.
- Design decision deferred to visual spec: how are shopping items entered per meal — an expandable inline text area, a separate sub-detail view, or a sheet that slides up over the plan?
- Design decision deferred to visual spec: what does the "Generate Grocery List" affordance look like — a button at the top of the plan, a floating action button, or a contextual action in the plan menu?
- Product question for future spec: should the household be able to push shopping items to an *existing* grocery list rather than always creating a new one? This would be useful if the household adds items to a persistent grocery list throughout the week and wants meal planning items merged in.

## Facts, Assumptions, And Decisions
- Facts:
  - Olivia has working inbox, reminder, shared list, and recurring routine implementations. Meal planning is the fourth Horizon 3 sibling workflow.
  - The Shared Lists workflow is a proven primitive; meal planning's grocery generation depends on it directly.
  - The per-screen spouse read-only banner is the established Horizon 3 pattern for communicating role constraints.
  - The PWA uses versioned command sync and a Dexie client cache for offline tolerance.
  - Spouse access is read-only across all current Horizon 3 workflows.
- Assumptions:
  - `A-006`: versioned command sync handles household-level meal plan concurrency without CRDT machinery.
  - The meal-to-grocery-list connection is the core value proposition of Phase 1; if the household does not use the grocery list generation, the planning surface alone may not justify its overhead.
  - Plain-text shopping items (without quantities) are good enough for a first grocery list and will reveal through household use whether quantities are necessary before specifying them.
- Decisions:
  - Meal plans are weekly (Monday–Sunday); no multi-week or freeform date-range plans in Phase 1.
  - Meals are added per-day, with no enforced meal type (breakfast/lunch/dinner); the user names meals freely.
  - Shopping items are plain text per meal; no structured quantities or units in Phase 1.
  - Generating a grocery list always creates a new Shared List; it does not modify an existing one.
  - Spouse is read-only with a per-screen banner, consistent with all Horizon 3 workflows.
  - No AI dependency in the first implementation slice.
  - No push notifications in Phase 1.

## Deferred Decisions
- Whether spouse write access for meal planning arrives before or alongside broader collaboration permissions.
- Whether shopping items should support quantities, units, or categories in Phase 2.
- Whether a "push to existing list" option belongs in Phase 2 alongside the "create new list" action.
- Whether AI-assisted meal suggestions belong in Phase 2 of this spec or a separate enhancement spec.
- Whether a recurring "weekly planning ritual" integration with the Routines workflow belongs in this spec or a future integration spec.
- Whether saved meal favorites (a short list of commonly used meals for fast entry) are worth specifying before household usage reveals whether repetitive entry is a real friction point.
- Whether past meal plans should be viewable in a calendar-style history view or a simple scrollable list.
