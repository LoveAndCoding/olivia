# Olivia Doc Review

You are reviewing an Olivia project document — a spec, strategic doc, or planning artifact — against four quality checks: advisory-only compliance, glossary term consistency, information-type separation, and doc linkage integrity.

The argument passed to this skill is the path to the document to review (e.g., `docs/specs/household-inbox.md`). If no argument was given, ask the user for the file path before proceeding.

## Step 1: Load reference sources

Read these files before reviewing the target document:

1. The target document specified in the argument
2. `docs/vision/product-ethos.md` — trust model and behavioral non-negotiables
3. `docs/glossary.md` — canonical product terms and definitions
4. `docs/strategy/agentic-development-principles.md` — information-type standards, anti-patterns, source-of-truth hierarchy
5. `docs/learnings/decision-history.md` — active decisions the document must not contradict

## Step 2: Run the four checks

### Check 1: Advisory-Only Compliance

Scan the document for any language that implies autonomous action — Olivia taking a step without user approval.

Flag any instance of verbs or phrases like: "send," "execute," "schedule," "automatically," "notify [someone]," "submit," "delete," "post," "run," "trigger," or "without approval."

For each flagged phrase:
- Quote the exact sentence
- Explain why it may violate the advisory-only model
- Suggest a revision that preserves the intent while staying advisory-only (e.g., replace "Olivia will send a reminder" with "Olivia will draft a reminder for the user to send")

If the Permissions And Trust Model section explicitly acknowledges and justifies an advisory exception (marked with `⚠ ADVISORY EXCEPTION`), do not flag it as a violation. Note it as a reviewed exception instead.

**Result:** PASS (no violations found) | FLAG (N violations found)

### Check 2: Glossary Term Consistency

Read all 21 terms in `docs/glossary.md`.

Scan the target document for uses of these terms or near-synonyms. Check whether the usage matches the canonical definition.

Common failure modes:
- Using "task" when the glossary defines a specific distinction between a task and a reminder
- Using "automated" or "autonomous" in a way that conflicts with the Advisory-Only definition
- Using "user" generically when the doc should distinguish between the Primary Operator and Household Member
- Inventing new product terms without adding them to the glossary

For each inconsistency:
- Quote the term and its context
- State the canonical glossary definition
- Recommend the correction

**Result:** PASS | FLAG (N inconsistencies found)

### Check 3: Information-Type Separation

The agentic-development-principles doc requires that Facts, Decisions, Assumptions, and Open Questions are clearly distinguished — not blended into prose where future agents cannot tell what is settled vs. speculative.

Scan the document for paragraphs that mix information types without labeling them. Examples of the anti-pattern to catch:
- A paragraph that presents an assumption as if it were a fact ("Olivia will use Slack as the primary interface" — is this a decision or an assumption?)
- A decision stated without rationale, as if it were a given ("The feature will be local-only")
- An open question buried in a narrative paragraph rather than in the Open Questions section
- A fact that should be linked to a source (another doc, a decision log entry) but is stated without attribution

For each issue:
- Quote the problematic passage
- Identify what information type it is (Fact, Assumption, Decision, or Open Question)
- Recommend how to restate or relocate it to be unambiguous

**Result:** PASS | FLAG (N issues found)

### Check 4: Doc Linkage Integrity

Scan the document for all references to other files in the repository (e.g., `docs/vision/product-ethos.md`, `docs/roadmap/roadmap.md`).

For each referenced path, confirm the file exists at that path. If a file does not exist, flag the broken reference with the exact path that was used.

Also check:
- Is the document itself referenced from any obvious parent doc (e.g., is a new spec listed in `docs/roadmap/milestones.md` if it is a required artifact for a milestone)?
- Are decision log entries (D-XXX) or assumption log entries (A-XXX) referenced by ID where relevant?

**Result:** PASS | FLAG (N broken or missing links found)

## Step 3: Output a structured review report

Format the report as follows:

---

## Olivia Doc Review: [filename]

**Date:** [today's date]
**Reviewer:** Claude Code

### Check 1: Advisory-Only Compliance — [PASS | FLAG]
[If PASS: "No advisory violations found."]
[If FLAG: List each violation with quote, explanation, and suggested revision.]
[List any reviewed advisory exceptions.]

### Check 2: Glossary Term Consistency — [PASS | FLAG]
[If PASS: "All glossary terms used correctly."]
[If FLAG: List each inconsistency with quote, canonical definition, and correction.]

### Check 3: Information-Type Separation — [PASS | FLAG]
[If PASS: "Facts, decisions, assumptions, and open questions are clearly separated."]
[If FLAG: List each issue with quote, type identification, and recommendation.]

### Check 4: Doc Linkage Integrity — [PASS | FLAG]
[If PASS: "All referenced file paths exist. No orphaned references found."]
[If FLAG: List each broken path and each missing cross-reference.]

### Overall Result: [PASS | NEEDS REVISION]
[One to three sentences summarizing the most important issues to fix before this document is committed or used as a source of truth.]

---

## Principles

- Do not rewrite the document. Your job is to identify issues and recommend specific, actionable fixes.
- Do not flag style preferences. Flag only clear violations of the four defined checks.
- If the document is a Draft spec, note that advisory-only and linkage checks are most critical. Glossary and information-type checks can be advisory for drafts.
- If the document passes all four checks, say so clearly and confirm it is ready to be treated as a source-of-truth artifact.
