# Implementation Plan: Shared Household Inbox

## Status
Current execution-ready implementation plan for the first build slice.

## Summary
This plan implements the approved shared household inbox as Olivia's first end-to-end workflow without reopening product intent. The target delivery shape remains:

- installable mobile-first PWA as the canonical surface
- advisory-only write behavior with explicit confirmation before every consequential change
- primary-operator model with spouse read-only visibility
- household-controlled SQLite as the canonical durable store
- browser-local IndexedDB cache and outbox for offline tolerance
- explicit versioned pull/push sync rather than CRDTs or peer-to-peer sync
- deterministic domain rules for storage, approval, summaries, stale-item detection, and notification eligibility
- AI behind a narrow provider adapter boundary for parsing and summary phrasing only

Planning readiness is satisfied for this workflow:

- `docs/specs/shared-household-inbox.md` is approved.
- `docs/learnings/decision-history.md` D-009 explicitly approves the inbox spec for implementation planning.
- `docs/roadmap/milestones.md` defines M3 as the point where an implementation plan can be generated directly from the spec, and the inbox workflow now meets that bar.
- Remaining unknowns are bounded and non-blocking for the first implementation slice if they stay visible as follow-up risks rather than being buried in engineering tasks.

## Source Artifacts
- `docs/specs/shared-household-inbox.md`
- `docs/strategy/interface-direction.md`
- `docs/strategy/system-architecture.md`
- `docs/vision/product-vision.md`
- `docs/vision/product-ethos.md`
- `docs/strategy/agentic-development-principles.md`
- `docs/glossary.md`
- `docs/roadmap/roadmap.md`
- `docs/roadmap/milestones.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`
- `docs/learnings/learnings-log.md`

Relevant durable guidance carried into this plan:

- D-002: advisory-only trust model
- D-004: primary-operator model for the earliest workflow
- D-005: reminders stay as inbox-item properties, not a first-class object
- D-007: installable mobile-first PWA is the MVP interface
- D-008: local-first modular monolith, SQLite canonical store, browser-local cache/outbox, explicit versioned sync, narrow AI boundary
- D-009: shared household inbox spec is approved for implementation planning
- A-004: 14-day stale threshold is a configurable starting value, not a settled truth
- A-005: Web Push may be sufficient for the first notification posture, but needs real-use validation
- A-006: versioned command sync is sufficient for early household concurrency unless real usage disproves it
- L-004: local-first shared household products need a canonical shared store plus device-local caches
- L-005: explicit product-shaping seams matter more than forcing single-stack purity

## Assumptions And Non-Goals
### Assumptions
- The first implementation can target one household-controlled runtime without deciding the final remote-access method up front.
- The first workflow needs role-aware access boundaries, but not a generalized account system or full permissions model.
- The 14-day stale threshold should be implemented as configuration with tests around the default, then validated through household use.
- Notifications are valuable enough to warrant plumbing in the first implementation path, but the exact default-enabled rules remain a bounded follow-up.
- AI availability cannot be assumed for correctness; all core add, update, review, and sync flows must work with AI disabled.

### Non-Goals
- Full spouse write participation, multi-user parity, or richer household role management
- Recurring reminders, calendar enforcement, or a first-class reminder entity
- Attachments, labels, categories, or external calendar/task integrations
- Native clients, widgets, shared-display mode, or Slack as a canonical surface
- CRDTs, peer-to-peer sync, event sourcing, microservices, or generalized workflow engines
- Automatic writes, proactive spouse notifications, or any advisory exception
- General assistant features outside the shared household inbox workflow

## Implementation Defaults For This Plan
These defaults are intentionally specific so a junior engineer or simple implementation agent does not need to invent structure before building. If implementation reality forces a change, update this plan explicitly rather than silently diverging.

### Recommended workspace layout
- apps/pwa: React + Vite installable PWA
- apps/api: Fastify API, background jobs, and asset-serving entrypoint
- packages/domain: domain types, rules, services, and status transition logic
- packages/contracts: shared Zod schemas, API contracts, and command/query payloads
- packages/ui: optional shared UI primitives only if duplication appears

