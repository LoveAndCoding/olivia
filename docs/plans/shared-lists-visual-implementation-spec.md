---
title: "Olivia — Shared Lists: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Shared Lists
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Shared Lists feature for Olivia. It covers design tokens and typography rules, component anatomy, all screen states with precise layout specs, interaction rules and approval model, data fields surfaced per component, and edge cases.
>
> Key design decisions resolved here: navigation placement, check-off interaction, checked item position, archived list filter, and spouse read-only indicator pattern. These are documented with rationale so future agents do not re-derive them.

---

## 0. Design Decisions Resolved

The following decisions were open in `docs/specs/shared-lists.md` and are resolved here.

### 0.1 Navigation Placement

**Decision:** Shared Lists gets a dedicated fifth tab in the bottom navigation bar.

**Rationale:** Lists is a first-class Horizon 3 household coordination workflow with its own index, detail, and create flows. Nesting it under Home or Tasks would reduce discoverability and create ambiguity about whether lists are tasks. The design system's four-tab model was scoped to the MVP nav; this is the first sanctioned expansion of that surface. The tab uses a checklist icon (☑) and the label "Lists."

**Bottom nav (updated):**
```
┌────────┬────────┬────────┬────────┬────────┐
│ 🏡 Home│ ✅Tasks│  ✦ AI │ ☑ Lists│🗂️Memory│
└────────┴────────┴────────┴────────┴────────┘
```

**Implementation note for nav:** The Lists tab active state uses `--lavender-soft` background pill and `--violet` label — same as existing tabs. No new token needed.

### 0.2 Check-Off Interaction

**Decision:** Tap checkbox. No swipe-to-check in Phase 1.

**Rationale:** Consistent with the existing task card checkbox component (documented in `design-components.md`). Tap checkboxes are immediately discoverable, accessible via keyboard and screen reader, and do not conflict with list scrolling on mobile. This pattern is also directly reusable for the Recurring Routines workflow. Swipe-to-complete can be evaluated in a later iteration once household usage reveals whether it is wanted.

### 0.3 Checked Item Position

**Decision:** Checked items stay in place — they do not move to the bottom.

**Rationale:** On a real grocery run, the household member scans the list top-to-bottom and checks items off as they encounter them in the store. Moving checked items to the bottom mid-run would be disorienting and would break scan continuity. Checked items are visually deprioritized (strikethrough + `--ink-3` text) but remain positionally stable. Future "move completed to bottom" behavior is a reasonable preference feature, not a Phase 1 requirement.

### 0.4 Archived List Filter

**Decision:** Filter tab on the list index. The index header area contains two filter chips: "Active" (default) and "Archived." Tapping "Archived" reveals the archived list index in the same screen area.

**Rationale:** A full separate screen for archived lists adds nav complexity and makes the archive feel more prominent than it should be. A filter chip on the same screen keeps the model simple and mirrors the "Done" filter chip on the All Reminders screen. The archived view never appears by default — users must deliberately switch to it.

### 0.5 Spouse Read-Only Indicator

**Decision:** Per-screen banner at the top of the scrollable content area, not per-component disabled controls.

**Rationale:** Per-component disabled controls (grayed-out buttons) create ambiguity — the spouse may not understand why buttons appear broken. A single banner per screen — "You're viewing as a household member. Lists are managed by Lexi." — communicates the constraint once and clearly. This is consistent with the design intent in the reminders spec for spouse views (OLI-9). The banner uses `--lavender-soft` background with `--violet` text and does not scroll away.

---

## 1. Design System Constraints

