---
title: "Olivia — Iconography: Visual Implementation Spec"
subtitle: "Replace emoji with Phosphor Icons"
date: "March 2025"
status: "Design handoff for implementation"
---

# Olivia — Iconography
## Visual Implementation Spec
*Replace emoji with Phosphor Icons*

*March 2025 · Design handoff for implementation*

---

> **Scope of this document**
>
> This spec defines the icon library selection rationale, icon mapping for every UI surface, sizing and color rules, and implementation guidance. It is a complete handoff document for the Founding Engineer.

---

## 1. Library Decision: Phosphor Icons

### 1.1 Why Phosphor

Olivia's design language calls for icons that feel **warm, expressive, and grounded** — never sterile or generic. After evaluating the major open-source icon libraries against these criteria, **Phosphor Icons** is the best fit.

| Criterion | Phosphor | Lucide | Heroicons | Feather |
|---|---|---|---|---|
| Aesthetic warmth | Rounded, friendly geometry | Clean but neutral | Tech-product feel | Minimal, dated |
| Weight variants | 6 (thin, light, regular, bold, fill, duotone) | 1 (stroke) | 2 (outline, solid) | 1 (stroke) |
| Expressiveness | Duotone adds personality and depth | Flat only | Flat only | Flat only |
| Coverage | 1,200+ icons, strong household/life set | Good but gaps in lifestyle | Tailwind-focused | Limited, unmaintained |
| React support | `@phosphor-icons/react` — tree-shakeable | Yes | Yes | Yes |
| Brand alignment | Rounded forms complement Plus Jakarta Sans | Geometric but cold | Sharp, corporate | Inconsistent |
| Bundle impact | Tree-shakeable, ~1KB per icon used | Similar | Similar | Similar |

### 1.2 Primary Weight: Regular

The **Regular** weight (1.5px stroke, rounded caps and joins) is Olivia's default icon weight. It balances legibility with the soft, approachable character the brand requires.

