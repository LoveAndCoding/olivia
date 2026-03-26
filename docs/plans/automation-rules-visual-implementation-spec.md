---
title: "Olivia — Automation Rules Settings UI: Visual Implementation Spec"
subtitle: "Settings sub-page at /settings/automation"
date: "March 2026"
status: "Design handoff for implementation"
task: "OLI-322"
---

# Olivia — Automation Rules Settings UI
## Visual Implementation Spec

*March 2026 · Design handoff for implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Automation Rules settings page (approved D-072, 2026-03-25). It covers:
>
> 1. **Settings entry point** — an "Automation Rules" row in the Settings screen
> 2. **Rule list screen** — a full-screen route at `/settings/automation` showing all rules with toggle and delete
> 3. **Rule creation flow** — a stepped form: trigger → threshold → action → scope → save
> 4. **Rule history screen** — automation log at `/settings/automation/history`
> 5. **All states** — empty, populated, limit reached, deletion confirmation
>
> **Design philosophy:** This should feel like the iOS Shortcuts "Automation" tab — a simple settings page, not a complex rule builder. Minimize cognitive load. The creation flow uses a stepped approach to avoid overwhelming the user with a full form.
>
> **Source spec:** `docs/specs/automation-foundation.md`

---

## 0. Design Decisions

### 0.1 Settings Entry Point — Dedicated Row with Zap Icon

**Decision:** "Automation Rules" is a standalone settings row placed **after the "Send Feedback" row and before the Installability diagnostic card**. It uses a lightning bolt / zap icon to convey automated action.

**Rationale:** Automation is a user-configured feature, not a diagnostic. Placing it after feedback and before diagnostics keeps the Settings page organized as: features → communication → system info. The zap icon reads as "automated action" — distinct from the speech bubble (feedback), gear (settings), and bell (notifications) metaphors.

### 0.2 Rule List — Card Per Rule, Toggle Inline

**Decision:** Each rule is rendered as a card with: human-readable summary, toggle switch, and a delete affordance via swipe or long-press menu. The rule list is a simple vertical stack.

**Rationale:** Cards match Olivia's established pattern for list items. An inline toggle makes enable/disable a single-tap operation — no drill-in required. This mirrors iOS Shortcuts' automation list.

### 0.3 Rule Creation — Stepped Bottom Sheet

**Decision:** Rule creation uses a **full-screen stepped flow** (not a modal or bottom sheet). Steps: select trigger → configure threshold → select action → optional scope → confirm & save. One decision per screen.

**Rationale:** Mobile-first. A stepped flow keeps each decision focused and avoids presenting a complex form. The user makes one choice at a time, with clear progress indication. This is simpler than a single-page form with multiple sections.

### 0.4 Automation History — Separate Sub-Page

**Decision:** The automation log is accessible via a "History" link in the rule list header. It navigates to `/settings/automation/history` and shows a chronological list of recent rule executions.

**Rationale:** The product spec says history should be "quietly available" — a link in the header provides access without promoting it to a primary navigation element. Most users will set rules and forget them.

### 0.5 Scope Preview — Inline Count Before Save

**Decision:** The final confirmation step shows a preview: "This rule would currently apply to N routines/reminders." This count is computed live.

**Rationale:** The product spec requires an impact preview before saving. Showing the count at the confirm step (rather than inline during scope selection) keeps each step focused. The user sees the full picture before committing.

---

## 1. Design System Constraints

This feature introduces **no new design tokens**. All styling references existing values from `docs/vision/design-foundations.md` and `docs/vision/design-components.md`.

### 1.1 New CSS Classes

| Class | Purpose |
|---|---|
| `.auto-row` | Settings entry point row (mirrors `.feedback-row`) |
| `.auto-screen` | Rule list screen container |
| `.auto-header` | Screen header with title, count, and history link |
| `.auto-rule-card` | Individual rule card in the list |
| `.auto-rule-summary` | Human-readable rule description text |
| `.auto-rule-toggle` | Toggle switch for enable/disable |
| `.auto-rule-delete` | Delete button (visible on swipe or long-press) |
| `.auto-empty` | Empty state container |
| `.auto-limit-banner` | Banner shown when 20-rule limit reached |
| `.auto-create-screen` | Rule creation flow container |
| `.auto-step-indicator` | Step progress dots |
| `.auto-step-title` | Current step title |
| `.auto-option-card` | Selectable option card (trigger, action, scope) |
| `.auto-threshold-input` | Numeric threshold input with stepper |
| `.auto-scope-preview` | Impact preview before save |
| `.auto-history-screen` | Automation history screen container |
| `.auto-history-entry` | Individual history log entry |
| `.auto-delete-confirm` | Delete confirmation overlay |

### 1.2 Typography

