---
title: "Olivia — Unified Weekly View: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Unified Weekly View
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Unified Weekly View — the first Horizon 4 surface. It covers navigation placement, design system constraints, component anatomy, all screen states with precise layout specs, interaction and animation rules, token assignments, dark mode behavior, and edge cases.
>
> Key design decisions resolved here: navigation placement (Home tab replacement), day-section layout (always expanded), workflow-type visual differentiation (accent color + icon per type), today-highlight treatment (violet-tinted elevated section), and completed-item visual treatment (strikethrough, remains visible). These are documented with rationale so future agents do not re-derive them.
>
> **Reused without change:** The per-screen spouse read-only banner (`--lavender-soft` bg, `--violet` text, per L-009), the Olivia nudge card (inherited unchanged from the home screen component), and the bottom nav shell are all directly inherited. No new primitives are introduced — this screen assembles existing H3 components into a cross-workflow temporal view.

---

## 0. Design Decisions Resolved

The following questions were open in `docs/specs/unified-weekly-view.md` and are resolved here.

### 0.1 Navigation Entry Point

**Decision:** The Weekly View becomes the new primary content of the Home tab (Tab 1, 🏡 icon). The Home tab's MVP content — the personalized greeting, "Needs doing" summary, and "Coming up" horizontal event strip — is superseded by the weekly day-by-day view. The Home tab retains its first-position in the bottom nav, its icon (🏡), and its label ("Home"). It becomes the "household command center" summary the product ethos has always described.

The Olivia nudge card is retained as a conditional element within the Home/Weekly screen, positioned just below the screen header and above the first day section. It remains invisible when no active nudge exists, consistent with the original home screen rule.

**Rationale:** The five-tab bottom nav (Home, Tasks, Olivia, Household, Memory) is already at comfortable mobile density. Adding a sixth "Week" tab would crowd the nav bar and imply that the weekly view is a peer to Memory or Tasks — neither of which is correct. The weekly view is the household command center entry point, which is exactly what the Home tab has always meant. Replacing the MVP home content with the weekly view is the natural Horizon 4 upgrade: the old home showed "what matters today" (a 3-item summary and event strip); the new home shows "what is happening this whole week" across all four H3 workflows. This is a content evolution, not a structural change to the navigation model.

The greeting + avatar stack header is simplified: the personalized time-aware greeting is replaced by a structured "This week" header with the date range. The avatar stack is retained. This simplification reflects the shift from a "daily briefing" surface to a "weekly coordination center" surface. Olivia's proactive voice is preserved via the nudge card.

**Updated Home tab content (Horizon 4):**
```
┌──────────────────────────────────────────┐
│  [olivia wordmark]         [L] [A]       │  ← header bar (retained)
│                                          │
│  This week                               │  ← Fraunces 700, 28px
│  Mon 16 – Sun 22, March                  │  ← Plus Jakarta Sans 13px, ink-2
├──────────────────────────────────────────┤
│  [ Olivia nudge card — conditional ]     │  ← hide if no active nudge
├──────────────────────────────────────────┤
│  [TODAY — Mon 16]                        │  ← highlighted day section
│    · Routine row                         │
│    · Reminder row                        │
│    · Meal entry row                      │
│    · Inbox item row                      │
│  [Tue 17]                                │
│    · ...                                 │
│  [Wed 18] — nothing scheduled            │
│    · Empty day state                     │
│  ...                                     │
└──────────────────────────────────────────┘
│  🏡 Home  ✅ Tasks  ✦ AI  ☑ Household  🗂️ Memory  │
└──────────────────────────────────────────┘
```

**Bottom nav (unchanged):**
```
┌────────┬────────┬────────┬────────────┬────────┐
│ 🏡 Home│ ✅Tasks│  ✦ AI │ ☑ Household│🗂️Memory│
└────────┴────────┴────────┴────────────┴────────┘
```
Home tab is active when on the Weekly View screen.

**Implementation notes:**
- The route for the weekly view is `/` (root), replacing the MVP home screen content at that route.
- The existing `screen-home` component is refactored to render the weekly view as its primary content, with the header bar simplified.
- The nudge card component is unchanged — it uses the same conditional rendering logic as before.
- No new nav component or routing change is required.

---

### 0.2 Day-Section Layout: Always Expanded

**Decision:** All seven day sections are always expanded. There is no collapse/expand affordance. All items within each day are always visible.

**Rationale:** The feature spec states the view should be "scannable in 10–15 seconds." Collapse affordances would require the household member to tap-to-expand each day to understand what is there — defeating the point of the view. For a weekly view of household coordination items (a small number per day in the average household), visible content is always more useful than hidden-behind-a-tap content. If a day has many items and creates density pressure, the design handles it through visual hierarchy (workflow-type grouping with section labels), not through hiding items. Collapsible sections are a Phase 2 consideration if actual household usage reveals density problems.

