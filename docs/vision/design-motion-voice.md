# Olivia Design System — Motion, Interaction & Voice

> This document covers how Olivia moves, responds, and speaks. Motion and voice are as important as visual design — they're what make the app feel alive rather than static. Dark mode has minimal impact on motion, but key considerations are noted.

---

## Motion Principles

Olivia's motion language is **purposeful and warm**. Animations should feel like a gentle, attentive assistant — responsive and smooth, never flashy or mechanical.

**Three rules:**
1. **Motion must serve clarity.** Animations reveal structure (staggered lists show hierarchy) or confirm actions (a checkbox completing gives satisfaction). Never animate purely for decoration.
2. **Ease out, not ease in.** UI transitions should feel like they arrive with confidence. Default easing: `cubic-bezier(0.22, 1, 0.36, 1)` — a custom spring curve.
3. **Keep it brief.** Most animations: 200–350ms. Screen transitions: 300ms. Never exceed 500ms for any standard interaction.

**Dark mode note:** Animations are identical in both modes. Motion values never change with theme.

---

## Animation Tokens

```css
/* Standard entrance */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Card / list item entrance */
@keyframes taskIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Screen entrance */
@keyframes screenIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Chat message entrance */
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Modal / card pop */
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Olivia orb pulse */
@keyframes orbPulse {
  0%, 100% { box-shadow: var(--shadow-violet); }
  50% {
    box-shadow: 0 4px 22px rgba(108,92,231,0.55),
                0 0 0 6px var(--violet-dim);
  }
}

/* Nudge dot blink */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```

The `orbPulse` animation uses CSS variables (`--shadow-violet`, `--violet-dim`) so the glow automatically strengthens in dark mode without a separate animation definition.

---

## Stagger Patterns

Lists animate in with staggered delays to reveal structure sequentially.

**Standard task/card stagger:**
```css
.task-card:nth-child(1) { animation-delay: 0.05s; }
.task-card:nth-child(2) { animation-delay: 0.10s; }
.task-card:nth-child(3) { animation-delay: 0.15s; }
.task-card:nth-child(4) { animation-delay: 0.19s; }
.task-card:nth-child(5) { animation-delay: 0.23s; }
/* Continue at +0.04s per item */
```

**Chat message stagger (slower — Olivia is "typing"):**
```css
.msg:nth-child(1) { animation-delay: 0.05s; }
.msg:nth-child(2) { animation-delay: 0.15s; }
.msg:nth-child(3) { animation-delay: 0.30s; }
.msg:nth-child(4) { animation-delay: 0.45s; }
.msg:nth-child(5) { animation-delay: 0.60s; }
```

**Note:** Elements that animate in must start with `opacity: 0` in their CSS so they don't flash before the animation fires.

---

## Interaction States

Every interactive element must have clear visual feedback for rest, hover, active, and focus.

### Hover (pointer devices)
- Cards: `transform: translateX(3px)` (tasks) or `translateY(-2px)` (event tiles), shadow upgrade, border color to `--lavender-mid`
- Buttons: background darkens by ~10%
- Chips/tabs: border and text shift to `--violet`, background to `--lavender-soft`
- Nav items: `--lavender-soft` background pill

### Active / Press (touch)
- Cards and buttons: `transform: scale(0.98)`
- Never use `opacity` reduction alone — it feels like a glitch, not a tap
- Press: `transition: transform 0.1s ease`. Release: `0.2s ease`

### Focus (keyboard / accessibility)
- All focusable elements: `box-shadow: 0 0 0 4px var(--violet-glow)`
- `--violet-glow` is stronger in dark mode (`rgba(108,92,231,0.3)` vs `0.18`), so focus rings are more visible in dark — this is desirable
- Input focus: also change border color to `var(--violet)`
- Never suppress focus rings

### Transition Defaults

```css
transition: all 0.2s ease;                                        /* most interactive elements */
transition: background 0.15s ease, border-color 0.15s ease;       /* color-only changes */
transition: transform 0.1s ease;                                   /* press/tap */
```

---

## Screen Navigation

### Screen Switch Pattern

```javascript
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Sync nav active state
  const map = { 'screen-home': 0, 'screen-tasks': 1, 'screen-ai': 2, 'screen-memory': 3 };
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('active', i === map[id]);
  });
}
```

**Rules:**
- Only one screen is `.active` at a time.
- Screen transitions are always vertical (fade up). Never horizontal swipe.
- Bottom nav must sync every time `showScreen()` is called.

---

## Ongoing / Persistent Animations

| Element | Animation | Duration | Notes |
|---|---|---|---|
| Olivia orb | `orbPulse` | 3s infinite | AI screen header only. Glow is stronger in dark mode via `--shadow-violet` token |
| Nudge card dot | `blink` | 2s infinite | Yellow dot. Unchanged between modes |