| Role | Font | Size | Weight | Token |
|---|---|---|---|---|
| Screen title ("Automation Rules") | Fraunces | 28px | 700 | — |
| Screen subtitle ("N rules active") | Plus Jakarta Sans | 13px | 400 | `--ink-2` |
| History link | Plus Jakarta Sans | 13px | 600 | `--violet` |
| Rule summary text | Plus Jakarta Sans | 14px | 500 | `--ink` |
| Rule scope detail | Plus Jakarta Sans | 12px | 400 | `--ink-2` |
| Empty state heading | Fraunces italic | 17px | 300 | `--ink` |
| Empty state body | Plus Jakarta Sans | 13px | 400 | `--ink-2` |
| Step title | Fraunces | 22px | 700 | `--ink` |
| Step subtitle | Plus Jakarta Sans | 13px | 400 | `--ink-2` |
| Option card title | Plus Jakarta Sans | 14px | 600 | `--ink` |
| Option card description | Plus Jakarta Sans | 12px | 400 | `--ink-2` |
| Threshold value | Plus Jakarta Sans | 28px | 700 | `--ink` |
| Threshold unit label | Plus Jakarta Sans | 13px | 500 | `--ink-2` |
| Scope preview text | Fraunces italic | 15px | 300 | `--ink` |
| Confirm button | Plus Jakarta Sans | 15px | 700 | white |
| Limit banner text | Plus Jakarta Sans | 13px | 500 | `--peach` |
| History entry action | Plus Jakarta Sans | 13px | 600 | `--ink` |
| History entry detail | Plus Jakarta Sans | 12px | 400 | `--ink-2` |
| History entry timestamp | Plus Jakarta Sans | 11px | 400 | `--ink-3` |

### 1.3 Color Token Usage

| Visual Purpose | Token | Light | Dark |
|---|---|---|---|
| Screen background | `--bg` | `#FAF8FF` | `#12101C` |
| Settings row / card background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Card border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Entry point icon container bg | `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` |
| Entry point icon | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Toggle track (off) | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Toggle track (on) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Toggle thumb | white | `#FFFFFF` | `#FFFFFF` |
| Option card (unselected) bg | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Option card (unselected) border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Option card (selected) border | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Option card (selected) bg | `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` |
| Option card icon bg (routine) | `--sky-soft` | `#E0F7FC` | `#0A2228` |
| Option card icon bg (reminder) | `--peach-soft` | `#FFF3E0` | `#2E1E08` |
| Stepper button bg | `--surface-2` | `#F3F0FF` | `#242038` |
| Stepper button icon | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Scope preview bg | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| Scope preview border | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Save/confirm button bg | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Save button shadow | `--shadow-violet` | see foundations | see foundations |
| Limit banner bg | `--peach-soft` | `#FFF3E0` | `#2E1E08` |
| Limit banner text | `--peach` | `#FFB347` | `#FFB347` |
| Delete confirm destructive btn | `--rose` | `#FF7EB3` | `#FF7EB3` |
| Delete confirm cancel btn bg | `--surface-2` | `#F3F0FF` | `#242038` |
| History entry rule badge bg | `--lavender-soft` | `#EDE9FF` | `#2A2545` |
| History entry rule badge text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Add rule button (FAB) bg | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Add rule button shadow | `--shadow-violet` | see foundations | see foundations |
| Disabled rule card opacity | — | `0.5` | `0.5` |

### 1.4 Spacing & Layout

| Element | Spec |
|---|---|
| Screen padding (horizontal) | `16px` |
| Screen padding (top, below back button) | `8px` |
| Section gap (between rule cards) | `12px` |
| Rule card padding | `16px` |
| Rule card border-radius | `18px` |
| Rule card border | `1.5px solid var(--ink-4)` |
| Rule card shadow | `var(--shadow-sm)` |
| Option card padding | `16px` |
| Option card border-radius | `16px` |
| Option card gap (between cards) | `12px` |
| Step indicator dot size | `8px` diameter |
| Step indicator dot gap | `8px` |
| Threshold stepper button size | `44px × 44px` |
| Threshold value display area | `80px` wide, centered |
| Scope preview padding | `14px` |
| Scope preview border-radius | `14px` |
| Scope preview border-left | `3px solid var(--violet)` |
| Add rule FAB size | `56px × 56px` |
| Add rule FAB position | `bottom: calc(24px + env(safe-area-inset-bottom))`, `right: 16px` |
| History entry padding | `14px 16px` |
| History entry gap (between entries) | `1px` (divider) |

---

## 2. Screen Inventory

| Screen State ID | Screen | Description |
|---|---|---|
| AUTO-SETTINGS-1 | Settings | "Automation Rules" row visible in settings list |
| AUTO-LIST-1 | Rule list | Empty state — no rules created yet |
| AUTO-LIST-2 | Rule list | Populated — 1–19 rules, some enabled/disabled |
| AUTO-LIST-3 | Rule list | Limit reached — 20 rules, add button hidden, banner shown |
| AUTO-CREATE-1 | Create rule | Step 1: Select trigger type |
| AUTO-CREATE-2 | Create rule | Step 2: Configure threshold |
| AUTO-CREATE-3 | Create rule | Step 3: Select action |
| AUTO-CREATE-4 | Create rule | Step 4: Select scope (optional) |
| AUTO-CREATE-5 | Create rule | Step 5: Confirm — scope preview, save button |
| AUTO-DELETE-1 | Rule list | Delete confirmation overlay |
| AUTO-HISTORY-1 | History | Empty — no rule executions yet |
| AUTO-HISTORY-2 | History | Populated — chronological execution log |

