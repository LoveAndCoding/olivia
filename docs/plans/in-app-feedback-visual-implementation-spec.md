---
title: "Olivia — In-App Feedback Form: Visual Implementation Spec"
subtitle: "Full-screen feedback route at /settings/feedback"
date: "March 2026"
status: "Design handoff for implementation"
task: "OLI-321"
---

# Olivia — In-App Feedback Form
## Visual Implementation Spec

*March 2026 · Design handoff for implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the In-App Feedback feature (approved D-072, 2026-03-25). It covers:
>
> 1. **Settings entry point** — a "Send Feedback" row in the Settings screen
> 2. **Feedback form screen** — a full-screen route at `/settings/feedback` with category selector, description field, optional screenshot, and auto-filled context
> 3. **Submission states** — loading, success toast, and error handling
>
> **Design philosophy:** The feedback form should feel **quick and lightweight — not like filling out a support ticket** (product spec UX notes). Minimize required fields (category + description). Auto-filled context is visible but collapsible. The form should be completable in under 30 seconds.
>
> **Source spec:** `docs/specs/in-app-feedback.md`

---

## 0. Design Decisions

### 0.1 Settings Entry Point — Dedicated Row with Speech Bubble Icon

**Decision:** "Send Feedback" is a standalone settings row placed **after the Notifications section and before the Installability diagnostic card**. It uses a speech bubble icon (`💬` or equivalent SVG) to distinguish it from diagnostic/technical rows.

**Rationale:** Feedback is a user-initiated action, not a diagnostic. Placing it after notifications (the last "feature" section) and before installability/sync diagnostics (technical sections) creates a natural separation: "things I can do" above, "system info" below. The speech bubble icon reads as "communication" — distinct from the gear (settings), bell (notifications), and wrench (diagnostics) metaphors already in use.

### 0.2 Form Layout — Stacked Vertical, Single Column

**Decision:** The feedback form uses a simple stacked vertical layout: category selector at top, description textarea in the middle, screenshot attachment below, context section at bottom. No multi-column layouts, no tabs.

**Rationale:** Mobile-first. A single-column form is the fastest to scan and complete on a phone. The vertical ordering follows the user's mental model: "What kind of issue is this?" → "What happened?" → "Here's a screenshot" → "Here's what the app knows."

### 0.3 Category Selector — Pill Buttons, Not a Dropdown

**Decision:** The three categories (Bug, Feature Request, General) are rendered as **horizontal pill buttons** with single-select behavior. Bug is pre-selected by default.

**Rationale:** Three options is few enough for inline display. A dropdown adds a tap and hides the options. Pill buttons show all choices at once and let the user select in one tap. This matches the filter tab pattern already used in Olivia (`.ftab` component from design-components.md).

### 0.4 Context Section — Collapsible, Collapsed by Default

**Decision:** The auto-filled context section is **collapsed by default** with a "Show device info" toggle. When expanded, it shows route, app version, device info, user, and recent errors as read-only text.

**Rationale:** The product spec requires context to be "visible but collapsible." Collapsing by default keeps the form focused on what the user needs to do (write a description). Most users don't need to verify device info — it's there for the development team's benefit. Collapsing it reduces visual noise.

### 0.5 Screenshot Attachment — Outline Button with Camera Icon

**Decision:** Screenshot attachment is an outline-style button with a camera/image icon. After attachment, a thumbnail preview replaces the button, with an "×" to remove.

**Rationale:** Optional actions should be visually lighter than required actions. An outline button signals "available if you want it" without competing with the primary submit button. The thumbnail preview confirms the attachment without requiring a separate gallery view.

### 0.6 Submit Button — Full-Width Primary Violet

**Decision:** The "Submit Feedback" button is full-width, violet background (`--violet`), white text, positioned at the bottom of the form. It is disabled (reduced opacity) until the description meets the minimum 10-character requirement.

