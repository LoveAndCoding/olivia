# Feature Spec: Dynamic User Assignment

## Status
- Draft

## Summary
Replace all hardcoded user names ("Lexi", "Christian") and role-based assignment (`stakeholder`/`spouse`/`unassigned`) with dynamic assignment driven by the household members API. Assignment pickers and display labels should show actual user names from the authenticated user list, making the multi-user experience real rather than cosmetic.

## User Problem
- When creating or editing tasks, reminders, and routines, the assignment picker shows hardcoded names ("Lexi", "Christian") instead of actual household members.
- The `Owner` type (`stakeholder | spouse | unassigned`) is a role enum, not a user reference. This means the system can only ever support exactly two named users with fixed roles.
- With M32's multi-user auth and household members API in place, the assignment system should use real user identities. The current state feels "faux multi-user" — the board's exact words.

## Target Users
- Primary: all authenticated household members
- Secondary: future household members added via invitation

## Desired Outcome
- Every assignment picker in the app shows actual household member names pulled from the `/api/household/members` endpoint.
- Display labels throughout the app (detail pages, banners, avatars) show the authenticated user's real name, not a hardcoded string.
- The system gracefully handles households with 1, 2, or more members.

## In Scope
1. **Replace the `Owner` enum with `userId`-based assignment** across contracts, API, and database.
2. **Assignment pickers** — `EditTaskSheet`, `CreateReminderSheet`, `EditReminderSheet`, and any routine assignment UI should populate options from `getHouseholdMembers()`.
3. **Display labels** — `ownerLabel()` in `reminder-helpers.ts` and all hardcoded name references should resolve names from user data.
4. **Data migration** — existing records using `stakeholder`/`spouse` roles must be migrated to corresponding `userId` values.
5. **"Unassigned" option** — remains available as a null/unset assignment (no user selected).
6. **Avatar and banner labels** — `HomeView`, `SpouseBanner`, `TasksView` "viewing as" text should use real names.

## Boundaries, Gaps, And Future Direction
- **Not in scope**: per-user filtering or views (e.g., "show only my tasks"). This is a display/assignment fix, not a filtering feature.
- **Not in scope**: changing the ownership model for chat messages or AI interactions.
- **Future**: households with 3+ members (the schema should support it, but UI/UX for larger households is deferred).
- **Future**: assignment permissions (e.g., can a member assign to someone else without their consent).

## Workflow

### Creating a task/reminder
1. User opens create sheet (task, reminder, or routine).
2. Assignment picker fetches household members via existing `getHouseholdMembers()` API (already used in `HouseholdSection`).
3. Picker shows each member by name, plus "Unassigned".
4. User selects a member. The selected `userId` is stored on the entity.

### Editing assignment
1. User opens edit sheet for an existing entity.
2. Picker shows household members with the current assignee pre-selected.
3. User changes assignment. The new `userId` is saved.

### Displaying assignment
1. Anywhere the app currently shows "Lexi" / "Christian" / "Unassigned", it resolves the `userId` to the user's `name` from cached household member data.
2. If the `userId` cannot be resolved (e.g., member removed), display "Unknown user".

## Behavior
- Assignment is stored as a `userId` (UUID string) or `null` (unassigned).
- The `ownerSchema` enum (`stakeholder | spouse | unassigned`) is replaced with an optional `userId` field.
- The `ownerLabel()` helper is replaced with a lookup function that resolves `userId` → `name` from household member data.
- Current user is pre-selected as default assignee when creating new entities (matching current "stakeholder" default behavior, but using the actual logged-in user).

## Data And Memory
- **Schema change**: entities that currently store `owner: Owner` should store `assigneeUserId: string | null`.
- **Migration**: existing `stakeholder` records map to the admin user's ID; `spouse` records map to the first non-admin member's ID; `unassigned` maps to `null`.
- **Household members are already cached** via React Query in the app — the assignment picker should use the same query.

## Permissions And Trust Model
- No trust model changes. Assignment is a user-initiated, non-destructive action — executes immediately per D-010.
- Any authenticated household member can assign any entity to any other member.

## AI Role
- AI chat entity creation should use `userId` instead of role-based owner when proposing new items.
- If AI cannot determine which user to assign to, it should default to the requesting user or leave unassigned.

## Risks And Failure Modes
- **Migration risk**: if the stakeholder/spouse → userId mapping is incorrect, existing assignments will point to the wrong person. Mitigation: validate mapping against the users table before migrating.
- **Offline/unauthenticated edge case**: if household members can't be fetched, the picker should show a loading state or fall back to showing only the current user + "Unassigned".
- **Single-user household**: picker should show only the current user + "Unassigned" (no empty state).

## UX Notes
- This should feel seamless — users see real names everywhere instead of hardcoded ones.
- The assignment picker should be a simple select/segmented control, same interaction pattern as today.
- No new screens or navigation changes required.

## Acceptance Criteria
1. Assignment pickers in `EditTaskSheet`, `CreateReminderSheet`, `EditReminderSheet`, and routine assignment UI show actual household member names fetched from the API.
2. No hardcoded user names ("Lexi", "Christian") remain anywhere in the client codebase.
3. The `ownerLabel()` function in `reminder-helpers.ts` is replaced with a dynamic name resolver.
4. The `OWNERS` constant in `EditTaskSheet.tsx` is replaced with API-driven options.
5. All display surfaces (detail pages, home view avatars, banners, "viewing as" text) show real user names.
6. Existing data is migrated from role-based owner to userId-based assignee.
7. "Unassigned" remains a valid option in all pickers.
8. Default assignee for new entities is the currently authenticated user.
9. All component class names have corresponding CSS styles and render as visually specified.
10. `npm run typecheck` passes with zero errors.

## Validation And Testing
- Unit tests for the new name resolver function.
- Integration tests for assignment pickers with mocked household members data.
- E2E test: create a task, assign to spouse, verify the spouse's name appears on the task detail page.
- Migration test: verify existing role-based records are correctly converted to userId-based records.

## Dependencies And Related Learnings
- M32 multi-user infrastructure (auth, household members API, user sessions)
- D-010: non-destructive user actions execute immediately
- `getHouseholdMembers()` in `auth-api.ts` — already implemented
- `useAuth()` hook — provides current authenticated user
- `HouseholdSection.tsx` — reference implementation for fetching and displaying household members

## Open Questions
- **Q1**: Should the `Owner` type be fully removed from contracts, or kept as a deprecated alias during transition? Recommendation: remove it — clean break, M32 already shipped the replacement infrastructure.
- **Q2**: Should the migration handle the edge case where auth is disabled (local development mode)? The `auth.tsx` creates a synthetic `{ id: 'local', name: 'Local User' }` — migration should handle this gracefully.

## Facts, Assumptions, And Decisions
- **Fact**: `getHouseholdMembers()` API exists and returns `{ members: User[] }` with `id`, `name`, `email`, `role`.
- **Fact**: `ownerSchema = z.enum(['stakeholder', 'spouse', 'unassigned'])` is the current assignment type used across all workflow entities.
- **Fact**: 14+ files reference hardcoded names or the `ownerLabel()` function.
- **Assumption**: households will have 1-2 members for the foreseeable future (but schema should not artificially limit this).
- **Decision**: replace role-based enum with userId reference rather than adding a name mapping table — simpler, uses existing infrastructure.

## Deferred Decisions
- Per-user task filtering/views
- Assignment notifications (e.g., "Christian assigned you a task")
- Household member removal and its effect on existing assignments
