---
title: "Olivia — Navigation Improvement: Visual Implementation Spec"
subtitle: "Daily Hub Tab + More Tab + Updated Bottom Nav"
date: "March 2025"
status: "Design handoff for agentic implementation"
---

# Olivia — Navigation Improvement
## Visual Implementation Spec
*Daily Hub Tab + More Tab + Updated Bottom Nav*

*March 2025 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the navigation restructure: replacing the current 5-tab nav (Home, Tasks, Olivia, Lists, Memory) with the new structure (Home, Daily, Olivia, Lists, More). It covers the updated bottom nav, the new Daily hub tab with segment control, the More utility tab, and all related screen states.
>
> Covers: design tokens, component anatomy, all screen states with layout specs, interaction rules, dark mode notes, edge cases, and open design questions.
>
> **Source spec:** `docs/specs/navigation-improvement.md` (OLI-279)

---

## 1. Design System Constraints

All navigation UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Navigation** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "Today" title on Daily tab, "More" title |
| Section title | Fraunces | 19px | 700 | Section headers within Daily combined view |
| Segment label | Plus Jakarta Sans | 13px | 600 | Segment control labels (Today, Reminders, Routines, Meals) |
| Nav label | Plus Jakarta Sans | 10px | 500 | Bottom nav tab labels |
| Card/row title | Plus Jakarta Sans | 14px | 600 | Item titles in Daily list rows |
| Body / detail | Plus Jakarta Sans | 13–14px | 400 | Secondary content, meta lines |
| Metadata / timestamp | Plus Jakarta Sans | 11–12px | 400–500 | Due times, counts, context |
| Badge | Plus Jakarta Sans | 10px | 700 | Count badges on More tab items |
| Olivia message | Fraunces italic | 15–16px | 300 | Empty state messages, greeting text |
| Labels / caps | Plus Jakarta Sans | 10px | 700 | ALL CAPS section labels, letter-spacing: 1.2px |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light Value** | **Dark Value** |
|---|---|---|---|
| Bottom nav background | --surface | #FFFFFF | #1C1A2E |
| Bottom nav border-top | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Active nav pill bg | --lavender-soft | #EDE9FF | #2A2545 |
| Active nav text/icon | --violet | #6C5CE7 | #6C5CE7 |
| Inactive nav text | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Segment control bg | --surface-2 | #F3F0FF | #242038 |
| Active segment bg | --violet | #6C5CE7 | #6C5CE7 |
| Active segment text | white | #FFFFFF | #FFFFFF |
| Inactive segment text | --ink-2 | rgba(26,16,51,0.55) | rgba(237,233,255,0.6) |
| Section type header | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Reminder accent | --rose / --violet / --peach | (see reminders spec) | (see reminders spec) |
| Routine accent | --mint / --mint-soft | #00C9A7 / #E0FFF9 | #00C9A7 / #0A2820 |
| Meal accent | --peach / --peach-soft | #FFB347 / #FFF3E0 | #FFB347 / #2E1E08 |
| More tab row bg | --surface | #FFFFFF | #1C1A2E |
| More tab row hover | --surface-2 | #F3F0FF | #242038 |
| Count badge bg | --rose-soft | #FFE8F2 | #3A1828 |
| Count badge text | --rose | #FF7EB3 | #FF7EB3 |
| Completed item opacity | — | 0.55 | 0.55 |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Bottom nav pill (active state) | 20px (fully rounded) |
| Segment control container | 16px |
| Segment control item | 12px |
| Daily item row | 16px |
| More tab menu row | 16px |
| Count badge pill | 20px (fully rounded) |
| Daily tab FAB (future) | 50% |

---

## 2. Component Anatomy

### 2.1 Updated Bottom Navigation Bar

The bottom nav changes from 5 tabs to a new 5-tab configuration. The component structure is identical — only the tab definitions change.

**Current:** Home | Tasks | Olivia | Lists | Memory
**New:** Home | Daily | Olivia | Lists | More

| **Position** | **Tab ID** | **Icon** | **Label** | **Route** |
|---|---|---|---|---|
| 1 | `home` | House (Phosphor) | Home | `/` |
| 2 | `daily` | CalendarCheck (Phosphor) | Daily | `/daily` |
| 3 | `olivia` | Sparkle (Phosphor) | Olivia | `/olivia` |
| 4 | `lists` | ListChecks (Phosphor) | Lists | `/lists` |
| 5 | `more` | DotsThree (Phosphor) | More | `/more` |

