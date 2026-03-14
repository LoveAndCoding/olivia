# First-Class Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add first-class reminders to Olivia as the first Horizon 3 workflow, extending the existing inbox foundation with standalone and linked reminders, narrow recurrence, calm notification support, and reminder-aware PWA surfaces.

**Architecture:** Implement reminders as a sibling workflow to inbox items inside the existing TypeScript modular monolith. Reuse the current contracts/domain/API/PWA seams, preview-confirm pattern for parsed drafts, immediate execution for non-destructive direct user actions, SQLite canonical persistence, Dexie offline cache/outbox, and rules-based notification jobs.

**Tech Stack:** TypeScript, Zod, date-fns, chrono-node, Fastify, better-sqlite3, Drizzle schema definitions, React, TanStack Router, TanStack Query, Dexie, Web Push.

---

## Summary
This plan turns the approved first-class reminder spec into an execution-ready build sequence without reopening product strategy. The reminder workflow extends Olivia's working inbox implementation rather than replacing it:

- reminders are first-class records that may stand alone or link to an existing inbox item
- the inbox remains the foundation for active work and linked context
- the first slice supports one-time reminders plus `daily`, `weekly`, and `monthly` recurrence only
- recurring reminders reschedule only after completion
- missed recurring occurrences are preserved only in reminder timeline history, not as separate actionable records
- notification controls stay intentionally minimal: overall enable or disable plus per-type controls for `due reminders` and `daily summary`
- spouse access remains read-only
- advisory-only trust rules remain in force

Planning readiness is satisfied:

- `docs/specs/first-class-reminders.md` is approved
- `docs/roadmap/milestones.md` defines M6 as implementation-planning readiness for the first Horizon 3 workflow
- `docs/learnings/decision-history.md` records D-011 through D-015, which settle phase readiness, target sequencing, the reminder model, and first-slice scope boundaries
- `docs/specs/first-class-reminders.md` explicitly states there are no blocking product questions for the first slice

## Source Artifacts
- `docs/specs/first-class-reminders.md`
- `docs/specs/shared-household-inbox.md`
- `docs/roadmap/milestones.md`
- `docs/strategy/system-architecture.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`

Relevant durable guidance carried into this plan:

- `D-002`: advisory-only trust model remains active
- `D-004`: primary-operator model remains active; spouse write parity is deferred
- `D-007`: installable mobile-first PWA remains the canonical near-term surface
- `D-008`: local-first modular monolith with SQLite canonical storage and Dexie client cache/outbox remains the implementation center
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes still require confirmation
- `D-011`: Horizon 2 is complete enough to move into Horizon 3
- `D-012`: first-class reminders are the first Horizon 3 implementation target
- `D-013`: the MVP reminder simplification is intentionally reopened in Horizon 3
- `D-014`: reminders use a hybrid standalone-or-linked model
- `D-015`: the first implementation slice stays narrow around conversion deferral, minimal notification settings, and timeline-only missed recurring history
- `A-005`: Web Push may be sufficient for the first reminder notification posture, but real use must validate it
- `A-008`: recurrence may later become shared infrastructure, but this plan should introduce only the minimum reusable seam needed now
- `A-010`: lightweight standalone reminders may reduce pressure to misuse the inbox

## Assumptions And Non-Goals
### Assumptions
- The current inbox-centric codebase is the base to extend, not replace.
- Reminder and inbox writes can continue to use versioned command semantics without stronger conflict machinery.
- Reminder parsing and summary phrasing must degrade cleanly when AI is disabled.
- The first reminder timeline can live beside the existing inbox history model without needing full event-sourcing infrastructure.
- Reminder notifications should reuse the current Web Push plumbing and polling-job shape rather than introducing a precise scheduler service.

