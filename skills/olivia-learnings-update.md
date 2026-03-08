# Skill: Olivia Learnings System Updater

## When To Use

Use this when a session produces a durable assumption, learning, or decision that should be preserved for future agents.

## Goal

Classify the insight correctly, avoid duplicates, and write a concise, durable entry to the right log in the learnings system.

## Input

- A description of what was assumed, learned, or decided

## Steps

### 1. Determine the entry type

Classify the input as exactly one of:

- **Assumption:** a working belief that may still be wrong
- **Learning:** a reusable takeaway from discovery, design, implementation, or use
- **Decision:** a chosen direction that should guide future work until superseded

If the input is ambiguous between learning and decision, prefer `Decision` when a specific choice was made and `Learning` when the result is insight without a directional commitment.

### 2. Read the relevant log

Read:

- `docs/learnings/README.md`
- and one of:
  - `docs/learnings/assumptions-log.md`
  - `docs/learnings/learnings-log.md`
  - `docs/learnings/decision-history.md`

Find the highest existing ID and increment it with zero padding.

### 3. Check for duplicates

- If an exact duplicate already exists, do not create a new entry.
- If a related entry exists, decide whether it should be updated in place or whether the new input is distinct enough to deserve a new entry.
- If updating an existing entry, preserve the original content and append an `Updated:` note with the date and reason.

### 4. Write the entry using the exact template

Use the template already defined in the target log. Do not add, remove, or rename fields.

### 5. Apply quality rules

- Use today's date in `YYYY-MM-DD` format.
- Keep the title specific and easy to scan.
- Set assumption confidence honestly.
- Make validation paths concrete and actionable.
- For decisions, never leave `Alternatives considered` or `Trade-offs` empty.
- Use repo-relative file paths in `Related docs`.

### 6. Save and report

After writing:

- confirm the file updated successfully
- report the entry ID and type
- report the title
- explain in one sentence why the entry was worth capturing
- note any strategic doc or spec that may need follow-up edits

## Rules

- Prefer durable signal over transcript-like detail.
- Prefer updating a near-duplicate entry over creating clutter.
- Do not delete reversed or superseded history; mark it clearly instead.
- Treat `docs/` as the source of truth if another instruction layer conflicts.