**Icon choice rationale:**
- **Daily**: `CalendarCheck` — conveys "today's plan" without implying a full calendar. The checkmark inside the calendar reinforces the action-oriented nature of the tab.
- **More**: `DotsThree` — standard iOS "more" convention (three dots / ellipsis). Universally understood as "additional options."

**Badge behavior:**
- The `home` tab retains its existing nudge badge (violet dot with count).
- The `more` tab shows a **count badge** when there are pending task inbox items. Badge uses `--rose-soft` bg / `--rose` text (same style as existing badges). Positioned top-right of the icon, offset `-4px` top and `-6px` right.
- No badge on `daily` tab — the content itself communicates urgency.

**Nav CSS (unchanged structure, same tokens):**

```css
.bottom-nav {
  height: 66px;
  background: var(--surface);
  border-top: 1.5px solid var(--ink-4);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px;
  /* Safe area for home indicator */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 14px;
  border-radius: 20px;
  background: transparent;
  transition: background 0.15s ease;
}

.nav-btn.active {
  background: var(--lavender-soft);
}

.nav-label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-3);
}

.nav-btn.active .nav-label {
  color: var(--violet);
  font-weight: 600;
}

.nav-icon {
  color: var(--ink-3);
}

.nav-btn.active .nav-icon {
  color: var(--violet);
}
```

**Dark mode note:** The existing dark shadow override for the bottom nav still applies:
```css
[data-theme="dark"] .bottom-nav {
  box-shadow: 0 -4px 20px rgba(0,0,0,0.25);
}
```

### 2.2 Segment Control (Daily Tab)

A horizontal segmented control at the top of the Daily tab for switching between views. This is a new component.

**Anatomy:**
- Container: `background: var(--surface-2)`, `border-radius: 16px`, `padding: 4px`
- Items: 4 segments — "Today" (default), "Reminders", "Routines", "Meals"
- Active segment: `background: var(--violet)`, `color: white`, `border-radius: 12px`, `padding: 8px 16px`, `font-weight: 600`
- Inactive segment: `background: transparent`, `color: var(--ink-2)`, `padding: 8px 16px`, `font-weight: 500`
- Transition: `background 0.2s ease, color 0.2s ease`

```css
.segment-control {
  display: flex;
  background: var(--surface-2);
  border-radius: 16px;
  padding: 4px;
  gap: 2px;
}

.segment-item {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  /* Minimum tap target */
  min-height: 36px;
}

.segment-item.active {
  background: var(--violet);
  color: white;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
```

**Dark mode note:** Fully automatic. `--surface-2` resolves to `#242038`, `--ink-2` resolves to the warm light variant. The active segment's `--violet` is unchanged. The `--shadow-sm` strengthens automatically.

### 2.3 Daily Section Header

Used in the combined "Today" view to separate reminder, routine, and meal groups.

**Anatomy:**
- Container: `display: flex`, `justify-content: space-between`, `align-items: center`
- Section icon: 28x28px circle, accent-soft background, accent-colored icon
  - Reminders: `background: var(--violet-dim)`, icon color `var(--violet)`, Bell icon
  - Routines: `background: var(--mint-dim)`, icon color `var(--mint)`, Repeat icon
  - Meals: `background: var(--peach-dim)`, icon color `var(--peach)`, CookingPot icon
- Title: Plus Jakarta Sans 14px/600, `color: var(--ink)`
- Count: Plus Jakarta Sans 12px/400, `color: var(--ink-3)` — e.g. "3 today"
- "See all" link: 12px/600, `color: var(--violet)`, tap target >= 44px — navigates to the specific segment

```css
.daily-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.daily-section-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.daily-section-icon.reminders { background: var(--violet-dim); color: var(--violet); }
.daily-section-icon.routines  { background: var(--mint-dim);   color: var(--mint); }
.daily-section-icon.meals     { background: var(--peach-dim);  color: var(--peach); }

.daily-section-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  flex: 1;
}

.daily-section-count {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-3);
}
```

**Dark mode note:** All tokens resolve automatically. The dim backgrounds (`--violet-dim`, `--mint-dim`, `--peach-dim`) are slightly more opaque in dark mode per the design system, keeping the icons visible against the dark surface.

### 2.4 Daily Item Row

A unified row component used across all three content types in the Daily tab. Shares structural DNA with the existing Reminder Inline Row (spec section 2.1 in reminders-visual-implementation-spec.md) but adds type-awareness.

