# Feature Spec: Recurring Routines

## Status
- Draft — pending CEO approval

## Summary
- Olivia already supports first-class reminders for time-based follow-through and shared lists for lightweight checklist coordination, but neither model fits the repeating household work that defines daily life: cleaning, maintenance, bills, and other obligations that recur on a schedule. This spec defines Recurring Routines as a focused Horizon 3 workflow for household tasks that repeat on a defined cadence. A routine is a titled household task with a recurrence rule, an owner, and a completion state that resets each cycle. If this workflow works well, the household gains a reliable way to stay aligned on recurring obligations without anyone having to keep that schedule in their head or recreate the same inbox item week after week.

## User Problem
- Repeating household tasks such as paying bills, cleaning, taking out trash, or scheduling maintenance create a recurring invisible labor: someone must remember when each one is due, who is responsible, and whether it got done this week.
- The current inbox model is the wrong fit: recreating "Take out trash" as an inbox item weekly adds friction and clutters the inbox with work that is never truly done, only completed and reset.
- Reminders help with "surface this later" prompts, but they lack completion tracking across cycles — if you complete this week's reminder for the power bill, there is no clean record of monthly bill payment history or visibility into whether it happened.
- Without a repeating-task surface, recurring work falls back into human memory or private notes, recreating the exact coordination overhead Olivia is meant to reduce.

## Target Users
- Primary user: stakeholder, acting as the primary operator who creates and manages household routines, assigns owners, and marks completions.
- Secondary user: spouse, with shared read visibility into all household routines and their completion state, but without write access in this first spec.
- Future users: other household members, richer collaborator roles, and spouse write parity are not a target in this phase.

## Desired Outcome
- The household has a reliable, shared view of repeating household tasks without anyone having to maintain that list manually.
- Creating a recurring routine feels fast: title, owner, and schedule are enough to start. No complex setup or calendar-style configuration.
- Completing a routine marks the current cycle as done and schedules the next one automatically. No manual reset needed.
- The stakeholder can see at a glance which routines are due, which are overdue, and which have been completed recently.
- The spouse can view routine state without having to ask the stakeholder what is happening.
- Olivia does not nag or create guilt — it surfaces what is due calmly and moves on when the household handles it.

## In Scope
- Creating a named recurring routine with a title, owner, and recurrence rule.
- Recurrence rules: daily, weekly, monthly, and custom interval in days. No weekday-set or exception-date logic in Phase 1.
- Marking a routine occurrence as complete for the current cycle.
- Viewing all household routines with their current due state: `upcoming`, `due`, `overdue`, `completed`.
- Viewing routine history: when each past occurrence was completed, by whom, and on what date.
- Editing a routine's title, owner, or recurrence rule.
- Pausing a routine (temporarily stops generating due states without deleting the routine or its history).
- Deleting a routine (owner-only; higher-friction confirmation; removes the routine and all its history permanently).
- Archiving a routine (soft-delete; routine stops generating due states; history preserved; accessible in archived view).
- Spouse read-only view with a clear role indicator.
- Offline-tolerant completion and edit using the same client outbox pattern as inbox, reminders, and lists.
- Preserving completion history per routine occurrence to support future validation, auditing, or household reviews.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Spouse write access to routines or completion marking.
  - Weekday-specific recurrence such as "every Monday and Thursday."
  - Exception dates, skip-this-week logic, or catch-up behavior for missed cycles.
  - Calendar sync or external integration.
  - Push notifications for routine due states (deferred until the first implementation proves the view-based surfacing is sufficient or insufficient).
  - Sub-tasks per routine occurrence (e.g. cleaning checklist items under a "Clean bathroom" routine).
  - Routine categories, tags, or groupings.
  - Routine templates for common household setups.
  - Auto-generation of routines from natural-language description via AI (deferred to a future slice).
  - Linking routines to shared lists (e.g. "auto-reset grocery list on weekly shop routine") — this is a future integration, not Phase 1.
- Known gaps acceptable for this phase:
  - Completion is per-occurrence, but there is no backfill: if a routine was due and the household completed it late, marking it complete schedules the next cycle from the completion date (or optionally from the original due date — this is an implementation decision for the Founding Engineer).
  - A missed occurrence does not create a separate first-class missed state; it is reflected only in the completion history timeline.
  - Overdue routines surface visually but Olivia does not send push alerts unless notifications are later added.
  - There is no batch-complete for multiple routines at once in Phase 1.
