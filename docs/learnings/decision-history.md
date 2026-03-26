# Decision History

## Purpose
This log records meaningful product and project decisions so future agents can understand not only what was chosen, but why.

## Entry Template
Use this structure for future entries:

### D-XXX: Short decision title
- Date:
- Area:
- Decision:
- Rationale:
- Alternatives considered:
- Trade-offs:
- Status: active | superseded
- Related docs:

## Current Decisions

### D-073: M35 complete — identity refactor done, M36 defined
- Date: 2026-03-25
- Area: milestone completion
- Decision: Close M35 with exit criteria met. actorRole eliminated from all non-test, non-migration source files. All tests pass with userId-based identity. Track D and Track F specs approved. M36 (Automation & Feedback Build) defined: implement Track F first (lower-risk), then Track D (higher-impact). Both specs are approved and ready for implementation planning.
- Rationale: the identity refactor was the prerequisite for automation (rules need userId, not roles) and for multi-tenancy. All 7 subtasks complete. The remaining 8 `actorRole` references are in Dexie migration history and cannot be changed.
- Alternatives considered: (1) Keep M35 open until automation is built — rejected because the milestone objective (identity refactor) is complete and the specs are separate deliverables. (2) Skip M36 and go straight to household feedback — rejected because the board explicitly requested automation and feedback features.
- Trade-offs: M35 delivered the identity refactor but not the automation/feedback implementation (deferred to M36). This keeps milestones focused.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M35, M36), D-071, D-072, OLI-309

### D-072: In-app feedback spec approved — full-screen route, no Paperclip integration in Phase 1
- Date: 2026-03-25
- Area: feature spec / in-app feedback
- Decision: Approved Track F in-app feedback spec (`docs/specs/in-app-feedback.md`). Resolved 2 open questions: (1) Form presentation is a full-screen route (`/settings/feedback`), not a modal — communicates intentionality and avoids accidental dismissal. (2) No Paperclip integration in Phase 1 — the feedback table is the canonical store; coupling to internal tooling adds unnecessary dependency.
- Rationale: L-033 established that in-app friction reporting is more valuable than external bug tracking. This spec addresses that learning with a minimal, user-initiated feature that captures device context automatically. 14 acceptance criteria, no AI involvement, no trust model change.
- Alternatives considered: (1) Modal overlay — rejected as too dismissible. (2) Auto-create Paperclip issues — rejected as unnecessary coupling.
- Trade-offs: fire-and-forget (no response to user) may feel like shouting into a void. Acceptable for Phase 1 at household scale.
- Status: active
- Related docs: `docs/specs/in-app-feedback.md`, OLI-315, L-033, L-035

### D-071: Automation foundation spec approved — push action buttons and lightweight automation rules
- Date: 2026-03-25
- Area: feature spec / automation
- Decision: Approved Track D automation foundation spec (`docs/specs/automation-foundation.md`). Two capabilities: (1) Push notification action buttons — mark done/skip/snooze from the OS notification drawer. (2) Lightweight automation rules — user-defined if-then rules evaluated in the existing 30-min scheduler loop. Resolved 2 of 3 open questions: no rule execution notifications in Phase 1 (log is sufficient), spouse can see and edit all rules (household-shared). One open question remains for Tech Lead: iOS/Capacitor push action button API surface.
- Rationale: Board requested "trust and automation" (M29 feedback). This spec introduces Olivia's first trusted execution in a bounded, auditable, reversible way — user-defined only, no AI, non-destructive actions only. Push action buttons reduce the 4-tap friction to 1 tap for common nudge actions.
- Alternatives considered: (1) AI-suggested rules — deferred to Phase 2. (2) Notification on rule execution — rejected for Phase 1 (noisy when multiple rules fire).
- Trade-offs: automation rules are a trust model expansion (advisory-only → user-delegated execution). Bounded by: opt-in creation, 20-rule cap, non-destructive actions only, full audit log, easy disable/delete. Chat cannot manage rules in Phase 1.
- Status: active
- Related docs: `docs/specs/automation-foundation.md`, OLI-314, D-002, A-002, L-027

