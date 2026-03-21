# Feature Spec: Monthly Check-In Design Update

> **Historical document.** This was a one-time styling task (OLI-128), not a feature spec. Work is complete. Preserved for reference only.

## Status
- Implemented (OLI-128, commit 2a82e5e). Health check card and review screen styled per visual spec.

## Summary
The monthly health check card and review screen were implemented with complete functionality (JSX, API integration, client state) but shipped without CSS styling. The card appears unstyled on the homepage — unstyled buttons, no alignment with other cards, no visual distinction. Additionally, the JSX structure diverges from the approved visual implementation spec in several places. This spec defines the concrete changes needed to bring both surfaces into visual conformance with `docs/plans/data-freshness-visual-implementation-spec.md` and ensure the health check feels calm, polished, and unobtrusive on the home screen.

## User Problem
- The health check card on the homepage looks like unstyled HTML — raw buttons, no card background, no borders, no spacing. It visually breaks the homepage flow next to polished nudge cards and workflow sections.
- The health check review screen (`/health-check`) is similarly unstyled — item rows lack card treatment, section headers lack the visual hierarchy, and the completion celebration has no polish.
- The card doesn't feel "ignorable" in its current state — its visual brokenness draws attention for the wrong reason, and there's no × dismiss to quickly clear it without using the "Not now" button.

## Target Users
- Primary user: stakeholder (sees the health check card on home screen monthly)
- Secondary user: spouse (sees the same home screen)

## Desired Outcome
- The health check card looks like a natural, calm part of the home screen — visually consistent with other cards, clearly identifiable as informational (sky accent), and easy to dismiss or engage with.
- The health check review screen feels polished: items are readable, grouped clearly, actions are easy to tap, and completion feels rewarding.
- Both surfaces match the approved visual implementation spec.

## In Scope

### 1. Home Screen Health Check Card — JSX Updates
The current card structure needs to be updated to match the visual spec (§2):

- **Add sky left-accent stripe**: 3px `var(--sky)` left border on the card
- **Replace text eyebrow with icon container**: Replace `✦ Monthly check-up` with a `32×32px` icon container (`--sky-soft` background, stethoscope/pulse icon in `--sky`) plus "Monthly check-up" title text
- **Add × dismiss button**: Replace "Not now" secondary button with a `20px` × glyph in the card header (40×40px touch target). The dismiss behavior is unchanged (calls `dismissHealthCheck()`)
- **Change primary button**: Replace split "Review →" / "Not now" buttons with a single full-width "Review now →" button
- **Partial progress copy**: When `healthCheckProgressCount > 0`, change copy to `"{N} items left to review"` and button to `"Continue →"`

### 2. Home Screen Health Check Card — CSS
Add all missing CSS definitions for `.health-check-card` and children. Token usage per visual spec §2.1:

| Element | Token(s) |
|---|---|
| Card background | `--surface` |
| Card border | `1.5px solid var(--ink-4)` |
| Card border-radius | `18px` |
| Card shadow | `--shadow-sm` |
| Card padding | `14px 16px` |
| Left accent stripe | `3px solid var(--sky)` (via `border-left`) |
| Icon container | `32×32px`, `border-radius: 12px`, `background: var(--sky-soft)` |
| Icon | `color: var(--sky)`, 18px |
| Title | 14px PJS semibold, `color: var(--ink)` |
| Description | Fraunces italic 15px, `color: var(--ink)` |
| Dismiss × | 20px, `color: var(--ink-3)`, 40×40px touch target |
| Primary button | full-width `.btn-primary`, `background: var(--violet)`, `color: white`, `border-radius: 12px`, 44px height |

### 3. Health Check Review Screen — CSS
Add all missing CSS for `.health-check-page` and children. Token usage per visual spec §3:

- **Page**: `background: var(--bg)`, full-height
- **Header**: back button (`--violet-text`, 44px tap target), title (Fraunces 700 22px, `--ink`)
- **Intro text**: Fraunces italic 15px, `color: var(--ink)`, 22px horizontal padding
- **Section labels**: PJS 10px/700, uppercase, `letter-spacing: 1.4px`, `color: var(--ink-2)`
- **Item cards**: `--surface` background, `1.5px solid var(--ink-4)` border, `16px` border-radius, `--shadow-sm`
- **Item icon containers**: type-colored backgrounds per visual spec §3.5 (mint/rose/peach/lavender/sky)
- **Action buttons**: "Still active" (`--violet` bg, white text), "Archive" (`--lavender-soft` bg, `--violet` text), both 40px min-height, 8px gap
- **Overflow note**: `--surface-2` bg, `14px` border-radius, Fraunces italic 14px
- **Completion state**: centered layout with Olivia orb or CheckCircle (48px), Fraunces 700 24px title, Fraunces italic 15px subtext, fadeUp entry animation with stagger
- **Archive confirmation**: backdrop overlay, sheet card with title, body, Cancel/Archive buttons (Archive in `--rose`)

### 4. Animations and Motion
Per visual spec §7:

- Health check card entry: `fadeUp` (opacity 0→1, translateY 12→0), 250ms ease-out
- Health check screen entry: standard `screenIn`, items stagger at 50ms intervals
- "Still active" tap: checkmark flash (200ms) → card collapse (250ms ease-out)
- Archive confirm: action row crossfade (150ms)
- Completion celebration: orb/title/subtext/button stagger `fadeUp` at 80ms intervals
- `prefers-reduced-motion`: all animations degrade to instant show/hide

### 5. Dark Mode
All surfaces theme automatically via CSS variable tokens. No explicit overrides required. Key shifts documented in visual spec §6 — `--sky-soft` shifts from `#E0F7FC` to `#0A2228`, all other tokens resolve correctly.

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- Freshness nudge card styling (these already use the nudge card pattern and should be addressed separately if needed)
- Behavioral changes to the health check flow — this is a visual-only update
- Adding the "Edit →" tertiary action to item rows (visual spec §3.6 includes it, but the current JSX only has "Still active" and "Archive" — deferring edit to avoid scope creep in this pass)

**Acceptable gap:**
- The "Edit →" deep-link button is defined in the visual spec but not in the current JSX. Adding it is a separate task if desired.

**Future direction:**
- Transition archive confirmation from bottom-sheet modal to inline card replacement (visual spec §4.2 defines the inline pattern, but the current JSX uses a modal overlay — either approach works, inline is preferred)

## Workflow
1. Designer reviews the existing visual implementation spec for any needed adjustments given current JSX structure
2. Founding Engineer implements CSS definitions for all referenced classes
3. Founding Engineer updates JSX structure for the home screen card (icon container, × dismiss, full-width button)
4. VP of Product validates the implementation against the visual spec acceptance criteria

## Behavior
Not applicable — this spec covers visual and structural changes only. All behavioral logic (dismiss, still-active, archive, health check state) is already implemented and validated (D-059).

## Data And Memory
Not applicable — no data model changes. All API endpoints and client state management are already implemented.

## Permissions And Trust Model
This feature remains **advisory-only**. No trust model changes. All existing permission behaviors are preserved:
- Health check card dismiss executes immediately (non-destructive user action)
- "Still active" executes immediately (non-destructive user action)
- "Archive" always requires confirmation (destructive action)

## AI Role
Not applicable — no AI involvement in this visual update. The health check is a simple list review with no AI dependencies.

## Risks And Failure Modes
- **Card becomes too prominent**: If the styled card is too visually heavy, it could feel like a nag. Mitigation: sky accent reads as informational/calm per visual spec decision §0.2; the × dismiss keeps it easy to clear.
- **Animation performance on older devices**: Complex stagger animations may cause jank. Mitigation: `prefers-reduced-motion` support degrades all animations to instant.
- **JSX restructuring breaks existing health check behavior**: Changing the card structure could introduce bugs. Mitigation: behavioral logic (dismiss, navigate) is independent of card structure; existing API integration tests cover the backend; manual smoke test covers the card.

## UX Notes
- The health check card should feel **calm and informational** — the sky accent distinguishes it from action-required nudge cards (violet) and workflow-type nudges (mint, rose, violet)
- The × dismiss should be **easy to reach** — 40×40px touch target, positioned top-right
- The review screen should feel **lightweight** — clear section grouping, readable item names, prominent "Still active" button makes the default action obvious
- The completion celebration should feel **rewarding but brief** — a quick "All caught up!" moment, not a fireworks show

