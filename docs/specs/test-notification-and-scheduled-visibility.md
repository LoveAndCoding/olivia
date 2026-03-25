# Feature Spec: Test Notification Button & Scheduled Notification Visibility

## Status
- Draft

## Summary

Diagnostic tooling for the push notification pipeline. Two additions: (1) a "Send Test Notification" button in app settings so the household can verify their push pipeline works end-to-end on their actual device, and (2) a "Scheduled Notifications" section showing when upcoming notifications are expected to fire. These features help the household verify and trust the push pipeline — critical because M33 feedback reveals push notifications are not reaching the user despite passing automated tests.

## User Problem

The household has no way to verify whether push notifications work on their device. The push pipeline involves multiple layers (browser/OS permission, service worker registration, VAPID key configuration, server-side scheduler, APNs/web-push delivery) and any layer can silently fail. When a reminder notification doesn't arrive, the household member can't tell if push is broken, misconfigured, or simply hasn't fired yet. This erodes trust in the entire notification system.

Similarly, there is no visibility into _when_ the next notification is expected. The household can't tell if a notification is late, hasn't been scheduled, or simply isn't due yet. Without this diagnostic visibility, every missed notification feels like a bug.

## Target Users

- Primary user: any authenticated household member — verifies push works on their device
- Secondary user: board/operators — uses diagnostic visibility to debug notification pipeline issues

## Desired Outcome

A household member can tap "Send Test Notification" and receive a notification on their device within seconds. If it doesn't arrive, they know push is broken and can take action (check permissions, reinstall, report the issue). The scheduled notifications section shows upcoming notification events, giving the household confidence that the system is working even when no notifications have fired recently.

## In Scope

1. **"Send Test Notification" button** in the settings/notifications section
   - Visible only when push permission is granted and at least one push subscription exists for the current user
   - Tapping sends a test push notification to the current user's registered device(s) immediately
   - The notification content is clearly marked as a test: title "Test Notification" with body "Push notifications are working for [user name]."
   - Server-side: new `POST /api/push-subscriptions/test` endpoint that sends a test push to the requesting user's subscription(s)
   - The test notification bypasses the nudge scheduler and dedup logic — it is a direct push, not a nudge
   - Success/failure feedback in the UI: "Test notification sent!" or "Failed to send — check your notification settings"

2. **Scheduled notifications visibility** in the settings/notifications section
   - A read-only section showing upcoming notification events the scheduler will evaluate
   - Shows: entity name, entity type (reminder/routine/planning ritual), expected evaluation window (based on scheduler interval), and current status (pending, held by completion window, recently sent)
   - Data source: a new `GET /api/push-notifications/upcoming` endpoint that returns the current nudge list with push scheduling metadata
   - Limited to the current user's perspective: shows items that would generate push notifications to their subscriptions
   - Empty state: "No upcoming notifications" when nothing is scheduled

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- Push notification history/audit log (which notifications were sent, when, delivery status) — future diagnostic tool
- Per-notification delivery status tracking (delivered vs. failed) — requires push receipt infrastructure
- Editing notification schedules from this view — this is read-only diagnostic visibility
- Notification preferences beyond what already exists in settings (the existing toggles for due reminders and daily summary remain unchanged)

**Known gaps acceptable for this phase:**
- "Upcoming" is an approximation based on current nudge evaluation logic; exact delivery times depend on scheduler interval and completion window holds
- No real-time updates — the scheduled list is a snapshot when the page loads; user can pull-to-refresh

**Future direction:**
- Push notification delivery history with timestamps and status
- Delivery failure diagnostics (subscription expired, permission revoked, VAPID mismatch)
- Push notification preferences per entity type

## Workflow

### Test Notification Flow

1. Household member navigates to Settings → Notifications
2. If push is enabled and subscriptions exist, the "Send Test Notification" button is visible
3. Member taps the button
4. The PWA calls `POST /api/push-subscriptions/test` with the current user's auth token
5. The server looks up the user's push subscription(s) and sends a test push to each
6. The server returns success/failure status
7. The PWA shows inline feedback: "Test notification sent!" or an error message
8. The member receives a native notification on their device: "Test Notification — Push notifications are working for [name]."
9. Tapping the test notification opens Olivia to the home screen (consistent with existing notification behavior)

### Scheduled Notifications View

