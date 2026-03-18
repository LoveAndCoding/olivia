# Feature Spec: PWA Native Feel

## Status
- Approved

## Summary
Make Olivia's PWA feel indistinguishable from a native app when installed on a mobile device. This spec consolidates platform-level polish — zoom prevention, full safe-area coverage, overscroll refinement, offline resilience, and auto-update visibility — into a single deliverable. The goal is that a household member using Olivia from their home screen never encounters a browser-like behavior that breaks the native illusion.

## User Problem
- PWA users on iOS and Android can encounter browser-like behaviors (pinch zoom, rubber-band overscroll on some surfaces, text selection on UI chrome) that break the mental model of "this is an app."
- Safe-area insets are only applied to the bottom nav; content near notches, status bars, or rounded corners may be clipped or feel cramped.
- When the app updates in the background, there is no user-visible indication — the household may run stale code without knowing an update is available.
- These friction points individually are small but collectively undermine Olivia's "calm competence" ethos.

## Target Users
- Primary user: the stakeholder using Olivia as an installed PWA on their phone.
- Secondary user: the spouse, also using a home-screen install.

## Desired Outcome
Olivia feels like a polished native app on every interaction — no accidental zooms, no clipped content near device edges, no stale cached behavior, and no browser affordances leaking through.

## In Scope

### 1. Zoom Prevention
- Set viewport meta to prevent user scaling: `maximum-scale=1.0, user-scalable=no`.
- This is acceptable because Olivia targets latest Safari/Chrome on known devices and the UI is designed at a readable scale. Accessibility zoom remains available through OS-level accessibility settings, which override the viewport meta.

### 2. Comprehensive Safe-Area Coverage
- Apply `env(safe-area-inset-*)` to all edge-touching layout surfaces, not just bottom nav.
- Top: page header / status bar area should respect `safe-area-inset-top`.
- Left/right: full-bleed backgrounds and content containers should respect `safe-area-inset-left` and `safe-area-inset-right` on landscape or rotated devices.
- Bottom: already implemented on bottom nav; verify coverage on modal sheets, action drawers, and any future full-screen overlays.

### 3. Overscroll and Scroll Behavior Hardening
- `overscroll-behavior: none` is already on `html` — verify it prevents pull-to-refresh gesture in standalone mode on both iOS and Android.
- Apply `overscroll-behavior: contain` on scrollable sub-containers (lists, detail views) so scroll doesn't chain to the body.
- Prevent iOS bounce on fixed-layout pages where scrolling is not intended.

### 4. Touch Behavior Polish
- Extend `touch-action: manipulation` to all interactive elements (buttons, links, cards, nav items) — currently only applied to a few list-specific elements.
- Ensure `-webkit-tap-highlight-color: transparent` is globally applied (currently on reset — verify no overrides).
- Prevent long-press context menus on UI chrome elements (not on user content like notes or text fields where selection is useful).
- Prevent text selection via `user-select: none` on UI chrome (navigation, headers, cards, buttons) while preserving `user-select: text` on content areas (item descriptions, notes, chat messages).

### 5. Auto-Update Visibility
- Replace silent auto-update with a lightweight update prompt.
- When a new service worker is waiting, show a non-blocking toast or banner: "Update available — tap to refresh."
- Tapping the prompt activates the waiting service worker and reloads the page.
- The prompt should be dismissible and reappear on next app open if not acted on.
- Do not force-reload or interrupt active user workflows.

### 6. Standalone Detection and Adaptation
- Detect when Olivia is running in standalone/installed mode via `display-mode: standalone` media query or `navigator.standalone`.
- When in standalone mode, suppress any remaining browser-oriented UI hints (e.g., "Add to home screen" prompts if any exist).
- Use standalone detection as a future hook for adaptive behavior (not required in this phase beyond suppression).

### 7. Offline Resilience Polish
- The offline data layer (IndexedDB + outbox pattern) is already implemented.
- This spec adds: when the device is offline and the user attempts a write, show a brief inline indicator ("Saved offline — will sync when connected") rather than an error.
- Ensure the app shell (navigation, layout, cached data) renders fully offline without a blank screen or loading spinner that never resolves.

## Boundaries, Gaps, And Future Direction
- **Not in scope:** native app wrapper (Capacitor/etc.), background sync API, periodic sync. These remain deferred decisions per the product vision.
- **Not in scope:** landscape-optimized layouts. Safe-area insets should be correct in landscape, but layout redesign for landscape is deferred.
- **Acceptable gap:** iOS Safari has known limitations with service worker lifecycle and update prompts. The update toast is best-effort on iOS; if the platform doesn't support `skipWaiting` reliably, the update will still apply on next full app launch.
- **Future direction:** if standalone detection proves reliable, it could gate features like haptic feedback, status-bar theming, or adaptive navigation patterns.

## Workflow
This is not a user-initiated workflow — these are platform behaviors that apply globally. Implementation is a set of HTML, CSS, and service-worker changes with no new domain entities or API endpoints.

