# Skill: Olivia Doc Review

## When To Use

Use this when reviewing a strategic doc, feature spec, or planning artifact for compliance with Olivia's trust model, terminology, structure, and linkage standards.

## Goal

Review a target document against four checks: advisory-only compliance, glossary consistency, information-type separation, and doc linkage integrity.

## Input

- The path to the document to review

## Steps

### 1. Load reference sources

Read:

1. the target document
2. `docs/vision/product-ethos.md`
3. `docs/glossary.md`
4. `docs/strategy/agentic-development-principles.md`
5. `docs/learnings/decision-history.md`

### 2. Run the four checks

#### Check 1: Advisory-Only Compliance

- Flag language that implies Olivia takes consequential action without explicit approval.
- Pay special attention to phrases such as `send`, `execute`, `schedule`, `automatically`, `notify`, `submit`, `delete`, `post`, `run`, `trigger`, or `without approval`.
- For each issue, quote the sentence, explain the trust-model risk, and suggest an advisory-only revision.
- If the doc explicitly marks an approved exception as `ADVISORY EXCEPTION`, treat it as a reviewed exception rather than a violation.

#### Check 2: Glossary Term Consistency

- Compare terminology in the document against `docs/glossary.md`.
- Flag misuse of canonical terms, invented product terms, or wording that conflicts with the advisory-only definition.
- For each issue, quote the term in context, cite the canonical meaning, and recommend the correction.

#### Check 3: Information-Type Separation

- Check whether `Facts`, `Decisions`, `Assumptions`, `Open Questions`, and `Deferred Decisions` are clearly distinguished.
- Flag places where settled and unsettled material are blended together or where a decision, assumption, or open question is buried in unlabeled prose.
- For each issue, quote the passage, identify the information type, and recommend a clearer placement or restatement.

#### Check 4: Doc Linkage Integrity

- Verify every referenced repo path exists.
- Note missing or broken file references.
- Check whether the document is linked from the obvious parent artifact when that linkage matters.
- Confirm that relevant assumptions or decisions are referenced by ID where useful.

### 3. Produce a structured review report

Use this structure:

- `Check 1: Advisory-Only Compliance - PASS | FLAG`
- `Check 2: Glossary Term Consistency - PASS | FLAG`
- `Check 3: Information-Type Separation - PASS | FLAG`
- `Check 4: Doc Linkage Integrity - PASS | FLAG`
- `Overall Result: PASS | NEEDS REVISION`

For each flagged item, include the exact quote, the reason it matters, and the recommended fix.

## Rules

- Do not rewrite the document unless the task explicitly asks for edits.
- Flag only real standards issues, not stylistic preferences.
- If the doc passes all four checks, say clearly that it is ready to be treated as a durable source-of-truth artifact.
- Treat `docs/` as the source of truth if another instruction layer conflicts.
