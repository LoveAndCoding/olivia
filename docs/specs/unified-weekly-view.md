# Feature Spec: Unified Weekly View

## Status
- Draft

## Summary

The unified weekly view is a single read surface that shows the household's operational picture for the current calendar week (Monday through Sunday) across all four Horizon 3 workflow types: reminders, recurring routines, meal plans, and inbox items with due dates. It is the first Horizon 4 surface and adds the temporal, cross-workflow dimension that the coordination layer implicitly needs after four H3 workflows each operate in their own views. The view does not introduce new entities — it surfaces existing H3 entities in a cross-workflow temporal context. If it works well, the household should be able to glance at the weekly view and immediately know what is happening, what is due, and what has been planned — without opening four separate screens.

## User Problem

After four Horizon 3 workflows, the household coordination layer has strong depth but limited cross-workflow visibility. To understand the week ahead, a household member must open the reminders screen, the routines screen, the meal planning screen, and the inbox separately. There is no single answer to "what does this week look like?" The weekly view solves this: it assembles the scheduled and due items from all workflow types into a unified day-by-day picture of the week.

## Target Users

- Primary user: stakeholder (household primary operator)
- Secondary user: spouse (read-only view, consistent with all H3 workflows)
- Future users: not relevant for Phase 1

## Desired Outcome

The household should be able to open a single screen and see what is happening across the entire week — routines due, meals planned, reminders scheduled, and inbox items coming due — without having to reconstruct the picture from four separate screens. The view should feel like a natural "home base" for starting and reviewing the household's week.

## In Scope

- A day-by-day weekly view anchored to the current calendar week (Monday through Sunday).
- Surfacing reminders with a scheduled time this week, showing their status (upcoming, due, overdue, snoozed).
- Surfacing recurring routine occurrences due this week, showing their completion state (upcoming, due, overdue, completed).
- Surfacing meal plan entries assigned to each day of the current week, including meal names and a link to the full plan.
- Surfacing inbox items with a due date falling in the current week, showing their status (open, in-progress, overdue, done).
- A persistent "today" highlight so the current day is visually distinguished from the rest of the week.
- Overdue items from earlier in the current week remain visible (days that have already passed are not hidden).
- Tapping any item deep-links to its source workflow screen for editing, completing, or viewing detail.
- An empty-day state when no items are scheduled for a given day.
- Spouse read-only access with the same per-screen banner established for all H3 workflows (L-009).
- Offline-tolerant rendering using locally cached H3 state; no new sync primitive is needed.

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 1:**
- Shared lists have no temporal anchor (no due date, no scheduled day) and are intentionally excluded from the weekly view. They remain accessible only from the lists screen.
- Completed items from prior weeks are not shown. This is the purview of the activity history spec (the second H4 target).
- Creating, editing, or completing any entity from within the weekly view is deferred. The view is read-only; all writes happen in the source workflow screen. This keeps Phase 1 scope minimal and reduces product ambiguity about what the view owns.
- AI-generated summaries or smart digests of the week are deferred. The Phase 1 view is a structured assembly of existing scheduled state, not an AI-generated narrative.
- Showing the next week or prior weeks. The Phase 1 view is anchored to the current week only. Navigation to other weeks is deferred.
- Notifications triggered from the weekly view (e.g., a weekly summary push). Deferred pending usage validation.
- A widget or lock-screen summary view. Deferred.

**Known gaps acceptable in Phase 1:**
- Inbox items without a due date do not appear in the weekly view. This means some open household work is not visible here — it remains visible only in the inbox.
- Meal plans are shown only if a plan exists for the current week. If no plan is active, the meal row for each day is empty or suppressed.
- Routine recurrence rules that do not produce any occurrence this week (e.g., a monthly routine not due this week) are not shown for those days.

**Likely future direction:**
- A look-ahead view or multi-week navigation.
- Inline completion of routines directly from the weekly view (a natural extension once the view is proven).
- AI-generated weekly digest or narrative summary layered on top of the structured view.

## Workflow

