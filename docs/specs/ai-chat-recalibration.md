# Feature Spec: AI Chat Recalibration — Advisory-Only Compliance

## Status
- Draft

## Summary
The chat interface currently violates the advisory-only trust model (D-002) by aggressively proposing entity creation before understanding user intent. Board feedback: Olivia suggested 8-9 irrelevant tasks without asking, there is no way to clear unwanted draft suggestions, and users end up deleting entire conversations to reset. This spec recalibrates chat behavior to be conversation-first — Olivia should understand before proposing, propose less, and make it easy to dismiss or clear unwanted suggestions.

## User Problem
- The chat interface creates draft action cards (tasks, reminders, list items) before the user has asked for them, violating the expectation that Olivia suggests rather than acts.
- When Olivia proposes 8-9 items at once, the user must individually dismiss each one. There is no batch dismiss or conversation-level undo.
- Bad interactions accumulate in conversation history, making the chat feel cluttered and unreliable. Users delete entire conversations to escape, which loses any useful context.
- The net effect is negative: chat creates more cognitive load than it removes, undermining Olivia's core value proposition.

## Target Users
- Primary user: stakeholder (primary operator)
- Secondary user: spouse (read-only in this phase)

## Desired Outcome
- Chat interactions feel like talking to a thoughtful household coordinator who listens first and suggests only when the user's intent is clear.
- When Olivia does propose changes, the proposals are few, relevant, and easy to accept or dismiss.
- Users can quickly clear unwanted suggestions without losing the entire conversation.
- Users rarely feel the need to delete conversations because interactions are helpful, not cluttered.

## In Scope
1. **System prompt recalibration** — rewrite behavioral rules to enforce conversation-first engagement
2. **Tool-use throttling** — limit the number of draft action cards Olivia can propose per response
3. **Confidence gating** — Olivia should only propose entity creation when confidence in user intent is high
4. **Batch dismiss UX** — ability to dismiss all pending draft action cards at once
5. **Conversation-level undo** — ability to clear the last Olivia response and its associated drafts
6. **System prompt guardrails** — explicit anti-patterns the LLM must avoid

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Conversation summarization or automatic pruning (separate concern)
  - Multi-session or threaded conversations
  - Proactive Olivia-initiated messages
  - Changes to the chat data model or API contracts (this is a behavior-layer change)
- Known gaps acceptable for this phase:
  - The LLM may still occasionally over-propose despite prompt guardrails. Prompt engineering is probabilistic, not deterministic. The tool-use cap provides a hard backstop.
  - Batch dismiss is a UI convenience; individual dismiss still works as before.
- Likely future direction:
  - User-configurable chat personality (more/less proactive)
  - Conversation quality feedback mechanism (thumbs up/down on responses)
  - Adaptive behavior based on user interaction patterns

## Workflow

### Recalibrated conversation flow
1. User sends a message in chat.
2. Olivia reads the message and assesses intent:
   - **Information request** (e.g., "What's due this week?") — respond with a grounded summary. No tool calls.
   - **Vague or exploratory** (e.g., "I need to get organized") — ask clarifying questions to understand what the user actually wants. No tool calls.
   - **Specific action request** (e.g., "Add milk to the grocery list") — propose a draft action card. Tool call appropriate.
   - **Ambiguous action request** (e.g., "I need to deal with the house stuff") — ask what specifically the user wants to do. No tool calls.
3. When Olivia does propose drafts, she proposes at most **3 draft action cards per response**. If the user's request implies more items, Olivia proposes the first 3 and asks: "Should I continue with more?"
4. After proposing drafts, Olivia waits for the user to confirm, dismiss, or continue the conversation. She does not propose additional items until the user has responded.

### Batch dismiss flow
1. When multiple draft action cards are pending in a single response, a "Dismiss all" action appears alongside the individual dismiss buttons.
2. User taps "Dismiss all" — all pending drafts from that response are dismissed at once.
3. Olivia acknowledges briefly: "Got it, cleared those suggestions."

### Undo last response flow
1. The most recent Olivia response has an "Undo" affordance (available only on the latest response, not historical ones).
2. User taps "Undo" — the last Olivia response and all its associated draft action cards are removed from the conversation.
3. The user's message that prompted the response remains, allowing the user to rephrase or try again.
4. If any drafts from that response were already confirmed, undo is not available (the domain write already happened).

## Behavior

### System prompt changes (behavioral rules)

The following rules replace or augment the existing behavioral rules in the system prompt:

**Conversation-first engagement:**
- Your default mode is conversational. Listen, understand, and respond before proposing any changes.
- Never propose creating items (tasks, reminders, list items, meals, routines) unless the user has specifically asked you to create something or the user's intent is unambiguous.
- When in doubt about what the user wants, ask a clarifying question. Asking is always better than guessing.

