---
title: "Olivia — Meal Planning: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Meal Planning
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Meal Planning feature for Olivia. It covers design tokens and typography rules, component anatomy, all screen states with precise layout specs, interaction rules and approval model, data fields surfaced per component, and edge cases.
>
> Key design decisions resolved here: navigation placement (third segment in Household hub), weekly plan layout (days as rows), shopping items entry (inline expandable on meal card), and Generate Grocery List affordance (sticky footer CTA). These are documented with rationale so future agents do not re-derive them.
>
> **Reused without change:** The per-screen spouse read-only banner (`--lavender-soft` bg, `--violet` text, per L-009), the filter chip pattern (Active/Archived), the bottom sheet pattern for confirmations, and the dashed "New" button pattern from Shared Lists are directly inherited. No new design decisions are needed for these primitives.

---

## 0. Design Decisions Resolved

The following questions were open in `docs/specs/meal-planning.md` and are resolved here.

### 0.1 Navigation Placement

**Decision:** Meal Planning becomes a third segment ("Meals") in the Household hub. The Household tab segment control expands from two segments to three:

```
┌────────────────────────────────────────────────┐
│  [ Lists ]  [ Routines ]  [ Meals ]            │   ← segment pill strip
└────────────────────────────────────────────────┘
```

The bottom nav is unchanged — the Household tab (☑ icon) remains the fifth tab, and all three segments activate the same tab highlight.

**Rationale:** The Household hub was explicitly designed as "the natural future home for meal planning and other coordination workflows" (recurring routines spec, §0.1). A new sixth tab would crowd the bottom nav and imply that Meal Planning is a peer to Tasks or Memory, which it is not — it is a household coordination workflow of the same tier as Lists and Routines. A third segment in the hub is the correct placement: it keeps the coordination workflows together, keeps the nav uncluttered, and follows the hub model as intended. The segment label "Meals" is appropriately short (5 characters) and fits comfortably alongside "Lists" and "Routines" in the strip.

**Updated bottom nav (unchanged structure):**
```
┌────────┬────────┬────────┬────────────┬────────┐
│ 🏡 Home│ ✅Tasks│  ✦ AI │ ☑ Household│🗂️Memory│
└────────┴────────┴────────┴────────────┴────────┘
```

**Implementation notes:**
- The `NavTab` type already includes routing for `'lists'` and `'routines'`. Add a `'meals'` value. All three routes activate the Household tab highlight.
- When the user is on the Meals segment and taps "Lists" or "Routines" in the segment control, navigate to the corresponding route. Both `/meals` and the existing hub routes must activate the Household nav item.
- The segment control strip `overflow-x: auto; scrollbar-width: none` is already specified for the hub. Three short labels fit without scrolling on a 390px screen at standard padding, but the overflow rule ensures graceful handling if a fourth segment is added later.
- No new token is needed.

### 0.2 Weekly Plan Layout

**Decision:** Days are displayed as rows in a scrollable list — Monday through Sunday, each as a named section header with meal entries stacked beneath it.

**Rationale:** The weekly row layout is more legible than a grid on mobile for two reasons. First, multi-meal days (e.g. both a breakfast and a dinner on Monday) cannot fit meaningfully into a grid cell on a 390px screen without compression or truncation; rows give each meal adequate visual space. Second, the primary interaction is adding and reading meal names — a linear scroll is faster to execute and easier to read than a grid requiring horizontal scanning. The spec explicitly calls for "seven days as a scrollable list" in the primary workflow. A condensed grid would be appropriate for a calendar overview widget on a future Home screen summary, not for the plan detail surface where writing happens.

**Empty days:** All seven days are always visible even with no meals, per the spec's explicit anti-pattern call-out ("hiding empty days breaks the visual weekly structure"). Empty day sections show a placeholder inline add input.

### 0.3 Shopping Items Entry

**Decision:** Inline expandable section on the meal card. Tapping a meal card expands it in-place to reveal a multiline textarea and the existing items list. Tapping the meal name again (or tapping outside) collapses it.

**Rationale:** The spec states "shopping items per meal should be a plain text input — not a structured list-within-a-list modal. Simplicity matters more than structure here." A sheet or sub-detail navigation would add friction to what is intended to be a fast, inline interaction. An expandable inline section keeps the user oriented within the plan (they can see which day they are editing and which meals are above and below) while providing a focused text entry surface. This approach avoids the anti-pattern of "requiring a modal for adding a meal to a day" and keeps the plan detail as the single primary surface.

**Input behavior:** The shopping items textarea uses a plain text model. Items may be entered one per line or comma-separated — both are valid. The textarea auto-grows to show all entered text (capped at 5 lines visible before scrolling within the textarea). The placeholder copy sets expectations: *"What do you need to buy? One item per line or comma-separated."*

### 0.4 Generate Grocery List Affordance

**Decision:** A sticky footer CTA button pinned above the bottom nav in the plan detail view. The button is conditionally prominent: it is a full-width violet primary button ("Generate Grocery List") when at least one shopping item exists across the plan; it is a ghost/muted state with explanatory copy when the plan has no shopping items.

**Rationale:** The spec calls the Generate Grocery List action "the workflow's payoff" and states it "should be prominent in the plan detail view once at least one shopping item exists." A sticky footer follows the established pattern from Shared Lists (sticky add input footer), placing the primary CTA within thumb reach at the bottom of the screen. A floating action button (FAB) was considered but rejected — Olivia's design system has no FAB precedent and it would overlap the plan content. A button at the top of the plan was considered but rejected — it would be above the fold and require scrolling back up after adding meals. The sticky footer is always visible and always reachable.