1. The household member opens the weekly view from the primary navigation (a dedicated tab or home screen entry point).
2. The view loads and shows the current calendar week (Monday through Sunday), with today highlighted.
3. The view assembles items from four sources: reminders, recurring routines, meal plans, and inbox items with due dates.
4. Items are organized by day, within each day grouped by workflow type with visual differentiation (see UX Notes).
5. The household member scans the week, sees what is due today and upcoming, and sees what meals are planned.
6. Tapping a reminder navigates to the reminder detail screen.
7. Tapping a routine occurrence navigates to the routine detail screen for that routine.
8. Tapping a meal entry navigates to the day view within the meal plan screen.
9. Tapping an inbox item navigates to the inbox item detail screen.
10. The household member can also deep-link to "today" immediately if the view loads on a different day (e.g., the first visible day is today by default, with scroll access to the rest of the week).

## Behavior

**Assembly logic:**
- Reminders: include any reminder whose `scheduled_time` falls within Mon–Sun of the current calendar week. Show status: upcoming (not yet due), due (at or past scheduled time, not yet completed), overdue (past scheduled time and still not completed or snoozed), snoozed, completed.
- Recurring routines: include any routine occurrence whose due date falls within Mon–Sun of the current week. Show status: upcoming, due, overdue, completed.
- Meal plans: include meal entries from the active (non-archived) meal plan whose `week_start_date` matches the Monday of the current week. If no active plan exists for this week, show an empty state for each day's meal slot with a prompt to create a plan.
- Inbox items: include any inbox item with a `due_date` falling within Mon–Sun of the current week. Show status: open, in-progress, overdue (past due date and not done), done.

**Day organization:**
- Each day of the week is a collapsible or always-expanded section.
- Within each day, workflow types appear in a consistent visual grouping order: routines first (scheduled obligations), then reminders (time-anchored prompts), then meals (planned), then inbox items (work with due dates). The order should feel like the household's day: obligations → prompts → plans → tracked work.
- If a day has no items across any workflow type, show a clear empty state rather than a blank section.

**Cross-week awareness:**
- If a reminder or inbox item is overdue from a prior week (due date before this Monday but still not resolved), it is NOT surfaced in the weekly view — it belongs in the individual workflow view. The weekly view shows only items due or scheduled within the current calendar week.
- This keeps the weekly view from becoming an overdue backlog. The inbox and reminders screens handle backlog visibility.

**Current week calculation:**
- The current week is always Monday of the current calendar week through Sunday of the same week.
- Calculation is based on local device time, consistent with how recurring routines and reminders calculate due dates.

## Data And Memory

The weekly view does not create or modify any data. It is a read-only assembly of existing H3 state.

**Data sources (read-only):**
- Reminder records: `scheduled_time`, `status`, `title`, `owner`
- Routine records and their occurrence records: `due_date`, `completion_state`, `title`, `owner`
- Meal plan records and their meal entry records: `week_start_date`, `day_of_week`, `meal_name`, `plan_title`
- Inbox item records: `due_date`, `status`, `title`, `owner`

**Local cache:**
- The weekly view should render from locally cached H3 state when offline, consistent with the offline-first model used throughout Olivia.
- No new sync primitive is introduced; the weekly view benefits automatically from the existing client caches for each workflow type.

**Transient state:**
- The currently selected or scrolled day within the weekly view is transient UI state and does not need to be persisted.

## Permissions And Trust Model

- The weekly view is a read-only advisory surface. It does not propose, initiate, or execute any actions.
- All interactions are navigational: tapping an item opens the source workflow screen, which applies that screen's own trust model for any writes.
- The view itself never triggers confirmation dialogs — it contains no write actions.
- Spouse sees the same weekly view in read-only mode. The per-screen spouse banner (L-009) is applied to the weekly view header, consistent with all H3 workflow screens.
- What Olivia must never do in this workflow: surface items not in the current week, auto-complete items, or modify any record from the weekly view screen.

## AI Role

- No AI is required for Phase 1. The weekly view is a structured assembly of existing scheduled data — it does not need inference, summarization, or classification.
- AI-driven enhancements (e.g., a "here's what matters most today" summary, or natural-language digest of the week) are deferred to a later Horizon 4 slice.
- The view must remain fully functional without AI. Its value comes from aggregation and temporal context, not from AI-generated content.

## Risks And Failure Modes

