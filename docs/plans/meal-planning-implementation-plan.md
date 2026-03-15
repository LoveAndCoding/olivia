# Meal Planning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add meal planning to Olivia as the fourth Horizon 3 workflow, extending the existing modular monolith with meal plan and meal entry domain objects, persistence, API routes, offline-tolerant PWA sync, and mobile-first meal planning surfaces. A meal plan is a weekly grid where the household assigns meals to days, adds shopping items per meal, and generates a grocery list via the existing Shared Lists infrastructure. Spouse access is read-only. No AI dependency in Phase 1.

**Architecture:** Implement meal planning as a sibling workflow to inbox items, reminders, shared lists, and recurring routines inside the existing TypeScript modular monolith. Reuse all established seams: contracts/domain/API/PWA layering, immediate execution for non-destructive user-initiated actions, confirmation for destructive actions, SQLite canonical persistence, Dexie offline cache and outbox, and versioned command concurrency semantics. Grocery list generation reuses the Shared Lists domain directly — no new shared primitives required.

**Tech Stack:** TypeScript, Zod, date-fns, Fastify, better-sqlite3, Drizzle schema definitions, React, TanStack Router, TanStack Query, Dexie.

---

## Summary

This plan turns the approved meal planning spec and visual implementation spec into an execution-ready build sequence without reopening product strategy. The meal planning workflow extends Olivia's existing four-workflow implementation:

- meal plans are first-class records with a title, week start date (Monday), and status (`active` | `archived`)
- meal entries are child records belonging to a single plan, each with a day-of-week (0=Monday through 6=Sunday), a name, an ordered list of shopping items (plain text strings), a position (creation order within the day), and version support
- shopping items are stored denormalized on the meal entry row as a JSON array of plain text strings (see Architecture Decision A below)
- generating a grocery list is a sync (inline) API call that creates a new Shared List using the existing list domain; navigation to the new list uses the list ID returned from the server (see Architecture Decision B below)
- archive and delete always require confirmation; all other user-initiated actions execute immediately
- spouse access is read-only with a per-screen banner; write controls are not shown
- no AI dependency in the first implementation slice
- advisory-only trust rules remain in force
- no push notifications in Phase 1

Planning readiness is satisfied:

- `docs/specs/meal-planning.md` is approved (D-021, CEO, 2026-03-15)
- `docs/plans/meal-planning-visual-implementation-spec.md` is complete (OLI-32)
- All four visual spec design decisions are resolved (nav placement, weekly layout, shopping items entry, generate CTA affordance)
- The feature spec states "no blocking questions for the first implementation slice"
- All 13 acceptance criteria are specified and verifiable

## Architecture Decisions Resolved In This Plan

The spec and visual spec deferred two FE architecture decisions to the Founding Engineer. This plan documents the chosen approach for each so implementation does not require a product escalation.

### Decision A: Shopping item storage granularity — denormalized vs. separate sub-collection

**Chosen approach:** Shopping items are stored **denormalized on the meal entry row** as a JSON array TEXT column (`shopping_items TEXT NOT NULL DEFAULT '[]'`). Items are read and written as a single ordered list together with the meal record.

**Rationale:** Items are always accessed in the context of their parent meal — there is no use case in Phase 1 that requires querying items across meals, filtering items independently, or updating a single item without touching the meal. Storing them as a JSON array in the meal row:
- eliminates a join on every meal read
- keeps the repository and API layers simple (no `meal_shopping_items` table, no sub-collection endpoints)
- aligns with the visual spec's plain-text textarea model: items are parsed from the textarea string into an array on save, and rendered from the array on load
- preserves the ordered list structure needed for grocery list generation (day order, then meal order within day, then item order within meal)
- avoids premature normalization before household usage reveals whether items need independent identity

If Phase 2 adds structured quantities, categories, or cross-meal deduplication, a schema migration can extract items into a sub-table at that point. The current domain and contracts model (`shoppingItems: string[]`) makes that migration straightforward.

### Decision B: Grocery list generation — sync vs. async flow

**Chosen approach:** Grocery list generation is a **synchronous inline API call**. On "Generate Grocery List" tap, the PWA calls `POST /api/meal-plans/:planId/generate-grocery-list` directly (not via the outbox), shows a loading state on the sticky footer button, then either navigates to the newly created Shared List on success, or surfaces a toast error on failure.

**Rationale:**
- The spec requires navigating the user to the newly created list immediately after generation. The new list's ID is only known once the server has created it — an async/outbox approach would require polling or a websocket to learn the new ID.
- The visual spec (§7.9) explicitly disables the Generate button when offline: "Generating a list requires a connection." This makes the outbox model incorrect — the generate action is not designed to be deferred.
- The generate action is non-destructive (it creates a new list and does not modify the plan or any existing list), so immediate execution with a loading state is the correct D-010 treatment.
- The Shared Lists domain layer already has a `createSharedList` helper and the repository already has `createSharedList` + `addListItem` methods. The generate route composes these directly, collecting all shopping items from all meals in the plan in day-and-meal order and creating a single Shared List record plus item rows in a transaction.

**One-time bulk item insert:** When generating, all shopping items from all meals are collected into a flat ordered array and written as individual `list_items` rows in a single database transaction. Bulk insert (one transaction, many rows) is more efficient than per-item transactions and is consistent with Phase 1 simplicity. Each item is a separate row in `list_items`, making the generated list indistinguishable from a manually assembled list in the Shared Lists surface.

## Open Design Questions — Resolution for Phase 1

The visual spec flags 7 open design questions (§10). This plan resolves each for Phase 1 implementation:

