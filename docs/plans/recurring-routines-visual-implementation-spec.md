---
title: "Olivia — Recurring Routines: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Recurring Routines
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Recurring Routines feature for Olivia. It covers design tokens and typography rules, component anatomy, all screen states with precise layout specs, interaction rules and approval model, data fields surfaced per component, and edge cases.
>
> Key design decisions resolved here: navigation placement (Household hub with segment switcher), routine index organization, due-state left-border visual treatment, completion history timeline depth and format, and paused state card treatment. These are documented with rationale so future agents do not re-derive them.
>
> **Reused without change:** The tap-checkbox completion interaction (from Shared Lists, per L-008) and the per-screen spouse read-only banner (`--lavender-soft` bg, `--violet` text, per L-009) are directly inherited. No new design decisions are needed for these primitives.

---

## 0. Design Decisions Resolved

The following decisions were open in `docs/specs/recurring-routines.md` and are resolved here.

### 0.1 Navigation Placement

**Decision:** The "Lists" tab is renamed to "Household" and serves as a coordination hub with an in-screen segment switcher. Both Shared Lists and Recurring Routines live inside this tab. The bottom navigation retains the same ☑ icon; only the label changes from "Lists" to "Household."

**Rationale:** Routines and Lists are sibling household coordination workflows — they belong together rather than competing for separate primary nav positions. A sixth tab would crowd the bottom nav and give the impression that Olivia is a feature list rather than a purposeful tool. The "Household" hub is also the natural future home for meal planning and other coordination workflows that arrive later in Horizon 3. Keeping the same ☑ icon minimizes relearning for existing users.

**Bottom nav (updated):**
```
┌────────┬────────┬────────┬────────────┬────────┐
│ 🏡 Home│ ✅Tasks│  ✦ AI │ ☑ Household│🗂️Memory│
└────────┴────────┴────────┴────────────┴────────┘
```

**Household hub segment control (in-screen, top of content area):**
```
┌──────────────────────────────────────────┐
│  [ Lists ]  [ Routines ]                 │   ← segment pill strip
└──────────────────────────────────────────┘
```

**Implementation notes:**
- The `NavTab` type gains a `'routines'` value. Both `/lists` and `/routines` routes should activate the "Household" tab highlight in the bottom nav.
- The existing `ListsPage` gains a segment control header that switches between lists content and a `/routines` navigation push (or in-page tab swap).
- The provisional `← Home` back link in the current `RoutinesPage` must be replaced with `← Household` pointing to the hub.
- The "Household" tab active state uses the same `--lavender-soft` background pill and `--violet` label as all other active tabs.
- No new token is needed.

### 0.2 Routine Index Organization

**Decision:** Routines are grouped by due state in this order:
1. **Overdue** — sorted by most overdue first (earliest current due date at top)
2. **Due today** — sorted by due date, then title alphabetically
3. **Upcoming** — sorted by due date ascending
4. **Recently completed** — sorted by completion timestamp descending (most recently completed first)
5. **Paused** — sorted alphabetically by title

**Rationale:** This order mirrors how a household member naturally wants to triage — handle what is late first, then what is needed today, then plan ahead. Completed routines appear at the bottom of the active view as a positive record but should not dominate the screen. Paused routines are last because they are not actionable — they are informational only.

**Group header display rule:** Section headers (e.g. "Overdue", "Due today") are only rendered when that group contains at least one routine. Empty groups do not produce blank space or orphaned headers.

### 0.3 Due-State Visual Treatment

**Decision:** Each routine card communicates its due state through two independent channels: a left-border accent and a badge. The left-border accent is the primary scannable signal at the index level; the badge provides the text label.

| **Due state**      | **Left border token** | **Badge variant** | **Badge label**       | **Card opacity** |
|--------------------|-----------------------|-------------------|-----------------------|-----------------|
| `overdue`          | `--rose`              | `badge-rose`      | "Overdue"             | 100%            |
| `due`              | `--peach`             | `badge-peach`     | "Due today"           | 100%            |
| `upcoming`         | `--ink-4` (neutral)   | `badge-neutral`   | "Upcoming"            | 100%            |
| `completed`        | `--mint`              | `badge-mint`      | "Done"                | 65% (de-emphasised) |
| `paused`           | none                  | `badge-sky`       | "Paused"              | 65%             |

**Rationale:** This follows the established reminders pattern exactly. Using `--rose` for overdue and `--peach` for due-today is the same semantic layer used in task cards and reminder rows — the vocabulary is already familiar. The partial opacity for completed and paused routines communicates "not actively needed now" without hiding the information. The neutral `--ink-4` border for upcoming is intentionally low-signal — these routines need no action yet.

**Additional card background rule:** No full card background fill based on due state (e.g. no rose-tinted card backgrounds). The left border accent is sufficient. Filling the card would create a cluttered, alarming feel when several routines are overdue — exactly the anti-pattern described in the spec UX notes.

### 0.4 Completion History Timeline

**Decision:** The routine detail screen shows a completion history timeline with these rules:
- Default depth: **most recent 30 occurrences**
- A "Show older history" row appears below if more than 30 occurrences exist
- Each completed occurrence: "Completed [date] by [owner]" — one row per entry
- Each missed cycle (occurrence with no completion row): "Missed — [date]" in `--ink-3` text (de-emphasised)
- Format: chronological descending (most recent at top)
- Date format: "Mon, Mar 10" for recent history; year appended for older entries ("Mon, Mar 10, 2025")
- Owner label: "Me" (stakeholder) / "Spouse" (spouse role display name)