1. Household member navigates to Settings → Notifications
2. Below the existing toggles, a "Scheduled Notifications" section loads
3. The PWA calls `GET /api/push-notifications/upcoming` to fetch the current scheduled notification state
4. The section displays a list of upcoming notification events, each showing:
   - Entity name (e.g., "Morning routine", "Dentist appointment")
   - Entity type icon/label (routine, reminder, planning ritual)
   - Scheduling status: "Next evaluation in ~X min" or "Held until completion window" or "Recently sent (X min ago)"
5. If no items are scheduled, show: "No upcoming notifications. Notifications fire when routines are overdue or reminders are due."
6. The list is read-only. Tapping an item could navigate to the entity (stretch goal, not required).

## Behavior

**Test notification:**
- The test endpoint sends a push immediately, bypassing the scheduler interval and dedup logic
- Test notifications use a distinct `entityType: 'test'` in the push payload so the service worker can format them appropriately
- Test notifications are NOT logged to `push_notification_log` (they are not nudges)
- Rate limiting: the server should allow at most 1 test notification per user per minute to prevent abuse
- If the user has no active push subscription, the endpoint returns 400 with a message explaining push must be enabled first

**Scheduled notifications:**
- The endpoint computes the same nudge list as the scheduler (`evaluateNudgePushRule` logic) but returns it as data rather than sending pushes
- Each item includes: `entityType`, `entityId`, `entityName`, `triggerReason`, `status` (pending | held | recently_sent), `lastSentAt` (if recently sent), `completionWindowStart`/`completionWindowEnd` (if held)
- "Recently sent" means pushed within the last dedup window (2 hours)
- "Held" means the item is overdue but the completion window timing is holding delivery
- "Pending" means the item will be evaluated on the next scheduler cycle

**What Olivia must never do:**
- Send a test notification to users other than the requesting authenticated user
- Allow test notifications without rate limiting
- Include test notifications in the dedup log or nudge analytics
- Show another user's scheduled notifications

## Data And Memory

**No new tables.** This feature uses existing infrastructure:
- `push_subscriptions` — to look up the current user's subscriptions for test delivery
- `push_notification_log` — to determine "recently sent" status for scheduled visibility
- Nudge evaluation logic — to compute the upcoming notification list

**New API endpoints:**
- `POST /api/push-subscriptions/test` — sends a test push to the authenticated user's subscription(s). Returns `{ success: boolean, deviceCount: number, error?: string }`.
- `GET /api/push-notifications/upcoming` — returns the current user's upcoming notification schedule. Returns `{ items: UpcomingNotification[] }`.

## Permissions And Trust Model

- **Advisory-only compliant:** both features are read-only diagnostic tools. The test notification is a user-initiated action that sends information to the user's own device — no household records are modified.
- **User-initiated:** tapping "Send Test Notification" executes immediately (non-destructive).
- **Auth required:** both endpoints require authentication. The test endpoint sends only to the authenticated user's subscriptions. The upcoming endpoint returns only items relevant to the authenticated user.
- **No agentic behavior:** Olivia does not decide when to send test notifications or alter scheduled notification visibility based on AI.

## AI Role

- No AI involvement. Both features are deterministic diagnostic tools.

## Risks And Failure Modes

- **Test notification succeeds but device doesn't show it:** could indicate OS-level notification settings (Do Not Disturb, focus mode, notification grouping). The test confirms server-side delivery works; device-side delivery issues are outside app control. Consider adding a note: "If you don't see the notification, check your device's notification settings."
- **Scheduled notification list is empty when user expects notifications:** could mean no items are currently overdue/due, or push subscriptions are missing. The empty state message should guide the user.
- **Stale scheduled notification data:** the list is a snapshot. If the user resolves an item and refreshes, the list should update. No real-time push of schedule changes.
- **Rate limit hit on test:** user taps repeatedly. Show "Please wait a moment before sending another test" rather than an error.

## UX Notes

- The test notification button should feel like a simple diagnostic tool, not a feature. Small, secondary button styling — not a primary CTA.
- Success feedback should be inline and brief — a green checkmark or "Sent!" that fades after a few seconds.
- The scheduled notifications section should be collapsible or below the fold — it's diagnostic, not something the household needs to see every visit.
- Scheduled items should use the same entity icons and naming as the rest of the app for visual consistency.
- If push is not enabled, neither the test button nor the scheduled section should appear — no point showing diagnostic tools for a pipeline that isn't active.