### Recommended top-level scripts
- `dev`: run API and PWA together
- `build`: build every package and app
- `lint`: run the chosen lint configuration across the workspace
- `typecheck`: run TypeScript project references or equivalent full typecheck
- `test`: run the highest-signal automated suites for local validation
- `test:domain`: domain and persistence logic tests
- `test:api`: API integration tests
- `test:e2e`: UI and offline/sync end-to-end coverage

### Package ownership boundaries
- The PWA may own view state, loading state, and optimistic presentation details.
- The API may own transport, authorization checks, sync orchestration, and adapter wiring.
- The domain package must own write validation, approval requirements, status rules, stale logic, due-soon logic, and history semantics.
- The contracts package must be the only place where shared request and response shapes are defined.
- No AI adapter, route action, or UI form may become write authority.

## Do Not Decide In Implementation
- Do not add spouse write capability, even if it seems simpler than enforcing read-only behavior.
- Do not introduce a first-class reminder entity, recurring schedule model, or calendar integration.
- Do not turn preview actions into writes or skip confirmation steps for any consequential change.
- Do not hard-code the stale threshold as an untouchable constant; implement it as a defaulted setting.
- Do not auto-enable every candidate notification rule; keep rule activation configurable.
- Do not build generalized auth, role management, or remote-access infrastructure beyond the bounded prototype seam.
- Do not replace versioned command sync with CRDTs, event sourcing, or peer-to-peer sync.
- Do not let AI become required for add, review, update, retrieval, or sync correctness.

## Implementation Steps
### Step 1: Establish the codebase and module boundaries
**Outcome:** A runnable TypeScript codebase exists with explicit client, server, domain, and infrastructure seams that match the approved architecture.

**Work items**
- Create the exact initial workspace layout defined in `Implementation Defaults For This Plan`.
- Set up TypeScript project references, linting, formatting, unit test runner, and end-to-end test runner.
- Add the approved baseline libraries: TanStack Router, TanStack Query, Dexie, Fastify, Zod, Drizzle, SQLite driver, `vite-plugin-pwa`, `date-fns`, `chrono-node`, Web Push wrapper, and Pino.
- Define the top-level environment contract for local runtime paths, SQLite location, AI provider settings, and optional notification configuration.
- Add a single-command local development workflow that runs the API and PWA together.
- Add a short developer-facing README section listing the exact workspace layout, top-level scripts, and boundary rules so later agents do not need to infer them from package manifests.

**Notes**
- Keep repository seams explicit from the start so later native shells or alternate clients can reuse the same domain and contracts.
- Avoid any framework choice that would move write authority into UI actions or AI orchestration.

### Step 2: Implement the inbox domain model and SQLite canonical store
**Outcome:** Olivia has a deterministic household inbox model with durable storage, audit history, and reversible status changes.

**Work items**
- Define the canonical domain types for:
  - inbox item
  - owner (`stakeholder`, `spouse`, `unassigned`)
  - status (`open`, `in_progress`, `done`, `deferred`)
  - due metadata and normalized dates
  - description and context notes
  - created/updated timestamps
  - version metadata
- Create the initial SQLite schema and Drizzle migrations for:
  - `inbox_items`
  - `inbox_item_history`
  - `device_sync_state`
  - `notification_subscriptions`
  - any minimal role/user table required for stakeholder versus spouse access checks
- Implement domain services for:
  - item creation
  - item update
  - note append or context update
  - ownership reassignment
  - status transitions
  - item retrieval grouped for review
  - stale, overdue, and due-soon eligibility
- Ensure every durable change writes both the new item state and an audit/history entry in the same transaction.
- Keep completed and deferred items retrievable; only active-list filtering changes.
- Implement the exact default field set and status transition behavior defined in `Appendix A: Canonical Domain Defaults` and `Appendix B: Status Transition Matrix` unless a later plan revision changes them explicitly.

**Notes**
- Reminders remain metadata on inbox items, not a separate table or workflow.
- Archiving policy stays deferred; the first slice keeps completed and deferred records available.

### Step 3: Build the approval-gated command and query API
**Outcome:** All reads and writes flow through typed contracts that preserve advisory-only behavior and spouse read-only access.

**Work items**
- Expose typed HTTP endpoints for:
  - previewing an add-item draft
  - confirming item creation
  - previewing a proposed update
  - confirming status, owner, due-date, description, or note changes
  - retrieving inbox views grouped by status
  - retrieving review summaries and suggestion metadata
  - retrieving a single item with history
