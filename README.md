# Olivia

Olivia is a local-first household command center designed to reduce the mental tax of managing day-to-day life. It is being defined and built as an agentic project, with durable documentation intended to help future agents and collaborators pick up context quickly and make good decisions without rediscovering product intent from scratch.

## Current Status

Olivia is at **v0.6.0** and in active household use. The product surface includes:

- **Shared household inbox** — capture, review, and manage household items
- **First-class reminders** — with date/time picker and snooze
- **Shared lists** — with completed-item management (clear completed, uncheck all)
- **Recurring routines** — with flexible scheduling and "last done" tracking
- **Meal planning** — weekly meal plan with grocery list integration
- **Unified weekly view** — see everything happening across the household this week
- **Activity history** — timeline of household actions
- **Planning rituals** — AI-assisted weekly planning summaries
- **Proactive nudges** — context-aware household reminders via push notifications
- **Push notifications** — native iOS delivery via VAPID + service worker
- **AI chat** — conversational interface powered by Claude (advisory-only)

The current milestone (M30) focuses on **stability and feature depth** — making the existing surface reliable enough for sustained daily use before adding new features.

Core principles:
- Focused household coordination, not a general-purpose assistant
- Advisory-only AI behavior — Olivia suggests, never acts unilaterally
- Local-first: logic and sensitive household data stay on-device
- Documentation-first workflow supporting agentic iteration

## Workspace Layout
- `apps/pwa`: React + Vite installable PWA for capture, review, item detail, role switching, and settings
- `apps/api`: Fastify + SQLite API for approval-gated writes, history, and notification subscription storage
- `packages/domain`: deterministic inbox rules for parsing, status updates, stale detection, suggestions, and offline-safe write shaping
- `packages/contracts`: shared Zod schemas and API payload contracts

## Top-Level Scripts
- `npm run dev`: start the API and PWA together for local development
- `npm run typecheck`: run TypeScript checks across all apps and packages
- `npm run lint`: lint the workspace
- `npm test`: run domain, API, and Playwright end-to-end coverage
- `npm run build`: produce production builds for all apps and packages

## iOS (Capacitor)

The PWA is wrapped with [Capacitor](https://capacitorjs.com/) for native iOS distribution.

### Prerequisites
- macOS with Xcode 16+ installed
- CocoaPods is **not** required — the project uses Swift Package Manager

### Local Dev Workflow
```bash
# 1. Build the web assets
npm run build -w @olivia/pwa

# 2. Sync web assets into the native project
npm run cap:sync -w @olivia/pwa

# 3. Open the Xcode project
npm run cap:open -w @olivia/pwa
```

From Xcode, select an iOS Simulator target and press **Cmd+R** to run.

For iterative development, you can point Capacitor at the Vite dev server instead of
the bundled assets. Uncomment the `server.url` line in `apps/pwa/capacitor.config.ts`,
then run `npm run dev` and open Xcode.

### One-Step Build + Sync
```bash
npm run cap:build -w @olivia/pwa
```

### CI
The `ios.yml` GitHub Actions workflow builds the iOS project on every PR that touches
`apps/pwa/`, `packages/`, or `package-lock.json`.

## Documentation Map

### Start Here
- `docs/vision/product-vision.md` — core product thesis, users, outcomes, and non-goals
- `docs/vision/product-ethos.md` — trust model, product principles, and behavioral boundaries
- `docs/strategy/agentic-development-principles.md` — agentic documentation standard and PM operating model
- `docs/strategy/interface-direction.md` — current interface direction and revisit triggers
- `docs/strategy/system-architecture.md` — technical architecture overview

### Product Direction
- `docs/roadmap/roadmap.md` — broader, future-looking product trajectory
- `docs/roadmap/milestones.md` — evidence-based readiness gates before advancing phases

### Feature Specs
- `docs/specs/` — feature specifications (inbox, reminders, lists, routines, meal planning, chat, push, AI, etc.)
- `docs/plans/` — implementation plans and visual implementation specs

### Design
- `docs/vision/design-foundations.md` — design system foundations (spacing, color, typography)
- `docs/vision/design-components.md` — reusable UI component patterns
- `docs/vision/design-screens.md` — screen-level layout references
- `docs/brand/` — brand identity (essence, tone, color palette, typography, logo)

### Durable Project Memory
- `docs/learnings/README.md` — how project memory is maintained
- `docs/learnings/assumptions-log.md` — active assumptions and validation paths
- `docs/learnings/learnings-log.md` — durable lessons over time
- `docs/learnings/decision-history.md` — important decisions and rationale

### Reference
- `docs/glossary.md` — stable product and project terminology
- `docs/release-policy.md` — versioning and release process
- `docs/git-worktrees.md` — git worktree setup for parallel development

## How To Use This Repo
- Read the vision and ethos docs before proposing new work.
- Check the roadmap and milestones before suggesting sequencing or readiness claims.
- Review the learnings and decision history before reopening settled debates.
- Use the spec template (`docs/specs/spec-template.md`) for any feature moving toward implementation.
- Treat durable docs as the source of truth over transient conversation history.