### Non-Goals
- Reminder-to-inbox conversion flows
- Recurring routines, shared lists, meal planning, or broader Horizon 3 workflow design
- Advanced recurrence rules such as custom intervals, weekdays, skips, exceptions, backfill, or catch-up logic
- Proactive spouse notifications or spouse reminder writes
- Quiet hours, per-reminder delivery rules, digest bundling, or rich notification policy
- External calendar, SMS, email, or messaging integrations
- A separate missed-occurrence state or workflow
- A generalized recurrence platform across all future workflows in this slice

## Shared Infrastructure Introduced Now Vs Deferred
### Introduce now
- A reminder-local recurrence seam in `packages/domain`:
  - cadence enum: `none | daily | weekly | monthly`
  - deterministic `computeReminderState()` and `scheduleNextOccurrence()` helpers
  - timeline event vocabulary that can represent recurring reschedule and missed-occurrence history
- Persisted reminder notification preferences:
  - overall enabled flag
  - `due_reminders` enabled flag
  - `daily_summary` enabled flag
- Reminder-aware PWA cache and outbox support parallel to the existing inbox sync model
- Reminder deep-link and re-entry handling for in-app review

### Explicitly defer
- A cross-workflow recurrence package shared with recurring routines
- A generalized notification preference center beyond the reminder slice
- A generalized timeline or audit framework spanning all workflows
- Background infrastructure more complex than the current polling-job model
- Any product behavior that implies automatic reminder-to-task conversion or autonomous escalation

## Canonical Reminder Record Model
- Use one long-lived reminder row per reminder id in the first slice. Do not introduce parent reminder records plus per-occurrence child records.
- One-time reminders are terminal on `completed` or `cancelled`.
- Recurring reminders reuse the same row. Completing the current occurrence writes timeline history for that occurrence, then advances the same reminder row in place to the next scheduled occurrence.
- `scheduledAt` is the canonical next-surfacing timestamp. `snoozedUntil` is only a temporary deferral for the current occurrence.
- When a recurring reminder is completed after one or more cadence boundaries were missed, append timeline entries for each missed occurrence that should have surfaced since the prior scheduled time, then advance the reminder to the first cadence boundary strictly after the completion-time-resolved occurrence.
- After recurrence advancement, clear occurrence-specific terminal fields so the reminder becomes active again as the next upcoming or due occurrence.
- This model is intentionally narrow and local to reminders. Do not generalize it into a cross-workflow occurrence framework in this slice.

## Current Codebase Anchors
Use these existing modules as the extension points for the first implementation:

- `packages/contracts/src/index.ts`: shared schemas, commands, query payloads, outbox command shapes
- `packages/domain/src/index.ts`: parsing, flag derivation, suggestions, update rules
- `packages/domain/test/inbox-domain.test.ts`: current domain test home
- `apps/api/src/app.ts`: Fastify routes and boundary enforcement
- `apps/api/src/repository.ts`: SQLite persistence transactions
- `apps/api/src/jobs.ts`: rules-based notification jobs
- `apps/api/src/db/schema.ts`: Drizzle schema declarations
- `apps/api/drizzle/0000_initial.sql`: current bootstrap schema
- `apps/api/test/api.test.ts`: API integration test home
- `apps/pwa/src/lib/api.ts`: typed client API calls
- `apps/pwa/src/lib/sync.ts`: offline-aware command/query wrapper
- `apps/pwa/src/lib/client-db.ts`: Dexie cache and outbox
- `apps/pwa/src/router.tsx`: route tree
- `apps/pwa/src/routes/home-page.tsx`: home summary surface
- `apps/pwa/src/routes/tasks-page.tsx`: inbox list and add flow
- `apps/pwa/src/routes/item-detail-page.tsx`: direct item edit surface
- `apps/pwa/src/routes/settings-page.tsx`: installability and notification settings surface

## Implementation Phases
### Phase 1: Expand shared contracts for reminders
**Outcome:** Client, server, and domain share a stable reminder vocabulary and API contract before implementation logic spreads across layers.

**Status:** complete