### D-070: Test notification button and scheduled notification visibility — diagnostic tooling for push pipeline
- Date: 2026-03-24
- Area: push notifications / diagnostic tooling
- Decision: Add two diagnostic features to Settings → Notifications: (1) a "Send Test Notification" button that immediately pushes a test notification to the current user's device, bypassing the scheduler and dedup logic, and (2) a "Scheduled Notifications" section showing upcoming notification items with their scheduling status (pending, held by completion window, recently sent). Both features are read-only/diagnostic and advisory-only compliant.
- Rationale: M33 board feedback reveals push notifications are not reaching the household despite passing automated tests. The household has no way to verify whether push works on their device or see what notifications are scheduled. This diagnostic tooling closes the observability gap and reduces the feedback loop on reliability issues (L-035).
- Alternatives considered: (1) Server-side push delivery logs exposed in admin UI — rejected as too technical for household users. (2) Automatic push health check on app launch — rejected as too noisy; the test button is user-initiated. (3) Only the test button without scheduled visibility — rejected because knowing _what_ should fire is as important as knowing _if_ push works.
- Trade-offs: adds UI surface to settings that most users won't need daily. Benefit: when push isn't working, the household can self-diagnose rather than waiting for the next feedback cycle.
- Status: active
- Related docs: `docs/specs/test-notification-and-scheduled-visibility.md`, `docs/specs/push-notifications.md`, OLI-301, OLI-298 (M34), D-045, L-035

### D-069: Dynamic user assignment — replace hardcoded names with household members API
- Date: 2026-03-23
- Area: multi-user / assignment UX
- Decision: Replace the role-based `Owner` enum (`stakeholder | spouse | unassigned`) and hardcoded user names ("Lexi", "Christian") with userId-based assignment driven by the household members API. All assignment pickers and display labels will resolve real user names from authenticated household member data.
- Rationale: M32 shipped full multi-user auth and household members infrastructure, but the assignment UI was not updated. Board feedback (OLI-296): "I can still assign to myself or my spouse as hardcoded items. With multiple users, I can't assign to the actual users. This feels like faux multi-user rather than an actual multi-user experience."
- Alternatives considered: (1) Name mapping table — rejected; adds indirection when the User type already has `name`. (2) Keep role enum and add name config — rejected; doesn't scale beyond 2 users and maintains the wrong abstraction.
- Trade-offs: requires a data migration (role → userId) and touches 14+ files. Benefit: removes the last major gap in the multi-user experience and unblocks future features like per-user filtering.
- Status: active
- Related docs: `docs/specs/dynamic-user-assignment.md`, OLI-296

### D-068: Operating cadence established — three rolling horizons, milestone transition protocol, momentum rules
- Date: 2026-03-22
- Area: company operations / process
- Decision: Establish a forward-looking operating cadence with three rolling horizons (current sprint, next sprint, strategic direction), a milestone transition protocol (retrospective → feedback → assumptions review → H2 activation → H3 refresh), momentum rules (no idle agents, zero sprint gaps), and backlog management. CEO HEARTBEAT.md updated with strategic planning steps. Full process codified in `docs/strategy/operating-cadence.md`.
- Rationale: the team's operating model was reactive — wait for board directive, scope, execute, wait again. M30 closed with no M31 defined, no backlog, and no forward view. The board explicitly asked the CEO to "constantly think about what comes next" and ensure "the team never sits idle for long."
- Alternatives considered: (1) Ad-hoc planning — rejected because it's what we had and it creates sprint gaps. (2) Fixed calendar cadence (weekly planning meetings) — rejected because heartbeat-driven execution doesn't map to calendar time well. (3) Kanban-style continuous flow — considered but milestones provide better strategic framing for a product this early.
- Trade-offs: the three-horizon model adds planning overhead to each heartbeat. Benefit: eliminates dead air, gives the board visibility into where we're headed, and ensures the team always has a next thing.
- Status: active
- Related docs: `docs/strategy/operating-cadence.md`, `agents/ceo/HEARTBEAT.md`, OLI-273

