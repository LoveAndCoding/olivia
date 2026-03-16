# 10 · Typography

## Two voices, one conversation.

---

Olivia's typography is built on a deliberate pairing: a warm, expressive serif for the assistant's voice and a clean geometric sans for everything else. This isn't decorative — it's functional. Users can distinguish who is speaking and what matters at a glance.

---

## Font Families

### Fraunces — Display & Olivia's Voice

[Fraunces](https://fonts.google.com/specimen/Fraunces) is a variable serif with an optical size axis, giving it natural warmth and character. It is used for all headings, the wordmark, and — critically — all text attributed to Olivia herself.

| Property | Value |
|---|---|
| Source | Google Fonts |
| Classification | Variable serif |
| Optical size axis | 9–144 |
| Weights used | 300, 500, 700 |
| Italic | Yes — core to the brand |

**Fraunces italic at weight 300 is Olivia's voice.** Whenever the assistant speaks — in nudge cards, chat bubbles, list messages, or quote-style previews — Fraunces italic 300 is the only acceptable rendering.

### Plus Jakarta Sans — Body & UI

[Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) is a rounded geometric sans-serif. It handles all user-facing UI text: task titles, metadata, labels, buttons, and body copy.

| Property | Value |
|---|---|
| Source | Google Fonts |
| Classification | Geometric sans-serif |
| Weights used | 300, 400, 500, 600, 700 |
| Italic | Not used |

---

## Type Scale

| Role | Font | Size | Weight | Style | Usage |
|---|---|---|---|---|---|
| Wordmark | Fraunces | 30px | 300 | italic | Home screen "olivia" mark |
| App greeting | Fraunces | 32px | 700 | normal | "Good morning" opener |
| Greeting name | Fraunces | (inherits) | 300 | italic | User's name within greeting (`em`) |
| Screen title | Fraunces | 28px | 700 | normal | "Tasks", "Memory", screen headers |
| AI title | Fraunces | 22px | 700 | normal | "Olivia" heading in chat view |
| Section title | Fraunces | 19px | 700 | normal | "Needs doing", "Coming up" |
| Olivia message (nudge) | Fraunces | 17px | 300 | italic | Nudge card messages |
| Olivia message (list) | Fraunces | 15px | 300 | italic | Inline Olivia notices in lists |
| Olivia message (chat) | Fraunces | 14px | 300 | italic | Chat bubble text from Olivia |
| Draft preview | Fraunces | 13px | 300 | italic | Action card previews |
| Task / card title | Plus Jakarta Sans | 14px | 600 | normal | Primary content in cards |
| Body / detail | Plus Jakarta Sans | 13–14px | 400 | normal | Secondary content, descriptions |
| User chat bubble | Plus Jakarta Sans | 14px | 400 | normal | User messages in chat |
| Button text | Plus Jakarta Sans | 12px | 700 | normal | CTAs, nudge buttons |
| Filter / chip | Plus Jakarta Sans | 12px | 600 | normal | Tabs, suggestion chips |
| Metadata / timestamp | Plus Jakarta Sans | 11–12px | 400–500 | normal | Dates, owners, secondary info |
| Labels (caps) | Plus Jakarta Sans | 10px | 700 | normal | ALL CAPS labels |
| Badges | Plus Jakarta Sans | 10px | 700 | normal | Pill-shaped status tags |

---

## Typography Rules

### Voice differentiation

1. **Fraunces italic 300 = Olivia speaking.** This is the single most important typographic rule. All assistant-authored content uses this treatment. All human-authored and system content uses Plus Jakarta Sans.
2. **Fraunces bold 700 = structural hierarchy.** Headings and titles use Fraunces at weight 700, normal style (not italic). This provides visual weight without implying the assistant is speaking.
3. **Plus Jakarta Sans 600 = content emphasis.** Card titles and strong labels use semi-bold within the sans-serif — never Fraunces, which would falsely signal Olivia's voice.

### Sizing and spacing

4. **Font sizes use pixel values.** The design system does not use rem or em for typography. All sizes are specified in px for design consistency across the type scale.
5. **The wordmark uses tight letter-spacing** (`-1px`). No other text element uses negative letter-spacing.
6. **ALL CAPS labels** must use `letter-spacing` of at least `1.2px` and must never exceed `font-size: 11px`. This ensures caps text reads as a quiet structural element, not a shout.
7. **Line height** defaults to `1.5` for body text. Headings may use tighter line-height as needed.

### Restrictions

8. **Never use system fonts, Inter, or Roboto.** This is a non-negotiable brand differentiator. Olivia's warmth comes from its distinctive type pairing.
9. **Never use Fraunces for user-authored content.** User chat messages, input fields, and form labels all use Plus Jakarta Sans.
10. **Never use Plus Jakarta Sans italic.** Italic in this product is reserved for Fraunces / Olivia's voice. Using italic sans would blur the voice distinction.
11. **Never render the wordmark at any weight other than 300 italic.** Bold or upright renderings of "olivia" are off-brand.

---

## Font Loading

Fonts are loaded via Google Fonts with `display=swap` for progressive rendering:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,500;1,9..144,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

The `preconnect` hints eliminate the DNS/TLS round-trip to Google Fonts, and `display=swap` ensures text renders immediately with fallback fonts until the custom fonts load.

---

## Dark Mode

Typography is **identical in both light and dark modes**. No font family, size, weight, or spacing values change. Only color tokens (`--ink`, `--ink-2`, `--ink-3`) shift between modes. See [08 · Color Palette](./08-color-palette.md) for the ink scale values.
