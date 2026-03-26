# Feature Spec: Automation Foundation (Track D)

## Status
- Approved (CEO, 2026-03-25)

## Summary

The Automation Foundation introduces two capabilities that reduce the number of taps required to act on time-sensitive household items: **push notification action buttons** and **lightweight automation rules**. Push action buttons let household members mark a routine done or snooze a reminder directly from the OS notification drawer — no app launch required. Automation rules let the household define simple if-then behaviors ("if a routine is overdue for 3+ days, auto-advance to the next occurrence") that Olivia executes on their behalf. Together, these capabilities move Olivia from advisory-only into the first layer of trusted execution — bounded, auditable, and user-defined.

## User Problem

**Push action friction:** Today, every push notification requires the household member to tap the notification, wait for the app to load, find the relevant item, and tap the action button. For a routine that's simply overdue and needs to be marked done, this is 4+ taps and a context switch when a single tap from the notification drawer would suffice. The household has expressed that "trust and automation is maybe a better immediate fix" (M29 feedback) — the friction of acting on known items is higher than it needs to be.

**Repetitive manual actions:** Some household items follow predictable patterns that don't need human judgment each time. A routine missed by 3+ days almost always gets skipped to the next occurrence. A reminder snoozed 3 times probably needs to be resolved or dropped. Today, these patterns require the household member to manually perform the same action every time. Lightweight automation rules let the household codify these patterns so Olivia handles them — with full visibility and easy override.

## Target Users

- Primary user: stakeholder (household primary operator) — creates automation rules, receives actionable push notifications
- Secondary user: spouse — receives the same push action buttons; can create their own automation rules
- Future users: not relevant for this phase

## Desired Outcome

- Household members can resolve routine nudges and snooze reminders directly from the OS notification drawer in a single tap.
- The household can define simple automation rules that eliminate repetitive manual actions.
- Olivia's first trusted-execution behaviors are transparent, auditable, and easily reversible.
- The household feels less friction in daily use without feeling a loss of control.

## In Scope

### Push Notification Action Buttons

- **Routine nudge actions:** "Mark done" and "Skip" buttons rendered in the OS notification UI for overdue routine nudges.
- **Reminder nudge actions:** "Done" and "Snooze" buttons rendered in the OS notification UI for approaching/overdue reminder nudges.
- **Planning ritual nudge:** No action buttons — the review flow requires full app context. Notification tap continues to open the app.
- **Service Worker action handling:** The Service Worker receives the action click, sends the appropriate API request (complete occurrence, skip occurrence, resolve reminder, snooze reminder) in the background, and optionally shows a brief confirmation notification.
- **Offline resilience:** If the API call fails (offline, server error), queue the action in the Service Worker's outbox and retry when connectivity returns. Show a "Queued — will sync when online" notification instead of a silent failure.
- **Auth context:** Action requests from the Service Worker must include the user's auth token. The push subscription is already linked to a userId; the Service Worker stores the auth token at subscription time and includes it in action requests.

### Automation Rules

- **Rule model:** A rule consists of:
  - `trigger`: the condition that activates the rule (e.g., "routine overdue for N days", "reminder snoozed N times", "list item unchecked for N days")
  - `action`: the operation Olivia performs (e.g., "skip to next occurrence", "resolve reminder", "archive item")
  - `scope`: what entity or entities the rule applies to (a specific routine, all routines, a specific reminder, all reminders)
  - `enabled`: boolean toggle
  - `userId`: the user who created the rule (rules are per-user but operate on household-shared data)

- **Supported triggers (Phase 1):**
  - `routine_overdue_days`: routine occurrence overdue for ≥ N days (default: 3)
  - `reminder_snooze_count`: reminder snoozed ≥ N times (default: 3)
  - `reminder_overdue_days`: reminder overdue for ≥ N days (default: 7)

