# Feature Spec: Routines Depth — Flexible Scheduling

## Status
- Draft

## Summary
The current routines model supports four recurrence rules: daily, weekly, monthly, and every N days. Household feedback (M29) reveals this is too rigid for real use — many routines don't fit a fixed interval. Dishes happen irregularly. Laundry is done when the pile is big enough, but the household wants to see when it was last done. Recycling alternates every two weeks. This spec adds two capabilities to make routines useful for daily household life: (1) additional scheduling patterns that cover real household rhythms, and (2) an ad-hoc tracking mode for routines that don't have a fixed schedule but benefit from "last done" visibility.

## User Problem
- **Fixed intervals don't match real chores.** Most household routines are not neatly "every 7 days." Some alternate weeks (recycling, deep cleaning). Some happen on specific weekdays (trash pickup is every Monday and Thursday). The current model forces everything into "every N days," which either nags too early or surfaces overdue states that feel wrong.
- **Ad-hoc tasks fall through the cracks.** Dishes, laundry, and similar chores have no fixed cadence — they happen when they need to happen. Without tracking, no one knows whether the last load of laundry was two days or two weeks ago. The household wants a "last done" signal without Olivia imposing a schedule and creating guilt.
- **The gap between "routine" and "status board" is unclear.** The board asked whether ad-hoc things like dishes should be a "last done" timestamp or a "household status board." The answer is that a lightweight tracking mode within the existing routines surface is the right fit — it avoids creating a new concept while solving the real problem.

## Target Users
- Primary: stakeholder (creates and manages routines, marks completions)
- Secondary: spouse (views routine state and last-done timestamps)

## Desired Outcome
- The household can track alternating-week and weekday-specific routines without workarounds.
- Ad-hoc chores like dishes and laundry have a "last done" timestamp visible at a glance, without imposing a schedule that creates false overdue states.
- The routines surface feels like a reliable household status board for both scheduled and unscheduled recurring work.
- No new navigation concepts or screens — this deepens the existing routines surface.

## In Scope
1. **New recurrence rule: `weekly_on_days`** — routine recurs on specific days of the week (e.g., every Monday and Thursday). Due state is derived from the next matching weekday.
2. **New recurrence rule: `every_n_weeks`** — routine recurs every N weeks on a fixed weekday (e.g., every 2 weeks on Wednesday). Covers alternating-week patterns like recycling or bi-weekly cleaning.
3. **Ad-hoc tracking mode** — a routine with no recurrence schedule. It appears in the routine index with a "last done" timestamp instead of a due state. The user marks it done whenever it happens, and the timestamp updates. No due/overdue states are generated.
4. **"Last done" visibility** — all routines (scheduled and ad-hoc) show a "last done" or "last completed" indicator on the routine card in the index, providing household status at a glance.

## Boundaries, Gaps, And Future Direction
- **Not in scope:**
  - Cron-style expressions or calendar exception dates.
  - "Suggested cadence" where Olivia infers a schedule from completion history — this is a future AI enhancement.
  - Routine categories, tags, or grouping.
  - Spouse write access (unchanged from base spec).
  - Push notifications for ad-hoc routines (no schedule means no timing signal).
  - Batch operations (mark multiple routines done at once).
- **Acceptable gaps:**
  - `weekly_on_days` does not support "every other Monday" — use `every_n_weeks` for that.
  - Ad-hoc routines have no overdue state, even if they haven't been done in a long time. This is intentional — the product ethos says "overdue is information, not accusation." For ad-hoc routines, the "last done" timestamp is the information; the household decides when it matters.
  - No separate "status board" view — ad-hoc routines live in the same routine index alongside scheduled routines, differentiated by their card presentation.
- **Future direction:**
  - AI-suggested cadence based on completion patterns ("You usually do laundry every 4–5 days. Want to set a reminder?").
  - "Soft due" for ad-hoc routines — an optional gentle threshold ("nudge me if it's been more than X days") that creates a low-urgency suggestion, not an overdue state.
  - Month-specific rules ("first Monday of each month").
  - Routine dashboard or health summary view.

## Workflow

### Create a routine with weekday-specific schedule
1. User taps "New Routine" from the Routines surface.
2. User enters title and selects owner.
3. In the recurrence selector, user chooses "Weekly on specific days."
4. A weekday picker appears showing Mon–Sun. User taps one or more days (e.g., Mon and Thu).
5. The first due date is calculated as the next matching weekday from today.
6. Routine saves immediately (user-initiated, non-destructive).
7. Routine appears in the index with the next due date and a "Mon, Thu" label on the card.