- **Regular** — all standard UI icons (navigation, actions, metadata)
- **Fill** — active/selected states (e.g., active nav tab icon)
- **Bold** — emphasis contexts (e.g., empty state hero icons, primary CTA icons)
- **Duotone** — reserved for special expressive moments (Olivia's identity mark, feature illustrations)

### 1.3 Why Not the Others

- **Lucide**: Clean and well-maintained, but its single-weight stroke style tends toward the "productivity app" aesthetic Olivia explicitly avoids. No duotone or fill variants limits expressive range.
- **Heroicons**: Designed for Tailwind ecosystems. The outline style is sharp-cornered and feels corporate — misaligned with Olivia's warm, editorial tone.
- **Feather**: Effectively unmaintained. Limited icon count. No weight variants.
- **Tabler Icons**: Comprehensive but inconsistent visual personality. Less polished than Phosphor.

### 1.4 Package

```bash
npm install @phosphor-icons/react
```

Import pattern (tree-shakeable):
```tsx
import { House, CheckSquare, Bell, MagnifyingGlass } from '@phosphor-icons/react'
```

---

## 2. Design System Integration

### 2.1 Sizing Scale

All icons use a consistent sizing scale tied to context. These sizes are fixed across light and dark modes.

| Context | Size (px) | Phosphor `size` prop | Usage |
|---|---|---|---|
| Navigation | 24 | 24 | Bottom nav tab icons |
| Card inline | 18 | 18 | Inside task rows, reminder rows, metadata lines |
| Section header | 20 | 20 | Section titles, screen headers |
| Button inline | 16 | 16 | Inside buttons alongside text |
| Empty state hero | 48 | 48 | Large centered icon in empty/zero states |
| Category icon container | 20 | 20 | Inside 36×36px icon containers (memory cards, etc.) |
| Quick chip | 16 | 16 | Inside suggestion chips |

### 2.2 Color Rules

Icons inherit color from their parent text context via `currentColor` (Phosphor's default). This means icons automatically theme correctly in both light and dark mode when placed inside properly-themed containers.

**Explicit color assignments:**

| Context | Color token | Notes |
|---|---|---|
| Default icon | `currentColor` (inherits `--ink`) | Most cases |
| Secondary/metadata icon | `var(--ink-2)` | Timestamps, tertiary info |
| Inactive nav icon | `var(--ink-3)` | Bottom nav, non-active tabs |
| Active nav icon | `var(--violet)` | Active bottom nav tab |
| Accent icon (reminder bell) | `var(--peach)` | Reminder-specific |
| Accent icon (routine) | `var(--mint)` | Routine-specific |
| Accent icon (meal) | `var(--rose)` | Meal-specific |
| Accent icon (inbox) | `var(--sky)` | Inbox-specific |
| On violet background | `white` | Inside nudge card, primary buttons |
| Disabled state | `var(--ink-3)` | Non-interactive elements |

**Rule:** Never hardcode hex colors on icons. Always use CSS custom properties or `currentColor`.

### 2.3 Icon Container Pattern

For icons that need a tinted background (memory cards, category indicators), use the existing container pattern from `design-components.md`:

```css
.icon-container {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-container--violet  { background: var(--lavender-soft); color: var(--violet); }
.icon-container--peach   { background: var(--peach-soft);    color: var(--peach); }
.icon-container--mint    { background: var(--mint-soft);     color: var(--mint); }
.icon-container--rose    { background: var(--rose-soft);     color: var(--rose); }
.icon-container--sky     { background: var(--sky-soft);      color: var(--sky); }
```

All variants resolve correctly in dark mode via existing tokens.

---

## 3. Icon Mapping — Full Inventory

### 3.1 Bottom Navigation

The bottom nav is the most prominent icon surface. Active tabs use **Fill** weight; inactive use **Regular**.

| Tab | Current | Phosphor Icon | Inactive | Active | Notes |
|---|---|---|---|---|---|
| Home | 🏡 | `House` | `<House size={24} />` | `<House size={24} weight="fill" />` | Warm, approachable home |
| Tasks | ✅ | `CheckSquare` | `<CheckSquare size={24} />` | `<CheckSquare size={24} weight="fill" />` | Checkbox = task completion |
| Olivia | ✦ | `Sparkle` | `<Sparkle size={24} />` | `<Sparkle size={24} weight="fill" />` | Magic/AI sparkle for Olivia |
| Lists | ☑ | `ListChecks` | `<ListChecks size={24} />` | `<ListChecks size={24} weight="fill" />` | Checklist icon for shared lists |
| Memory | 🗂️ | `FolderSimple` | `<FolderSimple size={24} />` | `<FolderSimple size={24} weight="fill" />` | Simple folder for memory/records |

**Active state styling (unchanged from current):**
```css
.nav-btn.active { background: var(--lavender-soft); }
.nav-btn.active .nav-label { color: var(--violet); }
/* Icon color is set via color prop or CSS: */
.nav-btn { color: var(--ink-3); }
.nav-btn.active { color: var(--violet); }
```

### 3.2 Home Screen — Weekly View Item Icons

These icons appear inside the colored icon containers on weekly view item cards.

| Item Type | Current | Phosphor Icon | Size | Container Color |
|---|---|---|---|---|
| Routine | ↻ | `ArrowsClockwise` | 18 | `--mint-soft` bg, `--mint` icon |
| Reminder | 🔔 | `Bell` | 18 | `--peach-soft` bg, `--peach` icon |
| Meal | ◆ | `ForkKnife` | 18 | `--rose-soft` bg, `--rose` icon |
| Inbox item | ▷ | `Tray` | 18 | `--sky-soft` bg, `--sky` icon |
| Empty meal slot | ◆ | `ForkKnife` | 18 | Dimmed opacity |

### 3.3 Action & Feedback Icons

Used in confirmation banners, buttons, and interactive elements.

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Success confirmation | ✓ | `Check` | 18 | Inside mint confirmation banner |
| Snooze confirmation | 😴 | `Moon` | 18 | Inside sky snooze banner. Moon = rest/pause |
| Undo action | ↩ | `ArrowCounterClockwise` | 16 | Inline with "Undo" text |
| Add / create | ＋ | `Plus` | 20 | Add buttons, FABs |
| Settings | SVG gear | `GearSix` | 20 | Home page header settings button |
| Search | 🔍 | `MagnifyingGlass` | 20 | Memory screen search bar |
| Edit | ✏️ | `PencilSimple` | 16 | Edit actions in sheets/cards |
| Delete / cancel | ✕ | `X` | 16 | Remove/cancel actions |
| Close sheet | — | `X` | 20 | Sheet close button |

### 3.4 Reminder-Specific Icons

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Reminder bell (rows) | 🔔 | `Bell` | 18 | Inline row icon |
| Reminder bell (empty state) | 🔔 | `Bell` | 48 | Bold weight for hero |
| Add reminder button icon | 🔔 | `BellPlus` | 20 | Bell with plus |
| Recurring badge prefix | ↻ | `ArrowsClockwise` | 14 | Inside recurrence pill |
| Linked task prefix | 🔗 | `LinkSimple` | 14 | Inside linked-task pill |
| Done action | ✓ | `Check` | 16 | Done button icon |
| Snooze action | 😴 | `Moon` | 16 | Snooze button icon |
| Overdue dot | (colored dot) | — | — | Keep as CSS dot, not icon |

### 3.5 Routines Page

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Routine icon (rows) | ↻ | `ArrowsClockwise` | 18 | Mint-colored |
| Completed banner | ✓ | `Check` | 18 | Success confirmation |
| Empty state hero | 🔁 | `ArrowsClockwise` | 48 | Bold weight |
| Add routine button | ＋ | `Plus` | 20 | Standard add |

### 3.6 Meals Page

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Meal icon | — | `ForkKnife` | 18 | Rose-colored |
| Empty state hero | 🍽️ | `ForkKnife` | 48 | Bold weight |
| Add meal plan | ＋ | `Plus` | 20 | Standard add |

### 3.7 Lists Page

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| List item completion | ✓ | `Check` | 18 | Inline check |
| Restored banner | ↩ | `ArrowCounterClockwise` | 16 | Restore confirmation |
| New list button | ＋ | `Plus` | 20 | Standard add |

### 3.8 History Page

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Routine completion | ↻ | `ArrowsClockwise` | 18 | With mint container |
| Reminder completion | 🔔 | `Bell` | 18 | With peach container |
| Meal entry | ◆ | `ForkKnife` | 18 | With rose container |
| Inbox item | ▷ | `Tray` | 18 | With sky container |
| List item completion | ✓ | `Check` | 18 | With violet container |

### 3.9 Task View

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Add task button | + | `Plus` | 20 | Standard add |

### 3.10 Chat / Olivia View

| Context | Current | Phosphor Icon | Size | Notes |
|---|---|---|---|---|
| Olivia identity mark | ✦ | `Sparkle` | 16 | In "✦ Olivia" labels. Keep as text ✦ OR use `<Sparkle>` — see open question |
| Quick chip: Calendar | 📅 | `CalendarBlank` | 16 | Suggestion chip prefix |
| Quick chip: Maintenance | 🛠️ | `Wrench` | 16 | Suggestion chip prefix |
| Quick chip: Person | 👤 | `User` | 16 | Suggestion chip prefix |
| Quick chip: Idea | 💡 | `Lightbulb` | 16 | Suggestion chip prefix |
| Draft action | ✍️ | `PencilLine` | 16 | "Draft a reply" CTA |
| Greeting wave | 👋 | — | — | Keep as emoji — conversational warmth |

### 3.11 Memory View — Category Icons

These appear inside the 36×36px icon containers on memory cards.

| Category | Current | Phosphor Icon | Container Color |
|---|---|---|---|
| Decisions made | 🎨 | `Palette` | `--lavender-soft` |
| Home maintenance | 🔧 | `Wrench` | `--peach-soft` |
| Contacts & services | 🔑 | `AddressBook` | `--lavender-soft` |
| Notes | (varies) | `Notebook` | `--mint-soft` |
| Weather/seasonal | ❄️ | `Snowflake` | `--sky-soft` |

### 3.12 Empty State Hero Icons

All empty state icons use **Bold** weight at 48px to feel substantial and friendly without being heavy.

| Screen | Current | Phosphor Icon | Color |
|---|---|---|---|
| Empty reminders | 🔔 | `Bell` | `var(--ink-3)` |
| Empty routines | 🔁 | `ArrowsClockwise` | `var(--ink-3)` |
| Empty meals | 🍽️ | `ForkKnife` | `var(--ink-3)` |
| Empty week | 📅 | `CalendarBlank` | `var(--ink-3)` |

---

## 4. The ✦ Symbol — Olivia's Identity Mark

The sparkle character ✦ is currently used as Olivia's identity prefix ("✦ Olivia", "✦ Olivia noticed"). This is a design decision point:

**Recommendation: Keep ✦ as a text character for Olivia's label prefix.** Reasons:
- It renders at text-level inline with "Olivia" in small labels (10px uppercase)
- Its geometric simplicity at small sizes is clearer than a Phosphor `<Sparkle>` icon
- It's part of Olivia's typographic identity, not a UI icon
- The Olivia nav tab icon should use `<Sparkle>` from Phosphor for consistency with other nav icons

**Rule:** ✦ (text) for inline "Olivia" labels. `<Sparkle>` (Phosphor) for navigation and standalone icon contexts.

---

## 5. Checkboxes — No Change

The circular task checkboxes (22px, hollow → filled on completion) remain as CSS-rendered elements, not icons. The ✓ checkmark inside a completed checkbox is rendered via CSS `::after` pseudo-element. This is more performant and allows smoother animation than swapping in an icon component.

---

## 6. Implementation Guidance

### 6.1 Installation

```bash
# From the pwa app directory
npm install @phosphor-icons/react
```

### 6.2 Component Pattern

Create a thin wrapper for consistent defaults:

```tsx
// src/components/ui/Icon.tsx
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

interface IconProps extends PhosphorIconProps {
  // All Phosphor props pass through
}

// No wrapper needed — use Phosphor components directly.
// This note exists to confirm: do NOT create an abstraction layer.
// Import icons directly where used:
//
// import { Bell } from '@phosphor-icons/react'
// <Bell size={18} />
```

### 6.3 Migration Order

Suggested implementation order, from highest-visibility to lowest:

1. **Bottom navigation** — most-seen surface, immediate visual impact
2. **Home screen item icons** — weekly view cards (routine, reminder, meal, inbox)
3. **Action/feedback icons** — confirmation banners, add buttons, settings
4. **Empty state hero icons** — zero-state screens
5. **History page icons** — mirrors weekly view mapping
6. **Reminder-specific icons** — pills, badges, action buttons
7. **Chat/Olivia view** — quick chips, action cards
8. **Memory view category icons** — demo data icon mapping
9. **Settings icon** — replace inline SVG

### 6.4 Files to Modify

| File | Changes |
|---|---|
| `apps/pwa/package.json` | Add `@phosphor-icons/react` dependency |
| `apps/pwa/src/components/bottom-nav.tsx` | Replace emoji with Phosphor icons, add fill weight for active state |
| `apps/pwa/src/routes/home-page.tsx` | Replace emoji item icons, settings SVG, confirmation banners |
| `apps/pwa/src/routes/reminders-page.tsx` | Replace bell emoji, add/action icons |
| `apps/pwa/src/routes/routines-page.tsx` | Replace circulation emoji, add icons |
| `apps/pwa/src/routes/meals-page.tsx` | Replace meal emoji, add icons |
| `apps/pwa/src/routes/lists-page.tsx` | Replace add/restore icons |
| `apps/pwa/src/routes/history-page.tsx` | Replace `itemIcon()` function with Phosphor components |
| `apps/pwa/src/components/screens/MemoryView.tsx` | Replace search emoji |
| `apps/pwa/src/components/screens/TasksView.tsx` | Replace add button |
| `apps/pwa/src/components/reminders/AddReminderButton.tsx` | Replace default bell emoji prop |
| `apps/pwa/src/lib/demo-data.ts` | Replace emoji strings with icon component references or icon name strings |

### 6.5 Dark Mode

No icon-specific dark mode overrides are needed. Phosphor icons render as SVG with `currentColor` fill/stroke by default. As long as parent containers use CSS custom property colors (which they already do), icons will theme correctly in both modes automatically.

---

## 7. What Stays as Emoji

A small number of emoji should be **kept** because they serve a conversational/emotional purpose rather than a UI function:

| Emoji | Context | Reason to keep |
|---|---|---|
| 👋 | Olivia greeting message | Conversational warmth in chat, not a UI element |
| ✦ | "✦ Olivia" label prefix | Typographic identity mark (see section 4) |

Everything else transitions to Phosphor Icons.

---

## 8. Accessibility Notes

- All Phosphor icons render as inline SVG with `aria-hidden="true"` by default — correct for decorative icons
- Icons paired with text labels (nav, buttons) need no additional ARIA — the text provides the accessible name
- Standalone icons (e.g., settings gear, search) must have an `aria-label` on the parent button element
- Icon color must never be the sole differentiator — always pair with text labels or additional visual cues (consistent with existing design system rules)
- Minimum tap target (44×44px) rules apply to the icon's parent interactive element, not the icon itself

---

## 9. Open Design Questions

1. **Olivia nav icon**: Should the Olivia tab use `Sparkle` (magical/AI feel) or retain a custom orb-style icon? Current recommendation is `Sparkle` for consistency, but the orb has brand equity.

2. **Demo data icon references**: `demo-data.ts` currently stores emoji as strings. Should these be migrated to icon component name strings (e.g., `"bell"`) with a lookup map, or should the rendering components own the icon mapping based on item type? Recommendation: rendering components own the mapping based on `type` field — demo data should not reference UI components.

3. **Duotone usage**: Phosphor's duotone weight offers an expressive two-tone style. Should it be used for any surfaces (e.g., empty state heroes, memory category icons) or kept in reserve? Recommendation: reserve for v2 — start with Regular/Fill/Bold only to keep the system simple.

---

*— End of specification —*