**Accessibility — reduce motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .olivia-orb  { animation: none; }
  .nudge-dot   { animation: none; }
  .task-card,
  .mem-card,
  .msg         { animation: none; opacity: 1; transform: none; }
}
```

This rule applies in both light and dark mode. It should be the last animation-related rule in the stylesheet so it overrides everything.

---

## AI Interaction Patterns

### Olivia Response Timing

Olivia's reply appears after ~900ms — not instantly. This creates the sense that she is actually thinking.

```javascript
setTimeout(() => {
  appendOliviaMessage(responseText);
  scrollChat();
}, 900);
```

### Message Bubbles

**User messages** — right-aligned, violet gradient:
```css
border-radius: 20px 4px 20px 20px;
background: linear-gradient(135deg, var(--violet), var(--violet-2));
color: white;
```

**Olivia messages** — left-aligned, surface card:
```css
border-radius: 4px 20px 20px 20px;
background: var(--surface);
color: var(--ink);
border: 1.5px solid var(--ink-4);
```

**Dark mode note:** User bubbles lighten slightly in dark mode because `--violet-2` shifts from `#8B7FF5` to `#9D93F7`. Olivia bubbles use `--surface`, which becomes `#1C1A2E` — elevated from the `#12101C` background, giving natural card lift.

### Action Cards (within Olivia messages)

```
[ Olivia message bubble ]
  └── [ Action card ]
        ├── Label (e.g. "✉️ Draft message")
        ├── Preview text (Fraunces italic, --lavender-soft bg, violet left border)
        └── Two buttons: primary action + secondary (edit/dismiss)
```

The preview box background (`--lavender-soft`) shifts from `#EDE9FF` to `#2A2545` in dark — a deep indigo block that still clearly differentiates the draft content from the card chrome.

### Quick Suggestion Chips

```javascript
chip.addEventListener('click', () => {
  input.value = chip.textContent.trim();
  input.focus();
  // User reviews before sending — never auto-submit
});
```

### Chat Scroll Behavior

```javascript
function scrollChat() {
  const ca = document.getElementById('chat-area');
  setTimeout(() => ca.scrollTo({ top: ca.scrollHeight, behavior: 'smooth' }), 100);
}
```

---

## Olivia's Voice & Tone

Olivia's voice does not change between modes — it is a product constant, not a visual property.

### Voice Characteristics

**Warm and direct.** Gets to the point without being cold. No hedging, no over-explaining.

**First-person ownership.** "I noticed" and "I can do that" — not "The system detected" or "It appears."

**Specific, not generic.** References real household context. "The plumber hasn't replied in 3 days" — not "A task may need attention."

**Occasionally light.** A well-placed emoji or touch of warmth is appropriate. Never sarcastic, never excessively chipper.

### Voice Examples

| ❌ Don't | ✅ Do |
|---|---|
| "Task reminder: follow up required" | "The plumber hasn't replied — want me to nudge them?" |
| "Action needed on item #3" | "You've got 3 things today. The dry cleaning is most time-sensitive." |
| "Draft created successfully" | "Done! Here's what I wrote — feel free to tweak it." |
| "No upcoming events found" | "Your week looks clear after Thursday. Good moment for the backlog?" |
| "Please confirm this action" | "Send it? Or would you like to edit first?" |

### Fraunces Italic = Olivia's Voice

Whenever Olivia speaks in a non-chat context (nudge card, action card preview, callout quotes), the text must be set in **Fraunces italic**. This applies identically in both light and dark mode.

Plain text or Plus Jakarta Sans = UI chrome.
Fraunces italic = Olivia is talking.

---

## Accessibility Notes

- All tap targets: minimum **44×44px**.
- Color is never the sole differentiator — badges include text labels alongside color.
- Focus states visible in both modes — `--violet-glow` strengthens automatically in dark.
- `prefers-reduced-motion` disables stagger animations and persistent pulse effects.
- **Contrast ratios:** Verify WCAG AA (4.5:1) in both modes. Dark mode `--ink` (`#EDE9FF`) on `--surface` (`#1C1A2E`) passes. Dark mode `--violet` (`#6C5CE7`) on `--surface` (`#1C1A2E`) should be verified — if it fails, use `--violet-2` (`#9D93F7`) for text on dark backgrounds.
- **Dark mode contrast tip:** Accent full values (`--rose`, `--peach`, `--mint`) are vivid enough to meet contrast on dark surfaces when used as text. Their light-mode darkened equivalents (`#D4527A`, `#B8610A`) are not needed in dark mode — use the full accent value directly.