- Represent writes as explicit commands carrying:
  - actor identity
  - item identifier
  - expected current version
  - proposed change
  - approval intent
- Enforce that preview endpoints never persist household state.
- Enforce that confirm endpoints reject missing approval, stale versions, malformed data, and spouse-initiated writes.
- Return structured machine-readable summary data first; AI-readable summary prompts should be a later adapter layer, not the canonical response.
- Add structured logs for command acceptance, rejection, sync version conflicts, and notification rule evaluation.
- Use the payload patterns in `Appendix C: API Contract Examples` as the default shape for route design and integration tests.

**Notes**
- This step encodes the trust model directly in the server boundary.
- The spouse read-only path should succeed for queries and fail clearly for writes.

### Step 4: Implement explicit versioned sync plus browser-local cache and outbox
**Outcome:** The PWA remains useful offline and can reconcile with the canonical household store using a legible sync model.

**Work items**
- Create Dexie stores for:
  - cached inbox items
  - cached summaries
  - local outbox commands
  - sync cursor and last-success metadata
- Implement a client sync service that:
  - pulls a household snapshot or incremental changes on launch and re-entry
  - pushes locally queued confirmed commands when connectivity returns
  - updates local caches from canonical responses
  - handles version conflicts by surfacing a review-and-retry state rather than silently overwriting
- Keep add and update confirmation UX available offline by queuing only already confirmed commands into the outbox.
- Add service-worker-backed caching for the app shell and last-known household state views.
- Define a clear stale-cache indicator so the user can tell when they are seeing last-known data rather than fresh server state.
- Implement the online, offline, and conflict sequences in `Appendix D: Sync Sequence Defaults` before adding optimizations.

**Notes**
- Offline tolerance should never bypass confirmation or domain validation.
- This step is the concrete implementation of D-008 and L-004.

### Step 5: Build the PWA capture, review, and spouse read-only experiences
**Outcome:** The first user-facing household inbox works end to end on the approved PWA surface.

**Work items**
- Implement the core routes:
  - inbox review
  - add-item capture
  - item detail/history
  - notification re-entry target
  - minimal settings for installability, notifications, and role context
- Build the stakeholder capture flow:
  - freeform text input
  - parsed draft preview
  - quick correction UI
  - one-tap confirm
- Build the review flow:
  - grouped sections for open, in-progress, deferred
  - owner filter
  - due-soon and overdue emphasis
  - one or two prioritized suggestions at most
- Build update flows for status, owner, due date, and notes with explicit confirmation UI before submit.
- Build the spouse read-only experience using the same query model but without write controls or write-capable routes.
- Ensure installability, mobile layout, and offline/open-from-notification behavior are treated as first-class UX requirements.
- Use `Appendix E: Route And Screen Checklists` as the default definition of what each route must contain before calling the route complete.

**Notes**
- The PWA should feel like a calm household tool, not a chat transcript or a noisy task manager.
- Do not surface the entire inbox unprompted on unrelated entry points.

### Step 6: Add the narrow AI adapter and non-AI fallback paths
**Outcome:** AI improves capture and summary readability without becoming required for correctness or the source of truth.

**Work items**
- Define an internal `AiProvider` interface with explicit methods for:
  - parse capture text into a draft item
  - generate readable review summaries from structured data
  - optionally draft suggestion phrasing from already-computed rule outputs
- Implement a provider adapter that minimizes outbound data and never sends more item content than needed for the requested advisory task.
- Build a confidence-aware parsing flow:
  - high-confidence parse -> standard preview
  - low-confidence parse -> highlight ambiguous fields before confirmation
  - provider unavailable -> fall back to structured field entry
- Build a non-AI summary path that renders a plain grouped list and deterministic suggestion labels when the provider is disabled or failing.
- Keep all durable writes and rule evaluation in domain/application code, not the AI adapter.
- Implement the fallback input and summary defaults in `Appendix F: Non-AI Fallback Defaults` rather than inventing a different syntax during delivery.

**Notes**
- This step is complete only if the workflow still works with AI fully disabled.
- AI logging should distinguish provider failures from domain failures.

### Step 7a: Add rules-based notification plumbing and durability operations
**Outcome:** Olivia can support calm, primary-operator prompts and durable household operations without turning notifications into a second inbox.