**Footer state transitions:**
- No shopping items anywhere in the plan → muted ghost state ("Add shopping items to any meal to generate a grocery list")
- ≥1 shopping item in the plan → full violet primary button ("Generate Grocery List")
- After generation: button label changes to "Generate Again" (secondary style); a reference row appears at the top of the plan detail showing the most recent generated list with a link and timestamp

---

## 1. Design System Constraints

All Meal Planning UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`. Key constraints are summarised below.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Meal Planning** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "Meals" screen header |
| Segment control label | Plus Jakarta Sans | 13px | 600 | "Lists" / "Routines" / "Meals" switcher pills |
| Plan index card title | Plus Jakarta Sans | 14px | 600 | Plan title in card |
| Plan detail title | Fraunces | 28px | 700 | Plan title at top of detail screen |
| Day section header | Plus Jakarta Sans | 10px | 700 | ALL CAPS day label: "MONDAY", "TUESDAY" |
| Meal card name | Plus Jakarta Sans | 14px | 500 | Meal name on card |
| Shopping item text | Plus Jakarta Sans | 13px | 400 | Individual shopping item in expanded view |
| Shopping items count | Plus Jakarta Sans | 12px | 400 | "3 items" meta on collapsed meal card |
| Generate button | Plus Jakarta Sans | 14px | 700 | Sticky footer CTA |
| Olivia message | Fraunces italic | 15–16px | 300 | Empty states, advisory messages |
| Meta / count | Plus Jakarta Sans | 11–12px | 400–500 | Meal counts, week range, generated list timestamps |
| Badge / label | Plus Jakarta Sans | 10px | 700 | ALL CAPS: "ARCHIVED", filter chips |
| Spouse banner | Plus Jakarta Sans | 13px | 500 | Read-only role indicator text |
| Generated list reference | Plus Jakarta Sans | 13px | 500 | Link text for generated list rows |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light Value** | **Dark Value** |
|---|---|---|---|
| Active plan left border | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Archived plan left border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Meal card expanded bg | `--surface-2` | `#F3F0FF` | `#242038` |
| Shopping items textarea border | `--lavender-mid` | `#D4CCFF` | `#3D3660` |
| Shopping items textarea border (focus) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Generate button (active) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Generate button (inactive/ghost) | `--surface-2` / `--ink-3` | bg: `#F3F0FF`, text: `rgba(26,16,51,0.3)` | bg: `#242038`, text: `rgba(237,233,255,0.35)` |
| Generated list reference bg | `--mint-soft` | `#E0FFF9` | `#0A2820` |
| Generated list reference text | `--mint` | `#00C9A7` | `#00C9A7` |
| Day section header label | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| Day section divider | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Archived badge bg | `--surface-2` | `#F3F0FF` | `#242038` |
| Archived badge text | `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` |
| Spouse banner background | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Spouse banner text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Pending sync dot | `--sky` | `#48CAE4` | `#48CAE4` |
| Inline meal add input border | `--lavender-mid` | `#D4CCFF` | `#3D3660` |
| Inline meal add input border (active) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Card background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Sheet overlay | `--surface` | `#FFFFFF` | `#1C1A2E` |

### 1.3 Plan Status Visual Treatment

Plan index cards use a left border accent to communicate status at a glance, following the established card pattern.

| **Plan status** | **Border token** | **Card opacity** | **Notes** |
|---|---|---|---|
| Active (current or future week) | `--violet` | 100% | Default — primary workflow |
| Archived | `--ink-4` | 70% | Muted, no write affordances |

**No background fill on plan cards based on status.** The left border accent is sufficient. Filling the card background would make the archived plan history feel alarming — exactly the anti-pattern to avoid.

### 1.4 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Plan index card | 18px |
| Meal card (collapsed) | 14px |
| Meal card (expanded) | 14px outer; inner shopping items area has no separate radius |
| Shopping items textarea | 12px |
| Inline meal add input | 16px |
| Generate CTA footer add button | 12px |
| Filter chips (Active / Archived) | 20px (fully rounded) |
| Action buttons (primary, danger) | 12px |
| Spouse banner | 12px |
| Confirmation modal | 18px |
| Segment control pill strip | 20px outer; 16px inner pill |
| Generated list reference row | 12px |

---

## 2. Component Anatomy

### 2.1 Household Hub Segment Control (Extended)

Used in: The Household tab (shared between Lists, Routines, and Meals).

The segment control from the Recurring Routines spec (§2.1) is extended to support three segments. No structural changes — the strip grows to accommodate the third label.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Strip container | Full width minus 16px padding, `--surface-2` bg, 20px radius | `padding: 4px`, `margin-bottom: 16px` |
| Active segment pill | `--violet` bg, white text, 16px radius | fills the pill; `transition: all 0.2s ease` |
| Inactive segment label | `--ink-2` text, transparent bg | On tap: animate to active state |
| Segment labels | Plus Jakarta Sans 13px/600 | "Lists", "Routines", "Meals" |

**Three-segment layout:** Each segment takes equal width (`flex: 1`). "Meals" is a 5-character label — no truncation concern. On 390px with 16px outer padding, each pill is approximately 116px wide, which is comfortable for a 44px minimum touch target.

**Active label for Meals segment:** "Meals" pill uses `--violet` bg, white text. Identical treatment to Lists and Routines active states.

### 2.2 Plan Index Card