## Acceptance Criteria

1. A "Send Test Notification" button appears in Settings → Notifications when push is enabled and subscriptions exist for the current user.
2. Tapping the button sends a test push notification to the current user's device(s) within 5 seconds.
3. The test notification displays on the device with title "Test Notification" and body including the user's name.
4. The button shows inline success/failure feedback after sending.
5. The test endpoint returns 400 if no push subscription exists for the requesting user.
6. Rate limiting prevents more than 1 test notification per user per minute.
7. A "Scheduled Notifications" section appears below the notification toggles when push is enabled.
8. The section shows upcoming notification items with entity name, type, and scheduling status.
9. Items recently sent (within dedup window) show "Recently sent" status with timestamp.
10. Items held by completion window show "Held" status with window times.
11. Empty state displays when no notifications are scheduled.
12. The test notification does not appear in `push_notification_log`.
13. The upcoming notifications endpoint returns only items relevant to the authenticated user.
14. Tapping the test notification opens Olivia to the home screen.
15. All component class names have corresponding CSS styles; no unstyled components ship.
16. `npm run typecheck` passes with zero errors.

## Validation And Testing

**Unit tests:**
- `POST /api/push-subscriptions/test`: sends push to authenticated user's subscriptions; returns 400 when no subscription; respects rate limit
- `GET /api/push-notifications/upcoming`: returns correct nudge items with status annotations; respects user scoping; empty list when nothing scheduled

**Integration tests:**
- Full test notification flow: subscription exists → test endpoint called → push sent to mock provider → success response
- Upcoming endpoint reflects current nudge state: create overdue routine → call upcoming → item appears as pending
- Rate limiting: two test calls within 60 seconds → second returns 429

**Manual validation:**
- On household device: tap "Send Test Notification" → receive native notification within seconds
- Verify scheduled notifications section shows current overdue/due items
- Resolve an item, refresh → item disappears from scheduled list

## Dependencies And Related Learnings

- `docs/specs/push-notifications.md` — Phase 2 push spec. This feature extends the push pipeline with diagnostic tooling.
- M34 milestone definition — explicitly calls for "Send Test Notification" button and scheduled notification visibility.
- M33 board feedback — push notifications not reaching user despite tests passing. This is the diagnostic response to that feedback.
- D-045: Push notifications approved for Phase 2.
- D-002: Advisory-only trust model — test notification and scheduled visibility are both read-only/diagnostic.
- L-035: Reliability is not a one-sprint fix. Diagnostic tooling helps the household self-diagnose, reducing the feedback loop on reliability issues.

## Open Questions

1. **Scheduled notification detail level:** Should the scheduled section show the exact next scheduler evaluation time, or just "within ~30 minutes"? The scheduler interval is configurable. **Recommendation:** show approximate time ("Next check in ~X min") based on last scheduler run timestamp.

2. **Test notification on Capacitor/APNs:** The test should work on both web push (VAPID) and native iOS (APNs via Capacitor). Does the existing push infrastructure handle both paths? **Tech Lead to confirm.**

3. **Scheduled notifications for daily summary:** Should the daily summary notification appear in the scheduled list? **Recommendation:** yes, show it as a scheduled item with its expected delivery time.

## Facts, Assumptions, And Decisions

**Facts:**
- Push subscriptions table already supports per-user targeting via nullable `userId` column
- The nudge evaluation logic is already encapsulated in `evaluateNudgePushRule()` in jobs.ts
- Push delivery supports both web-push (VAPID) and APNs (Capacitor) paths
- The existing settings page already has notification toggles and permission state display

**Assumptions:**
- The household will use the test button primarily during initial setup and when debugging missed notifications
- Showing scheduled notifications reduces support burden by making the system's behavior transparent
- Rate limiting at 1/minute is sufficient to prevent abuse without frustrating legitimate debugging

**Decisions:**
- Test notifications bypass the scheduler and dedup — they are immediate, direct pushes
- Test notifications use `entityType: 'test'` to distinguish from real nudges
- Scheduled notifications section is read-only — no editing or snoozing from this view
- Both features hidden when push is not enabled (no diagnostic noise for non-push users)

## Deferred Decisions

- Push notification delivery history/audit log — future diagnostic tool
- Per-notification delivery receipt tracking — requires infrastructure not yet in place
- Editable notification schedules — out of scope for diagnostic tooling