**Anatomy:**
- Container: `border-radius: 16px`, `background: var(--surface)`, `box-shadow: var(--shadow-sm)`, `border-left: 3px solid [type accent]`, `padding: 14px 16px`
- Left dot: 8x8px circle matching border-left accent color
- Title: 14px/600, `--ink`, single line, ellipsis overflow
- Meta line: 11px/400, `--ink-2` — shows time, owner, or context
- Right badge: status badge (Due, Overdue, etc.) or quick-action button
- Type indicator pill (combined view only): 10px/700, accent color, accent-soft bg — "Reminder", "Routine", "Meal"

**Type accent mapping:**
- Reminders: Use existing due-state accent logic (--rose for overdue, --violet for due, --peach for upcoming, --sky for snoozed, --mint for completed)
- Routines: `--mint` border for active, `--ink-3` for upcoming
- Meals: `--peach` border always

**Hover/Active states (same as task card):**
- Hover: `transform: translateX(3px)`, `box-shadow: var(--shadow-md)`, `border-color: var(--lavender-mid)` (right/top/bottom borders only — left accent border preserved)
- Active/press: `transform: scale(0.98)`

**Completed items:**
- `opacity: 0.55`
- Title: `text-decoration: line-through`
- Shown at end of section, after all active items

```css
.daily-item {
  background: var(--surface);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--ink-4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.daily-item.accent-rose   { border-left: 3px solid var(--rose); }
.daily-item.accent-violet { border-left: 3px solid var(--violet); }
.daily-item.accent-peach  { border-left: 3px solid var(--peach); }
.daily-item.accent-mint   { border-left: 3px solid var(--mint); }
.daily-item.accent-sky    { border-left: 3px solid var(--sky); }

.daily-item.completed {
  opacity: 0.55;
}

.daily-item.completed .daily-item-title {
  text-decoration: line-through;
}
```

**Dark mode note:** Automatic via tokens. Accent colors are unchanged between modes. Surface and shadow tokens resolve correctly.

### 2.5 More Tab Menu Row

A full-width touchable row for each item in the More tab. Simple, clean, utilitarian.

**Anatomy:**
- Container: `background: var(--surface)`, `border-radius: 16px`, `padding: 16px 18px`, `border: 1.5px solid var(--ink-4)`
- Left icon: 36x36px, `border-radius: 10px`, accent-soft background with accent icon
  - Tasks: `background: var(--violet-dim)`, icon `CheckSquare`, color `var(--violet)`
  - Activity History: `background: var(--lavender-soft)`, icon `ClockCounterClockwise`, color `var(--violet-2)`
  - Week View: `background: var(--sky-dim)`, icon `CalendarBlank`, color `var(--sky)`
  - Settings: `background: var(--surface-2)`, icon `GearSix`, color `var(--ink-2)`
- Title: 14px/600, `color: var(--ink)`
- Subtitle: 12px/400, `color: var(--ink-2)` — brief description
- Right: chevron icon (CaretRight, 16px, `--ink-3`) + optional count badge
- Count badge (Tasks only): pill, `background: var(--rose-soft)`, `color: var(--rose)`, 10px/700, `padding: 2px 8px`, `border-radius: 20px`

**Hover/Active states:**
- Hover: `background: var(--surface-2)`, `box-shadow: var(--shadow-sm)`
- Active/press: `transform: scale(0.98)`

```css
.more-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border-radius: 16px;
  padding: 16px 18px;
  border: 1.5px solid var(--ink-4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.more-row:hover {
  background: var(--surface-2);
  box-shadow: var(--shadow-sm);
}

.more-row:active {
  transform: scale(0.98);
}

.more-row-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.more-row-content {
  flex: 1;
  min-width: 0;
}

.more-row-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.more-row-subtitle {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
  margin-top: 2px;
}

.more-row-badge {
  background: var(--rose-soft);
  color: var(--rose);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}

.more-row-chevron {
  color: var(--ink-3);
  flex-shrink: 0;
}
```

**Dark mode note:** Fully automatic. All tokens resolve correctly. The icon backgrounds use dim/soft tokens that shift to dark-appropriate tints.

### 2.6 More Tab Badge (on Bottom Nav)

When the Tasks inbox has pending items, a small count badge appears on the More tab icon in the bottom nav. Identical in construction to the existing nudge badge on the Home tab.

```css
.more-nav-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--rose-soft);
  color: var(--rose);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--bg);
}
```

**Dark mode note:** `--bg` border creates the cutout against the dark nav background. `--rose-soft` shifts to `#3A1828`, `--rose` stays `#FF7EB3`.

---

## 3. Screen States Reference

