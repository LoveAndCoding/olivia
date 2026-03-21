# Feature Spec: Landscape Orientation Support

## Status
- Draft

## Summary
Olivia currently renders well only in portrait orientation despite iOS declaring landscape as a supported orientation. When the device rotates to landscape, the 430px max-width app frame sits centered in a wide viewport with unused space on both sides, the bottom nav becomes disproportionately tall relative to the narrower content, and bottom sheets may clip or overflow awkwardly. This spec defines how Olivia should behave in landscape so that users who rotate their device — intentionally or incidentally — get a usable, comfortable experience rather than a broken-feeling one.

## User Problem
- A household member rotates their iPad or iPhone to landscape while using Olivia (e.g., device propped on a kitchen stand, or casually holding it sideways).
- The current experience is visually broken: the portrait-optimized layout wastes most of the screen width, and interactive elements like bottom sheets and the keyboard may not behave correctly.
- This creates an impression of an unfinished product, undermining the calm competence ethos.

## Target Users
- Primary user: any household member using an iPhone in landscape (less common but not rare — kitchen counter stands, accessibility preferences).
- Secondary user: iPad users, where landscape is a natural default posture.
- Future users: web fallback users on wider browser windows (already partially handled by the 430px max-width, but landscape-specific polish would compound).

## Desired Outcome
- A household member who rotates their device to landscape can continue using Olivia comfortably without needing to rotate back to portrait.
- The layout adapts gracefully: content fills more of the available width where it benefits readability, and navigation remains accessible.
- The experience does not need to be *better* in landscape — just correct and usable.

## In Scope
- CSS and layout adaptations for landscape viewport dimensions (orientation media query or aspect-ratio–based breakpoints)
- Safe area handling in landscape (left and right notch/Dynamic Island insets become material)
- Bottom navigation behavior in landscape
- Bottom sheet behavior and sizing in landscape
- Chat interface (Olivia page) keyboard + input behavior in landscape
- Weekly view and list views — these are read-heavy screens that could benefit from wider layout
- App frame max-width adjustment or removal in landscape

## Boundaries, Gaps, And Future Direction
- **iPad-specific split-view or multitasking layouts**: not in scope. Landscape support means the same app layout adapting to a wider viewport, not a tablet-specific redesign.
- **Sidebar navigation replacing bottom nav**: a future direction worth considering for wider screens, but not in this phase. Bottom nav should remain functional in landscape for consistency.
- **Landscape-only features or screens**: not in scope. Every screen should work in both orientations; no screen should be designed exclusively for landscape.
- **Web desktop layout**: the 430px max-width on desktop web is a separate concern. This spec targets native iOS landscape specifically, though CSS improvements will naturally apply to the web fallback.

## Workflow
This is not a user-initiated workflow — it is a responsive layout behavior. The "flow" is:

1. User is using Olivia in portrait.
2. User rotates device to landscape (or starts a session in landscape).
3. The app layout adapts: content area widens, safe areas adjust, bottom nav remains accessible, bottom sheets resize appropriately.
4. User continues using all features without needing to rotate back.
5. User rotates back to portrait — layout returns to the current portrait design seamlessly.

## Behavior

### App Frame
- In portrait: current behavior (max-width 430px, centered).
- In landscape: the app frame should expand to use more of the available width. Recommendation: increase max-width to a value appropriate for landscape phone viewports (e.g., 720px or remove the cap entirely and let content containers constrain width). The app should remain centered if the viewport exceeds the max-width.

### Bottom Navigation
- In landscape on phone-sized screens, the bottom nav's vertical height becomes more costly (screen height is reduced). Consider reducing nav bar height slightly in landscape (e.g., drop from 66px to 52px + safe area, reduce icon size or remove labels).
- On wider screens (iPad landscape), the bottom nav can retain its current design.
- Safe area insets for left/right must be respected — the notch/Dynamic Island may be on the left or right side in landscape.

### Bottom Sheets
- In landscape, `max-height: 92vh` may still be appropriate, but sheets should not feel like they consume the entire reduced-height screen. Consider capping sheet height at 80vh in landscape.
- Sheet content should remain scrollable.
- Keyboard height tracking (`--keyboard-height`) already adapts dynamically and should continue to work.

### Screen Content
- Read-heavy screens (weekly view, activity history, lists) benefit from the wider layout: grid columns can increase, text line lengths improve.
- The existing `@media (max-width: 480px)` breakpoint for grids should be reviewed — landscape phone viewports may be wider than 480px but have limited height, so grid adjustments should consider both dimensions.
- Form inputs and action buttons should remain comfortably tappable (44px minimum touch target preserved).

### Chat Interface (Olivia Page)
- The message area and input bar should adapt to the wider, shorter viewport.
- The input bar should remain anchored above the keyboard in landscape as it does in portrait.
- Message bubbles may benefit from a max-width constraint so they don't stretch uncomfortably wide in landscape.

### Safe Areas
- `env(safe-area-inset-left)` and `env(safe-area-inset-right)` are already applied to the app frame as padding. These become critical in landscape where the notch or Dynamic Island creates meaningful left/right insets.
- `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` change in landscape — the status bar area may shift. The existing `viewport-fit=cover` meta tag and safe area CSS should handle this automatically, but implementation must verify.