**Work items**
- Implement a background job path inside the same runtime for:
  - due-soon rule evaluation
  - stale-item rule evaluation
  - optional digest generation behind configuration
- Add Web Push subscription storage and a provider wrapper so delivery remains replaceable.
- Ensure notification payloads deep-link into the structured PWA review state rather than carrying actionable write buttons.
- Gate notification rules behind explicit configuration so the household can trial a minimal set without code changes.
- Add instrumentation for:
  - notification generated
  - notification delivered or failed
  - notification opened
  - resulting review action taken or ignored
- Add export and backup support for the SQLite store before real household use begins.

**Notes**
- The existence of notification plumbing does not force all candidate prompts to be enabled on day one.
- Spouse notifications remain out of scope.

### Step 7b: Run household validation and capture post-build learnings
**Outcome:** The first real household trial produces evidence about workflow usefulness, durability trust, notification quality, and the assumptions that remain active.

**Work items**
- Prepare a short household validation protocol covering:
  - two weeks of real capture and review use
  - trust in durability across sessions
  - signal-to-noise judgment on suggestions and notifications
  - validation of A-004, A-005, and A-006
- Record which notification rules were enabled during the trial so later learnings are interpretable.
- Record whether spouse read-only visibility is sufficient for the trial period or causes coordination friction.
- Update assumptions, learnings, or decisions after the trial if evidence changes what is currently believed.

**Notes**
- Step 7b is a usage-validation step, not a product-redesign step.
- Notification defaults should be tuned through the trial and documented afterward, not decided implicitly during plumbing work.

## Verification
### Step 1 verification
- Run workspace setup, lint, typecheck, and test commands successfully.
- Start the API and PWA together and confirm both are reachable in local development.
- Verify shared contract types compile across client and server packages without circular coupling.

### Step 2 verification
- Run migration tests against a fresh SQLite database.
- Run domain-level tests for creation, update, status transitions, due-date normalization, stale detection, and history writing.
- Confirm completed items leave active views while remaining queryable.

### Step 3 verification
- Run API integration tests that prove every write requires explicit confirmation.
- Run authorization tests that prove spouse reads succeed and spouse writes fail.
- Run conflict tests that prove stale versions are rejected rather than overwritten.

### Step 4 verification
- Run browser or integration tests that simulate offline capture, queued confirmed commands, reconnect sync, and conflict handling.
- Manually test last-known-state rendering when the API is unavailable.
- Confirm the outbox never contains unconfirmed drafts.

### Step 5 verification
- Run UI integration tests for add, review, update, and spouse read-only flows.
- Manually test the installed PWA in mobile-sized viewport for:
  - fast add-item flow
  - grouped review flow
  - explicit confirmation on writes
  - offline launch and re-entry
- Confirm notification deep-links land on the relevant review view.

### Step 6 verification
- Run adapter tests for AI parse and summary calls.
- Simulate provider failure and confirm structured input plus plain summary fallback still work.
- Confirm no AI-disabled path blocks item creation, retrieval, or updates.

### Step 7a verification
- Run notification rule tests for due-soon, stale, and digest eligibility.
- Manually test push subscription, delivery, tap-through, and re-entry into the PWA review flow.
- Run backup and restore verification against a copy of the SQLite database.

### Step 7b verification
- Complete the two-week household validation protocol and capture durable learnings.

## Evidence Required
### Step 1 evidence
- Successful command output for install, lint, typecheck, tests, and local startup
- A brief architecture readme or package map showing where domain, contracts, client, and infrastructure live

### Step 2 evidence
- Migration files and schema definitions committed to source control
- Passing domain test output covering create, update, history, and stale logic
- A sample database inspection showing canonical records plus matching history entries

### Step 3 evidence
- Passing API integration test output
- Request/response examples showing preview versus confirm behavior
- Structured logs demonstrating rejected unapproved writes and rejected spouse writes

### Step 4 evidence
- Passing offline and sync integration test output
- Manual test notes or a demo recording showing offline confirmation, queued sync, reconnect, and conflict messaging
- Dexie store inspection or debug output proving confirmed commands queue locally before sync

### Step 5 evidence
- A demo video of the working PWA add, review, and update flows
- Screenshots of stakeholder review and spouse read-only views
- Manual QA notes confirming installability and mobile-first layout

