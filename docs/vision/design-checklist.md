# Olivia Design System — Agent Implementation Checklist

> This document is specifically for AI agents and developers building Olivia features. Before shipping any UI work, run through the relevant sections of this checklist to verify design compliance. Dark mode checks are integrated throughout and flagged with 🌙.

---

## How to Use This Document

When implementing a new screen, component, or feature:

1. Identify which checklist sections apply to your work
2. Go through each item and verify compliance
3. If an item fails, refer back to the linked design document for the correct specification
4. Do not consider a UI implementation complete until all applicable items pass — **in both light and dark mode**

---

## Universal Checks (Every Screen, Every Component)

### Typography
- [ ] Body and UI text uses **Plus Jakarta Sans** — not Inter, Roboto, system-ui, or any other sans-serif
- [ ] Headings, section titles, and screen titles use **Fraunces**
- [ ] All Olivia-authored text (nudges, chat bubbles, draft previews) uses **Fraunces italic**
- [ ] No font is used that isn't one of these two families
- [ ] All-caps labels have `letter-spacing: 1.2px` minimum and `font-size ≤ 11px`

### Colors — Light Mode
- [ ] App background is `#FAF8FF` (`--bg`) — not pure white or generic gray
- [ ] Card backgrounds use `var(--surface)` — resolves to `#FFFFFF`
- [ ] Primary text uses `--ink` (`#1A1033`) — not pure black
- [ ] Secondary text uses `--ink-2` — not a generic gray
- [ ] Accent soft backgrounds use token values (`--rose-soft`, `--peach-soft`, etc.) — not hardcoded pastels
- [ ] No purple gradient on white background (the most generic AI aesthetic — never do this)

### Colors — Dark Mode 🌙
- [ ] App background resolves to `#12101C` in dark — a warm indigo-black, not neutral grey
- [ ] Card backgrounds resolve to `#1C1A2E` (`--surface`) in dark — elevated from the bg
- [ ] Primary text resolves to `#EDE9FF` (`--ink`) in dark — warm near-white, not pure `#FFFFFF`
- [ ] All color references use CSS variables — zero hardcoded hex values in component CSS
- [ ] Accent soft backgrounds use dark variants in dark mode (`--rose-soft: #3A1828`, etc.)
- [ ] No `background: white` anywhere in component CSS — always `var(--surface)` or `var(--bg)`
- [ ] Violet (`#6C5CE7`) is unchanged between modes
- [ ] Accent full values (`--rose`, `--peach`, `--mint`) are unchanged between modes

### Theming Infrastructure
- [ ] `[data-theme="dark"]` attribute is the mechanism for forced dark mode
- [ ] `@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])` handles OS auto mode
- [ ] Theme preference is read from `localStorage` on init, before first paint (inline `<script>` in `<head>`)
- [ ] `setTheme()` function supports `'light'`, `'dark'`, and `'auto'` values

### Borders & Radius
- [ ] Standard cards use `border-radius: 18px`
- [ ] Large feature cards use `border-radius: 24px`
- [ ] All borders at rest use `var(--ink-4)` — resolves correctly in both modes
- [ ] No hard/sharp corners on interactive elements (minimum 10px radius)

### Shadows
- [ ] Cards at rest use `var(--shadow-sm)` — not hardcoded `rgba(0,0,0,...)` values
- [ ] 🌙 `--shadow-sm` resolves to `0 2px 8px rgba(0,0,0,0.3)` in dark mode (more opaque)
- [ ] Violet glow uses `var(--shadow-violet)` — not hardcoded
- [ ] 🌙 `--shadow-violet` resolves to `0 8px 28px rgba(108,92,231,0.45)` in dark (stronger)

### Spacing
- [ ] Horizontal page padding for text/headers is `22px`
- [ ] Card container padding is `16px`
- [ ] Card inner padding is `14–18px` vertical and horizontal

### Accessibility
- [ ] All tappable elements are at minimum `44×44px`
- [ ] Color is never the sole differentiator — text labels accompany color-coded elements
- [ ] Focus states are visible in both modes — uses `var(--violet-glow)` which strengthens in dark
- [ ] `prefers-reduced-motion` disables persistent animations and stagger effects
- [ ] 🌙 Contrast ratios verified in dark mode — `--ink` on `--surface`, accent text on dark soft backgrounds

---

## Bottom Navigation Checks

- [ ] All four tabs present: Home (🏡), Tasks (✅), Olivia (✦), Memory (🗂️)
- [ ] Olivia tab uses `✦` symbol, not an emoji face
- [ ] Active tab shows: `--lavender-soft` pill background, `--violet` label, scaled-up icon
- [ ] Nav background uses `var(--surface)` — not hardcoded white
- [ ] Nav `border-top` uses `var(--ink-4)` — resolves correctly in both modes
- [ ] 🌙 Nav shadow increased in dark: `box-shadow: 0 -4px 20px rgba(0,0,0,0.25)` (not 0.05)
- [ ] Active state is synced whenever the screen changes
- [ ] Tab labels are always visible