**Rationale:** 30 entries covers most households for several months of a weekly routine without rendering a performance concern. Showing the most recent entries first matches how a household member naturally reviews — "did we do this recently?" not "when did we first do this?" Missed cycles are shown as de-emphasised gap entries rather than a separate "missed" state object, consistent with the spec's explicit decision to not create a first-class missed-occurrence state.

### 0.5 Paused State Card Treatment

**Decision:** Paused routine cards receive: (a) full-card opacity 0.65, (b) no left-border accent, (c) a `badge-sky` ("Paused") badge. No pause icon is added to the card body.

**Rationale:** Opacity is the clearest signal that a card is "dormant." The badge provides the explicit text label. Adding a separate icon on top of the badge would be redundant. Using `--sky` for the paused badge follows the same semantic used in the existing reminders implementation (snoozed reminders use `--sky`). Paused and snoozed share the same "temporarily suspended, will resume" semantics.

---

## 1. Design System Constraints

All Recurring Routines UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`. Key constraints are summarised below.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Recurring Routines** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "Routines" screen header |
| Segment control label | Plus Jakarta Sans | 13px | 600 | "Lists" / "Routines" switcher pills |
| Section group header | Plus Jakarta Sans | 10px | 700 | ALL CAPS group headers: "OVERDUE", "DUE TODAY" |
| Routine card title | Plus Jakarta Sans | 14px | 600 | Routine title on index card |
| Routine detail title | Fraunces | 28px | 700 | Title at top of detail screen |
| Recurrence / meta | Plus Jakarta Sans | 12px | 400–500 | "Weekly · Due today", owner name |
| History entry | Plus Jakarta Sans | 13px | 400 | "Completed Mon, Mar 10 by Me" |
| History entry (missed) | Plus Jakarta Sans | 13px | 400 | "Missed — Mon, Mar 3", `--ink-3` |
| Olivia message | Fraunces italic | 15–16px | 300 | Advisory messages in detail |
| Badge / label | Plus Jakarta Sans | 10px | 700 | Status badges, ALL CAPS labels |
| Spouse banner | Plus Jakarta Sans | 13px | 500 | Read-only role indicator |
| Form label | Plus Jakarta Sans | 12px | 600 | "Title", "Owner", "Repeats" form labels |
| Button | Plus Jakarta Sans | 13–14px | 700 | Primary and ghost buttons |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light Value** | **Dark Value** |
|---|---|---|---|
| Overdue left border | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Overdue badge bg | `--rose-soft` | `#FFE8F2` | `#3A1828` |
| Overdue badge text | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Due today left border | `--peach` | `#FFB347` | `#FFB347` |
| Due today badge bg | `--peach-soft` | `#FFF3E0` | `#2E1E08` |
| Due today badge text | `--peach` | `#FFB347` | `#FFB347` |
| Upcoming left border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Upcoming badge bg | `--surface-2` | `#F3F0FF` | `#242038` |
| Upcoming badge text | `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` |
| Completed left border | `--mint` | `#00C9A7` | `#00C9A7` |
| Completed badge bg | `--mint-soft` | `#E0FFF9` | `#0A2820` |
| Completed badge text | `--mint` | `#00C9A7` | `#00C9A7` |
| Paused badge bg | `--sky-soft` | `#E0F7FC` | `#0A2228` |
| Paused badge text | `--sky` | `#48CAE4` | `#48CAE4` |
| Checkbox checked fill | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Checkbox hover | `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` |
| Spouse banner background | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Spouse banner text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Pending sync dot | `--sky` | `#48CAE4` | `#48CAE4` |
| Olivia advisory bg | `--surface-2` | `#F3F0FF` | `#242038` |
| Card background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Sheet overlay | `--surface` | `#FFFFFF` | `#1C1A2E` |
| History missed text | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |

### 1.3 Due-State Left Border Rule

Every routine card in the index carries a 3px left border communicating due state at a glance, following the established reminder row pattern from `docs/plans/reminders-visual-implementation-spec.md`.

| **Due state** | **Border token** | **Card opacity** |
|---|---|---|
| `overdue` | `--rose` | 100% |
| `due` | `--peach` | 100% |
| `upcoming` | `--ink-4` | 100% |
| `completed` | `--mint` | 65% |
| `paused` | none | 65% |

### 1.4 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Routine index card | 18px |
| History entry row | 12px |
| Bottom sheet overlay | 28px top corners, 0px bottom |
| Recurrence selector pills | 20px (fully rounded) |
| Owner selector chips | 20px (fully rounded) |
| Filter chips (Active / Archived) | 20px (fully rounded) |
| Action buttons (primary, danger) | 12px |
| Spouse banner | 12px |
| Confirmation modal | 18px |
| Segment control pill strip | 20px outer; 16px inner pill |

---

## 2. Component Anatomy

### 2.1 Household Hub Segment Control

Used in: The Household tab (shared between Lists and Routines).

The segment control is a horizontal pill strip pinned below the screen header, above the content area. It is not sticky — it scrolls with the content.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Strip container | Full width minus 16px padding, `--surface-2` bg, 20px radius | `padding: 4px`, `margin-bottom: 16px` |
| Active segment pill | `--violet` bg, white text, 16px radius | fills the pill; `transition: all 0.2s ease` |
| Inactive segment label | `--ink-2` text, transparent bg | On tap: animate to active state |
| Segment labels | Plus Jakarta Sans 13px/600 | "Lists", "Routines" |

**Active state visual:** The active segment pill uses `--violet` background with white text. The inactive segment remains text-only at `--ink-2`. The entire strip has `--surface-2` background — in dark mode this resolves to `#242038`, a slightly elevated surface.

**Implementation note:** The segment control should be implemented as a prop-driven component shared between the ListsPage and RoutinesPage. When the user taps "Routines," navigate to `/routines`. When they tap "Lists," navigate to `/lists`. Both tabs highlight the Household nav item.