**Validation note:** Shared reminder schemas, direct-action command contracts, reminder outbox variants, and representative parsing tests are implemented and validated against the approved reminder spec. Later phases remain incomplete.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**
- Add reminder enums and base schemas:
  - `reminderStateSchema`: `upcoming | due | overdue | snoozed | completed | cancelled`
  - `recurrenceCadenceSchema`: `none | daily | weekly | monthly`
  - reminder event types for create, reschedule, snooze, complete, cancel, recurrence-advance, and missed-occurrence logging
- Add reminder entities:
  - `draftReminderSchema`
  - `reminderSchema`
  - `reminderTimelineEntrySchema`
  - `linkedInboxSummarySchema` for lightweight inbox context on reminder surfaces
  - `reminderNotificationPreferencesSchema`
- Add reminder query response schemas:
  - grouped reminder view response
  - reminder detail response
  - reminder settings response
- Add reminder command/request schemas:
  - preview create reminder
  - confirm create reminder
  - preview update reminder for agentic suggestions only
  - confirm update reminder for field edits only
  - complete reminder
  - snooze reminder
  - cancel reminder
  - save reminder notification preferences
- Extend `outboxCommandSchema` with reminder command variants for:
  - reminder create
  - reminder update
  - reminder complete
  - reminder snooze
  - reminder cancel
- Keep inbox contracts intact; do not fold reminder fields into `InboxItem`.

**Verification**
- Typecheck all packages.
- Add schema parsing tests for representative reminder payloads.
- Confirm reminder write payloads preserve D-010 semantics:
  - preview endpoints available for parsed drafts and agentic suggestions
  - confirm update payloads usable directly for user-initiated field edits
  - complete and snooze modeled as dedicated direct-action commands

**Evidence required**
- Contract diff showing new reminder schemas and outbox variants
- Passing contract/typecheck output

### Phase 2: Add reminder domain rules and recurrence helpers
**Outcome:** Reminder behavior is deterministic and testable without API, UI, or AI dependencies.

**Status:** complete