### D-067: AI chat recalibration spec drafted — conversation-first, tool-use cap, batch dismiss, undo
- Date: 2026-03-22
- Area: feature spec / AI chat behavior
- Decision: Draft spec for recalibrating AI chat to comply with the advisory-only trust model. Key changes: (1) Conversation-first default — Olivia must understand intent before proposing entity creation. (2) Hard cap of 3 tool calls per LLM response, enforced at the API level. (3) System prompt anti-patterns that explicitly prohibit responding to vague statements with batch item creation. (4) Batch dismiss UX for clearing multiple unwanted drafts at once. (5) Undo last response to remove a bad AI response and its drafts. (6) parseConfidence threshold — only propose when confidence ≥ 0.8. Two open questions for the board: conversation lifecycle (ephemeral vs. persistent) and parseConfidence visual treatment.
- Rationale: board reported chat suggesting 8-9 irrelevant tasks unprompted, no way to clear unwanted suggestions, and frequent conversation deletion. L-032 confirms that unsolicited AI action creation erodes trust faster than no AI at all. The chat surface must be brought into compliance with A-002 (advisory-only).
- Alternatives considered: (1) Disable chat tool use entirely — rejected as too aggressive; the user should still be able to ask Olivia to create items when they want to. (2) Reduce tool count without prompt changes — rejected because the prompt is the primary behavioral lever; a cap alone doesn't fix the conversation quality. (3) Full chat redesign — rejected as overscoped for M30; behavioral recalibration first, then evaluate.
- Trade-offs: prompt-based behavioral changes are probabilistic, not deterministic. The hard tool-use cap provides a deterministic backstop. Risk of over-correction (Olivia too passive) is mitigated by explicit prompt instruction to propose when intent is clear.
- Status: active
- Related docs: `docs/specs/ai-chat-recalibration.md`, `docs/specs/chat-feature.md`, L-032, D-002, D-065, A-002

### D-066: M29 complete — household validation gate achieved with 1 week of usage
- Date: 2026-03-22
- Area: milestone completion
- Decision: Close M29 with exit criteria substantially met. The 2-week usage criterion was not met (only ~1 week elapsed), but the remaining criteria are satisfied: 3+ chat observations documented (L-032), 3+ broader product observations documented (L-029, L-030, L-031, L-033), direction decision recorded (D-065), and M30 defined. The signal is clear and specific enough to act on — an additional week would produce more examples of the same friction, not new categories.
- Rationale: the purpose of M29 was to restore the validation gate that M28 bypassed. That gate's function is to produce actionable usage signal, and we have it. The 2-week criterion was a proxy for "enough signal to act on," not a hard deadline. Holding for another week would delay acting on clear feedback.
- Alternatives considered: (1) Wait for the full 2-week period — rejected because signal quality is already sufficient and the household is experiencing daily friction. (2) Close with all criteria fully met by waiting — rejected as prioritizing process over signal.
- Trade-offs: closing early means less data volume, but the feedback themes are consistent and actionable. If new themes emerge in week 2, they can be captured as M30 progresses.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M29), D-065, L-029 through L-033, OLI-245

### D-065: M30 direction — stability and feature depth sprint, no new features
- Date: 2026-03-22
- Area: product direction / milestone scoping
- Decision: M30 will focus on making the existing product surface reliable and complete enough for sustained daily household use. This is a cross-cutting sprint, not a single-track direction from the M29 candidate list. None of the five candidate tracks (A–E) are the right next move — the household's feedback says the existing surface doesn't work well enough to justify building on top of it. Priority order: (1) Reliability — regression prevention, error visibility, time-to-fix. (2) Feature depth — lists completed-item management, reminder date/time picker, routine flexibility. (3) Push notification validation on native. (4) AI chat recalibration — less aggressive, more conversational, advisory-only compliant. (5) In-app feedback mechanism.
- Rationale: the board's feedback is unambiguous — "the biggest blocker day after day is the friction from issues and regressions" and "all features just don't feel complete enough for daily use." Adding new features on an unreliable, incomplete surface will compound the trust deficit. The right move is to harden what exists until the household can use it daily without workarounds.
- Alternatives considered: (1) Track A (deepen chat) — board explicitly deprioritized: "trust and automation is maybe a better immediate fix." (2) Track D (increase autonomy) — premature when basics don't work. (3) Track C (complete H3/meal planning) — not where friction is. (4) Track E (coordination surface) — task steps blocked pending inbox validation, shared calendar scoped. (5) Track B (broaden household) — not mentioned as a priority.
- Trade-offs: no new features in M30 means no visible expansion. Benefit: the existing features should become genuinely useful for daily life, which is the prerequisite for everything else.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M30), L-029 through L-033, A-011, OLI-245

