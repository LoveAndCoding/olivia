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

### D-061: Landscape orientation spec approved — CEO resolved open questions and added no-FOUC criterion
- Date: 2026-03-21
- Area: feature spec / layout
- Decision: Approve the landscape orientation support spec (OLI-183) with three resolved open questions: (1) Side rail nav on iPad landscape deferred — bottom nav in landscape is fine for first pass. (2) App frame landscape max-width uses a fluid `clamp()` approach — e.g., `clamp(430px, 85vw, 720px)` on phones; Founding Engineer has discretion on exact values, optimizing for readability over filling every pixel. (3) iPad testing scope is verify-no-breakage only; no iPad-specific optimization in this phase. Additionally, a 14th acceptance criterion was added: orientation change must not cause a visible layout flash or FOUC, requiring CSS transitions on width/max-width properties to smooth the adaptation.
- Rationale: graceful adaptation, not a redesign. Portrait remains the primary design surface. The `clamp()` approach gives FE flexibility to tune values without requiring a spec amendment. The no-FOUC requirement ensures the adaptation feels polished.
- Alternatives considered: fixed breakpoint values (rejected — `clamp()` is more fluid and requires less media-query scaffolding); side rail nav for iPad (rejected — deferred to keep scope tight).
- Trade-offs: deferring iPad-specific optimization means iPad landscape will work but won't feel native. Acceptable for Phase 1.
- Status: active
- Related docs: `docs/specs/landscape-orientation-support.md`, OLI-183, OLI-184

### D-060: Adopt spec-level CSS completeness checklist to prevent unstyled components from shipping
- Date: 2026-03-17
- Area: process / quality / UI delivery
- Decision: Add a mandatory acceptance criterion to the spec template requiring that all UI components have corresponding CSS styles before shipping. Also add a PR review template with a style completeness check as a lightweight safety net.
- Rationale: OLI-136 revealed that NudgeCard, NudgeTray, and PushOptInPrompt shipped with BEM class names but zero CSS, causing jarring unstyled content. Root cause: component TSX was implemented in one task and CSS was forgotten. The lightest effective fix is catching this at spec time (before implementation begins) rather than adding heavier tooling like visual regression tests or custom lint rules.
- Alternatives considered: (1) Visual regression gate via Storybook/screenshot tests — high effort, deferred until component volume justifies it. (2) Custom lint rule flagging class names without matching CSS selectors — aspirational, not worth the build cost now. Both remain viable future additions if the spec checklist proves insufficient.
- Trade-offs: Manual process depends on spec authors remembering the criterion. Mitigated by it being baked into the template itself.
- Status: active
- Related docs: `docs/specs/spec-template.md`, OLI-136, OLI-138, L-028

### D-059: Phase 2 Data Freshness implementation validated — all 20 acceptance criteria pass
- Date: 2026-03-17
- Area: delivery / data freshness / product validation
- Decision: Phase 2 Data Freshness implementation is validated and ready to ship. All 20 acceptance criteria from the approved spec pass. 57 tests passing across domain and API integration layers. Implementation covers: extended staleness detection for all 5 workflow types, monthly health check surface with 10-item cap, freshness nudges via H5 nudge tray with 2/day throttle, and "Still active?" single-tap confirmation pattern.
- Rationale: Thorough code review confirmed spec conformance across schema (5 entity tables + household_freshness), domain staleness functions (all check freshnessCheckedAt first), API endpoints (6 new freshness routes + nudge extension), and PWA surfaces (nudge tray extension, health check card, health check review screen). One minor spec correction: inbox archive status was listed as "resolved" but the correct schema value is "done" — spec updated.
- Alternatives considered: none — implementation followed the approved spec and implementation plan exactly.
- Trade-offs: none beyond those already documented in D-058.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, `docs/plans/data-freshness-implementation-plan.md`, OLI-121, OLI-124, OLI-125, D-058

### D-058: Phase 2 Data Freshness spec approved — CEO resolved 5 open questions; ready for design and build
- Date: 2026-03-17
- Area: data freshness / product approval
- Decision: CEO approved the Phase 2 Data Freshness standalone spec (`docs/specs/data-freshness.md`) with decisions on all 5 open questions: (1) Health check frequency stays monthly (30 days), reconfirming D-056. (2) Health check item cap is 10; under-2-minute target is the real constraint. (3) Freshness nudge daily cap is separate 2/day, not shared with the existing 4-nudge display cap — keeps both channels clean. (4) Meal plan freshness is health-check-only — no inline freshness nudges, since meal planning is optional and weekly skips are intentional. (5) "Update" deep-link included in health check alongside "Still active" / "Archive" — three actions is fine since it's one primary action and two alternatives.
- Rationale: The spec extends staleness detection to all five workflow types, adds a monthly household health check, and introduces freshness nudges via existing H5 infrastructure. CEO's decisions consistently favor simplicity and calm UX: separate caps prevent channel crowding, health-check-only for meal plans avoids false urgency, and the update deep-link saves navigation steps without adding decision complexity.
- Alternatives considered: (1) Biweekly health check for newly onboarded households — rejected; easier to increase frequency than walk back nagging. (2) Shared nudge cap — rejected; freshness nudges are informational and should neither crowd out nor be crowded out by time-sensitive types. (3) Two-action-only health check — rejected; the deep-link is additive, not a competing choice.
- Trade-offs: Separate nudge caps mean users could theoretically see up to 6 nudges total (4 time-sensitive + 2 freshness). Accepted because freshness nudges rank last in priority and the channels serve different purposes. Health-check-only meal plan freshness means meal plan drift won't be caught between monthly checks, but this matches the optional/weekly nature of the feature.
- Status: active
- Related docs: `docs/specs/data-freshness.md`, OLI-121, OLI-123, D-056, D-057

