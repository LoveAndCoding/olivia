# Olivia Design System — Visual Foundations

> This document defines the core visual language for the Olivia PWA. All UI work must conform to these standards. When in doubt, refer back to this document before making design decisions.

---

## Design Philosophy

Olivia should feel like a **trusted household companion** — warm, expressive, and a little playful, but never frivolous. The visual language leans into soft editorial aesthetics: rich typography, a curated pastel-and-violet palette, and generous white space. It avoids the sterile "productivity app" look and the generic "AI chatbot" look in equal measure.

**Three words to design by:** Warm. Expressive. Grounded.

Both light and dark modes must embody these words equally. Dark mode is not a color inversion — it is a separate, considered palette that maintains warmth and character in a lower-light context.

---

## Theming Architecture

Olivia supports two modes: **Light** (default) and **Dark**. All color values are expressed as CSS custom properties on `:root`. The dark theme overrides those properties using a `[data-theme="dark"]` attribute on the `<html>` element, combined with a `prefers-color-scheme` media query for automatic OS-level switching.

```css
/* Light mode — defined on :root, always the baseline */
:root { --bg: #FAF8FF; ... }

/* Dark mode — explicit user preference */
[data-theme="dark"] { --bg: #12101C; ... }

/* Dark mode — automatic OS preference, when no explicit choice is set */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #12101C; ... }
}
```

**The single most important implementation rule:** Never hardcode color hex values in component CSS. Every color reference must use a CSS variable from the token set below. This is what makes the entire app theme-switchable with zero per-component changes.

---

## Color System

### Design Intent by Mode

| Mode | Feeling | Background character |
|---|---|---|
| Light | Airy, soft, lavender-tinted cream | Barely-there lavender white |
| Dark | Deep, rich, slightly warm midnight | Warm indigo-black — not cold grey |

Dark mode backgrounds use a **warm indigo-black** (`#12101C`) rather than neutral charcoal. This keeps Olivia feeling warm even in the dark and makes violet accents glow rather than clash.

---

### Background & Surface Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#FAF8FF` | `#12101C` | App root background |
| `--surface` | `#FFFFFF` | `#1C1A2E` | Cards, inputs, bottom nav |
| `--surface-2` | `#F3F0FF` | `#242038` | Elevated surfaces, hover fills |
| `--surface-3` | `#EDE9FF` | `#2E2848` | Deepest surface, selected states |

### Primary Palette

The violet accent does not change between modes — it is Olivia's brand color and must remain consistent. Its `dim` and `glow` variants become slightly more opaque in dark mode since they need to show against darker backgrounds.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--violet` | `#6C5CE7` | `#6C5CE7` | Primary accent, CTAs, active states, Olivia brand |
| `--violet-2` | `#8B7FF5` | `#9D93F7` | Hover states, gradient ends, secondary violet |
| `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` | Chip fills, subtle highlights |
| `--violet-glow` | `rgba(108,92,231,0.18)` | `rgba(108,92,231,0.3)` | Focus rings, soft shadows |
| `--lavender-soft` | `#EDE9FF` | `#2A2545` | Active nav bg, date pills, tag backgrounds |
| `--lavender-mid` | `#D4CCFF` | `#3D3660` | Input borders, dividers, hover borders |

### Accent Palette

Accent full colors are shared between modes — vivid enough to read on both backgrounds. The soft (background fill) variants differ significantly because light-mode pastels disappear against dark surfaces.

| Token | Light soft | Dark soft | Full (both) |
|---|---|---|---|
| `--rose-soft` | `#FFE8F2` | `#3A1828` | `--rose: #FF7EB3` |
| `--peach-soft` | `#FFF3E0` | `#2E1E08` | `--peach: #FFB347` |
| `--mint-soft` | `#E0FFF9` | `#0A2820` | `--mint: #00C9A7` |
| `--sky-soft` | `#E0F7FC` | `#0A2228` | `--sky: #48CAE4` |

Dim (rgba overlay) variants also shift to be slightly more opaque in dark mode so they're visible:

| Token | Light | Dark |
|---|---|---|
| `--rose-dim` | `rgba(255,126,179,0.12)` | `rgba(255,126,179,0.15)` |
| `--peach-dim` | `rgba(255,179,71,0.12)` | `rgba(255,179,71,0.15)` |
| `--mint-dim` | `rgba(0,201,167,0.1)` | `rgba(0,201,167,0.15)` |
| `--sky-dim` | `rgba(72,202,228,0.1)` | `rgba(72,202,228,0.15)` |

### Ink (Text) Scale

Dark mode inverts the ink direction — text becomes light on dark. The scale uses warm near-white (`#EDE9FF`) rather than pure white, maintaining Olivia's warmth.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--ink` | `#1A1033` | `#EDE9FF` | Primary text |
| `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` | Secondary text, subtitles |
| `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` | Tertiary / placeholder text |
| `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` | Borders, dividers |

### Elevation & Shadows

Shadows are nearly invisible on dark backgrounds, so elevation is communicated primarily through **lighter surface backgrounds** in dark mode. Shadows still exist but are adjusted.

| Token | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(26,16,51,0.06)` | `0 2px 8px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 20px rgba(26,16,51,0.08)` | `0 4px 20px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 32px rgba(26,16,51,0.10)` | `0 8px 32px rgba(0,0,0,0.5)` |
| `--shadow-violet` | `0 8px 28px rgba(108,92,231,0.3)` | `0 8px 28px rgba(108,92,231,0.45)` |

In dark mode, the violet glow is **stronger** — it becomes a primary elevation cue for interactive elements like the nudge card and primary buttons.

---

### Rules for Color

- **Never use pure black or pure white for text.** Dark mode `--ink` is `#EDE9FF`, not `#FFFFFF`.
- **Never use neutral grey for dark backgrounds.** Olivia uses warm indigo-blacks (`#12101C`, `#1C1A2E`). Cold greys (`#1A1A1A`, `#222`) are off-brand.
- **Violet is unchanged across modes.** It is Olivia's identity.
- **Accent soft backgrounds must use dark-tinted variants in dark mode.** Light-mode pastels (`#FFE8F2`) appear as glowing blobs on dark surfaces.
- **Surface layering replaces shadow in dark mode.** A card (`--surface: #1C1A2E`) against the app background (`--bg: #12101C`) communicates elevation through contrast between surfaces.
- **Backgrounds must have personality in both modes.** Light: lavender-tinted cream. Dark: deep indigo midnight. Neither should be flat or neutral.

---

## Full Token Reference (Both Modes)

