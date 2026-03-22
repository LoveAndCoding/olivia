---
title: "Olivia — Lists: Completed Item Management Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Lists: Completed Item Management
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Completed Item Management feature for Shared Lists. It covers the collapsed "Completed (N)" section, "Clear completed" and "Uncheck all" bulk actions, confirmation dialogs, and empty states. It is a complete, self-contained handoff document for an implementer.
>
> Product spec: `docs/specs/lists-completed-item-management.md`
> Base visual spec: `docs/plans/shared-lists-visual-implementation-spec.md`

---

## 1. Design System Constraints

All completed item management UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage** |
|---|---|---|---|---|
| Section header | Plus Jakarta Sans | 12px | 700 | "Completed (N)" section header |
| Section count | Plus Jakarta Sans | 12px | 500 | The "(N)" count inside header |
| Item text (checked) | Plus Jakarta Sans | 14px | 500 | Strikethrough, `--ink-3` color |
| Overflow menu label | Plus Jakarta Sans | 14px | 500 | "Clear completed", "Uncheck all" |
| Confirmation title | Fraunces | 22px | 700 | Dialog heading |
| Confirmation body | Plus Jakarta Sans | 14px | 400 | Descriptive text with count |
| Button label | Plus Jakarta Sans | 13px | 700 | Confirmation and cancel buttons |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light** | **Dark** |
|---|---|---|---|
| Completed section header bg | --surface-2 | #F3F0FF | #242038 |
| Completed section header text | --ink-2 | rgba(26,16,51,0.55) | rgba(237,233,255,0.6) |
| Chevron icon | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Checked item text | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Checked item checkbox fill | --mint | #00C9A7 | #00C9A7 |
| Checked item checkbox bg (rest) | --mint-dim | rgba(0,201,167,0.1) | rgba(0,201,167,0.15) |
| Overflow menu surface | --surface | #FFFFFF | #1C1A2E |
| Overflow menu border | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Danger action text | --rose | #FF7EB3 | #FF7EB3 |
| Confirmation sheet bg | --surface | #FFFFFF | #1C1A2E |
| Confirmation danger button bg | --rose | #FF7EB3 | #FF7EB3 |
| Confirmation secondary button bg | --lavender-soft | #EDE9FF | #2A2545 |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Completed section container | 16px |
| Overflow menu popover | 16px |
| Confirmation sheet | 28px top corners, 0px bottom |
| Confirmation buttons | 16px |
| Checked item row (within section) | 0px (flush inside section) |

---

## 2. Component Anatomy

### 2.1 Completed Section Header

A collapsible section header that sits below the unchecked items in the list detail view.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Full-width row, background: --surface-2, padding: 12px 16px | border-radius: 16px when collapsed; 16px 16px 0 0 when expanded |
| Chevron | 12×12px, --ink-3, rotates 90° on expand | transition: transform 0.2s ease |
| Label | "Completed" — 12px/700, --ink-2, uppercase, letter-spacing: 1.2px | flex: 1; margin-left: 8px |
| Count | "(N)" — 12px/500, --ink-3 | Inline after label, space-separated |
| Tap target | Entire header row is tappable | min-height: 44px for accessibility |

**States:**
- Collapsed (default): chevron points right (→), section content hidden
- Expanded: chevron points down (↓), completed items visible below

**Animation:** Expand/collapse uses `200ms cubic-bezier(0.22, 1, 0.36, 1)`. Content fades in with `fadeUp` animation.

### 2.2 Completed Item Row

Displayed inside the expanded completed section. Reuses the existing list item component with visual modifications.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Same as unchecked item row, no border-radius (flush in section) | background: --surface-2; padding: 10px 16px |
| Checkbox | 22×22px circle, filled --mint, white ✓ | Same as task card checked state but mint instead of violet |
| Item text | 14px/500, --ink-3, text-decoration: line-through | opacity: 0.7 on the text |
| Divider | 1px --ink-4 between items | Last item has no divider |

**Interaction:** Tapping the checkbox unchecks the item (optimistic, no confirmation). Item animates out of completed section and back into the main list at its original position using `taskIn` animation.

### 2.3 Overflow Menu — New Actions

Two new menu items added to the list detail overflow menu (⋯). These appear below existing menu items and only when checked items exist.