### 2.2 Routine Index Card

Used in: Routines index (Active and Archived filters).

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | 18px radius, `--surface` bg, `--shadow-sm`, `--ink-4` border | `border-left: 3px solid [state token]` per section 1.3 |
| Completion checkbox | 22×22px circle, visible only for `due` and `overdue` states for non-spouse | Matches design-components checkbox spec; tap = immediate complete |
| Title | Plus Jakarta Sans 14px/600, `--ink`, single line truncated with ellipsis | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Meta row | 12px/400, `--ink-3` | "[Due date label] · [Recurrence label]" e.g. "Today · Weekly" |
| Due-state badge | Pill: background + text per section 1.2, 10px/700, 20px radius | Right-aligned; short label (see section 0.3) |
| Overflow menu | Three-dot icon (···), right-aligned, 44×44px tap target | Opens action sheet: Edit, Pause/Resume, Archive, Delete |
| Pending sync dot | 6×6px `--sky` dot | Shown bottom-right when routine has offline-pending commands |

**Hover state:** `transform: translateX(3px)`, `box-shadow: var(--shadow-md)`, `border-color: var(--lavender-mid)`

**Press state:** `transform: scale(0.98)`

**Completed variant:** Opacity 0.65 on the entire card. `--mint` left border. Checkbox hidden (already complete). Badge: "Done" in mint.

**Paused variant:** Opacity 0.65. No left border. Badge: "Paused" in sky. Checkbox hidden.

**Archived variant (in archived filter):** Opacity 0.7. No left border (uniform). Overflow menu shows Restore + Delete only.

**Checkbox placement:** The completion checkbox appears to the left of the card content, only when `dueState === 'due' || dueState === 'overdue'` AND the user is not a spouse. For all other states, the title and meta row use the full card width without a checkbox.

### 2.3 Completion Checkbox (Reused from Shared Lists)

The tap-checkbox interaction is identical to the implementation in Shared Lists. No changes needed. See `docs/plans/shared-lists-visual-implementation-spec.md` section 2.3 for the definitive spec.

Summary: 22×22px circle, `border: 2px solid var(--ink-4)`. On hover: `border-color: var(--violet)`, `background: var(--violet-dim)`. On check: `background: var(--violet)`, white `✓` (11px bold). Tap is immediate, no confirmation, no animation beyond the fill transition.

For routine cards the checkbox color can use the due-state accent on hover:
- `overdue` card checkbox hover: `border-color: var(--rose)`, `background: var(--rose-dim)`
- `due` card checkbox hover: `border-color: var(--peach)`, `background: var(--peach-dim)`

### 2.4 Completion History Entry

Used in: Routine detail screen, completion history section.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Row container | Full width, `padding: 10px 16px`, `border-radius: 12px` | Minimum 44px touch height (non-interactive) |
| Icon dot | 8×8px circle, `--mint` for completed, `--ink-4` for missed | Left-aligned, vertically centered |
| Entry text (completed) | Plus Jakarta Sans 13px/400, `--ink` | "Completed [date] by [owner]" |
| Entry text (missed) | Plus Jakarta Sans 13px/400, `--ink-3` | "Missed — [date range]" |
| Divider | 1px `--ink-4`, `margin: 0 0 0 24px` | Indented past icon; absent on last visible entry |

**Missed entry display:** A missed cycle shows the original due date. Example: "Missed — Mon, Mar 3". When multiple consecutive cycles are missed, each missed cycle is a separate row — not collapsed into a range.

**"Show older history" row:** Appears below entry 30 if more entries exist. Style: Plus Jakarta Sans 13px/600, `--violet`, "Show older history →". On tap: loads remaining entries inline.

### 2.5 Routine Detail Header

Used in: Routine detail screen, above the history timeline.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Back link | Plus Jakarta Sans 13px/600, `--violet`, "← Household" | `margin-bottom: 16px` |
| Screen title (routine title) | Fraunces 28px/700, `--ink` | Wraps to 2 lines max; beyond: `-webkit-line-clamp: 2` |
| Status row | Due-state badge + due date label | `margin-top: 6px; margin-bottom: 4px` |
| Meta row | Owner chip + recurrence label | "Owned by Me · Weekly" in 12px/400, `--ink-2` |
| Overflow menu | ··· icon, 44×44px tap target, right-aligned in header | Edit, Pause/Resume, Archive, Delete |
| Completion checkbox | Large format — 28×28px, prominent CTA for `due`/`overdue` | Only shown for stakeholder when routine is due or overdue; not shown when completed/paused/upcoming |

**Completion CTA placement:** For `due` and `overdue` routines (stakeholder only), show a prominent completion button below the meta row. Style: full-width, `--violet` background, white text, 12px radius, "Mark complete". This is separate from the small index card checkbox — it provides a clear primary action at the top of the detail screen so the user does not have to scroll down.

**History section title:** Fraunces 19px/700, `--ink`, "History", appears above the history entries with `margin-top: 24px; margin-bottom: 12px`.

### 2.6 Create / Edit Routine Sheet

Used in: "New routine" button → CREATE-ROUT-1, card overflow "Edit" → EDIT-ROUT-1.

**Sheet layout follows the established bottom sheet pattern (see section 2.4 of the shared lists spec).** Handle, title, fields, action row.

**Sheet title:** "New Routine" (create) / "Edit Routine" (edit). Fraunces 22px/700, `--ink`.

**Form fields:**

