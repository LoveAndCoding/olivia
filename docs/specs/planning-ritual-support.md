# Feature Spec: Planning Ritual Support

## Status
- Draft

## Summary

Planning ritual support is a structured recurring review workflow that uses the existing recurring routines infrastructure to schedule household reviews and auto-populates each review from activity history (what happened last week) and the unified weekly view (what is coming up). It is the third Horizon 4 workflow and closes the loop on Olivia's temporal layer: the unified weekly view surfaces the present and near future; activity history surfaces the recent past; planning ritual support creates a structured moment to synthesize both into a household review. If it works well, the household should be able to complete a weekly review in a few minutes using data Olivia has already assembled — without manually reconstructing what happened or what is coming up.

## User Problem

After the unified weekly view and activity history, Olivia can show what is happening this week and what happened last week — but there is no structured mechanism for turning that information into a review moment. To conduct a meaningful weekly household review today, a household member must open the weekly view, recall last week from memory or by scrolling activity history, and mentally integrate both into a forward-looking plan. This reconstruction work is friction. Planning ritual support solves it by presenting a pre-assembled review at a scheduled moment, reducing the household review from reconstruction labor to acknowledgment and decision-making.

## Target Users

- Primary user: stakeholder (household primary operator)
- Secondary user: spouse (read-only in Phase 1; shared review participation is a likely Phase 2 extension)
- Future users: not relevant for Phase 1

## Desired Outcome

The household should have a sustainable weekly review habit that Olivia makes easy to complete. When the planning ritual triggers, the household member should be able to open Olivia, review a pre-assembled picture of last week and the coming week, record any carry-forward notes or decisions, and mark the review complete — all in a few minutes. Over time, the completed review records should provide a lightweight household journal of what was reviewed and what was noted.

## In Scope

- A planning ritual as a recurring routine variant that surfaces a structured review flow when an occurrence is opened for completion (rather than the standard immediate-checkbox interaction).
- Default scheduling: weekly, with the household choosing day and time (recommended default: Sunday at 7pm), using the existing recurring routines infrastructure.
- A structured review flow with three sections:
  1. **Last week recap** — assembled from activity history data sources, showing the prior calendar Monday–Sunday: completed routine occurrences, resolved reminders, past meal plan entries, closed inbox items, and checked-off list items.
  2. **Coming week overview** — assembled from the unified weekly view data sources, showing the current calendar Monday–Sunday: routines due, meals planned, reminders scheduled, and inbox items with due dates.
  3. **Carry-forward notes** — a free-text optional field for the household member to record decisions, open items, or anything worth tracking from the review.
- Completing the ritual: the household member reviews the sections and taps "Complete review." This saves a review record and advances the occurrence to the next scheduled date.
- A review record durable to the ritual occurrence: contains review date, window dates, carry-forward notes, completion timestamp, and completed-by identity.
- Completed planning ritual occurrences appear in activity history as a special routine-type entry; tapping the entry opens the review record for recall.
- The planning ritual occurrence appears in the unified weekly view on its scheduled day, under the routines section, like any other recurring routine.
- Spouse read-only view for completed review records, with the standard per-screen spouse banner (L-009).
- Offline-tolerant: the review flow renders from locally cached H3 state; the review record is saved locally and synced on reconnect.

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 1:**
- AI-generated summaries of last week's activity. Phase 1 is structured data assembly, not narrative. AI enhancement is a Phase 2 addition (consistent with L-013).
- Automatic carry-forward: notes entered during the review do not automatically create inbox items or routines. Carry-forward is plain text only in Phase 1.
- Multi-household-member shared review sessions or shared annotations. Deferred to Phase 2.
- Custom ritual templates beyond the weekly household review (e.g., monthly review, quarterly financial check). Phase 1 delivers one ritual type.
- Review history browser or trend visualization (e.g., streaks, completion rates). Deferred pending usage evidence.
- Push notifications for planning ritual due state. Deferred consistent with the recurring routines notification deferral pattern.
- Draft-save for in-progress reviews. If the household member exits the review mid-flow, the in-progress state is lost and the occurrence remains in due state. Revisit in Phase 2 if this proves to be friction.

**Known gaps acceptable in Phase 1:**
- The review flow is stakeholder-initiated only. The spouse sees completed review records in activity history but cannot initiate or participate in the review flow.
- Carry-forward notes have no follow-through mechanism — Olivia does not track whether noted intentions were acted on.
- If the household has sparse H3 activity in a given week, one or both review sections may be nearly empty. This is expected and should be handled gracefully, not surfaced as an error.