| **Menu item** | **Icon** | **Label** | **Color** |
|---|---|---|---|
| Uncheck all | ↻ (reset) | "Uncheck all" | --ink (standard) |
| Clear completed | 🗑️ | "Clear completed" | --rose (danger) |

**Menu item anatomy:**
- Container: padding 14px 18px, background: --surface, min-height: 44px
- Icon: 18×18px, left-aligned
- Label: 14px/500, 12px gap from icon
- Hover/press: background: --surface-2
- Divider: 1px --ink-4 above the new actions group

**Conditional visibility:** Both items are hidden from the overflow menu when no checked items exist. Spouse role never sees these items.

### 2.4 Confirmation Sheet — Clear Completed

Uses the standard bottom sheet pattern (see reminders spec §2.6).

| **Element** | **Spec** |
|---|---|
| Sheet | background: --surface, border-radius: 28px 28px 0 0 |
| Handle | 40×4px pill, --ink-4, centered, margin-bottom: 18px |
| Title | Fraunces 22px/700, --ink: "Clear completed items?" |
| Body | Plus Jakarta Sans 14px/400, --ink-2: "Remove **N** completed items from this list? This cannot be undone." |
| Danger button | Full-width, background: --rose, color: white, 16px radius, padding: 14px, text: "Remove N items" |
| Cancel button | Full-width, background: --lavender-soft, color: --violet, 16px radius, padding: 14px, text: "Keep them", margin-top: 10px |
| Bottom padding | 100px (clears bottom nav) |
| Backdrop | Content behind: filter: blur(2px), opacity: 0.3 |

**Dark mode note:** Sheet shadow uses `0 -8px 40px rgba(0,0,0,0.5)` in dark (vs `rgba(26,16,51,0.12)` in light). All other elements resolve automatically via tokens.

### 2.5 Confirmation Sheet — Uncheck All

Same sheet structure as §2.4 with different copy and button styling.

| **Element** | **Spec** |
|---|---|
| Title | Fraunces 22px/700, --ink: "Uncheck all items?" |
| Body | Plus Jakarta Sans 14px/400, --ink-2: "**N** completed items will move back to the list." |
| Primary button | Full-width, background: --violet, color: white, 16px radius, padding: 14px, text: "Uncheck all" |
| Cancel button | Full-width, background: --lavender-soft, color: --violet, 16px radius, padding: 14px, text: "Cancel", margin-top: 10px |

**Design rationale:** "Uncheck all" uses violet (standard primary) instead of rose (danger) because it is a reversible bulk state change, not a destructive action. The confirmation exists as a safety net against accidental triggering, not as a danger warning.

---

## 3. Screen States Reference

### Group 1 — List Detail with Completed Items

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| COMP-1 | List with mixed items, completed section collapsed | Light | Unchecked items in main section. "Completed (3)" header visible below with right-facing chevron. No completed items visible. |
| COMP-2 | List with mixed items, completed section expanded | Dark | Chevron rotated down. 3 completed items visible with strikethrough + mint checkboxes. Items have --surface-2 background. |
| COMP-3 | List with all items completed | Light | Main section empty. "Completed (N)" header with all items in section. Olivia message above section: *"All done! Clear the list for next time, or uncheck everything to start again."* |
| COMP-4 | List with no completed items | Dark | Normal list view. No completed section visible. Overflow menu does not show bulk actions. |

### Group 2 — Overflow Menu States

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| COMP-MENU-1 | Overflow with completed items present | Light | Standard menu items + divider + "Uncheck all" (--ink) + "Clear completed" (--rose). |
| COMP-MENU-2 | Overflow with no completed items | Dark | Standard menu items only. Bulk actions hidden. |

### Group 3 — Confirmation Sheets

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| COMP-CONFIRM-1 | Clear completed confirmation | Light | Rose danger button. Body states item count. Backdrop blur active. |
| COMP-CONFIRM-2 | Uncheck all confirmation | Dark | Violet primary button. Body states item count. Backdrop blur active. |

### Group 4 — Post-Action States

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| COMP-POST-1 | After clear completed | Light | Completed section disappears. Item counts update. Brief mint confirmation banner: "✓ N items cleared" — dismisses after 3s. |
| COMP-POST-2 | After uncheck all | Dark | Completed section disappears. Items animate back into main list using `taskIn` stagger. Brief mint confirmation banner: "✓ N items unchecked" — dismisses after 3s. |

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

