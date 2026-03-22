---
title: "Olivia — Routines Depth: Flexible Scheduling Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Routines Depth: Flexible Scheduling
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines the visual design for three additions to the routines surface: (1) weekday-specific scheduling (`weekly_on_days`), (2) alternating-week scheduling (`every_n_weeks`), and (3) ad-hoc routine tracking with "last done" visibility. It extends the base routines visual spec at `docs/plans/recurring-routines-visual-implementation-spec.md`.
>
> Product spec: `docs/specs/routines-flexible-scheduling.md`

---

## 1. Design System Constraints

All flexible scheduling UI must conform to the Olivia design system. No new tokens are introduced.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage** |
|---|---|---|---|---|
| Recurrence label | Plus Jakarta Sans | 12px | 600 | "Mon, Thu" or "Every 2 weeks, Wed" on routine card |
| "Last done" timestamp | Plus Jakarta Sans | 11px | 400 | "Last done: 3 days ago" on routine card |
| Weekday picker letter | Plus Jakarta Sans | 13px | 700 | "M", "T", "W", etc. inside day circles |
| Section header ("Tracked") | Plus Jakarta Sans | 10px | 700 | Uppercase section label in routine index |
| Ad-hoc label | Plus Jakarta Sans | 12px | 500 | "Track when done" on routine card |
| Interval number | Plus Jakarta Sans | 16px | 700 | "2" inside week interval stepper |
| Interval label | Plus Jakarta Sans | 13px | 500 | "weeks" label next to stepper |
| Scheduling type label | Plus Jakarta Sans | 14px | 500 | Options in recurrence selector |
| Olivia message (empty) | Fraunces italic | 15px | 300 | Empty state in "Tracked" section |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light** | **Dark** |
|---|---|---|---|
| Weekday circle (selected) | --violet | #6C5CE7 | #6C5CE7 |
| Weekday circle text (selected) | white | white | white |
| Weekday circle (unselected) | --surface-2 | #F3F0FF | #242038 |
| Weekday circle border (unselected) | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Weekday circle text (unselected) | --ink-2 | rgba(26,16,51,0.55) | rgba(237,233,255,0.6) |
| "Last done" text | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| "Last done" dot separator | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Ad-hoc card accent (no stripe) | none | — | — |
| "Tracked" section header | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Tracked section divider | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| "Not yet done" text | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Interval stepper bg | --surface-2 | #F3F0FF | #242038 |
| Interval stepper border | --lavender-mid | #D4CCFF | #3D3660 |
| Interval stepper buttons | --violet | #6C5CE7 | #6C5CE7 |
| Recurrence type selector bg (active) | --violet-dim | rgba(108,92,231,0.1) | rgba(108,92,231,0.18) |
| Recurrence type selector border (active) | --violet | #6C5CE7 | #6C5CE7 |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Weekday circle | 50% (fully round) |
| Recurrence selector option row | 14px |
| Week interval stepper | 12px |
| Stepper +/- buttons | 8px |
| Routine card (unchanged) | 18px |
| "Tracked" section header | 0px (flat text divider) |

---

## 2. Component Anatomy

### 2.1 Recurrence Type Selector

Replaces the existing simple toggle with an expanded selector that accommodates the new schedule types. Used in the Create Routine and Edit Routine sheets.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Vertical list of selectable options | margin-top: 14px below the "Recurrence" label |
| Option row | Each schedule type as a tappable row | background: --surface, border: 1.5px solid --ink-4, border-radius: 14px, padding: 12px 16px, margin-bottom: 8px |
| Option row (active) | Selected schedule type | background: --violet-dim, border-color: --violet |
| Radio indicator | 18×18px circle, left-aligned | Empty: border: 2px solid --ink-4. Selected: filled --violet with white dot |
| Option label | Schedule type name | 14px/500, --ink |
| Option description | Brief helper text | 12px/400, --ink-3, margin-top: 2px |

**Schedule type options:**