---

## Animation Checks

- [ ] List items use `taskIn` animation (slide from left) with staggered delays
- [ ] Stagger interval is `0.04–0.05s` per item
- [ ] Animated elements start with `opacity: 0` in CSS
- [ ] Screen transitions use `screenIn` animation
- [ ] All transitions use `cubic-bezier(0.22, 1, 0.36, 1)` easing
- [ ] No animation exceeds `500ms`
- [ ] `prefers-reduced-motion` disables all stagger animations and persistent pulses
- [ ] 🌙 Animation values are mode-agnostic — no animation values change between light and dark

---

## Card Checks

### Task Card (Standard)
- [ ] Uses `background: var(--surface)` — not `background: white`
- [ ] Has accent stripe on left edge if urgency applies
- [ ] Checkbox hover uses `var(--violet-dim)` — resolves correctly in dark
- [ ] Hover: `translateX(3px)` + shadow upgrade + `border-color: var(--lavender-mid)`
- [ ] Active/press: `scale(0.98)`
- [ ] Checkbox click does not propagate to card navigation

### Memory Card
- [ ] Icon container uses `var(--*-soft)` tokens — not hardcoded pastel hex values
- [ ] 🌙 Icon container backgrounds are dark-tinted in dark mode via token resolution
- [ ] Age indicator present, uses `--ink-3`

### Event Tile
- [ ] Fixed width `128px`
- [ ] Date pill background uses `var(--lavender-soft)`
- [ ] Date number uses Fraunces

---

## Olivia Nudge Card Checks

- [ ] Gradient: `linear-gradient(135deg, #6C5CE7 0%, #8B7FF5 50%, #a78bfa 100%)` — same in both modes
- [ ] Box shadow uses `var(--shadow-violet)` — not hardcoded
- [ ] 🌙 Shadow is stronger in dark mode (automatic via token)
- [ ] Three decorative circles present
- [ ] Pulsing yellow dot present (`#FFE066`, unchanged in dark)
- [ ] Message text is Fraunces italic, 17px, white
- [ ] Primary button copy is a specific verb
- [ ] Full card is tappable
- [ ] Card absent if no active nudge

---

## Chat / Olivia Screen Checks

- [ ] Olivia orb with `orbPulse` animation running
- [ ] Orb uses `var(--shadow-violet)` in its `box-shadow` — not hardcoded values
- [ ] 🌙 Orb glow is noticeably stronger in dark mode (desired)
- [ ] User messages: right-aligned, violet gradient, `border-radius: 20px 4px 20px 20px`
- [ ] Olivia messages: `background: var(--surface)`, `border: 1.5px solid var(--ink-4)`
- [ ] 🌙 Olivia message bubbles are elevated from chat background in dark (`#1C1A2E` on `#12101C`)
- [ ] Action card preview uses `background: var(--lavender-soft)` — not hardcoded `#EDE9FF`
- [ ] All Olivia message text is Fraunces italic
- [ ] Olivia reply has ~900ms delay
- [ ] Chat auto-scrolls to bottom
- [ ] Quick chips prefill input, do NOT auto-submit
- [ ] Input bar uses `var(--surface)` background and `var(--lavender-mid)` border
- [ ] 🌙 Input focus ring uses `var(--violet-glow)` — stronger in dark (automatic)
- [ ] `Enter` sends, `Shift+Enter` adds line

---

## Forms & Input Checks

- [ ] All inputs use `background: var(--surface)` — not hardcoded white
- [ ] All inputs use `border: 2px solid var(--lavender-mid)`
- [ ] Focus: `border-color: var(--violet)`, `box-shadow: 0 0 0 4px var(--violet-glow)`
- [ ] Placeholder text uses `--ink-3` and italic style
- [ ] Send buttons use violet background (unchanged in dark)

---

## Common Failure Patterns to Avoid