1. **Day order (Sunday vs Monday):** Monday-first (ISO 8601, `dayOfWeek=0` = Monday). A user preference is deferred. Household feedback will determine if Sunday-first is needed.
2. **Meal reordering:** Phase 1 uses creation-order positioning only. No drag-to-reorder. Implement using append-only `position = MAX(position) + 1` per day within a plan.
3. **Shopping items as structured rows vs. plain text:** Textarea model for Phase 1 — items are stored as a JSON array; rendered as a read-only list in collapsed card and a pre-populated textarea in expanded card. Backend stores array; frontend parses textarea on save.
4. **Home screen summary widget:** Deferred. Not in scope for Phase 1.
5. **Push to existing list:** Deferred. Always create new list in Phase 1.
6. **Archived plan browsing:** Flat scroll for Phase 1. Calendar-style grouping is deferred until household archive history accumulates.
7. **Spouse write access:** Deferred per spec and all existing Horizon 3 workflows.

## Source Artifacts
- `docs/specs/meal-planning.md`
- `docs/plans/meal-planning-visual-implementation-spec.md`
- `docs/specs/shared-lists.md`
- `docs/roadmap/milestones.md`
- `docs/strategy/system-architecture.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`

Relevant durable guidance carried into this plan:

- `D-002`: advisory-only trust model remains active
- `D-004`: primary-operator model remains active; spouse write parity is deferred
- `D-007`: installable mobile-first PWA remains the canonical near-term surface
- `D-008`: local-first modular monolith with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes require confirmation; destructive writes always require confirmation regardless of initiator
- `D-016`: shared lists are a proven primitive; meal planning grocery generation depends on and extends it directly
- `D-019`: meal planning is the confirmed next Horizon 3 spec target; first slice is weekly planning with grocery list generation
- `D-021`: meal planning spec approved by CEO, 2026-03-15
- `A-006`: versioned command sync is sufficient for household-level meal plan concurrency

## Assumptions And Non-Goals

### Assumptions
- The current codebase with working inbox, first-class reminders, shared lists, and recurring routines is the base to extend.
- Shopping items stored as a denormalized JSON array on the meal entry row is sufficient for Phase 1 without structural cost to Phase 2.
- The `createSharedList` and `addListItem` repository methods can be called from the generate-grocery-list route handler to create the output list. No new shared list primitives are needed.
- The offline outbox and sync plumbing used by prior workflows can be reused for meal plan commands with minimal adaptation.
- Spouse read-only enforcement follows the same role-check pattern already used in reminder, list, and routine routes.
- The `assertStakeholderWrite` helper pattern from existing domain modules covers meal planning writes without modification.

### Non-Goals
- Spouse write access to meal plans or meal entries
- Recipe management, nutrition tracking, or ingredient categories
- Shopping item quantities or units
- Drag-to-reorder meals within a day or across days
- Recurring meal plan templates
- Pushing shopping items to an existing list (always creates a new one)
- AI-assisted meal suggestions
- Push notifications
- Home screen meal plan summary widget
- Meal plan history analytics or calendar-style archive browsing
- Multi-week or freeform date-range plans

## Canonical Meal Plan And Entry Record Model

- One `meal_plans` row per meal plan. Plans do not embed meal data.
- One `meal_entries` row per meal, with a foreign key to the parent plan.
- Shopping items are stored as a JSON array in the `shopping_items TEXT` column on `meal_entries`. No separate items table in Phase 1.
- Position within a day uses an append-only integer (`position = MAX(position for this planId + dayOfWeek) + 1`). No reordering support.
- Generated list references are stored as a JSON array in `generated_list_refs TEXT` on the `meal_plans` row: `[{ "listId": "...", "generatedAt": "..." }, ...]`.
- Archiving sets `archived_at` and `status = 'archived'` on the plan row. Meal entries are not deleted on archive.
- Deletion permanently removes the plan row and cascades to all meal entry rows. Generated Shared Lists are not deleted.
- Version fields on plan rows support optimistic concurrency detection. Meal entry rows also carry a version field.

## Current Codebase Anchors

Use these existing modules as the extension points:

- `packages/contracts/src/index.ts`: shared schemas, commands, query payloads, outbox command shapes
- `packages/domain/src/index.ts`: domain helpers, role enforcement, list and routine helpers as structural reference
- `packages/domain/test/`: existing test files as reference for test structure
- `apps/api/src/app.ts`: Fastify routes and role enforcement
- `apps/api/src/repository.ts`: SQLite persistence transactions (including `createSharedList` and `addListItem`)
- `apps/api/src/db/schema.ts`: Drizzle schema declarations
- `apps/api/drizzle/0003_recurring_routines.sql`: most recent migration; new meal planning migration follows as `0004`
- `apps/api/src/db/client.ts`: ordered runtime migration runner
- `apps/api/test/api.test.ts`: API integration test home
- `apps/pwa/src/lib/api.ts`: typed client API calls
- `apps/pwa/src/lib/sync.ts`: offline-aware command/query wrapper
- `apps/pwa/src/lib/client-db.ts`: Dexie cache and outbox
- `apps/pwa/src/router.tsx`: route tree
- `apps/pwa/src/routes/home-page.tsx`: home summary surface
- `apps/pwa/src/routes/lists-page.tsx`: list index surface (structural reference for plan index layout and filter chip pattern)
- `apps/pwa/src/routes/list-detail-page.tsx`: list detail (structural reference for plan detail layout)
- `apps/pwa/src/routes/routines-page.tsx`: routines index (reference for Household hub segment control — adding "Meals" as third segment)
- `apps/pwa/src/routes/settings-page.tsx`: settings surface

---

## Implementation Phases

### Phase 1: Expand shared contracts for meal planning
**Outcome:** Client, server, and domain share a stable meal plan and meal entry vocabulary and API contract before implementation logic spreads across layers.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**
- Add meal plan enums and base schemas:
  - `mealPlanStatusSchema`: `active | archived`
  - `dayOfWeekSchema`: `z.number().int().min(0).max(6)` (0=Monday, 6=Sunday)
  - Meal plan and meal entry event type values: `meal_plan_created`, `meal_plan_title_updated`, `meal_plan_archived`, `meal_plan_restored`, `meal_plan_deleted`, `meal_entry_added`, `meal_entry_name_updated`, `meal_entry_items_updated`, `meal_entry_deleted`, `grocery_list_generated`