**Likely future direction:**
- AI-generated summary narrative added as a Phase 2 layer on top of the structured review sections.
- Carry-forward action item creation: a single tap converts a note into an inbox item or routine.
- Spouse shared review participation: both household members can annotate or confirm sections.
- Monthly and quarterly ritual templates.
- Review history browser with trend visualization and habit consistency data.

## Workflow

1. The planning ritual occurrence is visible in the routine index and in the unified weekly view on its scheduled day, showing an upcoming or due state.
2. The household member taps the planning ritual occurrence to open the review flow. (Unlike standard routines, tapping does not immediately complete the occurrence — it opens the structured review.)
3. The review flow opens with a clear progress indicator (e.g., "Step 1 of 3") and presents the first section: **Last week recap** — a grouped summary of completed and resolved H3 activity from the prior Monday–Sunday.
4. The household member reviews the recap and advances to the second section: **Coming week overview** — a grouped summary of scheduled H3 items for the current calendar week.
5. The household member reviews the overview and advances to the third section: **Carry-forward notes** — an optional free-text field for recording decisions, open items, or notes from the review.
6. The household member taps "Complete review." The ritual occurrence is marked complete immediately (no confirmation dialog — user-initiated, non-destructive per D-010). The next occurrence is scheduled per the recurrence rule.
7. A review record is saved containing the review date, window dates, carry-forward notes, and completion metadata.
8. The completed ritual occurrence appears in activity history for the review date, with a visual indicator that it is a planning ritual (not a standard routine completion).
9. Tapping the completed ritual in activity history opens the review record detail: a summary of what was reviewed and the carry-forward notes.

## Behavior

**Planning ritual as recurring routine variant:**
- A planning ritual is a recurring routine with a `ritual_type = weekly_review` flag or equivalent model extension. All recurring routine lifecycle behaviors apply: active, paused, archived, deleted — with the same action table and trust model as standard routines.
- Recurrence options: the same rules as all recurring routines (`daily`, `weekly`, `monthly`, `every_n_days`). Phase 1 default and recommended configuration: weekly.
- Completion interaction: tapping the planning ritual occurrence opens the review flow. The occurrence is marked complete only when the household member taps "Complete review" at the end of the flow. The ritual must not be completable via the standard checkbox shortcut; the review flow is the only completion path.
- The planning ritual card in the routine index should be visually distinct from standard routine cards — using a visual affordance (e.g., a "Review" button or a review icon) to communicate that tapping opens a flow, not an immediate completion.

**Review section: last week recap**
- Window: prior calendar week — Monday through Sunday of the week before the current week, calculated from local device time.
- Data sources and inclusion rules (same contracts as activity history):
  - Completed routine occurrences: `completion_state = completed`, `completed_at` in the prior Mon–Sun window.
  - Resolved reminders: `status = completed` or `dismissed`, `resolved_at` in the window.
  - Past meal plan entries: entries from the meal plan whose `week_start_date` equals the prior Monday.
  - Closed inbox items: `status = done`, `completed_at` in the window.
  - Checked-off shared list items: `checked = true`, `checked_at` in the window.
- Display: grouped by workflow type (routines → reminders → meals → inbox items → list items), not reverse-chronological. Grouped summaries are more useful for review-mode orientation than a raw timeline.
- Empty section state: "Nothing recorded last week." shown calmly when no activity exists in the window.

**Review section: coming week overview**
- Window: current calendar week — Monday through Sunday, calculated from local device time. Same anchor as the unified weekly view.
- Data sources and inclusion rules (same contracts as the unified weekly view):
  - Reminders: `scheduled_time` falls within Mon–Sun of the current week.
  - Routine occurrences: due date falls within Mon–Sun of the current week.
  - Meal plan entries: entries from the active meal plan whose `week_start_date` matches the current Monday.
  - Inbox items: `due_date` falls within Mon–Sun of the current week.
- Display: grouped by workflow type (same order as unified weekly view: routines → reminders → meals → inbox items), grouped by day within each type.
- Empty section state: "Nothing scheduled this week." shown calmly when no items exist in the window.

**Review section: carry-forward notes**
- An optional free-text input field.
- The household member may skip this section without entering any text.
- Maximum length: implementation decision for Founding Engineer (suggest 2000 characters as a reasonable upper bound).
- The field label should make its purpose clear: "Notes, decisions, or items to carry forward."

