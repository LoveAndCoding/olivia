# Olivia Learning System Updater

You are capturing a new entry into the Olivia learnings system. This skill ensures entries are correctly typed, correctly formatted, and durably useful for future agents.

The argument passed to this skill (if any) is a description of what happened, what was decided, or what was learned. If no argument was given, ask the user to describe the insight, decision, or assumption before proceeding.

## Step 1: Determine the entry type

Read the input and classify it as exactly one of:

- **Assumption** — a working belief that may still be wrong. It shapes current decisions but has not been validated yet. Goes in `docs/learnings/assumptions-log.md`.
- **Learning** — a durable takeaway from experience, discovery, design work, or actual household use. Goes in `docs/learnings/learnings-log.md`.
- **Decision** — a chosen direction that should guide future work until superseded. Arose from resolving a meaningful trade-off. Goes in `docs/learnings/decision-history.md`.

If the input could be either a Learning or a Decision, prefer Decision if a specific choice was made. Prefer Learning if it is a reusable insight without a specific directional commitment.

If genuinely unclear, ask the user to clarify before proceeding.

## Step 2: Read the relevant log

Read the log file for the determined entry type:

- Assumption: `docs/learnings/assumptions-log.md`
- Learning: `docs/learnings/learnings-log.md`
- Decision: `docs/learnings/decision-history.md`

Find the highest existing entry ID in the file. The next ID is that number plus one, zero-padded to three digits (e.g., if the highest is A-003, the new entry is A-004).

Also read `docs/learnings/README.md` to confirm the entry quality standard before writing.

## Step 3: Check for duplicates

Before creating a new entry, scan the relevant log for an existing entry that covers the same belief, lesson, or choice.

- If an exact duplicate exists: do not create a new entry. Report the existing entry ID and explain why it already covers this input.
- If a closely related entry exists: determine whether to update the existing entry or create a new one. Prefer updating if the new input refines, validates, or supersedes the existing entry. Create a new entry only if the new input is substantively distinct.
- If updating an existing entry: preserve the original content and add an update note with the current date.

## Step 4: Write the entry

Use the exact template for the entry type. Do not add, remove, or rename fields.

### Assumption template

```
### A-XXX: Short assumption title
- Date: YYYY-MM-DD
- Area: [product strategy | product behavior | interface strategy | project operations | other]
- Statement: [one to two sentences stating the belief precisely]
- Confidence: [low | medium | high]
- Why it matters: [what goes wrong if this assumption is incorrect]
- Evidence so far: [what supports this belief currently]
- Validation path: [how we would confirm or disprove this belief]
- Status: active
- Related docs: [list any relevant doc paths]
```

### Learning template

```
### L-XXX: Short learning title
- Date: YYYY-MM-DD
- Area: [product framing | project operations | process design | implementation | household use | other]
- Learning: [the durable takeaway in one to two sentences]
- Why it matters: [what this changes or prevents]
- Implication: [what future agents or docs should do differently because of this]
- Source: [where this came from — a session, spec, prototype, or household use]
- Related docs: [list any relevant doc paths]
```

### Decision template

```
### D-XXX: Short decision title
- Date: YYYY-MM-DD
- Area: [product strategy | product behavior | MVP definition | interface strategy | project operations | other]
- Decision: [the chosen direction, stated clearly]
- Rationale: [why this option was chosen over alternatives]
- Alternatives considered: [at least one alternative that was genuinely weighed]
- Trade-offs: [what is gained and what is deferred or lost by this choice]
- Status: active
- Related docs: [list any relevant doc paths]
```

### Field guidance

- **Date:** Use today's date in YYYY-MM-DD format.
- **Title:** Three to eight words, no verbs in passive voice. Be specific enough that someone can understand the entry without reading the body.
- **Alternatives considered (Decisions):** Never leave blank. If only one option existed, explain why it was the only real option.
- **Trade-offs (Decisions):** Name both sides. "Gains X, defers Y" is the minimum structure.
- **Confidence (Assumptions):** Set honestly. LOW means the belief could easily be wrong given current evidence. HIGH means the evidence is strong and the belief is unlikely to change.
- **Validation path (Assumptions):** Make it specific and actionable, not vague ("test it" is not acceptable; "run a two-week pilot with the shared task workflow and measure whether the stakeholder reports reduced follow-up overhead" is acceptable).
- **Related docs:** Use file paths relative to the repo root (e.g., `docs/vision/product-ethos.md`).

## Step 5: Write the entry to the file

Append the new entry to the end of the Current [Assumptions | Learnings | Decisions] section in the relevant log file. Maintain the existing formatting and heading structure.

If you are updating an existing entry, edit it in place. Add a note at the end of the entry:

```
- Updated: YYYY-MM-DD — [one sentence describing what changed and why]
```

## Step 6: Confirm and report

After writing, confirm the file was saved and report:

- The entry ID and type (e.g., "Added D-005 to decision-history.md")
- The entry title
- One sentence on why this entry was worth capturing

If the new entry should prompt updates to any strategic doc (roadmap, ethos, spec), name the doc and the specific section that may need updating. Do not make those updates automatically — flag them for the user to review.