- **Supported actions (Phase 1):**
  - `skip_routine_occurrence`: advance the routine to the next occurrence (same as manual "Skip")
  - `resolve_reminder`: mark the reminder as resolved
  - `snooze_reminder`: snooze the reminder by the configured interval

- **Rule creation workflow:**
  1. User navigates to Settings → Automation Rules
  2. User taps "Add rule" and selects a trigger type
  3. User configures the threshold (e.g., "3 days overdue")
  4. User selects the action
  5. User optionally scopes the rule to a specific entity or "all"
  6. Rule is saved and immediately active

- **Rule evaluation:** Rules are evaluated by the existing push scheduler job (30-minute interval). On each cycle, the scheduler:
  1. Computes the current nudge list (existing logic)
  2. For each nudge, checks if any enabled automation rule matches
  3. If a rule matches, executes the action via the standard domain functions
  4. Logs the execution to an `automation_log` table

- **Automation log:** Every rule execution is recorded with: `ruleId`, `entityType`, `entityId`, `action`, `executedAt`, `userId` (the rule creator). This log is visible in Settings → Automation Rules → History. Entries are retained for 30 days, then purged.

- **Rule limits:** Maximum 20 active rules per household. This cap prevents unbounded rule evaluation overhead and encourages intentional automation.

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- **Complex rule conditions** (AND/OR logic, multi-entity triggers). Phase 2.
- **Location-based triggers** (e.g., "when I arrive home"). Requires geofencing infrastructure beyond current scope.
- **AI-suggested rules** (Olivia proposes automation based on observed patterns). Phase 2 — requires pattern detection and trust signal evidence.
- **Cross-workflow rules** (e.g., "when a meal plan is set, add ingredients to grocery list"). The meal planning → grocery list connection already exists; cross-workflow automation rules add complexity beyond Phase 1.
- **Rule templates or presets.** Users define rules from scratch in Phase 1. If common patterns emerge from usage, Phase 2 can offer presets.
- **Notification action buttons for freshness nudges.** Freshness nudge actions require more context than a notification button can provide.

**Known gaps acceptable in Phase 1:**
- Automation rules execute on the server scheduler cycle (up to 30-minute delay from trigger condition being met). This is acceptable — automation rules handle non-urgent, pattern-based items, not time-critical actions.
- Rules operate on household-shared data regardless of which user created them. A stakeholder's "skip overdue routines after 3 days" rule affects routines the spouse might also see. This is consistent with the shared-household model but may need per-user scoping in Phase 2.
- No undo for automated actions beyond the standard entity state changes. A skipped routine occurrence can be manually re-triggered; a resolved reminder can be recreated. The automation log provides visibility.

**Likely future direction:**
- AI-suggested rules based on household behavioral patterns
- Rule templates for common scenarios ("Housekeeping autopilot", "Reminder cleanup")
- Per-user rule scoping (my rules only affect items assigned to me)
- Complex conditions with AND/OR logic
- Automation pause ("vacation mode" — disable all rules temporarily)

## Workflow

### Push Action Button Flow

1. The push scheduler detects an active nudge and sends a push notification (existing flow).
2. The push payload now includes an `actions` array defining available buttons: `[{ action: "mark_done", title: "Mark done" }, { action: "skip", title: "Skip" }]` for routine nudges, or `[{ action: "done", title: "Done" }, { action: "snooze", title: "Snooze" }]` for reminder nudges.
3. The Service Worker's `push` event handler renders the notification with action buttons via the Notification API's `actions` property.
4. When the household member taps an action button, the Service Worker's `notificationclick` event fires with the `action` identifier.
5. The Service Worker maps the action to the appropriate API endpoint:
   - `mark_done` → `POST /api/routines/:id/complete-occurrence`
   - `skip` → `POST /api/routines/:id/skip-occurrence`
   - `done` → `PATCH /api/reminders/:id` (status: resolved)
   - `snooze` → `POST /api/reminders/:id/snooze`