- **Empty view:** If the household has no scheduled reminders, no routines due this week, no meal plan for the week, and no inbox items with due dates this week, the view will appear substantially empty. This is a real early-adoption risk. Mitigate with a useful empty state that surfaces quick-links to create a meal plan or see existing reminders.
- **Overloaded view:** If the household has many routines, reminders, and inbox items all due in the same week, a day section could become overwhelming. Phase 1 should have a clear visual hierarchy that makes scanning easy without truncating important items.
- **Stale data:** If offline and the client cache is old, the weekly view may show inaccurate state (e.g., showing a routine as due when it was already completed on another device). This is acceptable as a known limitation of the local-first model — synced state resolves on reconnect.
- **No active meal plan:** Many weeks may not have an active meal plan. The view should handle this gracefully with a visible prompt rather than empty rows, to reinforce the habit of weekly meal planning.
- **Routine due once vs. multiple times per week:** A daily routine could appear on every day of the week. The view should handle multi-day routine recurrence gracefully without repeating identical entries in a confusing way.

## UX Notes

- The weekly view should feel like a household command center summary, not a calendar. It is not a calendar app. Days are sections, not calendar cells. The visual language should remain consistent with the rest of Olivia.
- Today's section should be prominently highlighted and visible without scrolling when the user opens the view.
- Workflow type groupings within each day should use consistent color or icon indicators to let the household member immediately distinguish a routine from a reminder from a meal from an inbox item.
- The view should be scannable in 10–15 seconds. If it requires careful reading to understand the week, the layout or density is wrong.
- Empty days should feel calm, not broken. A subtle "nothing scheduled" message is better than a blank gap.
- Completed items (completed routines, done inbox items) should appear with a visual completion state but remain visible for the day — not hidden. The household member should be able to see what has already been done today.
- The spouse banner should not dominate the view on shared access; it should be a calm informational element, consistent with L-009.

## Acceptance Criteria

1. The weekly view screen exists and is reachable from the primary navigation.
2. The view shows the current calendar week (Monday through Sunday), always anchored to Monday of the current week.
3. Today's section is visually distinguished from other days and is the default visible starting point when the view loads.
4. Reminders with a scheduled time in the current week appear in the correct day section with their status (upcoming, due, overdue, snoozed, completed).
5. Recurring routine occurrences due in the current week appear in the correct day section with their completion state (upcoming, due, overdue, completed).
6. Meal plan entries from the active meal plan for the current week appear in the correct day section by day of week.
7. Inbox items with a due date in the current week appear in the correct day section with their status (open, in-progress, overdue, done).
8. Shared lists do not appear in the weekly view.
9. Items from prior weeks (due dates before this Monday) do not appear in the weekly view.
10. Tapping a reminder navigates to the reminder detail screen.
11. Tapping a routine occurrence navigates to the routine detail screen.
12. Tapping a meal entry navigates to the meal plan day view.
13. Tapping an inbox item navigates to the inbox item detail screen.
14. A day with no items shows a clear empty-day state rather than a blank section.
15. When no active meal plan exists for the current week, the meal slot in each day shows an appropriate empty state with a create-plan prompt.
16. The spouse sees the weekly view in read-only mode with the per-screen spouse banner.
17. The weekly view renders from local cache when offline, without crashing or showing an error.
18. No write actions are possible from the weekly view itself.

## Validation And Testing

**Household validation:**
- After a period of actual use, observe whether the household member opens the weekly view regularly. If it becomes a habit-forming first stop for the day, the feature is successful.
- If the household member reports it as "useful to scan" but continues opening individual workflow screens for daily use, evaluate whether the view needs inline actions in Phase 2.

**Unit tests:**
- Week anchor calculation (Monday of current week for any given date, including edge cases around Sunday, timezone boundaries).
- Item assembly logic per workflow type (correct filter by due date / scheduled time / week_start_date).
- Empty-day logic (day with zero items from all four sources shows empty state).
- Overdue-from-prior-week exclusion (items past this Monday are excluded even if not resolved).

**Integration tests:**
- End-to-end: given a household with reminders, routines, a meal plan, and inbox items all due in the current week, all appear in the correct day sections.
- Offline: the view renders correctly from cached state without a network connection.

**Manual validation:**
- The view renders correctly across mobile screen sizes (primary: phone; secondary: tablet).
- The spouse banner appears for a spouse session.
- Tapping each workflow type navigates to the correct source screen.
- A week with no items renders without errors.