### D-057: Phase 1 Onboarding shipped — CEO final validation passed; Phase 2 data freshness planning begins
- Date: 2026-03-17
- Area: delivery / onboarding / product progression
- Decision: Phase 1 Conversational Onboarding is approved to ship to the validation cohort. CEO validated the full implementation across three commits (426ae8f, 23ea9e0, 91deb3c) against the approved spec and all five CEO decisions. 7/8 acceptance criteria fully pass; the one partial (inline edit of drafts, AC #5) is an accepted MVP tradeoff — confirm/skip is sufficient, inline edit deferred to fast-follow. Phase 2 (data freshness) planning begins immediately, following the same sequence: spec refinement → CEO approval → design → build.
- Rationale: The implementation delivers the core conversational brain-dump experience: dedicated onboarding chat, topic-guided prompts across all 5 household areas, freeform-to-draft parsing with three-tier confidence indicators, session persistence with resume capability, starter templates (7 routines, 3 lists), progressive exit, and contextual UI polish (topic badges, exit buttons). 294 tests passing. The trust model requirement (confidence indicators) was a must-fix that was addressed in OLI-120 before CEO sign-off.
- Alternatives considered: none — the implementation followed the approved spec and CEO decisions exactly. The inline edit deferral was agreed as an acceptable tradeoff by both VP Product and CEO.
- Trade-offs: shipping without inline edit means users can only confirm or skip draft entities, not edit them in-place. Accepted because the conversational flow and confidence indicators provide sufficient review capability for MVP. If editing friction surfaces during validation cohort testing, a review sheet will be added as a fast-follow.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117, OLI-118, OLI-119, OLI-120, D-056

### D-056: Onboarding & Data Freshness spec approved — conversational brain-dump with phased rollout
- Date: 2026-03-17
- Area: onboarding / data freshness / product strategy
- Decision: Approved the Improved Onboarding & Data Freshness spec with CEO decisions on all five open questions: (1) Onboarding trigger threshold is ≤2 entities — someone who manually created one item still benefits from guided setup. (2) Health check frequency is monthly fixed — no adaptive cadence; reassess in 8 weeks. (3) Starter template set is small and conservative (5-7 routines, 2-3 lists) — bad templates erode trust fast. (4) Spouse onboarding deferred. (5) Batch creation UX is inline in chat — keeps conversational feel; review sheet only if editing friction surfaces. Phase 1 (conversational onboarding) ships first; Phase 2 (data freshness) begins only after onboarding is validated.
- Rationale: The conversational brain-dump approach flips onboarding from "fill out forms" to "just tell me what's going on," which aligns with Olivia's product ethos. The freshness system pairs naturally: onboarding solves day-one, freshness solves day-thirty. Phasing de-risks scope and ensures the core flow is validated before adding the review layer.
- Alternatives considered: (1) Form wizard onboarding — rejected as contrary to Olivia's conversational identity. (2) Auto-creation from AI parsing without review — rejected per trust model (all entity creation requires explicit confirmation). (3) Adaptive health check cadence — deferred as over-engineering for initial release.
- Trade-offs: Inline batch creation in chat is simpler but offers less editing control than a dedicated review sheet. Accepted because conversational feel is the priority; review sheet can be a fast-follow if needed. Monthly fixed frequency may be too frequent or infrequent for some users but avoids complexity of adaptive scheduling.
- Status: active
- Related docs: `docs/specs/onboarding-and-data-freshness.md`, OLI-117

### D-055: Home Screen Declutter spec approved — Today-Forward layout with accessibility-compliant tokens
- Date: 2026-03-16
- Area: home screen / UI design
- Decision: Approved the Home Screen Declutter visual spec replacing the 7-day weekly grid with a **Today-Forward layout**. Key decisions: (1) Today is the hero zone — only populated workflow sections render, empty sections hidden entirely. (2) Persistent workflow nav row (Routines · Reminders · Meals · Lists) preserves OLI-110 navigation intent without empty scaffolding. (3) Upcoming days collapsed to summary rows (max 3). (4) New `/week` route for the full weekly view. (5) Two new semantic tokens (`--violet-text`, `--violet-border`) for WCAG AA compliance. (6) Day expansion deferred to M29 fast-follow. (7) `prefers-reduced-motion` support required for all animations.
- Rationale: The 7-day grid with 21+ section headers and empty-state slots violated product ethos ("reduce coordination burden, not create another dashboard"). Accessibility review identified 8 contrast/font/motion failures that were resolved before approval. The `--violet-text` token is the key systemic fix — raw `--violet` (#6C5CE7) fails AA in dark mode at 3.87:1; the new token resolves to `--violet-2` (#9D93F7) achieving 7.12:1.
- Alternatives considered: (1) Keep 7-day grid but hide empty sections — rejected because even with hidden empties, 7 day headers create visual noise. (2) Single-day view with swipe navigation — rejected as too aggressive a departure; the upcoming preview preserves week awareness.
- Trade-offs: Removing the weekly grid from Home means users need an extra tap to see the full week. Mitigated by "This week →" link and summary rows that surface upcoming content. The `/week` route extraction adds routing scope but preserves the existing rendering code.
- Status: active
- Related docs: `docs/plans/home-screen-declutter-visual-implementation-spec.md`, OLI-111, OLI-114

### D-054: M29 defined as post-chat household validation gate — restoring the observation cycle that M28 was designed to provide
- Date: 2026-03-16
- Area: milestone definition / product strategy
- Decision: Define M29 as **Post-Chat Household Validation & Next-Direction Scoping** — a usage-observation milestone that restores the validation gate M28 was designed to provide. M29 requires at least two weeks of household usage observation (including the newly shipped chat interface), documented qualitative observations about feature usage and chat interaction patterns, assumption validation, and a usage-informed direction decision before the next build cycle begins. Four candidate tracks are outlined (deepen chat, broaden household, complete H3 with meal planning, increase autonomy) but no commitment is made until usage signal exists. M30 is intentionally left undefined — its shape depends on what M29 reveals.
- Rationale: H5 Phases 1–3 shipped without household validation. M28 was bypassed by board directive (D-053), which was the board's prerogative, but the result is that assumptions A-007, A-008, and A-009 remain unvalidated by real usage. The product now has a substantial feature surface (inbox, reminders, recurring routines, shared lists, unified weekly view, activity history, planning rituals, AI summaries, nudges, push notifications, completion-window timing, and chat). Building more without knowing what the household actually uses risks compounding features without compounding value. The M28 bypass note explicitly states future milestones should follow the gate process. This decision honors that.
- Alternatives considered: (1) Define M29 as a build milestone with a specific track (e.g., meal planning or chat enhancements) — rejected because choosing a direction without usage signal would repeat the M28 bypass pattern, and this time there is no board directive pushing a specific direction. (2) Skip the validation gate entirely and let the board direct the next cycle — rejected because the CEO's job is to recommend the right process, not assume the board will always bypass it. If the board wants to direct again, they can. (3) A shorter validation period (1 week) — rejected because 2 weeks is already the minimum for observing steady-state behavior rather than novelty-driven usage.
- Trade-offs: Pausing building for 2+ weeks risks momentum loss. Mitigated by concrete exit criteria that do not require exhaustive data — 3+ qualitative chat observations and 3+ broader observations are sufficient. The team can resume quickly once M29 closes. If the board directs a specific build target before M29 completes, the bypass can be recorded honestly (as with M28) and work proceeds.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M29, M30), `docs/roadmap/roadmap.md` (H5 Phase 3 completion), D-053, D-052, M28

### D-053: Chat interface chosen as H5 Phase 3 direction — board directive, M28 validation gate bypassed
- Date: 2026-03-16
- Area: product direction / H5 Phase 3
- Decision: The chat interface is the active Phase 3 direction for H5. The board assigned OLI-95 ("Support Olivia chat interface") directly, directing the team to build a conversational assistant surface layered on top of existing domain capabilities. The chat feature lets users interact with Olivia as a household-aware assistant that can read state, suggest actions, and draft changes with approval. This decision supersedes the open-ended Phase 3 candidate list in D-052 and sets the next build cycle direction.
- Rationale: Board-driven decision. The app already has a chat surface (`/olivia` route) that users expect to work, but it is entirely mocked. The board determined that making this surface functional is the right next step, rather than waiting for usage observation to surface a direction organically. This is a legitimate product call — the chat interface is a high-leverage feature that connects the full H2-H5 capability surface (inbox, reminders, lists, routines, meals, planning rituals, nudges) through a single conversational entry point.
- Alternatives considered: The M28 process would have evaluated rule-based automation, per-member push targeting, push action buttons, Layer 2 LLM timing, and horizontal product expansion as Phase 3 candidates. The board chose chat instead, which was not on the original Phase 3 candidate list.
- Trade-offs: M28's household validation gate (2+ weeks of usage observation, 3+ qualitative observations, usage-informed direction) was effectively bypassed by direct board assignment. The validation pause that D-052 established — specifically to avoid speculative sequencing — was overridden by board authority. This is an acceptable override: the board has prerogative to direct product work, and the chat direction has clear user-facing value. However, the assumptions that M28 was designed to validate (A-007, A-008, A-009) remain unvalidated by household usage. Future milestones should still follow the gate process unless the board explicitly directs otherwise.
- Status: active
- Related docs: OLI-95, D-052, `docs/roadmap/roadmap.md` (H5 Phase 3), `docs/roadmap/milestones.md` (M28)

### D-052: H5 Phase 2 complete — household validation pause before Phase 3 scoping
- Date: 2026-03-16
- Area: roadmap progression / product strategy
- Decision: Record H5 Phase 2 as complete. All three actionable Phase 2 priorities are built and validated: (1) real AI provider wiring — M21/M22 complete (D-044), `ClaudeAiProvider` built and delivering real Claude Haiku content for planning ritual summaries; (2) push notifications — M23/M24 complete (D-046), full push delivery infrastructure with scheduler, opt-in, and Service Worker; (3) AI-enhanced nudge timing Layer 1 — M25/M26/M27 complete (D-051), completion-window-based push timing with IQR algorithm. The fourth Phase 2 priority (rule-based automation) was explicitly deferred to Phase 3+ per D-042. Define M28 as **Household Validation & Phase 3 Scoping** — a usage-observation milestone, not a build milestone. The next build cycle does not begin until real household usage of Phase 2 capabilities provides signal on what to build next.
- Rationale: The project has shipped continuously from H2 through H5 Phase 2 without a meaningful usage feedback loop. Every milestone from M4 onward was advanced on implementation completeness, not household usage observation. That was the right call for momentum — but the product now has a substantial feature surface (shared inbox, reminders, shared lists, recurring routines, meal planning, unified weekly view, activity history, planning ritual support, AI-assisted summaries, proactive nudges, push notifications, and completion-window timing) that no household member has lived with at steady state. The highest-ROI move is to pause building and observe: which features get used, which get ignored, where friction appears, and what the household actually asks for next. Phase 3 direction (rule-based automation, per-member push targeting, push action buttons, Layer 2 LLM timing, or something else entirely) should be informed by that signal rather than by speculative sequencing.
- Alternatives considered: (1) immediately scoping Phase 3 with rule-based automation as the next target per D-042 — rejected because rule-based automation was the lowest-priority Phase 2 item, and committing to it now without usage signal would be speculative. (2) Starting a horizontal expansion cycle (spouse write-access, multi-user roles) — rejected for the same reason; the right expansion depends on which H2-H5 features prove useful. (3) A pure retrospective milestone (M25/M20 pattern) that immediately feeds into a build cycle — rejected because the gap is not spec clarity, it is usage data.
- Trade-offs: pausing building risks losing momentum if the pause extends too long. Mitigated by defining concrete exit criteria on M28 that do not require exhaustive data — qualitative household observations and a defined review date are sufficient. The team can resume building quickly once M28 closes. The risk of building the wrong thing without usage signal is higher than the risk of a brief pause.
- Status: active
- Related docs: `docs/roadmap/roadmap.md` (H5 Phase 2), `docs/roadmap/milestones.md` (M28), D-051, D-046, D-044, D-042, D-041

### D-051: M27 complete — completion-window push timing implemented
- Date: 2026-03-16
- Area: build completion / H5 Phase 2 Layer 1
- Decision: Advance M27 (AI-Enhanced Nudge Timing Build) to complete. All 7 implementation plan phases executed in OLI-81. The push notification scheduler now evaluates a completion window for routine nudges before delivery: routines with 4+ completions and the current time before the IQR-derived window are held until the window opens. All 14 acceptance criteria from the spec are verified through 10 unit tests and 7 integration tests. All 249 tests pass (158 domain + 91 API, zero regressions).
- Rationale: implementation followed the plan exactly. No spec ambiguities or architectural surprises. The IQR algorithm, variance guard (6h), lead buffer (1h), and max hold bypass (2 days) all behave as specified. The `OLIVIA_HOUSEHOLD_TIMEZONE` env var provides correct DST-aware timezone handling via `Intl.DateTimeFormat`. No new tables, columns, or migrations were needed.
- Alternatives considered: none — the implementation plan was detailed enough to execute directly.
- Trade-offs: the algorithm is heuristic (Layer 1); more sophisticated timing (Layer 2 LLM-based) is deferred to Phase 3+. Completion windows are household-level, not per-member. Constants are in code, not env-var-configurable — acceptable for initial deployment, adjustable later.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M27), `docs/specs/completion-window-push-timing.md`, `docs/plans/completion-window-push-timing-implementation-plan.md`, D-048, D-049, D-050

### D-050: M26 complete — completion-window push timing build readiness achieved; M27 activated
- Date: 2026-03-16
- Area: delivery planning / roadmap progression / H5 Phase 2 Layer 1
- Decision: Advance M26 (AI-Enhanced Nudge Timing Build Readiness) to complete. All three required artifacts are in place: (1) CEO-approved feature spec (D-048) with 14 acceptance criteria; (2) implementation plan (OLI-80, D-049) with 7 phases and all 5 open questions resolved; (3) learnings and decisions updated (L-027, D-047, D-048, D-049). All five exit criteria satisfied. M27 (AI-Enhanced Nudge Timing Build) is now the active milestone — the Founding Engineer can implement completion-window-based push timing using the spec and plan without product ambiguity.
- Rationale: The build readiness pattern (spec + plan + learnings) has been validated across M16, M18, M21, M23, and now M26. The implementation plan resolves all open questions, maps all 14 acceptance criteria to tests, and is scoped entirely within the existing scheduler evaluation loop. No new infrastructure, tables, or entity types. The Founding Engineer has a clear algorithm, edge cases, and bounded engineering decisions.
- Alternatives considered: none — M26 follows the established build-readiness milestone pattern.
- Trade-offs: advancing now means the Founding Engineer begins implementation on the current plan. If household usage reveals the IQR algorithm needs tuning, the configurable constants in `@olivia/contracts` allow adjustment without architectural changes.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M26, M27), `docs/specs/completion-window-push-timing.md`, `docs/plans/completion-window-push-timing-implementation-plan.md`, D-048, D-049, L-027

### D-049: Completion-window push timing implementation plan — 5 open questions resolved
- Date: 2026-03-16
- Area: delivery planning / H5 Phase 2 Layer 1
- Decision: Complete the implementation plan for completion-window-based push timing (`docs/plans/completion-window-push-timing-implementation-plan.md`). Resolve the 5 open questions from the spec as architecture decisions: (1) timezone source — `OLIVIA_HOUSEHOLD_TIMEZONE` env var with server-local fallback via `Intl.DateTimeFormat`, (2) maximum hold duration — 2 days (48h since `currentDueDate`), (3) sample size — 8 most recent non-null non-skipped `completedAt` timestamps, (4) lead buffer — 1 hour before 25th percentile, (5) variance threshold — 6-hour IQR span. Two additional decisions: configurable constants are exported from `@olivia/contracts` (not env-var-configurable), and completion windows apply only to routine nudges in the push path (not in-app tray). The plan has 7 phases and maps all 14 acceptance criteria to specific unit and integration tests.
- Rationale: All 5 spec recommendations adopted as-is — they are well-reasoned defaults for household scale. Timezone via env var is the simplest reliable source for single-household Phase 2. Constants as code (not env vars) because they are algorithm parameters requiring statistical understanding to tune, not deployment configuration. The plan follows the established push-notifications implementation plan structure (8 phases, verification matrix, phase gates).
- Alternatives considered: (1) timezone from most recent client request header — rejected because the scheduler runs server-side without a request context; (2) env vars for all algorithm constants — rejected as over-engineering for parameters that are unlikely to need per-environment tuning; (3) `date-fns-tz` for timezone conversion — deferred in favor of `Intl.DateTimeFormat` which requires no new dependency.
- Trade-offs: `Intl.DateTimeFormat` is slightly more verbose than `date-fns-tz` but avoids a new dependency. Constants-as-code means redeployment to change thresholds, accepted because tuning is expected to be rare.
- Status: active
- Related docs: `docs/plans/completion-window-push-timing-implementation-plan.md`, `docs/specs/completion-window-push-timing.md`, D-048, M26