## Acceptance Criteria

### Home Screen Card
1. Given the health check card is visible, it renders with `--surface` background, `--ink-4` border, `18px` border-radius, and `--shadow-sm` shadow
2. Given the health check card is visible, it has a `3px solid var(--sky)` left accent stripe
3. Given the health check card is visible, it shows a `32×32px` icon container with `--sky-soft` background and a sky-colored icon
4. Given the health check card is visible, it has a × dismiss button with a 40×40px touch target that calls `dismissHealthCheck()`
5. Given the health check card is visible with no prior progress, it shows "Review now →" as a full-width primary button
6. Given the health check card is visible with partial progress, it shows "{N} items left to review" and "Continue →" as the button copy
7. Given the health check card animates in, it uses `fadeUp` (250ms ease-out) with stagger delay after nudge/AI cards

### Review Screen
8. Given the review screen is open, the page background is `var(--bg)` and the header shows a back button and centered title
9. Given items are displayed, each item renders as a card with `--surface` background, `--ink-4` border, `16px` border-radius
10. Given items are displayed, each item's icon container uses the correct type-colored background (mint for routines, rose for reminders, peach for lists, lavender for inbox, sky for meal plans)
11. Given "Still active" is tapped, the button shows a checkmark flash (200ms) and the card collapses with a height animation (250ms)
12. Given all items are reviewed, the completion state renders centered with the orb/check icon, title, subtext, and button with staggered `fadeUp` entry
13. Given the archive confirmation is shown, the "Archive" button uses `--rose` background

### General
14. Given `prefers-reduced-motion` is active, all animations degrade to instant show/hide
15. Given dark mode is active, all surfaces render correctly using CSS variable token shifts (no explicit overrides)

## Validation And Testing
- **Visual regression**: Side-by-side comparison of implemented card against visual spec wireframes (§2.1, §2.2)
- **Manual smoke test**: Open the app with health check due, verify card renders correctly, tap through review flow, verify completion state
- **Dark mode validation**: Toggle dark mode and verify all surfaces render correctly — especially sky-soft icon containers and card borders
- **Reduced motion**: Enable `prefers-reduced-motion` and verify no animations play
- **Household observation**: After deployment, observe whether the stakeholder notices and interacts with the health check card naturally, or finds it intrusive

## Dependencies And Related Learnings
- **D-058**: Phase 2 Data Freshness spec approved — defines the behavioral requirements this visual update supports
- **D-059**: Phase 2 implementation validated — confirms all functional behavior is correct; this spec addresses the visual gap
- **D-055**: Today-Forward home screen layout — the health check card lives on this surface and must visually integrate with it
- **Visual implementation spec**: `docs/plans/data-freshness-visual-implementation-spec.md` — the authoritative visual reference for all token usage, spacing, and animation details

## Open Questions
None — the visual spec is comprehensive and the behavioral implementation is validated. This is execution work.

## Facts, Assumptions, And Decisions
- **Fact**: All health check behavioral logic is implemented and validated (D-059, 57 tests passing)
- **Fact**: Zero CSS definitions exist for any `.health-check-*` class referenced in the JSX
- **Fact**: The current JSX card structure (two buttons, text eyebrow) diverges from the visual spec (full-width button, icon container, × dismiss)
- **Decision**: Defer adding the "Edit →" tertiary action to item rows — this is a separate scope item
- **Decision**: Accept either the current modal overlay or the visual spec's inline pattern for archive confirmation — the engineer may implement whichever is simpler given the existing JSX

## Deferred Decisions
- **Inline archive confirmation vs. modal**: The visual spec defines an inline card replacement pattern (§4.2), but the current JSX uses a modal overlay. Either is acceptable for this pass. If the inline pattern is adopted later, it should be a separate task.
- **"Edit →" tertiary action**: The visual spec includes this in item rows (§3.6). Adding it requires routing to each entity's edit screen. Deferring to avoid scope creep.
- **Freshness nudge card styling**: The visual spec also covers freshness nudge cards (§5). These are out of scope for this task — they may need their own styling pass.