### Group 1 — Updated Bottom Nav (all screens)

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| NAV-1 | Home active, no badges | Light | Standard Home tab selected. All other tabs inactive. |
| NAV-2 | Daily active | Dark | Daily tab selected with CalendarCheck fill icon. |
| NAV-3 | More active, with task badge | Light | More tab selected. Badge shows "3" (example) for pending inbox items. |
| NAV-4 | Olivia active, More has badge | Dark | Olivia selected, More tab shows subtle badge indicating pending tasks elsewhere. |

### Group 2 — Daily Tab: Combined "Today" View

The default view when the Daily tab is opened. Shows today's items across all three types, grouped by type with section headers.

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| DAILY-1 | Combined view — items across all types | Light | Segment "Today" active. Three sections visible: Reminders (2 items), Routines (1 item), Meals (1 item). Each section has a header with icon, title, count. Completed items dimmed at section bottom. |
| DAILY-2 | Combined view — overdue reminder present | Dark | Rose-bordered overdue reminder row at top of Reminders section. Segment "Today" active. Routines section shows one routine due. Meals section shows today's meal plan. |
| DAILY-3 | Combined view — all done | Light | All items completed (dimmed). Olivia message at top: Fraunces italic, "Everything's done for today — well done." on `--surface-2` bg. |
| DAILY-4 | Combined view — empty (no items) | Dark | No items exist across any type. Full-screen empty state: large CalendarCheck icon (48px, --ink-3), Fraunces italic message: "Nothing planned for today. Your day is wide open." plus three "Add" buttons (Add Reminder, Add Routine, Plan Meal) using dashed-border style. |

**Layout spec — DAILY-1 (standard combined view):**

```
┌──────────────────────────────────┐
│  Status bar (44px)               │
├──────────────────────────────────┤
│  Screen header:                  │
│    "Today" — Fraunces 28px/700   │
│    "Thursday, March 12" — 13px   │
│    ink-2                         │
│                                  │
│  Segment control:                │
│  [ Today | Reminders | Routines  │
│    | Meals ]                     │
│                                  │
├──────────────────────────────────┤
│  Scroll area:                    │
│                                  │
│  ── Reminders section ────────── │
│  [🔔] Reminders · 3 today       │
│                       See all →  │
│  ┌─ reminder row ─────────────┐  │
│  │ ● Call dentist      Due ▏  │  │
│  │   10:00 AM · Jamie        │  │
│  └───────────────────────────┘  │
│  ┌─ reminder row ─────────────┐  │
│  │ ● Pick up dry cleaning     │  │
│  │   2:00 PM · Lexi  Tomorrow│  │
│  └───────────────────────────┘  │
│  ┌─ completed row (dimmed) ──┐  │
│  │ ● Take vitamins     Done  │  │
│  └───────────────────────────┘  │
│                                  │
│  ── Routines section ─────────── │
│  [↻] Routines · 1 today         │
│                       See all →  │
│  ┌─ routine row ──────────────┐  │
│  │ ● Morning check-in  Due ▏ │  │
│  │   Daily · Both            │  │
│  └───────────────────────────┘  │
│                                  │
│  ── Meals section ────────────── │
│  [🍳] Meals · Today's plan       │
│                       See all →  │
│  ┌─ meal row ─────────────────┐  │
│  │ ● Chicken stir-fry         │  │
│  │   Dinner · 30 min          │  │
│  └───────────────────────────┘  │
│                                  │
├──────────────────────────────────┤
│  Bottom nav (66px)               │
│  Home  [Daily]  Olivia  Lists    │
│                           More   │
└──────────────────────────────────┘
```

### Group 3 — Daily Tab: Individual Segments

When the user taps a specific segment (Reminders, Routines, or Meals), that type's full list view is shown within the Daily tab context.

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| DAILY-SEG-1 | Reminders segment active | Light | Segment "Reminders" selected (violet bg). Shows full reminders list: overdue → due today → upcoming. Add Reminder dashed button at top. Filter chips below segment control: All, Overdue, Snoozed, Done. |
| DAILY-SEG-2 | Routines segment active | Dark | Segment "Routines" selected. Shows today's routines with completion state. Add Routine button. Each row shows routine name, cadence, and last-completed info. |
| DAILY-SEG-3 | Meals segment active | Light | Segment "Meals" selected. Shows today's meal plan (Breakfast, Lunch, Dinner slots). Each slot is a card. Empty slots show dashed-border "Plan [meal]" button. |
| DAILY-SEG-4 | Reminders segment — empty | Dark | No reminders exist. Empty state with bell icon + Fraunces italic message: "No reminders yet. Tap + to set one up." Dashed Add button below. |