### D-048: CEO approves completion-window-based push timing spec — M26 spec gate passed
- Date: 2026-03-16
- Area: delivery planning / H5 Phase 2 Layer 1
- Decision: Approve `docs/specs/completion-window-push-timing.md` as the feature spec for completion-window-based push timing. All four key design decisions confirmed: (1) routine nudges only in this phase — reminders and rituals use immediate delivery, (2) invisible to household — no UI, no settings, no timing explanation surfaced, (3) no new tables or columns — windows computed on demand from existing `routine_occurrences.completedAt` data, (4) IQR algorithm with variance guard (>6h = no_window) and 2-day maximum hold bypass. The 5 open questions (timezone source, max hold duration, sample size, lead buffer, variance threshold) are appropriately scoped as Founding Engineer implementation decisions with sensible defaults recommended. 14 acceptance criteria are concrete and testable. Trust model is unchanged — timing changes when Olivia speaks, not what Olivia can do.
- Rationale: The spec is thorough on edge cases, risks, and failure modes. The IQR approach is statistically sound for small samples. On-demand computation is correct at household scale. The scope is narrow enough to validate the timing hypothesis before investing in Layer 2 (LLM). The spec builds cleanly on the M24 push infrastructure and extends the existing scheduler evaluation loop.
- Alternatives considered: none at this stage — this spec follows directly from the M25 scoping decision (D-047) which already evaluated the two-layer approach.
- Trade-offs: household-level windows (not per-member) may produce blended windows for multi-member households; accepted as consistent with Phase 2 household-wide push posture. On-demand computation trades storage simplicity for repeated queries, acceptable at household scale.
- Status: active
- Related docs: `docs/specs/completion-window-push-timing.md`, D-047, L-027, M26

### D-047: M25 complete — AI-enhanced nudge timing scoped as two-layer approach; first spec target is completion-window-based push timing
- Date: 2026-03-16
- Area: delivery planning / roadmap progression / H5 Phase 2
- Decision: Advance M25 (AI-Enhanced Nudge Timing Scoping) to complete. AI-enhanced nudge timing is defined as a two-layer capability: Layer 1 (first spec target) uses historical routine completion timestamps to derive per-routine preferred completion windows and time push notification delivery accordingly — this is data-driven heuristic timing, no LLM calls. Layer 2 (deferred to Phase 3+) uses the Claude API behind the D-008 adapter boundary for cross-workflow context-aware timing decisions. The first spec target is explicitly named: completion-window-based push timing. The scheduler architecture (L-027) confirms that timing logic fits inside the existing `evaluateNudgePushRule` evaluation loop as a bounded extension — no new scheduling infrastructure required.
- Rationale: Layer 1 is the right first step because: (1) the data inputs already exist — `routine_occurrences.completedAt` timestamps are queryable from the same database the scheduler reads; (2) heuristic timing validates the concept before adding LLM complexity and cost; (3) the fallback is clean — insufficient data (<4 completions) means existing immediate-delivery behavior; (4) the trust model is unchanged — timing signals affect when Olivia speaks, not what Olivia can do; (5) the scheduler architecture (30-min interval, per-nudge evaluation) naturally accommodates timing-window checks as an additional decision layer between dedup and send. Layer 2 is correctly deferred because cross-workflow AI reasoning requires: (a) validated Layer 1 timing patterns to know which signals matter, (b) richer household interaction data than currently exists, and (c) clear cost/benefit over heuristics before introducing LLM calls in the hot delivery path.
- Alternatives considered: skipping Layer 1 and going directly to LLM-based timing — rejected; insufficient data signal for a household of 1-2 people, and heuristic timing is simpler, cheaper, and validates the concept. Implementing user-configurable quiet hours instead of AI timing — complementary but different: quiet hours are explicit preferences, AI timing is learned behavior; quiet hours could be a parallel Phase 3 feature. Deferring AI timing entirely until more household usage data exists — considered but rejected; the completion timestamp data already exists from routine usage, and the scheduler architecture is ready.
- Trade-offs: advancing M25 now means the next milestone (M26: AI-Enhanced Nudge Timing Build Readiness) requires a full feature spec and implementation plan for Layer 1. The feature spec must resolve: minimum completion count threshold, completion window calculation algorithm, hold-vs-send decision logic, and per-entity-type applicability (routines first, reminders second, rituals likely excluded from timing optimization).
- Status: active
- Related docs: `docs/roadmap/roadmap.md` (H5 Phase 2), `docs/roadmap/milestones.md` (M25), `docs/glossary.md` (Completion Window, Timing Signal), L-027, L-026, D-046, D-042

### D-046: M24 complete — push notifications fully built; next Phase 2 target is AI-enhanced nudge timing
- Date: 2026-03-16
- Area: delivery planning / roadmap progression
- Decision: Advance M24 (H5 Phase 2 Push Notifications Build) to complete. All required artifacts confirmed and all seven exit criteria satisfied: (1) all 15 acceptance criteria from `docs/specs/push-notifications.md` are verifiable — 8 implementation phases delivered per plan; (2) `push_subscriptions.user_id` is nullable TEXT from the start (Phase 3 readiness); (3) VAPID private key never logged, returned, or stored in database; (4) scheduler runs in-process on 30-minute interval, starts without error when VAPID keys absent (warning + skip); (5) Service Worker registers and receives push events via `injectManifest` strategy; (6) full test suite green — 267 tests passing, no regression; (7) `docs/roadmap/milestones.md` to be updated with M24 completion. Implementation committed as f824a67 (OLI-77). Next H5 Phase 2 target per D-042: AI-enhanced nudge timing. Define M25 (AI-Enhanced Nudge Timing Scoping) as the next active milestone.
- Rationale: M24 represents the second major H5 Phase 2 delivery. Push notifications close the gap where proactive nudges only reached household members actively in the app. The implementation is clean: 2 new tables (push_subscriptions, push_notification_log), 3 new API endpoints, in-process scheduler with 2-hour dedup and 48-hour log purge, Service Worker with push/notificationclick handlers, and an in-app opt-in prompt integrated into the nudge tray. The `injectManifest` VitePWA strategy gives full control over the Service Worker without framework overhead. 267 tests pass with no regression to existing nudge, reminder, or household endpoints. The nullable `userId` column on `push_subscriptions` positions the schema for Phase 3 per-member targeting without requiring a migration-breaking change.
- Alternatives considered: requiring household usage validation before advancing M24 — not required; implementation correctness is the M24 gate, not usage. Including push action buttons (complete/snooze from lock screen) — correctly deferred to Phase 3 per spec. Adding AI-enhanced nudge timing in the same milestone — correctly sequenced after push; requires usage data and Phase 1 trust signal evidence.
- Trade-offs: advancing now makes AI-enhanced nudge timing the active H5 Phase 2 target. Push opt-in rate will be an important validation signal for nudge utility (noted in spec validation section). The in-process scheduler is sufficient at household scale but may need extraction if multi-household deployment is ever considered.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M24), `docs/specs/push-notifications.md`, `docs/plans/push-notifications-implementation-plan.md`, D-045, D-042, D-039, L-024

### D-045: Push notifications spec approved by CEO — M23 progressing; implementation plan commissioned
- Date: 2026-03-15
- Area: delivery planning / roadmap progression
- Decision: Approve `docs/specs/push-notifications.md` for implementation planning. All M23 spec exit criteria are met: (1) the spec is concrete enough for implementation without major product ambiguity; (2) all failure modes are defined — delivery failure (non-410 logged, not retried in Phase 2), stale subscription (410 removes subscription automatically), VAPID absence (startup warning, scheduler skips, no failure), iOS PWA constraints (16.4+ / Home Screen requirement); (3) the implementation is scoped to push delivery infrastructure only — no changes to existing nudge trigger logic, no new entity types; (4) VAPID private key handling is specified (never logged, never in API responses, never in database — identical to `ANTHROPIC_API_KEY` precedent). Open questions resolved: (1) scheduler interval = 30 minutes (Founding Engineer may adjust); (2) dedup window = 2 hours; (3) `push_subscriptions` should include a nullable `userId` column from the start for Phase 3 per-member targeting; (4) iOS Home Screen note in opt-in prompt = yes (visual spec designer decision); (5) VAPID contact email = Founding Engineer / server operator decision, placeholder acceptable; (6) scheduler placement = in-process recurring interval inside the API server (consistent with codebase simplicity precedents). Commission the implementation plan (second M23 artifact) from the Founding Engineer to complete M23.
- Rationale: The spec is well-bounded, directly addresses the household gap (nudges only reach members who are actively in the app), and inherits the full advisory-only trust model from H5 Phase 1 without modification. The two new tables (`push_subscriptions`, `push_notification_log`) are the minimum required for subscription storage and dedup tracking. The Web Push API + VAPID standard is the correct cross-platform mechanism — no proprietary SDK needed. The in-process scheduler recommendation is consistent with household scale and the simplicity precedents established in this codebase. All 15 acceptance criteria are verifiable and span the full delivery flow from opt-in through tap navigation. No product ambiguity remains that would block implementation.
- Alternatives considered: requiring push action buttons (complete/snooze from lock screen) in Phase 2 — correctly excluded; requires Service Worker background sync and complex action handling, Phase 3. Including per-member push targeting in Phase 2 — correctly deferred; household-wide posture is consistent with H5 Phase 1 household-wide model. Using an external job queue (e.g., Redis/BullMQ) for the scheduler — correctly rejected; no external queue needed at household scale, in-process interval is simpler and sufficient.
- Trade-offs: approving now allows the Founding Engineer to begin implementation planning immediately. The nullable `userId` column adds minor schema complexity but prevents a migration-breaking schema change in Phase 3 when per-member targeting becomes the target.
- Status: active
- Related docs: `docs/specs/push-notifications.md`, `docs/roadmap/milestones.md` (M23), D-042, D-039, D-002, L-023, L-024

### D-044: M21 complete and M22 complete — real AI provider wiring built and validated; next Phase 2 target is push notifications
- Date: 2026-03-16
- Area: roadmap progression / product delivery
- Decision: Advance M21 (H5 Phase 2 Build Readiness) and M22 (H5 Phase 2 Build) to complete. M21: all required artifacts existed — CEO-approved spec (OLI-67, D-043), implementation plan (`docs/plans/real-ai-provider-wiring-implementation-plan.md`), and updated decisions (D-042, D-043). M22: Founding Engineer implemented `ClaudeAiProvider` in OLI-70 (commit d68fc64) — all 7 acceptance criteria met, 71 tests pass, no PWA changes, no new routes, no new database tables. The AI-assisted planning ritual summaries feature now delivers real Claude Haiku content for households with `ANTHROPIC_API_KEY` set; degrades cleanly to stub text when not set. Next H5 Phase 2 target is push notifications for proactive household nudges, per D-042.
- Rationale: (1) M21: the spec and implementation plan existed and satisfied all exit criteria — no ambiguity remained for the Founding Engineer. (2) M22: OLI-70 implementation is complete and verified against all acceptance criteria from `docs/specs/real-ai-provider-wiring.md` — TypeScript clean, 71 tests pass, privacy boundary enforced by `RitualSummaryInput` type, `ANTHROPIC_API_KEY` never logged or stored. The implementation followed the plan exactly: `Promise.allSettled` for parallel generation, 10-second `AbortSignal` timeout per section, catch-all returning null drafts. Following the M4, M7, M10, M17, M19 advancement precedents, implementation completeness with full test coverage is sufficient evidence to advance. (3) Push notifications are correctly sequenced next — in-app nudge utility should be validated before adding push delivery complexity per D-042 rationale.
- Alternatives considered: waiting for household usage of real AI summaries before advancing M22 — not required; implementation correctness is the M22 gate, not usage. Requiring a separate CEO code review before marking M22 complete — the Founding Engineer's 71-test verification with full acceptance criteria coverage satisfies the evidence requirement.
- Trade-offs: advancing now makes push notifications the active H5 Phase 2 target. Prompt quality refinement is expected as a Phase 2 follow-on once households use real AI content; the review flow's edit affordance is the in-flow mitigation.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M21, M22), `docs/specs/real-ai-provider-wiring.md`, `docs/plans/real-ai-provider-wiring-implementation-plan.md`, D-042, D-043, L-023

