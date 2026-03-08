# Feature Spec: Shared Household Inbox and Follow-Through Queue

## Status
Draft

---

## Summary
Households accumulate tasks, obligations, reminders, and open items faster than any one person can track them. Today those items live scattered across mental memory, text messages, calendar notes, and ad hoc lists — with no shared place to capture them, assign ownership, or follow through. This spec defines Olivia's first workflow: a shared household inbox where items can be added, organized, owned, and progressed, with Olivia surfacing what needs attention and suggesting next actions in an advisory-only posture. If this workflow functions well, the household gains a single, trusted, retrievable view of what exists, who owns it, and what is next.

---

## User Problem
When a household obligation surfaces — a bill to pay, a follow-up call to make, a home repair to schedule — one of two things happens: it is immediately handled (rare), or it is mentally noted and later either forgotten or remembered by the wrong person at the wrong time. The stakeholder often carries this overhead alone, acting as the household's default project manager without a system to offload into. There is no shared, durable place to put "things that need doing" that both household members can reference, that preserves context over time, and that Olivia can help surface and follow through on.

---

## Target Users
- **Primary user:** Stakeholder (project owner) — adds items, reviews the inbox, acts on suggestions, and manages ownership assignments.
- **Secondary user:** Spouse — has read-only visibility into the household inbox; may receive lightweight notifications when relevant items are assigned to them or approaching a due date. Full collaborative participation is deferred.
- **Future users:** Other household members — not a design target in this phase.

---

## Desired Outcome
If this feature works well:
- Every household obligation the stakeholder is aware of has a place to live outside their head.
- At any given time, the stakeholder can ask "what needs doing?" and receive an accurate, organized answer.
- Items assigned to the spouse are visible to both parties; neither person has to ask the other what the other is tracking.
- Items that are due soon, stalled, or overdue are surfaced proactively by Olivia without the stakeholder having to scan for them manually.
- No household obligation is dropped because no one was watching it.

---

## In Scope
- Adding a new item to the household inbox via text input.
- Capturing the following item properties: title, optional description, owner (stakeholder or spouse or unassigned), optional due date or timeframe, and status (open, in-progress, done, or deferred).
- Viewing a current list of all open inbox items, organized by status and optionally filtered by owner or upcoming due date.
- Marking an item as in-progress, done, or deferred.
- Olivia summarizing the current household inbox state on request (e.g., "what's open?", "what's coming up this week?").
- Olivia suggesting which items may need attention based on due date proximity, stale open status, or unassigned ownership.
- Spouse read-only visibility into the inbox state.
- Capturing brief notes or context updates on an existing item.

---

## Boundaries, Gaps, And Future Direction

**Not handled in this spec:**
- Recurring items or scheduled repeating obligations (deferred to a future reminder and planning spec).
- Full two-user collaborative editing, role management, or permission tiers (deferred to Horizon 3).
- Automated reminders sent to the spouse or to external channels without user approval (advisory-only constraint).
- Natural language date parsing beyond common patterns (e.g., "next Tuesday", "end of the month") — initial version may require explicit dates or simple relative terms.
- Attachment or file support (not a day-one requirement).
- Item tagging, categories, or labels beyond owner and status (deferred unless stakeholder feedback identifies it as blocking).
- Integration with external calendars or task systems (deferred; depends on interface and stack decisions).

**Known gaps acceptable for this phase:**
- Spouse interaction is read-only. If the spouse wants to add or update items, they must coordinate with the stakeholder. This is acceptable while the primary-operator model is being validated.
- Due dates are soft targets; there is no hard scheduling or calendar enforcement in this spec.
- Olivia's suggestions are based on available item metadata (date, status, owner) rather than contextual household knowledge. Deeper inference is a future capability.

**Likely future direction:**
- Spouse lightweight participation (marking items done, adding items) once the primary-operator model has been validated.
- Reminders as a first-class sub-workflow (a dedicated spec when inbox follow-through patterns are understood from real use).
- Proactive push notifications when items approach due dates (advisory model allows drafting; sending requires explicit approval).

---

## Workflow

**Primary workflow: Adding and reviewing inbox items**

1. **User** invokes Olivia and states they want to add a household item (e.g., "Add: schedule HVAC service, due end of March, owner: me").
2. **Olivia** parses the input and extracts: title, owner, due date or timeframe, and status (defaults to open).
3. **Olivia** presents the parsed item back to the user for confirmation before saving (e.g., "I'll add: 'Schedule HVAC service', owner: Stakeholder, due: end of March. Confirm?").
4. **User** confirms or corrects the item.
5. **System** saves the item to durable household memory.
6. **Olivia** confirms the item was saved and offers to show the current inbox summary.

