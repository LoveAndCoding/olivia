# Feature Spec: Reminders Depth — Date Picker & Snooze Behavior

## Status
- Draft

## Summary
The current reminders workflow uses browser `prompt()` dialogs for custom date/time entry and has a reported snooze behavior issue where snoozed items may still appear on the home screen. This spec defines two improvements to make reminders practical for daily household use: (1) replace text-based date/time entry with a proper picker component, and (2) clarify and enforce correct snooze visibility behavior so snoozed reminders fully disappear until their snooze time.

## User Problem
- **Date/time entry is cumbersome.** When creating or editing a reminder, the "Custom date" option opens a raw browser `prompt()` dialog that requires the user to type a date string (e.g., "March 20, 9:00 AM"). This is error-prone, especially on mobile — there is no calendar, no time wheel, and no validation feedback. The quick-select chips (Today, Tonight, Tomorrow) help for near-term reminders, but anything beyond tomorrow requires the prompt fallback.
- **Snooze doesn't feel right.** The board reported that snoozed reminders "keep it in the home screen when they should disappear until the snooze time." Whether this is a rendering bug or a UX expectation gap, the household experience is that snoozing doesn't cleanly remove the item from view.
- **Custom snooze has the same prompt problem.** The "Choose a time…" option in the snooze sheet also uses `prompt()`, creating the same friction as custom date entry for reminders.

## Target Users
- Primary: stakeholder (household operator who creates and manages reminders daily)
- Secondary: spouse (views reminders; benefits from clearer snooze state)

## Desired Outcome
- Setting a reminder date/time feels fast and reliable on mobile — comparable to a native iOS date picker.
- Snoozing a reminder cleanly removes it from all active surfaces until the snooze time arrives.
- Custom date/time selection (for both creation and snooze) uses the same picker component, not a text prompt.

## In Scope
1. **Date/time picker component** — a proper input for selecting date and time that replaces all `prompt()` usage in reminder workflows.
2. **Snooze visibility rules** — clear specification of where snoozed reminders appear and don't appear.
3. **Integration points** — where the picker is used: CreateReminderSheet, EditReminderSheet, SnoozeSheet.

## Boundaries, Gaps, And Future Direction
- **Not in scope:** new reminder features (categories, priority, attachments), recurrence changes, notification settings, or reminder-to-inbox conversion. This is a UX depth improvement to existing flows.
- **Acceptable gap:** the picker does not need to support complex recurrence date selection (e.g., "every third Tuesday"). Recurrence cadence selection (daily/weekly/monthly) remains a separate control.
- **Future direction:** if the household wants richer scheduling (specific days of week, bi-weekly), that belongs in the routines-depth spec, not here.

## Workflow

### Date/Time Picker — Reminder Creation
1. User opens CreateReminderSheet.
2. User sees quick-select date chips: Today, Tonight, Tomorrow (unchanged).
3. User taps "+ Custom date" chip.
4. Instead of a `prompt()` dialog, a date/time picker appears inline within the sheet or as a secondary sheet panel.
5. User selects a date from a calendar view, then selects a time.
6. The selected date/time populates the scheduled-at field and the chip shows the formatted selection.
7. User can re-tap to change the selection before saving.

### Date/Time Picker — Reminder Editing
1. User opens EditReminderSheet for an existing reminder.
2. The current scheduled date/time is shown in the date/time field.
3. User taps the date/time field to open the picker.
4. User selects a new date and time.
5. The field updates immediately (non-destructive user action, no confirmation needed).

### Date/Time Picker — Custom Snooze
1. User opens SnoozeSheet from a due or overdue reminder.
2. User sees pre-calculated quick options (In 1 hour, This afternoon, Tonight, Tomorrow morning) — unchanged.
3. User taps "Choose a time…" option.
4. Instead of a `prompt()` dialog, the same date/time picker component appears.
5. The picker defaults to the current date with time set to the next reasonable hour.
6. User selects the desired snooze-until date and time.
7. Snooze is applied immediately (non-destructive user action).

### Snooze Visibility
1. User snoozes a reminder to a future time.
2. The reminder immediately disappears from:
   - Home screen reminder cards / surfaced reminders
   - The "Due" and "Overdue" filter tabs on the reminders list page
   - Any nudge card or nudge content referencing that reminder
   - Push notification queue for that reminder (if pending)