- **Check/uncheck individual items** — optimistic, no confirmation. Item animates between sections.
- **Expand/collapse completed section** — immediate, transient UI state.

### 4.2 Actions Requiring Confirmation (Always Confirm)

| **Action** | **Confirmation sheet** | **Destructive?** | **Button style** |
|---|---|---|---|
| Clear completed | COMP-CONFIRM-1 | Yes — permanent deletion | Rose (danger) |
| Uncheck all | COMP-CONFIRM-2 | No — reversible bulk change | Violet (primary) |

### 4.3 Spouse Restrictions

Spouse role cannot:
- Check or uncheck items (read-only, per base shared-lists spec)
- Access "Clear completed" or "Uncheck all" in overflow menu
- These menu items are fully hidden, not disabled

---

## 5. Layout & Spacing Spec

### 5.1 Completed Section Placement

| **Element** | **Spacing / size** |
|---|---|
| Gap between last unchecked item and section header | 16px |
| Section header height | 44px (min) |
| Section header internal padding | 12px 16px |
| Gap between section header and first completed item | 0px (flush) |
| Completed item row height | 44px (min) |
| Completed item internal padding | 10px 16px |
| Gap between last completed item and bottom | 16px padding inside section container |

### 5.2 Overflow Menu Additions

| **Element** | **Spacing** |
|---|---|
| Divider above bulk actions | 1px --ink-4, margin: 4px 0 |
| Menu item padding | 14px 18px |
| Icon-to-label gap | 12px |
| Menu item min-height | 44px |

### 5.3 Confirmation Sheet Spacing

Follows the standard sheet spacing from reminders spec §5.3:

| **Element** | **Spec** |
|---|---|
| Sheet horizontal padding | 20px |
| Handle to title | 18px |
| Title to body | 12px |
| Body to primary button | 20px |
| Button gap | 10px |
| Bottom padding | 100px (nav clearance) |

---

## 6. Data Fields Surfaced per Component

### 6.1 Completed Section Header
- `checkedItemCount` — displayed as "(N)" count
- Presence of any `checked = true` items — controls section visibility

### 6.2 Completed Item Row
- `id` — for uncheck operation
- `title` — displayed with strikethrough
- `checked` — always `true` in this context
- `position` — preserved for re-insertion on uncheck

### 6.3 Confirmation Sheets
- `checkedItemCount` — displayed in body copy ("Remove **N** completed items")

---

## 7. Edge Cases & Failure Modes

### 7.1 Single Completed Item
The completed section appears even for a single checked item. Header reads "Completed (1)". Both bulk actions are available.

### 7.2 Rapid Check/Uncheck
Items animate between sections. If a user rapidly checks and unchecks, animations should not queue — use `animation-fill-mode: forwards` and cancel in-flight animations when state changes.

### 7.3 Offline Bulk Actions
Both "Clear completed" and "Uncheck all" are recorded in the outbox as individual per-item commands. The UI reflects the optimistic state immediately. If sync fails, the UI reverts and shows a brief error banner: "Couldn't sync changes. Try again."

### 7.4 Empty List After Clear
If clearing completed items results in an empty list (all items were checked), show the standard list empty state from the base shared-lists spec.

### 7.5 Concurrent Edit
If another household member checks/unchecks an item while the completed section is expanded, the section should update reactively. The section header count updates in real-time.

### 7.6 Dark Mode Completed Section
The `--surface-2` background for the completed section creates a subtle visual distinction from the main `--surface` list area in both modes:
- Light: #F3F0FF (soft lavender) against #FFFFFF (white)
- Dark: #242038 (deep indigo) against #1C1A2E (card surface)

This provides enough contrast to signal "different zone" without being heavy.

### 7.7 Long Item Text in Completed Section
Same rule as unchecked items: single line, overflow: ellipsis.

---

## 8. Accessibility Notes

- Completed section header is a button with `aria-expanded="true|false"` and `aria-controls` pointing to the section content
- Completed items retain checkbox `role="checkbox"` with `aria-checked="true"`
- "Clear completed" button includes `aria-label="Clear N completed items"` for screen readers
- Confirmation sheets trap focus and return focus to the overflow menu trigger on close
- All confirmation buttons meet 44×44px minimum tap target
- Strikethrough text + reduced opacity is accompanied by the mint checkbox fill — color is not the sole signal

---

*— End of specification —*