**Validation note:** Reminder draft parsing, derived state, direct reminder mutations, recurrence advancement, missed-occurrence timeline logging, grouping/ranking helpers, and linked-reminder inbox separation are implemented in the domain layer and covered by targeted tests. Later persistence, API, sync, and UI phases remain incomplete.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/test/inbox-domain.test.ts`
- Consider create: `packages/domain/test/reminders-domain.test.ts`

**Work items**
- Add reminder draft creation helpers:
  - structured reminder creation
  - natural-language reminder parsing fallback using existing `chrono-node` patterns
  - optional linked inbox item id capture
  - optional note and recurrence capture
- Add reminder state derivation:
  - `computeReminderState(reminder, now)`
  - due-state derived from timestamps and explicit lifecycle fields, not stored as mutable canonical state
- Add reminder mutation helpers:
  - `createReminder()`
  - `updateReminder()` for editable fields only
  - `completeReminderOccurrence()`
  - `snoozeReminder()`
  - `cancelReminder()`
  - `scheduleNextOccurrence()` for `daily`, `weekly`, `monthly`
- Define first-slice recurrence semantics explicitly in code:
  - only completion advances recurrence
  - time passing alone does not spawn a new actionable record
  - the same reminder row is advanced in place for recurring reminders; do not create per-occurrence reminder rows
  - if the system detects that one or more cadence boundaries were missed when a recurring reminder resurfaces or is reviewed, append missed-occurrence timeline entries at that point so the timeline already reflects the missed history before the user completes, snoozes, or edits the reminder
  - when a recurring reminder is completed, schedule the next occurrence from the cadence boundary sequence anchored to the prior scheduled occurrence, not from an arbitrary "now plus cadence" calculation
- Add reminder grouping and summary helpers:
  - group by `upcoming`, `due`, `overdue`, `snoozed`, `completed`, `cancelled`
  - rank upcoming/due reminders for home surfacing and notification eligibility
- Keep inbox semantics separate:
  - linked reminder completion must not mutate inbox item state
  - reminder actions must not create inbox records

**Verification**
- Domain tests for:
  - one-time reminder state derivation
  - snooze transitions
  - complete and cancel behavior
  - recurrence scheduling for `daily`, `weekly`, `monthly`
  - missed recurring history recorded only in timeline
  - linked reminders preserving inbox state
  - parsing fallback when AI is disabled

**Evidence required**
- Passing reminder domain test output
- Representative test cases showing recurrence advancement and linked-reminder separation

### Phase 3: Add persistence schema and repository support
**Outcome:** SQLite can durably store reminders, reminder timeline history, and reminder notification preferences alongside existing inbox data.

**Status:** complete

**Validation note:** Ordered reminder migrations, additive reminder tables, schema-migration tracking, repository-backed reminder persistence, linked inbox joins, notification preference storage, and notification delivery dedupe storage are implemented and validated with fresh-database API coverage, inbox-only upgrade coverage, and direct SQLite row inspection. Later reminder UI and sync phases remain incomplete.

**Primary files**
- Create: `apps/api/drizzle/0001_first_class_reminders.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/client.ts`
- Modify: `apps/api/src/repository.ts`

**Work items**
- Add reminder tables:
  - `reminders`
  - `reminder_timeline`
  - `reminder_notification_preferences`
  - `notification_delivery_log`
- Introduce ordered runtime migrations for the existing non-greenfield database:
  - keep `0000_initial.sql` as the inbox baseline
  - add `0001_first_class_reminders.sql` as an additive migration for existing databases
  - update `apps/api/src/db/client.ts` to track and apply numbered SQL migrations in order rather than always executing only the initial bootstrap file
  - add a migration-state table such as `schema_migrations` so upgrades are idempotent across restarts
- Include fields for:
  - id
  - title
  - note
  - owner
  - linked inbox item id nullable
  - recurrence cadence
  - scheduled at / current surfacing time
  - last snoozed until
  - completed at
  - cancelled at
  - created at / updated at
  - version
- Add timeline storage fields:
  - reminder id
  - actor role
  - event type
  - from value / to value
  - metadata JSON for missed-occurrence notes when needed
  - created at
- Add notification delivery log fields:
  - notification type
  - actor role
  - reminder id nullable for daily summary
  - delivery bucket or dedupe key
  - delivered at
- Add repository methods:
  - list reminders
  - get reminder
  - list reminder timeline
  - create reminder with initial timeline entry
  - update reminder transactionally with timeline entry
  - save and load reminder notification preferences
  - join linked inbox summary when present
- Preserve transactionality: reminder row and timeline entry must commit together.
- Keep repository boundaries explicit; do not collapse reminders into the existing inbox-item history table.

**Verification**
- Fresh database boot succeeds.
- Existing inbox-only databases upgrade successfully through `0001_first_class_reminders.sql` without data loss.
- Repository tests or API-backed persistence tests prove create, update, timeline append, and preferences persistence.
- Linked reminder retrieval works whether the inbox item exists or is later updated.

**Evidence required**
- Schema/migration diff
- Passing upgrade test from an inbox-only database fixture to the reminder-capable schema
- Passing persistence or API integration evidence against a fresh SQLite database
- Sample DB inspection showing reminder row plus timeline rows

### Phase 4: Extend API routes, AI boundary, and jobs
**Outcome:** The server exposes reminder queries and commands, preserves trust-model rules, and evaluates reminder notifications deterministically.

**Status:** complete

**Validation note:** Reminder create/update/complete/snooze/cancel routes, reminder queries and settings routes, reminder draft storage, AI-disabled reminder parsing fallback, stakeholder-write versus spouse-read-only enforcement, real Web Push payload validation, and deterministic due-reminder plus daily-summary job behavior are implemented and validated by targeted API and job tests against the approved reminder spec boundaries. Later PWA sync and interface phases remain incomplete.

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/ai.ts`
- Modify: `apps/api/src/drafts.ts`
- Modify: `apps/api/src/jobs.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**
- Add reminder routes:
  - `POST /api/reminders/preview-create`
  - `POST /api/reminders/confirm-create`
  - `POST /api/reminders/preview-update`
  - `POST /api/reminders/confirm-update`
  - `POST /api/reminders/complete`
  - `POST /api/reminders/snooze`
  - `POST /api/reminders/cancel`
  - `GET /api/reminders`
  - `GET /api/reminders/:reminderId`
  - `GET /api/reminders/settings`
  - `POST /api/reminders/settings`
- Reuse existing role enforcement:
  - stakeholder writes allowed
  - spouse queries allowed
  - spouse writes rejected with explicit read-only error
- Extend `DraftStore` to support reminder drafts and preview-update records parallel to inbox drafts.
- Extend the AI provider boundary with reminder-specific methods:
  - parse reminder draft
  - optional reminder summary phrasing
- Use this canonical command model for the first slice:
  - `confirm-update` edits reminder fields such as title, note, owner, scheduled time, and recurrence
  - `complete`, `snooze`, and `cancel` are dedicated commands with their own validation and timeline behavior
  - `preview-update` is only for Olivia-proposed edits to reminder fields and is not used for direct complete, snooze, or cancel actions
- Preserve fallback behavior:
  - structured reminder creation must work when AI is disabled
  - reminder list/detail queries must not depend on AI
- Add reminder notification evaluation in `jobs.ts`:
  - due reminder rule based on reminder due-state and saved preferences
  - daily summary rule using grouped reminder state
  - deep-link targets should route into reminder-aware review surfaces
- Replace the current demo-only subscription path with real Web Push registration and persistence:
  - browser client must send actual `PushSubscription` payloads including endpoint and keys
  - server should reject or clearly no-op invalid demo payloads in production reminder flows
- Define notification eligibility and precedence explicitly:
  - global server notifications enabled
  - browser permission granted
  - valid push subscription saved
  - reminder notifications enabled overall
  - target notification type enabled
  - reminder or summary satisfies job rule and dedupe check
- Define first-slice delivery defaults explicitly:
  - due reminders notify on first transition into the due state for a given scheduled occurrence and do not repeat every polling interval
  - daily summary is delivered at most once per calendar day per actor using a single server-configured send window; do not add user-configurable summary time in this slice
- Keep reminder notifications secondary to in-app surfacing.
- Do not introduce a precise per-reminder scheduler daemon; continue polling current state.

**Verification**
- API integration tests for:
  - stakeholder create/edit/complete/snooze/cancel flows
  - spouse read-only reminder access
  - version conflicts on reminder writes
  - linked reminder response includes inbox summary without mutating inbox state
  - AI-disabled structured reminder creation
  - reminder settings persistence
  - notification job eligibility respecting the full precedence chain and dedupe rules
  - invalid or demo-style subscription payloads do not masquerade as real push readiness

**Evidence required**
- Passing API test output
- Request/response examples for reminder create, complete, snooze, and settings flows
- Logs or test fixtures showing due reminder job skipped when preferences disable the type and not repeated once already sent for the same occurrence

### Phase 5: Extend PWA API, sync, and offline cache
**Outcome:** Reminder data participates in the same offline-tolerant client architecture as inbox data.

**Status:** complete

**Validation note:** Typed reminder client wrappers, Dexie reminder caches, cached reminder view/detail fallback, reminder outbox flushing for create/update/complete/snooze/cancel, and reminder settings cache support are implemented and covered by focused PWA sync tests plus workspace typecheck. Visual-design review found no new route, component, or styling changes in this infra-only phase, so design-foundation risk is unchanged and reminder-facing UI remains correctly deferred to Phase 6. Product review confirms the delivered work matches the approved phase scope by enabling offline-tolerant reminder data handling without quietly adding reminder surfaces, conversion flows, advanced recurrence, spouse write paths, or richer notification policy.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`
- Modify: `apps/pwa/src/lib/api.test.ts`