1. **Title input** — text, placeholder: *"e.g. Take out the trash"* (Fraunces italic, `--ink-3`). Required.
2. **Owner selector** — three horizontal chips: "Me", "Spouse", "Unassigned". Tap to select. Selected chip: `--violet` bg, white text. Unselected: `--surface-2` bg, `--ink-2` text. 20px radius.
3. **Recurrence selector ("Repeats")** — four horizontal pill buttons: "Daily", "Weekly", "Monthly", "Custom". Tap to select. Same styling as owner chips. Required — no blank state; "Weekly" is the default selection on create.
4. **Custom interval input** — shown only when "Custom" recurrence is selected. Label: "Every [  ] days". Integer input field, 60px wide, inline with the label. Min: 1. Placeholder: "7". Keyboard: numeric.
5. **First due date input** — date picker or text input. Label: "Starting". Defaults to today. Required.

**Button row:** Primary "Create routine" (disabled until title and recurrence are filled) / "Save" (edit). Ghost "Cancel".

**Validation:** Title empty → "Title is required." Recurrence unset → cannot happen (has default). Custom interval ≤ 0 → "Interval must be at least 1 day."

### 2.7 Spouse Read-Only Banner (Reused)

Identical to the banner in Shared Lists (section 2.6 of that spec) and Reminders. No new design decisions needed.

Copy for Routines: *"Viewing as household member — Lexi manages these routines."*

- Container: `--lavender-soft` bg, `border-radius: 12px`, `padding: 10px 16px`, `margin: 0 16px 12px`
- Text: Plus Jakarta Sans 13px/500, `--violet`
- No dismiss button — persists throughout session on any Routines screen

### 2.8 Olivia Advisory Block

Used in: Routine detail screen when Olivia surfaces a pattern observation (spec behavior: "Olivia may surface a note if a routine has been missed several times in a row").

- Container: 18px radius, `--surface-2` bg, `padding: 14px 16px`, `margin: 12px 16px 0`
- Label row: "✦ Olivia noticed" — 10px/700, `--violet`, uppercase, `letter-spacing: 1.2px`
- Text: Fraunces italic 15px/300, `--ink`, line-height 1.5
- Example copy: *"This routine has been missed 3 times in a row. Want to adjust the schedule?"*
- Action button: "Edit routine" (secondary) — opens EDIT-ROUT-1 sheet + ghost "Dismiss"
- Advisory-only: Olivia never modifies the routine automatically

### 2.9 Pending Sync Indicator (Reused)

Same as Shared Lists. 6×6px `--sky` dot, bottom-right of card. Offline banner at top of screen: *"Offline — your changes will sync when you reconnect."* Uses `--sky-soft` bg, `--sky` text/icon. Dismisses on reconnect.

---

## 3. Screen States Reference

### Group 1 — Household Hub

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| HOUSE-1 | Household hub — Lists segment active | Light | Default tab state if user was last on Lists. Segment control: "Lists" pill active (violet). Existing Lists content below unchanged. |
| HOUSE-2 | Household hub — Routines segment active | Dark | "Routines" pill active (violet). Routines index content below segment control. |

> *The segment control lives inside the Household tab's screen shell. When the user switches segments, the route changes (/lists ↔ /routines) but the bottom nav tab remains highlighted as "Household" in both cases.*

### Group 2 — Routine Index

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ROUT-IDX-1 | Active routines, mixed due states | Light | Default view. "Active" filter chip selected. Groups: Overdue (rose border), Due today (peach border), Upcoming (neutral border). Section headers above each group. "New routine" dashed button at top. Routines stagger in with taskIn animation. |
| ROUT-IDX-2 | Active, all caught up | Dark | No overdue or due-today routines. Only Upcoming and/or Completed groups visible. No urgent visual treatment. Calm state. |
| ROUT-IDX-3 | Empty — no active routines | Light | "Active" chip selected. Empty state: 🔁 icon, Fraunces italic Olivia message, prominent "New routine" button (non-dashed, full CTA style). No other cards. |
| ROUT-IDX-4 | Archived filter | Dark | "Archived" chip selected. Archived cards at 0.7 opacity, no left border, overflow: Restore + Delete only. If empty: Olivia message "No archived routines." |
| ROUT-IDX-5 | Spouse read-only | Light | Spouse banner pinned below segment control and above filter chips. All routine cards visible. Completion checkboxes absent. "New routine" button absent. Overflow menus absent. Filter chips functional. |
| ROUT-IDX-6 | Offline with pending routines | Dark | Sky offline banner at top of scroll area. Routines with pending commands show `--sky` sync dot. "New routine" still functional (writes to outbox). |

> *ROUT-IDX-3 Olivia empty state copy (Fraunces italic): "No routines yet. Add a recurring routine to track chores, bills, maintenance, or anything the household does on a regular schedule."*

> *ROUT-IDX-4 empty copy: "No archived routines. Routines you archive will appear here."*

> *Section group headers use ALL CAPS, Plus Jakarta Sans 10px/700, `--ink-3`, `letter-spacing: 1.2px`. They appear only when the group contains at least one routine.*

