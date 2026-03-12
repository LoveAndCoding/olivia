# Olivia Design System — Components

> Reference for all reusable UI components in Olivia. Each entry covers anatomy, variants, states, and implementation notes. Dark mode behavior is noted where a component requires specific attention beyond token inheritance.

---

## Dark Mode & Components — General Rule

The majority of components theme automatically because they reference CSS variables. However, **several components hardcode hex values** in gradients, box-shadows, or border properties, and those require explicit dark mode overrides. These exceptions are called out in each component section below.

---

## Cards

Cards are the primary content container throughout the app.

### Task Card (Standard)

**Anatomy:**
- Left color accent stripe (3px, semantic color)
- Circular checkbox (22px, hollow → filled on completion)
- Task name (14px, semibold)
- Metadata row (11–12px, ink-3)
- Optional badge (right-aligned)

**Variants:**
- `rose` — overdue, urgent tasks
- `peach` — due soon
- `mint` — shared tasks
- Default — no stripe

**States:**
- Rest: `border: 1.5px solid var(--ink-4)`, `box-shadow: var(--shadow-sm)`
- Hover: `transform: translateX(3px)`, `box-shadow: var(--shadow-md)`, `border-color: var(--lavender-mid)`
- Active/press: `transform: scale(0.98)`

```css
.task {
  background: var(--surface);   /* white in light, #1C1A2E in dark */
  border-radius: 18px;
  padding: 15px 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--ink-4);
  cursor: pointer;
  transition: all 0.2s ease;
}
.task.rose  { border-left: 3px solid var(--rose); }
.task.peach { border-left: 3px solid var(--peach); }
.task.mint  { border-left: 3px solid var(--mint); }
```

**Dark mode note:** No explicit override needed — `var(--surface)`, `var(--shadow-sm)`, and `var(--ink-4)` all resolve correctly. The accent stripes (`--rose`, `--peach`, `--mint`) are unchanged between modes.

### Task Card (Full — Tasks screen)

Expanded version with assignee chip.

**Additions over standard:**
- Two-row layout with `padding-left: 34px` alignment
- Assignee chip: `background: var(--lavender-soft)`, `color: var(--violet)` — both resolve correctly in dark

### Memory Card

**Anatomy:**
- Icon container (36×36px, 12px radius, tinted background)
- Title (13px, semibold)
- Detail text (12px, ink-2)
- Age timestamp (10px, ink-3)

**Icon container backgrounds by category** — use soft tokens so dark mode resolves automatically:
- Decisions: `background: var(--lavender-soft)`
- Maintenance: `background: var(--peach-soft)`
- Contacts: `background: var(--lavender-soft)`
- Notes: `background: var(--mint-soft)`

**Dark mode note:** No override needed if soft tokens are used correctly. Do not hardcode `#EDE9FF` — use `var(--lavender-soft)`.

### Event Tile

**Anatomy:**
- Date pill: Fraunces number + month abbreviation on `var(--lavender-soft)` background
- Event name (12px, semibold)
- Time string (11px, ink-3)
- Fixed width: **128px**

**Dark mode note:** Fully automatic via tokens. The `--lavender-soft` date pill background shifts from `#EDE9FF` to `#2A2545` in dark mode — a deep indigo that still distinguishes the pill clearly.

---

## Badges

Short status labels. Always pill-shaped, never more than 2 words.

| Variant | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| `badge-rose` | `#FFE8F2` | `#D4527A` | `#3A1828` | `#FF7EB3` |
| `badge-peach` | `#FFF3E0` | `#B8610A` | `#2E1E08` | `#FFB347` |
| `badge-violet` | `#EDE9FF` | `#6C5CE7` | `#2A2545` | `#9D93F7` |
| `badge-mint` | `#E0FFF9` | `#007A68` | `#0A2820` | `#00C9A7` |

**Implementation:** Use the soft/full token pairs rather than hardcoding:

```css
.badge-rose   { background: var(--rose-soft);     color: var(--rose); }
.badge-peach  { background: var(--peach-soft);    color: var(--peach); }
.badge-violet { background: var(--lavender-soft); color: var(--violet-2); }
.badge-mint   { background: var(--mint-soft);     color: var(--mint); }
```

This resolves correctly in both modes automatically.