### Step 6 evidence
- Passing adapter and fallback test output
- Logs showing provider failure followed by successful non-AI completion of the same workflow
- A brief data-boundary note documenting what content is allowed to cross the AI adapter

### Step 7a evidence
- Passing notification rule and delivery test output
- A demo artifact showing push notification re-entry into the review flow
- Backup and restore test output

### Step 7b evidence
- Household validation notes plus follow-up updates to assumptions, learnings, or decisions as warranted

## Risks / Open Questions
### 1. Notification scope is still a bounded product risk
The source docs recommend due-soon, stale-item, and optional digest notifications, but they do not settle the minimum default-enabled set. This does not block core inbox implementation. It does mean notification rules should ship behind configuration, and the first household trial should explicitly record which rules were enabled and whether they felt calm or noisy.

### 2. The 14-day stale threshold should remain configurable
The spec and A-004 use 14 days as a placeholder. Engineering should implement it as a defaulted setting, not a hard-coded truth. The household trial should record false positives and missed stale items so the threshold can be tuned with evidence.

### 3. Spouse awareness remains intentionally narrow
Spouse read-only visibility is in scope; spouse proactive notification is not. This is not an implementation gap to paper over with hidden behavior. The plan should preserve role boundaries now and treat spouse awareness beyond active checking as a later product follow-up.

### 4. Prototype access control must stay bounded
The architecture docs defer the exact remote-access and authentication model. The implementation should therefore build role-aware server boundaries and a minimal prototype access seam, but avoid turning the first slice into a generalized auth project. If real household use requires broader remote access, that should become an explicit follow-up plan.

### 5. Versioned sync may need revision later
A-006 says versioned command sync is likely sufficient for the first workflow because write concurrency is low. The implementation should instrument conflicts and retries so the project has real evidence if spouse participation or multi-device use later demands stronger conflict handling.

## Deferred Follow-Ups
- Decide the default-enabled notification rules after initial household trial setup, not inside domain implementation.
- Revisit spouse participation only after primary-operator usefulness is validated.
- Revisit native shell thresholds only if PWA notification reliability, share-sheet capture, widgets, or shared-display usage become central.
- Revisit remote-access and authentication hardening once the first household runtime proves useful enough to preserve.

## Appendix A: Canonical Domain Defaults
These defaults remove schema guesswork for the first implementation slice.

### `inbox_items` default fields
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | string UUID | yes | generated on create | Stable item identifier across sync and history |
| `title` | string | yes | none | Human-readable item title |
| `description` | text nullable | no | `null` | Optional longer description |
| `owner` | enum | yes | `unassigned` | One of `stakeholder`, `spouse`, `unassigned` |
| `status` | enum | yes | `open` | One of `open`, `in_progress`, `done`, `deferred` |
| `due_at` | datetime nullable | no | `null` | Normalized due date or due-start anchor if parsed |
| `due_text` | string nullable | no | `null` | Original user phrasing such as "end of March" |
| `created_at` | datetime | yes | set on create | Canonical store timestamp |
| `updated_at` | datetime | yes | set on every write | Canonical store timestamp |
| `version` | integer | yes | `1` | Increment on every confirmed write |
| `last_status_changed_at` | datetime | yes | same as `created_at` | Used for stale logic and audit clarity |
| `last_note_at` | datetime nullable | no | `null` | Optional note activity marker |
| `archived_at` | datetime nullable | no | `null` | Leave unused in the first slice unless a later plan revision defines archiving |

### `inbox_item_history` default fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string UUID | yes | Stable history row id |
| `item_id` | string UUID | yes | Foreign key to the inbox item |
| `actor_role` | enum | yes | `stakeholder` or `system_rule` in the first slice; spouse writes are out of scope |
| `event_type` | enum | yes | `created`, `status_changed`, `owner_changed`, `due_changed`, `description_changed`, `note_added` |
| `from_value` | JSON nullable | no | Previous state fragment for the changed field |
| `to_value` | JSON nullable | no | New state fragment for the changed field |
| `created_at` | datetime | yes | Canonical event timestamp |

### Summary and suggestion defaults
- Active review view includes `open` and `in_progress` items by default.
- `deferred` items appear in a separate section when explicitly included in review output.
- `done` items are excluded from the default active view but remain queryable in item detail/history.
- Overdue means `due_at` is in the past and `status` is still `open` or `in_progress`.
- Stale means no status change for 14 or more days and `status` is `open` or `in_progress`.
- Due soon means the item is due within the next 7 days. Keep this as a defaulted setting, not a hidden constant.