**Review record:**
- Created on ritual completion.
- Contains: `ritual_occurrence_id`, `review_date` (date the review was completed), `last_week_window_start`, `last_week_window_end`, `current_week_window_start`, `current_week_window_end`, `carry_forward_notes` (nullable text), `completed_at`, `completed_by`.
- The review record does not snapshot the full data from the recap and overview sections. It stores only the metadata and notes. The recap and overview sections are re-derived from current H3 state when the review record detail is viewed. This avoids data redundancy and keeps the record lightweight.
- Durable: preserved even when the planning ritual is archived (consistent with how occurrence history is preserved for archived routines).

**Planning ritual in the unified weekly view:**
- Appears on its scheduled day under the routines section, with the same completion state display as all routines (upcoming, due, overdue, completed).
- Tapping navigates to the routine detail screen, consistent with the weekly view's read-only deep-link pattern. The review flow is not launched directly from the weekly view.

**Planning ritual in activity history:**
- Completed ritual occurrences appear as routine-type entries in activity history.
- They are visually distinguishable from standard routine completions (e.g., a ritual icon or label).
- Tapping navigates to the review record detail screen rather than the standard routine detail screen.

## Data And Memory

The planning ritual creates two types of durable state: occurrence records (standard for all recurring routines) and review records (unique to planning ritual occurrences).

**Data created:**
- Recurring routine record (with `ritual_type` flag): same fields as all routines.
- Routine occurrence records: same structure as all routine occurrences, with an additional `review_record_id` foreign key field (nullable for standard routines, populated for ritual occurrences).
- Review records: `id`, `ritual_occurrence_id`, `review_date`, `last_week_window_start`, `last_week_window_end`, `current_week_window_start`, `current_week_window_end`, `carry_forward_notes`, `completed_at`, `completed_by`.

**Data consumed (read-only from H3):**
- All five activity history data sources for the last week recap.
- All four unified weekly view data sources for the coming week overview.
- No new query interfaces are introduced. The planning ritual reuses the same filter logic already defined in the activity history and unified weekly view specs, scoped to the appropriate time windows.

**Durability:**
- Review records are durable household state. They must be preserved if the planning ritual is archived.
- Carry-forward notes are household-sensitive content (may include personal decisions or financial information) — local-first only, consistent with routine titles and inbox content handling.

**Local cache:**
- The review flow renders from locally cached H3 state.
- Review records are saved to the client store first and synced to the canonical store when reconnected, using the same outbox pattern as other H3 writes.

**Transient state:**
- In-progress review state (sections acknowledged, notes entered before tapping "Complete review") is transient session state in Phase 1. Not persisted on app exit or background. The occurrence remains in due state and can be re-opened.

## Permissions And Trust Model

- The planning ritual review flow is entirely user-initiated and structured. Olivia assembles and surfaces data; the household member reviews and decides. No agentic actions occur during the review.
- Completing the review (tapping "Complete review") is a user-initiated, non-destructive action that executes immediately without a confirmation step, consistent with D-010.
- Lifecycle actions for the planning ritual routine (pause, archive, delete) follow the exact same trust model as all recurring routines: pause and archive require confirmation; delete requires higher-friction confirmation; non-destructive lifecycle actions (create, edit, resume, restore) execute immediately.
- Spouse access in Phase 1: read-only. The spouse can view completed review records via activity history but cannot initiate or participate in the review flow. The per-screen spouse banner (L-009) applies to the review flow screen and the review record detail screen.
- What Olivia must never do in this workflow:
  - Auto-complete a planning ritual occurrence without the household member completing the review flow.
  - Auto-create inbox items or routines from carry-forward notes without explicit user action.
  - Transmit carry-forward notes or review content to external AI providers without the user explicitly invoking an AI-assisted feature.
  - Treat the planning ritual as a reminder or send unsolicited notifications about it in Phase 1.

## AI Role

- No AI is required for Phase 1. The review flow is a structured assembly of existing H3 completed and scheduled state, using data already available from activity history and the unified weekly view. No inference, summarization, or classification is needed.
- AI-driven enhancements (Phase 2, deferred):
  - AI-generated summary narrative: "You completed 8 of 10 routines last week, made 5 dinners, and closed 3 inbox items."
  - AI-generated focus suggestions: "Your car maintenance routine has been overdue for 3 cycles. Want to reschedule it?"
  - Natural-language review annotation: the household member dictates or types a freeform review note; Olivia classifies it into structured carry-forward items.