**Rationale:** The submit button is the single primary action. Full-width ensures a large tap target on mobile. Violet matches Olivia's primary CTA pattern. Disabled state provides immediate feedback that more input is needed.

---

## 1. Design System Constraints

This feature introduces **no new design tokens**. All styling references existing values from `docs/vision/design-foundations.md` and `docs/vision/design-components.md`.

### 1.1 New CSS Classes

| Class | Purpose |
|---|---|
| `.feedback-row` | Settings entry point row |
| `.feedback-screen` | Full-screen feedback route container |
| `.feedback-category-pills` | Horizontal pill group for category selector |
| `.feedback-category-pill` | Individual category pill (reuses `.ftab` pattern) |
| `.feedback-textarea` | Description input field |
| `.feedback-attach-btn` | Screenshot attachment button |
| `.feedback-attach-preview` | Thumbnail preview of attached screenshot |
| `.feedback-context-toggle` | Collapsible context section header |
| `.feedback-context-body` | Expanded context section content |
| `.feedback-submit` | Primary submit button |
| `.feedback-toast` | Success confirmation toast |

### 1.2 Typography

| Role | Font | Size | Weight | Token |
|---|---|---|---|---|
| Screen title ("Send Feedback") | Fraunces | 28px | 700 | — |
| Category pill label | Plus Jakarta Sans | 13px | 600 | — |
| Textarea placeholder | Plus Jakarta Sans | 14px | 400 | `--ink-3` |
| Textarea input text | Plus Jakarta Sans | 14px | 400 | `--ink` |
| Character count hint | Plus Jakarta Sans | 11px | 400 | `--ink-3` |
| Attachment button label | Plus Jakarta Sans | 13px | 500 | `--ink-2` |
| Context toggle label | Plus Jakarta Sans | 12px | 600 | `--ink-2` |
| Context field labels | Plus Jakarta Sans | 11px | 700 | `--ink-3` (ALL CAPS, letter-spacing: 1.2px) |
| Context field values | Plus Jakarta Sans | 12px | 400 | `--ink-2` |
| Submit button label | Plus Jakarta Sans | 15px | 700 | white |
| Toast message | Plus Jakarta Sans | 14px | 500 | `--ink` |

### 1.3 Color Token Usage

| Visual Purpose | Token | Light | Dark |
|---|---|---|---|
| Screen background | `--bg` | `#FAF8FF` | `#12101C` |
| Settings row background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Settings row border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Settings row icon | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Category pill (inactive) bg | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Category pill (inactive) border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Category pill (inactive) text | `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` |
| Category pill (active) bg | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Category pill (active) text | white | `#FFFFFF` | `#FFFFFF` |
| Textarea background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Textarea border (rest) | `--lavender-mid` | `#D5CEF0` | `#3A3555` |
| Textarea border (focus) | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Textarea focus ring | `--violet-glow` | `rgba(108,92,231,0.18)` | `rgba(108,92,231,0.3)` |
| Attach button border | `--ink-4` | `rgba(26,16,51,0.15)` | `rgba(237,233,255,0.1)` |
| Attach button icon | `--ink-2` | `rgba(26,16,51,0.55)` | `rgba(237,233,255,0.6)` |
| Submit button bg | `--violet` | `#6C5CE7` | `#6C5CE7` |
| Submit button bg (disabled) | `--violet` at 40% opacity | — | — |
| Submit button text | white | `#FFFFFF` | `#FFFFFF` |
| Submit button shadow | `--shadow-violet` | `0 8px 28px rgba(108,92,231,0.3)` | `0 8px 28px rgba(108,92,231,0.45)` |
| Toast background | `--surface` | `#FFFFFF` | `#1C1A2E` |
| Toast shadow | `--shadow-md` | `0 4px 20px rgba(26,16,51,0.08)` | `0 4px 20px rgba(0,0,0,0.4)` |
| Toast accent stripe | `--mint` | `#00C9A7` | `#00C9A7` |
| Error banner bg | `--rose-soft` | `#FFE8F2` | `#3A1828` |
| Error banner text | `--rose` | `#FF7EB3` | `#FF7EB3` |