6. The Service Worker sends the request with the stored auth token.
7. On success: the notification is dismissed. Optionally, a brief "Done" confirmation notification appears.
8. On failure: the action is queued in IndexedDB for retry. A "Queued" notification replaces the original.

### Automation Rule Flow

1. User creates a rule via Settings → Automation Rules.
2. The rule is saved to the `automation_rules` table.
3. On the next scheduler cycle (and every 30 minutes thereafter):
   a. The scheduler computes the current nudge list.
   b. For each nudge, the scheduler queries enabled automation rules matching the nudge's entity type and trigger condition.
   c. If a matching rule's threshold is met (e.g., routine overdue ≥ 3 days), the scheduler executes the rule's action using the standard domain function.
   d. The execution is logged to `automation_log`.
4. The nudge is removed from the active list because the underlying entity state has changed.
5. The user can review automation history in Settings → Automation Rules → History.

## Behavior

### Push Action Buttons
- Action buttons appear on routine and reminder nudge notifications only.
- Buttons execute the same domain operations as the in-app nudge action buttons — no separate code path.
- If the entity state has changed since the push was sent (e.g., routine already completed), the action returns a 409 or no-op. The notification is dismissed silently.
- Action buttons are subject to the same auth requirements as in-app actions. The Service Worker must have a valid auth token.

### Automation Rules
- Rules are evaluated after nudge computation, not independently. A rule only fires when its trigger condition is met AND the entity appears in the active nudge list. This ensures automation rules are bounded to the same entity set that would produce nudges.
- A rule fires at most once per entity per evaluation cycle. The automation log dedup prevents re-execution on the next cycle for the same entity (30-day log retention provides the dedup window).
- If a rule execution fails (e.g., domain validation error), the failure is logged but does not block other rule evaluations.
- Disabled rules are never evaluated.

## Data And Memory

### New Tables

**`automation_rules`**
- `id`: UUID primary key
- `householdId`: references the household
- `userId`: the user who created the rule
- `triggerType`: enum (`routine_overdue_days`, `reminder_snooze_count`, `reminder_overdue_days`)
- `triggerThreshold`: integer (e.g., 3 for "3 days overdue")
- `actionType`: enum (`skip_routine_occurrence`, `resolve_reminder`, `snooze_reminder`)
- `scopeType`: enum (`all`, `specific`)
- `scopeEntityId`: nullable UUID (set when `scopeType = specific`)
- `enabled`: boolean, default true
- `createdAt`, `updatedAt`: timestamps

**`automation_log`**
- `id`: UUID primary key
- `ruleId`: references `automation_rules.id`
- `entityType`: string (routine, reminder)
- `entityId`: UUID
- `actionType`: string
- `executedAt`: timestamp
- `userId`: the rule creator
- Purged after 30 days via the existing job scheduler

### Push Payload Changes
- The push notification payload adds an `actions` field: `[{ action: string, title: string }]`
- The push payload adds `entityId` and `entityType` so the Service Worker can route action API calls

### Service Worker Storage
- Auth token stored in IndexedDB at push subscription time
- Failed action queue stored in IndexedDB for retry

## Permissions And Trust Model

**This feature introduces Olivia's first trusted execution — a significant trust model evolution.**

### Push Action Buttons
- Push action buttons are **user-initiated actions** — the user explicitly taps the button. They follow the same trust model as in-app action buttons: non-destructive actions execute immediately, destructive actions (none in Phase 1) would require confirmation.
- No change to the advisory-only trust model. The user is acting; Olivia is presenting the affordance.

### Automation Rules
- Automation rules represent **user-delegated trusted execution**. The user defines the rule; Olivia executes it autonomously when conditions are met.
- This is a bounded expansion of the trust model:
  - The user explicitly creates each rule (opt-in, not default)
  - The user defines the trigger, threshold, and action (no AI inference in rule creation)
  - Every execution is logged and visible (auditability)
  - Rules can be disabled or deleted at any time (reversibility)
  - Only non-destructive actions are supported in Phase 1 (skip, snooze, resolve — all reversible)
  - Rule scope is bounded to the configured entity set