## Appendix B: Status Transition Matrix
Use this matrix for the first implementation slice.

| From | To | Allowed | Confirmation required | History event |
|---|---|---|---|---|
| `open` | `in_progress` | yes | yes | `status_changed` |
| `open` | `done` | yes | yes | `status_changed` |
| `open` | `deferred` | yes | yes | `status_changed` |
| `in_progress` | `open` | yes | yes | `status_changed` |
| `in_progress` | `done` | yes | yes | `status_changed` |
| `in_progress` | `deferred` | yes | yes | `status_changed` |
| `deferred` | `open` | yes | yes | `status_changed` |
| `deferred` | `in_progress` | yes | yes | `status_changed` |
| `deferred` | `done` | yes | yes | `status_changed` |
| `done` | `open` | yes | yes | `status_changed` |
| `done` | `in_progress` | yes | yes | `status_changed` |
| `done` | `deferred` | yes | yes | `status_changed` |
| any status | same status | no-op | no | none |

Default rule details:
- Every allowed status change increments `version`, updates `updated_at`, and updates `last_status_changed_at`.
- Invalid transitions should return a validation error rather than silently coercing the status.
- The first slice allows reopening items because household tasks are often marked done optimistically and later revived.

## Appendix C: API Contract Examples
These are reference examples for the first implementation slice. Field names may be refined, but the preview-versus-confirm structure should remain.

### Example: preview add-item draft
Request:
- route: `POST /api/inbox/items/preview-create`
- body fields:
  - `actorRole`: `stakeholder`
  - `inputText`: `Add: schedule HVAC service, due end of March, owner me`

Response:
- `draftId`
- `parsedItem` with `title`, `owner`, `status`, `dueText`, `dueAt`
- `parseConfidence`
- `ambiguities` array
- `requiresConfirmation: true`

### Example: confirm add-item draft
Request:
- route: `POST /api/inbox/items/confirm-create`
- body fields:
  - `actorRole`: `stakeholder`
  - `draftId`
  - `approved: true`
  - `finalItem`

Response:
- `savedItem`
- `historyEntry`
- `newVersion`

### Example: preview update
Request:
- route: `POST /api/inbox/items/preview-update`
- body fields:
  - `actorRole`: `stakeholder`
  - `itemId`
  - `expectedVersion`
  - `proposedChange`

Response:
- `draftId`
- `currentItem`
- `proposedItem`
- `requiresConfirmation: true`

### Example: confirm update
Request:
- route: `POST /api/inbox/items/confirm-update`
- body fields:
  - `actorRole`: `stakeholder`
  - `draftId`
  - `itemId`
  - `expectedVersion`
  - `approved: true`

Response:
- `savedItem`
- `historyEntry`
- `newVersion`

### Example: read-only inbox query
Request:
- route: `GET /api/inbox/items?view=active&actorRole=spouse`

Response:
- `itemsByStatus`
- `suggestions` as read-only metadata only
- no write tokens or draft ids

### Example: rejected spouse write
Response:
- HTTP 403
- error code: `ROLE_READ_ONLY`
- message: spouse may view inbox items but may not create, update, or remove them in this phase

### Example: version conflict
Response:
- HTTP 409
- error code: `VERSION_CONFLICT`
- payload includes `currentItem`, `currentVersion`, and `retryGuidance`

## Appendix D: Sync Sequence Defaults
Implement these sequences before adding optimizations.

### Online happy path
1. Client loads cached household state.
2. Client pulls latest server state.
3. Stakeholder previews an item create or update.
4. Stakeholder confirms the draft.
5. Client sends confirmed command immediately.
6. Server validates command, writes canonical state, appends history, increments version, and returns updated item.
7. Client updates cache from canonical response.

### Offline confirmed-create path
1. Client loads cached household state and detects offline mode.
2. Stakeholder creates a draft locally and confirms it locally.
3. Client writes the confirmed command to the local outbox.
4. UI marks the item as pending sync.
5. Connectivity returns.
6. Client pushes outbox commands in creation order.
7. Server accepts the command and returns canonical item state.
8. Client clears the outbox entry and removes the pending-sync badge.