All Shared Lists UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`. Key constraints are summarized below.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Shared Lists** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "Lists" screen header |
| List name (index card) | Plus Jakarta Sans | 14px | 600 | List title in card |
| List name (detail header) | Fraunces | 28px | 700 | List title at top of detail screen |
| Item text (unchecked) | Plus Jakarta Sans | 14px | 500 | Item body text, active |
| Item text (checked) | Plus Jakarta Sans | 14px | 500 | Strikethrough, `--ink-3` |
| Olivia message | Fraunces italic | 15–16px | 300 | All-done suggestion, empty states |
| Meta / count | Plus Jakarta Sans | 11–12px | 400–500 | Item counts, last-updated, sync state |
| Badge / label | Plus Jakarta Sans | 10px | 700 | ALL CAPS section labels, filter chips |
| Spouse banner | Plus Jakarta Sans | 13px | 500 | Read-only role indicator text |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light Value** | **Dark Value** |
|---|---|---|---|
| Checked item text | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| All-done left border accent | `--mint` | `#00C9A7` | `#00C9A7` |
| All-done badge bg | `--mint-soft` | `#E0FFF9` | `#0A2820` |
| All-done badge text | `--mint` | `#00C9A7` | `#00C9A7` |
| Checkbox checked fill | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Checkbox hover | `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` |
| Inline add input border | `--lavender-mid` | `#D4CCFF` | `#3D3660` |
| Inline add input border (active) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Spouse banner background | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Spouse banner text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Pending sync indicator | `--sky` | `#48CAE4` | `#48CAE4` |
| Pending sync bg | `--sky-soft` | `#E0F7FC` | `#0A2228` |
| Card background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Sheet overlay | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Olivia message bg | `--surface-2` | `#F3F0FF` | `#242038` |

### 1.3 List Card Left Border Rule

List index cards use a left border accent to communicate list completion state at a glance, following the reminder row border pattern.

| **List state** | **Border token** | **Notes** |
|---|---|---|
| Active, items unchecked | none (no border) | Default — no accent needed |
| Active, all items checked | `--mint` | Signal: this list may be ready to archive |
| Active, no items yet | none | Empty lists have no accent |
| Archived | `--ink-4` | Muted — archived lists are de-emphasized |

### 1.4 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| List index card | 18px |
| List detail item row | 12px |
| Bottom sheet overlay | 28px top corners, 0px bottom |
| Inline add input | 16px |
| Filter chip (Active/Archived) | 20px (fully rounded) |
| Action buttons (primary, danger) | 12px |
| Spouse banner | 12px |
| All-done badge pill | 20px (fully rounded) |
| Confirmation modal | 18px |

---

## 2. Component Anatomy

### 2.1 List Index Card

Used in: Lists index (Active and Archived filters).

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | 18px radius, `--surface` bg, `--shadow-sm`, `--ink-4` border | border-left: 3px solid [state token] if applicable |
| Title | 14px/600, `--ink`, single line truncated with ellipsis | max-width: 100% |
| Count meta | 12px/400, `--ink-2` | "N items · N checked" or "All done" badge |
| Last updated | 11px/400, `--ink-3` | "Updated 2h ago" relative timestamp |
| All-done badge | Pill: `--mint-soft` bg, `--mint` text, "✓ All done", 20px radius | Shown only when all items checked AND count > 0 |
| Overflow menu | Three-dot icon (·· ·), right-aligned, 44×44px tap target | Opens action sheet: Edit title, Archive, Delete |
| Pending sync dot | 6×6px `--sky` dot | Shown bottom-right when list has offline-pending commands |

**Hover state:** `transform: translateX(3px)`, `box-shadow: var(--shadow-md)`, `border-color: var(--lavender-mid)`

**Press state:** `transform: scale(0.98)`

**Archived variant:** Opacity 0.7 on the entire card. `--ink-4` left border. Overflow menu shows Restore + Delete only (no Archive).

### 2.2 Inline Item Add Input (Sticky Footer)

Used in: List Detail screen. Sticky above the bottom nav. This is the primary creation surface for list items.