**Secondary workflow: Reviewing the inbox**

1. **User** asks Olivia to show the inbox (e.g., "What's open?", "What's coming up this week?").
2. **Olivia** retrieves current inbox items from durable memory.
3. **Olivia** presents a structured summary grouped by status (open, in-progress, deferred) and optionally filtered by owner or due date proximity.
4. **Olivia** flags items that appear to need attention (overdue, stale, unassigned) and suggests next steps in advisory language.
5. **User** optionally acts on a suggestion (e.g., "Mark HVAC service as in-progress", "Assign electrician call to spouse").
6. **Olivia** presents the proposed change for confirmation.
7. **User** confirms.
8. **System** updates the item.

**Secondary workflow: Updating an existing item**

1. **User** references an existing item and states the update (e.g., "Mark the HVAC appointment as done" or "Change the electrician call due date to next Friday").
2. **Olivia** identifies the item and presents the proposed change.
3. **User** confirms.
4. **System** updates the item and confirms.

**Secondary workflow: Spouse read-only view**

1. **Spouse** asks Olivia to show the current household inbox.
2. **Olivia** presents the current inbox state in read-only form.
3. **Spouse** may ask questions about items (e.g., "Who owns the HVAC service item?") but cannot add or modify items in this phase.

---

## Behavior

### Facts the system records
- Item title (required)
- Item description or context notes (optional)
- Owner: stakeholder, spouse, or unassigned
- Status: open (default), in-progress, done, deferred
- Due date or timeframe (optional)
- Date item was created
- Date item was last updated
- History of status changes (for audit and context)

### Suggestions Olivia makes (advisory, not automatic)
- "You have 3 items due this week. Want a summary?"
- "The 'electrician call' item has been open for 2 weeks with no update. Is it still active?"
- "You have 4 unassigned items. Would you like to assign owners?"
- "Nothing is marked in-progress. Should any of these open items move forward now?"

### Actions proposed (always require explicit user approval)
- Saving a new item to the inbox
- Updating item status
- Reassigning item ownership
- Marking an item as deferred or done
- Archiving or removing an item

---

## Data And Memory

**Durable state (persists across sessions):**
- All inbox items and their full property set (title, description, owner, status, due date, created date, updated date)
- Status change history per item
- All household inbox data is treated as sensitive and stored locally

**Transient state (within a session):**
- Current parsed input awaiting user confirmation
- The current inbox view or summary being presented
- Olivia's pending suggestion set before it is shown to the user

**Sensitive data handling:**
- All inbox items are local-only per the privacy-first principle. Item contents (titles, descriptions, context notes) may reference personal household details (finances, health, relationships) and must not be transmitted to external services without explicit user action.
- If AI assistance is used for parsing or suggestion, only the minimum necessary content should be sent, and item records themselves should be stored locally regardless of AI usage pattern.

---

## Permissions And Trust Model

This feature remains **advisory-only** throughout.

| Action | Requires Approval? | Notes |
|---|---|---|
| Adding a new item | Yes — user must confirm parsed item before save | Olivia presents the item; user approves |
| Updating item status | Yes — user must confirm each change | No automatic status transitions |
| Reassigning ownership | Yes — user must confirm | Olivia may suggest but never reassigns automatically |
| Marking items done | Yes — user must confirm | Even if Olivia detects an item may be stale |
| Displaying inbox summary | No — read-only retrieval | Olivia may show the inbox on request without approval |
| Archiving or removing items | Yes — user must confirm | Hard to reverse; always requires explicit approval |
| Sending notifications to spouse | Not in scope for this spec | Deferred; would require approval when introduced |

Olivia must never:
- Automatically update any item without explicit user confirmation.
- Infer that a task is "done" and update its status based on a user comment without explicit confirmation.
- Send any household data to an external channel or service automatically.

No advisory exceptions apply to this spec.

---

## AI Role

**Where AI adds essential value:**
- Natural language parsing of user input into structured item properties (title, owner, due date, status)
- Generating inbox summaries in clear, readable prose
- Identifying which items may need attention based on metadata patterns (overdue, stale, unassigned) and framing useful suggestions

**Where AI is a convenience, not essential:**
- Phrasing suggestions in a helpful, readable tone (could be templated)
- Grouping or prioritizing items in the summary view (could be rule-based)

**What must work without AI:**
- Storing, retrieving, and updating inbox items (core data operations must be AI-independent)
- Displaying a raw list of all current items and their properties
- Accepting status updates by direct user command (e.g., "Mark item 3 as done")