---

## 3. Screen Designs

### 3.1 AUTO-SETTINGS-1 — Settings Entry Point

#### Layout

```
.settings-card  (existing feedback row area)
├── .feedback-row  "Send Feedback"  (existing)

.auto-row                                         ← NEW
├── .auto-row__icon   ⚡                          (left, --violet on --violet-dim bg)
├── .auto-row__content
│   ├── .auto-row__label  "Automation Rules"      (--ink, 14px 600)
│   └── .auto-row__count  "3 active"              (--ink-2, 12px 400)
└── .auto-row__chevron  ›                         (--ink-3)

.settings-card  (existing Installability card)
├── ... existing diagnostic rows ...
```

#### Specs

```css
.auto-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: 14px;
  margin: 12px 0;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.auto-row:active {
  transform: scale(0.98);
  background: var(--surface-2);
}
.auto-row__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--violet-dim);
  border-radius: 10px;
  font-size: 16px;
}
.auto-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auto-row__label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.auto-row__count {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}
.auto-row__chevron {
  color: var(--ink-3);
  font-size: 16px;
}
```

**Icon:** A lightning bolt / zap SVG, 18×18px, using `currentColor` (inherits `--violet` from parent).

**Count subtitle:** Shows "N active" where N is the number of enabled rules. If zero rules: show "No rules yet". If all rules disabled: show "N rules · none active".

**Behavior:** Tapping navigates to `/settings/automation`.

---

### 3.2 AUTO-LIST-1 — Empty State (No Rules)

#### Layout

```
.auto-screen
├── .rem-detail-back  "← Settings"                    (back navigation, --violet)
├── .auto-header
│   ├── .auto-header__title  "Automation Rules"        (Fraunces 28px 700)
│   └── .auto-header__sub  "Let Olivia handle the repetitive stuff" (--ink-2, 13px)
│
├── .auto-empty
│   ├── .auto-empty__icon  ⚡                          (48px, --violet, --violet-dim bg)
│   ├── .auto-empty__heading                           (Fraunces italic 17px 300)
│   │   "No automation rules yet."
│   ├── .auto-empty__body                              (--ink-2, 13px)
│   │   "Create a rule to have Olivia automatically skip overdue routines,
│   │    resolve forgotten reminders, and more."
│   └── .auto-empty__cta                               (btn-primary style)
│       "+ Add your first rule"
```

#### Specs

```css
.auto-screen {
  padding: 0 16px env(safe-area-inset-bottom, 0);
  min-height: 100vh;
  background: var(--bg);
}
.auto-header {
  margin-bottom: 24px;
}
.auto-header__title {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
}
.auto-header__sub {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: var(--ink-2);
}
.auto-header__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Empty state */
.auto-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: 12px;
}
.auto-empty__icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--violet-dim);
  border-radius: 18px;
  font-size: 28px;
  margin-bottom: 8px;
}
.auto-empty__heading {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 17px;
  font-weight: 300;
  color: var(--ink);
}
.auto-empty__body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: var(--ink-2);
  max-width: 280px;
  line-height: 1.5;
}
.auto-empty__cta {
  margin-top: 12px;
  padding: 12px 24px;
  background: var(--violet);
  color: white;
  border: none;
  border-radius: 14px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-violet);
  transition: all 150ms ease;
}
.auto-empty__cta:hover {
  background: var(--violet-2);
}
.auto-empty__cta:active {
  transform: scale(0.98);
}
```

**Behavior:** Tapping "+ Add your first rule" enters the creation flow (AUTO-CREATE-1).

---

### 3.3 AUTO-LIST-2 — Populated Rule List

#### Layout

```
.auto-screen
├── .rem-detail-back  "← Settings"
├── .auto-header
│   ├── .auto-header__actions
│   │   ├── .auto-header__title  "Automation Rules"
│   │   └── .auto-header__history-link  "History →"   (--violet, 13px 600)
│   └── .auto-header__sub  "3 of 5 rules active"
│
├── .auto-rule-list
│   ├── .auto-rule-card
│   │   ├── .auto-rule-card__icon  🔄               (icon container, --sky-soft bg)
│   │   ├── .auto-rule-card__content
│   │   │   ├── .auto-rule-summary  "Skip routine if overdue for 3+ days"
│   │   │   └── .auto-rule-scope    "All routines"   (--ink-2, 12px)
│   │   └── .auto-rule-toggle                        (toggle switch)
│   │
│   ├── .auto-rule-card
│   │   ├── .auto-rule-card__icon  🔔               (--peach-soft bg)
│   │   ├── .auto-rule-card__content
│   │   │   ├── .auto-rule-summary  "Resolve reminder if snoozed 3+ times"
│   │   │   └── .auto-rule-scope    "All reminders"
│   │   └── .auto-rule-toggle
│   │
│   └── .auto-rule-card.disabled                     (opacity: 0.5)
│       ├── .auto-rule-card__icon  🔔
│       ├── .auto-rule-card__content
│       │   ├── .auto-rule-summary  "Resolve reminder if overdue for 7+ days"
│       │   └── .auto-rule-scope    "Specific: Water bill reminder"
│       └── .auto-rule-toggle                        (off state)
│
└── .auto-fab  "+"                                   (floating action button)
```