- Container: `--surface` bg, `border-top: 1px solid var(--ink-4)`, `padding: 12px 16px 16px`
- Input field: `border: 2px solid var(--lavender-mid)`, `border-radius: 16px`, `padding: 11px 14px`
- Placeholder text: Fraunces italic, `--ink-3`, e.g. *"Add an item…"*
- Add button: Right side of input, `--violet` background, white "+" icon, 36×36px, `border-radius: 10px`
- Focus: `border-color: var(--violet)`, `box-shadow: 0 0 0 4px var(--violet-glow)`
- On submit: item appears at bottom of list; input clears and remains focused for rapid-fire entry

**Dark mode note:** Input background is `--surface` (`#1C1A2E`), border shifts to `--lavender-mid` (`#3D3660`). The placeholder in Fraunces italic is readable at `--ink-3` (`rgba(237,233,255,0.35)`). No explicit override needed.

### 2.3 List Item Row

Used in: List Detail. The scrollable area above the sticky footer.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Full width, `padding: 12px 16px`, `border-radius: 12px` | Touchable; tap targets on checkbox and overflow separately |
| Checkbox | 22×22px circle, `border: 2px solid var(--ink-4)` → `--violet` fill when checked | Matches existing task card checkbox spec |
| Item text (unchecked) | 14px/500, `--ink` | Wraps to two lines max; beyond: ellipsis |
| Item text (checked) | 14px/500, `--ink-3`, `text-decoration: line-through` | Strikethrough is the primary checked signal |
| Pending sync dot | 6×6px `--sky` dot, right-aligned | Shown for items with pending outbox commands |
| Divider | 1px `--ink-4`, `margin: 0 0 0 38px` | Indented past checkbox width; absent on last item |

**Checkbox interaction:**
- Tap checkbox → immediate optimistic toggle, no confirmation
- Checked → unchecked: reverses immediately, no confirmation
- Checkbox hover: `border-color: var(--violet)`, `background: var(--violet-dim)`
- Checkbox checked fill: `background: var(--violet)`, white `✓` (11px bold)

**Item long-press / swipe (future):** Not in Phase 1. The overflow icon (three dots) on the right side of each item row provides edit and delete access. Overflow icon is 44×44px tap target but visually a single dot icon at 20px to keep rows light.

### 2.4 Bottom Sheet (Create List / Edit Title / Edit Item / Confirm)

All write actions that require a title input or confirmation use a bottom sheet overlay following the reminders spec pattern.

- Sheet: `--surface` bg, `border-radius: 28px 28px 0 0`
- Shadow (light): `box-shadow: 0 -8px 40px rgba(26,16,51,0.12)`
- Shadow (dark): `box-shadow: 0 -8px 40px rgba(0,0,0,0.5)`
- Handle: `40×4px` pill, `--ink-4` bg, centered, `margin-bottom: 18px`
- Sheet title: Fraunces 22px/700, `--ink`, `margin-bottom: 20px`
- Content behind sheet: `filter: blur(2px); opacity: 0.3` on page content (not the nav)
- Bottom nav: visible and unblurred above the sheet

### 2.5 Olivia Message Block (All-Done Suggestion)

Used in: List Detail when all items are checked. Advisory-only — Olivia suggests but never archives automatically.

- Container: 18px radius, `--surface-2` bg, `padding: 14px 16px`, `margin: 12px 16px`
- Label row: "✦ Olivia noticed" — 10px/700, `--violet`, uppercase, `letter-spacing: 1.2px`
- Text: Fraunces italic 15px/300, `--ink`, line-height 1.5
- Copy example: *"Everything on this list is checked. Want to archive it?"*
- Action buttons: "Archive" (secondary, confirms via archive sheet) + "Not yet" (dismisses omsg)
- This omsg is only shown once per session per list — after dismiss it stays hidden until the tab is re-navigated

### 2.6 Spouse Read-Only Banner

Used in: All Lists screens when the viewer is the spouse. Appears at the top of the scrollable content, pinned below the screen header.

