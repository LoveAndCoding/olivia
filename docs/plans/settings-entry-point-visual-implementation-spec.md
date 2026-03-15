---
title: "Olivia — Settings Entry Point: Visual Implementation Spec"
date: "2026-03-15"
status: "Design handoff — ready for implementation"
task: "OLI-29"
---

# Olivia — Settings Entry Point
## Visual Implementation Spec

*2026-03-15 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines the two visual changes needed to make the Settings page reachable in installed PWA mode:
>
> 1. A gear icon entry point added to the Home page header
> 2. Settings page navigation — replacing the misleading BottomNav with a back-arrow pattern
>
> No new design tokens are introduced. Both changes use only existing design system components and CSS variables.

---

## 1. Design System Constraints

This feature introduces no new components and no new tokens. All styling references existing values from `docs/vision/design-foundations.md` and `docs/vision/design-components.md`.

### 1.1 Existing Pattern Reused — Back Navigation

The `.rem-detail-back` class is already the standard back-navigation affordance across all Horizon 3 detail pages (reminder detail, list detail, routine detail). The Settings page should adopt this same pattern without introducing a new CSS class.

```css
.rem-detail-back {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--violet);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 18px;
}
```

### 1.2 Color Token Usage

| Visual Purpose | Token | Light | Dark |
|---|---|---|---|
| Gear icon at rest | `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` |
| Gear icon on hover / active | `--ink` | `#1A1033` | `#EDE9FF` |
| Gear icon focus ring | `--violet-glow` | `rgba(108,92,231,0.18)` | `rgba(108,92,231,0.3)` |
| Back button text / chevron | `--violet` | `#6C5CE7` | `#6C5CE7` |

---

## 2. Screen Inventory

| Screen ID | Name | Change type |
|---|---|---|
| HOME-HDR | Home page header — gear icon | New element added |
| SETTINGS-NAV | Settings page — back navigation | Existing element replaced |

---

## 3. Screen Designs

### 3.1 HOME-HDR — Home Page Header with Gear Icon

#### Current layout

```
.home-header-row
├── .wordmark  "olivia"              (left)
└── .avatar-stack                   (right)
    ├── .av.av-l  "L"
    └── .av.av-a  "C"
```

#### New layout

```
.home-header-row
├── .wordmark  "olivia"              (left)
└── .home-header-actions             (right, row, gap: 8px, align-items: center)
    ├── .avatar-stack
    │   ├── .av.av-l  "L"
    │   └── .av.av-a  "C"
    └── .settings-btn               (gear icon button)
```

The existing `.avatar-stack` and the new `.settings-btn` are siblings inside a new `.home-header-actions` wrapper on the right side of `home-header-row`.

#### Settings button anatomy

```
.settings-btn
├── size: 44×44px (touch target)
├── display: flex, align-items: center, justify-content: center
├── background: transparent
├── border: none
├── border-radius: 12px
├── cursor: pointer
└── <svg>  gear icon, 20×20px, currentColor
```

**Icon:** Use a standard gear/cog SVG outline icon. The icon renders at 20×20px. `currentColor` inheritance means no fill or stroke color hardcoded — it inherits the parent color token automatically.

**Color states:**

| State | Icon color | Background |
|---|---|---|
| Rest | `var(--ink-2)` | `transparent` |
| Hover | `var(--ink)` | `var(--surface-2)` |
| Active / press | `var(--ink)` | `var(--surface-3)` |
| Focus-visible | `var(--ink)` | `transparent`, outline `2px solid var(--violet)`, `outline-offset: 4px` |

**Transition:** `color 0.15s ease, background 0.15s ease`

**Accessible label:** `aria-label="Settings"`

**Tap behavior:** Navigate to `/settings`

#### CSS spec for `.home-header-actions`

```css
.home-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  color: var(--ink-2);
  transition: color 0.15s ease, background 0.15s ease;
  padding: 0;
}

.settings-btn:hover {
  color: var(--ink);
  background: var(--surface-2);
}

.settings-btn:active {
  color: var(--ink);
  background: var(--surface-3);
}

.settings-btn:focus-visible {
  color: var(--ink);
  outline: 2px solid var(--violet);
  outline-offset: 4px;
}
```

**Dark mode note:** Fully automatic. `--ink-2`, `--ink`, `--surface-2`, `--surface-3`, and `--violet` all resolve to their dark equivalents. No explicit dark-mode override needed.

#### Complete home header layout spec (annotated)

```
┌───────────────────────────────────────────────┐
│  [wordmark "olivia"]         [avatars] [⚙️]   │  ← home-header-row
│                                                │
│  Good morning,                                 │  ← Fraunces 700
│  Lexi.                                         │  ← Fraunces italic 300, --violet
│  Thursday, Mar 15 · 2 things need you today   │  ← Plus Jakarta Sans 13px, --ink-2
└───────────────────────────────────────────────┘
```

The gear icon sits to the right of the avatar stack, both inside a flex row. The gear icon's 44×44px touch target is vertically centered with the avatars.

---

### 3.2 SETTINGS-NAV — Settings Page Navigation