- Add meal plan entity schemas:
  - `generatedListRefSchema`: `{ listId: string (uuid), generatedAt: string (datetime) }`
  - `mealPlanSchema`: id, title, weekStartDate (ISO date string, always a Monday), status, generatedListRefs (array of `generatedListRefSchema`), createdAt, updatedAt, archivedAt (nullable), version
  - `mealEntrySchema`: id, planId, dayOfWeek (`dayOfWeekSchema`), name, shoppingItems (array of strings), position, createdAt, updatedAt, version
- Add meal plan query response schemas:
  - `mealPlanIndexResponseSchema`: `{ plans: mealPlanSchema[], totalCount: number }` (index cards; does not include meal entries)
  - `mealPlanDetailResponseSchema`: plan plus full `mealEntrySchema` array for all days (`{ plan: mealPlanSchema, entries: mealEntrySchema[] }`)
  - Include summary fields on `mealPlanSchema` used by index cards: `mealCount` (derived), `shoppingItemCount` (derived), `hasPendingCommands` (client-side only, not persisted)
- Add meal plan command/request schemas:
  - `createMealPlanRequestSchema`: `{ title: string (min 1), weekStartDate: string (ISO date) }`
  - `updateMealPlanTitleRequestSchema`: `{ title: string (min 1), expectedVersion: number }`
  - `archiveMealPlanRequestSchema`: `{ confirmed: true, expectedVersion: number }`
  - `restoreMealPlanRequestSchema`: `{ expectedVersion: number }`
  - `deleteMealPlanRequestSchema`: `{ confirmed: true }`
  - `addMealEntryRequestSchema`: `{ dayOfWeek: dayOfWeekSchema, name: string (min 1) }`
  - `updateMealEntryNameRequestSchema`: `{ name: string (min 1), expectedVersion: number }`
  - `updateMealEntryItemsRequestSchema`: `{ shoppingItems: string[] (each min 1 after trim), expectedVersion: number }`
  - `deleteMealEntryRequestSchema`: `{ confirmed: true }`
- Add grocery list generation schema:
  - `generateGroceryListResponseSchema`: `{ list: sharedListSchema, generatedListRef: generatedListRefSchema }` — returns the newly created Shared List and the reference stored on the plan
- Extend `outboxCommandSchema` with meal plan command variants for:
  - `meal_plan_create`: commandId, actorRole, planId, title, weekStartDate
  - `meal_plan_title_update`: commandId, actorRole, planId, expectedVersion, title
  - `meal_plan_archive`: commandId, actorRole, planId, expectedVersion, confirmed: true
  - `meal_plan_restore`: commandId, actorRole, planId, expectedVersion
  - `meal_plan_delete`: commandId, actorRole, planId, confirmed: true
  - `meal_entry_add`: commandId, actorRole, planId, entryId, dayOfWeek, name
  - `meal_entry_name_update`: commandId, actorRole, planId, entryId, expectedVersion, name
  - `meal_entry_items_update`: commandId, actorRole, planId, entryId, expectedVersion, shoppingItems
  - `meal_entry_delete`: commandId, actorRole, planId, entryId, confirmed: true
  - Note: `generate_grocery_list` is NOT an outbox command — it is a sync direct call (see Architecture Decision B)
- Keep all existing contracts (inbox, reminder, list, routine) intact.

**Verification**
- Typecheck all packages.
- Add schema parsing tests for representative meal plan and entry command payloads.
- Confirm archive, delete (plan), and delete (entry) are modeled as commands that require `confirmed: true`.
- Confirm restore is modeled as a non-destructive command without a confirmation field.
- Confirm `dayOfWeekSchema` rejects values outside 0–6.
- Confirm `shoppingItems` array allows empty arrays (a meal may have no shopping items).
- Confirm grocery list generation is NOT in the outbox union (it is a direct sync API call only).

**Evidence required**
- Contract diff showing new meal plan, entry schemas, and outbox variants
- Passing contract/typecheck output

---

### Phase 2: Add meal planning domain rules and helpers
**Outcome:** Meal plan behavior — including status derivation, shopping item parsing, grocery list item collection, and role enforcement — is deterministic and testable without API, UI, or AI dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create or modify: `packages/domain/test/meal-planning-domain.test.ts`

**Work items**
- Add meal plan creation helpers:
  - `createMealPlan(title, weekStartDate)` producing a new plan record with `status = 'active'`, empty `generatedListRefs`, and `version = 1`. The `weekStartDate` must be a Monday; validate and throw if not.
  - `updateMealPlanTitle(plan, newTitle)` returning an updated plan record with incremented version.
  - `archiveMealPlan(plan)` setting `status = 'archived'` and `archivedAt = now`.
  - `restoreMealPlan(plan)` clearing `archivedAt` and setting `status = 'active'`.
  - `addGeneratedListRef(plan, ref)` appending a `generatedListRefSchema` entry to `plan.generatedListRefs` and incrementing version.
- Add meal entry helpers:
  - `addMealEntry(planId, dayOfWeek, name, position)` producing a new entry record with `shoppingItems = []` and `version = 1`.
  - `updateMealEntryName(entry, newName)` returning an updated entry with incremented version.
  - `updateMealEntryItems(entry, shoppingItems)` returning an updated entry with the new items array and incremented version. Trim each item string; filter out empty strings after trimming.
  - `parseMealEntryItemsFromText(rawText)` converting a plain-text string (newline- or comma-separated) into a `string[]` of trimmed, non-empty item strings. This is the client-side parse helper for the textarea model.