- **Olivia must never create automation rules on its own.** Rules are user-authored only.
- **Olivia must never execute actions beyond what the rule defines.** No "smart" rule expansion.
- **The chat interface must not create or modify automation rules.** Rule management is Settings-only in Phase 1.

## AI Role

- **No AI is used in this feature.** Automation rules are user-defined with deterministic trigger/action pairs. No LLM calls, no AI inference.
- If external AI is unavailable, this feature is entirely unaffected.
- **Future direction:** AI-suggested rules (Phase 2) would use pattern detection to propose rules the user can accept or reject. This follows the same advisory-only pattern as AI-assisted planning ritual summaries.

## Risks And Failure Modes

1. **Push action button platform support:** The Notification API `actions` property is supported on Android Chrome but has limited support on iOS Safari (as of iOS 16+). If the platform doesn't support action buttons, the notification renders without buttons — tapping opens the app normally. Graceful degradation, not a blocker.

2. **Service Worker auth token expiry:** If the stored auth token expires between push subscription and action execution, the action request will fail with 401. The Service Worker should detect this and queue the action for retry after the next app foreground (which refreshes the token).

3. **Automation rule unintended consequences:** A broadly scoped rule ("skip all overdue routines after 1 day") could skip routines the household intended to complete. Mitigations: (a) the automation log provides visibility, (b) minimum threshold recommendations in the UI, (c) the rule creation flow shows a count of entities the rule would currently match.

4. **Race condition between manual action and automation:** If the household member is in the process of completing a routine when the scheduler fires an automation rule for the same routine, the second action should no-op (occurrence already completed). Domain functions already handle this idempotently.

5. **Scheduler load:** Adding rule evaluation to the scheduler loop increases per-cycle computation. At household scale (tens of nudges, ≤20 rules), this is negligible. If rule evaluation ever becomes expensive, it can be separated into its own job.

## UX Notes

- Push action buttons should feel like a natural extension of the in-app nudge actions — same labels, same behavior, just from the notification drawer.
- The automation rules UI should feel like a simple settings page, not a complex rule builder. Think iOS Shortcuts "Automation" tab, not IFTTT.
- The automation log should be quietly available ("History" link in the rules settings) but not prominent — most users will set rules and forget them.
- When a rule fires, no additional notification is generated. The original nudge push is suppressed (the item is resolved before the next push cycle). The user discovers the automation in the log or by noticing the item was handled.
- The rule creation flow should show a preview: "This rule would currently apply to 3 routines" — so the user understands the scope before saving.

## Acceptance Criteria

1. Overdue routine push notifications include "Mark done" and "Skip" action buttons on supported platforms.
2. Approaching/overdue reminder push notifications include "Done" and "Snooze" action buttons on supported platforms.
3. Tapping a push action button executes the corresponding domain operation without opening the app.
4. If the action API call fails, the action is queued and retried on next connectivity.
5. On platforms that don't support notification actions, notifications render normally without buttons — no errors.
6. Users can create automation rules via Settings → Automation Rules.
7. Automation rules support three trigger types: `routine_overdue_days`, `reminder_snooze_count`, `reminder_overdue_days`.
8. Automation rules support three action types: `skip_routine_occurrence`, `resolve_reminder`, `snooze_reminder`.
9. Rules can be scoped to a specific entity or all entities of that type.
10. Rules can be toggled on/off and deleted.
11. Every rule execution is logged to the automation log with rule ID, entity, action, and timestamp.
12. The automation log is accessible in Settings → Automation Rules → History.
13. Automation log entries are purged after 30 days.
14. Maximum 20 active rules per household.
15. The scheduler evaluates automation rules on every 30-minute cycle alongside nudge computation.
16. A rule fires at most once per entity per evaluation cycle (no duplicate executions).
17. All UI components have corresponding CSS styles and render as visually specified.
18. `npm run typecheck` passes with zero errors.