### D-043: Real AI provider wiring spec approved (OLI-67); implementation plan commissioned for M21 completion
- Date: 2026-03-15
- Area: roadmap progression / product strategy
- Decision: Approve `docs/specs/real-ai-provider-wiring.md` as the first H5 Phase 2 feature spec. All M21 spec exit criteria are met: (1) the spec is concrete enough for implementation without major product ambiguity; (2) all failure modes are defined in an explicit table (missing key, invalid key, network error, rate limit, timeout, partial failure); (3) the implementation is scoped strictly to the D-008 adapter boundary — no PWA changes, no new API routes, no new database tables; (4) target model (`claude-haiku-4-5-20251001`), prompt token budget (~500 input / 100–150 word output per section), and streaming scope (not in scope) are all confirmed. Commission the implementation plan (M21 second required artifact) from the VP of Product / Founding Engineer to complete M21.
- Rationale: The spec is well-bounded, directly addresses a real household gap (the AI-assisted summaries feature is visible but inert without a live provider), and inherits the full trust model and fallback behavior from Phase 1 without changes. Claude Haiku is the correct model choice — latency-appropriate for an interactive review flow, cost-appropriate for household scale. The advisory-only posture, privacy boundary (H4 structured data only), and clean degradation pattern are all preserved. No product ambiguity remains that would block implementation.
- Alternatives considered: requesting changes to widen the scope (add real AI for parseDraft/summarize methods) — rejected because it would expand Phase 2 scope before the primary user-facing capability is validated. Requesting a different model — rejected; Haiku is demonstrably appropriate for structured summarization at household cadence.
- Trade-offs: approving now allows the Founding Engineer to begin implementation planning immediately. The one remaining open question (sequential vs. parallel generation) is explicitly delegated to the Founding Engineer as an implementation decision.
- Status: active
- Related docs: `docs/specs/real-ai-provider-wiring.md`, `docs/roadmap/milestones.md` (M21), D-042, D-008, D-035, L-023

### D-042: M20 complete — H5 Phase 2 scoped; real AI provider wiring confirmed as first Phase 2 spec target; M21 activated
- Date: 2026-03-15
- Area: roadmap progression / product strategy
- Decision: Advance M20 (H5 Phase 2 Scoping) to complete. All four required artifacts are in place: (1) `docs/roadmap/roadmap.md` H5 section updated with concrete Phase 2 scope — four Phase 2 priorities in order with sequencing rationale (real AI provider wiring → push notifications → AI-enhanced nudge timing → rule-based automation Phase 3+); (2) first Phase 2 spec target confirmed as real AI provider wiring; (3) `docs/glossary.md` updated with Push Notification; (4) `docs/learnings/` reflects post-Phase 1 state via L-023, L-024, L-025. Activate M21 (H5 Phase 2 Build Readiness: write and approve the first H5 Phase 2 spec for real AI provider wiring).
- Rationale: All three M20 exit criteria are satisfied: (1) H5 Phase 2 direction is concrete — four targets in order with explicit sequencing rationale derived from Phase 1 build evidence; (2) the Phase 1 → Phase 2 relationship is described at the product level — L-023 validates the additive-with-clean-degradation pattern, L-024 validates computed endpoints, and the roadmap H5 Phase 2 section explicitly names what Phase 1 confirmed and what Phase 2 extends; (3) the first Phase 2 capability area is specific and bounded — real AI provider wiring uses the existing D-008 adapter boundary, requires no new product concepts, and directly unlocks an already-built user-facing feature. Real AI provider wiring is the highest-leverage Phase 2 step because the AI-assisted summaries feature is fully user-facing but renders as a fallback-only state for real households until a live Claude API provider is wired in.
- Alternatives considered: naming push notifications as the first Phase 2 target — rejected because push adds device token storage, server-side scheduling, and platform permission flows before in-app nudge utility is validated. Naming AI-enhanced nudge timing first — rejected per D-034; requires Phase 1 trust signal evidence first. Deferring M20 completion until household usage data is available — not required; the Phase 1 → Phase 2 scoping work is complete and the roadmap has sufficient concrete direction for M21 spec work.
- Trade-offs: completing M20 now enables M21 (H5 Phase 2 Build Readiness) to begin immediately. The feature spec for real AI provider wiring is the only remaining artifact needed before implementation. The spec is expected to be narrow: provider interface implementation, API key configuration strategy, error propagation contract, and rate limiting approach — all bounded within the existing D-008 boundary.
- Status: active
- Related docs: `docs/roadmap/roadmap.md` (H5 Phase 2), `docs/roadmap/milestones.md` (M20, M21), `docs/glossary.md`, D-041, D-034, D-008, L-023, L-024, L-025

### D-041: M19 complete — H5 Phase 1 complete; real AI provider wiring named as first H5 Phase 2 target; M20 activated
- Date: 2026-03-16
- Area: delivery planning / roadmap progression
- Decision: Advance M19 (H5 Second Workflow Build — proactive household nudges) to complete. All required artifacts confirmed and all eight exit criteria satisfied: (1) nudge tray appears on home screen for overdue routines, approaching reminders, and overdue planning rituals — absent when no nudges active; (2) per-card workflow-type differentiation confirmed (mint/rose/violet stripe + icon); (3) action buttons functional — "Mark done", "Skip", "Done", "Snooze 1h", "Start review →"; (4) dismiss × client-local daily reset with no server modification; (5) navigation count badge on Home tab, absent at zero; (6) no AI calls — purely computed; (7) no new server-side tables; (8) all 18 acceptance criteria confirmed — 211 tests passing, typecheck clean. Activate M20 (H5 Phase 2 Scoping). Real AI provider wiring is named as the first H5 Phase 2 target: connecting the `DisabledAiProvider` stub to a real Claude API provider so that AI-assisted planning ritual summaries generate actual content for households.
- Rationale: H5 Phase 1 is now complete — both advisory-only H5 capabilities (AI-assisted planning ritual summaries and proactive household nudges) are built and validated. The most immediate H5 Phase 2 value is real AI provider wiring: the AI-assisted summaries feature exists and is fully user-facing, but `DisabledAiProvider` renders it inert for real households. Wiring a real Claude API provider unlocks the feature households already encounter in the review flow. This is higher-value than push notification infrastructure (which adds complexity before in-app nudge utility is validated) or AI-enhanced nudge timing (which requires Phase 1 trust signal evidence first per D-034).
- Alternatives considered: naming push notifications as the first Phase 2 target — rejected; push adds device token storage, server-side scheduling, and platform permission flows before in-app nudge value is validated (consistent with D-039 rationale). Naming AI-enhanced nudge timing first — rejected per D-034; requires Phase 1 evidence first. Deferring Phase 2 entirely pending household usage observations — not required; the DisabledAiProvider gap is known and the connection path is defined by D-008.
- Trade-offs: real AI provider wiring is a bounded, well-scoped Phase 2 first step. The D-008 adapter boundary is already in place; the Phase 2 work is implementing the `ClaudeAiProvider` behind that boundary and wiring it into the API. This requires handling API key configuration, error propagation from the real provider, and rate limiting strategy — all bounded within the existing provider interface.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M19, M20), `docs/specs/proactive-household-nudges.md`, D-040, D-039, D-008, D-035, L-023, L-024

### D-040: M18 complete — proactive household nudges build-ready; M19 activated
- Date: 2026-03-16
- Area: delivery planning / roadmap progression
- Decision: Advance M18 (H5 Second Workflow Build Readiness — proactive household nudges) to complete. All four required artifacts are in place: CEO-approved feature spec (D-039, `docs/specs/proactive-household-nudges.md`), visual spec (OLI-62, `docs/plans/proactive-household-nudges-visual-implementation-spec.md`), implementation plan (OLI-63, `docs/plans/proactive-household-nudges-implementation-plan.md`), and updated learnings and decisions (L-023, D-038, D-039). Activate M19 (H5 Second Workflow Build) as the next active milestone.
- Rationale: All M18 exit criteria are satisfied: (1) the feature spec is CEO-approved (D-039) with 18 acceptance criteria — execution-ready without product ambiguity; (2) the visual spec (OLI-62) resolves all nine designer decisions deferred from the feature spec: nudge tray placement (dedicated top-of-home-content section, no empty placeholder), nudge card design (compact surface card with left accent stripe and workflow-type icon, distinct from AI voice Olivia Nudge Card), action button affordances (primary + ghost pair for routine/reminder; full-width primary for ritual; 44px tap targets), dismiss interaction (× tap, immediate, no confirmation), navigation count badge (rose dot badge on Home tab), workflow-type differentiation (mint/↻ routine, rose/bell reminder, violet/calendar ritual), "+" overflow indicator (text row below 5th card), empty nudge state (tray completely absent), and copy tone (calm, factual, non-judgmental); (3) the implementation plan (OLI-63) defines the `GET /api/nudges` computed endpoint, Dexie v7 `nudgeDismissals` table, 15-minute polling with Page Visibility API pause, skip-occurrence as new work in Phase 3, and no new server-side tables; (4) all five open questions from the feature spec are resolved in D-039.
- Alternatives considered: delaying M18 completion until visual spec was reviewed by VP of Product — not required; visual spec follows established pattern and all decisions are internally consistent. Requesting additional learnings before advancing — L-023 captured the relevant H5 Phase 1 pattern; no new learning signals available before build begins.
- Trade-offs: advancing M18 now makes M19 (H5 Second Workflow Build) the active milestone. The Founding Engineer can begin implementation immediately using the implementation plan, visual spec, and feature spec as the full artifact set.
- Status: active
- Related docs: `docs/specs/proactive-household-nudges.md`, `docs/plans/proactive-household-nudges-visual-implementation-spec.md`, `docs/plans/proactive-household-nudges-implementation-plan.md`, `docs/roadmap/milestones.md` (M18, M19), D-039, D-038, L-023

### D-039: Proactive household nudges spec approved by CEO — M18 progressing
- Date: 2026-03-15
- Area: delivery planning / roadmap progression
- Decision: Approve `docs/specs/proactive-household-nudges.md` for visual spec and implementation planning. All five open questions resolved as recommended in the spec. Phase 1 = in-app nudges only; snooze interval = 1 hour default (Founding Engineer constant); approaching reminder threshold = 24 hours (Founding Engineer constant); max nudge display cap = 5 (designer decision for visual spec); no snooze affordance for planning ritual nudges in Phase 1.
- Rationale: The spec meets all quality gates: (1) full template coverage including trust model, permissions, AI role, risks, UX notes, and 18 acceptance criteria; (2) advisory-only posture strictly maintained — nudges are Olivia-initiated but no record changes occur without an explicit user tap; (3) no new server-side tables in Phase 1 — `GET /api/nudges` is a computed endpoint from existing entity state (`routine_occurrences`, `reminders`, `routines`); (4) client-local dismiss state in Dexie is appropriately minimal and not server-synced, consistent with L-023's additive-with-clean-degradation discipline; (5) all action endpoints are existing ones already in use — complete-occurrence, skip-occurrence, reminder resolution, review flow navigation; (6) Phase 1 in-app scope correctly defers push notification infrastructure until household validates nudge utility; (7) H5 behavioral guardrails fully applied — Olivia proposes, user acts, no automation; (8) consistent with D-002 (advisory-only), D-010 (non-destructive user actions execute immediately), D-008 (AI deferred to Phase 2+ via provider adapter boundary).
- Alternatives considered: including push notifications in Phase 1 — correctly rejected; push adds device token storage, server-side scheduling, and platform permission flow complexity before in-app value is validated. Including AI-enhanced nudge timing in Phase 1 — correctly excluded per D-034; requires Phase 1 trust signal evidence first.
- Trade-offs: scoping Phase 1 to computed, table-free in-app nudges keeps M18 lean. Push and AI-enhanced timing are well-scoped Phase 2 extensions with clear sequencing rationale in the spec.
- Status: active
- Related docs: `docs/specs/proactive-household-nudges.md`, `docs/roadmap/milestones.md` (M18), D-038, D-034, D-002, D-010, D-008, L-023