3. The reminder remains visible in:
   - The "Snoozed" filter tab on the reminders list page (with reduced opacity per existing design)
   - The "All" filter tab on the reminders list page (with snoozed styling)
   - The reminder's own detail page (showing snooze-until time)
4. When the snooze time arrives, the reminder transitions back to "due" state and reappears on all active surfaces.

## Behavior

### Date/Time Picker Component
- **Input method:** the picker should use native HTML5 `<input type="datetime-local">` as the foundation, styled to match the design system. This leverages the platform's native date/time selection UX (calendar wheel on iOS, date picker on Android/desktop) without building a custom calendar component.
- **Why native over custom:** native pickers are accessible, locale-aware, and feel familiar on iOS (Olivia's primary platform). A custom calendar component adds maintenance burden and risks feeling worse than the platform default.
- **Minimum selectable time:** the picker should not allow selecting a date/time in the past. If the user selects a past time, show a brief inline validation message and do not save.
- **Default value for snooze:** when opened from the snooze sheet, default to today's date with the time set to the next whole hour (e.g., if it's 2:37 PM, default to 3:00 PM).
- **Default value for creation:** when opened from the create sheet, default to tomorrow at 9:00 AM.
- **Display format:** after selection, display the date/time in the same format used elsewhere in the app: relative when possible ("Tomorrow, 9:00 AM", "Mar 25, 3:00 PM"), falling back to absolute date format for dates more than a week away.

### Snooze State Behavior
- A snoozed reminder's `computeReminderState()` must return `'snoozed'` for any reminder whose `snoozedUntil` timestamp is in the future, regardless of its `scheduledAt` value.
- The home screen surfacing logic must exclude all reminders in the `'snoozed'` state — this appears to be the intent of the current code (line 465 of home-page.tsx), but the board reports it isn't working correctly. The implementation task should investigate and fix any edge cases.
- The reminders list page must not show snoozed reminders in the "Due" or "Overdue" filter tabs.
- The snooze confirmation banner should display the snooze-until time clearly (e.g., "Snoozed until tomorrow at 9:00 AM").

## Data And Memory
- No new data entities. The picker produces the same ISO 8601 datetime string that the current `prompt()` flow produces.
- Snooze state uses the existing `snoozedUntil` field on reminder records.
- No sensitive data implications beyond what already exists.

## Permissions And Trust Model
- This feature remains advisory-only. No trust model changes.
- Date/time selection is a user-initiated action — executes immediately, no confirmation needed.
- Snooze is a non-destructive user-initiated action — executes immediately.
- Olivia must not auto-snooze reminders or change snooze times without user action.

## AI Role
- AI is not involved in this feature. Date/time selection and snooze are structured user interactions.
- The existing natural-language date parsing in chat remains unchanged.

## Risks And Failure Modes
- **Risk: native picker styling mismatch.** `<input type="datetime-local">` renders differently across browsers and platforms. On iOS Safari/WebView it uses the native date wheel, which looks good. On desktop browsers it may look less polished. Mitigation: Olivia's primary platform is iOS via Capacitor — optimize for that experience. Desktop is a fallback.
- **Risk: timezone confusion.** Date/time pickers can introduce timezone issues if the value is interpreted as UTC when the user intended local time. Mitigation: always interpret picker values as local time (the default for `datetime-local`), consistent with current behavior.
- **Risk: snooze bug is deeper than rendering.** If the snoozed-reminder-on-home-screen issue is a state computation bug rather than a filtering bug, the fix may require changes to `computeReminderState()` or the API response. Mitigation: the implementation task should investigate the root cause before assuming it's a simple filter fix.

## UX Notes
- The picker should feel fast and lightweight — not like a calendar app modal. Inline expansion within the existing sheet is preferred over a new overlay.
- Quick-select chips should remain the primary path for common cases (today, tonight, tomorrow). The picker is the escape hatch for everything else.
- The snooze sheet's quick options are already well-designed. The only change is replacing "Choose a time…" → `prompt()` with "Choose a time…" → picker.
- Snoozed reminders should feel "out of the way" — reduced opacity and confinement to the Snoozed tab reinforces that they are handled, not forgotten.