| Pattern | Why it's wrong | Fix |
|---|---|---|
| `font-family: Inter` or system fonts | Off-brand, generic | Use Fraunces + Plus Jakarta Sans |
| `background: white` on cards or inputs | Breaks dark mode | Use `var(--surface)` |
| `background: #FAF8FF` on app root | Hardcoded, breaks dark | Use `var(--bg)` |
| `color: black` or `color: #000` | Wrong ink, breaks dark | Use `var(--ink)` |
| `color: #1A1033` hardcoded | Breaks dark mode | Use `var(--ink)` |
| `background: #FFE8F2` hardcoded | Pastel vanishes on dark surface | Use `var(--rose-soft)` |
| `box-shadow: rgba(0,0,0,0.1)` | Generic shadow, wrong in light | Use `var(--shadow-sm)` |
| `box-shadow: rgba(26,16,51,0.06)` hardcoded | Invisible in dark mode | Use `var(--shadow-sm)` |
| Dark mode bg as `#1A1A1A` or `#222` | Cold grey, off-brand | Use `#12101C` (`--bg`) |
| Dark mode text as `#FFFFFF` | Pure white, harsh | Use `#EDE9FF` (`--ink`) |
| Two separate component stylesheets for modes | Unmaintainable | One stylesheet + CSS variables only |
| Olivia text in Plus Jakarta Sans | Loses Olivia's voice in any mode | Use Fraunces italic |
| Instant AI response (0ms delay) | Robotic | Add ~900ms delay |
| `outline: none` without custom ring | Accessibility failure in both modes | Use `var(--violet-glow)` ring |
| Cards with `border-radius: 8px` or less | Too sharp | Minimum 16px |
| More than 3 ambient background blobs | Noise | Maximum 3 per screen |
| Empty nudge card | Hollow feeling | Hide entirely if no active nudge |

---

## Quick Reference: Design Token Cheatsheet

Paste into any new file. All components built with these variables are automatically theme-aware.

```css
/* ── LIGHT MODE (baseline) ──────────────────── */
:root {
  --bg: #FAF8FF;
  --surface: #FFFFFF;
  --surface-2: #F3F0FF;
  --surface-3: #EDE9FF;

  --violet: #6C5CE7;
  --violet-2: #8B7FF5;
  --violet-dim: rgba(108,92,231,0.1);
  --violet-glow: rgba(108,92,231,0.18);
  --lavender-soft: #EDE9FF;
  --lavender-mid: #D4CCFF;

  --rose: #FF7EB3;       --rose-soft: #FFE8F2;   --rose-dim: rgba(255,126,179,0.12);
  --peach: #FFB347;      --peach-soft: #FFF3E0;  --peach-dim: rgba(255,179,71,0.12);
  --mint: #00C9A7;       --mint-soft: #E0FFF9;   --mint-dim: rgba(0,201,167,0.1);
  --sky: #48CAE4;        --sky-soft: #E0F7FC;    --sky-dim: rgba(72,202,228,0.1);

  --ink: #1A1033;
  --ink-2: rgba(26,16,51,0.55);
  --ink-3: rgba(26,16,51,0.3);
  --ink-4: rgba(26,16,51,0.15);

  --shadow-sm:     0 2px 8px rgba(26,16,51,0.06);
  --shadow-md:     0 4px 20px rgba(26,16,51,0.08);
  --shadow-lg:     0 8px 32px rgba(26,16,51,0.10);
  --shadow-violet: 0 8px 28px rgba(108,92,231,0.3);
}

/* ── DARK MODE ──────────────────────────────── */
[data-theme="dark"] {
  --bg: #12101C;
  --surface: #1C1A2E;
  --surface-2: #242038;
  --surface-3: #2E2848;

  --violet: #6C5CE7;     /* unchanged */
  --violet-2: #9D93F7;
  --violet-dim: rgba(108,92,231,0.18);
  --violet-glow: rgba(108,92,231,0.3);
  --lavender-soft: #2A2545;
  --lavender-mid: #3D3660;

  --rose: #FF7EB3;       --rose-soft: #3A1828;   --rose-dim: rgba(255,126,179,0.15);
  --peach: #FFB347;      --peach-soft: #2E1E08;  --peach-dim: rgba(255,179,71,0.15);
  --mint: #00C9A7;       --mint-soft: #0A2820;   --mint-dim: rgba(0,201,167,0.15);
  --sky: #48CAE4;        --sky-soft: #0A2228;    --sky-dim: rgba(72,202,228,0.15);

  --ink: #EDE9FF;
  --ink-2: rgba(237,233,255,0.6);
  --ink-3: rgba(237,233,255,0.35);
  --ink-4: rgba(237,233,255,0.1);

  --shadow-sm:     0 2px 8px rgba(0,0,0,0.3);
  --shadow-md:     0 4px 20px rgba(0,0,0,0.4);
  --shadow-lg:     0 8px 32px rgba(0,0,0,0.5);
  --shadow-violet: 0 8px 28px rgba(108,92,231,0.45);
}

/* OS auto dark mode */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* paste all dark mode overrides here */
  }
}

/* ── BASE STYLES ──────────────────────────── */
/* Apply saved theme preference before first paint */
/* Add this inline in <head>: */
/* <script>const t=localStorage.getItem('olivia-theme');if(t)document.documentElement.setAttribute('data-theme',t)</script> */

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: var(--bg);
  color: var(--ink);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