- Container: `--lavender-soft` bg, `border-radius: 12px`, `padding: 10px 16px`, `margin: 0 16px 12px`
- Text: Plus Jakarta Sans 13px/500, `--violet`
- Copy: "Viewing as household member — Lexi manages these lists."
- No dismiss button — banner persists for the entire session on any Lists screen

**Dark mode note:** `--lavender-soft` resolves to `#2A2545` in dark — a deep indigo band that reads as clearly distinct from both `--bg` (`#12101C`) and cards (`--surface: #1C1A2E`). `--violet` text is unchanged and passes contrast on this background.

### 2.7 Pending Sync Indicator

Used in: any list card or item row with offline-pending commands.

- Icon: 6×6px circle, `--sky` color
- Positioned: bottom-right of list card / right side of item row
- Tooltip (on long press): "Waiting to sync"
- Full offline state (no connection at all): sky banner at top of Lists screen — "Offline. Changes will sync when you reconnect." — matches the design established in reminders

---

## 3. Screen States Reference

### Group 1 — Lists Index

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| LIST-IDX-1 | Active lists, multiple | Light | Default view. "Active" filter chip selected. List cards stagger in (taskIn animation). Add button at top. No left border on cards unless all-done. |
| LIST-IDX-2 | Active lists, one all-done | Dark | All-done card shows `--mint` left border + "✓ All done" pill badge in count area. Other cards normal. |
| LIST-IDX-3 | Empty — no active lists | Light | "Active" chip selected. Large empty state: Fraunces italic Olivia message + dashed "New List" button. No nudge card. |
| LIST-IDX-4 | Archived filter | Dark | "Archived" chip selected. Archived cards at 0.7 opacity with `--ink-4` border. Overflow menu shows Restore + Delete only. If no archived lists: Olivia empty state message. |
| LIST-IDX-5 | Spouse read-only view | Light | Spouse banner pinned below header. All list cards visible but overflow menu absent. New List button hidden. Filter chips functional (Active/Archived visible). |

> *LIST-IDX-3 Olivia empty state copy (Fraunces italic): "No lists yet. Create one for groceries, packing, or anything the household needs to track together."*

> *LIST-IDX-4 Olivia empty state copy: "No archived lists. Lists you archive will appear here."*

### Group 2 — List Detail

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| LIST-DET-1 | Mixed unchecked + checked items | Light | Default operational view. Checked items strikethrough + `--ink-3` in place. Sticky inline add at bottom. Overflow menu in header: Edit title, Archive, Delete. |
| LIST-DET-2 | All items checked | Dark | Olivia omsg block appears above sticky footer suggesting archive. `--mint` accent visible in item checkboxes. Header subtitle: "All done." |
| LIST-DET-3 | Empty list (just created) | Light | No items yet. Single Fraunces italic message in scroll area: *"Nothing here yet — add the first item below."* Sticky add input focused by default on entry. |
| LIST-DET-4 | Spouse read-only | Light | Spouse banner below header. Item rows visible but checkbox is not tappable (pointer-events: none on checkbox). No sticky add input. Overflow menu absent. |
| LIST-DET-5 | Offline, items pending | Dark | Items with pending commands show `--sky` sync dot. Sky offline banner at top of scrollable area. Inline add still functional (writes to outbox). |

> *LIST-DET-4: The checkbox in spouse view must not show the hover state or pointer cursor. It must appear as a visible but inert element — not grayed out (which would imply a broken state) but non-interactive.*

> *LIST-DET-5 offline banner copy: "Offline — your changes will sync when you reconnect." Banner dismisses when connection is restored.*