### 1.4 Spacing & Layout

| Element | Spec |
|---|---|
| Screen padding (horizontal) | `16px` |
| Screen padding (top, below back button) | `8px` |
| Section gap (between form elements) | `20px` |
| Category pill gap | `8px` |
| Category pill padding | `8px 16px` |
| Category pill border-radius | `20px` |
| Textarea min-height | `120px` |
| Textarea padding | `14px` |
| Textarea border-radius | `14px` |
| Textarea border-width | `2px` |
| Attach button padding | `10px 16px` |
| Attach button border-radius | `12px` |
| Attach thumbnail size | `64px × 64px` (border-radius: 8px) |
| Context section padding | `12px` |
| Context section border-radius | `12px` |
| Context section background | `--surface-2` |
| Submit button height | `48px` |
| Submit button border-radius | `14px` |
| Submit button margin-top | `8px` |
| Toast padding | `14px 18px` |
| Toast border-radius | `14px` |
| Toast left accent stripe | `4px wide, --mint` |

---

## 2. Screen Inventory

| Screen State ID | Screen | Description |
|---|---|---|
| FB-SETTINGS-1 | Settings | "Send Feedback" row visible in settings list |
| FB-FORM-1 | Feedback form | Empty form — Bug selected, description empty, context collapsed |
| FB-FORM-2 | Feedback form | Typing state — description partially filled, character count visible |
| FB-FORM-3 | Feedback form | Valid state — description meets 10-char minimum, submit enabled |
| FB-FORM-4 | Feedback form | Screenshot attached — thumbnail preview visible with remove button |
| FB-FORM-5 | Feedback form | Context expanded — auto-filled fields visible |
| FB-FORM-6 | Feedback form | Submitting state — submit button shows loading indicator |
| FB-FORM-7 | Feedback form | Error state — error banner visible, form editable |
| FB-TOAST-1 | Any screen | Success toast — brief confirmation after form closes |

---

## 3. Screen Designs

### 3.1 FB-SETTINGS-1 — Settings Entry Point

#### Layout

```
.settings-card  (existing Notifications card)
├── ... existing notification rows ...

.feedback-row                              ← NEW
├── .feedback-row__icon   💬               (left, --violet)
├── .feedback-row__label  "Send Feedback"  (center, --ink)
└── .feedback-row__chevron  ›              (right, --ink-3)

.settings-card  (existing Installability card)
├── ... existing diagnostic rows ...
```

#### Specs

```css
.feedback-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: 14px;
  margin: 12px 0;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.feedback-row:active {
  transform: scale(0.98);
  background: var(--surface-2);
}
.feedback-row__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--violet-dim);
  border-radius: 10px;
  font-size: 16px;  /* or SVG 18×18 */
}
.feedback-row__label {
  flex: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.feedback-row__chevron {
  color: var(--ink-3);
  font-size: 16px;
}
```

**Icon:** A speech bubble SVG (or system equivalent). The icon container uses `--violet-dim` background to match the notification toggle icon containers in the existing Settings card.

**Behavior:** Tapping navigates to `/settings/feedback`.

---

### 3.2 FB-FORM-1 — Empty Feedback Form

#### Layout