#### Specs

```css
/* Rule card */
.auto-rule-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}
.auto-rule-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--lavender-mid);
}
.auto-rule-card.disabled {
  opacity: 0.5;
}
.auto-rule-card__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 16px;
  flex-shrink: 0;
}
.auto-rule-card__icon.routine { background: var(--sky-soft); }
.auto-rule-card__icon.reminder { background: var(--peach-soft); }

.auto-rule-card__content {
  flex: 1;
  min-width: 0;
}
.auto-rule-summary {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 2px;
}
.auto-rule-scope {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}

/* Toggle switch */
.auto-rule-toggle {
  position: relative;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}
.auto-rule-toggle__track {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: var(--ink-4);
  transition: background 200ms ease;
  cursor: pointer;
}
.auto-rule-toggle__track.on {
  background: var(--violet);
}
.auto-rule-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  box-shadow: var(--shadow-sm);
  transition: transform 200ms ease;
}
.auto-rule-toggle__track.on .auto-rule-toggle__thumb {
  transform: translateX(20px);
}

/* Rule list */
.auto-rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* History link */
.auto-header__history-link {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--violet);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
}
.auto-header__history-link:hover {
  text-decoration: underline;
}

/* Floating action button */
.auto-fab {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--violet);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 300;
  box-shadow: var(--shadow-violet);
  cursor: pointer;
  transition: all 150ms ease;
  z-index: 100;
}
.auto-fab:hover {
  background: var(--violet-2);
  transform: scale(1.05);
}
.auto-fab:active {
  transform: scale(0.95);
}
```

**Rule summary generation:** The summary text is generated from rule data. Pattern: `"{action verb} {entity type} if {trigger condition} for {threshold}+ {unit}"`.

| Trigger type | Action type | Summary example |
|---|---|---|
| `routine_overdue_days` | `skip_routine_occurrence` | "Skip routine if overdue for 3+ days" |
| `reminder_snooze_count` | `resolve_reminder` | "Resolve reminder if snoozed 3+ times" |
| `reminder_overdue_days` | `resolve_reminder` | "Resolve reminder if overdue for 7+ days" |
| `reminder_snooze_count` | `snooze_reminder` | "Snooze reminder if snoozed 3+ times" |

**Scope text:** "All routines", "All reminders", or "Specific: {entity name}".

**Icon mapping:**
- Routine triggers → 🔄 (or rotation arrows SVG) on `--sky-soft` background
- Reminder triggers → 🔔 (or bell SVG) on `--peach-soft` background

**Delete behavior:** Swipe left on a card reveals a delete button, or long-press shows a context action. See AUTO-DELETE-1.

**Animation:** Rule cards animate in with staggered `taskIn` animation (slide from left, 0.04s delay per item).

---

### 3.4 AUTO-LIST-3 — Limit Reached (20 Rules)

Identical to AUTO-LIST-2 except:

- The `.auto-fab` is **hidden**
- A limit banner appears at the top of the rule list:

```
.auto-limit-banner
├── "⚡ Maximum 20 rules reached. Delete a rule to add a new one."
```

```css
.auto-limit-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: var(--peach-soft);
  border-radius: 12px;
  margin-bottom: 12px;
}
.auto-limit-banner__text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--peach);
}
```

---

### 3.5 AUTO-CREATE-1 — Step 1: Select Trigger

#### Layout

```
.auto-create-screen
├── .rem-detail-back  "← Cancel"                      (--violet)
├── .auto-step-indicator                               (5 dots, first active)
├── .auto-step-title  "When should this rule fire?"    (Fraunces 22px 700)
├── .auto-step-sub  "Choose a trigger condition"       (--ink-2, 13px)
│
├── .auto-option-cards
│   ├── .auto-option-card
│   │   ├── .auto-option-card__icon  🔄              (--sky-soft bg)
│   │   ├── .auto-option-card__content
│   │   │   ├── .auto-option-card__title  "Routine overdue"
│   │   │   └── .auto-option-card__desc   "When a routine is overdue for a number of days"
│   │   └── .auto-option-card__check                 (hidden until selected)
│   │
│   ├── .auto-option-card
│   │   ├── .auto-option-card__icon  🔔              (--peach-soft bg)
│   │   ├── .auto-option-card__content
│   │   │   ├── .auto-option-card__title  "Reminder snoozed"
│   │   │   └── .auto-option-card__desc   "When a reminder has been snoozed a number of times"
│   │   └── .auto-option-card__check
│   │
│   └── .auto-option-card
│       ├── .auto-option-card__icon  🔔              (--peach-soft bg)
│       ├── .auto-option-card__content
│       │   ├── .auto-option-card__title  "Reminder overdue"
│       │   └── .auto-option-card__desc   "When a reminder is overdue for a number of days"
│       └── .auto-option-card__check
│
└── .auto-step-next  "Next"                           (disabled until selection made)
```

#### Specs

