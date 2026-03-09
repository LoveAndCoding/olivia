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

## Implementation Steps
### Step 1: Establish the codebase and module boundaries
**Outcome:** A runnable TypeScript codebase exists with explicit client, server, domain, and infrastructure seams that match the approved architecture.

**Work items**
- Create the initial workspace layout for:
  - a PWA app directory for the React + Vite client
  - an API app directory for the Fastify runtime
  - a domain package for inbox rules and commands
  - a contracts package for shared Zod schemas and API types
  - an optional UI package only if shared UI primitives are needed early
- Set up TypeScript project references, linting, formatting, unit test runner, and end-to-end test runner.
- Add the approved baseline libraries: TanStack Router, TanStack Query, Dexie, Fastify, Zod, Drizzle, SQLite driver, `vite-plugin-pwa`, `date-fns`, `chrono-node`, Web Push wrapper, and Pino.
- Define the top-level environment contract for local runtime paths, SQLite location, AI provider settings, and optional notification configuration.
- Add a single-command local development workflow that runs the API and PWA together.

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

**Notes**
- This step is complete only if the workflow still works with AI fully disabled.
- AI logging should distinguish provider failures from domain failures.

### Step 7: Add rules-based notification plumbing and household validation instrumentation
**Outcome:** Olivia can support calm, primary-operator prompts without turning notifications into a second inbox, and the team can gather evidence for M4 learning updates.

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
- Prepare a short household validation protocol covering:
  - two weeks of real capture and review use
  - trust in durability across sessions
  - signal-to-noise judgment on suggestions and notifications
  - validation of A-004, A-005, and A-006

**Notes**
- The existence of notification plumbing does not force all candidate prompts to be enabled on day one.
- Spouse notifications remain out of scope.

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

### Step 7 verification
- Run notification rule tests for due-soon, stale, and digest eligibility.
- Manually test push subscription, delivery, tap-through, and re-entry into the PWA review flow.
- Run backup and restore verification against a copy of the SQLite database.
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

### Step 7 evidence
- Passing notification rule and delivery test output
- A demo artifact showing push notification re-entry into the review flow
- Backup and restore test output
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