### D-064: Task steps — CEO resolved 4 open design questions, spec finalized, build deferred to M29
- Date: 2026-03-22
- Area: feature spec / task steps
- Decision: (1) Steps are titles only — no descriptions; a step needing a description should be its own inbox item. (2) Step creation available only after item exists in UI; chat path handles "create with steps" naturally. (3) Implementation deferred until M29 household usage signal — spec is ready to build but building on unvalidated inbox usage is premature. (4) Visual spec from Designer required before implementation begins.
- Rationale: Keep steps lightweight (checklist-weight), keep item creation fast, validate the underlying inbox usage before layering more features on top, and define UX interactions visually before engineering starts.
- Alternatives considered: (1) Step descriptions — rejected as over-structuring; promote complex steps to their own inbox items instead. (2) Steps during item creation — rejected as unnecessary complexity given chat path already covers this naturally.
- Trade-offs: Deferring build means this won't ship until M29 validates inbox usage, which could be weeks. Benefit: avoids building on sand if households aren't using the inbox.
- Status: active
- Related docs: `docs/specs/task-steps.md`, OLI-242, D-054 (M29 definition)

### D-063: Shared calendar — board direction on scope and integration approach
- Date: 2026-03-22
- Area: feature scoping / calendar
- Decision: Shared calendar will use native Apple Calendar integration (EventKit) rather than cloud-based sync (Google Calendar). Initial scope is read-only. Phase 1 is an enhanced calendar view of existing Olivia data (multi-week navigation). Phase 2 is native Apple Calendar read-only integration. This is a normal feature request — goes through standard planning/roadmap process, not urgent.
- Rationale: The household uses Apple Calendar on the same device, so native integration via EventKit is simpler and more private than OAuth-based cloud sync. Read-only aligns with the advisory-only trust model (D-002). Enhanced view first validates the calendar surface before adding external data.
- Alternatives considered: (1) Google Calendar sync — rejected, household uses Apple. (2) Bidirectional sync — rejected for Phase 1, read-only is safer and sufficient. (3) Immediate prioritization — rejected, board wants normal planning process.
- Trade-offs: Native-only limits to Apple devices (acceptable given iOS-only distribution). Read-only means Olivia can't create calendar events (acceptable per trust model).
- Status: active
- Related docs: OLI-243, D-002 (advisory-only trust model)

### D-062: Release criteria and versioning policy documented
- Date: 2026-03-21
- Area: process / release management
- Decision: Documented a release policy at `docs/release-policy.md` covering release criteria (feature completion, critical bug fix, accumulation threshold), semantic versioning rules (PATCH for fixes, MINOR for features, MAJOR reserved for 1.0.0), branching strategy (no release branches — keep it simple), incremental vs. batched release guidance, and role responsibilities (VP of Product assesses readiness and drafts changelog; Founding Engineer bumps version and opens upstream PR; board merges).
- Rationale: The team needed a clear, documented policy so release decisions are consistent and the Founding Engineer knows when to prepare upstream PRs without ad-hoc coordination.
- Alternatives considered: (1) Fixed cadence releases (e.g., weekly) — rejected as premature before M29 household validation produces regular usage feedback. (2) Release branches for hotfixes — rejected as unnecessary for current team size.
- Trade-offs: Simple process optimized for a small team; may need revision if team grows or release frequency increases.
- Status: active
- Related docs: `docs/release-policy.md`, OLI-195, `agents/founding-engineer/AGENTS.md` (git workflow section)

### D-061: Landscape orientation spec approved — CEO resolved open questions and added no-FOUC criterion
- Date: 2026-03-21
- Area: feature spec / layout
- Decision: Approve the landscape orientation support spec (OLI-183) with three resolved open questions: (1) Side rail nav on iPad landscape deferred. (2) App frame landscape max-width uses fluid `clamp()`. (3) iPad testing scope is verify-no-breakage only. Additionally, a 14th acceptance criterion was added: orientation change must not cause a visible layout flash or FOUC.
- Rationale: graceful adaptation, not a redesign. Portrait remains the primary design surface.
- Status: active
- Related docs: `docs/specs/landscape-orientation-support.md`, OLI-183, OLI-184