**Layout spec — DAILY-SEG-1 (Reminders segment):**

```
┌──────────────────────────────────┐
│  Screen header:                  │
│    "Reminders" — Fraunces 28px   │
│    "4 active · 1 snoozed" 13px  │
│                                  │
│  Segment control:                │
│  [ Today | [Reminders] |         │
│    Routines | Meals ]            │
│                                  │
│  Filter chips: (scroll-x)       │
│  [All] [Overdue] [Snoozed]      │
│  [Done]                          │
│                                  │
│  + Add reminder (dashed)         │
│                                  │
│  ── OVERDUE ──────────────────── │
│  ┌─ rose-accent row ──────────┐  │
│  │ ● Call plumber    Overdue ▏│  │
│  │   Yesterday · Jamie        │  │
│  └───────────────────────────┘  │
│                                  │
│  ── DUE TODAY ────────────────── │
│  ┌─ violet-accent row ────────┐  │
│  │ ● Call dentist       Due ▏ │  │
│  │   10:00 AM · Jamie         │  │
│  └───────────────────────────┘  │
│                                  │
│  ── UPCOMING ─────────────────── │
│  ┌─ peach-accent row ─────────┐  │
│  │ ● Dry cleaning    Tomorrow │  │
│  │   2:00 PM · Lexi           │  │
│  └───────────────────────────┘  │
│                                  │
│  ── SNOOZED ─────────────────── │
│  ┌─ sky-accent row (65% opa) ─┐  │
│  │ ● Grocery list    Snoozed ▏│  │
│  │   Until 3:00 PM            │  │
│  └───────────────────────────┘  │
└──────────────────────────────────┘
```

> The filter chips within the Reminders segment are identical to the existing All Reminders screen filter chips. They reuse the `.ftab` component from `design-components.md`.

### Group 4 — More Tab

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| MORE-1 | Standard view, tasks have pending items | Light | Screen title "More" (Fraunces 28px). Subtitle: "Everything else" (13px, ink-2). Four menu rows: Tasks (with count badge "3"), Activity History, Week View, Settings. Rows separated by 10px gap. |
| MORE-2 | Standard view, no pending tasks | Dark | Same layout but Tasks row has no count badge. Clean, minimal. |
| MORE-3 | Navigated from More to Tasks | Light | Tasks screen renders as a full sub-page within the More context. Back link "← More" at top (13px/600, --violet). Bottom nav still shows More as active tab. |

**Layout spec — MORE-1:**

```
┌──────────────────────────────────┐
│  Status bar (44px)               │
├──────────────────────────────────┤
│  Screen header:                  │
│    "More" — Fraunces 28px/700    │
│    "Everything else" — 13px,     │
│    ink-2                         │
│                                  │
│  margin-top: 24px                │
│                                  │
│  ┌─ Tasks row ────────────────┐  │
│  │ [✅] Tasks          3  ›  │  │
│  │      Your task inbox       │  │
│  └───────────────────────────┘  │
│  gap: 10px                       │
│  ┌─ Activity History row ─────┐  │
│  │ [🕐] Activity History   › │  │
│  │      What's happened       │  │
│  │      recently              │  │
│  └───────────────────────────┘  │
│  gap: 10px                       │
│  ┌─ Week View row ────────────┐  │
│  │ [📅] Week View          › │  │
│  │      Your week at a        │  │
│  │      glance                │  │
│  └───────────────────────────┘  │
│  gap: 10px                       │
│  ┌─ Settings row ─────────────┐  │
│  │ [⚙️] Settings           › │  │
│  │      Household &           │  │
│  │      preferences           │  │
│  └───────────────────────────┘  │
│                                  │
│  (generous whitespace below)     │
│                                  │
├──────────────────────────────────┤
│  Bottom nav (66px)               │
│  Home  Daily  Olivia  Lists      │
│                          [More]  │
└──────────────────────────────────┘
```

**More tab menu items:**

| **Item** | **Icon (Phosphor)** | **Icon bg** | **Icon color** | **Title** | **Subtitle** |
|---|---|---|---|---|---|
| Tasks | CheckSquare | var(--violet-dim) | var(--violet) | Tasks | Your task inbox |
| Activity History | ClockCounterClockwise | var(--lavender-soft) | var(--violet-2) | Activity History | What's happened recently |
| Week View | CalendarBlank | var(--sky-dim) | var(--sky) | Week View | Your week at a glance |
| Settings | GearSix | var(--surface-2) | var(--ink-2) | Settings | Household & preferences |