```
.feedback-screen
├── .rem-detail-back  "← Settings"            (back navigation, --violet)
├── .feedback-screen__title  "Send Feedback"   (Fraunces 28px 700)
│
├── .feedback-category-pills
│   ├── .feedback-category-pill.active  "Bug"  (--violet bg, white text)
│   ├── .feedback-category-pill  "Feature"     (--surface bg, --ink-2 text)
│   └── .feedback-category-pill  "General"     (--surface bg, --ink-2 text)
│
├── .feedback-textarea-wrap
│   ├── .feedback-textarea                     (placeholder: "What happened? What did you expect?")
│   └── .feedback-char-hint                    ("Minimum 10 characters", --ink-3, 11px)
│
├── .feedback-attach-btn
│   ├── 📷 icon                                (--ink-2)
│   └── "Attach Screenshot"                    (--ink-2, 13px 500)
│
├── .feedback-context-toggle
│   ├── "Show device info"                     (--ink-2, 12px 600)
│   └── ▼ chevron                              (--ink-3)
│
└── .feedback-submit  "Submit Feedback"        (DISABLED — 40% opacity)
```

#### Specs

```css
.feedback-screen {
  padding: 0 16px env(safe-area-inset-bottom, 0);
  min-height: 100vh;
  background: var(--bg);
}
.feedback-screen__title {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 24px;
}

/* Category Pills — reuses .ftab pattern */
.feedback-category-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.feedback-category-pill {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--ink-4);
  background: var(--surface);
  color: var(--ink-2);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}
.feedback-category-pill:hover {
  border-color: var(--violet);
  color: var(--violet);
}
.feedback-category-pill.active {
  background: var(--violet);
  border-color: var(--violet);
  color: white;
}

/* Textarea */
.feedback-textarea-wrap {
  margin-bottom: 20px;
}
.feedback-textarea {
  width: 100%;
  min-height: 120px;
  padding: 14px;
  border: 2px solid var(--lavender-mid);
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  resize: vertical;
}
.feedback-textarea::placeholder {
  color: var(--ink-3);
  font-style: italic;
}
.feedback-textarea:focus {
  border-color: var(--violet);
  box-shadow: 0 0 0 4px var(--violet-glow);
  outline: none;
}
.feedback-char-hint {
  margin-top: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  color: var(--ink-3);
}

/* Attach Button */
.feedback-attach-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1.5px dashed var(--ink-4);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-2);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 20px;
}
.feedback-attach-btn:hover {
  border-color: var(--violet);
  color: var(--violet);
}

/* Context Toggle */
.feedback-context-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 20px;
}
.feedback-context-toggle__label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
}
.feedback-context-toggle__chevron {
  color: var(--ink-3);
  font-size: 12px;
  transition: transform 200ms ease;
}
.feedback-context-toggle__chevron.expanded {
  transform: rotate(180deg);
}

/* Submit Button */
.feedback-submit {
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
  margin-top: 8px;
}
.feedback-submit:hover:not(:disabled) {
  background: var(--violet-2);
}
.feedback-submit:active:not(:disabled) {
  transform: scale(0.98);
}
.feedback-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}
```

**Back navigation:** Uses the `.rem-detail-back` class — the standard back-navigation affordance across all Olivia detail pages. Returns to `/settings`.

---

### 3.3 FB-FORM-2 — Typing State

Identical to FB-FORM-1 except:

- Textarea contains user text (< 10 characters)
- Character hint changes to **"N more characters needed"** in `--ink-3`
- Submit remains disabled

---

### 3.4 FB-FORM-3 — Valid State (Ready to Submit)

Identical to FB-FORM-1 except:

- Textarea contains ≥ 10 characters of user text
- Character hint hidden (no longer needed)
- **Submit button is enabled** — full opacity, violet glow shadow active

---

### 3.5 FB-FORM-4 — Screenshot Attached

When a screenshot is attached, the attach button is replaced by a preview:

```
.feedback-attach-preview
├── img.feedback-attach-preview__thumb      (64×64, border-radius: 8px, object-fit: cover)
├── .feedback-attach-preview__name          ("screenshot.jpg", --ink-2, 12px)
└── button.feedback-attach-preview__remove  ("×", --ink-3, 16px)
```