### D-060: Adopt spec-level CSS completeness checklist to prevent unstyled components from shipping
- Date: 2026-03-17
- Area: process / quality / UI delivery
- Decision: Add a mandatory acceptance criterion to the spec template requiring that all UI components have corresponding CSS styles before shipping. Also add a PR review template with a style completeness check.
- Rationale: OLI-136 revealed that NudgeCard, NudgeTray, and PushOptInPrompt shipped with BEM class names but zero CSS.
- Status: active
- Related docs: `docs/specs/spec-template.md`, OLI-136, OLI-138, L-028

### D-059: Phase 2 Data Freshness implementation validated — all 20 acceptance criteria pass
- Date: 2026-03-17
- Area: delivery / data freshness
- Decision: Phase 2 Data Freshness implementation is validated and ready to ship. 57 tests passing. Implementation covers extended staleness detection, monthly health check, freshness nudges, and "Still active?" confirmation pattern.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, OLI-121, OLI-124, OLI-125, D-058

### D-058: Phase 2 Data Freshness spec approved — CEO resolved 5 open questions
- Date: 2026-03-17
- Area: data freshness / product approval
- Decision: Approved Phase 2 Data Freshness standalone spec with decisions on all 5 open questions: monthly health check, 10-item cap, separate 2/day freshness nudge cap, health-check-only for meal plans, "Update" deep-link in health check.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, OLI-121, OLI-123, D-056, D-057

### D-057: Phase 1 Onboarding shipped — CEO final validation passed
- Date: 2026-03-17
- Area: delivery / onboarding
- Decision: Phase 1 Conversational Onboarding approved to ship. 7/8 acceptance criteria fully pass; inline edit of drafts deferred to fast-follow. 294 tests passing. Phase 2 (data freshness) planning begins immediately.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117, OLI-118, OLI-119, OLI-120, D-056

### D-056: Onboarding & Data Freshness spec approved — conversational brain-dump with phased rollout
- Date: 2026-03-17
- Area: onboarding / data freshness
- Decision: Approved the Improved Onboarding & Data Freshness spec. Key decisions: onboarding trigger ≤2 entities, monthly health check, conservative starter templates (5-7 routines, 2-3 lists), spouse onboarding deferred, batch creation inline in chat. Phase 1 (onboarding) ships first; Phase 2 (data freshness) after validation.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117

### D-055: Home Screen Declutter spec approved — Today-Forward layout
- Date: 2026-03-16
- Area: home screen / UI design
- Decision: Approved Home Screen Declutter replacing 7-day grid with Today-Forward layout. Today is hero zone, persistent workflow nav row, upcoming days as summary rows (max 3), new `/week` route, two new semantic tokens for WCAG AA compliance.
- Status: active
- Related docs: `docs/plans/home-screen-declutter-visual-implementation-spec.md`, OLI-111, OLI-114

### D-054: M29 defined as post-chat household validation gate
- Date: 2026-03-16
- Area: milestone definition / product strategy
- Decision: Define M29 as a usage-observation milestone requiring 2+ weeks of household usage, documented observations, and a usage-informed direction decision. Restores the validation gate that M28 was designed to provide but was bypassed by board directive (D-053).
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M29), D-053, D-052

### D-053: Chat interface chosen as H5 Phase 3 direction — board directive, M28 validation gate bypassed
- Date: 2026-03-16
- Area: product direction / H5 Phase 3
- Decision: The chat interface is the active Phase 3 direction. Board assigned OLI-95 directly, bypassing the M28 validation gate. The chat feature lets users interact with Olivia as a household-aware assistant. M28's usage-observation exit criteria were not met; assumptions A-007, A-008, A-009 remain unvalidated by household usage.
- Status: active
- Related docs: OLI-95, D-052, `docs/roadmap/roadmap.md`

## Archived Decisions (D-023 through D-052)

These decisions are milestone completions and spec approvals from the H4–H5 build cycle. Full text is in `decision-history-archive.md`. Consult that file only when you need the specific rationale or trade-offs.