### Group 5 — Updated Home Screen Links

The Home screen's existing "All →" links for Reminders, Routines, and Meals sections now navigate to the corresponding Daily tab segment instead of standalone pages.

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| HOME-NAV-1 | Home with Daily-linked sections | Light | "All Reminders →" navigates to `/daily?segment=reminders`. "All Routines →" to `/daily?segment=routines`. "All Meals →" to `/daily?segment=meals`. Visual appearance of links unchanged. |
| HOME-NAV-2 | Home with no sections (empty) | Dark | No changes to empty state behavior. |

---

## 4. Interaction & Navigation Rules

### 4.1 Daily Tab Segment Switching

- The segment control is the primary navigation within the Daily tab.
- Tapping a segment switches the view below with a `fadeUp` animation (200ms).
- **Default**: "Today" combined view on every fresh open of the Daily tab.
- **Session memory**: Segment selection persists within the current app session (switching tabs and coming back remembers your last segment). Resets to "Today" on fresh app launch.
- The screen title changes with the segment: "Today", "Reminders", "Routines", "Meals".

### 4.2 Navigation Within Segments

- Tapping an item row in any segment navigates to that item's detail page.
- Back link from detail pages returns to the Daily tab with the segment preserved: "← Daily" or "← Reminders" depending on which segment was active.
- Detail pages render as full-page views, not sheets (consistent with existing reminder/routine/meal detail patterns).

### 4.3 More Tab Navigation

- Tapping a More tab row navigates to the corresponding screen.
- The bottom nav continues to show "More" as the active tab.
- Each sub-screen shows a back link: "← More" in 13px/600 violet.
- Sub-screens within More are: Tasks (full existing tasks page), Activity History (existing memory/history page), Week View (existing week page), Settings (existing settings page).

### 4.4 Home Screen → Daily Tab

- "All Reminders →" navigates to `/daily?segment=reminders`
- "All Routines →" navigates to `/daily?segment=routines`
- "All Meals →" navigates to `/daily?segment=meals`
- The bottom nav automatically highlights "Daily" when arriving at these routes.

### 4.5 Route Redirects

All old routes must redirect to their new equivalents for backward compatibility:

| **Old Route** | **New Route** | **Notes** |
|---|---|---|
| `/tasks` | `/more/tasks` | Preserves task inbox access |
| `/memory` | `/more/history` | Activity history |
| `/history` | `/more/history` | Alternate history route |
| `/week` | `/more/week` | Week view |
| `/settings` | `/more/settings` | Settings |
| `/reminders` | `/daily?segment=reminders` | Full reminders list |
| `/routines` | `/daily?segment=routines` | Full routines list |
| `/meals` | `/daily?segment=meals` | Full meals list |

> Item detail routes (`/reminders/$id`, `/routines/$id`, `/meals/$id`, `/items/$id`) remain unchanged — they are detail pages, not tab destinations.

### 4.6 Push Notification Deep Links

- Reminder notifications deep-link to `/reminders/$id` (detail page renders within Daily tab context)
- Routine notifications deep-link to `/routines/$id`
- The bottom nav should show "Daily" as active when arriving via these deep links.

---

## 5. Layout & Spacing Spec

### 5.1 Daily Tab — Combined View

| **Element** | **Spacing / Size** |
|---|---|
| Screen header top padding | 12px below status bar |
| Screen title ("Today") | Fraunces 28px/700, margin-bottom: 4px |
| Date subtitle | 13px/400, --ink-2, margin-bottom: 16px |
| Segment control | margin-bottom: 20px |
| Segment control height | 44px (including 4px padding) |
| Section header | margin-bottom: 10px |
| "See all →" link in section header | 12px/600, --violet, tap target >= 44px |
| Item row spacing | margin-bottom: 8px, last row: margin-bottom: 0 |
| Section spacing | margin-bottom: 24px between sections |
| Horizontal page padding | 16px (card container alignment) |
| Scroll area bottom padding | 100px (clears bottom nav + safe area) |

### 5.2 Daily Tab — Segment Views

| **Element** | **Spacing / Size** |
|---|---|
| Screen title changes to segment name | Same position/style as combined view |
| Subtitle shows segment-specific count | Same position/style |
| Filter chips row (Reminders only) | margin-bottom: 16px, overflow-x: auto, no scrollbar |
| Add button | margin-bottom: 16px, dashed-border style (see reminders spec 2.3) |
| Group header (OVERDUE, DUE TODAY, etc.) | Plus Jakarta Sans 10px/700/--ink-3, uppercase, letter-spacing: 1.4px, margin: 16px 0 8px |
| Item rows | Same as combined view |

