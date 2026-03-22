# Feature Spec: Lists — Completed Item Management

## Status
- Draft

## Summary
Shared lists become unusable for recurring household tasks like grocery shopping because completed items accumulate with no way to clear or reset them. The household works around this by creating new lists each time, which fragments history and adds friction. This spec adds visual separation of completed items, a "clear completed" action, and an "uncheck all" action — giving the household two patterns for managing completed items without forcing a single workflow.

## User Problem
- After a shopping trip, checked-off items remain mixed with unchecked items, making the list hard to scan for what's still needed.
- The only current workaround is archiving the entire list and creating a new one — losing the item set the household has built up over time.
- Multi-run shopping (buying some items on one trip, finishing on another) is awkward because there's no way to distinguish "done" items from "still needed" items at a glance.
- Recurring lists (weekly groceries) have no reset mechanism. The household can't reuse a list for the next shopping run without manually unchecking every item.

## Target Users
- Primary user: stakeholder, who creates and manages shared lists.
- Secondary user: spouse, with read-only visibility (unchanged from base shared-lists spec).

## Desired Outcome
- The household can reuse the same grocery list across shopping runs without creating new lists.
- Completed items are visually out of the way but recoverable.
- The stakeholder can reset a list for the next run in one action.
- The list lifecycle feels natural for both one-off lists (pack for a trip → clear completed → done) and recurring lists (weekly groceries → uncheck all → next week).

## In Scope
- Visual separation: checked items collapse into a "Completed" section at the bottom of the list detail view.
- "Clear completed" bulk action: permanently removes all checked items from the list.
- "Uncheck all" bulk action: resets all checked items to unchecked, moving them back to the main list.
- Confirmation for destructive bulk actions.
- Updated item counts reflecting the visual split.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Per-item archiving or soft-delete (items are either present or permanently removed).
  - Automatic clearing on a schedule or trigger (violates advisory-only trust model).
  - Undo for "clear completed" (items are permanently removed; confirmation is the safety net).
  - Drag reorder within or between sections.
  - Recurring list templates or auto-reset on a recurrence rule.
- Known gaps acceptable for this phase:
  - No undo after "clear completed" — the confirmation dialog is the guard. This is consistent with the delete-list pattern from the base spec.
  - The completed section is always visible when checked items exist; there is no toggle to hide it entirely.
- Likely future direction:
  - Recurring list reset tied to a recurrence rule ("reset grocery list every Sunday").
  - Per-item soft-delete with time-based expiry.
  - Drag reorder within the unchecked section.

## Workflow

### View list with completed items
1. User opens a list detail view.
2. Unchecked items appear in the main section, sorted by position.
3. Below the unchecked items, a "Completed (N)" section header appears if any items are checked.
4. The completed section is collapsed by default, showing only the header with the count.
5. User taps the section header to expand and see individual completed items.
6. Completed items appear with strikethrough and muted styling.

### Check off an item
1. User taps the checkbox on an unchecked item.
2. Item transitions to checked state immediately (optimistic, no confirmation — unchanged from base spec).
3. Item moves from the main section to the completed section.

### Uncheck a completed item
1. User expands the completed section and taps the checkbox on a checked item.
2. Item transitions to unchecked state immediately (optimistic, no confirmation).
3. Item moves back to the main section at its original position.

### Clear completed items
1. User taps the overflow menu (⋯) on the list detail view.
2. User selects "Clear completed."
3. System presents a confirmation: "Remove N completed items? This cannot be undone."
4. User confirms.
5. All checked items are permanently deleted from the list.
6. The completed section disappears.
7. Item counts update.

### Uncheck all items
1. User taps the overflow menu (⋯) on the list detail view.
2. User selects "Uncheck all."
3. System presents a confirmation: "Uncheck all N completed items? They'll move back to the list."
4. User confirms.
5. All checked items transition to unchecked state.
6. Items return to the main section at their original positions.
7. The completed section disappears.

## Behavior

### Visual separation rules
- The completed section appears only when at least one item is checked.
- The section header reads "Completed (N)" where N is the count of checked items.
- The section is collapsed by default. Expand/collapse state is transient (resets on page navigation).
- Checked items within the section retain their original position order.