### Group 3 — Routine Detail

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ROUT-DET-1 | Active routine, due or overdue | Light | Back link "← Household". Title, status row, meta row. Prominent "Mark complete" CTA below meta. History section with completion timeline below. Overflow: Edit, Pause, Archive, Delete. |
| ROUT-DET-2 | Active routine, upcoming | Dark | No completion CTA (not due yet). Status badge: "Upcoming" in neutral. History section still visible. Overflow: Edit, Pause, Archive, Delete. |
| ROUT-DET-3 | Completed this cycle | Light | "Done" badge (mint). No completion CTA. History top entry: today's completion. Next due date displayed in meta: "Next: [date]". |
| ROUT-DET-4 | Paused routine | Dark | "Paused" badge (sky). No completion CTA. "Resume" button prominently in header area (secondary style). Overflow: Edit, Resume, Archive, Delete (no Pause since already paused). |
| ROUT-DET-5 | Archived routine | Light | Back link present. "Archived" badge (neutral). No completion CTA. "Restore" button in header. Overflow: Restore, Delete. History preserved and visible. |
| ROUT-DET-6 | Spouse read-only | Light | Spouse banner below back link. Same layout as stakeholder but no completion CTA, no "Resume/Pause" actions, no overflow menu. History visible and readable. |
| ROUT-DET-7 | Olivia advisory visible | Dark | Olivia advisory block appears above the history timeline when routine has 3+ consecutive misses. Advisory uses `--surface-2` bg with Fraunces italic copy. |
| ROUT-DET-8 | Offline, pending sync | Dark | Sky offline banner at top. Optimistic completion state if just marked complete offline. Sync dot in header. |

> *ROUT-DET-3 "Next" date display: add a third meta row when the routine is completed: "Next due: [formatted date]" in 12px/400, `--ink-2`. This confirms the schedule advance without requiring the user to do the mental calculation.*

> *ROUT-DET-4 "Resume" button: secondary button style (`--lavender-soft` bg, `--violet` text), positioned below the meta row. Width: auto, left-aligned. Not full-width.*

### Group 4 — Create & Edit Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| CREATE-ROUT-1 | Create new routine — blank | Light | Sheet title: "New Routine". Title input (autofocused). Owner chips (default: Me). Recurrence pills (default: Weekly). No custom interval input visible. First due date input (default: today). Primary btn: "Create routine" (disabled until title non-empty). Ghost btn: "Cancel". |
| CREATE-ROUT-2 | Create — custom interval selected | Dark | Same as above but "Custom" recurrence pill active (violet). Custom interval input appears below recurrence row: "Every [  ] days" inline. Integer field, default "7". |
| EDIT-ROUT-1 | Edit existing routine | Light | Sheet title: "Edit Routine". All fields pre-filled with current values. Primary btn: "Save changes". Ghost btn: "Cancel". Recurrence change note (see 7.6). |

> *CREATE-ROUT-1: "Create routine" button is disabled when title is empty (visual: violet bg at 40% opacity, `pointer-events: none`). Enables as soon as any non-whitespace character is entered.*

> *Owner chip copy: "Me" (stakeholder), "Spouse" (spouse), "Unassigned". Not full names — keeps the form compact.*

> *The recurrence row label is "Repeats" (not "Recurrence") — plain household language.*

### Group 5 — Destructive Confirmation Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ACTION-PAUSE | Pause confirm | Light | Sheet title: "Pause this routine?" Body: *"It will stop appearing as due until you resume it. Your history will be preserved."* Buttons: danger-secondary "Pause" + ghost "Cancel". |
| ACTION-ARCHIVE | Archive confirm | Dark | Sheet title: "Archive this routine?" Body: *"It will be hidden from your active view but not deleted. Its history and schedule are preserved. You can restore it from the Archived filter."* Buttons: danger-secondary "Archive" + ghost "Cancel". |
| ACTION-DELETE | Delete confirm | Light | Sheet title: "Permanently delete?" Body: *"This will remove [Routine title] and all [N] occurrences from its history. This cannot be undone."* Buttons: danger-primary "Delete routine" + ghost "Keep it". Higher friction than archive — danger-primary. |

> *Restore archived routine: No confirmation sheet — immediate user-initiated action (D-010). A brief mint banner appears: "↩ Restored to active routines." auto-dismiss 5s.*

> *Resume paused routine: No confirmation sheet — immediate user-initiated action. Brief mint banner: "↩ Routine resumed." auto-dismiss 5s.*

> *The occurrence count in ACTION-DELETE should be populated from the API. If 0 occurrences, say "no recorded history" instead of "0 occurrences".*

### Group 6 — Overflow Action Menus

**Routine card overflow (from active index):**
Bottom-anchored action list sheet (not a floating popover).
- "Edit routine" → opens EDIT-ROUT-1 sheet
- "Pause" → opens ACTION-PAUSE sheet
- "Archive" → opens ACTION-ARCHIVE sheet
- "Delete" → opens ACTION-DELETE sheet

**Routine card overflow (for completed current cycle):**
Same as active. "Pause" is still available even when the routine just completed.

**Routine card overflow (paused):**
- "Edit routine" → opens EDIT-ROUT-1 sheet
- "Resume" → immediate action with confirmation banner
- "Archive" → opens ACTION-ARCHIVE sheet
- "Delete" → opens ACTION-DELETE sheet

**Routine card overflow (archived):**
- "Restore" → immediate action with confirmation banner
- "Delete" → opens ACTION-DELETE sheet

**Routine detail overflow:**
Same options as index card overflow, context-aware for current routine state.

All overflow sheets use the standard bottom sheet pattern. Action list items: 14px/600, `--ink`, 56px minimum tap height, `--ink-4` dividers, danger items use `--rose` text.

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately, No Confirmation)

Per D-010. These are non-destructive and reversible through normal UI.

- Mark routine occurrence complete (tap checkbox or detail CTA)
- Create routine (after form submit)
- Edit title, owner, or recurrence rule (after form save)
- Resume paused routine
- Restore archived routine

> *Complete: show brief mint banner "✓ Marked complete" — 3 second auto-dismiss. This confirms the action without being interruptive.*

> *Resume / Restore: brief mint banner "↩ Routine resumed." / "↩ Restored to active routines." — 5 second auto-dismiss.*

### 4.2 Actions Requiring Confirmation (Always Confirm Regardless of Initiator)