### 5.3 More Tab

| **Element** | **Spacing / Size** |
|---|---|
| Screen title ("More") | Fraunces 28px/700, margin-bottom: 4px |
| Subtitle ("Everything else") | 13px/400, --ink-2, margin-bottom: 24px |
| Row spacing | 10px gap between rows |
| Row padding | 16px vertical, 18px horizontal |
| Icon container | 36x36px, border-radius: 10px |
| Horizontal page padding | 16px |
| Scroll area bottom padding | 100px |

### 5.4 Bottom Navigation

| **Element** | **Spacing / Size** |
|---|---|
| Nav height | 66px + env(safe-area-inset-bottom) |
| Icon size | 24px |
| Label font size | 10px |
| Icon-to-label gap | 3px |
| Active pill padding | 6px 14px |
| Badge size | 16px height, min-width 16px |
| Badge offset | top: -4px, right: -6px |

---

## 6. Animation & Motion

### 6.1 Screen Transitions

- Switching between bottom nav tabs uses `screenIn` animation (300ms, fade up from 10px).
- Segment switching within the Daily tab uses `fadeUp` animation (200ms, fade up from 12px).

### 6.2 List Item Stagger

- Daily item rows use `taskIn` animation with standard stagger (0.05s base + 0.04s per item).
- Stagger resets when switching segments.

### 6.3 Segment Control

- Active segment indicator uses `background 0.2s ease` transition — smooth sliding effect as the violet fill moves between segments.

### 6.4 More Tab Rows

- Rows use `fadeUp` animation with stagger on initial load (0.05s per row).
- No animation on return visits within the same session.