```css
/* ── LIGHT MODE (baseline) ───────────────────────────────── */
:root {
  /* Backgrounds */
  --bg: #FAF8FF;
  --surface: #FFFFFF;
  --surface-2: #F3F0FF;
  --surface-3: #EDE9FF;

  /* Primary */
  --violet: #6C5CE7;
  --violet-2: #8B7FF5;
  --violet-dim: rgba(108,92,231,0.1);
  --violet-glow: rgba(108,92,231,0.18);
  --lavender-soft: #EDE9FF;
  --lavender-mid: #D4CCFF;

  /* Accents */
  --rose: #FF7EB3;
  --rose-soft: #FFE8F2;
  --rose-dim: rgba(255,126,179,0.12);
  --peach: #FFB347;
  --peach-soft: #FFF3E0;
  --peach-dim: rgba(255,179,71,0.12);
  --mint: #00C9A7;
  --mint-soft: #E0FFF9;
  --mint-dim: rgba(0,201,167,0.1);
  --sky: #48CAE4;
  --sky-soft: #E0F7FC;
  --sky-dim: rgba(72,202,228,0.1);

  /* Ink */
  --ink: #1A1033;
  --ink-2: rgba(26,16,51,0.55);
  --ink-3: rgba(26,16,51,0.3);
  --ink-4: rgba(26,16,51,0.15);

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(26,16,51,0.06);
  --shadow-md: 0 4px 20px rgba(26,16,51,0.08);
  --shadow-lg: 0 8px 32px rgba(26,16,51,0.10);
  --shadow-violet: 0 8px 28px rgba(108,92,231,0.3);
}

/* ── DARK MODE ───────────────────────────────────────────── */
[data-theme="dark"] {
  --bg: #12101C;
  --surface: #1C1A2E;
  --surface-2: #242038;
  --surface-3: #2E2848;

  --violet: #6C5CE7;       /* unchanged */
  --violet-2: #9D93F7;
  --violet-dim: rgba(108,92,231,0.18);
  --violet-glow: rgba(108,92,231,0.3);
  --lavender-soft: #2A2545;
  --lavender-mid: #3D3660;

  --rose: #FF7EB3;         /* unchanged */
  --rose-soft: #3A1828;
  --rose-dim: rgba(255,126,179,0.15);
  --peach: #FFB347;        /* unchanged */
  --peach-soft: #2E1E08;
  --peach-dim: rgba(255,179,71,0.15);
  --mint: #00C9A7;         /* unchanged */
  --mint-soft: #0A2820;
  --mint-dim: rgba(0,201,167,0.15);
  --sky: #48CAE4;          /* unchanged */
  --sky-soft: #0A2228;
  --sky-dim: rgba(72,202,228,0.15);

  --ink: #EDE9FF;
  --ink-2: rgba(237,233,255,0.6);
  --ink-3: rgba(237,233,255,0.35);
  --ink-4: rgba(237,233,255,0.1);

  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-violet: 0 8px 28px rgba(108,92,231,0.45);
}

/* OS-level auto dark mode (when no explicit user preference is saved) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #12101C;
    --surface: #1C1A2E;
    --surface-2: #242038;
    --surface-3: #2E2848;
    --violet: #6C5CE7;
    --violet-2: #9D93F7;
    --violet-dim: rgba(108,92,231,0.18);
    --violet-glow: rgba(108,92,231,0.3);
    --lavender-soft: #2A2545;
    --lavender-mid: #3D3660;
    --rose: #FF7EB3;
    --rose-soft: #3A1828;
    --rose-dim: rgba(255,126,179,0.15);
    --peach: #FFB347;
    --peach-soft: #2E1E08;
    --peach-dim: rgba(255,179,71,0.15);
    --mint: #00C9A7;
    --mint-soft: #0A2820;
    --mint-dim: rgba(0,201,167,0.15);
    --sky: #48CAE4;
    --sky-soft: #0A2228;
    --sky-dim: rgba(72,202,228,0.15);
    --ink: #EDE9FF;
    --ink-2: rgba(237,233,255,0.6);
    --ink-3: rgba(237,233,255,0.35);
    --ink-4: rgba(237,233,255,0.1);
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 20px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
    --shadow-violet: 0 8px 28px rgba(108,92,231,0.45);
  }
}
```

---

## Theme Toggle Implementation

Olivia supports three states: **Light** (forced), **Dark** (forced), and **Auto** (follows OS preference). Store the user's preference in `localStorage` under the key `olivia-theme`.

```javascript
// On app init — apply saved preference before first paint
const saved = localStorage.getItem('olivia-theme'); // 'light' | 'dark' | null
if (saved) document.documentElement.setAttribute('data-theme', saved);

// Toggle handler
function setTheme(mode) { // mode: 'light' | 'dark' | 'auto'
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('olivia-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('olivia-theme', mode);
  }
}
```

Apply the `localStorage` read **before** the first CSS paint (inline `<script>` in `<head>`) to avoid a flash of the wrong theme on load.

---

## Typography

Typography is **identical in both modes** — only color tokens change. No font, size, weight, or spacing values differ.

### Font Pairing

```
Display / Headers:  Fraunces (Google Fonts)
  — Variable font with optical size axis
  — Use italic weights for expressive moments (greetings, Olivia messages, quotes)
  — Weights: 300 (italic body), 500 (subheads), 700 (section titles, headings)

Body / UI:          Plus Jakarta Sans (Google Fonts)
  — Clean, rounded geometric sans
  — Weights: 400 (body), 500 (labels), 600 (strong), 700 (buttons, emphasis)
```

**Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,500;1,9..144,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| App greeting | Fraunces | 32px | 700 | The bold opener; italic `em` for the name |
| Screen title | Fraunces | 28px | 700 | Top of each screen |
| Section title | Fraunces | 19px | 700 | Section headers within a screen |
| Olivia message | Fraunces italic | 17px | 300 | All Olivia-authored text in nudges and chat |
| Task / card title | Plus Jakarta Sans | 14px | 600 | Primary content in cards |
| Body / detail | Plus Jakarta Sans | 13–14px | 400 | Secondary content |
| Metadata / timestamp | Plus Jakarta Sans | 11–12px | 400–500 | Dates, owners, context |
| Labels / caps | Plus Jakarta Sans | 10px | 700 | ALL CAPS labels, letter-spacing: 1–1.5px |
| Badges | Plus Jakarta Sans | 10px | 700 | Short, pill-shaped status tags |

### Typography Rules

- **Fraunces italic is Olivia's voice.** Whenever the assistant speaks — in nudge cards, chat bubbles, or quote-style previews — use Fraunces italic.
- **Never use system fonts or Inter/Roboto.** This is a non-negotiable brand differentiator.
- **Italic weight (300) reads as warmth, not weakness.** Use it freely for Olivia content.
- **All-caps labels** should use `letter-spacing: 1.2px` minimum and never exceed `font-size: 11px`.

---

## Spacing & Layout

Spacing and layout are **identical in both modes**.

### Base Grid

- Mobile frame: **390px wide** (iPhone 14/15 reference)
- Base unit: **4px**
- Standard horizontal page padding: **22px** (headers/text) or **16px** (card containers)
- Card inner padding: **14–16px vertical, 16–18px horizontal**

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon gaps, tight inline |
| `sm` | 8px | Between chips, small gaps |
| `md` | 12–14px | Between cards, section elements |
| `lg` | 20–24px | Section spacing, major vertical rhythm |
| `xl` | 32px+ | Screen-level separation |

### Layout Rules

- **Horizontal card lists** use `overflow-x: auto; scrollbar-width: none` — hide scrollbars on all platforms.
- **Sticky elements** use `background: linear-gradient(to top, var(--bg) 75%, transparent)` — automatically picks up the correct background color in both modes.
- **Full-bleed sections** sit at `margin: 0 16px`.
- **Never use a sidebar layout.** Mobile-first, single-column.

---

## Border Radius

Identical in both modes.

| Context | Radius |
|---|---|
| Full cards (tasks, memory, events) | `18px` |
| Large feature cards (nudge, hero) | `24px` |
| Small chips / badges / pills | `20px` (fully rounded) |
| Input bars | `16–20px` |
| Icon containers | `12px` |
| Avatar circles | `50%` |
| Filter tabs | `20px` |

---

## Ambient Background System

Background blobs adapt to mode. Opacity values need adjustment — dark backgrounds amplify blob visibility, so some are dialled back while the violet blob is strengthened.

```css
/* Light mode */
.ambient-1 { background: radial-gradient(circle, rgba(180,166,255,0.28) 0%, transparent 65%); }
.ambient-2 { background: radial-gradient(circle, rgba(255,126,179,0.14) 0%, transparent 65%); }
.ambient-3 { background: radial-gradient(circle, rgba(0,201,167,0.10) 0%, transparent 65%); }

/* Dark mode — violet blob strengthened, others reduced */
[data-theme="dark"] .ambient-1,
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .ambient-1 } {
  background: radial-gradient(circle, rgba(108,92,231,0.2) 0%, transparent 65%);
}
[data-theme="dark"] .ambient-2 {
  background: radial-gradient(circle, rgba(255,126,179,0.08) 0%, transparent 65%);
}
[data-theme="dark"] .ambient-3 {
  background: radial-gradient(circle, rgba(0,201,167,0.07) 0%, transparent 65%);
}
```

**Rules (both modes):**
- All blobs: `pointer-events: none`, `z-index: 0`.
- Maximum 3 blobs per screen.
- Goal is atmosphere, not decoration — keep opacities conservative.