Used in: Meals index (Active and Archived filters).

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | 18px radius, `--surface` bg, `--shadow-sm`, `--ink-4` border | `border-left: 3px solid [status token]` per section 1.3 |
| Plan title | Plus Jakarta Sans 14px/600, `--ink`, single line truncated with ellipsis | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Week range | Plus Jakarta Sans 12px/400, `--ink-2` | "Mar 10 – Mar 16" below title |
| Meal count | Plus Jakarta Sans 11px/400, `--ink-3` | "N meals · N shopping items" in meta row |
| Grocery list badge | Pill: `--mint-soft` bg, `--mint` text, "✓ List generated", 20px radius | Shown when ≥1 grocery list has been generated from this plan |
| Archived badge | Pill: `--surface-2` bg, `--ink-2` text, "Archived", 20px radius | Shown on archived cards only |
| Overflow menu | Three-dot icon (···), right-aligned, 44×44px tap target | Active: Edit title, Archive, Delete. Archived: Restore, Delete |
| Pending sync dot | 6×6px `--sky` dot | Shown bottom-right when plan has offline-pending commands |

**Hover state:** `transform: translateX(3px)`, `box-shadow: var(--shadow-md)`, `border-color: var(--lavender-mid)`

**Press state:** `transform: scale(0.98)`

**Archived variant:** Opacity 0.7 on the entire card. `--ink-4` left border (faint). Overflow menu shows Restore + Delete only (no Archive). No write affordances.

### 2.3 Day Section Row

Used in: Plan detail. One per day (Monday through Sunday), always rendered even when empty.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Day label | Plus Jakarta Sans 10px/700, `--ink-3`, ALL CAPS | "MONDAY", "TUESDAY", etc. `padding: 14px 16px 6px`, `letter-spacing: 1.2px` |
| Day divider | 1px `--ink-4`, full width (no indent) | Above the day label, except the first day section |
| Meal cards area | Stack of `MealCard` components for this day | `padding: 0 16px`, `margin-bottom: 4px` |
| Inline add input | Below all meals for this day | See Section 2.5 |

**Empty day:** When a day has no meals, the inline add input is the only element below the day label. This keeps the structure visible and invites action without feeling like an error state.

### 2.4 Meal Card (Collapsed and Expanded)

Used in: Plan detail, under each day section.

**Collapsed state:**

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | 14px radius, `--surface` bg, `--shadow-sm`, `border: 1.5px solid var(--ink-4)` | `margin-bottom: 6px`, `padding: 10px 14px` |
| Meal name | Plus Jakarta Sans 14px/500, `--ink` | Single line, ellipsis if truncated |
| Shopping count | Plus Jakarta Sans 12px/400, `--ink-3` | "3 items" (when items exist) or "Add shopping items" in `--ink-3` (when empty) |
| Expand chevron | `--ink-3`, 16px, right-aligned | Rotates 90° to point down in expanded state; `transition: transform 0.2s ease` |
| Overflow menu | Three-dot icon (···), 44×44px tap target | Edit name, Delete meal |

**Expanded state:**

The card grows in-place. The meal name remains at top. Below it, a section for shopping items appears:

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Expanded container | Same 14px radius; background shifts to `--surface-2` | `padding: 10px 14px 14px` |
| Shopping items list | Existing items shown as a list above the textarea | Plus Jakarta Sans 13px/400, `--ink`, one item per line, `margin-bottom: 8px` |
| Shopping items textarea | Multiline, auto-grow up to 5 lines | `border: 1.5px solid var(--lavender-mid)`, `border-radius: 12px`, `padding: 8px 12px`, `font-size: 13px` |
| Textarea placeholder | Fraunces italic, `--ink-3` | *"What do you need to buy? One item per line or comma-separated."* |
| Save button | Plus Jakarta Sans 13px/700, `--violet` bg, white text, 12px radius | "Save items" — appears to the right of the textarea on the same row when text is present |
| Focus ring | `box-shadow: 0 0 0 4px var(--violet-glow)` | On textarea focus |

**Expand/collapse animation:** The shopping items section fades in and grows vertically — `transition: max-height 0.2s ease, opacity 0.2s ease`.

**Delete meal:** Accessible from the overflow menu (three dots) on the collapsed card. Opens ACTION-DELETE-MEAL sheet.

**No drag handle:** Phase 1. Meals are in creation order per day and cannot be reordered via drag.

### 2.5 Inline Meal Add Input

Used in: Plan detail, at the bottom of each day section.

This is the primary meal creation surface. It is not sticky — it scrolls with the day section.

- Container: `background: transparent`, `padding: 0 0 6px`
- Input field: `border: 1.5px dashed var(--lavender-mid)`, `border-radius: 16px`, `padding: 10px 14px`, `background: var(--surface)`, full-width
- Placeholder text: Fraunces italic, `--ink-3`, *"Add a meal for [Day]..."* (e.g. *"Add a meal for Monday..."*)
- Add button: Right side of input, `--violet` bg, white "+" icon, 32×32px, `border-radius: 10px`; visible when input has text
- Focus state: `border-color: var(--violet); border-style: solid; box-shadow: 0 0 0 4px var(--violet-glow)`
- On submit: meal card appears at top of that day's cards; input clears and remains focused

**Disabled in archived plans:** The inline add input is not rendered for archived plans (no write affordances).

**Disabled for spouse:** Not rendered for spouse role.

### 2.6 Generate Grocery List CTA Footer

Used in: Plan detail view. Sticky above the bottom nav.