**Fallback behavior if AI is unavailable:**
- Olivia accepts structured item input (explicit fields) rather than natural language parsing.
- Inbox summaries are presented as plain structured lists rather than AI-generated prose.
- Suggestions are skipped or replaced with a static prompt (e.g., "You have 5 open items. Review?").
- All core data operations (add, update, view) remain functional.

---

## Risks And Failure Modes

**Risk 1: Item capture too slow or frictional, so users stop adding items**
- If adding an item requires too many confirmation steps or precise syntax, the household will fall back to mental tracking.
- Mitigation: Parse natural language input liberally; always show a confirmation step but make it fast and low-friction (one-word confirm). Optimize the add-item flow first.

**Risk 2: Inbox grows stale and users stop trusting it**
- If items accumulate without follow-through, the inbox becomes noise rather than signal.
- Mitigation: Olivia should surface stale items proactively in summaries. Regularly surfacing "you have 12 items, 5 have not been touched in 2+ weeks" helps keep the list honest.

**Risk 3: Olivia's suggestions become noise if too frequent or too generic**
- Over-surfacing items that aren't actually urgent erodes attention and trust in Olivia's judgment.
- Mitigation: Suggestions should be limited to items with clear signals (overdue, no owner, no status update in N days). Cap suggestions per session. Err on the side of fewer, higher-quality nudges.

