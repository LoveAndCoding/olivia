# Feature Spec: Completion-Window-Based Push Timing

## Status
- Approved (CEO, 2026-03-16)

## Summary

Completion-window-based push timing is the first AI-enhanced nudge timing capability (H5 Phase 2 Layer 1). When the push notification scheduler detects an overdue routine, it checks whether that routine has a historical completion window — a time-of-day range derived from past `completedAt` timestamps. If a reliable window exists and the current time is before the window, the scheduler holds the push notification until the window opens rather than delivering immediately. This reduces irrelevant push delivery (e.g., pushing an "evening routine overdue" at 8am) and aligns Olivia's outreach with the household's natural rhythms. The feature is data-driven heuristic timing with no LLM calls — Layer 2 (context-aware LLM timing) is deferred to Phase 3+.

## User Problem

The push notification scheduler runs every 30 minutes. When it detects an overdue routine, it pushes immediately (subject to the 2-hour dedup window). This means a routine that becomes overdue at midnight — like "evening cleanup" with a `currentDueDate` of yesterday — triggers a push at whatever scheduler cycle runs next, potentially 6am or 2am. The household member receives a push notification for a routine they typically complete at 9pm. This is technically correct (the routine is overdue) but contextually wrong (the timing is unhelpful). The same problem applies to approaching reminder nudges: a reminder due at 6pm triggers a 24-hour-threshold push at 6pm the previous day, when the household may not be thinking about tomorrow's tasks yet.

The current approach treats all nudge delivery as equally urgent regardless of the household's actual patterns. This creates push fatigue for items that are overdue but not yet at the time when the household would naturally address them.

## Target Users

- Primary user: stakeholder (household primary operator) — receives push notifications with timing optimized based on their completion patterns
- Secondary user: spouse — receives the same household pushes on their device; completion windows are household-level (not per-member) in this phase
- Not applicable: server operators — no new operational configuration beyond the existing push infrastructure

## Desired Outcome

Push notifications for routines arrive at times the household is likely to act on them. An "evening routine overdue" push arrives in the early evening, not at dawn. A "morning routine overdue" push arrives in the morning, not at midnight. Nudges that arrive at contextually appropriate times should have higher action rates and lower dismiss rates compared to immediate-delivery nudges. The household should experience push notifications as well-timed reminders rather than arbitrary interruptions.

## In Scope

- **Per-routine completion window computation**: for each routine, derive a preferred completion window from the last N completion timestamps (`routine_occurrences.completedAt`). The window is defined as the hour-of-day range that captures the central tendency of past completions.
- **Minimum completion threshold**: a routine must have at least 4 completed occurrences with non-null `completedAt` timestamps before a completion window is considered reliable. Below this threshold, the routine uses the existing immediate-delivery behavior.
- **Hold-then-deliver logic in the push scheduler**: when `evaluateNudgePushRule` encounters a routine nudge with a reliable completion window and the current time is before the window start, the scheduler skips the push for this cycle. The nudge is not suppressed — it will be evaluated again on the next scheduler cycle and delivered once the current time falls within or after the window.
- **Fallback to immediate delivery**: routines without sufficient completion data, reminders, and planning ritual nudges all use the existing immediate-delivery behavior. Completion windows apply only to routine nudges in this phase.
- **Completion window applies to push notifications only**: in-app nudge tray display is unaffected. The nudge tray continues to show all active nudges immediately regardless of completion window. Timing optimization is a push-delivery concern, not an in-app display concern.
- **Completion window computation is on-demand**: windows are computed at scheduler evaluation time from the database, not pre-cached. At household scale, querying the last N completions per routine on each 30-minute scheduler cycle is acceptable.
- **Timezone handling**: completion windows are computed in the household's local timezone (derived from the server's configured timezone or a future household timezone setting). All hour-of-day comparisons use local time.

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- LLM-based timing decisions (Layer 2 — deferred to Phase 3+ per D-047)
- Per-household-member completion windows (Phase 3 — requires per-member tracking infrastructure)
- Completion windows for reminder nudges (Phase 2 — reminders have less structured completion-time data; could be added once routine windows are validated)
- Completion windows for planning ritual nudges (not planned — ritual nudges are rare and high-priority; immediate delivery is appropriate)
- User-configurable quiet hours or preferred notification times (complementary feature, not a dependency — can be developed in parallel)
- Completion window visualization in the PWA (no UI surfaces the computed window — it is a backend delivery optimization only)
- Push notification delivery analytics or timing effectiveness dashboard