| **Label** | **Description** | **Sub-controls** |
|---|---|---|
| "Every day" | Daily recurrence | None |
| "Every N days" | Fixed interval | Interval stepper (existing) |
| "Weekly" | Every week on a day | Weekday picker (single select) |
| "Weekly on specific days" | Multiple weekdays | Weekday picker (multi-select) |
| "Every N weeks" | Alternating weeks | Interval stepper + weekday picker (single) |
| "Monthly" | Monthly on a date | None (uses creation date) |
| "No schedule — track when done" | Ad-hoc tracking | None |

**Interaction:** Tapping an option row selects it and reveals any sub-controls inline below the option. Previously selected option collapses its sub-controls. Only one option active at a time.

### 2.2 Weekday Picker

A compact horizontal row of 7 day circles. Used by `weekly_on_days` (multi-select) and `every_n_weeks` (single-select).

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Horizontal flex row, centered | gap: 6px, padding: 12px 0, justify-content: center |
| Day circle | 36×36px round button | border-radius: 50% |
| Day label | Single letter: M T W T F S S | 13px/700, centered |
| Unselected | bg: --surface-2, border: 1.5px solid --ink-4, text: --ink-2 | |
| Selected | bg: --violet, border: none, text: white | box-shadow: 0 2px 6px var(--violet-dim) |
| Hover | bg: --violet-dim, border-color: --violet, text: --violet | |
| Press | transform: scale(0.92) | transition: transform 0.1s ease |

**Multi-select mode** (`weekly_on_days`): Multiple days can be toggled on/off. At least one day must be selected — if user tries to deselect the last remaining day, no change occurs.

**Single-select mode** (`every_n_weeks`, `weekly`): Tapping a new day deselects the previous one.

**Accessibility:** Each day circle is a `role="checkbox"` (multi) or `role="radio"` (single) with `aria-label` like "Monday" (not "M").

### 2.3 Week Interval Stepper

A numeric stepper for selecting the week interval in `every_n_weeks`. Minimum value: 2, maximum: 12.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Horizontal flex row | background: --surface-2, border: 1.5px solid --lavender-mid, border-radius: 12px, padding: 6px 8px, gap: 12px, align-items: center |
| Minus button | "−" | 28×28px, border-radius: 8px, bg: --lavender-soft, color: --violet, 16px/700 |
| Value | Current interval number | 16px/700, --ink, min-width: 24px, text-align: center |
| Plus button | "+" | Same as minus button |
| Label | "weeks" | 13px/500, --ink-2, margin-left: 4px |
| Disabled button | At min/max | opacity: 0.3, pointer-events: none |

**Interaction:** Tap +/- to adjust. Value updates immediately. Buttons disable at min (2) and max (12).

### 2.4 Routine Card — Updated Anatomy

The existing routine card gains two new elements: a recurrence label and a "last done" indicator.

#### Recurrence Label (on card)

Appears in the metadata row, after the owner name.

| **Schedule type** | **Display text** | **Styling** |
|---|---|---|
| `daily` | "Daily" | 12px/600, --ink-2 |
| `every_n_days` | "Every 3 days" | 12px/600, --ink-2 |
| `weekly` | "Weekly, Mon" | 12px/600, --ink-2 |
| `weekly_on_days` | "Mon, Thu" | 12px/600, --ink-2 |
| `every_n_weeks` | "Every 2 weeks, Wed" | 12px/600, --ink-2 |
| `monthly` | "Monthly" | 12px/600, --ink-2 |
| `ad_hoc` | "Track when done" | 12px/500, --ink-3, italic |

**Recurrence pill** (optional, for cards in mixed contexts): Uses the same pill component from reminders: `background: --lavender-soft, color: --violet-2, border-radius: 20px, padding: 2px 7px, font-size: 10px/700`. Only shown in views where context is ambiguous (e.g., if routines ever surface on the home screen).

#### "Last Done" Indicator