**Implementation note:** The `<section>` element for each day is always in expanded state. No toggle state or `aria-expanded` attribute is needed for Phase 1.

---

### 0.3 Workflow-Type Visual Differentiation

**Decision:** Each of the four workflow types uses a consistent left-edge accent color and a small icon prefix, drawn from the existing design system accent palette. The color-plus-icon pairing ensures the differentiation works for colorblind users (icon is the non-color differentiator; see accessibility note in §1.2).

| Workflow type | Accent color token | Icon | Rationale |
|---|---|---|---|
| Recurring routines | `--mint` | `↻` (repeat/cycle) | Mint represents consistent, recurring household obligations — steady and reliable |
| Reminders | `--peach` | `🔔` | Peach is the "due soon" accent already established in the task card urgency system |
| Meal entries | `--rose` | `◆` (small diamond) | Rose is warm and food-adjacent; distinct from both task types |
| Inbox items | `--sky` | `▷` (action arrow) | Sky is cool and action-oriented; distinguishes tracked work from routine obligations |

This mapping extends the existing accent assignment logic: rose = overdue/urgent, peach = soon/reminder, mint = shared/steady, sky = informational. Routines get mint (steady recurring obligation), reminders get peach (you should do this soon), meals get rose (warm planning), inbox items get sky (tracked action). The icon is always a small `12px` symbol rendered in the accent color, left-aligned before the item title.

**Implementation note:** No new tokens are introduced. All four accent colors (`--mint`, `--peach`, `--rose`, `--sky`) exist in the design system and resolve correctly in both light and dark mode.

---

### 0.4 Today Highlight Treatment

**Decision:** Today's day section is visually elevated and distinguished using `--lavender-soft` as the section background fill, with `--violet` as the section header text color. A 3px `--violet` left border runs the full height of the today section's content area. A "TODAY" badge in `--lavender-soft` bg / `--violet` text (badge style, 10px ALL CAPS) appears inline with the day label.

For all other days (past and future days within the week), the section background is `--bg` (the app background), the day label text is `--ink`, and there is no left border on the section itself.

**Past days** (days before today, within the current week) are not visually muted or dimmed — they remain at full opacity. Their completed/done items use strikethrough treatment (see §0.5), but the day section as a whole is treated normally. This allows the household member to scan what was accomplished earlier in the week.

**Rationale:** The feature spec requires today to be "prominently highlighted and visible without scrolling when the user opens the view." The `--lavender-soft` background fill is the lightest possible surface elevation that communicates "this is the most important section" without making the rest of the view feel depressed or secondary. Using `--violet` for the day label text mirrors the active nav tab treatment, which already communicates "this is where you are." The TODAY badge provides explicit text confirmation that does not rely solely on color.

---

### 0.5 Completed-Item Visual Treatment

**Decision:** Completed routine occurrences and done inbox items remain visible within their day section with a strikethrough applied to the item title text. The strikethrough uses `--ink-3` (muted) for the title text color. The item's left-border accent color and workflow-type icon are retained at full color (not muted). The item row background is unchanged (`--surface`).

Snoozed reminders show a `--peach` snooze icon (`⏤` or `…`) in place of the bell icon, with the item title at normal weight and `--ink-2` color (not strikethrough — snoozed is not done).

Overdue items (reminders and inbox items past their scheduled/due time, not yet done) display the `--rose` accent color and a `--rose` overdue badge instead of their normal accent. Overdue routines likewise use `--rose` for their left border and status badge. This reuses the established overdue/rose treatment from the task card component.

**Rationale:** The spec states: "Completed items should appear with a visual completion state but remain visible for the day — not hidden." Strikethrough is the universally understood completion signal in household task contexts. Retaining the workflow-type color on the left border ensures the completed item is still identifiable by workflow type at a glance. Completely hiding completed items would make the weekly view feel like it only shows problems — some households will get value from seeing that they completed their routines or closed their inbox items earlier in the day.

---

## 1. Design System Constraints

