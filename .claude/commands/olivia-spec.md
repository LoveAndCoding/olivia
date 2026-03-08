# Olivia Feature Spec Writer

You are writing a feature spec for the Olivia household command center project. This skill guides you through producing a complete, implementation-ready spec that complies with project standards.

The argument passed to this skill (if any) is the feature name or idea to spec. If no argument was given, ask the user to describe the feature before proceeding.

## Step 1: Load project context

Read these files before writing anything:

1. `docs/specs/spec-template.md` — the structural contract for all specs
2. `docs/vision/product-ethos.md` — trust model and behavioral non-negotiables
3. `docs/vision/product-vision.md` — product boundaries and target users
4. `docs/learnings/decision-history.md` — prior decisions that constrain the spec
5. `docs/learnings/assumptions-log.md` — active assumptions relevant to feature work
6. `docs/glossary.md` — use these terms consistently throughout the spec
7. `docs/specs/` — scan for existing specs to avoid duplication

## Step 2: Pre-flight checks

Before writing, answer these questions internally. Do not proceed if any answer is a hard blocker:

- Does this feature align with the product vision in `docs/vision/product-vision.md`? If not, flag the conflict and stop.
- Does this feature respect the advisory-only trust model? If it requires autonomous action, flag it explicitly and mark the trust model section accordingly.
- Does a spec for this feature already exist? If yes, read it and propose updates rather than creating a duplicate.
- Is the project at milestone M2 or higher? If M0 or M1, note that spec writing is premature and ask the user to confirm they want to proceed anyway.

## Step 3: Draft the spec

Create the file at `docs/specs/<feature-name>.md` where `<feature-name>` is a kebab-case slug of the feature.

Use every section from `docs/specs/spec-template.md` in order. Do not skip sections. If a section genuinely does not apply, write "Not applicable — [brief reason]" rather than omitting it.

### Section-specific guidance

**Status:** Set to `Draft`.

**Summary:** One paragraph. Name the problem, the workflow, and the expected household benefit. Do not exceed five sentences.

**User Problem:** Be concrete. Name a specific household scenario where the current approach fails. Avoid abstract or generic problem statements.

**Target Users:** Use the stakeholder model from `docs/vision/product-vision.md`. Primary user is the stakeholder; secondary is the spouse unless the feature changes that.

**Desired Outcome:** State what would be demonstrably true for the household if the feature works well. Make it observable, not aspirational.

**In Scope:** Use a bulleted list. Each bullet should be a concrete behavior or state, not a vague goal.

**Boundaries, Gaps, And Future Direction:** Be honest about what this spec does not cover. Future direction should be noted without committing to a timeline.

**Workflow:** Write the end-to-end flow as numbered steps. Name who acts at each step (user, Olivia, or system). Call out every approval point explicitly.

**Behavior:** Separate into three labeled subsections:
- Facts the system records
- Suggestions Olivia makes
- Actions proposed (requiring user approval)

**Data And Memory:** Distinguish durable state (survives sessions) from transient state (within a session). Flag any sensitive data (names, schedules, finances) as local-only per the privacy-first principle.

**Permissions And Trust Model:** This section is mandatory and must explicitly answer: Does this feature remain advisory-only? List every place where Olivia could take an action and confirm it requires user approval. If any behavior is autonomous, flag it clearly with: `⚠ ADVISORY EXCEPTION: [describe the behavior and why it was approved]`.

**AI Role:** Distinguish where AI is essential, where it is a convenience, and what must work without AI. Specify fallback behavior if AI is unavailable.

**Risks And Failure Modes:** List at least three concrete failure scenarios. For each, describe how Olivia should behave.

**UX Notes:** Focus on feel and friction. What would make this feature feel invasive, noisy, or burdensome? Name specific anti-patterns to avoid.

**Acceptance Criteria:** Each criterion must be independently verifiable. Use "Given / When / Then" format or equivalent plain-language specifics. Avoid vague criteria like "works correctly."

**Validation And Testing:** Distinguish unit tests (logic), integration tests (system behavior), and household validation (real use). Name at least one behavior that requires manual household observation to validate.

**Dependencies And Related Learnings:** Link to relevant decisions (D-XXX), assumptions (A-XXX), and learnings (L-XXX) from the learnings logs. Do not reference decisions or assumptions by name only — include the log ID.

**Open Questions:** List only genuine blockers or unresolved choices. Do not pad this section with hypotheticals.

**Facts, Assumptions, And Decisions:** Cross-check assumptions against `docs/learnings/assumptions-log.md`. Do not create a new assumption entry in this spec if the same belief is already tracked in the log — reference the existing A-XXX ID instead. New assumptions specific to this feature should be added to `assumptions-log.md` after the spec is drafted.

**Deferred Decisions:** Name specific choices that were raised during drafting but deliberately set aside. Include a brief note on when they might need to be revisited.

## Step 4: Self-review before saving

Before saving the file, check:

- [ ] All sections from the template are present
- [ ] Advisory-only compliance is explicitly stated in Permissions And Trust Model
- [ ] No section contradicts an active decision in `decision-history.md`
- [ ] All glossary terms used match the definitions in `docs/glossary.md`
- [ ] Acceptance criteria are testable, not aspirational
- [ ] At least one Learning or Assumption log entry is referenced by ID
- [ ] Open Questions section contains only genuine blockers, not padding

## Step 5: Post-spec tasks

After saving the spec:

1. If you identified any new assumptions during drafting, use `/olivia-log` to add them to `docs/learnings/assumptions-log.md`.
2. If the spec required resolving an open question that was previously undecided, use `/olivia-log` to record the decision in `docs/learnings/decision-history.md`.
3. Report the file path and a one-paragraph summary of what was specced and what the most significant open question or risk is.