Appears below the metadata row on all routine cards (scheduled and ad-hoc).

| **State** | **Display text** | **Styling** |
|---|---|---|
| Never completed | "Not yet done" | 11px/400, --ink-3 |
| Completed recently | "Last done: Just now" | 11px/400, --ink-3 |
| Completed N time ago | "Last done: 3 days ago" | 11px/400, --ink-3 |
| Completed long ago | "Last done: 2 weeks ago" | 11px/400, --ink-3 |

**Layout:** Positioned as a third line in the card below metadata, left-aligned with the routine title.

### 2.5 Ad-Hoc Routine Card Variant

Ad-hoc routines use the same card component as scheduled routines with these differences:

| **Element** | **Scheduled routine** | **Ad-hoc routine** |
|---|---|---|
| Left border accent | Semantic color per due-state | None (no accent stripe) |
| Due-state badge | "Due", "Overdue", etc. | None — replaced by "Last done" as primary info |
| Checkbox | Marks occurrence as done → schedules next | Marks as done → updates "last done" timestamp only |
| "Last done" | Third-line secondary info | **Primary secondary info** — more visually prominent |

**Ad-hoc "last done" prominence:** On ad-hoc cards, the "Last done: N days ago" text uses `--ink-2` (not `--ink-3`) and `12px/500` weight to give it slightly more visual weight, since it is the only temporal signal on the card.

### 2.6 "Tracked" Section in Routine Index

A section that appears below all scheduled routine groups (overdue, due, upcoming, completed) in the routine index.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Divider | 1px line separating scheduled from tracked | background: --ink-4, margin: 20px 0 16px |
| Section header | "TRACKED" uppercase label | 10px/700, --ink-3, letter-spacing: 1.4px, uppercase, margin-bottom: 10px |
| Card list | Ad-hoc routine cards, stacked | Same card spacing as scheduled routines (margin-bottom: 8px) |
| Sort order | By staleness: longest since last done at top | Never-completed routines at very top |
| Empty state | When no ad-hoc routines exist | Section not rendered at all |

**Animation:** Cards in the "Tracked" section use the same `taskIn` stagger animation as scheduled routine cards.

---

## 3. Screen States Reference

### Group 1 — Routine Index with Mixed Types

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| FLEX-INDEX-1 | Scheduled + tracked routines | Light | Overdue, due, upcoming groups as before. Below: divider + "TRACKED" header + ad-hoc cards sorted by staleness. All cards show "Last done" indicator. |
| FLEX-INDEX-2 | Only tracked routines | Dark | No scheduled routine groups visible. "TRACKED" header + ad-hoc cards. No divider needed when no scheduled routines above. |
| FLEX-INDEX-3 | Only scheduled routines (no ad-hoc) | Light | Normal routine index. No "TRACKED" section rendered. |
| FLEX-INDEX-4 | Tracked section with never-completed | Dark | "Not yet done" items at top of tracked section. Styling: --ink-3, neutral — not alarming. |

### Group 2 — Create/Edit Routine with New Schedule Types

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| FLEX-CREATE-1 | Recurrence selector showing all options | Light | 7 options listed vertically. "Every day" selected by default. Each option 14px radius row. |
| FLEX-CREATE-2 | "Weekly on specific days" selected | Dark | Weekday picker expanded below option row. M and Th selected (violet fill). Multi-select mode. |
| FLEX-CREATE-3 | "Every N weeks" selected | Light | Interval stepper (value: 2) + weekday picker (single-select, Wed selected) expanded below option. |
| FLEX-CREATE-4 | "No schedule — track when done" selected | Dark | No sub-controls. Helper text below: "For recurring household tasks that don't have a fixed schedule. You'll see when it was last done." Fraunces italic 13px/300, --ink-3. |
| FLEX-EDIT-1 | Editing existing routine, changing type | Light | Current type pre-selected. Switching type shows confirmation: "Changing the schedule will recalculate the next due date." (inline, --peach-dim bg, 12px/500, --peach). |