### Group 3 — Create & Edit Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| CREATE-LIST-1 | Create new list — blank | Light | Sheet title: "New list". Single title text input, focused. Placeholder: *"Grocery run, Packing list…"* (Fraunces italic). Primary btn: "Create list". Ghost btn: "Cancel". |
| EDIT-TITLE-1 | Edit list title | Dark | Sheet title: "Rename list". Input pre-filled with current title. Primary btn: "Save". Ghost btn: "Cancel". |
| EDIT-ITEM-1 | Edit item text | Light | Sheet title: "Edit item". Input pre-filled with current item text. Primary btn: "Save". Ghost btn: "Cancel". |

> *CREATE-LIST-1: "Create list" button is disabled when input is empty (visual: violet bg at 40% opacity, pointer-events: none). Button enables as soon as any non-whitespace character is entered.*

> *Sheets should not include list type, template, or category selectors. Phase 1 is general-purpose only.*

### Group 4 — Destructive Action Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ACTION-ARCHIVE | Archive confirm | Light | Sheet title: "Archive this list?". Body copy: *"It will be hidden from your active view but not deleted. You can restore it from the Archived filter."* Buttons: danger-secondary "Archive" + ghost "Cancel". |
| ACTION-DELETE | Delete confirm | Dark | Sheet title: "Permanently delete?". Body copy: *"This will remove [list name] and all [N] items. This cannot be undone."* Buttons: danger-primary "Delete list" + ghost "Keep it". Higher friction than archive: danger-primary (not secondary). |
| ACTION-DELETE-ITEM | Delete item confirm | Light | Sheet title: "Remove item?". Body: *"'[Item text]' will be removed from this list."* Buttons: danger-secondary "Remove" + ghost "Cancel". |

> *The list name should be quoted in ACTION-DELETE body copy. N items count should be populated. If the list has 0 items, show "all items" generically.*

> *Restore archived list: No confirmation sheet needed — restore is a non-destructive user-initiated action that executes immediately (per D-010). A brief confirmation banner appears: "Restored to active lists." with an "Undo" link for 5 seconds.*

### Group 5 — Overflow Action Menus

**List card overflow (from index):**
Appears as a bottom-anchored action list sheet — not a floating popover — for accessibility and thumb reach on mobile.

- "Rename" → opens EDIT-TITLE-1 sheet
- "Archive" → opens ACTION-ARCHIVE sheet
- "Delete" → opens ACTION-DELETE sheet

**List card overflow (archived):**
- "Restore" → immediate action with confirmation banner
- "Delete" → opens ACTION-DELETE sheet

**Item row overflow (from detail):**
- "Edit item" → opens EDIT-ITEM-1 sheet
- "Remove item" → opens ACTION-DELETE-ITEM sheet

All overflow sheets use the standard bottom sheet pattern (2.4). Action list items: 14px/600, `--ink`, 56px minimum tap height, `--ink-4` dividers between items, danger items use `--rose` text.

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

The following actions execute immediately with no confirmation step when user-initiated (per D-010). They are reversible through normal UI.

- Create list (after naming)
- Add item
- Check item
- Uncheck item
- Edit list title
- Edit item text
- Restore archived list

> *Restore: show a brief "Restored" confirmation banner (mint bg, "↩ Restored to active lists", auto-dismiss 5s) but do not require a confirmation sheet beforehand.*

### 4.2 Actions Requiring Confirmation (Always Confirm)

The following actions always require explicit confirmation regardless of initiator.

- Archive list → ACTION-ARCHIVE sheet
- Delete list → ACTION-DELETE sheet
- Remove item → ACTION-DELETE-ITEM sheet

> *There is no undo for delete. Archive is the soft-delete path.*

### 4.3 Agentic (Olivia-Proposed) Actions

Olivia may suggest but never execute. The all-done omsg (Section 2.5) is the primary Olivia surface in Phase 1.

| **Olivia suggestion** | **Confirmation required?** | **Notes** |
|---|---|---|
| Archive completed list | Yes — tapping "Archive" in omsg triggers ACTION-ARCHIVE sheet | Never auto-archives |
| Create list from NLP input | Yes — structured form with pre-filled title shown for confirm | Deferred to future slice |