```css
.auto-create-screen {
  padding: 0 16px env(safe-area-inset-bottom, 0);
  min-height: 100vh;
  background: var(--bg);
}

/* Step indicator */
.auto-step-indicator {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}
.auto-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-4);
  transition: background 200ms ease;
}
.auto-step-dot.active {
  background: var(--violet);
}
.auto-step-dot.completed {
  background: var(--violet-2);
}

/* Step titles */
.auto-step-title {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
}
.auto-step-sub {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: var(--ink-2);
  margin-bottom: 24px;
}

/* Option cards */
.auto-option-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}
.auto-option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  border-radius: 16px;
  cursor: pointer;
  transition: all 150ms ease;
}
.auto-option-card:hover {
  border-color: var(--violet);
}
.auto-option-card.selected {
  border-color: var(--violet);
  background: var(--violet-dim);
}
.auto-option-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 18px;
  flex-shrink: 0;
}
.auto-option-card__content {
  flex: 1;
}
.auto-option-card__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.auto-option-card__desc {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}
.auto-option-card__check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms ease;
}
.auto-option-card.selected .auto-option-card__check {
  background: var(--violet);
  border-color: var(--violet);
  color: white;
  /* render ✓ inside */
}

/* Next / confirm buttons */
.auto-step-next {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: var(--violet);
  color: white;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-violet);
  transition: all 150ms ease;
}
.auto-step-next:hover:not(:disabled) {
  background: var(--violet-2);
}
.auto-step-next:active:not(:disabled) {
  transform: scale(0.98);
}
.auto-step-next:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
```

**Behavior:** Tapping an option card selects it (single-select, radio pattern). The "Next" button enables once a selection is made. Tapping "Next" advances to AUTO-CREATE-2.

**Back / cancel:** "← Cancel" returns to the rule list. No draft is saved.

---

### 3.6 AUTO-CREATE-2 — Step 2: Configure Threshold

#### Layout

```
.auto-create-screen
├── .rem-detail-back  "← Back"                        (--violet, goes to step 1)
├── .auto-step-indicator                               (5 dots, second active)
├── .auto-step-title  "How long before it fires?"      (Fraunces 22px 700)
├── .auto-step-sub  "Set the threshold"                (--ink-2, 13px)
│
├── .auto-threshold
│   ├── .auto-threshold__minus  "−"                   (44×44, --surface-2 bg, --violet text)
│   ├── .auto-threshold__value  "3"                   (28px 700, --ink)
│   └── .auto-threshold__plus   "+"                   (44×44, --surface-2 bg, --violet text)
│
├── .auto-threshold__unit  "days overdue"             (--ink-2, 13px, centered)
│
├── .auto-threshold__hint                             (--ink-3, 12px, centered)
│   "Recommended: 3 days for routines"
│
└── .auto-step-next  "Next"                           (always enabled — threshold has a default)
```

#### Specs

```css
.auto-threshold {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 32px 0;
}
.auto-threshold__minus,
.auto-threshold__plus {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface-2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 500;
  color: var(--violet);
  cursor: pointer;
  transition: all 150ms ease;
}
.auto-threshold__minus:hover,
.auto-threshold__plus:hover {
  background: var(--surface-3);
}
.auto-threshold__minus:active,
.auto-threshold__plus:active {
  transform: scale(0.95);
}
.auto-threshold__value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  width: 80px;
  text-align: center;
}
.auto-threshold__unit {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
  text-align: center;
  margin-bottom: 8px;
}
.auto-threshold__hint {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
}
```

**Threshold constraints:**
- Minimum: 1
- Maximum: 30 (days) or 10 (snooze count)
- Default: 3 (days for routine/reminder overdue), 3 (times for snooze count)
- Minus button disabled at minimum (opacity 0.4)
- Plus button disabled at maximum (opacity 0.4)

**Unit label adapts to trigger type:**
- `routine_overdue_days` → "days overdue"
- `reminder_snooze_count` → "times snoozed"
- `reminder_overdue_days` → "days overdue"

---

### 3.7 AUTO-CREATE-3 — Step 3: Select Action

#### Layout

```
.auto-create-screen
├── .rem-detail-back  "← Back"
├── .auto-step-indicator                               (5 dots, third active)
├── .auto-step-title  "What should Olivia do?"         (Fraunces 22px 700)
├── .auto-step-sub  "Choose the automatic action"      (--ink-2, 13px)
│
├── .auto-option-cards
│   ├── .auto-option-card
│   │   ├── .auto-option-card__icon  ⏭               (--sky-soft bg)
│   │   ├── .auto-option-card__content
│   │   │   ├── .auto-option-card__title  "Skip to next occurrence"
│   │   │   └── .auto-option-card__desc   "Advance the routine to its next scheduled date"
│   │   └── .auto-option-card__check
│   │
│   └── (additional actions shown based on trigger type)
│
└── .auto-step-next  "Next"
```

**Available actions by trigger type:**

| Trigger | Available actions |
|---|---|
| `routine_overdue_days` | Skip to next occurrence |
| `reminder_snooze_count` | Resolve reminder, Snooze reminder |
| `reminder_overdue_days` | Resolve reminder, Snooze reminder |

