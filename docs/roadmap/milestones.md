# Olivia Milestones

## Purpose
These milestones define the evidence required for Olivia to move from concept through MVP and into post-MVP product expansion. They are intended to give future agents clear readiness gates without forcing them to re-derive what phase the project is in.

Unlike `docs/roadmap/roadmap.md`, this document is not a product horizon map. It is an execution-readiness system: what must be true before the project should advance.

## Milestone Model
Each milestone should be considered complete only when:
- the expected artifacts exist
- the key decisions are documented
- open questions are either resolved or explicitly bounded
- the next phase can begin without re-deriving product intent

## Completed Milestones Summary

Full details for completed milestones are archived in `milestones-archive.md`. Consult that file only when you need original exit criteria, progress notes, or completion evidence.

| Milestone | Objective | Status | Key outcome |
|---|---|---|---|
| M0 | Project Foundation | complete | Vision, ethos, agentic dev principles documented |
| M1 | Product Definition | complete | Shared household state wedge chosen; glossary and learnings system established |
| M2 | Delivery Planning | complete | Spec template, durable memory docs, stable planning conventions |
| M3 | Build Readiness | complete | Shared household inbox spec approved for implementation |
| M4 | MVP In Use | complete | Working household inbox; stakeholder advanced based on implementation completeness |
| M5 | Horizon 3 Scoping | complete | H3 priorities: reminders → shared lists → recurring routines → meal planning |
| M6 | Coordination Layer Build Readiness | complete | All three H3 workflows (reminders, shared lists, recurring routines) specified, planned, and built |
| M7 | Coordination Layer In Use | complete | All four H3 workflows built and available in PWA (D-023) |
| M8 | Horizon 4 Scoping | complete | H4 targets: unified weekly view → activity history → planning ritual support (D-024) |
| M9 | H4 Build Readiness | complete | All three H4 specs, visual specs, and implementation plans ready (D-026) |
| M10 | H4 Layer Build | complete | Unified weekly view built — 154 tests, no new entity types (D-027) |
| M11 | H4 Second Workflow Readiness | complete | Activity history spec + visual spec + implementation plan ready (D-029) |
| M12 | H4 Second Workflow Build | complete | Activity history built — 187 tests, 5 timestamp sources confirmed (D-030) |
| M13 | H4 Third Workflow Readiness | complete | Planning ritual support spec + visual spec + plan ready (D-032) |
| M14 | H4 Third Workflow Build | complete | Planning ritual built — 220 tests, H4 temporal loop closed (D-033) |
| M15 | H5 Scoping | complete | H5 targets: AI-assisted summaries → proactive nudges → rule-based automation deferred (D-034) |
| M16 | H5 Build Readiness | complete | AI-assisted ritual summaries spec + visual spec + plan ready (D-036) |
| M17 | H5 First Workflow Build | complete | AI-assisted summaries built — 50 API tests, advisory-only AI pattern validated (D-037) |
| M18 | H5 Second Workflow Readiness | complete | Proactive nudges spec + visual spec + plan ready (D-040) |
| M19 | H5 Second Workflow Build | complete | Proactive nudges built — 211 tests, H5 Phase 1 complete (D-041) |
| M20 | H5 Phase 2 Scoping | complete | Phase 2 priorities: real AI wiring → push → timing → automation deferred (D-042) |
| M21 | H5 Phase 2 Build Readiness | complete | Real AI provider wiring spec + plan ready (D-043, D-044) |
| M22 | H5 Phase 2 Build | complete | ClaudeAiProvider built — 71 tests, real Haiku content (D-044) |
| M23 | Push Notifications Readiness | complete | Push spec + plan ready (D-045) |
| M24 | Push Notifications Build | complete | Full push infra built — 267 tests, VAPID + scheduler + SW (D-046) |
| M25 | AI-Enhanced Nudge Timing Scoping | complete | Two-layer approach: Layer 1 heuristic, Layer 2 LLM deferred (D-047) |
| M26 | AI-Enhanced Nudge Timing Readiness | complete | Completion-window push timing spec + plan ready (D-048, D-050) |
| M27 | AI-Enhanced Nudge Timing Build | complete | Completion-window timing built — 249 tests, IQR algorithm (D-051) |
| M28 | Household Validation & Phase 3 Scoping | bypassed | Board directed chat as Phase 3 (D-053) |
| M29 | Post-Chat Household Validation | complete | First-week feedback processed, stability direction chosen (D-065, D-066) |