## Behavior
- Zoom: pinch-to-zoom and double-tap-to-zoom are prevented. Font sizes and tap targets remain accessible at 1x scale.
- Safe areas: content never overlaps device chrome (notch, home indicator, rounded corners).
- Overscroll: no pull-to-refresh, no rubber-band beyond intended scroll containers.
- Touch: all tappable elements respond instantly without 300ms delay or tap flash.
- Updates: user is informed when a new version is available and can choose when to apply it.
- Offline: cached data and app shell are always available; queued writes show a brief offline indicator.

## Data And Memory
No new data entities. The service worker cache and IndexedDB schema are unchanged. The update-available state is transient (service worker lifecycle only).

## Permissions And Trust Model
Not applicable — this spec covers platform behavior, not Olivia actions or household data. No trust-model changes.

## AI Role
Not applicable. No AI involvement in platform-level PWA behavior.

## Risks And Failure Modes
- **Zoom prevention and accessibility:** Disabling pinch zoom could be an accessibility concern. Mitigated by: (a) targeting known household devices with OS-level zoom available, (b) designing all UI at readable scale with minimum 44px tap targets. If accessibility feedback surfaces, `user-scalable=no` can be removed without other spec changes.
- **Service worker update bugs:** Aggressive `skipWaiting` can cause page state inconsistencies if old cached assets are referenced by new code. Mitigate with Workbox's built-in precache versioning.
- **iOS PWA limitations:** iOS Safari handles service workers differently from Chrome. Update prompt behavior should degrade gracefully — if the toast can't trigger a controlled reload, the update applies on next launch.

## UX Notes
- The update toast should match Olivia's visual language — not a system alert. Brief, dismissible, low-urgency.
- Offline indicators should be inline and contextual, not a global banner that creates anxiety.
- The overall goal is absence of friction — users should not notice these improvements, they should just stop noticing problems.

## Acceptance Criteria
- [ ] Pinch-to-zoom and double-tap-to-zoom are disabled in standalone mode on iOS Safari and Android Chrome.
- [ ] All four safe-area edges are respected on notched devices (iPhone with Dynamic Island, etc.) — no content clipped behind device chrome.
- [ ] Pull-to-refresh is prevented in standalone mode on both platforms.
- [ ] Scrollable sub-containers (item lists, routine lists, shared lists) do not chain scroll to the body.
- [ ] All interactive elements use `touch-action: manipulation` — no 300ms tap delay.
- [ ] Long-press context menu is suppressed on UI chrome (nav, headers, buttons, cards).
- [ ] Text selection is prevented on UI chrome but allowed on user content fields.
- [ ] When a new service worker is waiting, a dismissible update toast appears.
- [ ] Tapping the update toast activates the new service worker and reloads.
- [ ] When offline, attempting a write shows an inline "saved offline" indicator instead of an error.
- [ ] The app shell renders fully when launched offline with cached data.
- [ ] All component class names have corresponding CSS styles; no unstyled components ship.
- [ ] `npm run typecheck` passes with zero errors.

## Validation And Testing
- Manual testing on iOS Safari (standalone) and Android Chrome (standalone) on physical devices.
- Verify zoom prevention by attempting pinch and double-tap gestures.
- Verify safe-area coverage by inspecting on a notched device or simulator with safe-area overlays enabled.
- Verify offline behavior by toggling airplane mode and navigating / attempting writes.
- Verify update toast by deploying a new build and checking for the prompt before reloading.
- Unit test: service worker registration logic for update-available detection.
- Visual regression: confirm no layout shifts from safe-area padding changes.

## Dependencies And Related Learnings
- Existing service worker: `apps/pwa/src/sw.ts` (Workbox injectManifest)
- Existing offline layer: `apps/pwa/src/lib/client-db.ts`, `apps/pwa/src/lib/sync.ts`
- Existing viewport config: `apps/pwa/index.html`
- Existing PWA manifest: `apps/pwa/vite.config.ts` (VitePWA plugin)
- Existing styles: `apps/pwa/src/styles.css`

## Open Questions
- None. All items are well-understood platform behaviors with clear implementation paths. The task owner confirmed latest Safari and very recent browser features can be assumed.

## Facts, Assumptions, And Decisions
- **Fact:** Olivia targets latest Safari and very recent browser features per task owner direction.
- **Fact:** The PWA already has standalone display mode, overscroll prevention, basic safe-area support, and a Workbox service worker.
- **Assumption:** All household members use the PWA as a home-screen install, not in a browser tab.
- **Decision:** Zoom prevention is acceptable given the known-device context and OS-level accessibility escape hatch.
- **Decision:** Update prompt is user-initiated (tap to apply) rather than auto-reload, to avoid interrupting active workflows — consistent with the "calm competence" ethos.

## Deferred Decisions
- Native app wrapper (Capacitor, TWA) — remains deferred per product vision.
- Background Sync API and Periodic Sync — deferred until offline usage patterns are better understood.
- Landscape-optimized layouts — safe-area support only, no layout changes.
- Haptic feedback or advanced standalone-only features — deferred pending standalone detection validation.