## Dependencies And Related Learnings

- L-011: All four H3 workflows share a coherent coordination-layer model — the weekly view builds directly on this.
- L-012: Meal planning confirms the household command center extends into proactive planning — the weekly view is the forward-looking complement.
- D-022: Confirmed unified weekly view as first H4 spec target; activity history is second, planning ritual support is third.
- A-001 (validated): shared household state as the first wedge — the weekly view is the highest-level expression of shared household state to date.
- Depends on: `docs/specs/first-class-reminders.md`, `docs/specs/recurring-routines.md`, `docs/specs/meal-planning.md`, `docs/specs/shared-household-inbox.md`
- Shared Lists (`docs/specs/shared-lists.md`) are explicitly excluded from the weekly view due to their lack of temporal anchor.

## Open Questions

1. **Week navigation:** Should Phase 1 allow the user to navigate to the next week (to see an upcoming week's meal plan and scheduled routines) or only the current week? The roadmap recommendation is current week only for Phase 1, but a "next week" peek might be high value given meal planning's weekly structure.
2. **Inline completion for routines:** A routine due today is prominently visible in the weekly view. Is it frustrating that the user must navigate to the routine screen to mark it done? Should Phase 2 add inline completion directly from the weekly view for routine occurrences? (Deferred from Phase 1 to keep scope bounded, but this is the most likely first extension.)
3. **Overdue from prior weeks:** Items overdue from last week are not shown in the weekly view. Is this the right call? Alternatively, an "overdue from prior weeks" roll-up section at the top of the view could surface unresolved work without cluttering the day-by-day layout.
4. **Navigation entry point:** Should the weekly view be the default home screen when the app opens, or should it be a distinct tab alongside the existing workflow screens? This is a designer decision, but the product recommendation is to give it a prominent nav position — likely a first or second tab — to establish the "command center" habit.
5. **Routine completion count:** For a daily routine (e.g., "take medication"), should the weekly view show each day's occurrence as a separate row, or as a single routine with a completion-per-day summary? Showing all 7 occurrences could overwhelm the view for households with many daily routines.

## Facts, Assumptions, And Decisions

**Facts:**
- The four H3 workflow types (reminders, recurring routines, meal plans, inbox items) all have a temporal anchor that can be mapped to a calendar week: reminders have `scheduled_time`, routines have recurrence-derived `due_date`, meal plans have `week_start_date` with per-day meal entries, inbox items have an optional `due_date`.
- Shared lists have no temporal anchor and cannot be naturally assembled into a day-by-day weekly view.
- All four H3 workflows store their data locally first — the weekly view can render from this cache without a new sync layer.

**Assumptions:**
- The household's natural planning rhythm is weekly, making a Monday–Sunday anchor more useful than a rolling 7-day window. (Meal planning's "week of [Monday date]" structure confirms this convention is already in place.)
- A read-only aggregation view is sufficient for Phase 1 value. Inline actions can be added in Phase 2 if usage validates that the deep-link pattern is too high friction.
- The view becomes most valuable after a household has several active routines, a meal plan in place, and reminders spread across the week. An empty household will see an empty view.

**Decisions:**
- Time horizon for Phase 1: current calendar week (Monday–Sunday), no prior or future week navigation.
- Within-day grouping order: routines → reminders → meals → inbox items (obligations first, then prompts, then plans, then tracked work).
- No write actions in Phase 1. All interactions are navigational (deep-links to source screens).
- Shared lists are explicitly excluded from the weekly view in Phase 1.
- Items overdue from prior weeks are excluded from the weekly view. The individual workflow screens handle backlog visibility.

## Deferred Decisions

- Navigation entry point (home screen vs. tab position) — designer decision.
- Whether overdue-from-prior-week items should appear in a roll-up section at the top of the view.
- Inline action model for Phase 2 (most likely: routine completion inline, possibly reminder snooze inline).
- Multi-week navigation (next week peek / prior week history view).
- AI-generated weekly digest or narrative summary layer.
- Notification model for the weekly view (e.g., a Sunday evening weekly-preview push notification).
- How to handle many daily routines without overwhelming the day sections (possible: collapsed routine count with expand affordance).
