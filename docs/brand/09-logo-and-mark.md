# 09 · Logo & Mark

## A quiet signal that Olivia is here.

---

Olivia's identity marks are minimal and expressive. They communicate warmth, presence, and calm without competing for attention. The system consists of two elements: the **wordmark** and the **orb mark** (also called the glow mark).

---

## The Wordmark

The wordmark is the primary brand identifier. It is the word "olivia" set in **Fraunces italic** at weight 300 — the same voice the assistant uses throughout the product. The wordmark is always lowercase.

| Property | Value |
|---|---|
| Font | Fraunces, italic |
| Weight | 300 |
| Size (reference) | 30px at mobile scale |
| Letter-spacing | -1px (tight) |
| Color | `--violet` (`#6C5CE7`) |
| Case | Always lowercase |

### Usage rules

- The wordmark is always set in **Brand Violet** (`--violet`). It does not change between light and dark mode.
- Never bold the wordmark. Weight 300 italic is the only acceptable rendering.
- Never capitalize or uppercase any letter. It is always "olivia", never "Olivia" or "OLIVIA" in the mark.
- Never stretch, rotate, skew, or add effects (drop shadow, outline, emboss) to the wordmark.
- The wordmark may appear alongside the orb mark or independently, but never stacked vertically.

### Clear space

Maintain a minimum clear space equal to the **cap height** of the wordmark on all four sides. At the reference size (30px), this is approximately 20px. No other text, icon, or visual element should intrude into this zone.

### Minimum size

The wordmark should never be rendered smaller than **18px** to preserve legibility of the italic letterforms. At sizes below 18px, use the orb mark alone.

---

## The Orb Mark (Glow Mark)

The orb is Olivia's logomark — a circular gradient element that represents the assistant's presence. It appears in the UI as a living, breathing accent: softly pulsing to signal that Olivia is present and attentive.

| Property | Value |
|---|---|
| Shape | Circle |
| Size (reference) | 38 x 38px at mobile scale |
| Background | `linear-gradient(135deg, #6C5CE7, #a78bfa, #FF7EB3)` |
| Shadow | `--shadow-violet` |
| Animation | `orbPulse` — 3s ease infinite |
| Content | Centered emoji or icon glyph, 16px, white |

### Gradient specification

The orb gradient runs at **135 degrees** (top-left to bottom-right) through three stops:

1. **Violet** — `#6C5CE7` (Brand Violet)
2. **Soft lavender** — `#a78bfa`
3. **Rose** — `#FF7EB3` (Brand Rose)

This gradient is fixed and should not be altered. The transition from violet through lavender to rose mirrors the brand's emotional spectrum: grounded presence to warm affection.

### The pulse

The orb breathes with a subtle `box-shadow` animation — expanding its violet glow on a 3-second cycle. This pulse communicates that Olivia is alive and present without demanding attention.

```
0%, 100% — box-shadow: var(--shadow-violet)
50%      — box-shadow: 0 4px 22px rgba(108,92,231,0.55),
                        0 0 0 6px var(--violet-dim)
```

The pulse should never be fast, flashy, or abrupt. It is a slow, steady breath — calm, not urgent.

### Usage rules

- The orb mark is used as an **avatar** and **presence indicator** for the Olivia assistant throughout the UI.
- The orb gradient must not be modified — these three colors in this order are the mark's identity.
- In contexts where animation is inappropriate (print, static assets), render the orb without the pulse at its resting shadow state (`--shadow-violet`).
- The orb may be scaled proportionally. Maintain the circular aspect ratio — never stretch into an ellipse.
- At sizes below 24px, omit the inner content glyph and render as a solid gradient circle.

### Minimum size

The orb should not be rendered smaller than **16px** diameter. Below this size, the gradient becomes indistinct and loses its identity.

### Clear space

Maintain a minimum clear space of **half the orb's diameter** on all sides.

---

## Mark Pairing

When the wordmark and orb appear together (e.g., in a splash screen or about page), the orb sits to the **left** of the wordmark, vertically centered. The gap between the orb's right edge and the first letter of the wordmark should be **12px** at mobile scale.

---

## Incorrect Usage

- Do not place the wordmark inside the orb.
- Do not use the wordmark in a color other than `--violet`.
- Do not add a background shape or container behind the wordmark.
- Do not recreate the orb with flat colors — the gradient is essential.
- Do not combine the marks with third-party logos without brand review.
- Do not use the orb gradient as a general-purpose decorative element. It is exclusively the assistant's identity.