**Risk 4: Owner assignment creates friction rather than clarity**
- If assigning items to the spouse creates coordination awkwardness (e.g., spouse doesn't know they have items), the feature may cause household tension rather than reduce it.
- Mitigation: In this phase, the stakeholder assigns and manages; spouse has read-only view. Full assignment workflows with notifications are deferred until trust in the system is established.

**Risk 5: Ambiguous item input causes Olivia to parse incorrectly**
- If Olivia misparses an item and the user doesn't notice the confirmation step, incorrect data gets saved.
- Mitigation: Always surface the parsed item clearly before saving. Make corrections easy (e.g., "Not quite — change owner to spouse"). Log parsing confidence if available.

---

## UX Notes

**This feature should feel like:**
- A trusted place to put things down and know they'll still be there later.
- A calm daily companion for household logistics, not a demanding task manager.
- Low-overhead: adding an item should feel faster and easier than writing it down.

**Anti-patterns to avoid:**
- Do not surface the full inbox list unprompted every session. That becomes noise.
- Do not require rigid input syntax. The user should be able to say "add: call the insurance company this week" and have Olivia handle the structure.
- Do not guilt-trip the user about overdue or stale items. Surfacing is enough; pressure is not Olivia's role.
- Do not surface too many suggestions at once. One or two prioritized nudges per review is more useful than a wall of flags.
- Do not make confirmation steps feel like bureaucracy. The confirmation should show the item clearly and let the user confirm in one action.

---

## Acceptance Criteria

1. **Given** a user provides a natural language item description, **when** Olivia processes it, **then** a parsed item with title, owner (or unassigned), status (open by default), and optional due date is presented for user confirmation before any save occurs.

2. **Given** a user confirms an item, **when** Olivia saves it, **then** the item is durably stored and retrievable in subsequent sessions without re-entry.

3. **Given** a user asks for the current inbox (e.g., "what's open?"), **when** Olivia responds, **then** all open and in-progress items are listed with title, owner, and due date if present, grouped by status.

4. **Given** a user requests a status update on an item (e.g., "mark HVAC as done"), **when** Olivia processes the request, **then** the proposed update is presented for confirmation before the item is modified.

5. **Given** an item has a due date that has passed and its status is still open, **when** Olivia generates an inbox summary, **then** that item is flagged as overdue in the summary output.

6. **Given** an item has had no status update for 14 or more days and is still open or in-progress, **when** Olivia generates a summary, **then** that item is surfaced as potentially stale.

7. **Given** Olivia's AI capability is unavailable, **when** a user adds an item using explicit field syntax, **then** the item is still captured and saved without AI parsing.

8. **Given** a spouse user views the inbox, **when** Olivia presents the summary, **then** the spouse can read all item details but cannot add, update, or remove items.

9. **Given** Olivia makes a suggestion (e.g., "Item X is overdue — mark as done?"), **when** the user accepts, **then** Olivia presents the change as a confirmation step rather than immediately applying it.

10. **Given** a user marks an item as done, **when** Olivia updates the item, **then** the item moves out of the active open/in-progress view but remains retrievable (not permanently deleted).

---

## Validation And Testing

**Unit-level (logic):**
- Item parsing: verify that common natural language patterns produce correct structured output (title, owner, due date, status).
- Date normalization: verify that relative date expressions ("next Friday", "end of month", "this week") are resolved consistently.
- Staleness detection: verify that items exceeding the staleness threshold are correctly flagged.
- Status transition: verify that each valid status transition (open → in-progress, open → done, etc.) is handled and invalid transitions are rejected gracefully.

**Integration-level (system behavior):**
- Verify that an item added in one session is retrievable in a new session.
- Verify that all item updates are persisted durably and reflected in the next summary view.
- Verify that Olivia's advisory confirmation step is always presented before any write operation.
- Verify that the spouse read-only path cannot trigger write operations.

**Household validation (manual observation required):**
- The stakeholder uses the inbox for two consecutive weeks of actual household logistics and reports whether the add-item flow feels fast enough to use habitually.
- The stakeholder observes whether Olivia's suggestions surface items they would otherwise have missed, versus surfacing noise they had to ignore.
- The household confirms that items added in a session are reliably present in the next session (trust in durability).

---

## Dependencies And Related Learnings

- **D-002**: Advisory-only trust model — all actions in this spec require user confirmation. This constraint shapes the full permissions section.
- **D-004**: Primary-operator model — the stakeholder is the primary user; spouse is read-only in this spec. This shapes the target user and workflow sections.
- **D-007**: MVP interface direction — implementation planning should target an installable mobile-first PWA as the canonical surface for this workflow, with notifications primarily serving the stakeholder.
- **A-001**: Shared household state is the best first wedge — this spec is the direct implementation of that assumption. Validation of A-001 comes from real household use of this workflow.
- **A-002**: Advisory-only behavior is the right trust model — confirmed applicable to this spec; advisory compliance is documented throughout.
- **A-003**: Early interaction can remain channel-agnostic — this assumption has been validated for planning purposes. The workflow was specified without locking the surface, and implementation direction was later chosen as an installable mobile-first PWA.
- **L-001**: Household command center framing — this spec stays within that framing; it does not attempt to build a general assistant workflow.
- **L-002**: Durable project memory is a core need — the data model in this spec explicitly distinguishes durable from transient state and treats all household data as local-first.

---

## Open Questions

1. **Notification scope**: Which primary-operator notifications should ship in the first implementation slice to create useful signal without creating noise? Candidates include due-soon alerts, stale-item review prompts, and optional digests. This matters because the chosen PWA surface can support notifications, but the product ethos requires a calm posture.

2. **Staleness threshold**: The spec proposes 14 days as the threshold for surfacing a stale item. This is a placeholder that should be validated against real household usage. If it proves too noisy or too lenient, it should be adjusted.

3. **Spouse notification path**: If the spouse has items assigned to them, how do they become aware without a proactive push mechanism? In this spec, they can only see items by actively checking the inbox. This may be insufficient for real household use. This is not a blocker for the first spec but should be revisited before the feature is used heavily.

---

## Facts, Assumptions, And Decisions

**Facts:**
- The project is greenfield with no existing data model or persistence layer.
- Household data is sensitive and must be stored locally per the product ethos.
- The stakeholder is the primary evaluator for this workflow.
- The trust model is advisory-only in the first major phase (D-002).
- The recommended MVP surface for implementation planning is an installable mobile-first PWA (D-007).

**Assumptions:**
- A-001: Shared household state is the best first wedge — this spec is the primary test of that assumption.
- New assumption (to be logged): A 14-day staleness threshold will surface genuinely stale items without creating excessive noise. Low confidence — requires real household usage to validate.

**Decisions:**
- D-002: Advisory-only trust model applies throughout this spec without exception.
- D-004: Spouse is read-only in this first spec; full collaborative participation is deferred.
- D-007: Implementation planning for this workflow should target an installable mobile-first PWA rather than Slack or a native-first client strategy.
- Spec-level decision: Reminders are not a first-class object in this spec. They are represented as item properties (due date, timeframe) rather than a separate entity type. This keeps scope narrow and allows a dedicated reminder spec to be written once inbox usage patterns are understood.

---

## Deferred Decisions

- **Post-PWA client strategy**: Whether native clients or a dedicated shared-display mode are warranted beyond the installable PWA.
- **Reminder model**: Whether reminders become a first-class object in a future spec or remain a property of inbox items. Revisit after the inbox workflow has been used and patterns around reminder needs become clear.
- **Spouse lightweight participation**: Whether the spouse should be able to add items, mark items done, or leave notes on items. Deferred until primary-operator model is validated through real use. D-004 applies.
- **Item archiving policy**: How long done or deferred items are retained before they are archived or removed from active views. No retention policy is defined in this spec.
- **Notification delivery for spouse**: If items are assigned to the spouse, what mechanism informs them. Not addressed here; depends on interface surface and trust model expansion.