### Ambient Decorations
- The three ambient blob backgrounds (`.ambient-1`, `.ambient-2`, `.ambient-3`) should remain decorative and not overflow in landscape. No functional change needed — `pointer-events: none` and absolute positioning should adapt naturally.

## Data And Memory
- No data or memory implications. This is a pure presentation concern.

## Permissions And Trust Model
- No trust model changes. Landscape support is a layout adaptation, not a feature with agentic behavior.

## AI Role
- No AI involvement. This is a CSS/layout concern.

## Risks And Failure Modes
- **Orientation change during a bottom sheet interaction**: if a sheet is open and the user rotates, the sheet must resize gracefully without losing scroll position or dismissing unexpectedly.
- **Keyboard + landscape on small phones**: the keyboard in landscape on an iPhone already consumes a large portion of the screen. The chat input and bottom sheets must remain usable even when the keyboard is visible in landscape. This is partially mitigated by the existing `--keyboard-height` tracking.
- **Regression in portrait**: all landscape CSS must be scoped to orientation/aspect-ratio media queries so that the existing portrait layout is not affected.
- **iOS rotation animation**: Capacitor's web view handles rotation animations natively. No special handling needed, but the `--vvh` variable must update correctly on orientation change (the existing `visualViewport` resize listener should handle this).

## UX Notes
- The landscape experience should feel like the same app, adapted — not a different layout mode.
- Avoid jarring layout jumps on rotation. CSS transitions on layout properties can smooth the adaptation.
- The priority is correctness and usability, not a landscape-optimized design. The portrait layout is the primary design target; landscape is a graceful adaptation.

## Acceptance Criteria
1. Rotating an iPhone to landscape produces a usable layout — no content overflow, no truncated navigation, no broken scroll.
2. The app frame expands beyond the portrait 430px max-width in landscape to use available horizontal space.
3. Safe area insets (left, right, top, bottom) are respected in landscape — no content hidden behind the notch or Dynamic Island.
4. The bottom navigation remains functional and accessible in landscape, with all five tabs tappable and labels visible.
5. Bottom sheets open and display correctly in landscape without overflowing the reduced-height viewport.
6. The chat interface (Olivia page) input bar remains above the keyboard in landscape.
7. Message bubbles in chat have a max-width constraint so they do not stretch the full width of a landscape viewport.
8. The weekly view and list screens take advantage of the wider viewport (more grid columns or wider content area).
9. All existing acceptance criteria for portrait layouts continue to pass — no portrait regression.
10. Rotating from portrait to landscape (and back) while a bottom sheet is open does not dismiss the sheet or break its layout.
11. The `--vvh` CSS variable updates correctly on orientation change.
12. All component class names introduced for landscape-specific styles have corresponding CSS rules (per D-060).
13. `npm run typecheck` passes with zero errors.

## Validation And Testing
- **Manual validation**: rotate a test device (or simulator) through portrait → landscape → portrait on key screens: home, tasks, Olivia (chat), lists, memory, and the weekly view. Verify each acceptance criterion.
- **Automated**: existing tests should continue to pass (no data layer changes). Consider adding a Storybook viewport for landscape dimensions (e.g., 844×390 for iPhone 14 landscape).
- **Regression protection**: the most important regression to guard against is portrait layout breaking due to landscape CSS leaking outside orientation media queries.

## Dependencies And Related Learnings
- D-060 (spec-level CSS completeness checklist) — applies to any new CSS classes introduced for landscape.
- The existing `viewport-fit=cover` meta tag and safe area CSS variables are foundational and should not be changed.
- iOS Info.plist already declares landscape support — no native configuration change needed.
- Capacitor config has no explicit orientation lock — no native configuration change needed.

## Open Questions
1. **Should the bottom nav switch to a side rail on iPad landscape?** — Recommendation: defer to a future iPad-specific spec. Bottom nav in landscape is fine for Phase 1.
2. **What specific max-width should the app frame use in landscape?** — Founding Engineer decision. Suggestion: 720px on phones, uncapped (with content-level max-widths) on iPad. Could also use a fluid approach with `clamp()`.
3. **Should landscape be tested on iPad as part of this spec?** — Recommendation: yes, at least verify it doesn't break, but iPad-specific layout optimization is deferred.

## Facts, Assumptions, And Decisions
- **Fact**: iOS Info.plist already includes landscape orientation support for both iPhone and iPad.
- **Fact**: Capacitor config does not lock orientation — the web view will rotate with the device.
- **Fact**: the current CSS has zero landscape-specific styles or orientation media queries.
- **Fact**: the app frame uses `max-width: 430px` which creates significant wasted space in landscape.
- **Assumption**: most users will primarily use portrait, so landscape is a graceful-degradation target, not a co-equal design surface.
- **Assumption**: the existing `visualViewport` resize listener will correctly fire on orientation change, keeping `--vvh` accurate.
- **Decision**: bottom nav remains as bottom nav in landscape (no side rail conversion in this phase).

## Deferred Decisions
- iPad-specific layout optimizations (sidebar nav, split view, multitasking).
- Whether landscape should be the *recommended* orientation for any specific screen (e.g., weekly view on iPad).
- Whether to add an orientation lock option in settings for users who prefer portrait-only.