| ID | Date | Summary |
|---|---|---|
| D-052 | 2026-03-16 | H5 Phase 2 complete — household validation pause before Phase 3 |
| D-051 | 2026-03-16 | M27 complete — completion-window push timing implemented |
| D-050 | 2026-03-16 | M26 complete — completion-window push timing build readiness |
| D-049 | 2026-03-16 | Completion-window implementation plan — 5 open questions resolved |
| D-048 | 2026-03-16 | Completion-window push timing spec approved |
| D-047 | 2026-03-16 | M25 complete — AI-enhanced nudge timing scoped (two-layer approach) |
| D-046 | 2026-03-16 | M24 complete — push notifications fully built |
| D-045 | 2026-03-15 | Push notifications spec approved |
| D-044 | 2026-03-16 | M21+M22 complete — real AI provider wiring built and validated |
| D-043 | 2026-03-15 | Real AI provider wiring spec approved |
| D-042 | 2026-03-15 | M20 complete — H5 Phase 2 scoped; real AI wiring first |
| D-041 | 2026-03-16 | M19 complete — H5 Phase 1 complete |
| D-040 | 2026-03-16 | M18 complete — proactive nudges build-ready |
| D-039 | 2026-03-15 | Proactive household nudges spec approved |
| D-038 | 2026-03-15 | M17 complete — proactive nudges named as second H5 target |
| D-037 | 2026-03-15 | M17 complete — AI-assisted summaries built; FK insert order pattern |
| D-036 | 2026-03-16 | M16 complete — AI-assisted summaries implementation plan approved |
| D-035 | 2026-03-15 | AI-assisted ritual summaries spec approved |
| D-034 | 2026-03-16 | M15 complete — H5 scoping; AI-assisted summaries first target |
| D-033 | 2026-03-16 | M14 complete — H4 third workflow built, temporal loop closed |
| D-032 | 2026-03-16 | Planning ritual support spec approved — M13 complete |
| D-031 | 2026-03-16 | M13 defined — H4 third workflow build readiness |
| D-030 | 2026-03-16 | M12 complete — H4 second workflow built |
| D-029 | 2026-03-16 | M11 complete — H4 second workflow build readiness |
| D-028 | 2026-03-15 | Activity history spec approved |
| D-027 | 2026-03-16 | M10 complete — H4 first workflow built |
| D-026 | 2026-03-16 | M9 complete — H4 build readiness achieved |
| D-025 | 2026-03-16 | Planning ritual support spec drafted (third H4 target) |
| D-024 | 2026-03-16 | M8 complete — H4 scoping achieved |
| D-023 | 2026-03-16 | M7 complete — coordination layer advanced on implementation completeness |

## Foundational Decisions

### D-001: Olivia will be positioned as a household command center
- Date: 2026-03-08
- Area: product strategy
- Decision: Define Olivia primarily as a household command center rather than a general AI companion.
- Rationale: this framing creates a more focused product boundary and better aligns with the stakeholder's goal of reducing household management overhead.
- Alternatives considered: a general personal assistant framing; a narrower single-purpose reminder or task tool.
- Trade-offs: gains focus and execution clarity, but intentionally delays broader assistant ambitions.
- Status: active
- Related docs: `docs/vision/product-vision.md`

### D-002: Olivia will start with an advisory-only trust model
- Date: 2026-03-08
- Area: product behavior
- Decision: Olivia should suggest, summarize, draft, and organize, but not take consequential actions without explicit approval in the first major phase.
- Rationale: advisory behavior matches the project's privacy-first, trust-building posture and reduces early product risk.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`

### D-003: Durable learnings will be documented as a first-class system
- Date: 2026-03-08
- Area: project operations
- Decision: Maintain a dedicated learnings system for assumptions, learnings, and decision history.
- Rationale: future agents may begin with minimal context, so durable memory must exist outside any single conversation.
- Status: active
- Related docs: `docs/learnings/README.md`, `docs/strategy/agentic-development-principles.md`

### D-004: The earliest workflow will use a primary-operator model
- Date: 2026-03-08
- Area: MVP definition
- Decision: The first workflow assumes the stakeholder is the primary operator, with household-shared context and possible spouse visibility.
- Rationale: preserves household focus without forcing premature multi-user collaboration complexity.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`

### D-005: Reminders are not a first-class object in the inbox spec
- Date: 2026-03-08
- Area: feature scope
- Decision: In the shared household inbox spec, reminders are item properties rather than separate entities.
- Status: superseded
- Related docs: `docs/specs/shared-household-inbox.md`

### D-006: The inbox spec is channel-agnostic
- Date: 2026-03-08
- Area: feature scope
- Decision: The inbox spec defines workflow and data model without prescribing a delivery surface.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`