**Known gaps acceptable in this phase:**
- Completion windows are household-level, not per-member. If the stakeholder typically completes "morning routine" at 7am and the spouse at 9am, the window represents a blend. This is consistent with the Phase 2 household-wide push posture.
- Routines with highly variable completion times (e.g., completed at 8am one week and 10pm the next) may produce a wide or unreliable window. The algorithm should detect high variance and fall back to immediate delivery rather than producing a misleading window.
- The scheduler cannot distinguish between "the window hasn't opened yet today" and "the household skipped the window and the push should go out now." After the window closes for the day, the scheduler delivers the push on the next cycle. This is acceptable — one delayed push per day is better than a poorly-timed early push.

**Likely future direction:**
- Layer 2: LLM-based cross-workflow context reasoning for timing decisions (e.g., "dinner is late tonight per meal plan, hold evening routine nudge")
- Completion windows extended to approaching-reminder nudges
- Per-household-member windows once per-member push targeting (Phase 3) is built
- Timing effectiveness metrics (action rate within window vs. outside window) to validate and tune the algorithm

## Workflow

### Push Scheduler Timing Flow (extends `evaluateNudgePushRule`)

1. The scheduler runs on its 30-minute interval and computes the active nudge list (existing behavior).
2. For each active nudge, the scheduler checks the dedup window (existing behavior).
3. **New step**: for each routine nudge that passes dedup, the scheduler calls the completion window evaluation function:
   a. Query the last N (recommended: 8) `completedAt` timestamps for this routine from `routine_occurrences`.
   b. If fewer than 4 non-null timestamps exist, return `no_window` — use immediate delivery.
   c. Convert timestamps to hour-of-day in the household's local timezone.
   d. Compute the completion window: the interquartile range (25th to 75th percentile) of completion hours, expanded by a configurable buffer (recommended: 1 hour before the 25th percentile).
   e. If the interquartile range spans more than 6 hours, the routine's completion time is too variable — return `no_window`.
   f. Compare the current local time to the window. If before the window start, return `hold`. If within or after the window, return `deliver`.
4. If the evaluation returns `hold`, the scheduler skips the push for this nudge on this cycle. No dedup log entry is created. The nudge will be re-evaluated on the next cycle.
5. If the evaluation returns `deliver` or `no_window`, the scheduler proceeds with normal push delivery (existing behavior).

### No User-Facing Workflow Changes

- The household member does not configure, view, or interact with completion windows.
- Push notification content and tap behavior are unchanged.
- In-app nudge tray behavior is unchanged.

## Behavior

**Facts the system records:**
- No new persistent state. Completion windows are computed on demand from existing `routine_occurrences.completedAt` data. No new tables, no new columns, no cached window values.

**Suggestions Olivia makes:**
- Not applicable. Completion windows are an internal delivery optimization. Olivia does not tell the household member about timing decisions.

**Actions proposed:**
- Not applicable. No user approval is required. The feature changes when a push is delivered, not whether it is delivered or what it contains. The household member may notice that push notifications arrive at more contextually relevant times, but there is no explicit action or choice involved.

**Detailed behavior rules:**

- **Window computation algorithm**: the completion window is the interquartile range (IQR) of the last N completion hours (local timezone), expanded by a 1-hour lead buffer. Example: if the last 8 completions of "Evening cleanup" were at [19:00, 19:30, 20:00, 20:15, 20:30, 21:00, 21:00, 22:00], the IQR is approximately [19:30, 21:00]. With a 1-hour lead buffer, the window opens at 18:30. The scheduler holds push delivery until 18:30 local time.
- **Variance guard**: if the IQR spans more than 6 hours, the routine has no meaningful pattern. Return `no_window` and use immediate delivery. The 6-hour threshold is a Founding Engineer decision and should be a configurable constant.
- **After-window delivery**: if the current local time is after the window end (past the 75th percentile hour), the scheduler delivers immediately. The hold logic only applies before the window opens. Once the window has passed, the overdue nudge should go out — the household may have simply forgotten.
- **Day boundary**: the completion window is evaluated against the current local time on each scheduler cycle. There is no "window already passed today" tracking across cycles — each cycle is stateless. If the window opened at 18:30 and the scheduler runs at 19:00, the current time is within the window and the push delivers normally.
- **Multiple overdue routines**: each routine's completion window is evaluated independently. Different routines may have different windows. A household might receive a "morning routine overdue" push at 7:30am and an "evening cleanup overdue" push at 18:30 — both correctly timed.
- **New routine (< 4 completions)**: immediate delivery. No timing optimization until sufficient data exists.
- **Skipped occurrences**: `skippedAt` timestamps are excluded from window computation. Only `completedAt` timestamps contribute to the window. Skipping a routine does not indicate a preferred time.