### D-038: M17 complete — proactive household nudges named as second H5 spec target; M18 activated
- Date: 2026-03-15
- Area: roadmap progression / product strategy
- Decision: Advance M17 (H5 First Workflow Build — AI-assisted planning ritual summaries) to complete based on D-037 implementation evidence. Activate M18 (H5 Second Workflow Build Readiness — proactive household nudges). Feature spec for proactive household nudges drafted (`docs/specs/proactive-household-nudges.md`). Submitted for CEO approval.
- Rationale: M17 satisfied all five exit criteria (D-037). The second H5 target — proactive household nudges — was identified in D-034 as sequenced after Phase 1 AI-content validation. M17 provides that validation. Proactive nudges is the right M18 target because: (a) it is the explicitly named second H5 capability in the roadmap; (b) it continues the advisory-only H5 pattern — Olivia initiates, user confirms; (c) it builds on the same `currentDueDate` and `dueDate` fields already established in H3/H4, requiring no new tables in Phase 1; (d) Phase 1 scopes to in-app nudges only, deferring push notification infrastructure until the household validates that nudges change behavior.
- Alternatives considered: starting M18 with push notifications — rejected because push adds significant infrastructure (device token storage, server-side scheduling, platform permission flows) that should wait until in-app nudge value is validated. Starting M18 with AI-enhanced nudge timing — rejected because AI nudge scheduling requires Phase 1 trust signal evidence first, per D-034.
- Trade-offs: scoping Phase 1 to in-app-only nudges keeps M18 lean and validation-focused. Push is a Phase 2 addition with clear sequencing rationale documented in the spec open questions.
- Status: active
- Related docs: `docs/specs/proactive-household-nudges.md`, `docs/roadmap/milestones.md` (M17, M18), D-037, D-034, L-023

### D-037: M17 complete — AI-assisted planning ritual summaries built; FK insert order pattern documented
- Date: 2026-03-15
- Area: implementation / data integrity
- Decision: M17 (H5 First Workflow Build) is complete. All 7 phases of the AI-assisted planning ritual summaries implementation plan were executed: DB migration, contracts, AI provider interface, API endpoints (`generate-ritual-summary`, extended `complete-ritual`), PWA client/sync layer, PWA surface changes (`ReviewFlowPage` + `ReviewRecordDetailPage`), 50 API tests passing. A FK circular dependency bug discovered during testing: `review_records.ritual_occurrence_id → routine_occurrences.id` AND `routine_occurrences.review_record_id → review_records.id`. Fixed by inserting `routine_occurrences` first (with `review_record_id = NULL`), then `review_records`, then updating the occurrence to link back.
- Rationale: The circular FK schema requires a 3-step atomic insert: (1) insert occurrence with null review_record_id, (2) insert review_record (FK on occurrence now satisfied), (3) update occurrence.review_record_id. This pattern must be used any time a circular FK exists in SQLite with `foreign_keys = ON`.
- Alternatives considered: disabling FK checks within the transaction with `PRAGMA defer_foreign_keys` — rejected; less clear and SQLite's deferred FK behavior is statement-level only. Dropping the `review_record_id` FK on `routine_occurrences` — rejected; would break the integrity guarantee that every completed ritual occurrence points to its review record.
- Trade-offs: slightly more SQL in `completeRitualOccurrence` (3 statements instead of 2), but the circular reference is fully enforced and the transaction remains atomic.
- Status: active
- Related docs: `apps/api/src/repository.ts` (`completeRitualOccurrence`), `apps/api/drizzle/0005_planning_ritual_support.sql`, `docs/roadmap/milestones.md` (M17)

### D-036: M16 complete — AI-assisted planning ritual summaries implementation plan approved
- Date: 2026-03-16
- Area: delivery planning / roadmap progression
- Decision: Advance M16 (H5 Build Readiness) to complete. All four required artifacts are in place: CEO-approved feature spec (D-035), visual spec (OLI-57), implementation plan (OLI-58), and updated learnings/decisions (L-021, D-034).
- Rationale: All M16 exit criteria are satisfied: (1) the feature spec is CEO-approved with 17 acceptance criteria — execution-ready without product ambiguity; (2) the visual spec resolves all designer decisions deferred from the feature spec (draft section layout, lavender-tinted card attribution, inline tap-to-edit, fixed-footer accept/dismiss, skeleton loading, calm inline error, AI-assisted badge in review record detail, null narrative state); (3) the implementation plan defines the AI provider call shape (server-side via D-008 adapter boundary), prompt design boundary (H4 structured data including item names per Decision E), storage model (2 nullable columns + ai_generation_used flag on review_records), and trust model enforcement (no storage before acceptance, attribution preserved as AI-assisted badge); (4) trust model implications are fully documented and visible in both the feature spec and implementation plan.
- Alternatives considered: using a client-side AI call from the PWA — correctly excluded to maintain the D-008 adapter boundary. Including a real AI provider in Phase 1 gate — correctly deferred; DisabledAiProvider stub delivers end-to-end testability. Requiring both narratives to be non-null before the review can proceed — correctly excluded; the review is always completable without AI.
- Trade-offs: advancing M16 now makes M17 (H5 Build) the active milestone. The Founding Engineer can begin implementation immediately. Real AI provider wiring remains a follow-on step.
- Status: active
- Related docs: `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md`, `docs/specs/ai-assisted-ritual-summaries.md`, `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`, `docs/roadmap/milestones.md` (M16), D-035, D-034, D-008

### D-035: AI-assisted planning ritual summaries spec approved by CEO — M16 progressing
- Date: 2026-03-15
- Area: delivery planning / roadmap progression
- Decision: Approve `docs/specs/ai-assisted-ritual-summaries.md` for implementation planning. The spec is complete, correctly scoped, and fully aligned with H5 behavioral guardrails and prior product decisions.
- Rationale: The spec meets all quality gates: (1) full template coverage including trust model, permissions, AI role, risks, UX notes, and 17 acceptance criteria; (2) advisory-only posture strictly maintained — the AI draft is always draft mode, user acceptance is required before any content is stored, no records are modified by AI generation alone; (3) data sources are confirmed H4 endpoints (`GET /api/activity-history`, `GET /api/weekly-view`) — no new entity types or new tables required (two nullable columns on `review_records` only); (4) H5 behavioral guardrails fully applied — attribution preserved, structured item list always visible as fallback, prompt scope limited to H4 structured data, all five degraded states specified independently; (5) provider adapter boundary (D-008) respected — prompt design and provider choice correctly deferred to the Founding Engineer in the implementation plan; (6) privacy boundary explicitly bounded (H4 structured data only in prompt, no prior carry-forward notes or free-text); (7) the visual spec (`docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`) resolves all designer decisions deferred from the feature spec. The implementation plan is the remaining M16 artifact.
- Alternatives considered: requesting carry-forward AI suggestions in Phase 1 — correctly excluded from scope, deferred to H5 Phase 2+ per D-034. Including the `ai_generation_used` flag as required rather than optional — correctly deferred to Founding Engineer as a Phase 1 decision. Requiring the household member to review the AI draft before advancing to the next step — correctly excluded per UX anti-patterns.
- Trade-offs: approving now makes the implementation plan the only remaining M16 artifact. The Founding Engineer can begin implementation planning immediately on completion of the visual spec, which already exists.
- Status: active
- Related docs: `docs/specs/ai-assisted-ritual-summaries.md`, `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`, `docs/roadmap/milestones.md` (M16), D-034, D-008, D-002, D-010, L-021, L-020, L-017

### D-034: M15 complete — H5 scoping defined; AI-assisted planning ritual summaries named as first H5 spec target
- Date: 2026-03-16
- Area: roadmap progression / product strategy
- Decision: Mark M15 (Horizon 5 Scoping) as complete. All four M15 required artifacts are in place: (1) `docs/roadmap/roadmap.md` updated with concrete H5 scope — AI-assisted content, proactive nudges, and deferred rule-based automation; (2) first H5 spec target explicitly named: AI-assisted planning ritual summaries; (3) `docs/glossary.md` updated with AI-Assisted Content, Trusted Action, and Proactive Nudge; (4) `docs/learnings/learnings-log.md` updated with L-021. M16 (H5 Build Readiness: write and approve the first H5 feature spec) is now the active milestone.
- Rationale: The H4 temporal layer (unified weekly view + activity history + planning ritual) creates the data foundation H5 requires. AI-assisted planning ritual summaries is the right first H5 spec target because: (a) it is advisory-only — user reviews and accepts the draft, no auto-execution risk; (b) it uses confirmed H4 data sources (activity history API, weekly view API) without new entity types; (c) it addresses a genuine cognitive load problem — manually reconstructing "what did we do last week?" is the hardest part of the planning ritual; (d) it validates the external AI provider integration (D-008) in a low-risk context; (e) it follows the L-013 synthesis-first principle before adding deeper automation. Rule-based automation is explicitly deferred to H5 Phase 2+ to avoid introducing auditability complexity before Phase 1 trust signals exist.
- Alternatives considered: naming proactive household nudges as the first H5 target — rejected because nudges require push notification infrastructure that is not yet validated (A-005), while AI-assisted summaries build entirely on confirmed H4 endpoints. Naming rule-based automation as the first H5 target — rejected because automation requires auditability infrastructure (new audit tables, rule storage) that exceeds Phase 1 scope and violates the H4 minimal-storage principle (L-020).
- Trade-offs: deferring automation keeps H5 Phase 1 low-risk and builds trust incrementally. The household must use and validate AI-assisted content before Olivia earns more autonomous behavior. Phase 2 H5 work (nudges, automation) is clearly described in the roadmap but gated on Phase 1 evidence.
- Status: active
- Related docs: `docs/roadmap/roadmap.md` (H5), `docs/roadmap/milestones.md` (M15, M16), `docs/glossary.md`, L-021, L-017, L-019, L-020, D-033