## M28: Household Validation & Phase 3 Scoping

Status: bypassed (board directive)

This was a validation milestone, not a build milestone. The intended deliverable was a usage-informed product direction decision.

**Bypass note (2026-03-16):** M28 was effectively bypassed by direct board assignment. The board assigned OLI-95 ("Support Olivia chat interface") as the Phase 3 direction before the M28 validation gate could complete. The Phase 3 direction decision (D-053) was made by board directive rather than by the usage-observation process M28 defined. This is a legitimate board prerogative, but the following M28 exit criteria were not met:
- the 2-week household usage observation period did not elapse
- qualitative usage observations were not documented
- assumptions A-007, A-008, A-009 remain unvalidated by household usage

Future milestones should continue to follow the gate process. The M28 bypass is recorded honestly so future agents understand that the chat direction was board-driven, not observation-gated.

## M29: Post-Chat Household Validation & Next-Direction Scoping
Objective: observe real household usage of the full product surface — including the newly shipped chat interface — to produce the usage signal that M28 was designed to capture but did not, then scope the next build cycle based on that signal.

Status: complete

Context:
- H5 Phases 1–3 shipped without household validation (M28 bypassed by board directive).
- The product now includes: inbox, reminders, recurring routines, shared lists, meal planning (all H3 workflows complete), unified weekly view, activity history, planning rituals, AI-assisted summaries, proactive nudges, push notifications, completion-window timing, and a chat interface.
- This is a substantial feature surface. Before adding more, we need to know what the household actually uses, what it ignores, and where friction exists.

Required artifacts:
- household usage observations — qualitative notes on which features see real use, which are ignored, where friction appears, and what the household asks for or avoids. Captured in `docs/learnings/` as observations (L-series entries), not requirements.
- chat-specific observations — how the household uses the chat surface: what kinds of questions are asked, whether draft action cards are used or dismissed, whether chat replaces screen navigation or supplements it.
- updated assumptions log — validate or challenge assumptions running on implementation evidence alone (A-007, A-008, A-009) plus new questions about conversational vs. structured interaction preferences and advisory-only trust model fit.
- Phase 4 direction decision (D-054+) — informed by usage observations. Candidate tracks:
  - **Track A: Deepen the chat** — summarization, proactive messages, richer tool use, spouse access
  - **Track B: Broaden the household** — spouse write access, multi-user roles
  - **Track C: Complete H3** — meal planning (spec drafted, primitives proven)
  - **Track D: Increase autonomy** — rule-based automation, push action buttons, Layer 2 LLM timing
  - **Track E: Deepen the coordination surface** — task steps/sub-tasks (OLI-242, spec drafted), shared calendar via native Apple Calendar integration (OLI-243, D-063)
- updated roadmap reflecting the chosen direction

Exit criteria:
- at least two weeks of household usage (including chat) have elapsed since deployment
- at least 3 qualitative chat observations documented
- at least 3 qualitative broader product observations documented
- the CEO has recorded a next-direction decision based on usage signal
- the next milestone (M30) is defined with objectives tracing back to usage observations

Notes:
- This milestone restores the validation gate that M28 was designed to provide. The board may again choose to direct the next cycle; if so, record the bypass honestly and proceed.
- Meal planning (Track C) completes H3 — if usage signal is ambiguous, completing H3 is a strong default.