**Work items**
- Add typed reminder API clients:
  - fetch reminder view
  - fetch reminder detail
  - preview and confirm reminder create/update
  - complete, snooze, cancel reminder
  - get and save reminder settings
- Extend Dexie schema with reminder stores:
  - reminder records
  - reminder timeline cache
  - reminder settings cache
  - reminder-aware outbox commands
- Add reminder cache builders:
  - grouped reminder view from cached records
  - reminder detail fallback when offline
- Extend outbox flushing for reminder command variants.
- Preserve D-010 client behavior:
  - preview/confirm for parsed draft creation and agentic suggestions
  - direct confirm for user-initiated reminder field edits
  - dedicated direct-action commands for complete and snooze
  - explicit confirmation UI still required for cancel
- Keep outbox FIFO and do not queue unconfirmed drafts.

**Verification**
- Client sync tests for:
  - offline reminder creation
  - offline reminder snooze/complete
  - reconnect flush
  - version-conflict marking
  - cached reminder view fallback

**Evidence required**
- Passing `apps/pwa/src/lib/api.test.ts` or equivalent sync test output
- Dexie schema diff showing reminder caches/outbox support

### Phase 6: Build reminder surfaces in the PWA
**Outcome:** Olivia has a calm, reminder-aware user experience that adds a new workflow without displacing the inbox.