## Validation And Testing

- **Unit tests:** Rule trigger evaluation logic, action execution via domain functions, automation log write/purge, push payload action serialization.
- **Integration tests:** End-to-end rule creation → scheduler evaluation → action execution → log entry. Push action button → Service Worker → API call → entity state change.
- **Service Worker tests:** Action click handling, offline queue, auth token inclusion, retry logic.
- **Manual validation:** Verify push action buttons render on iOS (Capacitor) and respond correctly. Verify automation rules execute as configured. Verify the automation log shows accurate history.
- **Household validation:** After deployment, confirm the household can (a) act on push notifications without opening the app and (b) set up at least one automation rule that reduces daily manual work.

## Dependencies And Related Learnings

- **Push notification infrastructure (M24, D-046):** Action buttons extend the existing push payload and Service Worker handlers.
- **Push scheduler architecture (L-027):** Rule evaluation fits inside the existing 30-minute evaluation loop — no new scheduling infrastructure.
- **Proactive nudges (D-041):** Automation rules operate on the same nudge entity set. Rules fire when nudge conditions are met.
- **Auth-based identity model (M35 prerequisite):** Rules and actions must use userId, not actorRole. The actorRole refactor must complete before this feature is built.
- **Advisory-only trust model (D-002, A-002):** Push action buttons are user-initiated and compliant. Automation rules are a bounded expansion — user-defined, auditable, reversible.
- **L-035 (reliability compounds):** This feature adds new execution paths. Each must be tested end-to-end on the household's actual device, not just in automated tests.

## Open Questions

1. **Push action button support on iOS/Capacitor:** The Web Notification API `actions` property has inconsistent iOS support. Capacitor's push plugin may provide native action buttons instead. Tech Lead should confirm the available API surface before implementation planning. *(Remains open — Tech Lead to confirm during implementation planning.)*

2. ~~**Automation rule notification:** When a rule fires, should the user receive a push notification?~~ **Resolved (CEO, 2026-03-25):** No notification in Phase 1. The automation log is sufficient for auditability. If the household wants more visibility after using automation, revisit in Phase 2.

3. ~~**Spouse rule visibility:** Can the spouse see and edit rules created by the stakeholder?~~ **Resolved (CEO, 2026-03-25):** Yes — rules are household-shared. Both members can view and manage all rules. Consistent with the shared-household model.

## Facts, Assumptions, And Decisions

### Facts
- The push notification scheduler runs every 30 minutes and already evaluates per-nudge send/skip decisions (L-027).
- The Service Worker handles push events and notification click routing (M24).
- The advisory-only trust model has held through H5 Phases 1-3 (D-041, D-052).
- The board requested "trust and automation" as a priority (M29 feedback).
- M35's actorRole refactor is a prerequisite — automation rules need userId-based identity.

### Assumptions
- Push action buttons will meaningfully reduce the friction of acting on nudges (fewer taps, no app launch).
- Household members will create and maintain ≤20 automation rules — the feature serves power users who want to reduce repetitive actions, not a complex automation platform.
- The 30-minute scheduler cycle is acceptable latency for automation rule execution.
- Non-destructive actions only (skip, snooze, resolve) are sufficient for Phase 1 automation.

### Decisions
- Automation rules are user-defined only — Olivia never creates rules autonomously.
- Rules are evaluated alongside nudge computation, not independently — this bounds the automation surface to items that would already produce nudges.
- No AI involvement in rule creation or evaluation in Phase 1.
- No notification on rule execution in Phase 1 — the log provides auditability.
- Chat cannot create or modify automation rules — Settings-only in Phase 1.

## Deferred Decisions
- AI-suggested automation rules (Phase 2).
- Complex rule conditions (AND/OR logic, multi-trigger).
- Location-based triggers.
- Cross-workflow automation rules.
- Per-user rule scoping (my rules only affect my items).
- Automation pause / vacation mode.
- Rule execution notification preference.
