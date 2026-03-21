# Olivia Interface Direction

## Purpose
This document records the current interface architecture for Olivia so future agents can plan implementation work without reopening surface-selection debates from scratch.

It should be read alongside:
- `docs/vision/product-vision.md`
- `docs/vision/product-ethos.md`
- `docs/strategy/system-architecture.md`
- `docs/learnings/decision-history.md`

## Status
Active. Updated 2026-03-21 to reflect the transition from PWA-first to native iOS app via Capacitor.

## Current Interface Architecture
Olivia is delivered as a **native iOS app via Capacitor** with web fallback. The app is distributed through TestFlight (pre-1.0) and will move to the App Store at public launch.

This means:
- app-shaped UX with native iOS chrome (status bar, safe area, keyboard behavior)
- home screen presence via native app icon (not PWA "Add to Home Screen")
- push notifications via native OS delivery
- offline-tolerant behavior where practical
- the web layer (React + Vite) runs inside Capacitor's WebView, preserving the existing codebase

## How We Got Here
The project originally launched as a PWA (D-007, 2026-03-09). The PWA served well through H2-H5 Phase 2 development. The transition to native iOS happened when multiple "native revisit triggers" from the original interface direction were satisfied:

- Push notifications became central to the product (H5 Phase 2, M24)
- Richer notification workflows (completion-window timing, M27) benefit from native delivery
- The product surface grew substantial enough to justify native app distribution (15+ features across H2-H5)
- TestFlight distribution provides a better update and testing experience than PWA install

The transition was accomplished via Capacitor v8, which wraps the existing React + Vite web layer in a native iOS shell. This preserved 100% of the existing codebase while gaining native capabilities.

## Why Capacitor (Not Fully Native)
Capacitor is the right wrapper for Olivia's current phase:
- the core UI is web-standard React components — no need to rewrite in SwiftUI
- Capacitor plugins provide the native capabilities Olivia needs (push, keyboard, status bar)
- the same codebase can still serve as a web fallback if needed
- iteration speed on the web layer is faster than native development
- if native-only capabilities become critical in the future, Capacitor supports adding native Swift views alongside the WebView

## Notification Posture
Push notifications are now a first-class product capability:
- proactive nudges for overdue routines, approaching reminders, and planning rituals
- completion-window timing optimizes delivery to household-relevant times
- opt-in flow with clear permission explanation
- calm, advisory posture — notifications surface awareness, not pressure

## Multi-User Status
Current model:
- stakeholder is the primary operator
- spouse has read-only visibility with per-screen banner
- push notifications target all opted-in devices (no per-member targeting yet)

Future expansion candidates (per M29 usage signal):
- spouse write access across all workflows
- per-member push targeting
- multi-user roles and permissions

## What This Decision Does Not Cover
- the implementation stack (see `docs/strategy/system-architecture.md`)
- the sync architecture
- whether Android or other platforms will be supported
- future AI-driven automation beyond advisory

## Historical Note
The original interface direction document (pre-2026-03-21) recommended a PWA-first approach with native as a future option. That recommendation was valid for its phase but has been superseded by the Capacitor transition. The original decision is recorded as D-007 in `docs/learnings/decision-history.md`.

## Open Questions
- What evidence would justify an Android build alongside iOS?
- When should spouse-specific collaborative flows become first-class rather than secondary?
- Should a shared-display mode (tablet replacing the household whiteboard/calendar) be explored?