The option cards shown depend on the trigger selected in step 1. If only one action is valid (routine trigger), it is pre-selected and the user can proceed immediately — but the step is still shown for clarity.

---

### 3.8 AUTO-CREATE-4 — Step 4: Select Scope

#### Layout

```
.auto-create-screen
├── .rem-detail-back  "← Back"
├── .auto-step-indicator                               (5 dots, fourth active)
├── .auto-step-title  "Which items?"                   (Fraunces 22px 700)
├── .auto-step-sub  "Choose what this rule applies to" (--ink-2, 13px)
│
├── .auto-option-cards
│   ├── .auto-option-card.selected                     (pre-selected default)
│   │   ├── .auto-option-card__icon  ✦               (--lavender-soft bg)
│   │   ├── .auto-option-card__content
│   │   │   ├── .auto-option-card__title  "All routines"
│   │   │   └── .auto-option-card__desc   "Rule applies to every routine"
│   │   └── .auto-option-card__check  ✓
│   │
│   └── .auto-option-card
│       ├── .auto-option-card__icon  🎯              (--mint-soft bg)
│       ├── .auto-option-card__content
│       │   ├── .auto-option-card__title  "A specific routine"
│       │   └── .auto-option-card__desc   "Pick one routine for this rule"
│       └── .auto-option-card__check
│
├── (if "specific" selected, show entity picker list below)
│   .auto-entity-picker
│   ├── .auto-entity-option  "Morning routine"         (selectable row)
│   ├── .auto-entity-option  "Evening routine"
│   ├── .auto-entity-option  "Weekly meal prep"
│   └── ...
│
└── .auto-step-next  "Next"
```

```css
/* Entity picker (shown when "specific" scope selected) */
.auto-entity-picker {
  margin-top: 16px;
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  border-radius: 14px;
  overflow: hidden;
}
.auto-entity-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ink-4);
  cursor: pointer;
  transition: background 150ms ease;
}
.auto-entity-option:last-child {
  border-bottom: none;
}
.auto-entity-option:hover {
  background: var(--surface-2);
}
.auto-entity-option.selected {
  background: var(--violet-dim);
}
.auto-entity-option__name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}
.auto-entity-option__check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auto-entity-option.selected .auto-entity-option__check {
  background: var(--violet);
  border-color: var(--violet);
  color: white;
}
```

**Default:** "All" is pre-selected. The user can proceed without changing anything.

**Entity picker:** Only shown when "A specific routine/reminder" is selected. Lists all household routines or reminders (depending on trigger type). Single-select.

**Next disabled** when "specific" is selected but no entity has been chosen.

---

### 3.9 AUTO-CREATE-5 — Step 5: Confirm & Save

#### Layout

```
.auto-create-screen
├── .rem-detail-back  "← Back"
├── .auto-step-indicator                               (5 dots, fifth active)
├── .auto-step-title  "Review your rule"               (Fraunces 22px 700)
├── .auto-step-sub  "Here's what Olivia will do"       (--ink-2, 13px)
│
├── .auto-confirm-summary
│   ├── .auto-confirm-row
│   │   ├── LABEL  "WHEN"                             (--ink-3, 11px 700, ALL CAPS)
│   │   └── VALUE  "Routine overdue for 3+ days"      (--ink, 14px 500)
│   ├── .auto-confirm-row
│   │   ├── LABEL  "THEN"
│   │   └── VALUE  "Skip to next occurrence"
│   └── .auto-confirm-row
│       ├── LABEL  "APPLIES TO"
│       └── VALUE  "All routines"
│
├── .auto-scope-preview
│   │   "This rule would currently apply to 4 routines."
│
└── .auto-step-next  "Save Rule"                      (always enabled)
```

#### Specs

```css
.auto-confirm-summary {
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  border-radius: 18px;
  padding: 4px 0;
  margin-bottom: 20px;
}
.auto-confirm-row {
  padding: 14px 16px;
  border-bottom: 1px solid var(--ink-4);
}
.auto-confirm-row:last-child {
  border-bottom: none;
}
.auto-confirm-row__label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
}
.auto-confirm-row__value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

/* Scope preview */
.auto-scope-preview {
  padding: 14px;
  background: var(--lavender-soft);
  border-left: 3px solid var(--violet);
  border-radius: 14px;
  margin-bottom: 32px;
}
.auto-scope-preview__text {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 15px;
  font-weight: 300;
  color: var(--ink);
}
```

**Scope preview:** The italic Fraunces text uses Olivia's voice to communicate the rule's impact. The count is computed live from current household data. Examples:
- "This rule would currently apply to 4 routines."
- "This rule would currently apply to 1 reminder."
- "This rule applies to: Morning routine."

**Save behavior:** Tapping "Save Rule" creates the rule via API, navigates back to the rule list, and the new rule card animates in with `popIn` animation.

---

### 3.10 AUTO-DELETE-1 — Delete Confirmation

When the user swipes left on a rule card or long-presses, a delete confirmation overlay appears:

#### Layout