Per D-010. These are state-administrative or destructive.

- Pause routine → ACTION-PAUSE sheet
- Archive routine → ACTION-ARCHIVE sheet
- Delete routine → ACTION-DELETE sheet (higher friction than archive)

### 4.3 Agentic (Olivia-Proposed) Actions

Olivia may suggest but never execute.

| **Olivia suggestion** | **Confirmation required?** | **Notes** |
|---|---|---|
| Suggest adjusting schedule after 3+ consecutive misses | Yes — tapping "Edit routine" in the advisory block opens EDIT-ROUT-1 | Never auto-changes the recurrence rule |
| General advisory ("These 3 routines are overdue") | No confirmation for the advisory itself — it is informational | Any action the user takes from it follows normal rules |

### 4.4 Navigation Model

1. Bottom nav "Household" tab → Household hub
2. Household hub → "Routines" segment → Routines index (Active filter default)
3. Routines index → filter chip "Archived" → Archived routines (same screen, filter switch)
4. Routines index → card tap → Routine detail (back: "← Household")
5. Routine detail → overflow → bottom sheet (sheet overlay, no nav change)
6. Routine detail → "Mark complete" CTA → immediate completion (no nav change; CTA becomes "Done ✓" then hides)
7. Routine detail → "Edit" in overflow → EDIT-ROUT-1 sheet → saved → detail screen refreshes in place
8. Routine detail → "Archive" in overflow → ACTION-ARCHIVE → confirmed → navigate back to Household (Routines segment)
9. Routines index → "New routine" → CREATE-ROUT-1 sheet → created → index refreshes with new routine visible

> *After completing a routine on the detail screen, stay on the detail screen. The CTA changes to "Done ✓" briefly (mint, 2s) then hides. The status badge updates to "Done" (mint) and the "Next due:" row appears. No auto-navigate back to the index.*

> *Back link in Routine detail always reads "← Household". If arriving via deep link or search result, fall back to "← Household" pointing to `/lists` (which shows the segment control and the user can switch to Routines).*

---

## 5. Layout & Spacing Spec

### 5.1 Household Hub — Segment Control

| **Element** | **Spacing / size** |
|---|---|
| Segment strip container | `margin: 0 16px 16px`, `padding: 4px`, `background: var(--surface-2)`, `border-radius: 20px` |
| Segment pill (active) | `padding: 7px 20px`, `background: var(--violet)`, `color: white`, `border-radius: 16px` |
| Segment pill (inactive) | `padding: 7px 20px`, `color: var(--ink-2)` |
| Segment label font | Plus Jakarta Sans 13px/600 |
| Transition | `transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1)` |

### 5.2 Routine Index

| **Element** | **Spacing / size** |
|---|---|
| Screen title ("Routines") | Fraunces 28px/700, `margin-bottom: 4px` |
| Subtitle (count / filter state) | Plus Jakarta Sans 13px/400, `--ink-2`, `margin-bottom: 16px` |
| Filter chips row (Active / Archived) | `margin-bottom: 16px`; overflow-x auto, no scrollbar |
| "New routine" button | `margin-bottom: 20px` |
| Section group header | ALL CAPS 10px/700, `--ink-3`, `letter-spacing: 1.2px`, `margin: 16px 0 8px` |
| First group header | `margin-top: 0` (no top gap on first visible group) |
| Routine card | `margin-bottom: 10px`; last card in group `margin-bottom: 0` |
| Card inner padding | 14px top/bottom, 16px left/right |
| Card title row | title (flex: 1) + optional checkbox + badge, `align-items: center` |
| Card meta row | `margin-top: 3px` |
| Horizontal page padding | 16px left/right for card container |
| Bottom scroll padding | 100px (clears bottom nav) |

**"New routine" button spec:**
- Full width within 16px page padding
- `border: 1.5px dashed var(--lavender-mid)`, `border-radius: 18px`, transparent bg
- Icon: 26×26px, `border-radius: 8px`, `--violet-dim` bg, `--violet` color, ↻ symbol
- Label: Plus Jakarta Sans 14px/600, `--violet`, "New routine"
- On hover/press: `background: var(--violet-dim)`
- Disabled state (spouse): button is hidden, not disabled

### 5.3 Routine Detail Screen

| **Element** | **Spacing / size** |
|---|---|
| Back link ("← Household") | Plus Jakarta Sans 13px/600, `--violet`, `margin-bottom: 16px` |
| Routine title (Fraunces) | 28px/700, `--ink`, `margin-bottom: 6px` |
| Status row (badge + due date) | `margin-bottom: 4px` |
| Meta row (owner · recurrence) | 12px/400, `--ink-2`, `margin-bottom: 4px` |
| Next due row (when completed) | 12px/400, `--ink-2`, "Next due: [date]", `margin-bottom: 12px` |
| Spouse banner (when present) | `margin-bottom: 12px` |
| "Mark complete" CTA | Full width, `--violet` bg, white text, 12px radius, `padding: 12px 16px`, `margin-bottom: 20px` |
| Olivia advisory block | `margin: 0 0 16px` |
| History section title ("History") | Fraunces 19px/700, `--ink`, `margin-bottom: 12px` |
| History entry row | min 44px height, `padding: 10px 16px` |
| "Show older history" row | `padding: 12px 16px`, `--violet` text |
| Scroll area bottom padding | 80px (clears bottom nav) |
| Horizontal page padding | 16px left/right |

### 5.4 Sheet Padding & Internal Spacing

Mirrors the reminders and shared lists spec exactly for consistency.