- Likely future direction:
  - Spouse can mark routine completions, not just view them.
  - Weekday-set recurrence such as "every weekday" or "every Monday."
  - Routine-linked shared lists (weekly grocery run triggers a fresh list).
  - Routine dashboard view summarizing household health across all recurring obligations.
  - Push notification support once the view-based surfacing model is validated.

## Workflow
- Primary workflow: create a routine
  1. User navigates to the Routines surface.
  2. User taps "New Routine."
  3. User enters a title, selects an owner, and sets a recurrence rule (daily, weekly, monthly, or every N days).
  4. User sets the first due date or accepts today as the start.
  5. System saves the routine immediately (user-initiated, non-destructive).
  6. The routine appears in the routine index with its first due date shown.

- Primary workflow: complete a routine occurrence
  1. User views the routine index and sees one or more routines in `due` or `overdue` state.
  2. User taps the completion checkbox next to the routine.
  3. The routine transitions to `completed` state for the current cycle immediately (optimistic, user-initiated).
  4. The system schedules the next occurrence according to the routine's recurrence rule.
  5. No confirmation required for completion; it is a reversible user-initiated action within the same session.

- Secondary workflow: view routine history
  1. User opens a specific routine from the index.
  2. User sees the routine's detail: title, owner, recurrence, current due state, and a history of past occurrences — when each was completed, by whom, and whether any were missed.
  3. Olivia may surface a note if a routine has been missed several times in a row, as a gentle advisory observation, not a nagging alert.

- Secondary workflow: edit a routine
  1. User selects the edit action from the routine card or detail view.
  2. User edits the title, owner, or recurrence rule.
  3. Changes save immediately (user-initiated, non-destructive).
  4. If the recurrence rule changes, the next due date recalculates from the current cycle's start.

- Secondary workflow: pause a routine
  1. User selects the pause action from the routine detail.
  2. System presents a brief confirmation: "Pause this routine? It will stop appearing as due until you resume it."
  3. User confirms.
  4. The routine enters `paused` state and no longer generates due states.
  5. The pause can be reversed by resuming from the detail view.

- Secondary workflow: archive a routine
  1. User selects the archive action from the routine card or detail view.
  2. System presents a confirmation: "Archive this routine? It will be hidden from the active view but not deleted, and its history will be preserved."
  3. User confirms.
  4. The routine moves to archived state; completion history is preserved.

- Secondary workflow: delete a routine
  1. User selects delete (owner-only action).
  2. System presents a higher-friction confirmation: "Permanently delete [Routine title]? This will remove the routine and all its completion history. This cannot be undone."
  3. User confirms.
  4. The routine and all its history are permanently removed.

- Secondary workflow: spouse read-only view
  1. Spouse opens the app and navigates to Routines.
  2. Spouse sees the same routine index and detail as the stakeholder — due states, completion history, owners.
  3. Write actions are not available.
  4. A clear role indicator (banner) communicates the read-only constraint. The interface does not present broken or grayed-out controls; write affordances are not shown at all.

## Behavior
- Facts the system records per routine:
  - Routine id.
  - Routine title.
  - Owner: `stakeholder`, `spouse`, or `unassigned`.
  - Recurrence rule: `daily`, `weekly`, `monthly`, or `every_n_days` with an integer interval.
  - Status: `active`, `paused`, or `archived`.
  - Current cycle due date.
  - Created timestamp, updated timestamp, archived timestamp when applicable.
  - Version counter for optimistic concurrency.

- Facts the system records per routine occurrence (completion event):
  - Occurrence id.
  - Parent routine id.
  - Due date for this occurrence.
  - Completed timestamp (null if not yet completed or if missed).
  - Completed by: `stakeholder`, `spouse`, or `system` (for future automation; reserved field).
  - Skipped flag (future use; reserved).

- Due-state Olivia derives and surfaces per routine:
  - `upcoming`: due date is in the future.
  - `due`: due date is today or within the next 24 hours.
  - `overdue`: due date has passed and the current cycle is not yet completed.
  - `completed`: the current cycle has been marked complete; next occurrence is scheduled.
  - `paused`: routine is paused; no due state surfaced.

- Suggestions Olivia may make (advisory-only, never execute without confirmation):
  - "These 3 routines are overdue. Want to review them?"
  - "This routine has been missed for the past 3 cycles. Should the schedule be adjusted?"

- Actions and approval requirements:

| Action | User-initiated | Agentic (Olivia-proposed) |
|---|---|---|
| Create routine | Execute immediately | Confirm before save |
| Edit title, owner, or recurrence | Execute immediately | Confirm before apply |
| Mark occurrence complete | Execute immediately | Confirm before apply |
| Unmark completion (same session) | Execute immediately | Confirm before apply |
| Pause routine | Always confirm | Always confirm |
| Resume routine | Execute immediately | Confirm before apply |
| Archive routine | Always confirm | Always confirm |
| Restore archived routine | Execute immediately | Confirm before apply |
| Delete routine | Always confirm | Always confirm |

## Data And Memory
- Durable state:
  - Routine records with full property set.
  - Routine occurrence records (one per completed or missed cycle) forming the completion history.
  - Completion history must be preserved even for archived routines, to support future household review workflows.
- Transient state:
  - Optimistic completion state before server acknowledgment.
  - Offline outbox commands awaiting reconnect flush.
- Sensitive data handling:
  - Routine titles and completion history may contain household-sensitive context such as medical appointments, financial obligations, or personal schedule data.
  - All routine data is local-first and household-controlled. No routine content should be sent to external AI providers unless the user explicitly invokes an AI-assisted feature.

## Permissions And Trust Model
- This feature remains advisory-only.
- Non-destructive user-initiated routine actions (create, edit, mark complete, resume, restore) execute immediately with no confirmation step.
- Destructive or state-changing administrative actions (pause, archive, delete) always require confirmation regardless of initiator.
- Spouse access is read-only in this first spec; spouse can view routines and history but cannot create, edit, complete, pause, archive, or delete anything.
- The read-only state must be communicated via a per-screen banner, not per-control disabled states, following the established pattern from reminders and shared lists.
- Olivia must never:
  - Auto-complete a routine occurrence because it infers the household probably handled it.
  - Auto-advance a missed cycle or create catch-up occurrences without explicit user action.
  - Notify the spouse proactively in this first spec.
  - Change a routine's schedule automatically based on observed completion patterns.

## AI Role
- Where AI adds potential value (deferred to future slices):
  - Parsing natural-language routine creation: "Remind me to pay the power bill every month on the 15th" → structured routine draft.
  - Suggesting recurrence adjustment when a routine is repeatedly missed.
  - Summarizing household routine health across all active routines.
- What must work without AI:
  - Creating routines from structured fields.
  - Listing routines by due state.
  - Marking completions, editing routines, pausing, archiving, and deleting.
  - Recurrence scheduling based on stored cadence rules.
  - Viewing completion history.
- Fallback behavior if AI is unavailable:
  - Structured routine creation remains fully functional.
  - Routine views remain available as structured lists.
  - Suggestions may be omitted or replaced with simple rule-based observations.

## Risks And Failure Modes
- Risk 1: routines become a second inbox for open-ended household work.
  - If users route general one-off tasks into routines, the household ends up with scheduled "tasks" that are really ad hoc work, cluttering the routine view with non-recurring items.
  - Mitigation: the create flow should make recurrence selection required, not optional. A routine without a recurrence rule is not a routine — it belongs in the inbox.
- Risk 2: overdue routines create guilt or noise if they pile up.
  - A household that falls behind on several routines should not feel overwhelmed when opening Olivia.
  - Mitigation: Olivia surfaces due and overdue states clearly but calmly. No badges, push alerts, or urgent visual treatment in Phase 1. Overdue is information, not accusation.
- Risk 3: missed recurrence cycles are confusing.
  - If a routine is missed for two weeks, does completing it today catch up both weeks or just reset from today?
  - Mitigation: completing the current cycle always advances to the next occurrence. No backfill. The completion history records the actual completion date. The missed cycles appear as gaps in the history — visible but not actionable in Phase 1.
- Risk 4: recurrence rule editing creates unexpected due-date behavior.
  - If a user changes a weekly routine to monthly mid-cycle, the next due date must be deterministic and visible.
  - Mitigation: when the recurrence rule changes, the next due date should recalculate from the current cycle's original start (not from the completion date). This is visible in the routine detail before and after the edit.
- Risk 5: spouse finds the read-only state confusing.
  - Mitigation: the per-screen banner pattern (established in shared lists and reminders) communicates the constraint once and clearly. No broken disabled controls.