### Bulk action availability
- "Clear completed" and "Uncheck all" appear in the list detail overflow menu only when at least one checked item exists.
- Both actions are disabled (hidden from menu) when no items are checked.
- Spouse cannot access these actions (read-only role unchanged).

### Data changes

**Clear completed:**
- Permanently deletes all list items where `checked = true`.
- Updates the list's `checkedItemCount` to 0.
- Updates `activeItemCount` to reflect remaining unchecked items.
- Recalculates `allChecked` (will be `false` if any items remain).

**Uncheck all:**
- Sets `checked = false` and `checkedAt = null` on all checked items.
- Updates `checkedItemCount` to 0.
- `activeItemCount` remains unchanged (items aren't removed, just unchecked).
- Sets `allChecked` to `false`.

### Actions and approval requirements

| Action | User-initiated | Agentic |
|---|---|---|
| Clear completed | Always confirm (destructive) | Always confirm |
| Uncheck all | Confirm (bulk state change) | Always confirm |
| Expand/collapse completed section | Execute immediately | N/A |

## Data And Memory
- No new entity types. Both actions modify existing `list_items` records.
- "Clear completed" creates deletion events in the item history log for each removed item, preserving auditability.
- "Uncheck all" creates uncheck events for each affected item.
- No new durable state beyond what the base shared-lists spec defines.
- Expand/collapse state for the completed section is transient UI state — not persisted.

## Permissions And Trust Model
- Both bulk actions are user-initiated and require explicit confirmation before executing.
- Olivia must never auto-clear completed items or auto-uncheck items.
- Olivia must never infer that a list should be reset based on time, patterns, or context.
- In an agentic context (e.g., chat), Olivia may suggest "Would you like to clear the completed items?" but must not execute without explicit confirmation.
- Spouse remains read-only — bulk actions are not available to the spouse role.

## AI Role
- AI may suggest clearing or unchecking completed items in chat context (e.g., "Your grocery list has 12 completed items — want to clear them for the next run?").
- The suggestion is advisory-only; execution requires explicit user confirmation.
- All list operations work fully without AI. No AI dependency.

## Risks And Failure Modes
- Risk 1: user clears completed items and immediately regrets it.
  - Mitigation: confirmation dialog with item count makes the action's scope clear. No undo — this is consistent with list deletion behavior. Future: consider a time-limited undo toast if regret frequency is high.
- Risk 2: "uncheck all" and "clear completed" are confused.
  - Mitigation: distinct labels and confirmation copy make the difference clear. "Uncheck all" says items "move back to the list." "Clear completed" says items are "removed" and "cannot be undone."
- Risk 3: large lists with many completed items cause performance issues on expand.
  - Mitigation: the completed section is collapsed by default. Rendering only on expand keeps the default view fast.
- Risk 4: offline bulk actions create complex sync conflicts.
  - Mitigation: bulk actions use the same versioned command pattern as individual operations. Each item operation in the bulk is an independent command in the outbox. Conflicts are per-item, same as existing behavior.

## UX Notes
- The completed section should feel tucked away, not prominent. A muted section header with a disclosure chevron and a count is sufficient.
- Checked items in the expanded section should use strikethrough text and reduced opacity — the same visual treatment already used for individual checked items, but now grouped together.
- The overflow menu actions should use clear, distinct labels:
  - "Clear completed" — implies removal
  - "Uncheck all" — implies reset
- Confirmation dialogs should state the count of affected items so the user knows the scope.
- The main list section should feel clean and focused on what's still needed — this is the primary value of visual separation.
- Anti-patterns to avoid:
  - Swipe-to-clear on individual completed items (too discoverable as an accident).
  - Auto-collapsing the completed section after every check action (jarring).
  - Showing bulk actions when no items are checked (confusing empty state).

## Acceptance Criteria
1. Given a list with checked items, when the user opens the list detail, then checked items appear in a separate "Completed (N)" section below unchecked items.
2. Given a list with checked items, when the user views the list detail, then the completed section is collapsed by default showing only the header with count.
3. Given the completed section is collapsed, when the user taps the section header, then the section expands to show individual completed items.
4. Given a list with checked items, when the user checks an item, then the item moves from the main section to the completed section.
5. Given a list with checked items, when the user unchecks a completed item, then the item moves back to the main section at its original position.
6. Given a list with checked items, when the user selects "Clear completed" from the overflow menu, then a confirmation dialog appears stating the count of items to be removed.
7. Given the user confirms "Clear completed," when the action executes, then all checked items are permanently removed from the list and the completed section disappears.
8. Given a list with checked items, when the user selects "Uncheck all" from the overflow menu, then a confirmation dialog appears stating the count of items to be unchecked.
9. Given the user confirms "Uncheck all," when the action executes, then all checked items return to unchecked state in the main section and the completed section disappears.
10. Given the user is offline, when the user performs "Clear completed" or "Uncheck all," then the action is recorded in the outbox and the UI reflects the optimistic state.
11. Given the spouse is viewing a list, when the spouse opens the overflow menu, then "Clear completed" and "Uncheck all" are not available.
12. Given a list with no checked items, when the user views the list detail, then no completed section appears and bulk actions are not available in the overflow menu.
13. All new component class names have corresponding CSS styles and render as visually specified.
14. `npm run typecheck` passes with zero errors.

## Validation And Testing
- Unit-level:
  - Completed section visibility based on checked item count.
  - "Clear completed" removes only checked items and updates summary counts correctly.
  - "Uncheck all" resets all checked items and updates summary counts correctly.
  - Bulk actions not available when no items are checked.
  - Spouse role cannot access bulk actions.
- Integration-level:
  - "Clear completed" persists across sessions — cleared items do not reappear.
  - "Uncheck all" persists across sessions — items remain unchecked.
  - Offline bulk actions flush correctly on reconnect.
  - Item history log captures events for both bulk operations.
  - Concurrent device sync handles bulk operations without data loss.
- Household validation:
  - The stakeholder uses "uncheck all" to reset a grocery list for the next shopping run and reports whether it replaces the need to create new lists.
  - The stakeholder uses "clear completed" after a one-off list (packing) and reports whether the friction is acceptable.
  - The completed section collapse/expand behavior feels natural during a multi-run shopping trip.

## Dependencies And Related Learnings
- `docs/specs/shared-lists.md` — this spec extends the base shared-lists spec. All base behavior remains unchanged unless explicitly modified here.
- `D-010`: destructive user-initiated writes always require confirmation. "Clear completed" is destructive. "Uncheck all" is a bulk state change with confirmation as a safety measure.
- `D-065`: M30 direction — this spec is priority #2 in the M30 stability and feature depth sprint.
- `L-029` / `L-031`: household feedback identified lists as incomplete for daily use; completed items hanging around was the specific friction.
- The completed section pattern (collapsed by default, expand on tap) should be reusable if other workflows need similar treatment.

## Open Questions
- **For the board**: When you shop from the grocery list across multiple trips, do you want completed items to stay collapsed (visible but out of the way) or would you prefer them hidden entirely until you explicitly look? The spec recommends collapsed-but-visible so you can see your progress.
- **For the board**: Is the two-action model (clear completed vs. uncheck all) intuitive, or would a single "Reset list" action that unchecks everything be sufficient for your use?

## Facts, Assumptions, And Decisions
- Facts:
  - The current implementation shows checked and unchecked items together with no visual separation.
  - List items have `checked`, `checkedAt`, and `position` fields that support both clearing and unchecking.
  - The household creates new grocery lists because completed items make existing lists unusable.
- Assumptions:
  - Both one-off lists (clear completed) and recurring lists (uncheck all) are real household patterns. If usage shows only one pattern matters, the other action could be removed.
  - Collapsed-by-default for the completed section is the right balance between visibility and cleanliness. If the household wants completed items fully hidden, this could change.
- Decisions:
  - Two separate bulk actions rather than one overloaded action. "Clear" and "uncheck" are fundamentally different operations (destructive vs. reversible) and should not be merged.
  - Confirmation required for both actions despite "uncheck all" being non-destructive, because bulk state changes can be disorienting if triggered accidentally.
  - No undo for "clear completed" — consistent with existing delete semantics. Confirmation is the safety net.
  - Completed section collapsed by default — prioritizes a clean view of what's still needed.

## Deferred Decisions
- Whether a time-limited undo toast for "clear completed" is worth building if regret frequency is observed.
- Whether the completed section expand/collapse state should persist across sessions.
- Whether recurring list auto-reset (uncheck all on a schedule) should be handled in this workflow or by the routines spec.
- Whether a "clear and archive" combined action is needed for end-of-trip list management.