All Unified Weekly View UI must strictly conform to the Olivia design system. No new tokens are introduced. The complete token reference is in `docs/vision/design-foundations.md`.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Weekly View** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "This week" screen header |
| Screen subtitle | Plus Jakarta Sans | 13px | 400 | Date range: "Mon 16 – Sun 22, March" |
| Day section header — today | Plus Jakarta Sans | 13px | 700 | "TODAY — Mon 16" in `--violet` |
| Day section header — other | Plus Jakarta Sans | 13px | 500 | "Tue 17", "Wed 18" in `--ink` |
| TODAY badge | Plus Jakarta Sans | 10px | 700 | ALL CAPS badge pill: "TODAY" |
| Workflow type label | Plus Jakarta Sans | 10px | 700 | ALL CAPS section label: "ROUTINES", "REMINDERS", "MEALS", "INBOX" |
| Item title — active | Plus Jakarta Sans | 14px | 500 | Routine/reminder/meal/inbox item name |
| Item title — completed | Plus Jakarta Sans | 14px | 500 | Strikethrough, `--ink-3` color |
| Item metadata | Plus Jakarta Sans | 11–12px | 400 | Time, owner, status detail |
| Status badge | Plus Jakarta Sans | 10px | 700 | "DUE", "OVERDUE", "DONE", "SNOOZED" |
| Empty day message | Fraunces italic | 14px | 300 | "Nothing scheduled" — calm, Olivia's voice |
| Empty meal prompt | Fraunces italic | 14px | 300 | "No meal planned — tap to add" |
| Spouse banner | Plus Jakarta Sans | 13px | 500 | Read-only role indicator (inherited L-009) |
| Nudge card message | Fraunces italic | 17px | 300 | Olivia's proactive message (inherited) |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light value** | **Dark value** |
|---|---|---|---|
| Today section background | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Today section left border | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Today day label text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| TODAY badge bg | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| TODAY badge text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Other day section bg | `--bg` | `#FAF8FF` | `#12101C` |
| Other day label text | `--ink` | `#1A1033` | `#EDE9FF` |
| Day section divider | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Workflow type label | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| Routine left border + icon | `--mint` | `#00C9A7` | `#00C9A7` |
| Routine item bg | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Reminder left border + icon | `--peach` | `#FFB347` | `#FFB347` |
| Meal left border + icon | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Inbox item left border + icon | `--sky` | `#48CAE4` | `#48CAE4` |
| Item card bg (all types) | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Item card border at rest | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Completed item title text | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| Overdue item left border | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Overdue badge bg | `--rose-soft` | `#FFE8F2` | `#3A1828` |
| Overdue badge text | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Done badge bg | `--mint-soft` | `#E0FFF9` | `#0A2820` |
| Done badge text | `--mint` | `#00C9A7` | `#00C9A7` |
| Snoozed badge bg | `--peach-soft` | `#FFF3E0` | `#2E1E08` |
| Snoozed badge text | `--peach` | `#FFB347` | `#FFB347` |
| Empty day message text | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| Empty week call-to-action | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Spouse banner bg | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Spouse banner text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Screen bg | `--bg` | `#FAF8FF` | `#12101C` |