- The review flow must remain fully functional without AI at any point. All data assembly is deterministic and derived from local H3 state.
- Constraint for Phase 2 AI features: carry-forward notes and review content must not be sent to external AI providers without explicit user consent per session, consistent with the local-first data handling policy.

## Risks And Failure Modes

- **Ritual feels redundant with weekly view and activity history:** If the household member already scans both surfaces regularly, the planning ritual may feel like it duplicates what they already see. Mitigation: the ritual adds the structured review moment, the synthesis step, and the carry-forward record — it is a lightweight ceremony, not just another data view.
- **Sparse review sections in early use:** A new household or a low-activity week will produce sparse recap and overview sections. The ritual should handle this gracefully — empty sections are acceptable and informative, not errors.
- **Low adoption — habit not formed:** A planning ritual is a new habit. If the household member does not complete the ritual regularly, overdue occurrences will accumulate in the routine view. Mitigation: keep Phase 1 lightweight and fast. The ritual should feel like a "win" to complete, not a burden. The paused state provides an escape valve without deleting the ritual.
- **Review flow abandoned mid-session:** In-progress review state is not persisted in Phase 1. If the app is backgrounded or the user exits, the occurrence remains due and the flow restarts on re-open. Mitigation: the flow is short (three sections) — restarting should not feel costly. If user feedback shows this is a recurring problem, draft-save can be added in Phase 2.
- **Carry-forward notes with no follow-through:** Notes without a conversion path can create accumulated guilt. Mitigation: the spec explicitly makes carry-forward plain text without Olivia tracking whether notes were acted on. The household member owns the follow-through. Phase 2 may add optional conversion to inbox items or routines.
- **Multiple planning ritual occurrences stacking if review is skipped for several weeks:** A household that skips the review for 3 weeks will have 3 overdue ritual occurrences. The standard overdue routine handling applies — they appear in the routine view. The household can pause the ritual if the cadence is too frequent; they do not need to back-fill old reviews. The ritual does not support catch-up reviews in Phase 1.

## UX Notes

- The planning ritual should feel like a meaningful household moment — a brief weekly ceremony — not a form to fill out. The review flow should be calm, structured, and completable in a few minutes.
- The review flow should communicate progress clearly at all times: e.g., "Last week recap — 1 of 3" and a visible path through the three sections.
- Review sections should be scannable, not exhaustive. Present items at a household level: routine summaries, not every individual completion timestamp. Long item lists should be scrollable but not require reading every entry to proceed.
- "Complete review" should feel like a satisfying, definitive action. It is the productive payoff of the ritual.
- The planning ritual card in the routine index must be visually distinguishable from standard routine cards. A "Start review" affordance (button or icon) makes the different completion interaction explicit. Do not show a standard completion checkbox for planning rituals.
- Empty review sections should feel calm: "Nothing recorded last week." or "Nothing scheduled this week." is appropriate — not an error state or a blank section.
- Carry-forward notes are optional. Label the field clearly as optional and do not require notes to complete the review. The field should be the last step — it should feel like a natural journal moment, not a required report.
- The per-screen spouse banner (L-009) should be present but unobtrusive when a spouse views a completed review record.
- Anti-patterns to avoid:
  - Requiring confirmation to complete the review ("are you sure you're done?") — this adds friction to a user-initiated, non-destructive action.
  - Showing the review flow directly from the weekly view (weekly view stays navigational only; the review flow opens from the routine screen).
  - Displaying raw activity history timelines in the review sections — the recap should be a grouped summary, not a raw log.
  - Blocking review completion if sections are skipped or carry-forward notes are empty.

## Acceptance Criteria