This is the plan detail's sticky footer, replacing the function of the "Add item" sticky footer in Shared Lists. The meal-add inputs are inline (per §2.5), so the sticky footer is reserved for the Generate CTA.

**State 1 — No shopping items in the plan (ghost state):**
- Container: `--surface` bg, `border-top: 1px solid var(--ink-4)`, `padding: 12px 16px 16px`
- Button: full-width, `background: var(--surface-2)`, `border: 1.5px solid var(--ink-4)`, `border-radius: 12px`, `padding: 14px 16px`
- Button text: Plus Jakarta Sans 13px/500, `--ink-3`, "Add shopping items to any meal to generate a grocery list"
- Not tappable (`pointer-events: none`)

**State 2 — ≥1 shopping item exists (active state):**
- Container: `--surface` bg, `border-top: 1px solid var(--ink-4)`, `padding: 12px 16px 16px`
- Button: full-width, `background: var(--violet)`, `border-radius: 12px`, `padding: 14px 16px`, `box-shadow: var(--shadow-violet)`
- Button text: Plus Jakarta Sans 14px/700, white, "Generate Grocery List"
- Cart icon: `🛒` or a simple list icon (16px) to the left of the label
- On tap: executes immediately (user-initiated, non-destructive per D-010); navigates to new Shared List on completion

**State 3 — After generation (re-generate state):**
- Container: same as State 2 but secondary style
- Button: `background: var(--lavender-soft)`, `border: none`, `color: var(--violet)`, 14px/700, "Generate Again"
- Sub-label below button: Plus Jakarta Sans 11px/400, `--ink-3`, "Last generated [relative timestamp]" — e.g. "Last generated 2 hours ago"

**Spouse/archived plan:** Footer is not rendered (no generate affordance available to non-owners or on archived plans).

### 2.7 Generated List Reference Row

Used in: Plan detail header area, below the plan title/meta and above the day sections. Rendered for each generated list associated with the plan.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | `--mint-soft` bg, 12px radius, `padding: 10px 14px`, `margin: 0 16px 8px` | `display: flex; align-items: center; gap: 8px` |
| Mint dot | 8×8px `--mint` circle | Left-aligned |
| Link text | Plus Jakarta Sans 13px/500, `--mint` | "Grocery — [plan title]" → taps navigate to that Shared List |
| Timestamp | Plus Jakarta Sans 11px/400, `--ink-3`, right-aligned | "Generated [relative date]" |

**Multiple generated lists:** Each appears as a separate reference row, newest first (chronological descending). Max 3 rows shown; a "Show all" link appears if more exist.

**Dark mode:** `--mint-soft` resolves to `#0A2820` — a deep teal band. `--mint` link text is vivid and readable. No override needed.

### 2.8 Spouse Read-Only Banner (Reused)

Identical to the banner in Shared Lists (§2.6 of that spec) and Recurring Routines. No new design decisions needed.

Copy for Meal Planning: *"Viewing as household member — Lexi manages these meal plans."*

- Container: `--lavender-soft` bg, `border-radius: 12px`, `padding: 10px 16px`, `margin: 0 16px 12px`
- Text: Plus Jakarta Sans 13px/500, `--violet`
- No dismiss button — persists throughout session on any Meals screen

### 2.9 Confirmation / Destructive Sheets

All confirmation sheets follow the established bottom sheet pattern from Shared Lists §2.4 (handle, title, content, button row). Specific copy for Meal Planning is specified in Group 4 screen states below.

---

## 3. Screen States Reference

### Group 1 — Meals Index

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| MEAL-IDX-1 | Active plans, multiple | Light | Default view. "Active" filter chip selected. Plan cards stagger in (taskIn animation). New Plan button at top. Active plans show `--violet` left border. |
| MEAL-IDX-2 | Active plan with grocery list generated | Dark | Plan card shows `--mint-soft` "✓ List generated" pill badge in meta row. `--violet` left border retained. |
| MEAL-IDX-3 | Empty — no active plans | Light | "Active" chip selected. Large empty state: Fraunces italic Olivia message + dashed "New Plan" button. |
| MEAL-IDX-4 | Archived filter | Dark | "Archived" chip selected. Archived cards at 0.7 opacity with `--ink-4` left border. Overflow: Restore + Delete only. If no archived plans: Olivia empty state message. |
| MEAL-IDX-5 | Spouse read-only view | Light | Spouse banner pinned below header. All plan cards visible but overflow menu absent. New Plan button hidden. Filter chips functional. |

> *MEAL-IDX-3 Olivia empty state copy (Fraunces italic): "No meal plans yet. Create one to plan the week's meals and generate a grocery list."*

> *MEAL-IDX-4 Olivia empty state copy: "No archived meal plans. Plans you archive will appear here."*

**New Plan button spec** (matches the Lists "New list" button):
- Full width within 16px page padding
- `border: 1.5px dashed var(--lavender-mid)`, `border-radius: 18px`, transparent bg
- Icon: 26×26px, `border-radius: 8px`, `--violet-dim` bg, `--violet` color, calendar or fork-and-knife icon
- Label: Plus Jakarta Sans 14px/600, `--violet`, "New Plan"
- On hover/press: `background: var(--violet-dim)`

