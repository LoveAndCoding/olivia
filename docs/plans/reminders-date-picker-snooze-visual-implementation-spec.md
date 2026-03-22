---
title: "Olivia — Reminders Depth: Date/Time Picker & Snooze Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Reminders Depth: Date/Time Picker & Snooze
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines the visual design for two improvements to the existing reminders workflow: (1) replacing `prompt()` dialogs with a styled native date/time picker component, and (2) clarifying snooze visibility behavior so snoozed reminders fully disappear from active surfaces. It extends the base reminders visual spec at `docs/plans/reminders-visual-implementation-spec.md`.
>
> Product spec: `docs/specs/reminders-date-picker-snooze.md`

---

## 1. Design System Constraints

All date picker and snooze UI must conform to the Olivia design system. No new tokens are introduced.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage** |
|---|---|---|---|---|
| Picker label | Plus Jakarta Sans | 10px | 700 | "DATE & TIME" uppercase label above picker |
| Selected value display | Plus Jakarta Sans | 14px | 600 | Formatted date/time after selection |
| Chip label | Plus Jakarta Sans | 13px | 600 | Quick-select date chips (Today, Tonight, etc.) |
| Validation message | Plus Jakarta Sans | 12px | 500 | Inline error for past-date selection |
| Snooze banner text | Plus Jakarta Sans | 13px | 500 | "Snoozed until tomorrow at 9:00 AM" |
| Olivia suggestion | Fraunces italic | 15px | 300 | Snooze sheet Olivia message |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light** | **Dark** |
|---|---|---|---|
| Picker container bg | --surface-2 | #F3F0FF | #242038 |
| Picker container border (rest) | --lavender-mid | #D4CCFF | #3D3660 |
| Picker container border (focus) | --violet | #6C5CE7 | #6C5CE7 |
| Picker focus ring | --violet-glow | rgba(108,92,231,0.18) | rgba(108,92,231,0.3) |
| Active chip bg | --violet | #6C5CE7 | #6C5CE7 |
| Active chip text | white | white | white |
| Inactive chip bg | --surface | #FFFFFF | #1C1A2E |
| Inactive chip border | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Custom chip bg (active) | --violet-dim | rgba(108,92,231,0.1) | rgba(108,92,231,0.18) |
| Custom chip border (active) | --violet | #6C5CE7 | #6C5CE7 |
| Validation error text | --rose | #FF7EB3 | #FF7EB3 |
| Validation error bg | --rose-dim | rgba(255,126,179,0.12) | rgba(255,126,179,0.15) |
| Snooze banner bg | --sky-soft | #E0F7FC | #0A2228 |
| Snooze banner text | --sky | #48CAE4 | #48CAE4 |
| Snooze banner icon | --sky | #48CAE4 | #48CAE4 |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Date/time picker container | 14px |
| Date chip | 20px (fully rounded) |
| Custom date chip (expanded state) | 14px top, 0 bottom (connects to picker) |
| Validation message container | 10px |
| Snooze confirmation banner | 14px |

---

## 2. Component Anatomy

### 2.1 Date/Time Picker Component

Replaces all `prompt()` usage for custom date/time entry. Built on native `<input type="datetime-local">` styled to match the design system.

**Architecture:** The picker is not a custom calendar widget. It uses the platform's native date/time selector (iOS date wheel via Capacitor WebView) with a styled trigger and display wrapper.

#### Picker Trigger (Collapsed State)

When the user taps "+ Custom date" chip, the chip transitions to an expanded picker area.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Inline within the sheet, below quick-select chips | background: --surface-2, border: 1.5px solid --lavender-mid, border-radius: 14px, padding: 14px 16px |
| Label | "DATE & TIME" | 10px/700, --ink-3, uppercase, letter-spacing: 1.2px, margin-bottom: 8px |
| Native input | `<input type="datetime-local">` | Full-width, styled: font-family: Plus Jakarta Sans, font-size: 14px, font-weight: 600, color: --ink, background: transparent, border: none |
| Display value | Formatted relative date/time | 14px/600, --ink; shown after selection replaces the raw input display |
| Focus state | Input focused | border-color: --violet, box-shadow: 0 0 0 4px var(--violet-glow) |

#### Native Input Styling

```css
.datetime-picker-input {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  background: transparent;
  border: none;
  width: 100%;
  padding: 0;
  -webkit-appearance: none;
}

.datetime-picker-input::-webkit-calendar-picker-indicator {
  /* Allow native picker to trigger on tap */
  opacity: 0;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.datetime-picker-container {
  background: var(--surface-2);
  border: 1.5px solid var(--lavender-mid);
  border-radius: 14px;
  padding: 14px 16px;
  position: relative;
}

.datetime-picker-container:focus-within {
  border-color: var(--violet);
  box-shadow: 0 0 0 4px var(--violet-glow);
}
```

**Dark mode note:** All values resolve automatically via tokens. The `--surface-2` background shifts to `#242038` providing clear elevation from the `--surface` sheet background (`#1C1A2E`).

#### Validation State (Past Date)