1. A planning ritual can be created as a recurring routine with a weekly cadence and appears in the routine index with a visual indicator that distinguishes it from standard routine cards.
2. The planning ritual occurrence appears in the unified weekly view on its scheduled day, under the routines section, with correct completion state display.
3. Tapping the planning ritual occurrence in the routine index opens the structured review flow — not an immediate-completion checkbox interaction.
4. The review flow presents three sections in order: last week recap, coming week overview, and carry-forward notes.
5. The last week recap section shows activity from the prior calendar Monday–Sunday, drawn from all five activity history data sources (completed routines, resolved reminders, past meals, done inbox items, checked list items), grouped by workflow type.
6. The coming week overview section shows scheduled items for the current calendar Monday–Sunday, drawn from all four unified weekly view data sources (routine occurrences, reminders, meal plan entries, inbox items with due dates), grouped by workflow type.
7. Empty review sections display a clear, calm empty state message rather than a blank section or error.
8. The carry-forward notes field accepts free-text input and is labeled as optional.
9. The household member can complete the ritual by tapping "Complete review" after any point in the flow. Completion executes immediately without a confirmation step.
10. Completing the review saves a review record with the correct fields: review date, window dates, carry-forward notes, completion timestamp, completed-by identity.
11. The completed occurrence advances to the next scheduled occurrence per the recurrence rule.
12. The completed ritual occurrence appears in activity history for the review date, visually identified as a planning ritual (distinct from standard routine completions).
13. Tapping the completed ritual entry in activity history opens the review record detail, showing carry-forward notes and a summary of the review windows.
14. The planning ritual supports the same lifecycle actions as all recurring routines: pause (with confirmation), archive (with confirmation), delete (with higher-friction confirmation), and edit (immediate).
15. The review flow renders from locally cached H3 state when offline, without crashing or showing an error state.
16. The review record is saved to the client store and synced to the canonical store on reconnect, consistent with the outbox pattern used throughout Olivia.
17. The spouse sees completed review records from activity history in read-only mode with the per-screen spouse banner (L-009). The spouse cannot initiate or complete a review flow.
18. No AI is required for Phase 1. All review sections are populated from locally cached H3 state.

## Validation And Testing

**Household validation:**
- After several weeks of use, observe whether the household member completes the ritual consistently. Regular weekly completion is the primary success signal.
- Observe whether the pre-assembled review sections materially reduce the time and effort compared to reconstructing the week manually.
- Observe whether carry-forward notes are used regularly. If rarely used, evaluate whether the field is useful or should be restructured in Phase 2.
- If the ritual is paused or archived early, treat this as a signal that cadence or flow length needs adjustment.

**Unit tests:**
- Last week recap window calculation: correct prior Monday–Sunday for any given date, including month and year boundary edge cases.
- Coming week overview window calculation: same anchor logic as the unified weekly view.
- Data assembly per source for both sections: correct inclusion/exclusion of items by completion date and window boundary.
- Empty section handling: a week with no H3 activity produces an empty section, not an error or crash.
- Review record creation: all fields are correctly populated on completion.
- Next occurrence scheduling: completing the ritual advances to the next occurrence per the recurrence rule.

**Integration tests:**
- End-to-end: given a household with H3 activity in the prior week and scheduled items in the current week, completing the planning ritual saves a review record with correctly assembled recap and overview data.
- Offline: the review flow renders from cached state; the review record is saved to the outbox and synced correctly on reconnect.
- Activity history: the completed ritual occurrence appears in activity history in the correct day section with the correct ritual visual indicator.
- Review record detail: tapping the activity history entry for a completed ritual opens a detail view showing the carry-forward notes and window metadata.

**Manual validation:**
- The review flow renders correctly across mobile screen sizes (primary: phone; secondary: tablet).
- The planning ritual card in the routine index is visually distinguishable from standard routine cards.
- The "Start review" affordance is clear and does not resemble a completion checkbox.
- The spouse banner appears on the review record detail screen for a spouse session.
- A week with no H3 activity renders all sections with empty state messages, not errors.
- An in-progress review abandoned mid-flow leaves the occurrence in due state on re-open.

## Dependencies And Related Learnings

- L-013: H4 should synthesize existing H3 state before adding new primitives or AI — planning ritual support follows this principle exactly.
- L-014: Activity history and the unified weekly view form the temporal data foundation this spec draws from. Planning ritual support is the synthesis layer on top; the data contract for ritual's consumption of H3 completed state is defined here and reuses activity history and unified weekly view field contracts without modification.
- D-022: Planning ritual support confirmed as the third H4 spec target in the sequencing: unified weekly view → activity history → planning ritual support.
- D-002: Advisory-only trust model — Olivia surfaces data for review; no agentic actions during the review flow.
- D-010: Non-destructive user-initiated actions execute immediately — completing the review ritual follows this rule without a confirmation step.
- Depends on: `docs/specs/recurring-routines.md` (scheduling, lifecycle, and completion infrastructure)
- Depends on (data contracts): `docs/specs/activity-history.md` (last week recap data sources and field contracts), `docs/specs/unified-weekly-view.md` (coming week overview data sources and field contracts)
- Depends on (indirectly): `docs/specs/first-class-reminders.md`, `docs/specs/meal-planning.md`, `docs/specs/shared-household-inbox.md`, `docs/specs/shared-lists.md`

