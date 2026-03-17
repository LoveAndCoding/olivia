# 08 · Color Palette

## The palette tells the story.

---

Olivia's colors evoke a home at golden hour — warm light filtering through a calm space. The palette is pastel-forward with a single bold anchor (Violet) that carries Olivia's identity across every surface.

### Naming Convention

The brand palette uses **descriptive implementation names** that map directly to CSS custom properties in the codebase. Earlier brand references to "Ember," "Sage," and "Soft Sky" are retired in favor of the canonical names below, which align one-to-one with the design system tokens.

| Brand name | CSS token | Retired alias |
|---|---|---|
| Violet | `--violet` | *(none)* |
| Rose | `--rose` | Ember |
| Peach | `--peach` | *(none)* |
| Mint | `--mint` | Sage |
| Sky | `--sky` | Soft Sky |

---

## Brand Violet — The Anchor

Violet is Olivia's signature color. It does not change between light and dark mode — it is the single constant in the entire palette. Every screen should contain at least one violet element (a button, an active state, a glow).

| Token | Hex / Value | Usage |
|---|---|---|
| `--violet` | `#6C5CE7` | Primary accent, CTAs, active states, brand mark |
| `--violet-2` | `#8B7FF5` (light) · `#9D93F7` (dark) | Hover states, gradient terminals, secondary violet |
| `--violet-dim` | `rgba(108,92,231,0.1)` (light) · `rgba(108,92,231,0.18)` (dark) | Chip fills, subtle highlights |
| `--violet-glow` | `rgba(108,92,231,0.18)` (light) · `rgba(108,92,231,0.3)` (dark) | Focus rings, ambient glow |
| `--lavender-soft` | `#EDE9FF` (light) · `#2A2545` (dark) | Active nav background, date pills, tag fills |
| `--lavender-mid` | `#D4CCFF` (light) · `#3D3660` (dark) | Input borders, dividers, hover borders |

---

## Accent Colors

Accents add warmth, energy, and semantic meaning. Their full-chroma values are shared across modes — vivid enough to read on both light and dark backgrounds. Background-fill variants (`-soft`) and overlay variants (`-dim`) are tuned per mode.

### Rose

Warm, affectionate energy. Used for personal or emotional content — birthdays, appreciation, care-related reminders.

| Token | Light | Dark |
|---|---|---|
| `--rose` | `#FF7EB3` | `#FF7EB3` |
| `--rose-soft` | `#FFE8F2` | `#3A1828` |
| `--rose-dim` | `rgba(255,126,179,0.12)` | `rgba(255,126,179,0.15)` |

### Peach

Warm and gently urgent. Used for time-sensitive nudges, scheduling cues, and deadline proximity indicators.

| Token | Light | Dark |
|---|---|---|
| `--peach` | `#FFB347` | `#FFB347` |
| `--peach-soft` | `#FFF3E0` | `#2E1E08` |
| `--peach-dim` | `rgba(255,179,71,0.12)` | `rgba(255,179,71,0.15)` |

### Mint

Calm and accomplished. Used for completion states, success feedback, and health/wellness content.

| Token | Light | Dark |
|---|---|---|
| `--mint` | `#00C9A7` | `#00C9A7` |
| `--mint-soft` | `#E0FFF9` | `#0A2820` |
| `--mint-dim` | `rgba(0,201,167,0.1)` | `rgba(0,201,167,0.15)` |

### Sky

Open and informational. Used for contextual information, weather, calendar views, and neutral highlights.

| Token | Light | Dark |
|---|---|---|
| `--sky` | `#48CAE4` | `#48CAE4` |
| `--sky-soft` | `#E0F7FC` | `#0A2228` |
| `--sky-dim` | `rgba(72,202,228,0.1)` | `rgba(72,202,228,0.15)` |

---

## Background & Surface Tokens

These define the layered depth of every screen. Light mode uses lavender-tinted creams; dark mode uses warm indigo-blacks — never neutral grey.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#FAF8FF` | `#12101C` | App root background |
| `--surface` | `#FFFFFF` | `#1C1A2E` | Cards, inputs, bottom nav |
| `--surface-2` | `#F3F0FF` | `#242038` | Elevated surfaces, hover fills |
| `--surface-3` | `#EDE9FF` | `#2E2848` | Deepest surface, selected states |

---

## Ink (Text) Scale

Text color inverts between modes but never reaches pure black or pure white. Dark mode uses a warm near-white (`#EDE9FF`) to maintain the brand's warmth.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--ink` | `#1A1033` | `#EDE9FF` | Primary text |
| `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` | Secondary text, subtitles |
| `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` | Tertiary, placeholder text |
| `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` | Borders, dividers |

---

## Elevation & Shadows

Light mode uses subtle violet-tinted shadows. Dark mode shifts to deeper black shadows, where elevation is communicated primarily through surface layering rather than drop shadows.

| Token | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(26,16,51,0.06)` | `0 2px 8px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 20px rgba(26,16,51,0.08)` | `0 4px 20px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 32px rgba(26,16,51,0.10)` | `0 8px 32px rgba(0,0,0,0.5)` |
| `--shadow-violet` | `0 8px 28px rgba(108,92,231,0.3)` | `0 8px 28px rgba(108,92,231,0.45)` |

---

## Warm Neutrals (Illustration Use)

For watercolor illustrations and decorative elements, these warm neutrals complement the accent palette:

- **Warm cream** — `#FAF3E8` — paper-like base for watercolor washes
- **Blush grey** — `#E8DFD6` — shadow tones in illustrations
- **Soft umber** — `#C4B5A5` — grounding earth tones

These are not tokenized as CSS custom properties — they appear only in illustration assets and brand collateral, not in the UI.

---

## Usage Rules

1. **Never hardcode hex values in component CSS.** Every color reference must use a CSS custom property from the token set above.
2. **Never use pure black (`#000`) or pure white (`#FFF`) for text.** Use the ink scale.
3. **Never use neutral grey for dark backgrounds.** Olivia uses warm indigo-blacks. Cold greys (`#1A1A1A`, `#222`) are off-brand.
4. **Violet is unchanged across modes.** It is Olivia's identity.
5. **Accent `-soft` backgrounds must use dark-tinted variants in dark mode.** Light-mode pastels appear as glowing blobs on dark surfaces.
6. **Surface layering replaces shadow in dark mode.** Communicate elevation through surface contrast, not drop shadows alone.
7. **Every screen should carry at least one violet touchpoint** — an active state, a button, a glow. Violet-free screens feel anonymous.
8. **Accent colors carry semantic meaning.** Rose = personal/emotional, Peach = time-sensitive, Mint = success/completion, Sky = informational. Do not use them interchangeably.