#### Problem with current implementation

The current Settings page renders `<BottomNav activeTab="home" />` at the bottom. This is misleading: the Home tab appears "active" but the user is not on the Home screen. Settings is a leaf page accessed from Home, not a primary tab destination.

#### Design decision

Settings is a **leaf page**. It should:
- Show a back button in the top content area that returns to `/` (Home)
- Remove the BottomNav entirely
- Make no structural changes to the Settings content cards

This is the same pattern used by all Horizon 3 detail pages (`rem-detail-back`). The implementation reuses the existing CSS class.

#### New settings page layout

```
┌──────────────────────────────────────────────┐
│  ← Home                                      │  ← .rem-detail-back button
├──────────────────────────────────────────────┤
│  Settings                                    │  ← .screen-title (Fraunces 700, 28px)
│  App preferences and diagnostics             │  ← .screen-sub (Plus Jakarta Sans 13px, --ink-2)
├──────────────────────────────────────────────┤
│  [Theme card]                                │
│  [Active role card]                          │
│  [Notifications card]                        │
│  [Installability card]                       │
│  [Sync diagnostics card]                     │
└──────────────────────────────────────────────┘
              [NO BottomNav]
```

#### Back button spec

Reuse `.rem-detail-back` without adding a new CSS class.

```tsx
<button
  type="button"
  className="rem-detail-back"
  onClick={() => void navigate({ to: '/' })}
  aria-label="Back to Home"
>
  ← Home
</button>
```

**Text:** "← Home" (not "← Back" — naming the destination is more wayfinding-clear on a leaf page)

**Visual treatment:**
- Font: Plus Jakarta Sans, 13px, weight 600
- Color: `var(--violet)`
- Background: transparent
- Left-edge flush with content (no left indent beyond standard `padding: 6px 0`)
- `margin-bottom: 18px` provides spacing before the screen title

**Dark mode note:** Fully automatic via `--violet` (unchanged between modes).

#### What is removed

- `<BottomNav activeTab="home" />` — removed from the Settings page entirely
- The Home tab no longer appears falsely active when the user is on Settings

#### What is unchanged

The Settings content cards (Theme, Active role, Notifications, Installability, Sync diagnostics) are untouched. This spec changes only the navigation chrome.

---

## 4. Interaction & State Transitions

### 4.1 Gear icon tap — entry point

```
Home screen (idle)
  → User taps ⚙️ gear icon
  → Navigate to /settings
  → Settings page renders with back button
```

No confirmation, no loading state. Navigation is immediate.

### 4.2 Back button tap — return to Home

```
Settings page
  → User taps "← Home"
  → Navigate to /
  → Home screen renders, BottomNav shows Home tab active
```

No confirmation. Navigation is immediate.

### 4.3 No new trust-model implications

Settings is a user-initiated navigation. No agentic actions. No confirmation required.

---

## 5. Dark Mode Notes

Both changes theme automatically:

- **Gear icon:** Uses `--ink-2`/`--ink`/`--surface-2`/`--surface-3` — all resolve to dark equivalents. The icon reads as a soft subdued control in both modes.
- **Back button:** Uses `--violet` — unchanged between modes. The "← Home" text reads clearly in both light and dark.

No explicit `[data-theme="dark"]` overrides required for either change.

---

## 6. Edge Cases and States

| Case | Behavior |
|---|---|
| Gear icon in spouse role | Same appearance and behavior — Settings is role-agnostic |
| User navigates to `/settings` via direct URL (browser mode) | Back button still present; tapping returns to `/`; BottomNav still absent |
| Settings page with very long content | Back button is inside `screen-scroll` and scrolls with content — no sticky nav to obscure |
| Reduced motion preference | No animation on gear icon hover or back button — transitions are already `0.15s ease`, within the `0.01ms` override range |
| Keyboard navigation | Gear icon and back button are both `<button>` elements — fully keyboard-accessible. Focus ring uses `var(--violet-glow)` per design system standard |

---

## 7. Open Design Questions

None blocking implementation. This spec is ready for implementation as-is.

**Possible future consideration (not for this task):** If Settings expands significantly (e.g., household member management, app version info), consider whether a sticky back-button header or `position: sticky` treatment would improve the UX. That decision is deferred until Settings content grows.

---

## 8. Implementation Checklist

Before marking OLI-29 implementation complete, verify:

- [ ] Gear icon renders in `home-header-row`, right of avatar stack
- [ ] Gear icon touch target is 44×44px minimum
- [ ] Gear icon uses `--ink-2` at rest, transitions to `--ink` on hover/active
- [ ] Gear icon focus ring uses `outline: 2px solid var(--violet)` on `:focus-visible`
- [ ] Tapping gear icon navigates to `/settings`
- [ ] Settings page shows "← Home" back button using `.rem-detail-back`
- [ ] Settings page does NOT render `<BottomNav>`
- [ ] Tapping "← Home" navigates to `/`
- [ ] Both light and dark mode verified visually
- [ ] Keyboard navigation tested (Tab → Enter to tap gear; Tab → Enter to use back button)