### D-033: M14 is complete — Horizon 4 third workflow built, H4 temporal layer closed
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M14 (Horizon 4 Third Workflow Build) to complete based on implementation evidence from OLI-52. All five M14 exit criteria satisfied: (1) planning ritual card shows "Start review" visual affordance in routine index, distinguishing it from standard routines; (2) tapping opens the structured 3-step review flow at `/routines/:id/review/:occurrenceId`; (3) completing saves a review record and advances `currentDueDate` via the existing `completeRoutineOccurrence` domain function; (4) completed ritual entries appear in activity history with "Review" secondary label; tapping navigates to `/review-records/:id`; (5) no new workflow primitives — `review_records` table only, built entirely on recurring routines + activity history + weekly view infrastructure. All 18 acceptance criteria confirmed — 220 tests passing, typecheck clean.
- Rationale: Implementation completeness following the M4, M7, M10, M12 precedent. The planning ritual closes the H4 temporal loop: weekly view (forward), activity history (backward), and now a structured synthesis moment (planning ritual). Horizon 4 is complete — all three planned workflows (unified weekly view, activity history, planning ritual support) are built and available in the PWA. M15 (Horizon 5 Scoping) is now the active milestone.
- Alternatives considered: Waiting for household use observations before advancing — not required per M4/M7/M10/M12 precedent; implementation completeness is sufficient evidence.
- Trade-offs: Advancing now enables M15 scoping to begin immediately. Phase 2 H4 extensions (AI summaries, carry-forward conversion, spouse participation in review flow) remain clearly additive and should be sequenced based on observed Phase 1 household use rather than pre-specified.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M14, M15), `docs/specs/planning-ritual-support.md`, `docs/plans/planning-ritual-support-implementation-plan.md`, D-031, D-032, L-017, L-019, L-020

### D-032: Planning ritual support spec approved by CEO — M13 complete
- Date: 2026-03-16
- Area: delivery planning / roadmap progression
- Decision: Approve `docs/specs/planning-ritual-support.md` for implementation planning. The spec is complete, correctly scoped, and properly aligned with prior H4 architectural decisions. Simultaneously advance M13 (Horizon 4 Third Workflow Build Readiness) to complete — all required artifacts exist and all exit criteria are met.
- Rationale: The spec meets all quality gates — full template coverage, correct trust model application (D-002, D-010), 18 concrete acceptance criteria, clean reuse of recurring routines infrastructure and activity history / unified weekly view data contracts, appropriate scope boundaries. The visual spec (OLI-51) resolves all seven designer decisions deferred from the feature spec (OQ-3, OQ-5, ritual card affordance, review flow layout, review record detail, activity history entry, weekly view card, overdue UX). The implementation plan (OLI-51) covers seven phases with minimal new storage (review_records table only). L-016 and L-017 (written during OLI-51) provide the M13 learnings required by the milestone gate. All five open questions from the spec are either resolved (OQ-1, OQ-3, OQ-4, OQ-5 by visual spec) or correctly deferred to the Founding Engineer (draft-save, OQ-2). The temporal layer rationale (L-017: weekly view + activity history + planning ritual = past/present/synthesis) provides the architectural coherence needed for the implementation phase.
- Alternatives considered: requesting additional clarity on the review record detail screen design — not needed, resolved by the visual spec. Waiting for Founding Engineer review of implementation plan before approving — not required by M13 gate.
- Trade-offs: approving now makes M14 (Horizon 4 Third Workflow Build) the active milestone and unblocks the Founding Engineer to begin planning ritual support implementation.
- Status: active
- Related docs: `docs/specs/planning-ritual-support.md`, `docs/roadmap/milestones.md` (M13), `docs/plans/planning-ritual-support-visual-implementation-spec.md`, `docs/plans/planning-ritual-support-implementation-plan.md`, D-025, D-030, D-031, L-013, L-016, L-017

### D-030: M12 is complete — Horizon 4 second workflow built
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M12 (Horizon 4 Second Workflow Build) to complete based on implementation evidence from OLI-50. All six M12 exit criteria satisfied: activity history screen available at `/history` via Memory tab; 30-day reverse-chronological view across all five H3/H2 data sources; no new entity types; "View history →" footer link added to home screen; all 20 acceptance criteria confirmed with 187 tests passing; OQ-4 (timestamp availability) fully resolved.
- Rationale: Implementation completeness following the M4, M7, M10 precedent. All timestamp sources confirmed: `completedAt` on RoutineOccurrence; `completedAt`/`cancelledAt` on Reminder; date derived from `weekStartDate + dayOfWeek` for meal entries; `lastStatusChangedAt` on InboxItem; `checkedAt` on ListItem. The temporal query pattern mirrors the weekly view architecture backward in time (L-015), completing the H4 temporal pair (L-014). One implementation refinement: Reminder state is computed from `completedAt`/`cancelledAt` rather than a `state` column — this is a minor field-naming difference resolved during implementation.
- Alternatives considered: Waiting for household usage observations — not required by M12 gate; implementation completeness is sufficient per M4/M7/M10 precedent.
- Trade-offs: Advancing now makes M13 the active milestone immediately. OQ-4 resolution is documented and validates the five H3 timestamp fields assumed in the activity history spec.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M12), `docs/specs/activity-history.md`, `docs/plans/activity-history-implementation-plan.md`, D-029, L-014, L-015

### D-031: M13 defined — Horizon 4 third workflow build readiness
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Define M13 (Horizon 4 Third Workflow Build Readiness) as the active milestone following M12. M13 requires: CEO-approved planning ritual support spec, visual spec, implementation plan, and updated learnings from M12 build outcomes. The visual spec and implementation plan are now complete (OLI-51). M13 is active; CEO approval of the feature spec is the remaining gate condition for full readiness.
- Rationale: Planning ritual support is the third and final H4 workflow, completing the temporal layer: weekly view (present/future) + activity history (past) + planning ritual (synthesis). The build readiness artifacts follow the same pattern established by M9 (unified weekly view) and M11 (activity history): feature spec → visual spec → implementation plan → CEO approval → implementation. All product and technical ambiguity is now resolved in the spec and plan documents.
- Alternatives considered: Waiting for M12 to complete before defining M13 — rejected because build readiness artifacts are independent of M12 completion and the Founding Engineer benefits from having the planning ritual spec package ready as M12 finishes.
- Trade-offs: Defining M13 now keeps the product roadmap flowing without blocking on M12 completion. The CEO approval gate on the feature spec (D-025 records the spec as drafted; formal approval is pending) remains the last step before implementation can begin.
- Status: active
- Related docs: `docs/roadmap/milestones.md` (M13), `docs/specs/planning-ritual-support.md`, `docs/plans/planning-ritual-support-visual-implementation-spec.md`, `docs/plans/planning-ritual-support-implementation-plan.md`, D-025, D-030

### D-029: M11 is complete — Horizon 4 second workflow build readiness achieved
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M11 (Horizon 4 Second Workflow Build Readiness) to complete. All required artifacts exist and all exit criteria are met.
- Rationale: (1) The activity history spec has CEO approval (D-028) and is execution-ready with 20 acceptance criteria and full template coverage. (2) The visual spec (OLI-48) resolves all seven designer decisions deferred from the feature spec — navigation entry point (Memory tab primary + weekly view footer secondary), day-section ordering (chronological interleave, no sub-headers), 5-type workflow differentiation (shared list items as fifth type using `--violet`/✓), completed-item treatment (full opacity, no strikethrough), day header labeling (Today/Yesterday/older), shared list item display (individual in Phase 1), and dismissed-reminder treatment (OQ-2). (3) The implementation plan (OLI-49) covers all seven phases with no new entity types — pure read-only aggregation over existing H3 completion state. (4) All four open questions from the feature spec are resolved or explicitly deferred to the Founding Engineer with rationale (OQ-4: timestamp availability).
- Alternatives considered: waiting for Founding Engineer confirmation on timestamp availability before advancing — rejected because OQ-4 is correctly delegated to the implementation plan and does not block product readiness; requiring CEO review of the visual spec and implementation plan before advancing — not required by M11 gate conditions.
- Trade-offs: advancing now unblocks the Founding Engineer to begin activity history implementation immediately; the single deferred open question (timestamp availability) is appropriately surfaced in Section 11 of the visual spec and in the implementation plan phase notes.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/specs/activity-history.md`, `docs/plans/activity-history-visual-implementation-spec.md`, `docs/plans/activity-history-implementation-plan.md`, D-028, D-027, L-015

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
- Alternatives considered: human-in-the-loop execution; limited low-risk autonomy.
- Trade-offs: reduces automation upside in the near term, but increases user trust and product legibility.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/vision/product-vision.md`

### D-003: Durable learnings will be documented as a first-class system
- Date: 2026-03-08
- Area: project operations
- Decision: Maintain a dedicated learnings system for assumptions, learnings, and decision history.
- Rationale: future agents may begin with minimal context, so durable memory must exist outside any single conversation.
- Alternatives considered: relying primarily on conversation transcripts or ad hoc project notes.
- Trade-offs: adds documentation discipline overhead, but greatly improves continuity and reduces rediscovery.
- Status: active
- Related docs: `docs/learnings/README.md`, `docs/strategy/agentic-development-principles.md`

### D-005: Reminders are not a first-class object in the inbox spec
- Date: 2026-03-08
- Area: feature scope
- Decision: In the shared household inbox spec, reminders are represented as a property of inbox items (due date and timeframe) rather than as a separate entity type.
- Rationale: keeping reminders as item properties reduces the data model complexity for the first spec and avoids locking in a reminder architecture before inbox usage patterns are understood. A dedicated reminder spec can be written once real use reveals what reminders need to do.
- Alternatives considered: modeling reminders as first-class objects from the start with links to inbox items.
- Trade-offs: simpler initial data model and narrower spec scope, but may require a data migration or model expansion later if reminders turn out to need richer behavior.
- Status: superseded
- Related docs: `docs/specs/shared-household-inbox.md`