### D-007: The MVP interface will be an installable mobile-first PWA
- Date: 2026-03-08
- Area: interface strategy
- Decision: Olivia's MVP uses an installable, mobile-first PWA. Native clients deferred unless usage justifies them.
- Status: active
- Related docs: `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`

### D-008: Near-term implementation planning will target a local-first modular monolith
- Date: 2026-03-09
- Area: system architecture
- Decision: TypeScript modular monolith with installable PWA client, household-controlled SQLite store, browser-local offline cache and outbox, explicit versioned command sync, and AI behind a narrow provider adapter boundary.
- Rationale: matches advisory-only writes, local-first privacy, mobile-first capture, and low write concurrency.
- Status: active
- Related docs: `docs/strategy/system-architecture.md`

### D-009: The shared household inbox spec is approved for implementation planning
- Date: 2026-03-09
- Area: delivery planning
- Decision: Treat the inbox spec as approved and implementation-ready.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`

### D-010: Non-destructive user actions execute immediately; agentic actions require confirmation
- Date: 2026-03-13
- Area: product behavior / trust model
- Decision: Differentiate between agentic actions (require confirmation) and non-destructive user actions (execute immediately). Destructive actions always require confirmation regardless of source.
- Rationale: advisory-only trust model protects against Olivia acting autonomously, not against user-expressed intent. Reversibility is built into normal UI.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/specs/shared-household-inbox.md`

### D-011: Horizon 2 is complete enough to move into Horizon 3
- Date: 2026-03-13
- Area: roadmap progression
- Decision: Treat H2 and associated MVP milestones as complete. Move into H3 planning.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`

### D-012: Horizon 3 priorities are reminders, shared lists, recurring routines, and meal planning
- Date: 2026-03-13
- Area: product strategy
- Decision: H3 priorities in order: first-class reminders → shared lists → recurring routines → meal planning.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`

### D-013: Reminders will be reconsidered as a first-class Horizon 3 capability
- Date: 2026-03-13
- Area: feature scope
- Decision: H3 should explicitly revisit the MVP choice to treat reminders as item properties and scope reminders as an active product area.
- Status: active

### D-014: First-class reminders will use a hybrid standalone-or-linked model
- Date: 2026-03-13
- Area: feature scope
- Decision: Reminders are first-class objects that may stand alone or link to an inbox item.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`

### D-015: The first reminder implementation slice will stay narrowly bounded
- Date: 2026-03-13
- Area: feature scope
- Decision: Defer reminder-to-inbox conversion, use minimal notification settings, preserve missed history in timeline only.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`

### D-016: Shared Lists A-007 validated — shared lists are behaviorally distinct from inbox
- Date: 2026-03-15
- Area: feature scope
- Decision: A-007 validated. Checklist behavior differs enough from inbox behavior to justify the separate workflow model.
- Status: active
- Related docs: `docs/specs/shared-lists.md`, `docs/learnings/assumptions-log.md` (A-007)

### D-017: Recurring Routines is the next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: After Shared Lists, the next H3 target is Recurring Routines.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/recurring-routines.md`

### D-018: M6 complete — all planned H3 workflows built
- Date: 2026-03-15
- Area: roadmap progression
- Decision: M6 (Coordination Layer Build Readiness) complete. All three H3 workflows specified, planned, and built.
- Status: active

### D-019: Meal planning confirmed as next H3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: Meal planning is the next H3 target. Scoped narrowly to weekly meal planning with grocery list via shared lists.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md` (A-009)

### D-020: Meal planning spec drafted
- Date: 2026-03-15
- Area: delivery planning
- Decision: Meal planning spec drafted, scoped to weekly meal planning → grocery list via Shared Lists.
- Status: active
- Related docs: `docs/specs/meal-planning.md`

### D-021: Meal planning spec approved by CEO
- Date: 2026-03-15
- Area: delivery planning
- Decision: Approved `docs/specs/meal-planning.md` for implementation planning.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, D-019, D-020

### D-022: Horizon 4 first spec target is unified weekly view
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: First H4 target is the unified weekly view — cross-workflow week-at-a-glance surface. Activity history second, planning ritual support third.
- Rationale: adds the temporal and cross-workflow dimension missing after four H3 workflows all operate in their own views. No new entities — surfaces existing H3 state.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`