## UX Notes
- Routines should feel like a household maintenance board, not a task manager or a calendar. The view is organized by due state, not by date or category.
- Completion should be a single tap on a checkbox — reusing the same interaction established in shared lists. No modal, no confirmation for non-destructive completion.
- Overdue routines should appear prominently in the index but without alarming or guilt-inducing visual treatment. Consider a subtle left-border accent (e.g. `--rose-soft`) for overdue, similar to how reminders surface overdue state.
- The due state badge or label on each routine card should make it immediately clear whether this routine is upcoming, due today, overdue, or completed for the current cycle.
- Completion history in the detail view should be clean and scannable — a short list of "Completed on [date] by [owner]" entries, with missed cycles shown as "Missed [date range]" gaps.
- Pause is a lower-friction escape valve than archive: it keeps the routine available without cluttering the active view. The pause action should feel approachable, not like a failure state.
- Anti-patterns to avoid:
  - Requiring confirmation for marking a routine complete.
  - Auto-advancing missed cycles or creating catch-up occurrences.
  - Showing the full completion history on the index card — it belongs in the detail only.
  - Treating overdue routines as urgent alerts or failures.
  - Showing write controls to the spouse that produce errors.

## Acceptance Criteria
- 1. Given a stakeholder creates a routine with a title, owner, and recurrence rule, when the routine is saved, then it appears in the active routine index with the correct first due date, and it persists across sessions.
- 2. Given a routine's due date has arrived, when Olivia evaluates routine state, then the routine appears in `due` state in the routine index.
- 3. Given a routine's due date has passed without completion, when Olivia evaluates routine state, then the routine appears in `overdue` state until it is completed or archived.
- 4. Given a stakeholder marks a routine occurrence as complete, when the completion is applied, then the routine transitions to `completed` state for the current cycle immediately (no confirmation required), and the next occurrence is scheduled according to the routine's recurrence rule.
- 5. Given Olivia proposes completing or modifying a routine on its own initiative, when the proposal is presented, then the user must explicitly confirm before any write executes.
- 6. Given a stakeholder edits a routine's recurrence rule, when the change is saved, then the next due date recalculates deterministically from the current cycle's start, and the updated due date is visible immediately.
- 7. Given a stakeholder pauses a routine, when the pause is confirmed, then the routine no longer appears in `due` or `overdue` states and remains in `paused` state until resumed.
- 8. Given a stakeholder archives a routine, when the archive is confirmed, then the routine disappears from the active index, its completion history is preserved, and it is accessible from an archived filter.
- 9. Given a stakeholder deletes a routine, when the higher-friction delete confirmation is accepted, then the routine and all its completion history are permanently removed.
- 10. Given the spouse is logged in, when the spouse navigates to Routines, then the spouse sees the same routine index and completion history as the stakeholder but cannot create, edit, complete, pause, archive, or delete anything.
- 11. Given the spouse is logged in, when Olivia renders the routine index or detail, then a clear per-screen role banner communicates that the spouse is in read-only view, following the established banner pattern.
- 12. Given the user is offline, when the stakeholder marks a routine complete, then the action is recorded in the outbox and the UI reflects the optimistic state, and the action is flushed to the server on reconnect.
- 13. Given a routine has past occurrences, when the user views the routine detail, then a completion history timeline is shown with dates, completions, and missed-cycle gaps, but no separate "missed" state is created as an actionable record.
- 14. Given external AI is unavailable, when a user creates a routine from structured fields, then the routine is still saved, listed, and managed correctly without AI dependency.

## Validation And Testing
- Unit-level:
  - Routine due-state derivation across `upcoming`, `due`, `overdue`, `completed`, and `paused` conditions.
  - Recurrence next-date calculation for `daily`, `weekly`, `monthly`, and `every_n_days` rules, including edge cases such as month-end dates.
  - Role enforcement returning read-only errors for spouse write attempts.
  - Versioned command conflict detection for concurrent routine edits.
- Integration-level:
  - Create, edit, complete, pause, archive, delete flows persist correctly across sessions.
  - Completing a routine occurrence correctly schedules the next occurrence.
  - Archived routines are not returned in the active routine query and appear in the archived filter.
  - Deleting a routine removes the routine record and all occurrence records.
  - Spouse read queries succeed; spouse write commands return a read-only error.
  - Offline outbox commands for routine completion flush correctly on reconnect.
  - Recurrence rule edit recalculates the next due date without creating duplicate or orphaned occurrences.
- Household validation:
  - The stakeholder uses routines for real repeating household obligations and reports whether the creation flow is fast enough to replace mental tracking.
  - The stakeholder evaluates whether the due-state view makes it easy to see what needs doing this week without opening individual routines.
  - The household evaluates whether the completion and auto-advance behavior feels reliable and trustworthy over multiple cycles.