| **Element** | **Spec** |
|---|---|
| Sheet horizontal padding | 20px left and right |
| Sheet top padding (below handle) | 20px above sheet title |
| Sheet bottom padding | 100px (clears bottom nav) |
| Handle: size | 40×4px pill, `--ink-4` bg, centered |
| Handle: margin-bottom | 18px |
| Form section gap | 16px between fields |
| Form label margin-bottom | 4px |
| Owner chip row gap | 8px between chips |
| Recurrence pill row gap | 8px between pills |
| Custom interval row gap | 8px (between label text and input) |
| Input field padding | 11px top/bottom, 14px left/right |
| Action row gap | 10px between buttons |
| Action row margin-top | 8px above button row |

---

## 6. Data Fields Surfaced per Component

### 6.1 Routine Index Card

- `id` — for navigation to detail and completion command
- `title` — displayed, single-line truncated
- `status` — `active`, `paused`, or `archived` (determines card opacity, overflow options, and checkbox visibility)
- `dueState` — derived: `overdue`, `due`, `upcoming`, `completed`, `paused` (drives left border and badge)
- `currentDueDate` — formatted as "Today", "Tomorrow", or "Mon, Mar 10"
- `recurrenceRule` + `intervalDays` — formatted as "Daily", "Weekly", "Monthly", "Every N days"
- `owner` — displayed in meta row: "Me" (stakeholder) / "Spouse"
- `version` — passed with completion command for optimistic concurrency
- `has_pending_commands` — presence of outbox items triggers sync dot

### 6.2 Routine Detail Screen

All index card fields plus:

- Full `owner` display (name, not just "Me"/"Spouse")
- `occurrences[]` — ordered array of occurrence objects for the history timeline (see 6.3)
- `archivedAt` — shown as "Archived on [date]" in the header when `status === 'archived'`
- `createdAt` — not surfaced in UI (internal use only)

### 6.3 Completion History Entry

- `id` — internal
- `dueDate` — the original due date this occurrence covers
- `completedAt` — null if missed; non-null if completed
- `completedBy` — `stakeholder` or `spouse` — display as "Me" or "Spouse"
- Derived `type`: `completed` (completedAt non-null) or `missed` (completedAt null)

### 6.4 Create / Edit Form Fields

- `title` — text input
- `owner` — enum chip: `stakeholder` | `spouse` | `unassigned`
- `recurrenceRule` — enum pill: `daily` | `weekly` | `monthly` | `every_n_days`
- `intervalDays` — integer input (only when `every_n_days`)
- `firstDueDate` — date string (ISO YYYY-MM-DD, displayed as "Mon, Mar 10")

---

## 7. Edge Cases & Failure Modes

### 7.1 Long Routine Titles

- Index card: single line, `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Never wraps.
- Detail header (Fraunces 28px): wraps to 2 lines max; beyond: `-webkit-line-clamp: 2`.
- ACTION-DELETE body copy: routine title is quoted and should truncate at 40 characters with "…" if very long.

### 7.2 Zero Completion History

- If a routine is newly created and has never been completed, the history section shows a single Fraunces italic row: *"No completions yet — history will appear here once you mark this routine done."*
- No empty box or skeleton. The "History" section header still renders.

### 7.3 Large History Volume

- The default render limit is 30 entries (per decision 0.4). Beyond 30, show the "Show older history →" row.
- This is a UI rendering limit only — the API should support a `limit` parameter. The repository query should return the most recent N occurrences by default.

### 7.4 Completing an Already-Completed Routine

- The completion CTA is hidden when `dueState === 'completed'`. The user cannot double-complete.
- If the user navigates back and the card still shows the checkbox (stale cache), the complete command will return a version conflict — handle gracefully with a toast: "Already marked complete." and refresh the card state.

### 7.5 Overdue Routine — Next Due Date Display

- When the user marks an overdue routine complete, the next due date should visibly advance.
- Before completion: meta row shows "Overdue since [date]"
- After completion: "Next due: [calculated future date]"
- This confirms the schedule-anchored advancement behavior (architecture decision B from the implementation plan) without requiring the user to understand the underlying logic.

### 7.6 Recurrence Rule Edit Mid-Cycle Warning

- When the user changes the recurrence rule in EDIT-ROUT-1, a subtle informational note appears below the recurrence row: *"Next due date will recalculate from the start of the current cycle."*
- This is informational only — no confirmation required. It is rendered in 12px/400, `--ink-3`, below the recurrence pill row.

### 7.7 Custom Interval Edge Cases

- If `intervalDays` is 1, the recurrence label shows "Every day" (same as daily) — acceptable; display "Every 1 day."
- If `intervalDays` is not set when `every_n_days` is selected, the create button remains disabled.

### 7.8 Spouse Attempting Write (Stale Cache)

- Spouse cannot see write controls in the designed UI.
- If a spouse somehow triggers a write, the API returns a 403 read-only error.
- Toast: *"Routines are managed by Lexi."* Non-blocking.

### 7.9 Paused Routine in Archived Filter

- Paused routines appear in the Active filter (they are not archived). Do not show paused routines in the Archived filter.
- If the user archives a paused routine: confirmation sheet proceeds normally; the routine moves from Paused group in Active to the Archived filter.

### 7.10 Dark Mode Sheet Overlays

- Sheet background: `--surface` (`#1C1A2E` in dark). Not `--bg`.
- Form inputs inside sheets: `--surface-2` background in dark.
- Handle pill: `--ink-4` — subtle light band in dark mode. Acceptable contrast.

### 7.11 Offline Completion — Optimistic State

- On offline completion: the card immediately transitions to `completed` state (mint border, "Done" badge, no checkbox). A sync dot appears.
- The completion CTA on the detail screen changes to "✓ Marked complete" (disabled state, mint) until sync.
- On reconnect: outbox flushes; if server confirms, sync dot clears. If version conflict, show toast "Couldn't sync — please try again." and revert to prior state.