When the user selects a date/time in the past:

| **Element** | **Spec** |
|---|---|
| Container border | Changes to --rose (not --violet) |
| Validation message | Appears below the picker: "Pick a time in the future" |
| Message container | background: --rose-dim, border-radius: 10px, padding: 8px 12px, margin-top: 8px |
| Message text | 12px/500, --rose |
| Behavior | The selected value is shown but the sheet's Save button becomes disabled (opacity: 0.4, pointer-events: none) |

### 2.2 Quick-Select Chips (Unchanged Anatomy, Updated Behavior)

Quick-select chips (Today, Tonight, Tomorrow) retain their existing design from the reminders visual spec. The behavioral change is:

- When a quick-select chip is active and the user taps "+ Custom date", the chip deactivates and the picker expands inline.
- When the picker has a selected value and the user taps a quick-select chip, the picker collapses and the chip activates.
- Only one selection method is active at a time.

**"+ Custom date" chip variants:**

| **State** | **Background** | **Border** | **Text color** | **Icon** |
|---|---|---|---|---|
| Rest | --surface | --ink-4 | --ink-2 | 📅 |
| Hover | --violet-dim | --violet | --violet | 📅 |
| Active (picker open) | --violet-dim | --violet | --violet | 📅 |

### 2.3 Snooze Confirmation Banner

Shown after a successful snooze action. Replaces the existing generic banner with a more specific display.

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Full-width banner within the current screen context | background: --sky-soft, border-radius: 14px, padding: 12px 16px |
| Icon | 😴 emoji or clock icon | 16px, left-aligned |
| Text | "Snoozed until [formatted time]" | 13px/500, --sky |
| Undo link | "↩ Undo" | 13px/600, --violet, right-aligned |
| Dismissal | Auto-dismisses after 5 seconds or on swipe | animation: fadeUp reverse after 5s |

**Example text:** "Snoozed until tomorrow at 9:00 AM" or "Snoozed until Mar 28, 3:00 PM"

### 2.4 Snooze Sheet — Updated "Choose a Time" Option

The existing snooze sheet (ACTION-1 in reminders spec) has its "Choose a time…" option updated:

**Before:** Tapping "Choose a time…" opens a `prompt()` dialog.
**After:** Tapping "Choose a time…" expands the date/time picker inline within the snooze sheet, below the quick options.

| **Element** | **Spec** |
|---|---|
| "Choose a time…" row | Same visual treatment as existing snooze options |
| Expanded picker | Same §2.1 picker component, embedded below the option row |
| Picker default | Today's date, next whole hour (e.g., if 2:37 PM → default 3:00 PM) |
| Apply button | Appears below picker: "Snooze until [time]", background: --violet, color: white, 16px radius |

---

## 3. Screen States Reference

### Group 1 — Create Reminder Sheet with Picker

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| PICK-CREATE-1 | Custom date chip tapped, picker visible | Light | Quick-select chips deactivated. Picker expanded inline with label + native input. Default: tomorrow 9:00 AM. Save button enabled. |
| PICK-CREATE-2 | Past date selected, validation showing | Dark | Picker border: --rose. Validation message below: "Pick a time in the future." Save button disabled (opacity 0.4). |
| PICK-CREATE-3 | Custom date selected, picker showing value | Light | Picker shows formatted date ("Mar 28, 3:00 PM"). Save button enabled. Custom chip shows active styling. |

### Group 2 — Edit Reminder Sheet with Picker

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| PICK-EDIT-1 | Date field tapped, picker visible | Dark | Current scheduled date pre-filled in picker. Quick-select chips reflect relative state (if tomorrow → "Tomorrow" chip active). |
| PICK-EDIT-2 | New date selected via picker | Light | Picker value updated. "Save changes" button active. |

### Group 3 — Snooze Sheet with Picker

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| PICK-SNOOZE-1 | Snooze sheet open, quick options visible | Dark | Standard snooze sheet per ACTION-1. "Choose a time…" at bottom. No picker visible yet. |
| PICK-SNOOZE-2 | "Choose a time…" tapped, picker expanded | Light | Quick options remain visible above. Picker appears below with default (next whole hour). "Snooze until [time]" button below picker. |
| PICK-SNOOZE-3 | Custom snooze time selected | Dark | Picker shows selected value. "Snooze until Mar 28, 3:00 PM" button ready. |

### Group 4 — Snooze Visibility States

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| SNOOZE-VIS-1 | Home screen, reminder snoozed | Light | Snoozed reminder does NOT appear in the Reminders section or nudge card. Other reminders unaffected. |
| SNOOZE-VIS-2 | Reminders list, "Due" filter active | Dark | Snoozed reminder does NOT appear. Filter count excludes snoozed items. |
| SNOOZE-VIS-3 | Reminders list, "Snoozed" filter active | Light | Snoozed reminder appears at 65% opacity with sky border. Badge: "Snoozed". Snooze-until time shown in meta line. |
| SNOOZE-VIS-4 | Reminder detail, snoozed state | Dark | Sky banner at top: "😴 Snoozed until [time]". Actions: "Change snooze", "Un-snooze", "Mark done now", "Cancel". Title and meta at normal opacity. |