### Create a routine with alternating-week schedule
1. User taps "New Routine" from the Routines surface.
2. User enters title and selects owner.
3. In the recurrence selector, user chooses "Every N weeks" and sets the interval (e.g., 2) and the weekday (e.g., Wednesday).
4. User sets or accepts the first due date (the next matching weekday).
5. Routine saves immediately.
6. Routine appears in the index with "Every 2 weeks, Wed" label.

### Create an ad-hoc routine
1. User taps "New Routine" from the Routines surface.
2. User enters title (e.g., "Dishes") and selects owner.
3. In the recurrence selector, user chooses "No schedule — track when done."
4. No due date is set. The routine saves immediately.
5. Routine appears in the index with "Last done: never" (or "Not yet tracked") instead of a due-state badge.

### Mark an ad-hoc routine as done
1. User sees an ad-hoc routine in the index showing "Last done: 3 days ago."
2. User taps the completion checkbox.
3. The "last done" timestamp updates to "Just now" immediately (optimistic, user-initiated).
4. A routine occurrence is recorded with `completedAt` set to the current time.
5. No "next due date" is scheduled — the routine stays in the index with the updated last-done timestamp.

### View routine index with mixed types
1. User opens the Routines surface.
2. Scheduled routines appear grouped by due state as before (overdue, due, upcoming, completed).
3. Ad-hoc routines appear in a separate "Tracked" section below scheduled routines, sorted by last-done recency (oldest-first, so the chores not done recently appear at the top).
4. All routine cards show a "Last done: [relative time]" indicator in secondary text.

## Behavior

### New recurrence rules
- `weekly_on_days`: stores an array of weekday indices (0=Monday through 6=Sunday). Due state is derived from the next matching weekday. When a routine with multiple weekdays is completed, the next due date advances to the next matching weekday in the sequence, not the same weekday next week.
- `every_n_weeks`: stores an interval (integer, >= 2) and a weekday index. Due date advances by `interval * 7` days from the anchor weekday. Behaves like `every_n_days` but anchored to a specific weekday for predictability.
- `ad_hoc`: stores no schedule. The routine has no `currentDueDate`. Due-state derivation returns `null` (no due state). The routine is always active but never overdue.

### Data model changes
- `recurrenceRule` field gains three new valid values: `weekly_on_days`, `every_n_weeks`, `ad_hoc`.
- New nullable field `weekdays` (text, JSON array of integers 0–6) — used by `weekly_on_days`. Null for other rules.
- The existing `intervalDays` field is reused by `every_n_weeks` to store the week interval (e.g., 2 for bi-weekly). Note: for `every_n_weeks`, `intervalDays` stores the *week* count, not *day* count — the field name is a misnomer inherited from the original schema. Document this clearly in the implementation plan. Alternatively, the Founding Engineer may prefer adding a dedicated `intervalWeeks` field to avoid confusion — this is an implementation decision.
- `currentDueDate` becomes nullable — null for `ad_hoc` routines.
- Routine occurrences work identically for all routine types. Ad-hoc routines create occurrences when marked done, with `dueDate` set to the completion date (since there is no scheduled due date).

### Due-state derivation (updated)
- For `weekly_on_days`: same rules as existing (`upcoming`, `due`, `overdue`, `completed`) but the next due date is the next matching weekday.
- For `every_n_weeks`: same rules as existing but the next due date advances by N weeks from the anchor weekday.
- For `ad_hoc`: returns `null`. The routine card shows "Last done: [time]" instead of a due-state badge.
- For `paused` routines: unchanged — returns `paused` regardless of type.

### "Last done" indicator
- All routines (scheduled and ad-hoc) gain a "last done" indicator derived from the most recent occurrence's `completedAt` timestamp.
- Display format: relative time ("Just now", "2 hours ago", "3 days ago", "2 weeks ago"). For routines never completed: "Not yet done."
- This is a read-derived field — no new column needed. Query the most recent `routine_occurrence` by `routineId` ordered by `completedAt` descending.

## Data And Memory
- **Schema changes:** new valid values for `recurrenceRule`, new nullable `weekdays` column, `currentDueDate` becomes nullable.
- **Migration:** additive only. Existing routines are unaffected — their `recurrenceRule` values remain valid, and `weekdays` is null by default.
- **No new tables or entities.** Ad-hoc routines use the same `routines` and `routine_occurrences` tables.
- **Sensitive data:** unchanged from base spec. Routine titles may contain household-sensitive context.

## Permissions And Trust Model
- Unchanged from the base recurring-routines spec. All new recurrence types follow the same permission model.
- Ad-hoc routine completion is a non-destructive user-initiated action — executes immediately, no confirmation.
- Olivia must not:
  - Auto-complete an ad-hoc routine because it infers the household has done it.
  - Suggest converting an ad-hoc routine to a scheduled one without user action (deferred to future AI enhancement).
  - Create overdue states for ad-hoc routines.