**Primary files**
- Modify: `apps/pwa/src/router.tsx`
- Modify: `apps/pwa/src/routes/home-page.tsx`
- Modify: `apps/pwa/src/routes/tasks-page.tsx`
- Modify: `apps/pwa/src/routes/item-detail-page.tsx`
- Modify: `apps/pwa/src/routes/settings-page.tsx`
- Modify: `apps/pwa/src/routes/re-entry-page.tsx`
- Consider adapt: `apps/pwa/src/routes/review-page.tsx`
- Create: reminder route and screen components, likely under `apps/pwa/src/routes/` and `apps/pwa/src/components/screens/`

**Work items**
- Add a first-class reminder review surface:
  - grouped sections for `upcoming`, `due`, `overdue`, `snoozed`, and recent `completed`
  - linked inbox context visible inline when present
  - read-only spouse view using the same query surface
- Use a dedicated `/reminders` support route in the first slice, but do not add a fifth primary bottom-nav tab.
- Make `/reminders` discoverable through explicit entry points:
  - Home upcoming-events surface
  - reminder notification re-entry
  - linked reminder section on inbox item detail
  - reminder-focused prompts in `Olivia`
- Keep `tasks` as the inbox foundation and leave the existing four-tab bottom navigation intact.
- Build reminder creation UX:
  - standalone reminder creation
  - linked reminder creation from inbox item detail
  - natural-language draft preview and correction
  - structured fallback fields for AI-disabled mode
- Build reminder action UX:
  - complete immediately for direct user action
  - snooze immediately for direct user action
  - edit immediately for direct user action
  - cancel behind explicit confirmation
- Extend home surfacing:
  - populate the currently empty `events` area with upcoming or due reminders
  - keep the home posture calm; surface only a small number of reminders
- Extend item detail:
  - show linked reminders section or add-reminder affordance
  - never imply reminder completion changes inbox status
- Extend settings:
  - overall reminder notification toggle
  - `due reminders` toggle
  - `daily summary` toggle
  - replace the current demo notification save action with real browser push registration, unsubscribe, and readiness diagnostics
  - preserve existing installability and subscription diagnostics
- Extend re-entry flow:
  - reminder notification deep-links land on reminder review or detail
  - inbox notifications continue to work

**Verification**
- UI tests or route-level integration tests for:
  - reminder list grouping
  - standalone reminder creation
  - linked reminder creation from an inbox item
  - direct complete/snooze/edit flows
  - cancel confirmation flow
  - spouse read-only rendering
  - home reminder surfacing
  - settings toggle persistence
  - notification re-entry into reminder review

**Evidence required**
- Demo recording or screenshots of the reminder review surface, creation flow, item-detail linked reminder section, and settings toggles
- Manual QA notes for mobile viewport, installed-PWA behavior, and offline reminder access