```css
.feedback-attach-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--surface-2);
  border-radius: 12px;
  margin-bottom: 20px;
}
.feedback-attach-preview__thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}
.feedback-attach-preview__name {
  flex: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  color: var(--ink-2);
}
.feedback-attach-preview__remove {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--surface-3);
  border-radius: 50%;
  color: var(--ink-2);
  font-size: 14px;
  cursor: pointer;
}
.feedback-attach-preview__remove:hover {
  background: var(--rose-soft);
  color: var(--rose);
}
```

**Behavior:** Tapping "×" removes the screenshot and restores the `.feedback-attach-btn`.

---

### 3.6 FB-FORM-5 — Context Expanded

When "Show device info" is tapped, the context section expands below the toggle:

```
.feedback-context-toggle  ("Hide device info", ▲)
.feedback-context-body
├── .feedback-context-field
│   ├── .feedback-context-field__label   "SCREEN"        (--ink-3, 11px 700, ALL CAPS)
│   └── .feedback-context-field__value   "/routines"     (--ink-2, 12px 400)
├── .feedback-context-field
│   ├── .feedback-context-field__label   "APP VERSION"
│   └── .feedback-context-field__value   "0.8.0"
├── .feedback-context-field
│   ├── .feedback-context-field__label   "DEVICE"
│   └── .feedback-context-field__value   "iOS 18.3, Capacitor 6.x"
├── .feedback-context-field
│   ├── .feedback-context-field__label   "USER"
│   └── .feedback-context-field__value   "Christian"
└── .feedback-context-field  (conditional — only if errors exist)
    ├── .feedback-context-field__label   "RECENT ERRORS"
    └── .feedback-context-field__value   "TypeError: Cannot read…"  (truncated, up to 3)
```

```css
.feedback-context-body {
  padding: 12px;
  padding-top: 0;
  background: var(--surface-2);
  border-radius: 0 0 12px 12px;
  margin-top: -12px;  /* merge with toggle visually */
  margin-bottom: 20px;
}
.feedback-context-toggle.expanded {
  border-radius: 12px 12px 0 0;
  margin-bottom: 0;
}
.feedback-context-field {
  padding: 8px 0;
  border-bottom: 1px solid var(--ink-4);
}
.feedback-context-field:last-child {
  border-bottom: none;
}
.feedback-context-field__label {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 2px;
}
.feedback-context-field__value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
  word-break: break-word;
}
```

**Toggle behavior:** Label changes to "Hide device info", chevron rotates 180°. Tapping again collapses the section with a smooth height transition (200ms ease).

---

### 3.7 FB-FORM-6 — Submitting State

Identical to FB-FORM-3 except:

- Submit button text changes to a **loading spinner** (small, white, 16px) with no text
- Submit button is disabled during submission
- All form fields are disabled / non-interactive
- No opacity change on the form itself — only the button indicates loading

---

### 3.8 FB-FORM-7 — Error State

On submission failure, an error banner appears **above the submit button**:

```
.feedback-error
├── "Something went wrong — please try again."  (--rose, 13px 500)
```

```css
.feedback-error {
  padding: 12px 14px;
  background: var(--rose-soft);
  border-radius: 10px;
  margin-bottom: 12px;
}
.feedback-error__text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--rose);
}
```

**Behavior:** The form remains open and editable. The user can fix their input or retry. The error banner dismisses when the user begins editing the description.

---

### 3.9 FB-TOAST-1 — Success Toast

After successful submission, the form navigates back to `/settings` and a toast appears at the bottom of the screen:

```
.feedback-toast
├── .feedback-toast__stripe              (4px left accent, --mint)
├── .feedback-toast__icon   ✓            (--mint)
└── .feedback-toast__text                "Thanks — your feedback helps us improve Olivia."
```