## AI Role
- AI is not involved in this feature. Scheduling and ad-hoc tracking are structured user interactions.
- **Future AI value (not in scope):** Olivia could analyze ad-hoc routine completion patterns and suggest a schedule ("You typically do laundry every 4–5 days — would a reminder help?"). This is deferred until the ad-hoc tracking model proves useful.
- All routines continue to work correctly without AI.

## Risks And Failure Modes
- **Risk: ad-hoc routines become a dumping ground for non-routine items.** If users start tracking one-off tasks as ad-hoc routines, the routines surface gets cluttered with items that belong in the inbox.
  - Mitigation: the "No schedule" option's label emphasizes tracking ("track when done"), not task management. The create flow could include helper text: "For recurring household tasks. One-time tasks work better in the inbox."
- **Risk: weekday picker adds mobile UI complexity.** A 7-button weekday picker needs to feel fast on a phone, not like a settings form.
  - Mitigation: use a compact horizontal row of day abbreviations (M T W T F S S) with tap-to-toggle. Similar to what iOS calendar apps use for weekly repeat.
- **Risk: `intervalDays` field name confusion for `every_n_weeks`.** Storing a week count in a field named `intervalDays` is confusing for future developers.
  - Mitigation: the Founding Engineer should evaluate whether a new `intervalWeeks` field is cleaner than overloading `intervalDays`. Document whichever choice is made.
- **Risk: ad-hoc routines in "Tracked" section feel disconnected from scheduled routines.** If the separation is too strong, users may not understand they're the same feature.
  - Mitigation: keep the visual treatment similar — same card component, same tap-to-complete interaction. Only the card metadata differs (last-done vs. due-state badge). The section header should be subtle, not a hard visual break.

## UX Notes
- **Ad-hoc routines should feel like a lightweight household status board** within the existing routines surface, not a separate feature. The "last done" timestamp is the key signal — it answers "when was this last handled?" at a glance.
- **The "Tracked" section in the index** should sort ad-hoc routines by staleness (longest since last done at top). This naturally surfaces the things that might need attention without creating pressure or overdue states.
- **Weekday picker** should use the compact toggle pattern (M T W T F S S) that iOS users are familiar with from calendar apps. Selected days are highlighted; unselected are muted.
- **Recurrence label on the routine card** should be concise and human-readable: "Mon, Thu" (not "weekly_on_days: [0, 3]"), "Every 2 weeks, Wed" (not "every_n_weeks: 2, 2"), "Track when done" (not "ad_hoc").
- **Anti-patterns to avoid:**
  - Generating overdue states for ad-hoc routines. Staleness is information, not guilt.
  - Requiring complex setup for weekday selection. The most common case (one or two days) should be a couple of taps.
  - Showing "Last done: never" in an alarming way. It should be neutral — the household just hasn't tracked this yet.

## Acceptance Criteria
1. Given a user creates a routine with `weekly_on_days` selecting Monday and Thursday, when the routine is saved, then the next due date is the nearest upcoming Monday or Thursday, and the routine card shows "Mon, Thu" as its recurrence label.
2. Given a `weekly_on_days` routine due on Monday is completed on Monday, when the next occurrence is scheduled, then the next due date is Thursday (the next matching weekday), not the following Monday.
3. Given a user creates a routine with `every_n_weeks` set to 2 weeks on Wednesday, when the routine is saved, then the next due date is the appropriate Wednesday at the 2-week interval, and the card shows "Every 2 weeks, Wed."
4. Given an `every_n_weeks` routine is completed, when the next occurrence is scheduled, then the next due date advances by exactly N weeks from the anchor weekday.
5. Given a user creates an ad-hoc routine, when the routine is saved, then it appears in the routine index in the "Tracked" section with "Not yet done" as its last-done indicator, and no due-state badge is shown.
6. Given a user marks an ad-hoc routine as done, when the completion is applied, then the "last done" timestamp updates immediately, a routine occurrence is recorded, and no next due date is scheduled.
7. Given a routine (scheduled or ad-hoc) has been completed at least once, when the routine index renders, then the routine card shows a "Last done: [relative time]" indicator.
8. Given multiple ad-hoc routines exist, when the routine index renders, then the "Tracked" section sorts routines by time since last completion (longest ago at top), with never-completed routines at the very top.
9. Given the routine index has both scheduled and ad-hoc routines, when the index renders, then scheduled routines appear in their due-state groups (overdue, due, upcoming, completed) and ad-hoc routines appear in a separate "Tracked" section below.
10. Given a user edits an existing `daily` routine to `weekly_on_days`, when the change is saved, then the next due date recalculates to the next matching weekday and the recurrence label updates.
11. Given a spouse views the routine index, when ad-hoc routines are present, then the spouse sees the same "Tracked" section and last-done timestamps as the stakeholder, in read-only mode.
12. All new component class names have corresponding CSS styles; components render as visually specified.
13. `npm run typecheck` passes with zero errors.