### Group 2 — Plan Detail

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| MEAL-DET-1 | Plan with meals, no shopping items | Light | Default operational view. Days as rows, meal cards collapsed. Sticky footer in ghost state. No generated list reference rows. |
| MEAL-DET-2 | Plan with meals and shopping items | Dark | Sticky footer shows active violet "Generate Grocery List" CTA. Meal cards show item counts. |
| MEAL-DET-3 | Meal card expanded (shopping items editing) | Light | Meal card grows in-place; textarea focused. Card background shifts to `--surface-2`. Other cards remain visible and scrollable. Sticky footer remains visible. |
| MEAL-DET-4 | Plan with generated list reference | Light | One or more green reference rows beneath plan header. Sticky footer in re-generate state ("Generate Again"). |
| MEAL-DET-5 | Empty plan (just created) | Light | All 7 day sections visible, all empty. Each day shows placeholder inline add input. Sticky footer in ghost state. Optional Olivia advisory message at top: *"Add meals to each day, then generate a grocery list."* |
| MEAL-DET-6 | Archived plan (read-only) | Dark | Archived badge in header. No inline add inputs. No sticky footer. Meal cards show all content but overflow menus have no edit/delete options. Spouse banner pattern applies visually. |
| MEAL-DET-7 | Spouse read-only | Light | Spouse banner below header. Meal cards visible with shopping items but not expandable (pointer-events: none on expand chevron). No inline add inputs. No sticky footer. |
| MEAL-DET-8 | Offline, meals/items pending | Dark | Pending items show `--sky` sync dot on their meal cards. Sky offline banner at top of scrollable area. Inline add inputs still functional (writes to outbox). Sticky footer still functional. |

> *MEAL-DET-6: Archived plan header includes an "Archived" badge (same style as MEAL-IDX-4 cards). The back link reads "← Meals". No sticky footer. Overflow menu shows Restore + Delete.*

> *MEAL-DET-8 offline banner copy: "Offline — your changes will sync when you reconnect." Banner dismisses when connection is restored.*

### Group 3 — Create & Edit Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| CREATE-PLAN-1 | Create new plan — blank | Light | Sheet title: "New meal plan". Title text input, focused. Placeholder: *"Week of Mar 10, or give it a custom name…"* (Fraunces italic). The default value pre-fills with "Week of [Monday of current week]". Primary btn: "Create plan". Ghost btn: "Cancel". |
| EDIT-TITLE-PLAN | Edit plan title | Dark | Sheet title: "Rename plan". Input pre-filled with current title. Primary btn: "Save". Ghost btn: "Cancel". |
| EDIT-MEAL-1 | Edit meal name | Light | Sheet title: "Edit meal". Input pre-filled with current meal name. Primary btn: "Save". Ghost btn: "Cancel". |

> *CREATE-PLAN-1: "Create plan" button is disabled when input is empty (violet bg at 40% opacity, pointer-events: none). Enables as soon as any non-whitespace character is entered. The default pre-filled title counts as non-whitespace, so the button is enabled immediately on open.*

> *On "Create plan" confirm: navigate directly to that plan's detail view (MEAL-DET-5 empty state). Do not return to index.*

### Group 4 — Destructive Action Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ACTION-ARCHIVE-PLAN | Archive plan confirm | Light | Sheet title: "Archive this plan?" Body: *"It will move to your plan history and can no longer be edited."* Buttons: danger-secondary "Archive" + ghost "Cancel". |
| ACTION-DELETE-PLAN | Delete plan confirm | Dark | Sheet title: "Permanently delete?" Body: *"This will remove '[plan title]' and all its meals. Previously generated grocery lists will not be deleted. This cannot be undone."* Buttons: danger-primary "Delete plan" + ghost "Keep it". |
| ACTION-DELETE-MEAL | Delete meal confirm | Light | Sheet title: "Remove meal?" Body: *"'[meal name]' and its shopping items will be removed from this plan."* Buttons: danger-secondary "Remove" + ghost "Cancel". |

> *Restore archived plan: No confirmation sheet needed — restore is non-destructive (per D-010). Executes immediately with a brief confirmation banner: "Restored to active plans." with an "Undo" link for 5 seconds.*

### Group 5 — Post-Generation Navigation

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| POST-GEN-1 | Navigating to new Shared List | Light | After "Generate Grocery List" confirms, navigate to the new Shared List in the Shared Lists surface. The back link from that list reads "← Lists" (standard Shared Lists nav). |
| POST-GEN-2 | Generation error | Dark | If list creation fails, surface a toast error: "Couldn't generate list — please try again." No navigation. The plan is unchanged. The sticky footer reverts to active generate state. |

> *POST-GEN-1: The user should land directly on the newly created Shared List detail screen (LIST-DET-1 or LIST-DET-3 from the Shared Lists spec). Do not leave the user on the meal plan detail with only a confirmation toast — the spec explicitly requires navigation to the new list.*

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

The following actions execute immediately with no confirmation step when user-initiated (per D-010). They are reversible through normal UI.

- Create plan (after naming)
- Edit plan title
- Add meal to a day
- Edit meal name
- Add shopping items to a meal
- Edit shopping items on a meal
- Generate grocery list (creates a new Shared List; does not modify the plan or any existing list)
- Restore archived plan

> *Generate grocery list: Show a brief loading state on the sticky footer button (spinner replacing button label; `pointer-events: none`) while the list is being created. Resolve with navigation to the new list on success, or a toast error on failure.*

### 4.2 Actions Requiring Confirmation (Always Confirm)

The following actions always require explicit confirmation regardless of initiator.

- Archive plan → ACTION-ARCHIVE-PLAN sheet
- Delete plan → ACTION-DELETE-PLAN sheet
- Delete meal → ACTION-DELETE-MEAL sheet

> *There is no undo for delete. Archive is the soft-delete path.*