**Accessibility note:** Color is never the sole differentiator for workflow type. Each workflow type row carries both a distinct icon and a distinct accent color. Status badges carry text labels alongside color fills.

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Item card (all workflow types) | 14px |
| Status badge / TODAY badge | 20px (fully rounded pill) |
| Workflow type label pill (if used as a chip) | 20px |
| Today section container | 16px (slightly rounded container around today's items) |
| Spouse banner | 0px (full-width banner, no radius) |

### 1.4 Shadows

Item cards use `var(--shadow-sm)` at rest, `var(--shadow-md)` on hover (pointer devices only). The today section container uses `var(--shadow-sm)` to give the elevated section a subtle lift against the page background.

---

## 2. Screen Inventory

| **Identifier** | **Screen** | **State description** |
|---|---|---|
| WEEK-1 | Weekly View (Home tab) | Default: household has active routines, reminders, meal plan, and inbox items this week |
| WEEK-2 | Weekly View (Home tab) | Empty week: no items of any type scheduled for the current week |
| WEEK-3 | Weekly View (Home tab) | No active meal plan: household has routines/reminders/inbox but no meal plan for this week |
| WEEK-4 | Weekly View (Home tab) | With active Olivia nudge card (nudge card visible) |
| WEEK-5 | Weekly View (Home tab) | Item-dense day: one day has many routine occurrences, reminders, and inbox items |
| WEEK-6 | Weekly View (Home tab) | Spouse view: per-screen read-only banner displayed |

---

## 3. Screen Layout

### 3.1 Screen Shell (All Weekly View States)

```
┌──────────────────────────────────────────────────┐
│  Status bar (44px — native, not rendered)        │
├──────────────────────────────────────────────────┤
│  Header bar                                      │
│  ─────────────────────────────────────────────   │
│  [olivia wordmark — Fraunces italic, violet 30px]│
│                              [L avatar] [A avatar]│
│                                                  │
│  This week               ← Fraunces 700, 28px    │
│  Mon 16 – Sun 22, March  ← PJS 13px, ink-2       │
├──────────────────────────────────────────────────┤
│  [Spouse banner — conditional, full-width]       │
│  ← visible only for spouse sessions (L-009)      │
├──────────────────────────────────────────────────┤
│  [Olivia nudge card — conditional]               │
│  ← visible only when an active nudge exists      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Scroll area                                     │
│  ─────────────────────────────────────────────   │
│  [Today day section — highlighted]               │
│  [Tue day section]                               │
│  [Wed day section]                               │
│  ...continuing through Sun                       │
│  ─────────────────────────────────────────────   │
│  Bottom padding (safe area + 16px)               │
│                                                  │
├──────────────────────────────────────────────────┤
│  Bottom nav (66px)                               │
│  🏡 Home · ✅ Tasks · ✦ AI · ☑ Household · 🗂️Mem │
│  Home tab is ACTIVE                              │
└──────────────────────────────────────────────────┘
```

**Header measurements:**
- Horizontal padding: 22px
- Wordmark + avatar row height: 44px (tap target for avatar stack)
- Title row top margin: 8px
- Title to subtitle gap: 4px
- Header bottom padding: 16px
- Total header height (approximate): 96px

**Scroll behavior:**
- The scroll area begins below the header bar (and below the optional spouse banner and nudge card)
- The header bar does NOT scroll — it is a sticky header
- On open, the scroll position is anchored to today's day section: the top of today's section is visible at the top of the scroll area with no scroll required
- If today is Wednesday and the user scrolls up, Monday and Tuesday are accessible above

---

### 3.2 WEEK-1: Default State (Household Has Items This Week)

This is the primary daily use state. The household has at least some scheduled routines, reminders, a meal plan, and inbox items with due dates across the current week.

**Header area:**
```
olivia                                   [L] [A]
This week
Mon 16 – Sun 22, March
```

**[Today section — Mon 16] (highlighted):**
```
┌────────────────────────────────────────────────────┐  ← --lavender-soft bg, 16px radius
│ ╔══ TODAY — Mon 16 ═══════════════════════════════╗ │  ← 3px --violet left border
│ ║  [TODAY]  Mon 16                              ╗  │  ← day header row
│ ╚═══════════════════════════════════════════════╝  │
│                                                     │
│  ROUTINES  ← 10px ALL CAPS, --ink-3               │
│  ┌──────────────────────────────────────────────┐   │
│  │ ↻  Morning walk                  [DUE]       │   │  ← mint left border, 3px
│  │    Daily · 7:00 AM                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  REMINDERS  ← 10px ALL CAPS, --ink-3               │
│  ┌──────────────────────────────────────────────┐   │
│  │ 🔔  Call Dr. Peterson            [DUE]       │   │  ← peach left border, 3px
│  │     9:00 AM                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  MEALS  ← 10px ALL CAPS, --ink-3                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ ◆  Pasta carbonara                           │   │  ← rose left border, 3px
│  │    Monday · Week of Mar 16                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  INBOX  ← 10px ALL CAPS, --ink-3                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ ▷  Submit insurance claim        [DUE TODAY] │   │  ← sky left border, 3px
│  │    Due today · open                          │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**[Subsequent day section — Tue 17] (standard):**
```
──────────────────────────────────────────────────────  ← --ink-4 divider, mx-22px
Tue 17  ← PJS 13px 500, --ink; no badge, no border

  ROUTINES
  ┌──────────────────────────────────────────────┐
  │ ↻  Morning walk                  [UPCOMING] │  ← mint, status badge upcoming
  │    Daily · 7:00 AM                           │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │ ↻  Evening tidy-up    [✓ DONE]               │  ← mint, strikethrough title, done badge
  │    Daily · 9:00 PM                           │
  └──────────────────────────────────────────────┘

  MEALS
  ┌──────────────────────────────────────────────┐
  │ ◆  Sheet pan chicken                         │  ← rose
  │    Tuesday                                   │
  └──────────────────────────────────────────────┘

  [No reminders or inbox items this day — those sub-sections do not appear]
```

**Empty workflow-type sub-sections:** If a day has no reminders, the REMINDERS label and its items are omitted entirely for that day. Only workflow types with actual items for that day are shown. This keeps each day compact.

**[Empty day — Wed 18] (no items):**
```
──────────────────────────────────────────────────────
Wed 18

  ┌──────────────────────────────────────────────┐
  │  *Nothing scheduled*                         │  ← Fraunces italic 14px, --ink-3
  └──────────────────────────────────────────────┘
```

---

### 3.3 WEEK-2: Empty Week State

The household has no scheduled items across any workflow type this week. This is a realistic early-adoption state.

**Screen content (below header):**

No day sections are shown. Instead, a centered empty state:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   [calendar icon, --ink-3, 48px]                    │
│                                                      │
│   *Nothing on the books this week.*                  │  ← Fraunces italic 17px, --ink-2
│   *Add a meal plan, set a reminder, or check*        │
│   *the Household tab to get started.*                │
│                                                      │
│   ┌──────────────────────────────────────────┐       │
│   │  Go to Household →                       │       │  ← secondary button, --lavender-soft bg
│   └──────────────────────────────────────────┘       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Empty state text is Fraunces italic — Olivia is speaking
- The "Go to Household →" button navigates to the Household tab (Lists/Routines/Meals segment)
- No day-by-day sections are shown in the pure empty state — they would be seven identical empty days, which reads as broken rather than calm

---

### 3.4 WEEK-3: No Active Meal Plan

The household has routines, reminders, and inbox items this week but no active meal plan for the current week.

**Behavior per day:** The MEALS sub-section is shown in every day section, with an empty-meal-slot component in place of meal entry rows.

**Empty meal slot row:**

```
┌──────────────────────────────────────────────────┐
│ ◆  *No meal planned yet — add in Meals →*        │  ← rose left border, Fraunces italic 14px --ink-3
└──────────────────────────────────────────────────┘
```

Tapping this row navigates to the Meals segment in the Household tab. It is NOT an inline edit affordance — the weekly view is read-only.

If the household has never set up a meal plan, the empty meal slot CTA text reads: *"Start a meal plan in Meals →"*

---

### 3.5 WEEK-4: With Active Olivia Nudge Card

When an active nudge exists, the nudge card appears between the screen header and the first day section. It uses the inherited nudge card component unchanged.

**Layout:**
```
Header bar
────────────────────────────────────────────
[ Olivia Nudge Card ]
  ← gradient: linear-gradient(135deg, #6C5CE7, #8B7FF5, #a78bfa)
  ← Fraunces italic message, white text
  ← primary action + secondary action buttons
  ← full card is tappable → navigates to Olivia (AI) tab with context
────────────────────────────────────────────
[Today section]
[Tue section]
...
```

Margin above the nudge card: 8px
Margin below the nudge card: 16px
Horizontal margin: 16px (standard card container padding)

If no active nudge exists, this space is absent — the scroll area begins directly with the today section.

---

### 3.6 WEEK-5: Item-Dense Day

A day section where the household has multiple routines, multiple reminders, a meal entry, and multiple inbox items.

**Visual handling:** Items within each workflow-type sub-section stack vertically with 8px gap between cards. There is no truncation or "show more" affordance — all items are always shown. The day section grows as tall as needed.

Between workflow-type sub-sections, the label (ROUTINES, REMINDERS, MEALS, INBOX) is separated from the items above it by 12px top margin and 8px bottom margin.

**Ordering within a day:** The workflow-type order is always:
1. ROUTINES (scheduled obligations)
2. REMINDERS (time-anchored prompts)
3. MEALS (planned meals)
4. INBOX (tracked work with due dates)

Within each workflow type, items are ordered by time ascending (scheduled time / due date earliest first). Overdue items sort to the top within their type.

---

### 3.7 WEEK-6: Spouse View

The per-screen spouse read-only banner (L-009) is shown at the top of the screen, pinned below the header bar and above the nudge card (if present) or the scroll area.

**Banner anatomy:**
```
──────────────────────────────────────────────────────
│  👁  You're viewing in read-only mode               │  ← --lavender-soft bg, --violet text
──────────────────────────────────────────────────────
```

- Height: 40px
- Background: `--lavender-soft` (`#EDE9FF` light / `#2A2545` dark)
- Text: `--violet`, Plus Jakarta Sans 13px 500
- Icon: subtle eye/view icon at 16px, `--violet`
- Full width (no horizontal margin)
- No close/dismiss affordance — it is a persistent informational banner

The weekly view content is otherwise identical to the primary operator view — all workflow types, all days, all items. No items are hidden from the spouse.

---

## 4. Component Anatomy

### 4.1 Day Section Header Row

The day section header is a 44px-minimum-height row that opens each day section.

**Today:**
```
╔═══════════════════════════════════════════════════╗  ← 3px --violet left border
║  [TODAY pill]  Mon 16                             ║
╚═══════════════════════════════════════════════════╝
```
- TODAY pill: `--lavender-soft` bg, `--violet` text, 10px ALL CAPS, 20px radius, 4px 8px padding
- Day label: "Mon 16" — PJS 13px 700, `--violet`
- Left border: 3px solid `--violet`, runs full height of the today section container (not just the header row)
- Section background: `--lavender-soft` with 16px border radius on outer container

**Other days:**
```
  Tue 17
```
- Day label: PJS 13px 500, `--ink`
- No badge, no border, no background fill
- Separated from prior day section by a `--ink-4` 1px divider, `margin: 0 22px`
- Top margin above day label: 20px (section spacing)
- Bottom margin below day label: 12px

---

### 4.2 Workflow-Type Sub-Section Label

Labels appear only when that workflow type has ≥1 item in the day.

```
ROUTINES
```
- Plus Jakarta Sans 10px 700 ALL CAPS
- Color: `--ink-3`
- Letter spacing: 1.2px
- Top margin: 12px (from prior section or day header)
- Bottom margin: 8px (to first item card)
- Horizontal padding: 22px (aligns with card container)

---

### 4.3 Item Card (All Workflow Types)

All four workflow type item rows use the same card shell with workflow-specific left border color.

**Card shell:**
```css
.week-item-card {
  background: var(--surface);
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--ink-4);
  border-left: 3px solid [workflow-accent-color];
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0 16px;
}
.week-item-card:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-md);
  border-color: var(--lavender-mid);
}
.week-item-card:active {
  transform: scale(0.98);
}
```

**Card anatomy:**
```
│ [icon 12px]  [item title 14px 500]          [status badge] │
│              [metadata 11px --ink-3]                       │
```

- Icon: 12px emoji or symbol, colored with workflow accent
- Title: PJS 14px 500, `--ink`; if completed: PJS 14px 500 `--ink-3` with `text-decoration: line-through`
- Metadata: PJS 11px 400, `--ink-3` — shows time, owner, or context relevant to workflow type
- Status badge: optional, right-aligned; see badge variants below
- Card right-edge content: status badge only, no chevron (this is a read-only view — no inline edit)

**Metadata content by workflow type:**

| Workflow type | Metadata line content |
|---|---|
| Routine occurrence | Recurrence label + time: "Daily · 7:00 AM" or "Weekly · Mon" |
| Reminder | Scheduled time: "9:00 AM" or "Due at 2:30 PM" |
| Meal entry | Day context: "Monday · Week of Mar 16" |
| Inbox item | Due date + status: "Due today · open" or "Due Mon · in-progress" |

---

### 4.4 Status Badges (Item Cards)

| **Badge** | **Token: bg** | **Token: text** | **When shown** |
|---|---|---|---|
| `UPCOMING` | `--surface-2` | `--ink-2` | Scheduled but not yet due |
| `DUE` | `--peach-soft` | `--peach` | At or past scheduled time; not yet done |
| `DUE TODAY` | `--peach-soft` | `--peach` | Inbox item with due date = today |
| `OVERDUE` | `--rose-soft` | `--rose` | Past due time; not completed/done/snoozed |
| `DONE` | `--mint-soft` | `--mint` | Completed routine or done inbox item |
| `SNOOZED` | `--peach-soft` | `--peach` | Reminder in snoozed state |

The `UPCOMING` badge is shown only when a time is set and the scheduled time has not yet passed. For meal entries, no status badge is shown (meals have no actionable status in Phase 1 — they are informational).

---

### 4.5 Empty Day Row

Used when a day has no items from any workflow type.

```
┌──────────────────────────────────────────────┐
│  *Nothing scheduled*                          │  ← centered, Fraunces italic 14px --ink-3
└──────────────────────────────────────────────┘
```

- Background: `--surface`
- Border-radius: 14px
- Border: 1.5px dashed `--ink-4` (dashed, not solid — signals emptiness without alarm)
- Margin: 0 16px
- Padding: 16px
- Text is not tappable — no interaction on the empty day row

---

### 4.6 Empty Meal Slot Row

Used within a day when a meal plan exists but no meal is planned for that specific day, OR when no meal plan is active for the current week.

```
┌──────────────────────────────────────────────┐
│ ◆  *No meal planned yet — add in Meals →*    │  ← rose left border 3px, Fraunces italic 14px --ink-3
└──────────────────────────────────────────────┘
```

- Same card shell as item cards, but Fraunces italic title text
- Rose left border (workflow type color is retained)
- Tapping navigates to Household > Meals

---

### 4.7 Spouse Banner (Inherited)

Per L-009, the spouse banner is a full-width bar pinned below the screen header. No changes from the established pattern.

```css
.spouse-banner {
  background: var(--lavender-soft);
  color: var(--violet);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 22px;
  text-align: center;
}
```

---

## 5. Interaction Model

### 5.1 Screen Entry and Scroll Anchoring

When the user opens the Home tab and the weekly view loads:

1. The screen renders with the header bar at the top
2. The scroll position is anchored to today's day section: today's section appears at the top of the visible scroll area (no initial scroll needed to see today)
3. Prior days (e.g., Monday–Tuesday if today is Wednesday) are accessible by scrolling up
4. Future days (Thursday–Sunday) are accessible by scrolling down
5. The today section is always the first thing visible on open — it is the "above the fold" anchor

**Implementation note:** Use `scrollIntoView({ behavior: 'instant', block: 'start' })` on the today section element after initial render, before the first paint, to ensure no visible scroll jump on open.

### 5.2 Item Deep-Link Navigation

Every item card tap navigates to the item's source workflow screen:

| Workflow type | Deep-link destination |
|---|---|
| Routine occurrence | Household tab → Routines segment → Routine detail for that routine |
| Reminder | Reminders screen (or wherever reminders are currently accessed) → Reminder detail |
| Meal entry | Household tab → Meals segment → Day view for that plan/day |
| Inbox item | Tasks/Inbox screen → Inbox item detail |

**Tap target:** The entire card is tappable. No portion of the card initiates a different action.

**Back navigation:** After deep-linking, the standard system back gesture / back button returns to the weekly view (Home tab).

**No write actions:** No card in the weekly view shows an edit button, a checkbox, a swipe-to-complete action, or any other write affordance. The view is strictly read-only. All writes happen in the source workflow screen.

### 5.3 Nudge Card Interaction

The nudge card (when present) is tappable on its entirety and navigates to the Olivia (AI) tab with the nudge context pre-loaded. This is identical to the original home screen nudge card behavior.

### 5.4 Empty State Household CTA

The "Go to Household →" button in the WEEK-2 empty state (and the empty meal slot row in WEEK-3/6) taps to navigate to the Household tab, defaulting to the Routines or Meals segment as appropriate.

---

## 6. Animation

### 6.1 Screen Entry Animation

The weekly view screen uses the standard `screenIn` animation on mount:

```css
@keyframes screenIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.screen-home {
  animation: screenIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
```

### 6.2 Day Section Stagger

Day sections animate in with a staggered `taskIn` entrance on initial render:

```css
@keyframes taskIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
.week-day-section:nth-child(1) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
.week-day-section:nth-child(2) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.09s both; }
.week-day-section:nth-child(3) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.13s both; }
.week-day-section:nth-child(4) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.17s both; }
.week-day-section:nth-child(5) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
.week-day-section:nth-child(6) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.23s both; }
.week-day-section:nth-child(7) { animation: taskIn 0.3s cubic-bezier(0.22,1,0.36,1) 0.26s both; }
```

Stagger interval capped at 0.04s per section (7 sections ≤ 300ms total stagger duration). Sections start at `opacity: 0` in CSS.

### 6.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .screen-home,
  .week-day-section,
  .week-item-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## 7. Dark Mode Notes

The weekly view themes automatically through CSS variable inheritance. The following elements warrant explicit attention:

### Today Section in Dark Mode

The today section uses `--lavender-soft` as its background fill. In dark mode, this resolves to `#2A2545` — a deep indigo that reads as clearly elevated from the `#12101C` app background without being harsh. The 3px `--violet` left border provides the strongest visual accent, and violet is unchanged between modes.

### Workflow-Type Accent Colors in Dark Mode

All four workflow accent colors (`--mint`, `--peach`, `--rose`, `--sky`) are unchanged between modes (they are the "full" accent values, not the soft fill values). They read well on dark `--surface` (`#1C1A2E`) card backgrounds.

### Item Card Left Border on Dark Surfaces

The 3px solid colored left borders (mint, peach, rose, sky) will appear more vivid against dark card backgrounds than light card backgrounds. This is desirable — it makes workflow-type identification easier in dark mode.

### Completed Item Strikethrough in Dark Mode

`--ink-3` in dark mode is `rgba(237,233,255,0.35)` — a muted near-white. Strikethrough text in this color against the `#1C1A2E` surface background is readable but clearly secondary. Verify 3:1 contrast ratio minimum for the strikethrough-decorated text.

### Empty Day Dashed Border in Dark Mode

The dashed `--ink-4` border on the empty day row resolves to `rgba(237,233,255,0.1)` in dark mode — a very subtle light ring. If this is too faint on dark surfaces during implementation, upgrade to `--ink-3` for the empty day dashed border only in dark mode.

### Spouse Banner in Dark Mode

`--lavender-soft` in dark mode is `#2A2545`, which provides strong contrast against the `#12101C` app background. The `--violet` text remains unchanged. The banner will be clearly visible in dark mode.

---

## 8. Edge Cases

### 8.1 Daily Routine Appearing Every Day

A routine with a daily recurrence (e.g., "Take medication", "Morning walk") will produce an occurrence in every day section of the weekly view. This could create 7 identical-looking rows spread across the week.

**Visual handling:** The item title and metadata are identical for each day's occurrence, but each row is a distinct occurrence record with its own status (upcoming, due, done). The completion state for each day will differ as the week progresses — Tuesday's "Morning walk" may show DONE while Wednesday's shows UPCOMING. This is correct and useful.

**No special collapsing is applied in Phase 1.** The spec defers the "routine completion count" question (open question 5 in the feature spec) to Phase 2. If daily routines cause density problems in real use, a Phase 2 design pass can introduce a "N of 7 completed" summary row.

### 8.2 Multiple Items of the Same Type in One Day

A day with 4 due reminders, 3 inbox items due, and a daily routine shows all items stacked within their respective sub-sections. Each item card is rendered at full height (no truncation). The day section height grows as needed.

The day section is not capped at a maximum height. The household member scrolls the full page — individual day sections do not have their own scrollable containers.

### 8.3 Item Overdue From Earlier in Current Week

An inbox item due on Monday that is not yet done will show as OVERDUE in the Monday section on Wednesday. The Monday section is not hidden or greyed out — it is visible above the Wednesday today section and accessible by scrolling up. The overdue item's card will show a `--rose` left border and OVERDUE badge.

Items overdue from **prior weeks** (due before this Monday) do not appear in the weekly view. They are visible in the source workflow screens only.

### 8.4 All Items in a Day Are Completed

A day where every routine is done, every reminder is completed, and every inbox item is done: the day section still shows all items with strikethrough treatment. The day does not collapse to an empty-day state simply because everything is done — completed state is informational and should be visible.

### 8.5 No Meal Plan, But Items Exist for Other Workflow Types

When no meal plan is active for the current week, the MEALS sub-section appears in every day with the empty meal slot row. The other workflow-type sub-sections render normally. The empty meal slot CTA is shown each day — this is intentional repetition that gently nudges the household toward adding a meal plan.

### 8.6 Week Boundary (Sunday)

If today is Sunday, the today section shows Sunday only and all prior days (Mon–Sat) are above it in the scroll area. The view shows the full current week regardless of which day it is — no past days are hidden.

### 8.7 Week Boundary (Monday First Visit of Week)

If the household opens the app on Monday morning before any actions have been taken, the weekly view shows all 7 days with their planned content (routine occurrences from the recurrence schedule, any planned meals, any reminders with scheduled times this week, and any inbox items with due dates this week). No items will be in DONE state yet. The today section at the top shows all upcoming items for Monday.

---

## 9. Implementation Checklist

Before considering the Weekly View implementation complete, verify:

**Layout and structure:**
- [ ] Home tab (`/`) renders the weekly view, not the MVP greeting/task-summary layout
- [ ] Header shows "This week" title and date range (not time-aware greeting)
- [ ] Wordmark and avatar stack remain in the header bar
- [ ] Seven day sections (Mon–Sun) are always rendered (no days hidden)
- [ ] Scroll is anchored to today's day section on open (no visible scroll on first load)
- [ ] Today section has `--lavender-soft` background, `--violet` left border, TODAY badge
- [ ] Non-today day sections have no background fill, no left border, plain day label
- [ ] Workflow-type sub-sections only appear for types with ≥1 item on that day

**Workflow assembly:**
- [ ] Reminders with `scheduled_time` in current Mon–Sun appear in the correct day section
- [ ] Routine occurrences with `due_date` in current Mon–Sun appear in the correct day section
- [ ] Meal entries from the active meal plan for the current week appear in the correct day section
- [ ] Inbox items with `due_date` in current Mon–Sun appear in the correct day section
- [ ] Shared lists do NOT appear anywhere in the weekly view
- [ ] Items with dates before this Monday do NOT appear in the weekly view

**Item cards:**
- [ ] Each workflow type has the correct left border accent color (mint/peach/rose/sky)
- [ ] Each workflow type has the correct icon prefix (↻/🔔/◆/▷)
- [ ] Correct status badge rendered for each item status
- [ ] Completed/done items show strikethrough title in `--ink-3`, retain accent border color
- [ ] Overdue items show `--rose` left border and OVERDUE badge
- [ ] Item card tap navigates to the correct source workflow screen
- [ ] No write actions (no checkboxes, no swipe affordances, no edit buttons)

**Empty states:**
- [ ] Empty day shows dashed-border Fraunces italic row ("Nothing scheduled")
- [ ] Empty week (no items at all) shows full-screen empty state with CTA
- [ ] No active meal plan shows empty meal slot row with CTA in each day

**Inherited components:**
- [ ] Olivia nudge card renders above day sections when active; absent when no nudge
- [ ] Spouse banner renders below header for spouse sessions (L-009 pattern)
- [ ] Bottom nav Home tab is ACTIVE on this screen

**Theming and accessibility:**
- [ ] All colors use CSS variables — no hardcoded hex values in component CSS
- [ ] Dark mode: today section `--lavender-soft` resolves to `#2A2545` (visible elevation)
- [ ] Dark mode: workflow accent colors unchanged (full accent values, not soft fills)
- [ ] Color is never the sole differentiator — icons accompany accent colors
- [ ] All item cards meet 44×44px minimum tap target
- [ ] Animations disabled under `prefers-reduced-motion`
- [ ] Day stagger animation uses `taskIn` with delays capped at 0.26s for 7 sections

---

## 10. Open Design Questions

All designer decisions from `docs/specs/unified-weekly-view.md` are resolved in this spec:

1. **Navigation entry point** → Resolved: §0.1. Home tab content replaced with weekly view.
2. **Day-section layout (expanded vs collapsible)** → Resolved: §0.2. Always expanded.
3. **Workflow-type visual differentiation** → Resolved: §0.3. Accent color + icon per type.
4. **Today highlight** → Resolved: §0.4. `--lavender-soft` section bg, `--violet` left border + label.
5. **Empty-day state** → Resolved: §4.5. Dashed border Fraunces italic row.
6. **Completed-item state** → Resolved: §0.5. Strikethrough + `--ink-3`, accent border retained.
7. **Spouse banner position** → Resolved: §3.7 and §4.7. Below header, above nudge card or scroll area.

**Deferred to Phase 2 (product spec open questions, not blocking Phase 1):**
- Week navigation (next week peek) — remains deferred
- Inline routine completion from the weekly view — remains deferred
- Overdue-from-prior-week roll-up section — remains deferred
- Daily routine "N of 7 completed" summary row — remains deferred (§8.1)
- Multi-week navigation — remains deferred