## Open Questions

1. **Last week recap window when the ritual is completed off-schedule:** If the ritual is completed on Wednesday instead of Sunday, "last week" defaults to the prior calendar Monday–Sunday (not a rolling 7-day window). This is the recommendation — calendar-week anchoring is consistent with the convention established across all H4 surfaces. Confirm before implementation begins.

2. **Draft-save for in-progress reviews:** Phase 1 does not persist in-progress review state. Should Phase 2 add draft-save? Recommendation: defer; collect feedback after Phase 1 use before deciding whether this is a real friction point.

3. **Planning ritual card interaction:** Should the ritual card in the routine index show a dedicated "Start review" button, or should tapping anywhere on the card open the review flow? Recommendation: a dedicated "Start review" action affordance to make the behavior explicit. Designer decision for the visual spec.

4. **Multiple overdue ritual occurrences:** If the household skips the ritual for 3 weeks, 3 overdue occurrences accumulate. Should the review flow always reflect the current week (ignoring the specific occurrence date) or the week associated with that occurrence (which may be 2–3 weeks ago)? Recommendation: each occurrence anchors its review to the week it was scheduled for. A ritual scheduled for Sunday March 9 reviews the week of March 3–9 and upcoming week of March 10–16, even if the household completes it late. This is the most honest reflection of the household state at that time.

5. **Review record UI design:** What does the review record detail screen look like when accessed from activity history? This is a designer decision and should be addressed in the visual spec.

## Facts, Assumptions, And Decisions

**Facts:**
- The recurring routines infrastructure provides scheduling, completion tracking, occurrence records, and lifecycle management — all reusable for planning ritual support without modification.
- Activity history (OLI-41) defines the five completed-state data sources and their field contracts. Planning ritual support's last week recap draws from these sources without introducing new query infrastructure.
- The unified weekly view spec defines the four scheduled-state data sources and their field contracts. Planning ritual support's coming week overview draws from these sources without modification.
- No new entity types are required for Phase 1. A planning ritual is a recurring routine variant; a review record is a simple attached data record.

**Assumptions:**
- The household's natural review cadence is weekly, making a Sunday-anchored weekly ritual the right default. Validate in early household use.
- A lightweight three-section review (a few minutes to complete) is more adoptable than a comprehensive review process. If the household finds Phase 1 too lightweight to be useful, expand in Phase 2.
- The existing activity history and unified weekly view data contracts are sufficient for the review sections without new query infrastructure.
- The per-occurrence calendar-week anchor (rather than a rolling window) is the right behavior when rituals are completed late, for consistency with the product's week-anchoring convention.

**Decisions:**
- Planning ritual is a recurring routine variant, not a new workflow primitive. Uses existing recurring routines infrastructure.
- Phase 1 review flow: three sections — last week recap, coming week overview, carry-forward notes.
- Last week recap window: fixed prior calendar week (Mon–Sun), matching the calendar-week anchor convention.
- Coming week overview window: current calendar week (Mon–Sun), same anchor as unified weekly view.
- Review data sections use grouped-by-type display (not reverse-chronological) — grouped summaries are more useful for review-mode orientation.
- Review record stores window metadata and carry-forward notes only; it does not snapshot the assembled H3 data (which is re-derived from current state on view).
- No AI required for Phase 1. AI-generated narrative is a Phase 2 addition.
- No automatic carry-forward (notes-to-inbox or notes-to-routine conversion) in Phase 1.
- In-progress review state is transient in Phase 1 — not persisted on app exit.

## Deferred Decisions

- Spouse shared review participation — Phase 2.
- AI-generated summary narrative — Phase 2.
- Monthly and quarterly ritual templates — Phase 2.
- Carry-forward action item creation (notes-to-inbox or notes-to-routine conversion) — Phase 2.
- In-progress draft-save behavior — revisit after Phase 1 usage feedback.
- Review history browser with trend visualization — Phase 2.
- Push notifications for planning ritual due state — deferred, consistent with recurring routines notification deferral.
- Planning ritual card design and review flow UI layout — visual spec (designer decision).
- Review record detail screen design — visual spec (designer decision).
- How to handle multiple stacked overdue ritual occurrences in the routine index UX — designer decision.