### 4.3 Agentic (Olivia-Proposed) Actions

Olivia must never create or modify a meal plan on its own initiative (per D-002 and the spec trust model). No Olivia omsg block is specified for the Meals surface in Phase 1 — the generate action is purely user-initiated.

| **Action type** | **User-initiated** | **Olivia-proposed** |
|---|---|---|
| Create plan | Execute immediately | Must confirm before save |
| Edit plan title | Execute immediately | Must confirm before apply |
| Add meal | Execute immediately | Must confirm before save |
| Edit meal name | Execute immediately | Must confirm before apply |
| Add shopping items | Execute immediately | Must confirm before save |
| Generate grocery list | Execute immediately | Must confirm before save |
| Archive plan | Always confirm | Always confirm |
| Delete plan | Always confirm | Always confirm |
| Delete meal | Always confirm | Always confirm |

### 4.4 Navigation Model

Meal Planning uses the Meals segment of the Household hub. Navigation within the Meals surface:

1. Household nav tab → Household hub (default to last-viewed segment, or Lists if first visit)
2. Household hub → "Meals" segment → Meals index (Active filter default)
3. Meals index → filter chip "Archived" → Archived plans (same screen, filter switch)
4. Meals index → plan card tap → Plan detail (back: "← Meals")
5. Plan detail → day section → inline add input → meal appears; input clears (no nav change)
6. Plan detail → meal card tap → expands inline (no nav change)
7. Plan detail → expanded meal textarea → save → items persist; card collapses (no nav change)
8. Plan detail → "Generate Grocery List" → loading → navigates to new Shared List
9. Plan detail → overflow → bottom sheet (sheet overlay, no nav change)
10. Plan detail → archive confirm → returns to Meals index
11. Meals index → "New Plan" button → CREATE-PLAN-1 sheet → created → navigates to Plan detail (MEAL-DET-5)

> *Back link in Plan detail reads "← Meals". If arriving from outside the Meals segment (future: deep link from home summary or generated list back-reference), fall back to "← Meals" navigating to the Meals index.*

---

## 5. Layout & Spacing Spec

### 5.1 Meals Index

| **Element** | **Spacing / size** |
|---|---|
| Screen title ("Meals") | Fraunces 28px/700, `margin-bottom: 4px` |
| Subtitle (count) | Plus Jakarta Sans 13px/400, `--ink-2`, "N plans · N active", `margin-bottom: 16px` |
| Segment control | `margin-bottom: 16px` (from hub — see Routines spec §5.1) |
| Filter chips row (Active / Archived) | `margin-bottom: 16px`; overflow-x auto, no scrollbar |
| New Plan button | `margin-bottom: 20px` |
| Plan card | `margin-bottom: 10px`; last card `margin-bottom: 0` |
| Card inner padding | 14px top/bottom, 16px left/right |
| Card title row | title + overflow icon, `align-items: center`, `justify-content: space-between` |
| Card meta row | `margin-top: 4px` |
| Horizontal page padding | 16px left/right for card container |

### 5.2 Plan Detail Screen

| **Element** | **Spacing / size** |
|---|---|
| Back link | Plus Jakarta Sans 13px/600, `--violet`, "← Meals", `margin-bottom: 16px` |
| Plan title (Fraunces) | 28px/700, `--ink`, `margin-bottom: 4px` |
| Week range subtitle | 13px/400, `--ink-2`, "Week of Mar 10 – Mar 16", `margin-bottom: 8px` |
| Header overflow (···) | Right-aligned in header row with plan title |
| Spouse banner (when present) | `margin: 0 16px 12px` |
| Generated list reference rows | `margin: 0 16px 8px` per row |
| Day section divider | 1px `--ink-4`, `margin: 8px 0 0` (above day label); absent before first day |
| Day label | Plus Jakarta Sans 10px/700, `--ink-3`, ALL CAPS, `padding: 14px 16px 6px` |
| Meal cards area | `padding: 0 16px`, `gap: 6px` between cards |
| Meal card padding | 10px top/bottom, 14px left/right |
| Inline add input | `margin: 6px 16px 0`, full width within page padding |
| Scroll area bottom padding | 120px (clears sticky footer + bottom nav) |
| Sticky footer height | min 72px |
| Footer horizontal padding | 16px left/right |
| Footer top border | 1px `--ink-4` |

### 5.3 Expanded Meal Card

| **Element** | **Spacing / size** |
|---|---|
| Card padding (expanded) | 10px top, 14px sides, 14px bottom |
| Meal name row | `margin-bottom: 10px` |
| Shopping items list (existing items) | `margin-bottom: 8px`; each item: 13px/400, `--ink`, `padding: 2px 0` |
| Shopping items textarea | `border-radius: 12px`, `padding: 8px 12px`, min 3 lines visible, auto-grow to 5 |
| Save button | Appears inline right of textarea when text present; 32px height, `--violet` bg, 10px radius, 13px/700 white, "Save" |

### 5.4 Sheet Padding & Internal Spacing

Mirrors the reminders and shared lists spec sheet spec exactly.

| **Element** | **Spec** |
|---|---|
| Sheet horizontal padding | 20px left and right |
| Sheet top padding (below handle) | 20px above sheet title |
| Sheet bottom padding | 100px (clears bottom nav) |
| Handle margin-bottom | 18px |
| Input field padding | 11px top/bottom, 14px left/right |
| Input margin-bottom | 14px |
| Action row gap | 10px between buttons |

---

## 6. Data Fields Surfaced per Component

