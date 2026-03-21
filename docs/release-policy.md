# Release Policy

## Purpose

This document defines when and how Olivia releases happen. It provides concrete criteria so the VP of Product can assess release readiness and the Founding Engineer knows when to prepare an upstream PR.

## Git Workflow Context

- `origin/main` (`loveandrobots/olivia`) is the development trunk. All agent branches merge here.
- `upstream/main` (`LoveAndCoding/olivia`) is the canonical repo. PRs from `origin/main` to `upstream/main` are releases.
- CI on `upstream` handles TestFlight upload after merge.
- The board merges upstream PRs.

## Versioning

Olivia follows [Semantic Versioning](https://semver.org/):

| Bump | When | Examples |
|------|------|----------|
| **PATCH** (0.x.**Y**) | Bug fixes, copy corrections, non-functional changes that don't add features | Fix crash on empty inbox, correct reminder timezone display |
| **MINOR** (0.**Y**.0) | New user-facing features or meaningful enhancements to existing features | Add landscape orientation, add shared lists workflow |
| **MAJOR** (**Y**.0.0) | Reserved for App Store public launch (1.0.0). Not used during TestFlight pre-release. | 1.0.0 = first public App Store release |

Rules:
- During the 0.x.y pre-release phase, MINOR bumps are the normal cadence for feature work.
- PATCH bumps are appropriate for fixes that ship between feature releases.
- The Founding Engineer bumps the version in `package.json` and adds the changelog entry in the same PR as the release.
- Tags (e.g., `v0.2.0`) are applied by the board after merge. Agents do not tag.

## Release Criteria

A release is warranted when **any** of the following are true:

### 1. Feature completion
One or more user-facing features have been merged to `origin/main` and are ready for household use. This is the most common trigger.

**Checklist:**
- [ ] All acceptance criteria from the feature spec pass
- [ ] Tests pass (no regressions in existing test suite)
- [ ] No known critical or high-severity bugs in the new feature
- [ ] UI components have corresponding CSS styles (per D-060)
- [ ] Feature has been reviewed or validated per the milestone process

### 2. Critical bug fix
A bug that blocks normal household use of an existing feature has been fixed on `origin/main`.

**Checklist:**
- [ ] The fix is verified (test added or manual confirmation)
- [ ] No regressions introduced
- [ ] Ship as a PATCH bump without waiting for other changes

### 3. Accumulation threshold
Multiple smaller changes (non-critical fixes, polish, documentation-only changes that affect the app) have accumulated on `origin/main` without a release. If more than **5 merged PRs or 1 week** have passed since the last release, evaluate whether a release is warranted.

This is a guideline, not a hard rule. Use judgment — a week of docs-only changes does not need a release.

## When NOT to Release

- Incomplete features that are partially merged but not yet usable
- Changes that only affect agent docs, specs, or internal tooling (no user-facing impact)
- When a known regression exists on `origin/main` that would ship to users
- During a merge freeze (if announced)

## Release Process

### Roles

| Role | Responsibility |
|------|----------------|
| **VP of Product** | Assesses release readiness, drafts changelog content, initiates release by requesting the Founding Engineer prepare the PR |
| **Founding Engineer** | Bumps version in `package.json`, adds changelog entry, opens PR from `origin/main` to `upstream/main` |
| **Board** | Reviews and merges the upstream PR |
| **CI** | Builds and uploads to TestFlight after merge |

### Steps

1. **VP of Product** reviews the state of `origin/main` relative to the last release and determines a release is warranted based on the criteria above.
2. **VP of Product** drafts the changelog entry and communicates the version bump type (PATCH or MINOR) to the Founding Engineer via a Paperclip task or issue comment.
3. **Founding Engineer** creates the release PR:
   - Bumps `version` in `package.json`
   - Adds the VP of Product's changelog entry to `CHANGELOG.md`
   - Opens PR: `gh pr create --repo LoveAndCoding/olivia --head loveandrobots:main --base main`
4. **Board** reviews and merges.
5. **Founding Engineer** closes the loop: `git fetch upstream && git merge upstream/main && git push origin main`
6. **Board** tags the merged commit (e.g., `v0.2.0`).

## Branching Strategy

**Keep it simple.** The current team size does not justify release branches or long-lived feature branches.

- **No release branches.** Releases cut directly from `origin/main`.
- **No hotfix branches.** If a critical fix is needed, merge the fix to `origin/main` and cut a PATCH release immediately.
- **Feature branches** are short-lived and merge to `origin/main` when complete. No long-lived feature branches.

Revisit this if the team grows or if release frequency creates conflicts on `origin/main`.

## Incremental vs. Batched Releases

**Default to batching** feature work into meaningful releases that correspond to milestone completions or spec deliverables. This keeps the release cadence predictable and changelog entries substantive.

**Release incrementally** when:
- A critical bug fix needs to ship immediately
- A feature is independently valuable and waiting would delay household benefit
- The accumulation threshold is reached and the changes are low-risk

In practice, the natural release cadence should align with milestone gates: each completed milestone or significant feature is a candidate for a release.

## Changelog

The changelog lives at `CHANGELOG.md` in the project root and follows [Keep a Changelog](https://keepachangelog.com/) format.

- The VP of Product owns changelog content and drafts entries in user-facing language.
- Entries should read like release notes a household member would understand.
- No internal jargon, issue IDs, or agent references in changelog entries.
- The Founding Engineer includes the changelog entry in the version-bump PR.

### Changelog Categories

Use these section headers within each version entry:

- **Added** — new features
- **Changed** — changes to existing features
- **Fixed** — bug fixes
- **Removed** — removed features (rare in pre-release)

## Process Integration

The VP of Product should assess release readiness:
- After each milestone completion
- When reviewing the state of `origin/main` during regular heartbeats
- When notified of critical bug fixes

This assessment is a lightweight check, not a ceremony. If the criteria are met, initiate the release process. If not, note what is missing and move on.

## Facts
- Current version: 0.2.0 (as of 2026-03-21)
- Distribution: TestFlight (native iOS via Capacitor)
- MAJOR version 1.0.0 is reserved for App Store public launch

## Decisions

- **No fixed release cadence.** Event-driven releases (feature completion, critical fixes, accumulation threshold) are the right model for our current stage. A fixed cadence creates pressure to ship empty releases or hold ready work. Revisit after M29 household validation produces regular usage feedback.
- **No changelog pre-review.** The board reviews the upstream PR, which includes the changelog entry. A separate pre-review step adds overhead without clear value at current team size.