### 6.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .segment-item,
  .daily-item,
  .more-row {
    animation: none;
    opacity: 1;
    transform: none;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Dark Mode Notes

All components in this spec use CSS custom properties exclusively. Summary of dark mode behavior:

| **Component** | **Dark Mode Behavior** | **Override Required?** |
|---|---|---|
| Bottom nav | Shadow increases to 0.25 opacity | Yes — existing override |
| Segment control | --surface-2 shifts to #242038 | No — automatic |
| Active segment | --violet unchanged | No — automatic |
| Daily section headers | Dim tokens increase opacity slightly | No — automatic |
| Daily item rows | Same as task card — fully automatic | No — automatic |
| More tab rows | --surface → #1C1A2E, --ink-4 border shifts | No — automatic |
| More row icon bgs | Dim/soft tokens shift to dark tints | No — automatic |
| Count badges | --rose-soft → #3A1828 | No — automatic |
| Nav badges | --bg border shifts for cutout | No — automatic |
| Empty states | --surface-2 bg for Olivia messages | No — automatic |

**No new dark mode overrides are required.** All new components resolve correctly through the token system.

---

## 8. Edge Cases & Failure Modes

### 8.1 Empty Combined View

When no reminders, routines, or meals exist for today, show a single empty state (DAILY-4) rather than three empty sections. The empty state uses a centered layout with a large icon, Olivia message, and three creation buttons.

### 8.2 Partially Empty Combined View

If one or two sections have no items but others do, the empty sections are hidden entirely in the combined view — only sections with items are shown. The user can still navigate to the specific segment via the segment control to see the empty state and create items.

### 8.3 Large Item Counts

If a section in the combined view has more than 5 items, show only the first 5 with a "Show N more" link below. The link scrolls/expands to reveal remaining items inline, or the user can tap "See all →" to switch to the full segment view.

### 8.4 More Tab — Task Count Accuracy

The task count badge on the More tab (both in the nav and the menu row) must reflect the real-time count of pending inbox items. Use the same data source as the existing Tasks tab counter. If count is 0, hide the badge entirely. Badge shows "9+" for counts above 9.

### 8.5 Transition Tooltip (First Launch After Nav Change)

On first launch after the navigation change, show a single, dismissible tooltip anchored to the "Daily" tab:

- Tooltip: `background: var(--violet)`, `color: white`, `border-radius: 12px`, `padding: 10px 14px`
- Text: Plus Jakarta Sans 13px/500, "Your reminders, routines, and meals are now here."
- Dismiss: tap anywhere, or after 5 seconds auto-dismiss with fade out
- Arrow: 8px triangle pointing down at the Daily tab icon
- Show once only — track dismissal in `localStorage` under key `olivia-nav-tooltip-seen`

A second tooltip anchored to the "More" tab appears after the Daily tooltip is dismissed:

- Text: "Tasks and History moved here."
- Same styling, same dismiss behavior, same localStorage tracking (`olivia-more-tooltip-seen`)

### 8.6 Segment Memory on Tab Switch

When the user leaves the Daily tab and returns, their last-selected segment should be preserved within the session. On app cold start, always reset to "Today" combined view.

### 8.7 Deep Link Segment Activation

When arriving at `/daily?segment=reminders` (from a Home "All →" link), the segment control must visually activate the correct segment without animation — it should feel like the user landed on the right page, not that something switched.

---

## 9. Accessibility Notes

- All bottom nav items must have `aria-label` matching the tab label.
- Active nav item uses `aria-current="page"`.
- Segment control items use `role="tab"` with `aria-selected` for the active segment. The container uses `role="tablist"`.
- Tab panels use `role="tabpanel"` with `aria-labelledby` referencing the segment tab.
- All interactive elements maintain 44x44px minimum tap targets.
- Focus states use `var(--violet-glow)` ring — stronger in dark mode automatically.
- `prefers-reduced-motion` disables all stagger and transition animations.
- Count badges include `aria-label` for screen reader context (e.g., "3 pending tasks").
- "See all →" links include `aria-label` with full context (e.g., "See all reminders").

---

## 10. Design Decisions & Rationale

### 10.1 Combined "Today" as Default

**Decision:** Default to the combined "Today" view, not the most-used segment.

**Rationale:** The combined view delivers on the product ethos principle of "reduce cognitive load." Users see their complete daily picture at a glance — what needs doing across all types. If we defaulted to Reminders, users would need an extra tap to check routines or meals. The combined view is the only zero-tap-to-full-picture option.

### 10.2 "More" Tab Icon — Three Dots

**Decision:** Use `DotsThree` (three dots / ellipsis) for the More tab.

**Rationale:** This is the standard iOS convention. The hamburger menu (three horizontal lines) is associated with side-drawer navigation, which Olivia doesn't use. The grid icon (four squares) suggests an app launcher. Three dots clearly communicates "additional options" to iOS users.

### 10.3 Home Screen Sections Remain

**Decision:** Keep the Home screen's reminders/routines/meals sections as summary previews linking into Daily.

**Rationale:** The Home screen's job is "what matters right now." Removing daily sections would make Home feel hollow. Instead, they serve as a glanceable summary that links into the Daily tab for action. Home = overview, Daily = action. This mirrors the "calm" principle — don't force users to think about where to go.

### 10.4 Filter Chips in Reminders Segment Only

**Decision:** Only the Reminders segment has filter chips (All, Overdue, Snoozed, Done). Routines and Meals do not.

**Rationale:** Reminders have complex state (overdue, due, upcoming, snoozed, done) that benefits from filtering. Routines are simpler (today's routines, past completions). Meals are structured by meal slot (Breakfast, Lunch, Dinner). Adding filter chips to these would be over-engineering — the natural grouping is sufficient.

---

## 11. Open Design Questions

1. **Segment control vs. horizontal tabs**: The spec uses a filled segment control (iOS native style). An alternative is underline-style tabs. The segment control feels more native on iOS and clearly communicates "these are modes of the same screen." **Recommendation: segment control.** If engineering finds the filled segment hard to implement with good animation, fall back to underline tabs using `--violet` underline + `--ink` text for active state.

2. **Daily tab scroll position memory**: Should the scroll position within a segment be preserved when switching segments and coming back? **Recommendation: yes, within the session.** Reset scroll to top only on fresh tab open.

3. **Meal slot structure**: The meals segment shows meal slots (Breakfast, Lunch, Dinner) rather than a flat list. Should empty slots always show, or only show planned meals? **Recommendation: always show all three slots** — empty slots with "Plan [meal]" button encourage usage. This is a design call that may change based on user feedback.

4. **Home screen section ordering**: With Daily tab handling daily features, should the Home screen reorder its sections? Currently: Nudge → Needs Doing (tasks) → Reminders → Routines → Coming Up. **Recommendation: Nudge → Needs Doing → Coming Up.** Remove the inline Reminders/Routines/Meals sections from Home entirely, replacing them with a single "Today's Daily" summary card that links to the Daily tab. This prevents redundancy. **Flagging for VP of Product input.**

---

*— End of specification —*