---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

- **Select a date/time via picker** — updates the form field, no confirmation
- **Select a quick-select chip** — collapses picker if open, sets date, no confirmation
- **Snooze via quick option** — executes immediately after tap, no confirmation step
- **Snooze via custom picker** — executes when "Snooze until [time]" button is tapped

### 4.2 Confirmation Banners (Post-Action)

| **Action** | **Banner** | **Duration** | **Undo?** |
|---|---|---|---|
| Snooze applied | Sky banner: "😴 Snoozed until [time]" | 5 seconds | Yes — "↩ Undo" link |
| Reminder created with custom date | Mint banner: "✓ Reminder set for [time]" | 3 seconds | No |

### 4.3 Validation Rules

| **Condition** | **Behavior** |
|---|---|
| Date/time in the past | Picker border --rose, validation message shown, Save/Snooze button disabled |
| No date selected (picker open but empty) | Save button disabled |
| Date selected | Save button enabled |

---

## 5. Layout & Spacing Spec

### 5.1 Picker Within Create/Edit Sheet

| **Element** | **Spacing** |
|---|---|
| Quick-select chips row to picker | 12px gap |
| Picker container padding | 14px 16px |
| Label to native input | 8px |
| Picker to validation message | 8px |
| Picker to next form field (or action row) | 14px |

### 5.2 Picker Within Snooze Sheet

| **Element** | **Spacing** |
|---|---|
| "Choose a time…" row to picker | 12px gap |
| Picker container padding | 14px 16px |
| Picker to "Snooze until" button | 14px |
| "Snooze until" button padding | 14px, full-width |

### 5.3 Snooze Confirmation Banner

| **Element** | **Spacing** |
|---|---|
| Banner margin from top of content | 12px |
| Banner internal padding | 12px 16px |
| Icon to text gap | 8px |
| Text to undo link gap | auto (flex space-between) |

---

## 6. Data Fields Surfaced per Component

### 6.1 Picker Component
- `scheduledAt` (ISO 8601) — pre-filled in edit mode, populated on selection
- `min` attribute — set to current datetime to prevent past selection
- `defaultValue` — creation: tomorrow 9:00 AM; snooze: next whole hour

### 6.2 Snooze Confirmation Banner
- `snoozedUntil` — formatted as relative label ("tomorrow at 9:00 AM" or absolute "Mar 28, 3:00 PM")

### 6.3 Snooze Visibility (Home Screen Filtering)
- `computeReminderState()` — must return `'snoozed'` when `snoozedUntil` > now
- Home surfacing logic — must exclude all `'snoozed'` state reminders
- Reminders list "Due"/"Overdue" filters — must exclude `'snoozed'` state

---

## 7. Edge Cases & Failure Modes

### 7.1 Native Picker Appearance Variance
The `<input type="datetime-local">` renders differently per platform:
- **iOS (primary):** Native date wheel picker — looks good, matches platform conventions
- **Desktop browsers:** May show a less polished calendar dropdown
- **Mitigation:** The styled container (--surface-2 bg, --lavender-mid border) provides a consistent frame. The native picker content is platform-dependent but functionally correct on all targets.

### 7.2 Timezone Handling
`datetime-local` values are always interpreted as the user's local time. Do not convert to UTC on the client. The API layer handles timezone normalization.

### 7.3 Snooze Time Already Passed
If a user opens the snooze sheet and by the time they tap "Snooze until [time]" the selected time has passed (e.g., they left the sheet open for an hour), apply the same past-time validation: show the rose validation message and disable the button.

### 7.4 Rapid Snooze/Un-snooze
If a user snoozes, then immediately taps "↩ Undo" in the banner, the reminder reverts to its pre-snooze state. The banner dismisses immediately. No confirmation needed for undo.

### 7.5 Snooze Sheet After Midnight
If the user opens the snooze sheet at 11:45 PM:
- "In 1 hour" shows "12:45 AM (tomorrow)"
- "Tonight" is hidden (past 6 PM)
- "This afternoon" is hidden (past 2 PM)
- "Tomorrow morning" shows "9:00 AM" as expected

### 7.6 Dark Mode Picker
The native datetime-local input inherits text color from `--ink` and background from `transparent` (container handles background). On iOS WebView, the native date wheel renders in the system's dark mode when the OS is in dark mode. The Capacitor app should ensure the WebView respects the system appearance setting.

---

## 8. Accessibility Notes

- Picker container has `role="group"` with `aria-label="Select date and time"`
- Native `<input type="datetime-local">` is inherently accessible — screen readers announce it as a date/time input
- Validation message uses `role="alert"` for live announcement
- Snooze confirmation banner uses `role="status"` for non-intrusive announcement
- Undo link in banner meets 44×44px minimum tap target
- All chip states (active/inactive) are communicated via `aria-pressed`
- Quick-select chips and custom date chip form a mutually exclusive group — use `role="radiogroup"` semantics

---

*— End of specification —*