### 6.1 Plan Index Card

- `id` — for navigation to detail
- `title` — displayed, single-line truncated
- `weekStartDate` — formatted as week range "Mar 10 – Mar 16"
- `status` — `active` or `archived` (determines border, opacity, overflow options)
- `mealCount` — total meals across all days, displayed in meta row
- `shoppingItemCount` — total shopping items across all meals, displayed in meta row
- `generatedListCount` — count of generated Shared Lists; if > 0, "✓ List generated" badge shown
- `hasPendingCommands` — drives sync dot

### 6.2 Plan Detail Screen Header

All index card fields plus:

- `weekStartDate` — formatted as "Week of Mar 10 – Mar 16" subtitle
- `generatedLists[]` — array of `{ listId, listTitle, generatedAt }` for reference rows

### 6.3 Day Section

- `dayOfWeek` — 0–6 (Monday–Sunday), displayed as ALL CAPS label
- `meals[]` — ordered array of meal objects for this day (see 6.4)

### 6.4 Meal Card

- `id` — for mutation targeting
- `name` — meal name, displayed as card title
- `shoppingItems[]` — ordered array of plain text strings
- `shoppingItemCount` — derived from `shoppingItems.length`, shown in collapsed meta
- `position` — integer, creation order within day
- `hasPendingCommands` — drives sync dot on meal card

### 6.5 Generated List Reference Row

- `listId` — for navigation to the Shared List
- `listTitle` — "Grocery — [plan title]", displayed as link text
- `generatedAt` — displayed as relative timestamp

---

## 7. Edge Cases & Failure Modes

### 7.1 Long Plan Titles

- Index card: single line, `overflow: hidden; text-overflow: ellipsis`. Never wraps.
- Detail header (Fraunces 28px): wraps to 2 lines max; beyond: `display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden`.
- Create/Edit sheet input: single line, does not expand. User scrolls within the field if the title is very long.

### 7.2 Long Meal Names

- Collapsed meal card: single line truncated with ellipsis. Full name visible in expanded state and in EDIT-MEAL-1 sheet.
- Expanded meal card: meal name wraps to 2 lines max.

### 7.3 Many Meals on One Day

- The day section grows vertically to accommodate all meal cards. No collapsing or "Show more" in Phase 1.
- If a user adds many meals to one day, that day's section will be tall relative to others. This is intentional — the layout reflects the actual plan.

### 7.4 Very Long Shopping Items List

- The textarea auto-grows up to 5 visible lines before scrolling within the textarea element itself. This keeps the expanded card from growing unbounded.
- Items persist as entered — no truncation of stored data.

### 7.5 Empty Plan (All Days Empty)

- MEAL-DET-5 state. All seven day sections show, each with only the placeholder inline add input.
- Sticky footer is in ghost state.
- An optional Olivia advisory message appears below the plan header: *"Add meals to each day, then generate a grocery list."* — uses the standard advisory block pattern (Fraunces italic, 15px/300, `--ink`, `--surface-2` bg, 18px radius, `padding: 14px 16px`, `margin: 0 16px 16px`).

### 7.6 Plan With No Shopping Items

- Meal cards show "Add shopping items" in `--ink-3` as the meta line.
- Sticky footer shows ghost state with helper copy.
- Generate button is not tappable. No false affordance.

### 7.7 Generate Grocery List Multiple Times

- Each generation creates a new Shared List and appends a new reference row to the plan detail.
- Multiple reference rows stack (newest first). Max 3 visible; "Show all" link if more exist.
- The sticky footer re-generate button is always available on active plans with shopping items.

### 7.8 Post-Generation Navigation Return

- If the user navigates back from the generated Shared List to the Meals surface (via the Household tab or browser back), they return to the Meals index or last plan detail — not to a confirmation screen.
- The generated list reference row is visible in the plan detail on return.

### 7.9 Offline Meal Entry

- Meal and shopping item additions appear optimistically in the UI.
- Each affected meal card shows the `--sky` sync dot.
- Sky offline banner appears at top of scroll area.
- Inline add inputs remain functional (writes to outbox).
- Generate Grocery List: this action requires a network connection to create a Shared List record. If offline, the generate button is disabled with an explanatory tooltip on long-press: "Generating a list requires a connection." The footer copy changes to "Connect to generate your grocery list."

### 7.10 Archive While Offline

- Archive action requires confirmation sheet. After confirmation, the plan moves to archived state optimistically.
- Offline banner persists. Archive command enters outbox.
- On reconnect: server confirms archive; if rejected (version conflict), surface a toast: "Couldn't archive — please try again." and restore the plan to active state.

### 7.11 Simultaneous Edit (Two Devices)

- Versioned command semantics handle conflicts (A-006). Later command wins. No richer conflict UI in Phase 1.
- The plan's `updated_at` timestamp helps the server detect conflicting writes.

### 7.12 Spouse Attempting Write

- Spouse cannot see write controls (inline add inputs, expand-to-edit, overflow menus, generate button).
- If a spouse somehow triggers a write through a deep link or stale cached state, the API returns a read-only error.
- The app surfaces a toast: "Meal plans are managed by Lexi." — not a blocking error modal.

### 7.13 No Meals in Plan When Generate is Tapped

- The Generate button in State 2 is only reachable when `shoppingItemCount > 0`. If a race condition removes all shopping items after the button becomes active, the generation call may return 0 items. Surface a toast: "No shopping items found — add items to a meal first." No navigation.

### 7.14 Plan Title: Default vs. Custom