**Anti-patterns (things you must never do):**
- Never respond to a general statement (e.g., "I'm feeling overwhelmed" or "I need to get organized") by proposing a batch of tasks or items. Respond conversationally first.
- Never propose more than 3 items in a single response. If the request implies more, propose the first 3 and ask if the user wants more.
- Never infer items the user didn't mention. If the user says "add milk to the grocery list," add milk — do not also suggest eggs, bread, or other items you think they might need.
- Never restate what you just proposed in prose. The draft action card is the interface — a brief acknowledgment is sufficient.

**Confidence threshold:**
- Only call a tool when you are confident the user wants that specific item created. If your confidence is below 0.8 (on the parseConfidence scale already in the tool schema), ask a clarifying question instead.
- When you do call a tool, set `parseConfidence` honestly. The frontend may use this to visually distinguish high-confidence from lower-confidence proposals.

**Response style in chat:**
- Keep responses short. A helpful chat response is 1-3 sentences, not a paragraph.
- When summarizing household state, lead with what matters most (overdue, due today) and offer to detail further.
- When the user seems frustrated or wants to start fresh, acknowledge it and offer to clear suggestions or start a new topic.

### Tool-use cap (hard limit)
- The API enforces a maximum of **3 tool calls per LLM response**. If the LLM returns more than 3, only the first 3 are surfaced as draft action cards; the rest are silently dropped.
- This is a backstop, not a design target. The system prompt should prevent over-proposing; the cap catches edge cases.

### Frontend behavior changes
- **Batch dismiss**: when 2+ draft action cards are pending from a single response, show a "Dismiss all" button.
- **Undo last response**: the most recent Olivia response shows an undo affordance. Tapping it removes the response and all associated drafts. Not available if any draft from that response was already confirmed.
- **Pending draft indicator**: if a user scrolls away from pending drafts and sends a new message, show a subtle indicator that unresolved drafts exist above.

## Data And Memory
- No new data models or tables required.
- Undo removes messages from the conversation store (same delete path as conversation clear, scoped to specific message IDs).
- Batch dismiss updates draft status to `dismissed` using the existing dismiss endpoint, called in sequence for each draft.
- No changes to household data storage or sensitivity model.

## Permissions And Trust Model
- This spec strengthens advisory-only compliance. No changes to the trust model itself.
- **Agentic actions** (Olivia proposes, user confirms): all draft action cards — unchanged, but now with stricter proposal criteria.
- **User-initiated actions** (execute immediately): batch dismiss, undo last response — these are non-destructive conversation management actions.
- **Destructive actions**: none introduced. Undo only removes AI-generated content, not user messages.
- **Olivia must never**: propose entity creation without clear user intent. This is the core behavioral change.

## AI Role

### Where AI adds value (unchanged)
- Natural language understanding of user intent
- Contextual household-aware responses
- Draft generation when user intent is clear

### Recalibration of AI behavior
- The system prompt is the primary lever. The existing prompt says "ask clarifying questions when ambiguous" but does not strongly enough prevent premature tool use. The recalibrated prompt makes conversation-first the explicit default and tool use the exception.
- The tool-use cap is a hard engineering backstop. It cannot be bypassed by prompt injection or LLM drift.

### When AI is unavailable
- No change from existing behavior. Chat input disabled with a clear message.

## Risks And Failure Modes
- **Over-correction**: Olivia becomes too conservative and never proposes items, even when the user clearly asks. Mitigated by: the prompt explicitly says to propose when intent is clear and unambiguous. The 3-item cap is per-response, not per-conversation.
- **Prompt drift**: LLM behavior may drift over time or with model updates. Mitigated by: the hard tool-use cap provides a deterministic backstop regardless of LLM behavior.
- **Undo data loss**: user accidentally undoes a response they wanted to keep. Mitigated by: undo only affects the most recent response, and confirmed drafts block undo entirely.
- **Batch dismiss confusion**: user dismisses all drafts but wanted one of them. Mitigated by: individual dismiss buttons remain available alongside batch dismiss.

## UX Notes
- The chat should feel like talking to someone who is genuinely trying to understand what you need, not someone who jumps to action before you finish speaking.
- "Dismiss all" should be visually secondary to individual draft action cards — it's a convenience escape hatch, not the primary interaction.
- The undo affordance should be subtle (e.g., a small icon on the response bubble) — it is not a primary action.
- When Olivia asks a clarifying question, the question should be specific and short, not a list of options that itself creates cognitive load.

## Acceptance Criteria
1. Olivia does not propose draft action cards in response to vague or general statements (e.g., "I'm overwhelmed," "I need to get organized," "help me with the house").
2. Olivia asks a clarifying question when the user's intent is ambiguous rather than guessing and proposing items.
3. Olivia proposes at most 3 draft action cards per response. If more are implied, she asks whether to continue.
4. Olivia does not infer or add items the user did not explicitly mention.
5. The system prompt includes explicit anti-patterns that prevent aggressive tool use.
6. The API enforces a hard cap of 3 tool calls per response, silently dropping extras.
7. A "Dismiss all" button appears when 2+ draft action cards are pending from a single response.
8. Tapping "Dismiss all" dismisses all pending drafts from that response.
9. An "Undo" affordance on the most recent Olivia response removes the response and all associated drafts.
10. Undo is not available when any draft from the response has already been confirmed.
11. The recalibrated system prompt enforces conversation-first engagement as the default mode.
12. `parseConfidence` is set on all tool calls. The frontend may use this value for visual treatment.
13. All new UI components have corresponding CSS styles and render as visually specified.
14. `npm run typecheck` passes with zero errors.