## Data And Memory

**No new tables or columns.** The feature reads existing data:
- `routine_occurrences.completedAt` — the primary input for window computation
- `routines.id` — to group occurrences by routine

**Computed on demand:** completion windows are not cached or stored. Each scheduler cycle queries the last N `completedAt` values per routine and computes the window. At household scale (typically < 20 routines, < 100 recent occurrences), this query is trivially fast.

**No sensitive data concerns:** completion timestamps are already stored in the database for activity history. The window computation does not create new data or expose existing data through new surfaces.

**Transient state:** the `hold` vs. `deliver` decision is made per-scheduler-cycle and not persisted. No dedup log entry is created for held nudges — only for delivered pushes (existing behavior).

## Permissions And Trust Model

This feature remains fully advisory-only. It does not modify any household record, propose any action, or require any user approval.

- **What changes:** the timing of push notification delivery for routine nudges. A push that would have arrived at 6am may instead arrive at 18:30.
- **What does not change:** whether a nudge exists (trigger conditions are deterministic and unchanged), what the push contains (title, body, entity reference), the in-app nudge tray display, any household record state, the trust model.
- **No agentic action:** the feature is purely a delivery optimization internal to the push scheduler. It is not an action Olivia proposes — it is how Olivia times its outreach.
- **What Olivia must never do in this workflow:**
  - Suppress a nudge permanently based on timing. Held nudges must deliver once the window passes or on the next cycle after the window.
  - Use completion window logic to filter which nudges exist. Trigger conditions are unchanged.
  - Delay nudges beyond one day. If a routine is overdue and the window has passed for today, deliver immediately.
  - Modify any routine occurrence, reminder, or other entity state based on timing decisions.

## AI Role

- **No AI (LLM) involvement in this feature.** Completion windows are computed from statistical analysis of timestamps. No external AI provider calls are made.
- **What must work without AI:** everything. This feature has zero AI dependency. It is Layer 1 (heuristic timing), explicitly separated from Layer 2 (LLM context-aware timing) per D-047.
- **Future AI extension (Layer 2, Phase 3+):** the Claude API could be used to incorporate cross-workflow context into timing decisions (e.g., "household has a late dinner tonight per meal plan, hold evening routine nudge by 1 hour"). This would be behind the D-008 adapter boundary and additive to the heuristic layer.

## Risks And Failure Modes

1. **Over-delayed push for genuinely urgent overdue items.** If a routine has been overdue for 3 days and the completion window hasn't opened yet today, the household doesn't get a push until the window opens. Mitigation: the hold logic should have a maximum hold duration — if a routine has been overdue for more than N days (Founding Engineer decision, recommendation: 2 days), bypass the completion window and deliver immediately. This prevents the timing optimization from inadvertently hiding long-neglected items.

2. **Misleading window from irregular schedules.** A routine completed at 8am on weekdays and 11am on weekends produces a wide IQR. The variance guard (> 6 hour IQR = no_window) should catch extreme cases, but moderate variance (e.g., 3-hour IQR) still produces a window that may not match any particular day. Mitigation: the 1-hour lead buffer provides tolerance. Accept that moderate variance means the window is a rough approximation — still better than immediate delivery at arbitrary times.

3. **Timezone misconfiguration.** If the server timezone does not match the household's actual timezone, all completion hour computations are wrong. A routine completed at 9pm local time might appear as 2am UTC, producing a nonsensical window. Mitigation: the spec requires local timezone conversion. The Founding Engineer should document how the timezone is determined (server-local, environment variable, or future household setting). Open Question 1.

4. **Cold start for new routines.** A newly created routine has zero completions and receives immediate-delivery pushes, which is the correct fallback. But a routine migrated from an external system (future consideration) might have no completion history despite being well-established. Mitigation: not applicable in current phase — no migration path exists. Accept immediate delivery for any routine with < 4 completions.

5. **Scheduler performance with many routines.** Each routine nudge now requires a query for the last N completions. At household scale this is trivial, but if the query is not indexed, it could become slow. Mitigation: `routine_occurrences` already has indexes on `routineId` and `completedAt` for activity history queries. The Founding Engineer should verify query performance and add a composite index if needed.

## UX Notes