```
.auto-delete-confirm  (centered overlay with backdrop)
├── .auto-delete-confirm__card
│   ├── .auto-delete-confirm__title  "Delete this rule?"  (Fraunces 19px 700)
│   ├── .auto-delete-confirm__desc                         (--ink-2, 13px)
│   │   "Skip routine if overdue for 3+ days · All routines"
│   ├── .auto-delete-confirm__actions
│   │   ├── .auto-delete-confirm__cancel  "Keep Rule"     (--surface-2 bg, --ink text)
│   │   └── .auto-delete-confirm__delete  "Delete"        (--rose bg, white text)
```

#### Specs

```css
.auto-delete-confirm {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}
.auto-delete-confirm__card {
  background: var(--surface);
  border-radius: 24px;
  padding: 24px;
  max-width: 320px;
  width: 100%;
  box-shadow: var(--shadow-lg);
  animation: popIn 200ms ease forwards;
}
.auto-delete-confirm__title {
  font-family: 'Fraunces', serif;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
}
.auto-delete-confirm__desc {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: var(--ink-2);
  margin-bottom: 20px;
  line-height: 1.4;
}
.auto-delete-confirm__actions {
  display: flex;
  gap: 12px;
}
.auto-delete-confirm__cancel {
  flex: 1;
  height: 44px;
  background: var(--surface-2);
  border: none;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}
.auto-delete-confirm__delete {
  flex: 1;
  height: 44px;
  background: var(--rose);
  border: none;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}
.auto-delete-confirm__cancel:active,
.auto-delete-confirm__delete:active {
  transform: scale(0.98);
}
```

**Behavior:** "Keep Rule" dismisses the overlay. "Delete" removes the rule and the card animates out with a fade + collapse (200ms).

---

### 3.11 AUTO-HISTORY-1 — Empty History

```
.auto-history-screen
├── .rem-detail-back  "← Automation Rules"
├── .auto-header__title  "History"                     (Fraunces 28px 700)
├── .auto-header__sub  "Actions Olivia took on your behalf"  (--ink-2, 13px)
│
├── .auto-empty
│   ├── .auto-empty__heading  "No automated actions yet."
│   └── .auto-empty__body  "When your rules fire, you'll see a log of what Olivia did here."
```

---

### 3.12 AUTO-HISTORY-2 — Populated History

```
.auto-history-screen
├── .rem-detail-back  "← Automation Rules"
├── .auto-header__title  "History"
├── .auto-header__sub  "Actions Olivia took on your behalf"
│
├── .auto-history-list
│   ├── .auto-history-group
│   │   ├── .auto-history-group__date  "Today"        (--ink-3, 11px 700, ALL CAPS)
│   │   │
│   │   ├── .auto-history-entry
│   │   │   ├── .auto-history-entry__icon  ⏭         (--sky-soft bg)
│   │   │   ├── .auto-history-entry__content
│   │   │   │   ├── .auto-history-entry__action  "Skipped Morning routine"  (--ink, 13px 600)
│   │   │   │   └── .auto-history-entry__rule                              (--ink-2, 12px)
│   │   │   │       "Rule: Skip if overdue 3+ days"
│   │   │   └── .auto-history-entry__time  "2:30 PM"  (--ink-3, 11px)
│   │   │
│   │   └── .auto-history-entry
│   │       ├── ...
│   │
│   └── .auto-history-group
│       ├── .auto-history-group__date  "Yesterday"
│       └── ...
│
└── .auto-history-retention  "Entries are kept for 30 days"  (--ink-3, 11px, centered)
```

#### Specs

```css
.auto-history-screen {
  padding: 0 16px env(safe-area-inset-bottom, 0);
  min-height: 100vh;
  background: var(--bg);
}
.auto-history-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.auto-history-group__date {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 8px;
}
.auto-history-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: 14px;
  margin-bottom: 8px;
}
.auto-history-entry__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  flex-shrink: 0;
}
.auto-history-entry__content {
  flex: 1;
}
.auto-history-entry__action {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 2px;
}
.auto-history-entry__rule {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}
.auto-history-entry__time {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-3);
  flex-shrink: 0;
}
.auto-history-retention {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  color: var(--ink-3);
  text-align: center;
  padding: 24px 0;
}
```

**History grouping:** Entries are grouped by day. Group labels: "Today", "Yesterday", or the date (e.g., "Mar 23").

**Icon mapping:** Same as rule cards — routine actions get `--sky-soft` bg, reminder actions get `--peach-soft` bg.

---

## 4. Interaction Rules

| Interaction | Behavior |
|---|---|
| Tap "Automation Rules" in Settings | Navigate to `/settings/automation` |
| Tap "← Settings" | Navigate back to `/settings` |
| Tap "History →" link | Navigate to `/settings/automation/history` |
| Tap FAB "+" | Enter rule creation flow (step 1) |
| Tap "← Cancel" during creation | Return to rule list, discard draft |
| Tap "← Back" during creation | Go to previous step (draft preserved) |
| Tap option card in creation flow | Select that option (single-select radio) |
| Tap "−" / "+" on threshold | Decrement / increment threshold value |
| Tap "Next" | Advance to next creation step |
| Tap "Save Rule" | Create rule, return to list, new card animates in |
| Tap toggle on rule card | Enable/disable rule instantly (no confirmation) |
| Swipe left on rule card | Reveal delete button |
| Tap delete button | Show confirmation overlay (AUTO-DELETE-1) |
| Tap "Delete" in confirmation | Remove rule, card animates out |
| Tap "Keep Rule" in confirmation | Dismiss overlay |