### Group 3 — Routine Cards with New Labels

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| FLEX-CARD-1 | weekly_on_days card, due | Light | Card with violet left border. Badge: "Due". Meta: "Jamie · Mon, Thu". Last done: "Last done: 4 days ago". |
| FLEX-CARD-2 | every_n_weeks card, upcoming | Dark | Card with --ink-3 left border (future). Badge: "Mar 28". Meta: "Jamie · Every 2 weeks, Wed". Last done: "Last done: 12 days ago". |
| FLEX-CARD-3 | Ad-hoc card in tracked section | Light | No left border accent. No due-state badge. Meta: "Jamie · Track when done". Last done: "Last done: 3 days ago" (--ink-2, 12px, slightly more prominent). |
| FLEX-CARD-4 | Ad-hoc card, never completed | Dark | No left border. No badge. Meta: "Jamie · Track when done". Last done: "Not yet done" (--ink-3, neutral). |

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

- **Select schedule type** — switches active type, reveals sub-controls, no confirmation
- **Toggle weekday** — adds/removes day from selection, no confirmation
- **Adjust week interval** — increments/decrements value, no confirmation
- **Mark ad-hoc routine as done** — checkbox tap, optimistic update, "last done" timestamp updates to "Just now"
- **Mark scheduled routine as done** — same as base spec, next occurrence auto-scheduled

### 4.2 Confirmation Required

| **Action** | **Trigger** | **Notes** |
|---|---|---|
| Change schedule type on existing routine | FLEX-EDIT-1 | Inline warning (not a sheet): "Changing the schedule will recalculate the next due date." User proceeds by tapping Save. |

### 4.3 Post-Completion Feedback

When an ad-hoc routine is marked done:
- Checkbox fills with --violet (same as scheduled)
- "Last done" updates to "Just now"
- Brief mint confirmation banner: "✓ Marked as done" — dismisses after 3s
- No next occurrence is scheduled — card stays in tracked section with updated timestamp

---

## 5. Layout & Spacing Spec

### 5.1 Weekday Picker

| **Element** | **Spacing** |
|---|---|
| Container margin-top (below option row) | 12px |
| Container padding | 12px 0 |
| Inter-circle gap | 6px |
| Circle size | 36×36px |
| Total picker width | 7 × 36 + 6 × 6 = 288px (centered in sheet) |

### 5.2 Week Interval Stepper

| **Element** | **Spacing** |
|---|---|
| Container margin-top (below option row) | 12px |
| Container padding | 6px 8px |
| +/- button size | 28×28px |
| Value min-width | 24px |
| Inter-element gap | 12px |
| Stepper to weekday picker gap | 12px |

### 5.3 Recurrence Selector

| **Element** | **Spacing** |
|---|---|
| Selector margin-top (below "Recurrence" label) | 14px |
| Option row padding | 12px 16px |
| Option row margin-bottom | 8px |
| Radio indicator to label gap | 12px |
| Label to description gap | 2px |
| Sub-controls (picker/stepper) animation | 200ms fadeUp |

### 5.4 "Tracked" Section in Index

| **Element** | **Spacing** |
|---|---|
| Divider margin | 20px top, 16px bottom |
| Section header margin-bottom | 10px |
| Card margin-bottom | 8px (same as scheduled) |

### 5.5 "Last Done" Indicator on Card

| **Element** | **Spacing** |
|---|---|
| Margin-top from metadata row | 4px |
| Left alignment | Aligned with routine title (after checkbox indent) |

---

## 6. Data Fields Surfaced per Component

### 6.1 Recurrence Selector
- `recurrenceRule` — current value determines which option is selected
- `weekdays` — JSON array of integers 0–6, for `weekly_on_days`
- `intervalDays` (or `intervalWeeks`) — integer, for `every_n_weeks`