### Version-conflict path
1. Client submits a confirmed update with `expectedVersion`.
2. Server detects the item is already at a newer version.
3. Server returns `409 VERSION_CONFLICT` plus current canonical item state.
4. Client preserves the user's intended change as unsynced local intent.
5. Client shows a review-and-retry state instead of silently overwriting or dropping the change.

### Default sync rules
- Do not queue unconfirmed drafts in the outbox.
- Push outbox commands in FIFO order.
- Initial implementation may use full snapshot pull on launch, then incremental pulls using a sync cursor.
- If incremental sync becomes brittle during early delivery, prefer a safe full refresh over clever partial merge logic.

## Appendix E: Route And Screen Checklists
Use these checklists to declare route completeness.

### Inbox review route
Must include:
- grouped sections for `open`, `in_progress`, and optionally `deferred`
- owner filter
- due-soon and overdue indicators
- at most two prioritized suggestions
- loading, empty, offline-stale, and error states

### Add-item route
Must include:
- freeform input box
- parsed draft preview
- correction affordance for title, owner, due text, and status
- explicit confirm button
- fallback structured entry mode when AI is unavailable
- loading, parse-error, low-confidence, and offline states

### Item detail/history route
Must include:
- current canonical item fields
- history list
- status change action
- owner change action
- due-date change action
- note add action
- explicit confirmation UI before submission

### Notification re-entry route
Must include:
- a clear reason for why the user arrived
- the relevant filtered review view or item detail
- a visible path back to the main inbox review screen

### Settings route
Must include:
- installability guidance if the app is not installed
- notification subscription status
- role context display
- minimal sync/debug information for early validation

### Spouse read-only route behavior
- Reuse inbox review and item detail views where possible.
- Hide or disable write controls rather than showing controls that fail late.
- Never expose create, confirm, or update actions to the spouse in the first slice.

## Appendix F: Non-AI Fallback Defaults
These defaults ensure the workflow still works when the AI provider is unavailable.

### Structured add-item input
Support these fields in fallback mode:
- title
- owner
- due text
- status
- description

Default fallback syntax may be either a small form or a structured text format such as:
- `title: Schedule HVAC service`
- `owner: stakeholder`
- `due: end of March`
- `status: open`
- `description: Call preferred vendor first`

### Plain summary output
When AI is unavailable, render:
- grouped item lists by status
- owner and due metadata inline
- deterministic labels such as `overdue`, `due soon`, `stale`, `unassigned`
- zero AI-written prose required

### Low-confidence parse behavior
- Highlight the ambiguous fields explicitly.
- Require the user to confirm or correct the highlighted fields before save.
- Do not silently null out ambiguous fields unless the user confirms the omission.

### AI boundary defaults
- Send only the minimum text needed for parsing or summary generation.
- Do not send history logs, full household exports, or unrelated item records to the AI provider.
- Provider failure must degrade to fallback UX, not to blocked writes.

## Appendix G: Acceptance Criteria Traceability
Use this table to verify that implementation and testing cover the approved spec.

| Acceptance criterion | Primary implementation steps | Minimum verification evidence |
|---|---|---|
| AC1: parse then confirm before save | Steps 3, 5, 6 | API preview/confirm tests plus UI add-item flow evidence |
| AC2: confirmed items persist across sessions | Steps 2, 4, 5 | persistence test plus reconnect/session-reload evidence |
| AC3: inbox view groups active items by status | Steps 2, 3, 5 | query test plus review-screen evidence |
| AC4: status updates require confirmation | Steps 3, 5 | update preview/confirm tests plus UI confirmation evidence |
| AC5: overdue items are flagged | Steps 2, 3, 5 | domain rule test plus summary output evidence |
| AC6: stale items are surfaced after threshold | Steps 2, 3, 5, 7b | stale-rule test plus household trial notes on threshold quality |
| AC7: non-AI add path still works | Steps 5, 6 | provider-failure test plus fallback add evidence |
| AC8: spouse can view but not write | Steps 3, 5 | authorization tests plus spouse read-only UI evidence |
| AC9: suggestion acceptance still goes through confirmation | Steps 3, 5, 6 | suggestion-to-confirmation integration test |
| AC10: done items leave active view but remain retrievable | Steps 2, 3, 5 | status-change persistence test plus item-detail retrieval evidence |
