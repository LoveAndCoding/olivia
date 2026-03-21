# Changelog

All notable changes to Olivia are documented here. This changelog is curated for users — written in plain language that a household member would understand.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-03-21

### Added
- Landscape orientation support — the app now adapts gracefully when you rotate your device sideways
- App layout widens in landscape to use available screen space instead of staying narrow
- Bottom navigation compacts on phones in landscape to preserve vertical space
- Bottom sheets resize to fit the shorter landscape viewport
- Chat message bubbles constrained to prevent uncomfortable stretching in wide layouts
- Smooth CSS transitions when rotating between portrait and landscape

## [0.1.0] - 2026-03-21

Initial versioned release. Olivia has been in active development since early 2026 as a household command center. This release marks the transition from PWA to native iOS app via TestFlight.

### Added
- Native iOS app distributed via TestFlight (replaces the previous web-only PWA)
- Conversational chat with AI-powered household context
- Shared grocery and household lists with real-time sync
- Recurring routines with flexible scheduling
- First-class reminders with natural language input
- Meal planning workflow
- Unified weekly view across tasks, routines, and meals
- Activity history for household visibility
- Planning ritual support and proactive household nudges
- Push notifications with smart completion-window timing
- Onboarding flow with brain dump conversation
- Data freshness indicators and health check screen
- Settings page with notification controls
- Brand iconography using Phosphor Icons
- Automated error reporting with issue creation
- TestFlight CI/CD pipeline for continuous delivery

### Fixed
- Bottom sheet positioning on native keyboard open
- Onboarding welcome card shown on first launch even when API is unreachable
- Native notification toggle using Capacitor Push Notifications API
- Safe-area-inset handling for all screen headers
- Virtual keyboard coverage of input fields on mobile
- List input focus retention after item submission
- Date input overflow in routines card
- Query invalidation across weekly view and review flow mutations
