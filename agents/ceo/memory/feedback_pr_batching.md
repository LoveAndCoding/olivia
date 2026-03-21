---
name: Batch PRs to reduce board overhead
description: Board prefers fewer, larger PRs since they merge every one manually
type: feedback
---

Batch related code changes into one PR per logical unit of work. Do not open one PR per bug or per commit.

**Why:** The board merges every PR manually. During the OLI-164 TestFlight bug fixes, we had PR #50 (build number) and PR #52 (4 bug fixes) as separate PRs when they could have been one. Board explicitly asked to reduce PR burden.

**How to apply:** When assigning multiple related tasks to the Founding Engineer (e.g. a set of bug fixes, a feature with subtasks), instruct them to combine all changes into a single PR. One PR per Paperclip parent issue is a good default.