## Validation And Testing
- **Unit tests:**
  - `weekly_on_days` next-due-date calculation for single and multiple weekdays, including wrap-around (e.g., if today is Friday and selected days are Mon and Wed, next due is Monday).
  - `every_n_weeks` next-due-date calculation for various intervals (2, 3, 4 weeks), including month boundary crossing.
  - Ad-hoc routine due-state derivation returns null.
  - "Last done" derivation from most recent occurrence.
  - Recurrence label formatting for all rule types.
- **Integration tests:**
  - Create, complete, and re-complete flows for `weekly_on_days`, `every_n_weeks`, and `ad_hoc` routines.
  - Routine index rendering with mixed scheduled and ad-hoc routines.
  - Editing recurrence rule from one type to another recalculates correctly.
  - Ad-hoc routine occurrences are recorded correctly in routine_occurrences.
- **Household validation:**
  - Create real household routines using the new types: recycling (every 2 weeks), trash pickup (Mon and Thu), dishes (ad-hoc), laundry (ad-hoc).
  - Evaluate whether the "Tracked" section with last-done timestamps gives the household useful visibility into ad-hoc chores.
  - Validate that weekday-specific routines feel accurate — the right day shows as "due" and completing it advances to the correct next day.

## Dependencies And Related Learnings
- `docs/specs/recurring-routines.md` — the approved base spec. This depth spec extends it with new recurrence rules and ad-hoc tracking.
- `D-065` — M30 direction: stability and feature depth sprint. Routine flexibility is priority #4.
- `D-066` — M29 complete. Household feedback specifically called out routines as needing more flexibility.
- `A-008` — Recurring schedule infrastructure shared across workflows. New recurrence rules should follow the same primitives pattern.
- `A-011` (challenged) — Feature breadth vs. depth. This spec is the depth response to A-011's challenge: deepen routines before adding new features.
- `L-031` — Household feedback: "features don't contain enough functionality for daily use."

## Open Questions
1. **Board input requested:** For ad-hoc routines (dishes, laundry), would a "soft due" threshold be useful — e.g., "gentle nudge after 5 days"? This is not overdue, just a configurable visibility bump. Deferred from this spec but worth understanding household appetite.
2. **Design decision for visual spec:** How should the "Tracked" section be visually separated from scheduled routine groups? A subtle section header ("Tracked") is recommended, but the Designer should determine the right visual weight.
3. **Implementation decision for Founding Engineer:** Should `intervalDays` be overloaded for `every_n_weeks` (storing week count) or should a new `intervalWeeks` column be added? Adding a column is cleaner; overloading is simpler. Document the choice.

## Facts, Assumptions, And Decisions
- **Facts:**
  - Current recurrence rules: `daily`, `weekly`, `monthly`, `every_n_days`. All are fixed-interval.
  - The board specifically cited dishes (no fixed interval), laundry (want "last done" visibility), and recycling (alternating weeks) as pain points.
  - The routines surface and routine_occurrences table already exist and are in household use.
  - The base spec explicitly deferred weekday-set recurrence and noted it as likely Phase 2 direction.
- **Assumptions:**
  - Ad-hoc tracking within the routines surface is sufficient — a separate "household status board" concept is unnecessary and would fragment the product.
  - The "Tracked" section sorting by staleness provides useful signal without creating pressure. If this assumption proves wrong, the sort order can be changed without schema impact.
  - The compact weekday picker (M T W T F S S toggle row) is familiar enough to iOS users that no custom design work is needed beyond applying the design system tokens.
- **Decisions:**
  - Ad-hoc routines live within the existing routines model, not as a new entity type. This follows the established pattern of extending entity types rather than creating new ones.
  - Ad-hoc routines never generate due/overdue states. "Last done" is information, not obligation.
  - The "Tracked" section appears below scheduled routine groups in the index. This separates concerns without creating a new screen.
  - `weekly_on_days` and `every_n_weeks` are the two new scheduled rules. More exotic patterns (first Monday of month, cron expressions) are deferred.

## Deferred Decisions
- Whether ad-hoc routines should support a "soft due" nudge threshold (e.g., "remind after N days").
- Whether Olivia should suggest converting ad-hoc routines to scheduled ones based on completion patterns.
- Whether month-relative rules ("first Monday of each month") belong in a future Phase 3.
- Whether the weekday picker should support "every weekday" as a single-tap shortcut.
- Whether push notifications should eventually support ad-hoc routine staleness alerts.