### 7.12 Many Overdue Routines

- The spec notes: "A household that falls behind on several routines should not feel overwhelmed."
- If there are 5+ overdue routines, the group header reads "OVERDUE (5)" with the count in parentheses.
- No red wash on the screen, no alert icons, no push notifications. The count is informational.
- The overdue group appears first but uses the same calm card treatment as other groups — only the rose left border distinguishes them.

---

## 8. Dark Mode Notes

Dark mode is fully automatic via token inheritance except where noted.

| **Element** | **Dark mode consideration** |
|---|---|
| Segment control strip | `--surface-2` resolves to `#242038` — elevated from `--bg` (`#12101C`). Clear distinction. No override needed. |
| Rose overdue border | `--rose` is unchanged (`#FF7EB3`) — vivid on dark surface. No override. |
| Peach due border | `--peach` is unchanged (`#FFB347`) — warm amber on dark. No override. |
| Neutral upcoming border | `--ink-4` resolves to `rgba(237,233,255,0.1)` — faint white line, subtly visible. Acceptable. |
| Paused card opacity | 0.65 over `--surface` (`#1C1A2E`) — still distinguishable from background (`#12101C`). No override. |
| Missed history entries | `--ink-3` on `--surface` in dark: `rgba(237,233,255,0.35)` on `#1C1A2E`. Intentionally low-contrast (de-emphasised). Acceptable — primary signal is the completed entries. |
| New routine dashed button | `--lavender-mid` border resolves to `#3D3660` — visible deep indigo dashed line. No override. |
| Spouse banner | `--lavender-soft` resolves to `#2A2545` — distinct from both `--bg` and `--surface`. Natural visual separation without border. `--violet` text is unchanged. |
| Create sheet inputs | `--surface` background (`#1C1A2E`). `--lavender-mid` border (`#3D3660`). Focus glow: `--violet-glow` (stronger in dark, automatic). |
| Owner chips / recurrence pills | Inactive: `--surface-2` bg resolves to `#242038`. Active: `--violet` bg unchanged. No override. |
| Olivia advisory block | `--surface-2` resolves to `#242038` — slightly elevated from card `--surface`. Clear block differentiation. |
| Section group headers | `--ink-3` resolves to `rgba(237,233,255,0.35)` — soft, readable all-caps label. No override. |
| "Mark complete" CTA | `--violet` bg unchanged. White text on violet: passes contrast. No override. |

---

## 9. Accessibility Notes

- All interactive elements: minimum tap target 44×44px. Completion checkbox is 22×22px visual but has a 44×44px hit area via padding.
- Checkbox communicates state via fill color AND a visible checkmark glyph — two independent signals.
- Due-state badges use both color and text — color is never the sole differentiator.
- Left-border accent is a supplementary signal only — badge text carries the accessible meaning.
- Spouse banner communicates role constraint through text, not visual indicator alone.
- Focus states: `box-shadow: 0 0 0 4px var(--violet-glow)` on all focusable elements. Stronger in dark mode automatically.
- Sheet overlays trap focus while open; focus returns to triggering element on close.
- Inert spouse elements (if any are rendered): `aria-disabled="true"` and `pointer-events: none`. Do not render interactive affordances that are unavailable to the spouse.
- Completion checkbox: `aria-label="Complete '[routine title]'"` when uncompleted; `aria-label="Completed"` when already done.
- Group headers: `role="heading"` or styled with appropriate heading semantics, not just visual all-caps spans.
- Overflow menu button: `aria-label="Routine options"` or `aria-label="[routine title] options"`.
- History entries: use `<ol>` or `<ul>` with `<li>` for screen reader list semantics.
- `prefers-reduced-motion`: disables `taskIn` stagger animations on routine cards. Cards appear at full opacity immediately. Sheet entrance transitions: `transition-duration: 0.01ms`.
- History missed entry: `aria-label="Missed — [date]"` on the row for screen readers — the text content is sufficient.

---

## 10. Open Design Questions

The following questions are not blocking Phase 1 implementation but should be revisited before a later iteration.

1. **Segment control placement in the Household hub:** Should the segment control ("Lists" / "Routines") be part of the screen header (sticky, does not scroll) or part of the content area (scrolls)? The current spec places it in the content area for simplicity. If meal planning is added as a third segment later, a sticky segment control may improve the experience.

2. **Completion history: show all-time or recent only by default?** The spec defaults to 30 entries (most recent). Some households may want to review the full history for annual maintenance routines. A "show all" or "show by year" grouping would help. Recommend adding to Phase 2 backlog.

3. **Batch complete for multiple routines:** When several overdue routines stack up, completing each one individually adds friction. A "Clear all overdue" or multi-select pattern could help. Not in Phase 1 scope — assess after household usage.

4. **Home screen Routines summary:** Should the Home screen surface overdue or due-today routines in a summary section, similar to how reminders appear? This would increase discoverability before the user navigates to Household. Design brief should follow once Phase 1 is in use.

5. **Routines in the Olivia nudge card:** When multiple routines are overdue, should the nudge card surface this observation? The advisory-only pattern supports it. This is a future product decision — no design work needed in Phase 1.

6. **Spouse write access to completion:** When spouse write access arrives (spec-deferred), the spouse banner pattern will need revision and completion checkboxes will appear in spouse view. Flag for future design brief.

7. **Meal planning as a third Household segment:** If meal planning arrives as a third sibling workflow, the segment control grows to three pills ("Lists" / "Routines" / "Meals"). Verify readability at three segments on a 390px viewport before finalizing the meal planning design brief.

---

*— End of specification —*