### D-006: The inbox spec is channel-agnostic and does not prescribe an interface surface
- Date: 2026-03-08
- Area: feature scope
- Decision: The shared household inbox feature spec defines the workflow and data model without specifying a delivery surface (Slack, web UI, CLI, or other).
- Rationale: this preserves the optionality described in A-003 and ensures the spec can be used regardless of which surface the stakeholder decides to validate first.
- Alternatives considered: writing a Slack-specific spec; writing a web UI-specific spec.
- Trade-offs: the spec is more portable, but the project later needed a separate interface decision for implementation planning. That later decision is captured in D-007.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`, `docs/learnings/assumptions-log.md` (A-003), `docs/learnings/decision-history.md` (D-007)

### D-004: The earliest workflow will use a primary-operator model
- Date: 2026-03-08
- Area: MVP definition
- Decision: The first implementation-ready workflow should assume the stakeholder is the primary operator, while allowing household-shared context and possible spouse visibility or lightweight participation.
- Rationale: this preserves the household focus without forcing premature complexity around full multi-user collaboration, permissions, and interface design.
- Alternatives considered: full two-user parity from the first spec; purely single-user operation with no household-shared context.
- Trade-offs: increases early focus and feasibility, but delays richer collaboration design until later horizons.
- Status: active
- Related docs: `docs/vision/product-vision.md`, `docs/roadmap/roadmap.md`, `docs/specs/first-workflow-candidates.md`

### D-007: The MVP interface will be an installable mobile-first PWA
- Date: 2026-03-08
- Area: interface strategy
- Decision: Olivia's MVP should use an installable, mobile-first PWA as its canonical interface surface, with notifications aimed primarily at the stakeholder and native clients deferred unless later usage justifies them.
- Rationale: the stakeholder's current household workflow requires low-friction mobile capture and structured review, while the product still benefits from reversible implementation choices. A PWA provides app-like installability, cross-device reach, and sufficient support for the current advisory-only inbox workflow without forcing an early native commitment.
- Alternatives considered: Slack as the primary interface; a desktop-first local web app; fully native mobile apps from the start.
- Trade-offs: gains speed, reversibility, and a shared cross-platform surface, but may later require a native shell if notification depth, widgets, or richer cross-app capture become core product needs.
- Status: active
- Related docs: `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`, `docs/vision/product-vision.md`

### D-008: Near-term implementation planning will target a local-first modular monolith
- Date: 2026-03-09
- Area: system architecture
- Decision: For near-term implementation planning, Olivia should target a TypeScript modular monolith with an installable PWA client, a household-controlled SQLite canonical store, browser-local offline cache and outbox, explicit versioned command sync, and AI behind a narrow provider adapter boundary.
- Rationale: this architecture best matches Olivia's current product shape: advisory-only writes, local-first handling of sensitive household data, mobile-first capture, and low expected write concurrency. It also keeps the system legible enough for future implementation agents without prematurely committing to heavier infrastructure.
- Alternatives considered: a broader all-in-one TanStack-centered stack; a cloud-first SaaS architecture; a native-mobile-first architecture; a CRDT-heavy local-first design.
- Trade-offs: gains clear boundaries, easier reasoning about trust and sync, and more reversible infrastructure choices, but uses a composed stack rather than a single ecosystem and may later need revision if notifications, concurrency, or native-only capabilities become more important than expected.
- Status: active
- Related docs: `docs/strategy/system-architecture.md`, `docs/strategy/interface-direction.md`, `docs/specs/shared-household-inbox.md`

### D-010: Non-destructive user-initiated actions execute immediately; agentic actions still require confirmation
- Date: 2026-03-13
- Area: product behavior / trust model
- Decision: Differentiate between agentic actions (Olivia-proposed) and user actions (directly commanded by the user). Agentic actions continue to require explicit user confirmation before execution. Non-destructive user actions execute immediately — reversibility is built into the normal UI rather than being a separate undo mechanism. Destructive actions (archive, permanent delete) always require confirmation regardless of whether they were user-initiated or suggested.
- Rationale: The advisory-only trust model exists to prevent Olivia from acting on its own judgment without human approval. When the human is already expressing their own judgment through a direct command, the preview → confirm dance adds no meaningful protection and increases friction. Non-destructive actions are inherently reversible through normal UI interactions, so no special undo mechanism is needed. Destructive actions remain gated because they cannot be easily reversed.
- Alternatives considered: Keeping the uniform confirm model for all writes. Removing all confirmation from user actions including destructive ones.
- Trade-offs: More responsive for direct user commands; slightly more implementation complexity to distinguish action sources in the UI. Advisory protection is unchanged for agentic suggestions.
- Status: active
- Related docs: `docs/vision/product-ethos.md`, `docs/specs/shared-household-inbox.md`, `docs/glossary.md`

### D-009: The shared household inbox spec is approved for implementation planning
- Date: 2026-03-09
- Area: delivery planning
- Decision: Treat `docs/specs/shared-household-inbox.md` as approved and implementation-ready for planning purposes, and use it as the first workflow artifact for the next planning stage.
- Rationale: the spec now has concrete workflow scope, acceptance criteria, trust-model constraints, testing expectations, and bounded open questions, so another agent should be able to produce an implementation plan without re-deriving basic product intent.
- Alternatives considered: leaving the spec in draft pending more product refinement; approving only the workflow direction without approving the full spec for planning.
- Trade-offs: gains momentum and a clearer handoff into implementation planning, but shifts remaining execution ambiguity into explicit planning work rather than allowing further open-ended product refinement first.
- Status: active
- Related docs: `docs/specs/shared-household-inbox.md`, `docs/roadmap/milestones.md`, `docs/strategy/system-architecture.md`

### D-011: Horizon 2 is complete enough to move Olivia into Horizon 3
- Date: 2026-03-13
- Area: roadmap progression
- Decision: Treat Horizon 2 and the associated MVP milestones as complete, and move Olivia into Horizon 3 planning and documentation.
- Rationale: Olivia now has a working shared household inbox implementation and a clear enough product baseline to expand into the next product horizon without reopening the original MVP wedge.
- Alternatives considered: waiting for a longer household-validation period before broadening the roadmap; continuing to treat the project as an MVP-only effort.
- Trade-offs: gains product momentum and clearer post-MVP planning, but accepts that some Horizon 2 validation remains implementation-shaped rather than usage-shaped.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`

### D-012: Horizon 3 priorities are reminders, shared lists, recurring routines, and later meal planning
- Date: 2026-03-13
- Area: product strategy
- Decision: Horizon 3 should focus first on first-class reminders, then shared lists, then recurring household routines, with meal planning explicitly positioned as a later Horizon 3 workflow. The first new feature-spec target should therefore be `first-class reminders`.
- Rationale: these priorities extend Olivia's household coordination model directly from the MVP while staying close to the stakeholder's highest-priority household pain points.
- Alternatives considered: broadening Horizon 3 evenly across all possible coordination features; prioritizing spouse collaboration or memory-first workflows before reminders and lists.
- Trade-offs: improves focus and sequencing, but intentionally defers some attractive adjacent workflows until shared coordination primitives are clearer.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/vision/product-vision.md`

### D-013: Reminders will be reconsidered as a first-class Horizon 3 capability
- Date: 2026-03-13
- Area: feature scope
- Decision: Horizon 3 should explicitly revisit the MVP choice to model reminders only as inbox item properties and should treat first-class reminders as an active product-scoping area.
- Rationale: the MVP simplification served the inbox workflow well, but Horizon 3 expands into recurring routines and planning support where reminder behavior likely deserves its own product model.
- Alternatives considered: keeping reminders embedded in inbox items indefinitely; immediately defining the final reminder architecture during roadmap refresh.
- Trade-offs: creates some product and modeling work in Horizon 3, but avoids forcing future coordination workflows into an MVP-specific simplification.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md`, `docs/specs/shared-household-inbox.md`

### D-014: First-class reminders will use a hybrid standalone-or-linked model
- Date: 2026-03-13
- Area: feature scope
- Decision: The first Horizon 3 reminder spec should treat reminders as first-class objects that may either stand alone or link to an existing inbox item, while keeping the inbox as Olivia's capture and action foundation.
- Rationale: this model preserves the MVP inbox as the center of household follow-through while making room for legitimate reminder-only use cases that do not belong as active inbox work.
- Alternatives considered: requiring every reminder to belong to an inbox item; treating reminders as a primarily separate standalone workflow with optional inbox links later.
- Trade-offs: introduces more product-model complexity than keeping reminders as due fields alone, but avoids forcing reminder-only use cases into the inbox and avoids creating a disconnected second workflow.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/specs/shared-household-inbox.md`, `docs/roadmap/roadmap.md`

### D-015: The first reminder implementation slice will stay narrowly bounded
- Date: 2026-03-13
- Area: feature scope
- Decision: The first implementation slice for first-class reminders should defer direct reminder-to-inbox conversion, use a minimal reminder notification settings model consisting of overall enable or disable plus per-type controls for `due reminders` and `daily summary`, and preserve missed recurring reminder history only in the reminder timeline rather than as a separate workflow or state.
- Rationale: these choices keep the first reminder implementation concrete and useful without reopening adjacent product areas such as inbox conversion flows, rich notification policy, or recurring-routine complexity.
- Alternatives considered: allowing reminder-to-inbox conversion in the first slice; using only a single notification toggle; introducing quiet hours or richer notification controls; creating explicit missed-occurrence state.
- Trade-offs: keeps the first implementation focused and easier to execute, but intentionally defers some convenience behaviors and richer control that may later prove valuable in real household use.
- Status: active
- Related docs: `docs/specs/first-class-reminders.md`, `docs/specs/shared-household-inbox.md`

### D-016: Shared Lists assumption A-007 is validated — shared lists are behaviorally distinct from inbox items
- Date: 2026-03-15
- Area: feature scope / product strategy
- Decision: Treat A-007 as validated. The Shared Lists workflow was specified, implemented, and reviewed with full spec compliance. The behavioral distinction (checklist with immediate check/uncheck vs. tracked work item with owner and status) was confirmed to be real and product-meaningful.
- Rationale: the spec, visual implementation, and working implementation collectively demonstrate that list behavior differs enough from inbox behavior that the separate workflow model was the right choice.
- Alternatives considered: folding lists back into the inbox as a "list mode" item type — this alternative is now confirmed to be the wrong direction.
- Trade-offs: maintaining a separate workflow model adds surface area to the product, but reduces confusion between accountability-style work (inbox) and checklist-style coordination (lists).
- Status: active
- Related docs: `docs/specs/shared-lists.md`, `docs/plans/shared-lists-visual-implementation-spec.md`, `docs/learnings/assumptions-log.md` (A-007)

### D-018: M6 is complete — all planned Horizon 3 workflows are built
- Date: 2026-03-15
- Area: roadmap progression
- Decision: Treat M6 (Coordination Layer Build Readiness) as complete. All three planned Horizon 3 workflows — first-class reminders, shared lists, and recurring routines — have approved specs, implementation plans, and fully executed implementations.
- Rationale: all M6 exit criteria are met: specs have acceptance criteria and trust-model documentation, shared infrastructure decisions (recurrence, see A-008) are bounded and reusable, and implementation agents can begin the next build phase from the existing docs without rediscovering the product model.
- Alternatives considered: waiting for household usage validation before marking M6 complete. Household usage remains M7 territory; M6 is a build-readiness gate, not a usage gate.
- Trade-offs: advancing M6 to complete clarifies that the next product question is what to spec next rather than what to implement next. The open question (meal planning vs. other priorities) is routed to the CEO via OLI-26.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/roadmap/roadmap.md`

