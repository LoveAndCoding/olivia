# Feature Spec: In-App Feedback Mechanism (Track F)

## Status
- Approved (CEO, 2026-03-25)

## Summary

The In-App Feedback Mechanism gives household members a lightweight way to report friction, bugs, and feature requests without leaving Olivia. A "Send Feedback" entry point in Settings opens a simple form that pre-fills device context (screen, app version, user, recent errors) and submits to a server-side feedback store. This closes the feedback gap identified in L-033: the household currently relies on an external coordination tool (Paperclip) to report issues, which suppresses signal because the friction of context-switching is too high.

## User Problem

When something breaks or feels wrong in Olivia, the household member's desire to report it is immediate — but the path to do so requires leaving the app, opening a separate tool, and manually describing the context. Most friction goes unreported. The board explicitly called this out: "we spend significant time in Paperclip rather than the app itself to report friction." A household app that requires an external system for feedback will always undercount problems. The feedback loop is a product feature, not just a process concern (L-033).

## Target Users

- Primary user: stakeholder — the most active user and the person most likely to notice and report issues
- Secondary user: spouse — should have the same feedback affordance
- Future users: not relevant for this phase

## Desired Outcome

- Every friction moment has a 2-tap path to a feedback submission (Settings → Send Feedback → submit).
- Feedback includes enough context for the development team to reproduce issues without a back-and-forth.
- The volume of reported issues increases because the reporting friction approaches zero.
- The household feels heard — submitting feedback should feel like a direct line to the team, not a form into a void.

## In Scope

- **Settings entry point:** A "Send Feedback" row in the Settings screen, accessible in ≤2 taps from any screen.
- **Feedback form:** A simple modal or screen with:
  - Category selector: Bug / Feature Request / General (default: Bug)
  - Free-text description field (required, minimum 10 characters)
  - Optional screenshot attachment (from device gallery or in-app capture)
  - Auto-filled context section (visible to the user, read-only):
    - Current screen / route
    - App version
    - Device info (OS, browser/Capacitor version)
    - User ID (authenticated user)
    - Last 3 client-side errors from the error log (if any)
- **Submission endpoint:** `POST /api/feedback` — accepts the feedback payload and stores it server-side.
- **`feedback` table:** Stores submissions with: `id`, `userId`, `category`, `description`, `contextJson` (device info, route, errors), `screenshotUrl` (nullable), `createdAt`, `status` (new / acknowledged / resolved).
- **Confirmation:** After submission, show a brief "Thanks — your feedback has been received" message. No tracking number or follow-up promise in Phase 1.
- **Feedback visibility for the team:** Feedback entries are queryable via a simple API endpoint (`GET /api/feedback`) for the development team. No admin UI in Phase 1 — the API is sufficient.

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- **Shake-to-report gesture.** Considered but deferred — shake detection is unreliable on iOS with Capacitor, and an always-on gesture listener has battery implications. The Settings entry point is sufficient for Phase 1.
- **In-context feedback (long-press on a specific element).** Phase 2 — requires element-level context capture infrastructure.
- **Feedback thread / follow-up conversation.** Phase 1 is fire-and-forget. The team reads feedback; the user doesn't get a response in-app.
- **Screenshot annotation.** Phase 2.
- **Feedback dashboard in the app.** Phase 2 — the team reads feedback via API; the user doesn't need to see their submission history in Phase 1.
- **Integration with Paperclip or GitHub Issues.** The feedback table is the canonical store. External routing can be added later without changing the user-facing feature.

**Known gaps acceptable in Phase 1:**
- No feedback status visibility for the user. The user submits and gets a "thank you" — they don't know if it was read or acted on. Acceptable because the alternative (a tracking system) adds significant complexity for marginal Phase 1 value.
- Screenshots are stored as base64 blobs in the database in Phase 1. Not ideal for storage, but avoids needing a file upload service. Phase 2 can migrate to object storage if volume warrants.
- The "last 3 errors" context depends on client-side error capture existing. If the error capture pipeline isn't available, this field is empty — not a blocker.

**Likely future direction:**
- Shake-to-report or floating feedback button for faster access
- Feedback status updates visible to the user ("We fixed this in v0.8.0")
- Integration with Paperclip for automatic issue creation from feedback
- Screenshot annotation tools
- Feedback analytics (most-reported screens, category trends)