## Dependencies And Related Learnings
- `D-002`: advisory-only trust model remains in force; Olivia cannot modify routine state on its own initiative.
- `D-004`: primary-operator model continues; spouse write parity is deferred to a later slice.
- `D-007`: installable mobile-first PWA is the canonical surface; all routine UX is designed for mobile-first interaction.
- `D-008`: local-first modular monolith with SQLite and Dexie remains the architecture center.
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes still require confirmation; destructive writes always require confirmation.
- `D-011`: Horizon 2 is complete; Horizon 3 coordination layer is now active.
- `D-012`: recurring routines are the third Horizon 3 spec target after first-class reminders and shared lists.
- `D-017`: recurring routines is the confirmed next spec target after shared lists completion.
- `A-006`: versioned command sync is sufficient for household-level routine concurrency.
- `A-008`: recurring schedule infrastructure may be shared across reminders and routines; this spec uses the same recurrence primitives (`daily`, `weekly`, `monthly`, `every_n_days`) established in the reminders spec.
- `L-008`: the tap-checkbox pattern from shared lists is directly reusable for routine completion — no new design decisions needed for this interaction.
- `L-009`: the per-screen spouse banner is the standard pattern for communicating read-only role — carry this forward to routines.
- `docs/specs/first-class-reminders.md`: the recurrence model (`daily`, `weekly`, `monthly`) established in reminders is the foundation; routines extend it with `every_n_days` for custom intervals.
- `docs/specs/shared-lists.md`: the sibling-workflow extension pattern and offline outbox approach established in shared lists should be followed here.

## Open Questions
- None blocking the first implementation slice.
- Design decision deferred to visual spec: where does "Routines" appear in the main nav? A sixth tab, or consolidated under a household section with Lists?
- Design decision deferred to visual spec: how is the routine index organized? By due state (due/overdue first, then upcoming by date, then completed), by creation order, or something else?
- Design decision deferred to visual spec: what visual treatment distinguishes `due`, `overdue`, and `completed` states on the routine index card? Consider left-border accent consistent with the reminders and lists pattern.
- Design decision deferred to visual spec: what does the completion history timeline look like in the detail view? Does it show all-time history or only recent cycles?
- Design decision deferred to visual spec: how is `paused` state communicated on the routine card — a label, a muted card, or an icon?
- Architecture decision for Founding Engineer: when the recurrence rule changes mid-cycle, should the next due date calculate from the original cycle start or from the day of the edit? Either is defensible; needs a single documented choice.
- Architecture decision for Founding Engineer: should completion of an overdue routine advance the next occurrence from the original due date (schedule-anchored) or from the completion date (completion-anchored)? Schedule-anchored is more predictable for obligations like bills; completion-anchored is more forgiving for chores. This choice should be configurable per routine or documented as a fixed product decision.

## Facts, Assumptions, And Decisions
- Facts:
  - Olivia has working inbox, reminder, and shared list implementations. Recurring Routines is the third Horizon 3 sibling workflow.
  - The tap-checkbox interaction and per-screen spouse banner are established design primitives that this workflow reuses.
  - The PWA uses versioned command sync and a Dexie client cache for offline tolerance.
  - Spouse access is read-only across all current Horizon 3 workflows.
- Assumptions:
  - `A-006`: versioned command sync handles household-level routine concurrency without CRDT machinery.
  - `A-008`: the recurrence primitives from the reminders spec can be shared or extended for routines without each workflow building its own scheduling model.
- Decisions:
  - Routines require a recurrence rule; one-off tasks belong in the inbox.
  - Recurrence options in Phase 1: `daily`, `weekly`, `monthly`, `every_n_days`.
  - Completion is immediate for user-initiated actions; no confirmation required.
  - Pausing is distinct from archiving: pause stops the due-state clock without hiding history; archive soft-deletes.
  - Spouse is read-only with a per-screen banner, consistent with all Horizon 3 workflows.
  - No push notifications in Phase 1; due-state surfacing in the view is primary.
  - No AI dependency in the first implementation slice.

## Deferred Decisions
- Whether weekday-set recurrence ("every Monday and Thursday") belongs in Phase 2 of this spec or a separate enhancement.
- Whether routine completion should offer schedule-anchored or completion-anchored next-occurrence calculation, or whether this should be a per-routine setting.
- Whether a "duplicate routine" action (useful for creating similar routines quickly) belongs in Phase 2.
- Whether routine-linked shared lists (e.g. reset a grocery list on weekly shop routine completion) should be specified here or in a future integration spec.
- Whether push notification support for routine due states arrives before spouse write access or after.
- Whether spouse write access for routine completion should arrive before broader collaboration permissions or alongside them.
