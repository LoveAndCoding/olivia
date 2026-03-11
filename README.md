# Olivia

Olivia is a local-first household command center designed to reduce the mental tax of managing day-to-day life. It is being defined and built as an agentic project, with durable documentation intended to help future agents and collaborators pick up context quickly and make good decisions without rediscovering product intent from scratch.

## Current Status
The project now includes the first runnable implementation of the shared household inbox workflow alongside the documentation system that defines product intent and constraints.

The current direction is:
- focused household coordination rather than a general-purpose assistant
- advisory-only behavior in the first major phase
- local-first handling of logic and sensitive household information
- a documentation-first workflow that supports agentic iteration

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

## Documentation Map

### Start Here
- `docs/vision/product-vision.md` for the core product thesis, users, outcomes, and non-goals
- `docs/vision/product-ethos.md` for trust model, product principles, and behavioral boundaries
- `docs/strategy/agentic-development-principles.md` for the agentic documentation standard and PM operating model
- `docs/strategy/interface-direction.md` for the current MVP interface recommendation and revisit triggers

### Product Direction
- `docs/roadmap/roadmap.md` for the broader, future-looking product trajectory
- `docs/roadmap/milestones.md` for evidence-based readiness gates before advancing phases

### Durable Project Memory
- `docs/learnings/README.md` for how project memory should be maintained
- `docs/learnings/assumptions-log.md` for active assumptions and validation paths
- `docs/learnings/learnings-log.md` for durable lessons over time
- `docs/learnings/decision-history.md` for important decisions and rationale

### Planning System
- `docs/specs/spec-template.md` for future feature specs
- `docs/glossary.md` for stable product and project terminology

## How To Use This Repo
- Read the vision and ethos docs before proposing new work.
- Check the roadmap and milestones before suggesting sequencing or readiness claims.
- Review the learnings and decision history before reopening settled debates.
- Use the spec template for any feature that may move toward implementation.
- Treat durable docs as the source of truth over transient conversation history.

## Near-Term Goal
The near-term goal is to validate the shared household inbox in real household use, capture learnings about durability, signal quality, and notification posture, and then decide what the next coordination slice should be.