## M30: Stability & Feature Depth — Make It Work for Daily Use
Objective: make the existing product surface reliable and complete enough for sustained daily household use. No new features — deepen what exists until the household can use it without workarounds.

Status: todo

Context:
- M29 household feedback (OLI-245, D-065, D-066) identified five friction themes: reliability erosion, incomplete features, missing push integration, unhelpful AI chat, and no in-app feedback path.
- The board's top-line message: "all features contain the barebones of what I want, but don't contain enough of the actual functionality I need to be helpful."
- None of the M29 candidate tracks (A–E) are the right next move. The existing surface needs to work before we build on it.

Priority areas (in order):

1. **Reliability** — Reduce error frequency and improve recovery.
   - Expand E2E test coverage for daily-use paths (grocery list lifecycle, reminder creation/snooze, routine completion).
   - Reduce time-to-fix for errors surfaced through the error reporting pipeline.
   - Investigate and fix any recurring regressions.

2. **Feature depth — Lists** — Make shared lists usable for multi-run grocery shopping.
   - Clear/archive completed items (the household is creating new lists because completed items hang around).
   - Consider "uncheck all" or "clear completed" actions.

3. **Feature depth — Reminders** — Make date/time entry practical.
   - Add a proper date/time picker (calendar + time selector) as alternative to text-based entry.
   - Fix snooze behavior: snoozed items should clear from home screen until snooze fires.

4. **Feature depth — Routines** — Support real household routine patterns.
   - Investigate flexible scheduling beyond "every X days" (e.g., ad-hoc tracking, "last done" visibility).
   - Consider lightweight status tracking for irregular chores (dishes, laundry).

5. **Push notification validation** — Get push working and validated on native.
   - Verify push delivery on iOS/Capacitor.
   - Validate reminder and nudge push notifications reach the household.

6. **AI chat recalibration** — Make chat advisory-only compliant.
   - Reduce aggressive task creation: chat should ask questions before proposing entities.
   - Improve chat UI: ability to dismiss/clear unwanted suggestions, fresh conversation starts.

7. **In-app feedback** — Lightweight friction reporting from within the app.
   - Simple mechanism to report issues without leaving the app (scope TBD — could be as simple as a "Report Issue" link in settings that pre-fills context).

Required artifacts:
- Updated E2E test coverage for daily-use paths
- Feature improvements shipped and validated by household usage
- Push notifications confirmed working on native
- AI chat behavior recalibrated
- Second round of household feedback collected (M31 gate)

Exit criteria:
- Household reports meaningfully reduced friction in daily use (qualitative feedback)
- Error frequency measurably reduced (tracked via error reporting pipeline)
- Push notifications confirmed working on native iOS
- AI chat no longer creates unsolicited entities
- At least 2 of the 3 feature-depth areas (lists, reminders, routines) have shipped improvements
- Second household feedback round collected to inform M31 direction

Notes:
- This is a hardening milestone, not a build milestone. Success is measured by reduced friction, not new capability.
- The board offered to provide follow-up details on any area — take them up on this for specific UX questions as implementation proceeds.
- Task steps (OLI-242, D-064) remain deferred until inbox usage is validated through this stability work.

## Milestone Gate Questions
Before moving to the next milestone, ask:
- Do the docs make the current phase legible to a new agent?
- Have the most important decisions been recorded durably?
- Are remaining unknowns explicitly visible?
- Is the next phase narrow enough to execute well?
- Is there evidence, not optimism, that the project is ready to advance?
- Does the next capability extend the existing product model coherently rather than becoming a disconnected tool?
- Is any shared infrastructure reusable across workflow types, or are we hiding product ambiguity inside engineering work?

## Decisions
- Milestones are defined by readiness and evidence, not by volume of output.
- The project should not move into implementation until feature-level ambiguity is low enough for agent execution.
- Post-MVP milestones should make product expansion legible, not only initial build readiness.

## Open Questions
- What level of household validation should be required before broadening scope after a working MVP exists?
- Should milestone reviews later become a recurring template or checklist?