## Acceptance Criteria
1. Given a user taps "+ Custom date" in CreateReminderSheet, when the picker appears, then it shows a native date/time selector (not a `prompt()` dialog) and the selected value is saved as the reminder's scheduled time.
2. Given a user taps the date/time field in EditReminderSheet, when the picker appears, then it shows the current scheduled time as the default and allows changing it.
3. Given a user taps "Choose a time…" in SnoozeSheet, when the picker appears, then it shows a native date/time selector defaulting to the next whole hour and the selected value is applied as the snooze-until time.
4. Given a user selects a date/time in the past, when they attempt to save, then the picker shows an inline validation message and does not save the value.
5. Given a user snoozes a reminder, when the home screen renders, then the snoozed reminder does not appear in the surfaced reminder cards.
6. Given a user snoozes a reminder, when the reminders list page renders with the "Due" or "Overdue" filter active, then the snoozed reminder does not appear.
7. Given a user snoozes a reminder, when the reminders list page renders with the "Snoozed" filter active, then the snoozed reminder appears with reduced opacity and shows the snooze-until time.
8. Given a snoozed reminder's snooze-until time arrives, when the state is recomputed, then the reminder transitions to "due" and reappears on active surfaces.
9. All picker component class names have corresponding CSS styles; the picker renders as visually consistent with the design system (border-radius, typography, color tokens).
10. `npm run typecheck` passes with zero errors.

## Validation And Testing
- **Unit tests:**
  - `computeReminderState()` returns `'snoozed'` when `snoozedUntil` is in the future, including edge cases (snooze time exactly now, snooze time just passed).
  - Past-time validation rejects dates in the past.
  - Default time calculation for snooze picker (next whole hour).
- **Integration tests:**
  - Snooze flow: snooze a reminder → verify it disappears from home screen surfaced list → verify it appears in snoozed filter.
  - Create flow: select custom date via picker → save → verify reminder has correct `scheduledAt`.
- **Manual validation:**
  - Test on iOS via TestFlight: confirm the native date wheel appears and feels natural.
  - Test snooze end-to-end: snooze a reminder, verify it clears from home screen, wait for snooze time, verify it reappears.
- **Regression protection:**
  - Quick-select chips (Today, Tonight, Tomorrow) continue to work correctly.
  - Pre-calculated snooze options (In 1 hour, This afternoon, etc.) continue to work correctly.

## Dependencies And Related Learnings
- `docs/specs/first-class-reminders.md` — the approved base spec for reminders. This depth spec extends the snooze and creation workflows defined there.
- `D-065` — M30 direction: stability and feature depth sprint. Reminder date/time picker is priority #3.
- `L-031` — Feature breadth without depth: household reported "reminders lack a proper date/time picker."
- `docs/plans/reminders-visual-implementation-spec.md` — existing design system tokens and component anatomy. The picker must use these tokens.

## Open Questions
1. **Board clarification needed:** When you snooze a reminder and it "keeps it in the home screen" — is this happening consistently, or only in specific scenarios (e.g., after app reload, with recurring reminders, on certain screens)? Understanding the reproduction path will help the engineer fix the root cause efficiently.

## Facts, Assumptions, And Decisions
- **Fact:** Three places in the codebase use `prompt()` for custom date/time entry: CreateReminderSheet, EditReminderSheet, and SnoozeSheet.
- **Fact:** The home screen code (home-page.tsx:465) already filters snoozed reminders from the surfaced list, but the household reports they still appear.
- **Assumption:** `<input type="datetime-local">` will provide an acceptable native picker experience on iOS via Capacitor WebView. If this assumption proves wrong, a custom picker component would be needed — route to Designer for visual spec.
- **Decision:** Use native HTML5 datetime-local as the picker foundation rather than building a custom calendar component. Rationale: lower implementation cost, better platform integration on iOS, no design system calendar to maintain. Can be revisited if the native picker proves inadequate.

## Deferred Decisions
- Whether a fully custom calendar picker is needed (deferred until native picker is validated on iOS).
- Whether the picker should support date-only selection without time (not needed for current reminder or snooze flows).
- Whether quick-select chips should be expanded (e.g., "Next Monday", "This weekend") — this is a future UX polish item, not part of this depth spec.
