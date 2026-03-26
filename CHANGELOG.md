# Changelog

All notable changes to Olivia are documented here. This changelog is curated for users — written in plain language that a household member would understand.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.8.0] - 2026-03-26

### Added
- In-app feedback form — report bugs, request features, or share general feedback without leaving the app (Settings > Send Feedback)
- Push notification action buttons — tap "Mark done" or "Skip" directly from routine notifications, or "Done" and "Snooze" from reminder notifications, without opening the app
- Automation rules — create simple if-then rules to automate routine household actions (Settings > Automation Rules). For example: automatically skip a routine if it's been overdue for 3+ days, or auto-complete reminders that have been snoozed too many times

## [0.7.2] - 2026-03-25

### Fixed
- Push notification registration on iOS — enabling notifications now properly registers the device even when iOS permission was already granted
- Task and reminder assignment pickers now show actual household member names instead of hardcoded names

### Changed
- Replaced role-based assignment ("stakeholder"/"spouse") with user-based assignment across all workflows — tasks, reminders, routines, and lists now track who is assigned by their real user identity

## [0.7.1] - 2026-03-24

### Fixed
- Invite member button now works correctly — previously it appeared clickable but did nothing, and errors were hidden
- Push notifications now reach all household members instead of only the primary account holder
- Settings back arrow returns to the screen you came from instead of always going to the More tab
- Error reporting now works during invitation and sign-up flows, making issues easier to diagnose

### Added
- Service worker for web push notifications — the app can now receive and display push notifications in the browser
- "Send Test Notification" button in Settings — verify push notifications work on your device
- "Scheduled Notifications" section in Settings — see when your next notifications are expected to fire
- 39 new end-to-end tests covering invitation flow, auth sessions, push subscriptions, and multi-user data integrity

## [0.7.0] - 2026-03-23

### Added
- Multi-user household support — invite your spouse or partner to collaborate as a full peer with their own login
- Magic link authentication — sign in securely via email link, no passwords needed
- PIN unlock for quick access on shared devices
- Invitation system — generate a code, share it, and your household member joins in under a minute
- New "Daily" tab in bottom navigation — reminders, routines, and meals are now one tap away instead of buried in the home screen
- "More" tab for less-frequent features — Tasks, Activity History, Week View, and Settings are neatly organized
- Per-user push notifications — each household member receives their own relevant notifications on their own device

### Changed
- Activity history and item attribution now show real names instead of generic role labels
- Bottom navigation restructured from 5 generic tabs to a layout that matches how the household actually uses the app
- All entities now track who created or completed them by user identity

## [0.6.0] - 2026-03-22

### Added
- Routines now support flexible scheduling — track irregular chores like dishes or laundry with "last done" visibility instead of rigid recurring schedules
- Reminders now have a proper date and time picker instead of text-only entry — easier to set exact times

### Changed
- AI chat is now calmer and more conversational — Olivia asks clarifying questions before suggesting tasks instead of proposing multiple items unprompted
- Chat responses are limited to at most 3 suggestions at a time, with an offer to continue if more are needed

### Fixed
- Snoozed reminders now clear from the home screen until the snooze time arrives
- Improved error visibility for AI and chat connection issues

## [0.5.0] - 2026-03-22

### Added
- Lists now separate completed items into a collapsible section at the bottom, keeping unchecked items front and center
- New "Clear completed" action removes all checked items from a list in one step — great for resetting a grocery list after a shopping trip
- New "Uncheck all" action resets all checked items back to unchecked — perfect for reusing a recurring list like weekly groceries

### Fixed
- Push notifications now deliver reliably on native iOS — resolved a pipeline issue that could silently prevent notifications from arriving
- Screen headers no longer overlap the device status bar when scrolling
- The keyboard no longer pushes content too far up on bottom sheet dialogs
- Background processes (nudge polling and push scheduling) now handle errors gracefully instead of silently failing

## [0.4.3] - 2026-03-22

### Added
- Automated error reporting — the app now detects crashes and network failures behind the scenes so issues can be identified faster

### Fixed
- Completing a routine no longer fails with an error

## [0.4.2] - 2026-03-22

### Fixed
- Server connections now use secure HTTPS, resolving remaining connectivity issues on the native iOS app

## [0.4.1] - 2026-03-22

### Fixed
- App can now connect to the server on the native iOS app — previously, network requests were silently blocked

## [0.4.0] - 2026-03-22

### Added
- Error feedback system — when something goes wrong, the app now shows a clear notification instead of failing silently
- Automated end-to-end tests for onboarding, chat, and settings to catch regressions before they reach your device

### Fixed
- App icon now shows the Olivia brand icon instead of the default placeholder
- Connectivity banner no longer overlaps the status bar on newer iPhones
- Network connections now work correctly on Tailscale private networks

## [0.3.0] - 2026-03-21

### Added
- Native push notifications via Apple Push Notification service — notifications now arrive even when the app is closed
- Tapping a notification opens the relevant screen directly instead of just launching the app
- Background and foreground lifecycle handling — the app reconnects and refreshes data when you switch back to it
- Connection health monitor — Olivia now detects when the server is unreachable and shows a clear status indicator

### Fixed
- Chat conversation no longer breaks or goes blank when the connection drops temporarily
- Onboarding screen no longer shows a blank page when starting the app without internet
- Resolved the root cause of the AI chat being unable to connect on the native app

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