## Validation And Testing

### Unit tests
- System prompt construction includes all recalibrated behavioral rules and anti-patterns.
- Tool-use cap logic: verify that responses with >3 tool calls are truncated to 3.
- Batch dismiss: verify that dismissing all drafts from a response calls the dismiss endpoint for each.
- Undo: verify that undoing a response removes the correct messages from the conversation store.
- Undo blocked: verify that undo is not available when a draft from the response was confirmed.

### Integration tests
- Send a vague message ("I need to get organized") — verify Olivia responds conversationally with no tool calls.
- Send a specific request ("Add milk to the grocery list") — verify Olivia proposes exactly one draft action card.
- Send a multi-item request ("Add milk, eggs, bread, butter, cheese, and yogurt to the grocery list") — verify Olivia proposes at most 3 and asks about the rest.
- Verify batch dismiss clears all pending drafts from a response.
- Verify undo removes the last Olivia response and its drafts.

### Manual validation
- Have the board use the recalibrated chat for 3-5 days and report whether the interaction quality has improved.
- Specifically test: does the board still feel the need to delete conversations? If yes, investigate why.

## Dependencies And Related Learnings
- L-032: AI chat that creates actions without user confirmation erodes trust faster than no AI at all.
- L-031: Feature breadth without depth produces "barebones" perception.
- D-002: Advisory-only trust model — chat must comply.
- D-065: M30 direction — AI chat recalibration is priority item #4.
- `docs/specs/chat-feature.md` — the existing chat spec. This recalibration spec amends the behavioral layer; the data model, API contracts, and core architecture remain unchanged.
- `docs/specs/chat-ux-spec.md` — the interaction design spec. Batch dismiss and undo are additions to the existing UX surface.
- `apps/api/src/chat.ts` — the current system prompt and tool definitions. This is where the prompt changes and tool-use cap will be implemented.

## Open Questions
1. **Conversation lifecycle**: The board deletes chats frequently. Is this because conversations should be ephemeral (like iMessage — each one is short-lived and disposable), or because bad interactions clutter an otherwise useful history? The answer affects whether we should add auto-expiry, conversation archiving, or just make interactions good enough that deletion isn't needed. **Recommendation**: Start by making interactions good enough. If deletion frequency drops after recalibration, the problem was quality, not lifecycle. If it persists, revisit conversation lifecycle in a follow-up spec.
2. **parseConfidence frontend treatment**: Should low-confidence drafts (0.5-0.8) be visually differentiated from high-confidence ones (0.8+)? For example, a muted card with "Not sure about this one — confirm?" vs. a standard card. **Recommendation**: Yes, but defer to Designer for the visual treatment. The data is already available in the tool call schema.

## Facts, Assumptions, And Decisions

### Facts
- The current system prompt (in `apps/api/src/chat.ts`) includes "ask clarifying questions when ambiguous" but does not prevent premature tool use.
- The existing tool schema already includes `parseConfidence` but the system prompt does not enforce a minimum threshold.
- The board reported deleting chats frequently and finding the chat "too aggressive" with suggestions.
- Chat uses Claude Haiku (claude-haiku-4-5-20251001) with max 1024 tokens and 30-second timeout.
- There is no batch dismiss or undo capability in the current chat UX.

### Assumptions
- Recalibrating the system prompt will meaningfully reduce aggressive tool use. Confidence: high — prompt instructions are the primary behavioral lever for LLMs.
- A hard cap of 3 tool calls per response is sufficient. Confidence: high — even for explicit multi-item requests, proposing 3 at a time with "want more?" is a better UX than a wall of cards.
- Undo is useful for the most recent response only. Confidence: medium — users may want to undo earlier responses, but scoping to the latest keeps the feature simple and avoids complex state management.

### Decisions
- D-RECAL-01: Conversation-first is the default mode. Olivia must understand intent before proposing action. Tool calls are the exception, not the default.
- D-RECAL-02: Hard cap of 3 tool calls per response, enforced at the API level. The system prompt targets fewer; the cap is a backstop.
- D-RECAL-03: Undo scoped to the most recent response only. Broader undo deferred.
- D-RECAL-04: No changes to the chat data model or API contracts. This is a behavior-layer and UX-layer change.

## Deferred Decisions
- Conversation lifecycle strategy (ephemeral vs. persistent, auto-expiry, archiving).
- User-configurable chat personality or proactivity level.
- Conversation quality feedback mechanism (thumbs up/down).
- Changes to the LLM model, token budget, or timeout for chat.
- Adaptive behavior based on user interaction history.