- **Invisible to the household.** This feature has no user-facing UI, settings, or controls. The household member should simply notice over time that push notifications arrive at more relevant times. There is nothing to configure, toggle, or understand.
- **Should not feel like suppression.** If a household member expects a push for an overdue routine and it arrives 2 hours later than it would have without this feature, they should not feel that Olivia "missed" the item. The push still arrives — just at a better time. If household feedback suggests the delay feels like forgetting, the maximum hold duration (Risk 1) should be shortened.
- **Anti-patterns to avoid:**
  - Surfacing timing logic to the user ("Your evening routine push was held until 6:30pm based on your usual completion time"). This creates unnecessary cognitive load and makes an internal optimization feel like a feature the user must manage.
  - Allowing the user to manually set completion windows. User-configurable notification times are a separate feature (quiet hours / preferred times). Completion windows are learned, not configured.
  - Treating held nudges as "dismissed" or "snoozed." A held nudge is not a user action — it is Olivia's internal timing decision. The dedup log should not record held nudges.

## Acceptance Criteria

1. When the push scheduler evaluates a routine nudge with at least 4 completed occurrences and the current local time is before the computed completion window start, the push is not delivered on that cycle.
2. When the push scheduler evaluates the same routine nudge on a subsequent cycle where the current local time is within or after the completion window, the push is delivered normally.
3. Routine nudges with fewer than 4 completed occurrences are delivered immediately (existing behavior, no timing hold).
4. Reminder nudges are delivered immediately regardless of any routine completion window data (timing optimization applies only to routine nudges in this phase).
5. Planning ritual nudges are delivered immediately regardless of completion window data.
6. The completion window is computed from `completedAt` timestamps only; `skippedAt` timestamps are excluded.
7. If the interquartile range of completion hours spans more than the configured variance threshold (recommendation: 6 hours), the routine falls back to immediate delivery.
8. The completion window includes a configurable lead buffer (recommendation: 1 hour before the 25th percentile) to account for natural variation.
9. If a routine has been overdue for more than the configured maximum hold duration (recommendation: 2 days), the completion window is bypassed and the push delivers immediately.
10. No dedup log entry is created for held nudges — only for actually delivered pushes.
11. In-app nudge tray display is completely unaffected by completion window logic; all active nudges continue to appear immediately in the tray.
12. No new database tables or columns are introduced.
13. All existing push notification tests pass (regression — completion window logic does not break existing push delivery).
14. The completion window algorithm produces correct results for the documented example: completions at [19:00, 19:30, 20:00, 20:15, 20:30, 21:00, 21:00, 22:00] yield a window opening at approximately 18:30.

## Validation And Testing

**Unit tests:**
- Window computation: given 8 completion timestamps, compute the correct IQR and lead-buffered window start.
- Window computation: given 3 completions (below threshold), return `no_window`.
- Window computation: given completions spanning 7+ hours (above variance threshold), return `no_window`.
- Window computation: given completions with null `completedAt` (skipped occurrences), exclude them from the calculation.
- Hold decision: current time before window start → `hold`.
- Hold decision: current time within window → `deliver`.
- Hold decision: current time after window end → `deliver`.
- Hold decision: routine overdue > 2 days → `deliver` regardless of window.

**Integration tests:**
- Full scheduler cycle: routine with reliable window, current time before window → push not sent, no dedup log entry.
- Full scheduler cycle: same routine, current time within window → push sent, dedup log entry created.
- Regression: routine with < 4 completions → push sent immediately (existing behavior preserved).
- Regression: reminder nudge → push sent immediately (no window evaluation).
- Regression: all existing push notification and nudge API tests pass.

**Household validation (manual observation):**
- After deployment, observe whether routine push notifications arrive at times that feel contextually appropriate — e.g., morning routine pushes in the morning, evening routine pushes in the evening.
- If push action rates improve (or dismiss rates decrease) after enabling completion windows, the timing optimization is adding value. Note: formal metrics are not in scope for this phase; observation is qualitative.

## Dependencies And Related Learnings

- **L-027**: Push notification scheduler architecture is the natural extension point for AI-enhanced nudge timing — timing logic fits inside the existing `evaluateNudgePushRule` evaluation loop.
- **L-026**: Push notifications confirm the injectManifest + in-process scheduler pattern — minimal infrastructure for household-scale delivery.
- **L-024**: Proactive nudges confirm purely-computed API pattern — no new tables, client-only dismiss state.
- **D-047**: M25 scoping — AI-enhanced nudge timing defined as two-layer approach; completion-window-based push timing is the first spec target.
- **D-046**: M24 complete — push notifications fully built; `evaluateNudgePushRule` scheduler in place.
- **D-042**: H5 Phase 2 priorities — AI-enhanced nudge timing is the third target after real AI wiring and push notifications.
- **D-002**: Advisory-only trust model — completion window timing is strictly a delivery optimization; no record modifications.
- **A-002**: Advisory-only behavior is the right trust model for early phases — completion windows are consistent with this; they change delivery timing, not Olivia's agency.
- Depends on: `docs/specs/push-notifications.md` — the scheduler, dedup, and push delivery infrastructure this feature extends.
- Depends on: `docs/specs/proactive-household-nudges.md` — the nudge trigger logic and entity types.