- Add grocery list collection helper:
  - `collectGroceryItems(entries)` returning a flat ordered `string[]` of all shopping items from all meal entries, in day order (0 through 6), then creation-order (by `position`) within each day, then item order within each entry's `shoppingItems` array. This is the canonical order for grocery list generation.
- Add meal plan summary derivation:
  - `deriveMealPlanSummary(entries)` returning `{ mealCount: number, shoppingItemCount: number }` for use on index cards.
- Add role enforcement:
  - Reuse or extend `assertStakeholderWrite(actorRole)` from the existing domain module. Meal planning write operations all require the stakeholder role; spouse attempts return a clear read-only error.
- Add weekStartDate utility:
  - `getMondayOfWeek(date)` returning the Monday (00:00:00 local) of the week containing the given date. Used for the default plan title and `weekStartDate` default in the create flow.
  - `formatWeekRange(weekStartDate)` returning a human-readable string like "Mar 10 – Mar 16" for display in index cards and plan detail subtitles.
- Keep inbox, reminder, list, and routine domain helpers separate from meal planning helpers.

**Verification**
- Domain tests for:
  - `createMealPlan` produces a valid plan with `status = 'active'` and empty `generatedListRefs`
  - `createMealPlan` throws when `weekStartDate` is not a Monday
  - `archiveMealPlan` and `restoreMealPlan` round-trip correctly
  - `addMealEntry` with `shoppingItems = []` and with a populated array
  - `updateMealEntryItems` trims strings and filters empties
  - `parseMealEntryItemsFromText` handles newline-separated, comma-separated, and mixed inputs; handles blank lines; handles leading/trailing whitespace
  - `collectGroceryItems` produces items in correct day-then-position-then-item order across a multi-day, multi-meal plan
  - `collectGroceryItems` on a plan with no shopping items returns `[]`
  - `deriveMealPlanSummary` on an empty entries array returns `{ mealCount: 0, shoppingItemCount: 0 }`
  - `getMondayOfWeek` returns the correct Monday for a midweek date, a Monday, and a Sunday
  - `assertStakeholderWrite` rejects spouse role with a clear error
  - `addGeneratedListRef` appends to the array and increments plan version

**Evidence required**
- Passing meal planning domain test output
- Representative tests showing `collectGroceryItems` ordering and `parseMealEntryItemsFromText` edge cases

---

### Phase 3: Add persistence schema and repository support
**Outcome:** SQLite can durably store meal plans, meal entries (with shopping items as JSON), and generated list references alongside all existing workflow data.

**Primary files**
- Create: `apps/api/drizzle/0004_meal_planning.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/src/db/client.ts`

**Work items**
- Add meal planning tables in `0004_meal_planning.sql`:
  - `meal_plans`: id (TEXT PK), title (TEXT NOT NULL), week_start_date (TEXT NOT NULL, ISO date), status (TEXT NOT NULL DEFAULT 'active'), generated_list_refs (TEXT NOT NULL DEFAULT '[]'), created_at (TEXT NOT NULL), updated_at (TEXT NOT NULL), archived_at (TEXT NULLABLE), version (INTEGER NOT NULL DEFAULT 1)
  - `meal_entries`: id (TEXT PK), plan_id (TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE), day_of_week (INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6)), name (TEXT NOT NULL), shopping_items (TEXT NOT NULL DEFAULT '[]'), position (INTEGER NOT NULL DEFAULT 0), created_at (TEXT NOT NULL), updated_at (TEXT NOT NULL), version (INTEGER NOT NULL DEFAULT 1)
  - Index: `CREATE INDEX meal_entries_plan_id_idx ON meal_entries(plan_id)`
  - Index: `CREATE INDEX meal_entries_plan_day_idx ON meal_entries(plan_id, day_of_week, position)`
- Register `0004_meal_planning.sql` in the ordered runtime migration runner in `apps/api/src/db/client.ts`.
- Confirm migration runner idempotency: existing databases through `0003` upgrade without data loss.
- Add Drizzle table declarations to `apps/api/src/db/schema.ts` for `mealPlans` and `mealEntries`.
- Add repository methods:
  - `listMealPlans(status?)` — all active plans (default) or filtered by `'archived'`; returns plan rows without entries (index view)
  - `getMealPlan(planId)` — single plan by id
  - `getMealEntries(planId)` — all entries for a plan ordered by `day_of_week ASC, position ASC`
  - `getNextMealEntryPosition(planId, dayOfWeek)` — returns `MAX(position) + 1` for the given plan+day, or 0 if no entries yet
  - `createMealPlan(fields)` — insert plan row
  - `updateMealPlan(id, changes, expectedVersion)` — transactional update with version check (rejects stale version with a conflict error)
  - `deleteMealPlan(id)` — hard delete plan row; `meal_entries` cascade via FK
  - `addMealEntry(fields)` — insert entry row
  - `updateMealEntry(id, changes, expectedVersion)` — transactional entry update with version check
  - `deleteMealEntry(id)` — delete entry row
  - `addGeneratedListRef(planId, ref, expectedVersion)` — appends a `generatedListRefSchema` entry to `generated_list_refs` JSON column and increments plan version; transactional
- Preserve transactionality: plan version increments and generated_list_refs updates must commit together in `addGeneratedListRef`.
- Keep repository method boundaries explicit; do not collapse meal planning tables into list or routine tables.

**Verification**
- Fresh database boot succeeds with all five migration files (`0000` through `0004`) applied.
- Existing databases at each prior migration level (`0000`, `0001`, `0002`, `0003`) upgrade successfully to `0004` without data loss.
- Repository tests (or API-backed integration tests) prove: plan create, entry add, entry items update, plan archive/restore, plan delete (cascades entries), generated list ref append.
- Version conflict detection rejects stale updates with an explicit error for both plan and entry rows.
- `getMealEntries` returns entries in `day_of_week ASC, position ASC` order consistently.