### 4.4 Navigation Model

Shared Lists uses a dedicated nav tab. Navigation within the Lists surface:

1. Lists nav tab → Lists index (Active filter default)
2. Lists index → filter chip "Archived" → Archived lists (same screen, filter switch)
3. Lists index → card tap → List Detail (back: Lists)
4. List Detail → overflow → bottom sheet (sheet overlay, no nav change)
5. List Detail → item checkbox → immediate toggle (no nav change)
6. List Detail → inline add input → item appears (no nav change)
7. List Detail → "Archive" in header overflow → ACTION-ARCHIVE sheet → confirms → returns to Lists index
8. Lists index → "New List" button → CREATE-LIST-1 sheet → created → index refreshes with new list visible

> *When entering a newly created list from the create sheet confirmation, navigate directly to that list's detail screen so the user can immediately add items. Do not drop them back to the index.*

> *Back link in List Detail reads "← Lists". If arriving from a context other than the Lists index (future: deep link), fall back to "← Lists".*

---

## 5. Layout & Spacing Spec

### 5.1 Lists Index

| **Element** | **Spacing / size** |
|---|---|
| Screen title ("Lists") | Fraunces 28px/700, `margin-bottom: 4px` |
| Subtitle (count) | Plus Jakarta Sans 13px/400, `--ink-2`, `margin-bottom: 16px` |
| Filter chips row (Active / Archived) | `margin-bottom: 16px`; overflow-x auto, no scrollbar |
| New List button | `margin-bottom: 20px`; dashed border style |
| List card | `margin-bottom: 10px`; last card `margin-bottom: 0` |
| Card inner padding | 14px top/bottom, 16px left/right |
| Card title row | title + overflow icon row, `align-items: center`, `justify-content: space-between` |
| Card meta row | `margin-top: 4px` |
| Horizontal page padding | 16px left/right for card container |

**New List button spec:**
- Full width within 16px page padding
- `border: 1.5px dashed var(--lavender-mid)`, `border-radius: 18px`, transparent bg
- Icon: 26×26px, `border-radius: 8px`, `--violet-dim` bg, `--violet` color, ☑ or ＋ icon
- Label: Plus Jakarta Sans 14px/600, `--violet`, "New list"
- On hover/press: `background: var(--violet-dim)`

### 5.2 List Detail Screen

| **Element** | **Spacing / size** |
|---|---|
| Back link | Plus Jakarta Sans 13px/600, `--violet`, "← Lists", `margin-bottom: 16px` |
| List title (Fraunces screen title) | 28px/700, `--ink`, `margin-bottom: 4px` |
| Subtitle (item count) | 13px/400, `--ink-2`, "N items · N checked", `margin-bottom: 16px` |
| Spouse banner (when present) | `margin-bottom: 12px` |
| Item row height | min 56px (touch target) |
| Checkbox | 22×22px, `margin-right: 13px`, vertically centered to first line of item text |
| Item text left offset | 38px (22px checkbox + 13px gap + 3px) |
| Item divider left offset | 38px (past checkbox) |
| Scroll area bottom padding | 120px (clears sticky input footer + bottom nav) |
| Sticky footer height | min 68px |
| Footer horizontal padding | 16px left/right |
| Footer top border | 1px `--ink-4` |
| Olivia omsg (all-done) | `margin: 0 16px 16px`, inside scroll area above footer |

### 5.3 Sheet Padding & Internal Spacing

Mirrors the reminders spec sheet spec exactly for consistency.

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

### 6.1 List Index Card

- `id` — for navigation to detail
- `title` — displayed, single-line truncated
- `status` — `active` or `archived` (determines card opacity and overflow options)
- `item_count` — total items, displayed in meta row
- `checked_count` — checked items, displayed in meta row; triggers all-done badge and mint border if `checked_count === item_count && item_count > 0`
- `updated_at` — formatted as relative label ("2h ago", "Yesterday")
- `has_pending_commands` — presence of outbox items for this list triggers sync dot