### 6.2 Weekday Picker
- `weekdays` — array of selected day indices (0=Mon through 6=Sun)
- Selection mode: derived from parent schedule type (`weekly_on_days` → multi, `every_n_weeks`/`weekly` → single)

### 6.3 Routine Card (Updated)
- `recurrenceRule` — determines label text
- `weekdays` — for formatting "Mon, Thu" label
- `intervalDays` / `intervalWeeks` — for formatting "Every 2 weeks" label
- `lastCompletedAt` — most recent occurrence `completedAt`, for "Last done" display
- `currentDueDate` — nullable for ad-hoc routines
- `dueState` — null for ad-hoc routines

### 6.4 "Tracked" Section
- List of routines where `recurrenceRule = 'ad_hoc'`
- Sorted by `lastCompletedAt` ascending (nulls first — never-completed at top)

---

## 7. Edge Cases & Failure Modes

### 7.1 No Weekdays Selected
In multi-select mode, the user cannot deselect the last remaining day. The circle stays selected and does not respond to tap. A subtle shake animation (2px horizontal, 200ms) provides feedback.

### 7.2 Switching from Scheduled to Ad-Hoc
When editing an existing routine and switching from a scheduled type to "No schedule — track when done":
- `currentDueDate` is cleared
- The routine moves from its due-state group to the "Tracked" section
- The "last done" indicator uses the most recent occurrence if any exist

### 7.3 Switching from Ad-Hoc to Scheduled
When editing an existing ad-hoc routine and selecting a scheduled type:
- A first due date is calculated from the selected schedule
- The routine moves from "Tracked" to the appropriate due-state group
- Historical occurrences are preserved

### 7.4 "Tracked" Section with Many Items
If > 10 ad-hoc routines exist, the section scrolls naturally as part of the routine index page scroll. No pagination or "show more" — all tracked routines are visible.

### 7.5 Dark Mode Weekday Picker
Selected days (--violet fill) are identical in both modes. Unselected days shift from soft lavender (#F3F0FF) to deep indigo (#242038), maintaining clear contrast against the sheet surface in both modes.

### 7.6 "Last Done" with Stale Data
If the most recent occurrence is > 30 days old, the text switches from relative ("30 days ago") to absolute ("Last done: Feb 20"). This prevents awkward "47 days ago" text.

### 7.7 Empty "Tracked" Section
If the user has no ad-hoc routines, the "Tracked" section is not rendered at all — no empty state, no divider, no header. The section only appears when at least one ad-hoc routine exists.

---

## 8. Accessibility Notes

- Weekday picker uses `role="group"` with `aria-label="Select days of the week"`
- Each day circle uses `role="checkbox"` (multi) or `role="radio"` (single) with full day name as `aria-label`
- Interval stepper uses `role="spinbutton"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`
- +/- buttons have `aria-label="Decrease interval"` and `aria-label="Increase interval"`
- "Tracked" section header has `role="heading"` with `aria-level="2"`
- "Last done" text is part of the card's accessible description, not a separate element — included via `aria-describedby`
- Ad-hoc routine checkbox has `aria-label="Mark [routine name] as done"` (same as scheduled routines)
- All interactive elements meet 44×44px minimum tap target (weekday circles are 36px but have 6px gap padding bringing effective target to ~42px — acceptable on mobile, but consider 40px circles if touch testing reveals issues)

---

## 9. Open Design Questions

1. **Weekday circle size:** 36px circles with 6px gaps fit within the 288px content area. If household testing reveals touch targets are too tight, increase to 40px circles with 4px gaps (316px total — still fits in 390px frame with padding).

2. **"Tracked" section position:** Currently specified below all scheduled groups. If household feedback shows ad-hoc routines are the primary use case, consider promoting the "Tracked" section above scheduled groups or interleaving by staleness.

3. **Week interval max:** Currently capped at 12 weeks. If household needs longer intervals (quarterly), increase max and consider switching from stepper to a numeric input for values > 12.

---

*— End of specification —*