**Dark mode note:** In light mode, badge text uses a darkened variant of the accent (e.g., `#D4527A` rather than `#FF7EB3`) for legibility on white. In dark mode, using the full accent value (`var(--rose)`) is correct — it reads well on the dark soft background. No separate dark override needed if using the token approach above.

---

## The Olivia Nudge Card

The nudge card gradient is hardcoded and does **not** change between modes — violet on violet reads equally well on both light and dark backgrounds.

**Anatomy:**
- Gradient: `linear-gradient(135deg, #6C5CE7 0%, #8B7FF5 50%, #a78bfa 100%)` — same in both modes
- Decorative circles: semi-transparent white — same in both modes
- Eyebrow: pulsing yellow dot + "Olivia noticed"
- Message: Fraunces italic, 17px, white
- Action buttons: primary (white bg, violet text) + secondary (translucent white)

**Dark mode note:** The card itself is unchanged. However, its `box-shadow` should reference `--shadow-violet` rather than a hardcoded value, so it gets the stronger glow in dark mode:

```css
.nudge {
  box-shadow: var(--shadow-violet); /* 0 8px 28px rgba(108,92,231,0.45) in dark */
}
```

**Rules:**
- One active nudge at a time. Hide card if no nudge.
- Nudge copy uses Olivia's voice: first-person, specific, actionable.
- Primary button copy is always a verb. Never "OK" or "Confirm".
- The full card is tappable.

---

## Checkboxes

**States:**
- Empty: `border: 2px solid var(--ink-4)`, transparent fill
- Hover: `border-color: var(--violet)`, `background: var(--violet-dim)`
- Checked: `background: var(--violet)`, white `✓` (11px, bold)

Accent-matched hover for colored task cards:
```css
.task.rose  .task-checkbox:hover { border-color: var(--rose);  background: var(--rose-dim); }
.task.peach .task-checkbox:hover { border-color: var(--peach); background: var(--peach-dim); }
```

**Dark mode note:** Fully automatic via tokens. The `--ink-4` border reads as a soft light ring in dark mode, which is correct. The `--violet` fill is unchanged.

---

## Buttons

### Primary Button

```css
.btn-primary {
  background: var(--violet);
  color: white;
  border-radius: 12px;
  padding: 9px 16px;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 3px 10px var(--violet-dim);
  border: none;
}
.btn-primary:hover { background: #5B4DD6; } /* same in both modes */
```

**Dark mode note:** Automatic. Violet is unchanged. The hover darkening to `#5B4DD6` reads correctly against both light and dark backgrounds.

### Secondary / Ghost Button

```css
.btn-secondary {
  background: var(--lavender-soft);
  color: var(--violet);
  border-radius: 12px;
  border: none;
}
.btn-secondary:hover { background: var(--lavender-mid); }
```

**Dark mode note:** Automatic. `--lavender-soft` shifts to the dark indigo variant, and `--violet` stays consistent.

### Nudge Action Buttons (special case)

On the violet gradient nudge card. These are hardcoded white/transparent — no change needed in dark mode since the card itself doesn't change.

```css
.nudge-btn-primary   { background: white; color: var(--violet); }
.nudge-btn-secondary { background: rgba(255,255,255,0.18); color: white; }
```

---

## Navigation

### Bottom Navigation Bar

```css
.bottom-nav {
  height: 66px;
  background: var(--surface);        /* white → #1C1A2E */
  border-top: 1.5px solid var(--ink-4);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05); /* ← see dark note */
}
```

**Active state:**
```css
.nav-btn.active {
  background: var(--lavender-soft);  /* #EDE9FF → #2A2545 */
}
.nav-btn.active .nav-label { color: var(--violet); }
```

**Dark mode note:** The nav shadow (`0 -4px 20px rgba(0,0,0,0.05)`) is too faint in dark mode. Increase opacity:

```css
[data-theme="dark"] .bottom-nav,
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .bottom-nav } {
  box-shadow: 0 -4px 20px rgba(0,0,0,0.25);
}
```

---

## Input Components

### Chat Input Bar

```css
.chat-input-bar {
  background: var(--surface);
  border: 2px solid var(--lavender-mid);
  border-radius: 20px;
}
.chat-input-bar:focus-within {
  border-color: var(--violet);
  box-shadow: 0 0 0 4px var(--violet-glow); /* stronger in dark mode automatically */
}
.chat-textarea {
  color: var(--ink);
  background: transparent;
}
.chat-textarea::placeholder { color: var(--ink-3); font-style: italic; }
```