### 6.2 List Detail Screen

All index card fields plus:

- `items[]` — ordered array of item objects (see 6.3)
- `owner` — shown in header context if spouse needs to know who manages the list

### 6.3 List Item Row

- `id` — for mutation targeting
- `body` — item text
- `checked` — boolean, drives checkbox state and text styling
- `position` — integer, sort order (append-order in Phase 1)
- `has_pending_commands` — drives sync dot on individual item row

### 6.4 Create/Edit Sheets

- `title` — text input (lists)
- `body` — text input (items)

---

## 7. Edge Cases & Failure Modes

### 7.1 Long List Names

- Index card: single line, `overflow: hidden; text-overflow: ellipsis`. Never wraps.
- Detail header (Fraunces 28px): wraps to 2 lines max; beyond: `display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden`. Subtitle count adjusts position automatically.
- Create/Edit sheet input: single line, does not expand. User scrolls within the input field if the name is very long.

### 7.2 Long Item Text

- Item rows: wrap to 2 lines max; beyond: `display: -webkit-box; -webkit-line-clamp: 2; overflow: hidden`.
- Row minimum height 56px still applies when text wraps.

### 7.3 Very Long Lists (Many Items)

- The scroll area handles any item count. No virtualization required in Phase 1.
- Sticky footer remains fixed at bottom throughout. Users can add items without scrolling back up.
- If the list has 100+ items, no performance concern in Phase 1 — the spec notes lists are household-scoped and this is unlikely in typical grocery/packing use.

### 7.4 Empty List After All Items Removed

- If all items are deleted, the screen returns to LIST-DET-3 (empty state).
- The all-done omsg is never shown on an empty list — it requires `item_count > 0`.

### 7.5 Offline Add Item

- Item appears in the list immediately (optimistic).
- Inline add input remains active — user can keep adding items offline.
- Each offline item shows the `--sky` sync dot.
- Sky offline banner appears at top of scroll area.
- On reconnect: outbox flushes, sync dots clear, banner dismisses.

### 7.6 Archive While Offline

- Archive action requires confirmation sheet (ACTION-ARCHIVE). After confirmation, the list moves to archived state optimistically.
- Offline banner persists. Archive command enters outbox.
- On reconnect: server confirms archive; if rejected (e.g. version conflict), surface a toast error: "Couldn't archive — please try again." and restore the list to active state.

### 7.7 Simultaneous Edit (Two Devices)

- Versioned command semantics handle conflicts (A-006). If a version conflict is detected on reconnect, the later command wins. No richer conflict UI is needed in Phase 1.
- The item's `updated_at` timestamp helps the server detect conflicting writes.

### 7.8 Spouse Attempting Write

- Spouse cannot see write controls (overflow menus, add input, checkboxes are inert).
- If a spouse somehow triggers a write through a deep link or stale cached state, the API returns a read-only error.
- The app surfaces a toast: "Lists are managed by Lexi." — not a blocking error modal.

### 7.9 Dark Mode Sheet Overlays

- Sheet background must use `--surface` token (`#1C1A2E` in dark), not `--bg`.
- Inputs inside sheets use `--surface-2` as their background in dark mode.
- Handle pill uses `--ink-4` — renders as a subtle light band in dark mode.

### 7.10 Checked Item Visual Accessibility

- Strikethrough alone is not sufficient for accessibility — color also changes to `--ink-3`. Together: two independent channels.
- Checked checkbox provides a third channel (filled circle with checkmark).
- Contrast: `--ink-3` on `--surface` in dark mode is `rgba(237,233,255,0.35)` on `#1C1A2E`. This is intentionally below 4.5:1 since checked items are de-emphasized. The checkbox state (full contrast icon) remains the primary signal. Acceptable given the reversible, low-stakes nature of item checking.