## Workflow

### Submitting Feedback

1. User navigates to Settings (accessible from any screen via the navigation bar).
2. User taps "Send Feedback."
3. A feedback form appears (modal or full screen — designer decision).
4. The form shows:
   - Category selector (Bug / Feature Request / General) — defaults to "Bug"
   - Description text area — placeholder: "What happened? What did you expect?"
   - Optional "Attach Screenshot" button
   - Auto-filled context section (read-only, collapsible): current screen, app version, device info, user, recent errors
5. User writes a description and optionally attaches a screenshot.
6. User taps "Submit."
7. The app sends `POST /api/feedback` with the payload.
8. On success: the form closes and a brief "Thanks — feedback received" toast appears.
9. On failure: the form stays open with an error message. The user can retry.

### Team Reading Feedback

1. A team member (or agent) calls `GET /api/feedback?status=new` to see unprocessed feedback.
2. Each entry includes the full context payload — enough to understand the issue without asking the user for more detail.
3. The team can update feedback status via `PATCH /api/feedback/:id` (acknowledged / resolved).

## Behavior

- The feedback form pre-fills context automatically. The user should not need to describe their device, app version, or current screen — Olivia captures this.
- The description field is required. A submission with only auto-context and no user description is not useful.
- Screenshot attachment is optional. The form works without it.
- Feedback submissions are linked to the authenticated user. Anonymous feedback is not supported.
- The feedback endpoint does not require special permissions — any authenticated household member can submit.
- Feedback entries are append-only from the user's perspective. Users cannot edit or delete submitted feedback in Phase 1.

## Data And Memory

### New Table

**`feedback`**
- `id`: UUID primary key
- `householdId`: references the household
- `userId`: the submitting user
- `category`: enum (`bug`, `feature_request`, `general`)
- `description`: text (user-written)
- `contextJson`: JSON blob containing:
  - `route`: string (current screen path)
  - `appVersion`: string
  - `deviceInfo`: string (OS, browser version)
  - `recentErrors`: array of up to 3 recent error strings
- `screenshotBase64`: nullable text (base64-encoded image)
- `status`: enum (`new`, `acknowledged`, `resolved`), default `new`
- `createdAt`: timestamp
- `updatedAt`: timestamp

### Data Retention
- Feedback entries are retained indefinitely in Phase 1. Volume is expected to be low (household-scale).
- If volume becomes a concern, a 90-day retention policy can be added later.

### Sensitivity
- Feedback may contain screenshots of household data. The feedback table should be treated with the same privacy posture as other household data — local-first storage, no external transmission without explicit configuration.

## Permissions And Trust Model

- This feature is entirely **user-initiated**. The user decides when to submit feedback and what to include.
- No agentic actions. Olivia does not suggest submitting feedback, auto-generate reports, or analyze feedback content.
- No trust model change. This is a standard user action — submit a form.
- Destructive actions: none. Feedback is append-only from the user's perspective.

## AI Role

- **No AI is used in this feature.** Feedback is human-written and human-read.
- **Future direction:** AI-assisted categorization or duplicate detection could be added in Phase 2, but is not needed at household-scale volume.

## Risks And Failure Modes

1. **Low usage:** If the feedback entry point is buried in Settings, users may not discover it. Mitigation: Settings is a natural destination for "something feels wrong" moments. Phase 2 can add more prominent entry points if usage is low.

2. **Screenshot storage bloat:** Base64 screenshots in the database could grow if users attach large images frequently. Mitigation: cap screenshot size at 1MB before encoding. At household scale, even frequent screenshots are manageable.

3. **Feedback without context:** If the error capture pipeline isn't working, the "recent errors" field will be empty. Mitigation: the user's description and route/device info are the primary context — errors are a bonus.

4. **User expectation of response:** Users may expect feedback to result in visible action. Without a response mechanism, this could feel like shouting into a void. Mitigation: the "Thanks" confirmation sets appropriate expectations. Phase 2 can add status visibility.

## UX Notes