**Evidence required**
- Schema/migration diff showing `0004_meal_planning.sql`
- Passing upgrade tests from each prior database fixture
- Passing persistence or API integration evidence against a fresh SQLite database
- Sample DB inspection showing a plan row with `generated_list_refs` JSON and entry rows with `shopping_items` JSON

---

### Phase 4: Add API routes and role enforcement
**Outcome:** The server exposes meal plan queries and commands, preserves trust-model rules, returns clear errors for spouse write attempts, and provides the generate-grocery-list sync endpoint.

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**
- Add meal plan query routes:
  - `GET /api/meal-plans` — active plans with derived `mealCount`, `shoppingItemCount`, and `generatedListCount` summary fields (no entry details)
  - `GET /api/meal-plans/archived` — archived plans (same summary fields)
  - `GET /api/meal-plans/:planId` — single plan with all entries (`mealPlanDetailResponseSchema`)
- Add meal plan command routes:
  - `POST /api/meal-plans` — create plan (stakeholder only; execute immediately; returns created plan)
  - `PATCH /api/meal-plans/:planId` — update plan title (stakeholder only; execute immediately; requires `expectedVersion`)
  - `POST /api/meal-plans/:planId/archive` — archive plan (stakeholder only; requires `confirmed: true` and `expectedVersion`)
  - `POST /api/meal-plans/:planId/restore` — restore archived plan (stakeholder only; execute immediately; requires `expectedVersion`)
  - `DELETE /api/meal-plans/:planId` — delete plan permanently (stakeholder only; requires `confirmed: true`)
- Add meal entry command routes:
  - `POST /api/meal-plans/:planId/entries` — add meal entry to a day (stakeholder only; execute immediately; returns created entry; position assigned server-side via `getNextMealEntryPosition`)
  - `PATCH /api/meal-plans/:planId/entries/:entryId` — update entry name or shopping items (stakeholder only; execute immediately; requires `expectedVersion`)
  - `DELETE /api/meal-plans/:planId/entries/:entryId` — delete entry (stakeholder only; requires `confirmed: true`)
- Add grocery list generation route:
  - `POST /api/meal-plans/:planId/generate-grocery-list` — stakeholder only; execute immediately (sync)
  - Handler: fetch plan + all entries → collect items via `collectGroceryItems(entries)` → if empty, return 400 with message "No shopping items found" → call existing repository `createSharedList` + `addListItem` (one per item) in a single transaction → call `addGeneratedListRef(planId, { listId, generatedAt })` on the plan → return `generateGroceryListResponseSchema` with the new list and ref
  - This route does NOT go through the outbox; it is a direct sync call that returns the new Shared List object including its `id` for PWA navigation
- Role enforcement (all write routes):
  - Stakeholder: full access to all commands
  - Spouse: GET queries succeed; any write command (POST, PATCH, DELETE) returns `403` with message "spouse may view meal plans but may not create, edit, or remove them in this phase"
- Apply D-010 trust semantics at the API layer:
  - Non-destructive routes (create plan, update title, add entry, update entry, restore plan, generate grocery list) execute immediately with no confirmation signal required
  - Destructive routes (archive plan, delete plan, delete entry) require `confirmed: true` in request body; reject without it
- Due-state summary derivation:
  - `mealCount` and `shoppingItemCount` for index responses: computed in the route handler by querying entries for each plan (or via a single aggregating query) before returning plan list

**Verification**
- API integration tests for:
  - Stakeholder create plan → update title → add entries → update entry items → archive → restore → delete flows
  - Stakeholder add entry to each day (day 0 through 6)
  - Stakeholder delete entry → entry removed; plan summary counts update
  - Stakeholder generate grocery list → new Shared List created with correct title ("Grocery — [plan title]") and correct items in correct order
  - Second generate → new Shared List created; previous list not modified; plan has two `generatedListRefs` entries
  - Generate grocery list with no shopping items → 400 response
  - Spouse GET `/api/meal-plans` and `/api/meal-plans/:planId` succeed
  - Spouse write commands return `403` read-only errors
  - Version conflicts on plan and entry updates return a clear conflict error
  - Archive and delete routes reject requests without `confirmed: true`
  - Archived plans appear in `/api/meal-plans/archived` and NOT in `/api/meal-plans`
  - Deleted plans and entries are permanently removed; generated Shared Lists survive plan deletion

**Evidence required**
- Passing API test output
- Request/response examples for plan create, entry add, items update, generate grocery list (including list content), archive, and delete flows
- Evidence that spouse write attempts return clean `403` errors
- Evidence that generated list is indistinguishable from a manually created Shared List in the `GET /api/lists` response

---

