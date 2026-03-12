# Olivia Home Screen Reference State

## Purpose
This document gives implementers a durable, screenshot-independent reference for the Olivia `Home` screen redesign target.

Use this when:

- the stakeholder-provided screenshot is not available in the current session
- an implementation agent needs a binding visual target from repository docs alone
- reviewers need to decide whether the runtime `/` route is visually complete without reopening chat history

Read this alongside:

- `docs/vision/olivia-prototype.html`
- `docs/vision/design-foundations.md`
- `docs/vision/design-components.md`
- `docs/vision/design-screens.md`
- `docs/vision/design-motion-voice.md`
- `docs/vision/design-checklist.md`

## Facts
- The redesign request names the rendered light-mode Home screen as the main visual target for the runtime `/` route.
- The stakeholder-provided screenshot is not currently stored in `docs/`.
- `docs/vision/olivia-prototype.html` contains the closest existing in-repo rendered reference state for the `Home` screen.
- `docs/vision/design-screens.md` says a real PWA should not render a fake status bar in production, while prototypes and design files may mock a 44px status bar.

## Decisions
- The binding no-screenshot implementation target for `/` is the `screen-home` state in `docs/vision/olivia-prototype.html`, plus the clarifications in this document.
- Prototype-fidelity sign-off is required for the four primary tab surfaces only: `Home`, `Tasks`, `Olivia`, and `Memory`.
- `item detail`, `settings`, and `re-entry` may remain implementation-supporting routes during the redesign, but they must be hidden from primary navigation and are not blockers for prototype-fidelity sign-off.
- For the runtime application, preserve top safe-area spacing and the Home composition from the prototype, but do not require a fake in-app status bar row unless product docs are later updated to make it a runtime requirement.
- A durable visual reference asset should be added at `docs/vision/home-screen-light-reference.png` or `docs/vision/home-screen-light-reference.webp` when available. Until that asset exists, this document plus `docs/vision/olivia-prototype.html` are the visual source of truth for the Home route.

## Home Route Reference State
Treat the following as the canonical seeded visual state for the Home route when implementing or reviewing without the screenshot.

### Header
- Wordmark: `olivia`
- Avatar stack:
  - primary operator avatar: `L`
  - spouse avatar: `A`
- Greeting:
  - first line: `Good morning,`
  - second line: `Lexi.`
- Subtitle: `Thursday, March 12 · 3 things need you today`

### Olivia Nudge Card
- Eyebrow: `Olivia noticed`
- Message: `"The plumber hasn't replied in 3 days. Want me to draft a follow-up for you?"`
- Primary CTA: `✍️ Yes, draft it`
- Secondary CTA: `Later`
- Visual treatment must follow the nudge-card rules in `design-components.md` and `design-checklist.md`.

### Needs Doing
Show exactly three summary cards in this seeded reference state, in this order:

1. `Follow up on plumber quote`
   - metadata: `Added 3 days ago · no reply`
   - badge: `Overdue`
   - left accent: rose

2. `Pick up dry cleaning`
   - metadata: `Due tomorrow, Mar 14`
   - badge: `Soon`
   - left accent: peach

3. `Renew car registration`
   - metadata: `Mar 31 · Alexander`
   - badge: `Shared`
   - left accent: mint

Section header:
- title: `Needs doing`
- trailing action: `All tasks →`

### Coming Up
Section title:
- `Coming up`

Seed the horizontal event strip with these tiles in this order:

1. `14 Mar` — `HVAC service visit` — `10:00 – 12:00`
2. `15 Mar` — `Jordan's birthday dinner` — `7:00 PM · River North`
3. `18 Mar` — `Vet — Luna annual` — `2:30 PM · Dr. Patel`
4. `31 Mar` — `Car registration due` — `Don't forget!`

The fourth event may be partially visible at 390px width. That is acceptable and consistent with the prototype HTML reference.

### Bottom Navigation
The runtime Home route must render the four-tab bottom nav in this order:

1. `Home`
2. `Tasks`
3. `Olivia`
4. `Memory`

On `/`, `Home` is active.

## Runtime Clarifications
### Status bar behavior
- In static mocks, prototypes, and durable screenshot assets, a 44px mocked status bar is acceptable.
- In the runtime app, match the visual spacing and safe-area handling of the prototype, but do not treat a fake app-rendered status bar as a completion requirement.

### Data binding versus seeded demo state
- The runtime Home route should be powered by real or derived application data.
- For visual acceptance, implementers should provide a seeded demo state capable of reproducing the exact reference content listed above.
- If live data differs during development, compare the route against this seeded state rather than treating arbitrary dev data as the intended final composition.

### Above-the-fold priority
At mobile width, the Home route should prioritize:

- greeting and subtitle
- the full nudge card
- the `Needs doing` header and three task summaries
- the fixed bottom nav

The `Coming up` section may appear immediately below or just after a small vertical scroll depending on browser chrome and safe-area behavior. This does not block acceptance if the hierarchy remains consistent with the design docs.

## Route Scope Clarification
The following routes require prototype-fidelity styling and design-checklist sign-off:

- `/`
- `/tasks`
- `/olivia`
- `/memory`

The following routes may remain support routes during the redesign and should be token-compliant, but do not need screenshot-level fidelity before the redesign is considered complete:

- `/items/$itemId`
- `/settings`
- `/re-entry`

## Verification Use
An implementer without the screenshot should be able to answer these questions from repo docs alone:

- What should the `/` route contain?
- In what order should the seeded demo content appear?
- Which routes require prototype-fidelity polish?
- Whether a fake status bar is required in the runtime app?

If any of those answers still require chat history, the redesign docs are incomplete and should be updated before implementation proceeds.