- Default title is "Week of [Monday of current week]" — e.g. "Week of Mar 10".
- The create sheet pre-fills this value. The user may clear and retype.
- The title is always editable. No special treatment for the default vs. custom state beyond the text content.

---

## 8. Dark Mode Notes

Dark mode is fully automatic via token inheritance except where noted.

| **Element** | **Dark mode consideration** |
|---|---|
| New Plan dashed button | `--lavender-mid` border resolves to `#3D3660` — visible deep indigo dashed line. No override needed. |
| Spouse banner | `--lavender-soft` resolves to `#2A2545` — distinct from `--bg` and `--surface`. Natural visual separation. |
| Expanded meal card bg | `--surface-2` resolves to `#242038` — slightly elevated from `--surface` (`#1C1A2E`). Clear visual distinction for expanded state. |
| Shopping items textarea | `--lavender-mid` border resolves to `#3D3660`. Focus shifts to `--violet`. Automatic. |
| Generate button (active) | `--violet` is unchanged. `--shadow-violet` is stronger in dark (0.45 opacity) — the CTA glows. Correct. |
| Generate button (ghost) | `--surface-2` bg resolves to `#242038`. Text `--ink-3` resolves to `rgba(237,233,255,0.35)`. Appropriately muted. |
| Generated list reference rows | `--mint-soft` resolves to `#0A2820` — a deep teal band. `--mint` text is unchanged and high-contrast on this bg. |
| Day section labels | `--ink-3` resolves to `rgba(237,233,255,0.35)` — soft but legible ALL CAPS label. |
| Archived plan cards | `--ink-4` left border resolves to `rgba(237,233,255,0.1)` — barely-there tint, correctly de-emphatic. |
| Offline banner | Sky banner uses `--sky-soft` bg resolving to `#0A2228`. `--sky` text is unchanged. No override needed. |
| Sticky footer separator | `border-top: 1px solid var(--ink-4)` resolves to `rgba(237,233,255,0.1)` — a subtle separator. If contrast is insufficient, upgrade to `--lavender-mid`. |

---

## 9. Accessibility Notes

- All interactive elements: minimum tap target 44×44px. Inline add inputs: full-row tap target. Expand chevron: 44×44px via padding.
- Meal card expand/collapse: `aria-expanded="true/false"` on the card container. `aria-controls` pointing to the shopping items section id.
- Shopping items textarea: `aria-label="Shopping items for [meal name]"`. Placeholder is not a substitute for the label.
- Generate Grocery List button: `aria-disabled="true"` when in ghost state (pointer-events: none). `aria-label="Generate grocery list (requires shopping items)"` in disabled state.
- Day section headers: use a semantic `<h3>` or `role="heading" aria-level="3"` for the day label. This ensures screen readers can navigate by day.
- Offline banner: `role="status"` for automatic announcement on appearance. Dismissal announcement: "Connection restored. Changes synced."
- Spouse banner: `role="note"` with `aria-label="Read-only view"`.
- Generated list reference links: `aria-label="Grocery — [plan title], generated [date]"` to provide full context without visual truncation.
- Focus states: `box-shadow: 0 0 0 4px var(--violet-glow)` on all focusable elements. Stronger in dark mode automatically.
- Sheet overlays: trap focus while open; focus returns to triggering element on close.
- `prefers-reduced-motion`: disables stagger animations on plan and meal card entrance. Sheet entrance transitions: `transition-duration: 0.01ms`. Expand animation disabled — shopping section appears immediately at full height.

---

## 10. Open Design Questions

The following questions are not blocking Phase 1 implementation but should be revisited before a later iteration.

1. **Day order — should Sunday precede Monday?** This spec assumes a Monday-first (ISO 8601) week order. If household preference leans Sunday-first, a user preference setting would be needed. Recommend Monday-first for Phase 1; revisit if household feedback surfaces this.

2. **Meal reordering within a day:** Phase 1 uses creation order with no reordering. If households frequently want to reorder meals (e.g. move a planned dinner to a different day), a drag-to-reorder or move-to-day option belongs in Phase 2. Household usage will reveal whether this is a real friction point.

3. **Shopping items as structured rows vs. plain text:** The current design uses a single multiline textarea per meal. If household usage shows that items are hard to read when commingled in a blob of text, a Phase 2 iteration could parse the textarea into individual item rows on save (each shown as a distinct chip or row). The backend model already supports an ordered list of strings — the render layer can evolve.

4. **Home screen summary widget:** A compact "this week's meals" summary card on the Home screen could surface meal planning value without requiring navigation to the Household hub. Design would be similar to the Events strip (compact, horizontal, informational only). Recommend deferring until household usage establishes the Meals workflow as a habit.

5. **"Push to existing list" affordance:** The spec defers the ability to push shopping items to an existing Shared List (vs. always creating new). When this arrives, the sticky footer will need a split affordance: "Generate New List" | "Add to Existing List." Design implications: a picker sheet for the existing list would be needed. Not blocking Phase 1.

6. **Archived plan browsing experience:** Phase 1 uses the same index card format for archived plans with reduced opacity. If many plans accumulate, a calendar-style history view (grouped by month) may be more legible than a linear scroll. Recommend flat scroll for Phase 1; revisit after first month of use.

7. **Spouse write access:** When spouse write access for meal planning arrives (natural next evolution per the spec), the banner, footer, and meal card interaction model all require revision. The per-screen banner approach will need to be replaced or scoped per-section. Flag for future design brief.

---

*— End of specification —*