### Phase 5: Extend PWA API client, sync, and offline cache
**Outcome:** Meal plan data participates in the same offline-tolerant client architecture as all existing workflow data. Generate grocery list is an online-only direct API call, not an outbox command.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`
- Modify or create: `apps/pwa/src/lib/api.test.ts`

**Work items**
- Add typed meal plan API clients:
  - fetch active plan index
  - fetch archived plan index
  - fetch plan detail (with entries)
  - create plan
  - update plan title
  - archive plan (with `confirmed: true`)
  - restore plan
  - delete plan (with `confirmed: true`)
  - add meal entry
  - update meal entry (name or shopping items)
  - delete meal entry (with `confirmed: true`)
  - `generateGroceryList(planId)` — direct POST, returns `generateGroceryListResponseSchema`; NOT routed through outbox
- Extend Dexie schema with meal planning stores:
  - `meal_plans` cache table (plan records without full entry arrays; summary fields derived for index)
  - `meal_entries` cache table (keyed by entry id, with planId index)
  - Meal plan outbox command variants (all except generate)
- Add meal plan cache builders:
  - active plan index from cached plan records with derived `mealCount` and `shoppingItemCount`
  - plan detail fallback when offline (plan + entries from cache)
- Extend outbox flushing for meal plan command variants (plan create, plan title update, plan archive, plan restore, plan delete, entry add, entry name update, entry items update, entry delete).
- Preserve D-010 client behavior:
  - non-destructive commands (plan create, title update, entry add, entry name/items update, restore) execute via direct outbox commands with optimistic UI
  - destructive commands (archive plan, delete plan, delete entry) require the explicit `confirmed: true` signal before queuing in the outbox
  - `generateGroceryList` bypasses the outbox entirely; show loading state; disable button if offline
- Keep outbox FIFO; do not queue unconfirmed destructive commands.
- Preserve existing inbox, reminder, list, and routine sync behavior; do not regress any prior workflow.

**Offline generate guard:**
- If the user is offline when tapping "Generate Grocery List," show a tooltip on long-press: "Generating a list requires a connection." and update the footer copy to "Connect to generate your grocery list." (per visual spec §7.9).
- The generate button should be conditionally disabled based on `navigator.onLine` (or the app's existing offline detection pattern).

**Verification**
- Client sync tests for:
  - Offline plan creation (optimistic plan in index, outbox entry queued)
  - Offline meal entry addition (optimistic entry in plan detail, outbox entry queued)
  - Offline entry items update (optimistic items in cache, outbox entry queued)
  - Reconnect outbox flush for all meal plan command variants
  - Version-conflict marking for meal plan commands
  - Cached plan index and detail fallback when offline
  - `generateGroceryList` is NOT in the outbox (verify no outbox entry is created for this action)

**Evidence required**
- Passing `apps/pwa/src/lib/api.test.ts` or equivalent sync test output
- Dexie schema diff showing meal plan and entry cache tables and outbox variants
- Confirmation that generate grocery list is a direct sync call with no outbox path

---

### Phase 6: Build meal planning surfaces in the PWA
**Outcome:** Olivia has a meal-planning-aware user experience that adds the Meals segment to the Household hub without displacing Lists or Routines.

**Primary files**
- Modify: `apps/pwa/src/router.tsx`
- Modify: `apps/pwa/src/routes/routines-page.tsx` (or the Household hub segment control component) — extend from 2 to 3 segments
- Modify: `apps/pwa/src/routes/lists-page.tsx` — extend segment control to include Meals segment navigation
- Create: `apps/pwa/src/routes/meals-page.tsx` — plan index surface
- Create: `apps/pwa/src/routes/meal-detail-page.tsx` — plan detail surface

**Work items**

#### Household hub segment control update
- Extend the segment control from `[Lists] [Routines]` to `[Lists] [Routines] [Meals]`.
- All three segments activate the Household bottom nav tab highlight.
- Add `'meals'` to the `NavTab` type (or equivalent routing type). Route: `/household/meals` (or `/meals`; follow existing convention).
- Each segment navigates to its own route; active segment is visually indicated (`--violet` bg pill, white text, 16px radius).

#### Meals index surface (`meals-page.tsx`)
- Screen header: Fraunces 28px/700 "Meals" title + Plus Jakarta Sans 13px/400 `--ink-2` subtitle "N plans · N active".
- Segment control strip (three segments, Meals active).
- Filter chips row: "Active" | "Archived" (same pattern as Lists page).
- "New Plan" dashed button below filter chips (same dashed style as "New list" in Lists).
  - On tap: open CREATE-PLAN-1 bottom sheet (title input, pre-filled with `getMondayOfWeek(today)` formatted as "Week of Mar 10", primary "Create plan" button).
  - On submit: create plan immediately; navigate to plan detail (MEAL-DET-5 empty state).
- Plan cards list (active or archived depending on selected filter):
  - Each card: `--violet` left border (active) or `--ink-4` (archived), plan title, week range subtitle, "N meals · N shopping items" meta, grocery list badge if generated, "ARCHIVED" badge if archived.
  - Three-dot overflow menu: active → "Edit title", "Archive", "Delete"; archived → "Restore", "Delete".
  - On card tap: navigate to plan detail.
- Empty state (zero plans in filter): Fraunces italic Olivia message per visual spec §3 screen states.
- Loading skeleton state.
- Offline indicator when data is from cache.
- Spouse read-only: spouse banner below header; overflow menus absent; "New Plan" button hidden; filter chips functional.

#### Plan detail surface (`meal-detail-page.tsx`)
- Screen header: back link "← Meals", Fraunces 28px/700 plan title (wraps to 2 lines max), Plus Jakarta Sans 13px/400 `--ink-2` week range subtitle, three-dot overflow (active: "Edit title", "Archive", "Delete"; archived: "Restore", "Delete").
- Spouse banner (when spouse role) per §2.8.
- Generated list reference rows (per §2.7): `--mint-soft` bg rows, one per generated list, newest first, max 3 visible, "Show all" if more exist. Each row links to the Shared List detail.
- Seven day sections (Monday–Sunday), always all rendered:
  - Day label: ALL CAPS, Plus Jakarta Sans 10px/700, `--ink-3`.
  - Day divider above label (except first day).
  - Meal cards for that day in position order.
  - Inline add input below meals (hidden for archived plans and spouse).
- Meal card:
  - Collapsed: meal name (14px/500), shopping count meta or "Add shopping items" (`--ink-3`), expand chevron (rotates 90° when expanded), three-dot overflow (Edit name, Delete meal).
  - Expanded: card bg shifts to `--surface-2`, existing items list above textarea, shopping items textarea (auto-grow to 5 lines, placeholder per spec), "Save" button when text present; `aria-expanded` attribute on container.
  - Expand/collapse: `transition: max-height 0.2s ease, opacity 0.2s ease`.
  - `prefers-reduced-motion`: no transition, immediate.
- Inline meal add input: dashed `--lavender-mid` border, Fraunces italic placeholder "Add a meal for [Day]...", "+" submit button on right when text present.
- Sticky footer (Generate Grocery List CTA):
  - State 1 (no shopping items): ghost muted button with explanatory copy; `pointer-events: none`; `aria-disabled="true"`.
  - State 2 (≥1 shopping item): full-width `--violet` button "Generate Grocery List" with cart icon; on tap: show loading spinner; call `generateGroceryList(planId)`; on success navigate to new Shared List detail; on error show toast.
  - State 3 (after generation): `--lavender-soft` bg "Generate Again" button + "Last generated [relative time]" sub-label.
  - Offline guard: if `navigator.onLine === false`, show "Connect to generate your grocery list." copy; button disabled.
  - Footer not rendered for archived plans or spouse role.
- Confirmation sheets (bottom sheet pattern):
  - Archive plan: ACTION-ARCHIVE-PLAN copy per visual spec §3.
  - Delete plan: ACTION-DELETE-PLAN copy (includes plan title).
  - Delete meal: ACTION-DELETE-MEAL copy (includes meal name).
  - Restore plan: No sheet — executes immediately with a 5-second "Restored to active plans. Undo" banner.
- Offline indicators: `--sky` sync dot on meal cards with pending outbox commands; offline banner at top of scroll area.
- Scroll area bottom padding: 120px to clear sticky footer + bottom nav.

#### EDIT-TITLE-PLAN and EDIT-MEAL-1 sheets
- Both reuse the existing bottom sheet pattern.
- Edit title: pre-fill with current plan title; save updates immediately.
- Edit meal name: pre-fill with current meal name; save updates immediately.

#### Accessibility
- Day section labels: `<h3>` or `role="heading" aria-level="3"`.
- Meal card expand: `aria-expanded`, `aria-controls`.
- Shopping items textarea: `aria-label="Shopping items for [meal name]"`.
- Generate button: `aria-disabled="true"` and `aria-label="Generate grocery list (requires shopping items)"` in disabled state.
- Offline banner: `role="status"`.
- Spouse banner: `role="note"` with `aria-label="Read-only view"`.
- Focus states: `box-shadow: 0 0 0 4px var(--violet-glow)` on all focusable elements.
- Sheet overlays: trap focus while open; return focus to trigger on close.
- `prefers-reduced-motion`: disable all transition/stagger animations; sheet and expand transitions use `transition-duration: 0.01ms`.

**Verification**
- UI tests or route-level integration tests for:
  - Meals segment renders in the Household hub segment control; tapping activates Meals route
  - Plan index renders with active plans and the "New Plan" button
  - Create plan flow: sheet opens, default title pre-filled, submit navigates to empty plan detail
  - Plan detail renders all 7 day sections with inline add inputs
  - Add meal entry: inline input submit adds meal card optimistically
  - Expand meal card: shopping textarea appears; save items updates card meta
  - Generate Grocery List: loading state on tap; navigates to new Shared List on success; error toast on failure
  - Generate again: second reference row appears in plan detail header
  - Archive plan: confirmation sheet; on confirm, plan moves to archived filter; no longer in active list
  - Restore plan: executes immediately with undo banner; plan returns to active list
  - Delete plan: higher-friction confirmation; plan and entries removed
  - Delete meal entry: confirmation sheet; entry removed from day section
  - Archived plan detail: no add inputs, no footer, overflow shows Restore + Delete
  - Spouse view: banner present; no add inputs; no overflow menus; no New Plan button; no sticky footer
  - Offline meal add: optimistic entry appears; sync dot shown; flushes on reconnect
  - Generate button disabled when offline (copy changes, `aria-disabled` set)

**Evidence required**
- Screenshots or demo recording of: plan index, empty plan detail (MEAL-DET-5), plan with meals and items (MEAL-DET-2), expanded meal card (MEAL-DET-3), plan with generated list reference (MEAL-DET-4), archived plan detail (MEAL-DET-6), spouse read-only view (MEAL-DET-7)
- Manual QA notes for mobile viewport and installed-PWA behavior
- Confirmation that existing Lists, Routines, inbox, and reminder surfaces are not regressed
- Confirmation that the Household hub segment control now shows three segments

---

### Phase 7: Final verification, documentation sync, and milestone evidence
**Outcome:** The feature is implementable end to end with clear proof it meets the approved spec scope, addresses all 13 acceptance criteria, and has not absorbed any deferred workflow.

**Primary files**
- Modify as needed: tests in `packages/domain/test`, `apps/api/test`, `apps/pwa/src/lib/api.test.ts`, and UI/e2e test locations
- Update durable docs only if implementation reveals a genuine conflict or new durable decision

**Work items**
- Run the highest-signal automated suites for:
  - domain (plan/entry creation, shopping item parsing, grocery item collection, role enforcement, summary derivation)
  - API (plan queries, commands, generate grocery list, role checks, version conflicts, confirmation enforcement)
  - PWA sync and client logic (outbox flush, cached plan detail fallback, generate direct call)
  - Meal planning UI or end-to-end flows
- Execute a manual checklist covering all 13 acceptance criteria:
  1. Create plan → appears in index with correct default title; persists across sessions
  2. Add meal to day → appears under that day immediately in plan detail
  3. Add shopping items → persist on meal entry; plan total shopping item count updates
  4. Generate grocery list (≥1 shopping item) → new Shared List "Grocery — [plan title]" with all items in day-and-meal order
  5. After generation → user navigated to new Shared List; plan detail records a reference
  6. Generate second time → new Shared List created (first not modified); plan detail shows both with timestamps
  7. Archive plan → moves to archived status; no longer in active view; visible in history
  8. Delete plan → plan and all entries permanently removed; previously generated Shared Lists survive
  9. Spouse → sees plan index and detail; cannot create, edit, add meals, add items, generate, archive, or delete
  10. Spouse → per-screen role banner communicates read-only view
  11. Offline → add meal/items writes to outbox; UI reflects optimistic state; flushes on reconnect
  12. No AI dependency → all structured actions work without AI availability
  13. Agentic write → Olivia cannot create/modify meal plan without explicit user confirmation
- Execute a manual checklist for scope boundaries:
  - No spouse write paths implemented
  - No AI meal suggestions
  - No push notifications
  - No recipe management
  - No drag-to-reorder
  - No recurring plan templates
  - No push-to-existing-list flow
  - No multi-week plans
- If implementation forces a durable decision not covered by the two architecture decisions above, update `docs/learnings/decision-history.md` or `docs/learnings/assumptions-log.md` explicitly.
- Update `docs/roadmap/milestones.md` to reflect Meal Planning implementation completion within M7.
- Post issue comment on OLI-33 (this task) with implementation summary, any deviations, and links to the implementation PRs/commits.

**Verification**
- All targeted automated suites pass.
- Manual QA confirms all 13 acceptance criteria from `docs/specs/meal-planning.md`.
- Scope review confirms no deferred product area was quietly implemented.
- Generated grocery lists are indistinguishable from manually created Shared Lists in the Shared Lists surface.
- Milestone evidence documented.

**Evidence required**
- Command output for passing targeted suites
- Manual QA notes or video covering the 13 acceptance criteria
- Confirmation of grocery list generation order (day → meal → item) matching AC #4
- Confirmation that Architecture Decision A (denormalized JSON items) and B (sync generate call) were validated or documented with any nuance discovered during implementation

---

## Verification Matrix

### Contracts and domain
- Schema parsing tests for meal plan and entry command payloads pass.
- Domain tests prove plan creation (including Monday validation), archive/restore, entry add/update/items-update, shopping item text parsing, grocery item collection ordering, list summary derivation, and spouse write rejection.
- `generateGroceryListResponseSchema` is not present in the `outboxCommandSchema` union.

### API and persistence
- Fresh database boot and meal plan/entry persistence succeed.
- Existing databases at all four prior migration levels upgrade successfully before meal plan routes are exercised.
- API tests prove stakeholder write access, spouse read access, spouse write rejection, version conflicts, confirmation enforcement (archive, delete plan, delete entry), and archived filter behavior.
- Generate grocery list route creates a correctly named and populated Shared List; generated list appears in `GET /api/lists`; generated list reference is stored on the plan.
- Delete plan permanently removes plan and entries; generated Shared Lists survive.

### PWA and offline behavior
- Client sync tests prove meal plan and entry commands queue offline and flush later.
- Plan index and detail render from cache when offline.
- Generate grocery list is a direct call; outbox is not involved.
- Generate button disabled state and copy change when offline.
- Installed-PWA behavior works on mobile-sized layouts.

### UI and UX
- All 9 screen states from visual spec Groups 1–5 are implemented:
  - MEAL-IDX-1 through MEAL-IDX-5
  - MEAL-DET-1 through MEAL-DET-8
  - CREATE-PLAN-1, EDIT-TITLE-PLAN, EDIT-MEAL-1
  - ACTION-ARCHIVE-PLAN, ACTION-DELETE-PLAN, ACTION-DELETE-MEAL
  - POST-GEN-1, POST-GEN-2
- Household hub shows three segments (Lists, Routines, Meals).
- Design token usage matches visual spec §1.2 throughout.

### Scope control
- Review confirms the implementation does not include spouse write access, AI features, push notifications, recipe management, drag-to-reorder, recurring templates, multi-week plans, or push-to-existing-list flow.

---

## Risks / Open Questions

### 1. Shopping items textarea parse edge cases
The plain-text textarea model (newline or comma-separated) is flexible but requires robust parsing. Edge cases: trailing commas, multiple blank lines, Unicode whitespace, very long item strings. The `parseMealEntryItemsFromText` domain helper (Phase 2) should be the single authoritative parser with comprehensive tests. If parsing reveals the textarea model is too ambiguous, escalate to VP of Product before building the UI.

### 2. Grocery list generation transactional scope
The generate route creates a Shared List (`createSharedList`), multiple `addListItem` rows, and updates the plan's `generated_list_refs` (`addGeneratedListRef`) — three repository operations. These should be wrapped in a single SQLite transaction to prevent partial writes. Confirm that the repository layer supports a caller-provided transaction context or that the generate route can compose these in one `db.transaction()` call.

### 3. Segment control layout at narrow widths
Three segments at equal width on a 390px screen with 16px padding gives ~116px per pill. "Routines" is 8 characters and will be the widest label. At very narrow widths (< 360px), test that the segment control does not overflow. The `overflow-x: auto; scrollbar-width: none` rule on the strip is the fallback, but verify it does not create a confusing partial-view on standard phones.

### 4. Generated list navigation — list route
After `generateGroceryList` succeeds and returns the new list ID, the PWA navigates to the Shared List detail. Confirm the existing Shared List detail route accepts a direct `/lists/:listId` navigation from outside the Household hub and that the back link from the generated list reads "← Lists" (not "← Meals").

### 5. Plan summary field derivation on index route
The plan index response requires `mealCount` and `shoppingItemCount` per plan, but meal entries are in a separate table. For a small household (a few plans, a few entries each), a per-plan subquery is acceptable. If the plan index grows large, consider adding summary columns to the `meal_plans` table and updating them on entry changes. Phase 1 should use the subquery approach and note the optimization opportunity in the assumptions log if the query proves slow.

### 6. A-006 assumption validation for meal planning
This implementation is another validation of A-006 (versioned command sync is sufficient for household-level concurrency). If two devices simultaneously add meals to the same day, later writes win per the version conflict model. No richer conflict UI is needed in Phase 1. Document any edge cases encountered in the assumptions log.