### Phase 7: Final verification, documentation sync, and M6 evidence
**Outcome:** The feature is implementable end to end with clear proof that it meets the approved scope and has not absorbed deferred workflows.

**Primary files**
- Modify as needed: tests in `packages/domain/test`, `apps/api/test`, `apps/pwa/src/lib/api.test.ts`, and any UI/e2e test locations already used during implementation
- Update durable docs only if implementation reveals a genuine conflict or new durable decision

**Work items**
- Run the highest-signal automated suites for:
  - domain
  - API
  - PWA sync/client logic
  - reminder UI or end-to-end flows
- Execute a manual checklist covering:
  - standalone reminder creation
  - linked reminder creation
  - due and overdue surfacing
  - snooze and resurface behavior
  - recurring completion and next scheduling
  - missed recurring history visible only in timeline
  - reminder notification toggles
  - spouse read-only behavior
  - no reminder action mutates inbox status
- Review the implementation against deferred boundaries:
  - no conversion flow
  - no rich recurrence rules
  - no spouse write path
  - no external delivery channels beyond existing Web Push support
- If implementation forces a durable decision about recurrence or notification infrastructure beyond this scope, update `docs/learnings/decision-history.md` or `docs/learnings/assumptions-log.md` explicitly instead of burying it in code.

**Verification**
- All targeted automated suites pass.
- Manual QA confirms acceptance criteria coverage.
- A review pass confirms no deferred product area was quietly implemented.

**Evidence required**
- Command output for the passing targeted suites
- Manual QA notes or video evidence
- Any required durable doc updates if new decisions were forced by implementation reality

## Verification Matrix
### Contracts and domain
- Schema parsing tests for reminder payloads pass.
- Domain tests prove state derivation, recurrence advancement, missed-occurrence timeline logging, linked reminder separation, and AI-disabled structured creation.

### API and persistence
- Fresh database boot and reminder persistence succeed.
- Existing inbox-only databases upgrade successfully before reminder routes or jobs are exercised.
- API tests prove stakeholder write access, spouse read-only access, version conflicts, reminder settings persistence, and linked inbox context rendering.
- Notification job tests prove due reminders and daily summary respect saved preferences, real push readiness, and dedupe behavior.

### PWA and offline behavior
- Client sync tests prove reminder commands can queue offline and flush later.
- Reminder views render from cache when offline.
- Installed-PWA and notification re-entry flows remain usable on mobile-sized layouts.

### Scope control
- Review confirms the implementation does not include reminder-to-inbox conversion, advanced recurrence, spouse write access, or rich notification policy.

## Evidence Required For M6 Completion
- The committed implementation plan in `docs/plans/first-class-reminders-implementation-plan.md`
- Passing automated test output for reminder contracts, domain logic, API flows, and PWA sync/UI surfaces
- Schema and route diffs showing reminder support across contracts, domain, API, persistence, and PWA
- Demo artifacts showing:
  - standalone reminder creation
  - linked reminder creation from an inbox item
  - due reminder surfacing
  - snooze and recurring completion behavior
  - reminder notification settings and re-entry
- Explicit note, test, or review evidence showing:
  - inbox state is not mutated by reminder actions
  - missed recurring history stays timeline-only
  - spouse remains read-only

## Risks / Open Questions
### 1. Recurrence should stay narrowly reusable
`A-008` suggests recurrence may later become broader infrastructure. For this slice, engineering should create small reusable helpers and storage fields, but stop short of a cross-workflow framework. If the first implementation starts needing routine-specific semantics, stop and document the conflict rather than expanding scope implicitly.

### 2. Notification reliability remains an active assumption
Reminder notifications depend on the same PWA and Web Push assumptions already tracked in `A-005`. This does not block implementation, but the code should preserve a clean fallback to in-app reminder surfacing and keep push delivery optional.

### 3. Timeline shape may want later unification
Reminder timeline entries and inbox history entries will likely look similar. Do not unify them prematurely in this slice unless the abstraction remains obviously simpler and does not blur workflow semantics.