---

## 8. Dark Mode Notes

Dark mode is fully automatic via token inheritance except where noted.

| **Element** | **Dark mode consideration** |
|---|---|
| New list dashed button | `--lavender-mid` border resolves to `#3D3660` — visible deep indigo dashed line. No override needed. |
| Spouse banner | `--lavender-soft` resolves to `#2A2545` — distinct from `--bg` (`#12101C`) and `--surface` (`#1C1A2E`). Natural visual separation without a border. |
| Olivia omsg | `--surface-2` resolves to `#242038` — slightly elevated from `--surface` (`#1C1A2E`). Clear block differentiation. |
| Sticky add footer | `border-top: 1px solid var(--ink-4)` resolves to `rgba(237,233,255,0.1)` — subtle separator. Acceptable. If contrast is too low, upgrade to `--lavender-mid`. |
| Checked item text | `--ink-3` on `--surface` in dark is intentionally low-contrast (de-emphasis). Primary check signal remains the checkbox fill. |
| All-done mint badge | `--mint-soft` resolves to `#0A2820` in dark — a deep teal tint. `--mint` text on this background passes contrast. |
| Pending sync dot | `--sky` is unchanged between modes — vivid teal reads well on both `--surface` and `--bg`. |
| Action sheet danger items | `--rose` text (`#FF7EB3`) on `--surface` (`#1C1A2E`) in dark — vivid pink, high contrast. No override needed. |

---

## 9. Accessibility Notes

- All interactive elements: minimum tap target 44×44px. Checkbox is 22×22px visual size but has a 44×44px hit area via padding.
- Checkbox state communicates via fill color AND a visible checkmark glyph — two signals, not just color.
- Strikethrough is paired with color change — two signals for checked items.
- Spouse banner communicates role constraint through text, not only visual indicator.
- Focus states: `box-shadow: 0 0 0 4px var(--violet-glow)` on all focusable elements. Stronger in dark mode automatically.
- Sheet overlays trap focus while open; focus returns to triggering element on close.
- Offline sync dot has a `title` attribute: "Waiting to sync" for screen reader discovery.
- Checked checkbox: `aria-checked="true"`, unchecked: `aria-checked="false"` on the checkbox role.
- Inert spouse checkboxes: `aria-disabled="true"` and `aria-label="Read-only"` on the checkbox container.
- `prefers-reduced-motion`: disables `taskIn` stagger animations on list and item rows. Items appear at full opacity immediately. Sheet entrance transitions: `transition-duration: 0.01ms`.

---

## 10. Open Design Questions

The following questions are not blocking Phase 1 implementation but should be revisited before a later iteration.

1. **Swipe-to-check:** Should items support a right-swipe to check/uncheck in Phase 2? Swipe conflicts with scroll on horizontal items — needs usability validation before committing to it.

2. **Batch clear checked items:** When the household wants to clear all checked items from a grocery list after a shop, there is no batch action in Phase 1. A "Clear checked" button in the overflow or footer could reduce friction significantly. Recommend adding to Phase 2 backlog.

3. **Reorder items:** Drag-to-reorder is deferred. Is there a cheaper interim solution (e.g. item move up/down in overflow menu) that helps without requiring drag infrastructure?

4. **List templates:** If the grocery list is re-created weekly, a "Duplicate list" action would reduce friction. Design implications: should duplicate bring items in unchecked state? Should it reset checked timestamps? Recommend as a Phase 2 design brief.

5. **Spouse write access:** When spouse write access for items (not list creation) arrives, the spinner banner and UI treatment need to be revised. The current per-screen banner approach will need to be replaced or removed. Flag for future design revision.

6. **Deep link behavior:** If a push notification eventually links directly to a specific list (future notification spec), the back link behavior and scroll-to-item behavior needs to be specified. Not applicable in Phase 1.

---

*— End of specification —*