**Dark mode note:** Fully automatic. `--surface`, `--lavender-mid`, `--violet-glow`, and `--ink` all resolve to dark-appropriate values. Do not hardcode `background: white` on the input bar.

### Search Bar (Memory screen)

Same tokens as chat input bar. Automatic.

### Add Task Entry

```css
.add-task-btn {
  background: var(--surface);
  border: 2px dashed var(--lavender-mid);
  border-radius: 18px;
}
.add-task-btn:hover {
  border-color: var(--violet);
  background: var(--lavender-soft);
}
```

**Dark mode note:** Automatic. The dashed border shifts from mid-lavender to the dark indigo variant, still clearly visible.

---

## Filter Tabs

```css
.ftab {
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  color: var(--ink-2);
}
.ftab:hover {
  border-color: var(--violet);
  color: var(--violet);
}
.ftab.active {
  background: var(--violet);
  color: white;
  border-color: var(--violet);
  box-shadow: 0 3px 10px var(--violet-dim);
}
```

**Dark mode note:** Fully automatic. `--surface` gives cards the correct dark background. Active state violet is unchanged.

---

## Avatars

Avatar gradients are hardcoded (they're brand colors for specific people, not semantic UI tokens) and do not change between modes.

```css
.av-j { background: linear-gradient(135deg, #6C5CE7, #8B7FF5); color: white; }
.av-a { background: linear-gradient(135deg, #FF7EB3, #FF9EC6); color: white; }
```

**Border cutout:** The avatar border cuts out against the background:
```css
.av { border: 2.5px solid var(--bg); } /* #FAF8FF in light, #12101C in dark */
```

This is automatic because it references `--bg`. No override needed.

---

## The Olivia Orb

The orb gradient is hardcoded and unchanged between modes — it's Olivia's identity mark.

```css
.olivia-orb {
  background: linear-gradient(135deg, #6C5CE7, #a78bfa, #FF7EB3);
  box-shadow: var(--shadow-violet); /* stronger in dark mode automatically */
  animation: orbPulse 3s ease infinite;
}
@keyframes orbPulse {
  0%,100% { box-shadow: var(--shadow-violet); }
  50% {
    box-shadow: 0 4px 22px rgba(108,92,231,0.55),
                0 0 0 6px var(--violet-dim); /* wider ring in dark */
  }
}
```

**Dark mode note:** The `--shadow-violet` token is stronger in dark mode (`0.45` opacity vs `0.30`), making the orb glow noticeably more prominent — which is correct and desirable.

---

## Chat Bubbles

### User Message
```css
.msg-user .msg-bubble {
  background: linear-gradient(135deg, var(--violet), var(--violet-2));
  color: white;
  border-radius: 20px 4px 20px 20px;
}
```
**Dark mode note:** Automatic. `--violet-2` shifts to `#9D93F7` in dark, making the gradient slightly brighter — correct.

### Olivia Message
```css
.msg-olivia .msg-bubble {
  background: var(--surface);
  color: var(--ink);
  border: 1.5px solid var(--ink-4);
  border-radius: 4px 20px 20px 20px;
}
```
**Dark mode note:** Fully automatic. The surface background shifts to `#1C1A2E`, slightly elevated from the `#12101C` app background, which creates natural distinction between the bubble and the chat background.

### Action Card (within Olivia message)

```css
.olivia-action-card {
  background: var(--surface);
  border: 1.5px solid var(--lavender-mid);
  border-radius: 16px;
}
.oa-preview {
  background: var(--lavender-soft);
  border-left: 3px solid var(--violet);
  font-family: 'Fraunces', serif;
  font-style: italic;
  color: var(--ink);
}
```

**Dark mode note:** Automatic. The preview box uses `--lavender-soft` which shifts to `#2A2545` in dark — a distinct deep indigo block inside the card.

---

## Dividers

```css
.divider {
  height: 1px;
  background: var(--ink-4); /* rgba(26,16,51,0.15) → rgba(237,233,255,0.1) */
  margin: 0 22px 20px;
}
```

**Dark mode note:** Fully automatic. `--ink-4` in dark mode is a subtle light-on-dark line.