### D-019: Meal planning confirmed as next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: Meal planning is confirmed as the next Horizon 3 spec target. VP of Product should proceed with writing the feature spec. The first slice should be scoped narrowly — weekly meal planning — but explicitly designed to generate a grocery shopping list using the shared lists primitive. The spec should not attempt to solve the full meal planning problem.
- Rationale: all prerequisite conditions from A-009 are now met (recurring and list primitives built and validated). The roadmap direction to "connect cleanly to shared lists and routine planning rather than becoming a standalone kitchen app" provides clear scope guidance for the first slice. No documented friction in existing workflows has surfaced to suggest a higher-priority gap. M7 household validation notes are not yet collected, but waiting on them before starting spec work would stall product momentum unnecessarily; if real friction emerges during validation, the spec can be adjusted.
- Alternatives considered: blocking spec work pending M7 household validation; starting with a spouse write-access expansion for existing workflows instead; doing a broader meal planning spec that includes full recipe and nutrition management.
- Trade-offs: proceeding now keeps product momentum; scoping narrowly avoids over-engineering before household use patterns are understood; connecting to shared lists preserves the product coherence principle from the roadmap rather than creating a disconnected kitchen tool.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/assumptions-log.md` (A-009), `docs/roadmap/milestones.md`

### D-021: Meal planning spec approved by CEO
- Date: 2026-03-15
- Area: delivery planning
- Decision: Approve `docs/specs/meal-planning.md` for implementation planning. The spec is complete, correctly scoped, and properly integrated with the Shared Lists primitive. The VP of Product should proceed with creating a Designer task for the visual spec to begin the standard H3 implementation cycle.
- Rationale: the spec meets all quality gates — full template coverage, correct trust model application (D-002, D-010), 13 concrete acceptance criteria, clean integration with the proven Shared Lists primitive, and appropriate scope boundaries. No open questions block Phase 1. One architectural ambiguity (shopping item storage granularity for the FE) is correctly deferred to the implementation planning stage.
- Alternatives considered: requesting changes to scope or workflow. No changes warranted — the spec follows D-019 guidance exactly and is execution-ready.
- Trade-offs: approving now maintains product momentum; the two FE architecture decisions and three designer decisions are appropriately deferred to implementation planning and the visual spec.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, `docs/learnings/decision-history.md` (D-019, D-020)

### D-020: Meal planning spec drafted and submitted for CEO approval
- Date: 2026-03-15
- Area: delivery planning
- Decision: Treat `docs/specs/meal-planning.md` as drafted and ready for CEO review before implementation planning begins. The spec is scoped narrowly to weekly meal planning (plan meals per day → generate a grocery list via Shared Lists), with recipe management, nutrition tracking, and meal history analytics explicitly deferred.
- Rationale: the spec follows the scope guidance from D-019 (weekly first slice, shared lists connection required, kitchen-app scope excluded). All prerequisite Horizon 3 primitives are proven. The spec leaves implementation ambiguity bounded to two architecture decisions for the Founding Engineer (bulk vs. individual item commands; grocery-list creation sequencing) and several visual spec decisions for the Designer.
- Alternatives considered: broader scope including saved recipes or meal favorites; narrower scope limited to only dinner slots per day.
- Trade-offs: narrow scope reduces Phase 1 value ceiling but maximizes execution clarity and preserves ability to expand based on household usage patterns.
- Status: active
- Related docs: `docs/specs/meal-planning.md`, `docs/learnings/decision-history.md` (D-019), `docs/specs/shared-lists.md`

### D-022: Horizon 4 first spec target is unified weekly view
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: The first Horizon 4 feature-spec target is the unified weekly view — a single surface showing the household's week at a glance across all H3 workflow types (reminders due, routines scheduled, meals planned, inbox items outstanding). Activity history is second priority; planning ritual support is third.
- Rationale: the unified weekly view is the natural "household command center" summary the existing coordination layer implicitly needs. It adds the temporal and cross-workflow dimension that is missing after four H3 workflows all operate in their own views. It does not introduce new entities — it surfaces existing H3 entities in a cross-workflow context, which minimizes product ambiguity and maximizes compounding value. L-011 confirms all four H3 workflows share a coherent model that this view can draw from.
- Alternatives considered: starting with AI-driven smart digest (too dependent on AI tuning before the surface is proven useful); starting with activity history (less actionable on first use than the forward-looking weekly view); opening spouse write-access expansion instead (a different problem class, deferred for good reasons per D-004).
- Trade-offs: the weekly view is narrower than a full household memory model, but sets the right foundation — cross-workflow temporal context — before introducing AI summarization or longer-term recall. Scoping to one week at a time matches the household's natural planning rhythm and keeps the first spec bounded.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`, `docs/learnings/learnings-log.md` (L-011, L-012)

### D-024: M8 is complete — Horizon 4 scoping achieved with unified weekly view spec and H4 roadmap
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M8 (Horizon 4 Scoping) to complete. All required artifacts exist and all exit criteria are met. The H4 roadmap defines three workflow targets (unified weekly view → activity history → planning ritual support). The first H4 feature spec is written and approved. M9 (Horizon 4 Build Readiness) is now the active milestone.
- Rationale: (1) The H4 roadmap is documented and concrete — sequencing and rationale are in `docs/roadmap/roadmap.md` and D-022. (2) The relationship between the H3 coordination layer and the H4 memory/planning layer is described in both the roadmap and the unified weekly view spec. (3) The next workflow area (unified weekly view) is specific enough to enter implementation planning without ambiguity — the spec exists and acceptance criteria are written. L-013 captures the architectural learning that H4 should synthesize existing H3 state before introducing new primitives or AI.
- Alternatives considered: waiting for household usage data before closing M8; requiring a second H4 spec before advancing.
- Trade-offs: advancing now enables M9 build readiness to begin immediately; activity history and planning ritual support specs remain as pending M9 work.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/specs/unified-weekly-view.md`, `docs/learnings/learnings-log.md` (L-013), D-022, D-023

### D-023: M7 is complete — coordination layer advanced based on implementation completeness
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M7 (Coordination Layer In Use) to complete following the M4 precedent — implementation completeness and product-shape confidence are sufficient to move forward. Do not wait for household usage observations before beginning M8 scoping.
- Rationale: all four Horizon 3 workflows (reminders, shared lists, recurring routines, meal planning) are built and available in the PWA. Structural evidence satisfies all three exit criteria. L-011 and L-012 provide build-phase evidence adequate for post-M7 direction. Blocking M8 scoping on usage data would stall product momentum without proportionate benefit; the household will validate during use.
- Alternatives considered: requiring actual household usage notes before marking M7 complete; partial advancement pending specific usage evidence.
- Trade-offs: advancing now keeps product momentum and allows M8 scoping to begin immediately; usage-shaped learning is accepted as ongoing rather than a required gate condition.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/learnings/learnings-log.md` (L-011, L-012), `docs/learnings/decision-history.md` (D-022)

### D-028: Activity history spec approved by CEO
- Date: 2026-03-15
- Area: delivery planning
- Decision: Approve `docs/specs/activity-history.md` for implementation planning. The spec is complete, correctly scoped, and properly aligned with prior H4 architectural decisions. The Designer should proceed with the visual spec and the Founding Engineer should proceed with the implementation plan.
- Rationale: the spec meets all quality gates — full template coverage, correct trust model application (D-002, D-010), 20 concrete acceptance criteria, clean integration with all five H3/H2 data sources (routines, reminders, meal plans, inbox, shared lists), and appropriate scope boundaries. The five open questions are correctly deferred to the visual spec (navigation, dismissed/completed distinction) and the Founding Engineer (timestamp availability). No open questions block Phase 1. The spec correctly follows L-013 (synthesize before AI), L-015 (mirror weekly view pattern backward), and L-014 (temporal pair with weekly view). One minor inconsistency: the spec and glossary say "four Horizon 3 workflow types" but the view assembles five data sources (four H3 + the H2 inbox). This should be read as five data sources by the Designer and Founding Engineer — the wording is a carry-over from the roadmap convention of calling the inbox an H2 artifact.
- Alternatives considered: requesting wording changes before approval. The inconsistency is cosmetic and does not affect implementation guidance; approving now with an explicit note is preferable to stalling M11.
- Trade-offs: approving now maintains M11 momentum. The timestamp availability question (open question 4) is appropriately delegated to the Founding Engineer before Phase 1 implementation begins.
- Status: active
- Related docs: `docs/specs/activity-history.md`, `docs/roadmap/milestones.md` (M11), D-022, D-025, L-013, L-014, L-015

### D-027: M10 is complete — Horizon 4 first workflow built
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M10 (Horizon 4 Layer Build) to complete based on implementation evidence from OLI-45. All four exit criteria are satisfied. M11 (Horizon 4 Second Workflow Build Readiness) is now the active milestone.
- Rationale: (1) The unified weekly view is available in the PWA and surfaces reminders, routines, meal plans, and inbox items by day — all six implementation phases delivered (OLI-45). (2) Household members can navigate to the weekly view via the home screen entry point. (3) No new entity types were introduced — the view draws entirely from existing H3 entity state via GET /api/weekly-view. (4) All acceptance criteria from the spec are met — 154 tests passing (122 domain + 32 API), typecheck clean across all packages. Following the M4, M7, and prior advancement precedents, implementation completeness is sufficient evidence to advance without waiting for household usage observations.
- Alternatives considered: waiting for household usage observations before marking M10 complete; requiring explicit acceptance criteria sign-off from stakeholder before advancing.
- Trade-offs: advancing now keeps product momentum and unblocks M11 scoping immediately; usage-shaped learning will be collected naturally during household use of the weekly view.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/specs/unified-weekly-view.md`, `docs/plans/unified-weekly-view-implementation-plan.md`, D-022, D-026, L-013, L-015

### D-026: M9 is complete — Horizon 4 Build Readiness achieved
- Date: 2026-03-16
- Area: roadmap progression
- Decision: Advance M9 (Horizon 4 Build Readiness) to complete. All required artifacts exist and all exit criteria are met. M10 (Horizon 4 Layer Build) is now the active milestone.
- Rationale: (1) The unified weekly view has a complete feature spec, visual spec, and implementation plan — the Founding Engineer has everything needed to build without product ambiguity. (2) The visual spec resolves all seven designer decisions deferred from the feature spec. (3) The implementation plan is scoped entirely to existing H3 data — no new entity types in Phase 1. (4) Two additional H4 specs were completed beyond M9 requirements: activity history (OLI-41) and planning ritual support (OLI-43), giving the Founding Engineer full H4 context before build begins. L-013 and L-014 provide durable architectural learnings for the build phase.
- Alternatives considered: waiting for CEO review of activity history and planning ritual support specs before advancing; requiring an additional assumption to be validated.
- Trade-offs: advancing now unblocks the Founding Engineer to start the unified weekly view build immediately; the two additional H4 specs are already written and available as context even if not formally required by M9.
- Status: active
- Related docs: `docs/roadmap/milestones.md`, `docs/specs/unified-weekly-view.md`, `docs/plans/unified-weekly-view-visual-implementation-spec.md`, `docs/plans/unified-weekly-view-implementation-plan.md`, `docs/specs/activity-history.md`, `docs/specs/planning-ritual-support.md`, D-022, D-024, D-025, L-013, L-014

### D-025: Planning ritual support spec drafted as the third H4 target
- Date: 2026-03-16
- Area: delivery planning
- Decision: Draft `docs/specs/planning-ritual-support.md` as the third Horizon 4 spec target, scoped to a weekly household review ritual that uses the existing recurring routines infrastructure for scheduling and draws from activity history and unified weekly view data sources for content. The Phase 1 review flow has three sections: last week recap, coming week overview, and carry-forward notes. No AI is required for Phase 1.
- Rationale: this spec follows the H4 sequencing confirmed in D-022 and the architectural principle in L-013 (synthesize existing H3 state before introducing AI or new primitives). Planning ritual support completes the H4 temporal layer: the weekly view covers the present and near future, activity history covers the recent past, and the planning ritual creates a structured synthesis moment. Using the recurring routines infrastructure avoids introducing a new workflow primitive and reuses proven scheduling and lifecycle behavior. The three-section review flow is the minimum viable ritual that adds meaningful synthesis value over using the weekly view and activity history separately.
- Alternatives considered: scoping Phase 1 with AI-generated summaries included (rejected — L-013 establishes synthesis-first before AI enhancement); defining a new "ritual" entity type separate from recurring routines (rejected — the recurring routines infrastructure handles all scheduling, lifecycle, and occurrence tracking needs without modification).
- Trade-offs: narrow Phase 1 scope maximizes execution clarity but defers carry-forward action conversion, shared spouse participation, and AI narrative — all of which are the high-value extensions that make the ritual feel fully realized. Phase 2 scope is clear and well-bounded.
- Status: active
- Related docs: `docs/specs/planning-ritual-support.md`, `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/specs/recurring-routines.md`, D-022, L-013, L-014

### D-017: Recurring Routines is the next Horizon 3 spec target
- Date: 2026-03-15
- Area: roadmap sequencing
- Decision: After Shared Lists implementation completes, the next Horizon 3 feature spec target is Recurring Routines — household tasks that repeat on a defined schedule such as chores, maintenance, and bills.
- Rationale: recurring routines are the third explicit Horizon 3 priority and are the natural next workflow after shared lists. The recurrence model introduced by first-class reminders provides a foundation that recurring routines can extend. The tap-checkbox pattern from shared lists is directly reusable for routine completion.
- Alternatives considered: jumping to meal planning; expanding shared lists with spouse write access before moving to routines.
- Trade-offs: focuses on a new workflow type rather than deepening existing workflows; meal planning and spouse write parity remain deferred.
- Status: active
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/recurring-routines.md`