- The feedback form should feel quick and lightweight — not like filling out a support ticket. Minimize required fields (just category + description).
- The auto-filled context should be visible so the user knows what's being sent, but collapsible so it doesn't clutter the form.
- The "Send Feedback" row in Settings should have a distinct icon (speech bubble or flag) to make it scannable.
- The confirmation toast should be warm but brief: "Thanks — your feedback helps us improve Olivia."
- Do not prompt users to submit feedback proactively (no "How's it going?" popups). The entry point should be available but never pushed.

## Acceptance Criteria

1. A "Send Feedback" entry point is visible in the Settings screen.
2. Tapping "Send Feedback" opens a feedback form with category selector, description field, and optional screenshot attachment.
3. The form auto-fills context: current route, app version, device info, user ID, and last 3 client errors.
4. Auto-filled context is visible to the user (read-only, collapsible).
5. The description field is required with a minimum of 10 characters.
6. The category selector offers Bug, Feature Request, and General options with Bug as default.
7. Screenshot attachment accepts images up to 1MB.
8. Submitting the form calls `POST /api/feedback` and stores the entry in the `feedback` table.
9. On successful submission, a confirmation toast appears and the form closes.
10. On submission failure, the form stays open with an error message.
11. `GET /api/feedback` returns feedback entries filterable by status.
12. `PATCH /api/feedback/:id` allows updating feedback status (new → acknowledged → resolved).
13. All UI components have corresponding CSS styles and render as visually specified.
14. `npm run typecheck` passes with zero errors.

## Validation And Testing

- **Unit tests:** Feedback submission endpoint, context assembly, input validation (description length, screenshot size cap), status transitions.
- **Integration tests:** End-to-end feedback submission → storage → retrieval via API.
- **Manual validation:** Submit feedback from both stakeholder and spouse accounts. Verify context auto-fill accuracy. Verify screenshot attachment works on iOS/Capacitor.
- **Household validation:** After deployment, confirm the household submits at least one feedback item through the in-app mechanism (indicating the feature is discoverable and usable).

## Dependencies And Related Learnings

- **L-033:** In-app friction reporting is more valuable than external bug tracking for household products. This spec directly addresses that learning.
- **L-035:** Reliability problems compound across milestones. In-app feedback provides a faster signal loop for reliability issues.
- **M35 identity refactor:** Feedback uses userId (not actorRole). The refactor should complete before or alongside this feature.
- **Error capture pipeline:** The "recent errors" context field depends on client-side error capture existing. If not available, the field is empty — not a blocker.

## Open Questions

1. ~~**Form presentation:** Should the feedback form be a modal overlay or a full-screen route?~~ **Resolved (CEO, 2026-03-25):** Full-screen route (`/settings/feedback`). A dedicated screen communicates intentionality and avoids accidental dismissal. Designer should confirm visual treatment.

2. ~~**Feedback routing to Paperclip:** Should feedback entries automatically create Paperclip issues?~~ **Resolved (CEO, 2026-03-25):** Not in Phase 1. The feedback table is the canonical store. Keep the user-facing feature decoupled from internal coordination tooling.

## Facts, Assumptions, And Decisions

### Facts
- The household currently reports friction through Paperclip, an external coordination tool (L-033).
- Board feedback has repeatedly identified reliability as the top blocker (L-030, L-035).
- The app has a Settings screen accessible from the navigation bar.

### Assumptions
- A Settings-based entry point is discoverable enough for Phase 1 feedback collection.
- Household-scale feedback volume (low single digits per week) does not require a sophisticated storage or routing system.
- User-written descriptions plus auto-captured context will provide enough detail for the team to act on most issues.

### Decisions
- Feedback is fire-and-forget in Phase 1 — no response mechanism, no status visibility for users.
- Screenshots stored as base64 in the database — simple over scalable for Phase 1.
- No AI involvement in feedback capture or categorization.
- No proactive feedback prompts — the entry point is available but never pushed.
- Category defaults to "Bug" because reliability is the most common feedback theme.

## Deferred Decisions
- Shake-to-report or floating feedback button.
- Feedback response / status visibility for users.
- Paperclip or GitHub Issues integration.
- Screenshot annotation.
- AI-assisted categorization or duplicate detection.
- Feedback retention policy (indefinite in Phase 1).