## Open Questions

1. **Timezone source:** How does the scheduler determine the household's local timezone for hour-of-day comparisons? Options: (a) server process timezone (`TZ` environment variable), (b) a new `OLIVIA_HOUSEHOLD_TIMEZONE` environment variable, (c) derive from the most recent client request's timezone header. **Recommendation: (b) — explicit environment variable, defaulting to server timezone if unset.** Founding Engineer decision.

2. **Maximum hold duration:** How many days overdue should a routine be before the completion window is bypassed? **Recommendation: 2 days.** If a routine has been overdue for more than 2 complete days, the timing optimization is counterproductive — the household needs a push regardless of time-of-day. Founding Engineer decision; configurable constant.

3. **Sample size (N):** How many recent completions should be used to compute the window? **Recommendation: 8 (the last 8 non-null completedAt timestamps).** Too few (e.g., 4) gives an unreliable window; too many (e.g., 20) may include stale patterns from months ago. Founding Engineer decision; configurable constant.

4. **Lead buffer duration:** How far before the 25th percentile should the window open? **Recommendation: 1 hour.** This accounts for natural daily variation without opening the window so early that the optimization loses value. Founding Engineer decision; configurable constant.

5. **Variance threshold:** What IQR span (in hours) is too wide to be useful? **Recommendation: 6 hours.** A routine completed anywhere in a 6-hour range has no meaningful pattern. Founding Engineer decision; configurable constant.

## Facts, Assumptions, And Decisions

**Facts:**
- `routine_occurrences.completedAt` exists and is populated for every completed routine occurrence. Confirmed in L-018 and the activity history implementation.
- The push notification scheduler (`evaluateNudgePushRule`) runs every 30 minutes with a 2-hour dedup window. Confirmed in D-046 and M24 implementation.
- The scheduler already queries routine occurrence state to compute the nudge list. Adding a window query per routine is a bounded addition to the existing query pattern.
- At household scale, the number of routines is typically < 20, and the number of recent occurrences per routine is < 50. Window computation is trivially fast.

**Assumptions:**
- Household routine completion times are stable enough week-to-week that historical timestamps predict future preferred times. Confidence: medium. Validation: observe whether window-timed pushes have higher action rates.
- A minimum of 4 completions provides a reliable enough signal for window computation. Confidence: medium. Validation: if windows produce surprising delivery times, increase the threshold.
- The interquartile range is the appropriate statistical measure for deriving a completion window from a small sample of timestamps. Confidence: high. The IQR is robust to outliers and well-suited to small datasets.

**Decisions:**
- Completion windows apply to routine nudges only in this phase. Reminders and planning rituals use immediate delivery.
- Windows are computed on demand, not cached. No new storage required.
- The feature is invisible to the household — no UI, no settings, no timing explanation.
- Held nudges do not create dedup log entries. Only delivered pushes are logged.
- The variance guard (IQR > 6h = no_window) prevents misleading windows for irregularly-completed routines.

## Deferred Decisions

- **Completion windows for reminder nudges.** Reminders have `dueDate` but less structured completion-time data. Could be added in a follow-up phase once routine windows are validated. Revisit after observing routine window effectiveness.
- **Per-household-member windows.** Requires per-member push targeting (Phase 3 infrastructure). Revisit when `push_subscriptions.userId` is wired for per-member delivery.
- **Weekday vs. weekend window differentiation.** Some routines may have different completion patterns on weekdays vs. weekends. The current algorithm uses all completions regardless of day-of-week. Revisit if household feedback suggests the window is consistently wrong on weekends.
- **Cached/materialized windows.** If the on-demand computation becomes a performance concern (unlikely at household scale), a periodic cache could be introduced. Revisit only if profiling shows query latency issues.
- **Layer 2 (LLM context-aware timing).** Deferred to Phase 3+ per D-047. Requires validated Layer 1 patterns, richer household interaction data, and clear cost/benefit over heuristics.