```css
.feedback-toast {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));  /* above bottom nav */
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: var(--surface);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
  border-left: 4px solid var(--mint);
  z-index: 1000;
  animation: feedback-toast-in 300ms ease forwards;
}
.feedback-toast__icon {
  color: var(--mint);
  font-size: 18px;
  font-weight: 700;
}
.feedback-toast__text {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

@keyframes feedback-toast-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Duration:** Toast auto-dismisses after **3 seconds** with a fade-out animation (200ms).

---

## 4. Interaction Rules

| Interaction | Behavior |
|---|---|
| Tap "Send Feedback" in Settings | Navigate to `/settings/feedback` |
| Tap category pill | Select that category, deselect others (single-select) |
| Type in description | Live character count until 10-char minimum met |
| Tap "Attach Screenshot" | Open device image picker (camera roll / files) |
| Tap "×" on screenshot preview | Remove attachment, restore attach button |
| Tap "Show device info" | Expand context section, toggle label to "Hide device info" |
| Tap "Submit Feedback" (enabled) | Disable form, show loading spinner, POST to API |
| Submission success | Navigate back to `/settings`, show toast for 3 seconds |
| Submission failure | Show error banner above submit, re-enable form |
| Tap "← Settings" back button | Navigate back to `/settings` (discard any form content) |
| iOS swipe-back gesture | Same as back button — navigate to `/settings` |

---

## 5. Dark Mode Notes

All tokens used in this spec resolve automatically in dark mode via the existing `[data-theme='dark']` CSS custom properties. No manual overrides needed.

Key dark mode behaviors:
- Form background: `--bg` → `#12101C`
- Card/input surfaces: `--surface` → `#1C1A2E`
- Context section: `--surface-2` → `#242038`
- Text automatically inverts via `--ink` and `--ink-2` tokens
- Violet accent unchanged across modes
- Toast shadow uses stronger dark-mode `--shadow-md` value
- Focus ring (`--violet-glow`) is stronger in dark mode (0.3 vs 0.18 opacity)

---

## 6. Accessibility

| Requirement | Implementation |
|---|---|
| Touch targets | All interactive elements ≥ 44px × 44px tap area |
| Focus management | On route entry, focus moves to the description textarea |
| Keyboard navigation | Tab order: category pills → textarea → attach → context toggle → submit |
| Screen reader | Category pills use `role="radiogroup"` with `aria-label="Feedback category"` |
| Description field | `aria-label="Describe what happened"`, `aria-required="true"` |
| Submit button | `aria-disabled="true"` when description is under 10 characters |
| Color contrast | All text meets WCAG AA (4.5:1 for body text, 3:1 for large text) — verified by design token values |
| Error announcement | Error banner uses `role="alert"` for screen reader announcement |

---

## 7. Edge Cases

| Case | Behavior |
|---|---|
| User navigates away mid-form | Form state is discarded — no draft saving in Phase 1 |
| Screenshot > 1MB | Show inline error below attach button: "Image must be under 1MB" (rose text) |
| No network on submit | Error banner: "No internet connection — please try again." |
| Error capture pipeline unavailable | "Recent Errors" field in context shows "None captured" instead of empty |
| Description exactly 10 characters | Submit enables — 10 is the minimum, not a suggestion for more |
| Very long description | Textarea grows vertically (resize: vertical). No character maximum in Phase 1 |

---

## 8. Implementation Checklist

- [ ] Add `.feedback-row` to Settings page (after Notifications section)
- [ ] Create `/settings/feedback` route with `.feedback-screen` container
- [ ] Implement category pill selector with `.ftab`-pattern styling
- [ ] Implement description textarea with validation (10-char minimum)
- [ ] Implement screenshot attachment with device picker + thumbnail preview
- [ ] Implement collapsible context section with auto-filled device info
- [ ] Implement submit button with loading and disabled states
- [ ] Implement success toast with auto-dismiss
- [ ] Implement error banner for submission failures
- [ ] Wire back navigation using `.rem-detail-back` pattern
- [ ] Verify all CSS renders correctly in both light and dark modes
- [ ] Verify all interactive elements meet 44px minimum touch target
- [ ] Verify WCAG AA color contrast on all text elements