---

## 5. Dark Mode Notes

All tokens used in this spec resolve automatically in dark mode via the existing `[data-theme='dark']` CSS custom properties. No manual overrides needed.

Key dark mode behaviors:
- Screen background: `--bg` → `#12101C`
- Card surfaces: `--surface` → `#1C1A2E`
- Card borders: `--ink-4` resolves to subtle light lines on dark
- Toggle track (off): `--ink-4` → soft translucent ring; (on): `--violet` → unchanged
- Toggle thumb: white in both modes — provides clear contrast
- Option card selected state: `--violet-dim` → `rgba(108,92,231,0.18)`, a visible violet tint on dark surface
- Scope preview: `--lavender-soft` → `#2A2545`, deep indigo block with violet left border
- FAB shadow: `--shadow-violet` → stronger glow in dark (`0.45` vs `0.3`)
- Delete overlay backdrop: `rgba(0,0,0,0.4)` works in both modes
- Stepper buttons: `--surface-2` → `#242038`, clearly distinguished from background
- History entry icon backgrounds use `--sky-soft` and `--peach-soft` which resolve to dark-tinted variants

---

## 6. Accessibility

| Requirement | Implementation |
|---|---|
| Touch targets | All interactive elements ≥ 44px × 44px tap area (toggle: 48×28 track, FAB: 56×56, stepper buttons: 44×44) |
| Toggle semantics | `role="switch"`, `aria-checked="true/false"`, `aria-label="Enable rule: {summary}"` |
| Option cards | `role="radiogroup"` on container, `role="radio"` + `aria-checked` on each card |
| Step indicator | `aria-label="Step N of 5"` on the indicator container |
| Threshold stepper | `aria-label="Threshold: N days"`, minus/plus buttons have `aria-label="Decrease"` / `aria-label="Increase"` |
| Scope preview | `aria-live="polite"` so screen readers announce the impact count |
| Delete confirmation | Focus trapped within overlay. `role="alertdialog"`, `aria-labelledby` on title |
| Keyboard navigation | Tab order follows visual order. Enter/Space to select. Escape to dismiss overlay |
| Color contrast | All text meets WCAG AA (4.5:1 body, 3:1 large). Verified via token values |
| Reduced motion | `prefers-reduced-motion` disables card stagger, `popIn` animation, and toggle transition |

---

## 7. Edge Cases

| Case | Behavior |
|---|---|
| No routines/reminders exist in household | Scope step shows "All routines" only — "Specific" option is hidden if no entities to pick from |
| Rule creation interrupted (app backgrounded) | Form state is discarded — no draft saving in Phase 1 |
| 20-rule limit reached during creation | If another user adds rule #20 while you're in the creation flow, show error toast: "Maximum 20 rules reached" and return to list |
| Duplicate rule (same trigger + action + scope) | Allow it — the product spec does not prohibit duplicates. The scheduler handles dedup via the automation log |
| Delete last rule | List returns to empty state (AUTO-LIST-1) with empty state message |
| Toggle while offline | Optimistic toggle — revert with error toast if API fails: "Couldn't update rule — check your connection" |
| Very long entity name in scope | Truncate with ellipsis at one line. Full name visible in confirm step |
| History with many entries | Virtual scroll / pagination after 50 entries. Show "Load more" button |
| User navigates directly to `/settings/automation` | Back button "← Settings" always returns to `/settings` regardless of navigation history |

---

## 8. Implementation Checklist

- [ ] Add `.auto-row` to Settings page (after "Send Feedback" row)
- [ ] Create `/settings/automation` route with rule list screen
- [ ] Implement empty state with CTA button
- [ ] Implement populated rule list with toggle switches
- [ ] Implement limit banner when 20 rules reached
- [ ] Create `/settings/automation/create` route with 5-step creation flow
- [ ] Implement step indicator with active/completed dot states
- [ ] Implement trigger selection cards (step 1)
- [ ] Implement threshold stepper with min/max constraints (step 2)
- [ ] Implement action selection cards filtered by trigger type (step 3)
- [ ] Implement scope selection with entity picker (step 4)
- [ ] Implement confirm step with scope preview count (step 5)
- [ ] Implement delete confirmation overlay
- [ ] Create `/settings/automation/history` route with grouped log entries
- [ ] Implement history empty state
- [ ] Wire toggle switch to enable/disable API call
- [ ] Wire "Save Rule" to creation API
- [ ] Wire "Delete" to deletion API
- [ ] Add stagger animation on rule card list entrance
- [ ] Add `popIn` animation for new rule card after creation
- [ ] Verify all CSS renders correctly in both light and dark modes
- [ ] Verify all interactive elements meet 44px minimum touch target
- [ ] Verify WCAG AA color contrast on all text elements
- [ ] Verify `prefers-reduced-motion` disables all animations
- [ ] Verify `role`, `aria-*` attributes on toggle, radio groups, and overlay
