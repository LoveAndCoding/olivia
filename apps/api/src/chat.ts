import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import { ONBOARDING_TOPICS, type OnboardingTopic } from '@olivia/contracts';
import type { InboxRepository, OnboardingSessionRow } from './repository';
import type { AppConfig } from './config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatToolCall = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'dismissed';
};

export type ChatStreamEvent =
  | { event: 'text'; data: { delta: string } }
  | { event: 'tool_call'; data: { toolCall: ChatToolCall } }
  | { event: 'done'; data: { messageId: string; conversationId: string } }
  | { event: 'error'; data: { message: string } };

// ─── Context Assembly ─────────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 8000;

export function assembleHouseholdContext(
  repository: InboxRepository,
  config: AppConfig,
  now: Date
): string {
  const sections: string[] = [];
  const today = format(now, 'yyyy-MM-dd');
  const dayOfWeek = format(now, 'EEEE');

  sections.push(`Today is ${dayOfWeek}, ${today}.`);
  sections.push(`Household timezone: ${config.householdTimezone}.`);

  // Inbox items
  const items = repository.listItems();
  const activeItems = items.filter(i => i.status === 'open' || i.status === 'in_progress');
  if (activeItems.length > 0) {
    const lines = [`\n## Active Inbox Items (${activeItems.length})`];
    for (const item of activeItems.slice(0, 15)) {
      const due = item.dueAt ? ` (due: ${item.dueAt.slice(0, 10)})` : '';
      lines.push(`- "${item.title}" — status: ${item.status}, owner: ${item.owner}${due}`);
    }
    if (activeItems.length > 15) lines.push(`  ...and ${activeItems.length - 15} more`);
    sections.push(lines.join('\n'));
  } else {
    sections.push('\n## Inbox: empty');
  }

  // Reminders
  const reminders = repository.listReminders(now);
  const activeReminders = reminders.filter(r => r.state !== 'completed' && r.state !== 'cancelled');
  if (activeReminders.length > 0) {
    const lines = [`\n## Active Reminders (${activeReminders.length})`];
    for (const r of activeReminders.slice(0, 15)) {
      lines.push(`- "${r.title}" — state: ${r.state}, scheduled: ${r.scheduledAt.slice(0, 16)}, owner: ${r.owner}`);
    }
    if (activeReminders.length > 15) lines.push(`  ...and ${activeReminders.length - 15} more`);
    sections.push(lines.join('\n'));
  } else {
    sections.push('\n## Reminders: none active');
  }

  // Routines
  const routines = repository.listRoutines('active');
  if (routines.length > 0) {
    const lines = [`\n## Active Routines (${routines.length})`];
    for (const r of routines.slice(0, 10)) {
      lines.push(`- "${r.title}" — recurrence: ${r.recurrenceRule}, next due: ${r.currentDueDate}, owner: ${r.owner}`);
    }
    if (routines.length > 10) lines.push(`  ...and ${routines.length - 10} more`);
    sections.push(lines.join('\n'));
  } else {
    sections.push('\n## Routines: none active');
  }

  // Shared lists
  const lists = repository.listSharedLists('active');
  if (lists.length > 0) {
    const lines = [`\n## Shared Lists (${lists.length})`];
    for (const list of lists.slice(0, 5)) {
      const listItems = repository.getListItems(list.id);
      const unchecked = listItems.filter(li => !li.checked);
      lines.push(`- "${list.title}" — ${unchecked.length} unchecked / ${listItems.length} total`);
      for (const li of unchecked.slice(0, 5)) {
        lines.push(`  · ${li.body}`);
      }
      if (unchecked.length > 5) lines.push(`  ...and ${unchecked.length - 5} more unchecked`);
    }
    sections.push(lines.join('\n'));
  } else {
    sections.push('\n## Lists: none');
  }

  // Meal plans
  const mealPlans = repository.listMealPlans('active');
  if (mealPlans.length > 0) {
    const lines = [`\n## Meal Plans (${mealPlans.length})`];
    for (const plan of mealPlans.slice(0, 2)) {
      lines.push(`- "${plan.title}" (week of ${plan.weekStartDate})`);
      const entries = repository.getMealEntries(plan.id);
      for (const entry of entries.slice(0, 7)) {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        lines.push(`  · ${dayNames[entry.dayOfWeek] ?? `Day ${entry.dayOfWeek}`}: ${entry.name}`);
      }
      if (entries.length > 7) lines.push(`  ...and ${entries.length - 7} more entries`);
    }
    sections.push(lines.join('\n'));
  }

  let context = sections.join('\n');
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS) + '\n...(context truncated for token budget)';
  }
  return context;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(householdContext: string): string {
  return `You are Olivia, a household command center assistant.

## Voice
- Speak in a calm, steady, present tone. Be warm but not performative.
- Be clear, not clever. No puns, jokes, or personality quirks.
- Be supportive, not sycophantic. Do not praise the user for basic tasks.
- Keep responses concise and grounded in household data.

## Capabilities
- You can read and summarize household state: inbox items, reminders, routines, shared lists, meal plans, and the weekly view.
- You can propose changes by calling tools. Every proposed change will be shown to the user as a draft for confirmation — you never execute changes directly.
- You cannot send messages, access external services, or take actions outside the household data you have been given.
- When you do not have enough information to answer, say so. Do not fabricate data.

## Behavioral rules
- When the user's request is ambiguous, ask a clarifying question rather than guessing.
- When referencing household data, be specific (use titles, dates, names from the context).
- Do not volunteer information the user did not ask about unless it is directly relevant.
- Do not generate long lists unprompted. Summarize and offer to detail.
- Steer off-topic requests back to household management gracefully.
- Never claim to have done something you have not done. Proposed changes are drafts until confirmed.

## Tool use rules
- Use the provided tools to propose changes when the user asks to create, update, or modify household items.
- Each tool call generates a draft action card. Do not describe the draft in prose — the card is the interface.
- If you need to create multiple items, make multiple tool calls. Each gets its own confirmation.
- After calling a tool, briefly acknowledge what you proposed and let the action card speak for itself.

## Current Household State
${householdContext}`;
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const CHAT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'create_inbox_item',
    description: 'Propose creating a new inbox item (task). The user will see a draft card and must confirm before it is created.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Title of the task' },
        owner: { type: 'string', enum: ['stakeholder', 'spouse', 'unassigned'], description: 'Who owns this task' },
        dueText: { type: 'string', description: 'Natural language due date (e.g., "Friday", "next week")' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['title']
    }
  },
  {
    name: 'create_reminder',
    description: 'Propose setting a reminder. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'What to be reminded about' },
        scheduledAt: { type: 'string', description: 'ISO 8601 datetime or natural language time for the reminder' },
        owner: { type: 'string', enum: ['stakeholder', 'spouse', 'unassigned'], description: 'Who owns this reminder' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['title', 'scheduledAt']
    }
  },
  {
    name: 'add_list_item',
    description: 'Propose adding an item to a shared list. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        listTitle: { type: 'string', description: 'Name of the target shared list' },
        body: { type: 'string', description: 'The item to add' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['listTitle', 'body']
    }
  },
  {
    name: 'create_meal_entry',
    description: 'Propose adding a meal entry to the current meal plan. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the meal' },
        dayOfWeek: { type: 'number', description: 'Day of week (0=Mon, 6=Sun)' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['name', 'dayOfWeek']
    }
  },
  {
    name: 'complete_routine',
    description: 'Propose marking a routine as complete for its current due date. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        routineTitle: { type: 'string', description: 'Title of the routine to complete' }
      },
      required: ['routineTitle']
    }
  },
  {
    name: 'skip_routine',
    description: 'Propose skipping a routine for its current due date. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        routineTitle: { type: 'string', description: 'Title of the routine to skip' }
      },
      required: ['routineTitle']
    }
  }
];

// ─── Onboarding Tools (OLI-119) ──────────────────────────────────────────────

const ONBOARDING_EXTRA_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'create_routine',
    description: 'Propose creating a recurring routine. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Title of the routine (e.g., "Take out trash")' },
        owner: { type: 'string', enum: ['stakeholder', 'spouse', 'unassigned'], description: 'Who owns this routine' },
        recurrenceRule: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'every_n_days'], description: 'How often the routine recurs' },
        intervalDays: { type: 'number', description: 'Number of days between occurrences (only for every_n_days)' },
        firstDueDate: { type: 'string', description: 'ISO 8601 date for the first occurrence (e.g., "2026-03-18")' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['title', 'recurrenceRule']
    }
  },
  {
    name: 'create_shared_list',
    description: 'Propose creating a new shared list. The user will see a draft card and must confirm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Name of the list (e.g., "Groceries", "Packing list")' },
        owner: { type: 'string', enum: ['stakeholder', 'spouse', 'unassigned'], description: 'Who owns this list' },
        parseConfidence: { type: 'number', description: 'How confident you are in your interpretation of this item (0.0 to 1.0). Use 0.9+ when the user was specific, 0.5-0.89 when you inferred details, below 0.5 when guessing.' }
      },
      required: ['title']
    }
  }
];

export const ONBOARDING_TOOLS: Anthropic.Messages.Tool[] = [
  ...CHAT_TOOLS,
  ...ONBOARDING_EXTRA_TOOLS
];

// ─── Onboarding System Prompt (OLI-119) ─────────────────────────────────────

const TOPIC_PROMPTS: Record<OnboardingTopic, string> = {
  tasks: "Let's start with the things on your mind. What tasks, to-dos, or obligations are you tracking right now? Just list them out naturally — I'll organize them.",
  routines: "Any recurring chores or routines your household does regularly? Things like cleaning, laundry, taking out trash, paying bills?",
  reminders: "Do you have any upcoming reminders or deadlines you want to make sure you don't forget?",
  lists: "Do you keep any shared lists — groceries, shopping, packing lists, or anything else?",
  meals: "Do you plan meals for the week? If so, tell me about your typical pattern."
};

export function getTopicPrompt(topic: OnboardingTopic): string {
  return TOPIC_PROMPTS[topic];
}

export function getNextOnboardingTopic(completedTopics: string[]): OnboardingTopic | null {
  for (const topic of ONBOARDING_TOPICS) {
    if (!completedTopics.includes(topic)) return topic;
  }
  return null;
}

// ─── Starter Templates (OLI-119) ────────────────────────────────────────────

export const STARTER_ROUTINE_TEMPLATES = [
  { title: 'Take out trash', recurrenceRule: 'weekly' as const },
  { title: 'Do laundry', recurrenceRule: 'weekly' as const },
  { title: 'Clean kitchen', recurrenceRule: 'weekly' as const },
  { title: 'Vacuum/sweep floors', recurrenceRule: 'weekly' as const },
  { title: 'Pay bills', recurrenceRule: 'monthly' as const },
  { title: 'Water plants', recurrenceRule: 'weekly' as const },
  { title: 'Change bed sheets', recurrenceRule: 'weekly' as const },
];

export const STARTER_LIST_TEMPLATES = [
  { title: 'Groceries' },
  { title: 'Shopping list' },
  { title: 'Things to buy' },
];

export function buildOnboardingSystemPrompt(
  householdContext: string,
  session: OnboardingSessionRow | null
): string {
  const completedTopics = session?.topicsCompleted ?? [];
  const currentTopic = session?.currentTopic ?? null;
  const nextTopic = currentTopic ?? getNextOnboardingTopic(completedTopics);

  const routineTemplateList = STARTER_ROUTINE_TEMPLATES.map(t => `"${t.title}" (${t.recurrenceRule})`).join(', ');
  const listTemplateList = STARTER_LIST_TEMPLATES.map(t => `"${t.title}"`).join(', ');

  return `You are Olivia, a household command center assistant guiding a new user through their initial household setup.

## Voice
- Speak in a calm, steady, present tone. Be warm and encouraging but not performative.
- Be clear, not clever. No puns, jokes, or personality quirks.
- Keep responses concise. This should feel like a conversation, not a questionnaire.
- Celebrate what the user shares ("Great, I've got those captured") without being sycophantic.

## Your Role
You are helping the user set up their household by walking through topics one at a time. For each topic, you:
1. Ask what they have on their mind for that area
2. Parse their freeform text into specific, actionable items
3. Use your tools to propose each item as a draft for the user to confirm
4. After they respond, ask if they want to keep going or stop for now

## Topic Flow
The topics are: tasks → routines → reminders → lists → meals.
Topics already completed: ${completedTopics.length > 0 ? completedTopics.join(', ') : 'none'}.
${currentTopic ? `Current topic: ${currentTopic}. Continue guiding the user through this topic.` : ''}
${nextTopic && !currentTopic ? `Next topic to introduce: ${nextTopic}.` : ''}
${completedTopics.length === ONBOARDING_TOPICS.length ? 'All topics completed! Summarize what was created and congratulate the user.' : ''}

## Starter Templates
When on the routines topic, mention that many households track routines like ${routineTemplateList}. Offer these as suggestions the user can accept or skip.
When on the lists topic, mention common lists like ${listTemplateList}. Offer these as suggestions.
Templates are suggestions only — never auto-create them.

## Tool Use Rules
- Parse the user's freeform text into individual items and create a tool call for EACH item.
- For tasks, use create_inbox_item. For reminders, use create_reminder. For routines, use create_routine. For lists, use create_shared_list and add_list_item. For meals, use create_meal_entry.
- Each tool call generates a draft card. Do not describe the draft in prose — the card is the interface.
- After proposing items, briefly acknowledge what you captured and let the cards speak for themselves.
- If the user's text is ambiguous, ask a clarifying question before creating drafts.
- Always include parseConfidence (0.0–1.0) in every tool call: 0.9+ when the user was explicit and specific, 0.5–0.89 when you had to infer missing details (due dates, owners, recurrence), below 0.5 when guessing or the intent was unclear.

## Progressive Exit
After each topic's items are confirmed, ask: "Want to keep going with the next area, or is this enough for now?"
If the user wants to stop, say something warm like "You've made a great start. You can always continue setup later from the home screen."

## Behavioral Rules
- Never create items without using a tool call (which requires user confirmation).
- Never auto-create starter templates. Always ask first.
- Be specific with proposed items. "Buy groceries" is too vague — ask what they need.
- If the user shares a mix of topics (tasks + reminders in one message), sort them into the right types.
- Keep the conversation flowing naturally. Don't repeat instructions the user has already heard.

## Current Household State
${householdContext}`;
}

// ─── Streaming Chat Engine ────────────────────────────────────────────────────

const CHAT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_CONVERSATION_HISTORY = 20;

export async function* streamChat(
  client: Anthropic,
  repository: InboxRepository,
  config: AppConfig,
  conversationId: string,
  _userContent: string,
  now: Date,
  log?: { warn: (obj: Record<string, unknown>, msg: string) => void }
): AsyncGenerator<ChatStreamEvent> {
  const householdContext = assembleHouseholdContext(repository, config, now);
  const systemPrompt = buildSystemPrompt(householdContext);

  // Build conversation history for LLM
  // Note: the user message is already saved to DB before streamChat is called,
  // so recentMessages includes it — no need to append it again.
  const recentMessages = repository.getRecentChatMessages(conversationId, MAX_CONVERSATION_HISTORY);
  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const stream = await client.messages.create(
      {
        model: CHAT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: CHAT_TOOLS,
        stream: true
      },
      { signal: controller.signal }
    );

    let fullText = '';
    const toolCalls: ChatToolCall[] = [];
    let currentToolName = '';
    let currentToolInput = '';
    let currentToolUseId = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // text block starting
        } else if (event.content_block.type === 'tool_use') {
          currentToolName = event.content_block.name;
          currentToolUseId = event.content_block.id;
          currentToolInput = '';
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          yield { event: 'text', data: { delta: event.delta.text } };
        } else if (event.delta.type === 'input_json_delta') {
          currentToolInput += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolName && currentToolUseId) {
          let parsedInput: Record<string, unknown> = {};
          try {
            parsedInput = JSON.parse(currentToolInput || '{}');
          } catch {
            log?.warn({ toolName: currentToolName, rawInput: currentToolInput?.slice(0, 500) }, 'Malformed JSON in AI tool call');
          }
          const toolCall: ChatToolCall = {
            id: randomUUID(),
            type: currentToolName,
            data: parsedInput,
            status: 'pending'
          };
          toolCalls.push(toolCall);
          yield { event: 'tool_call', data: { toolCall } };
          currentToolName = '';
          currentToolInput = '';
          currentToolUseId = '';
        }
      }
    }

    clearTimeout(timeout);

    // Save assistant message to DB — use current time so it sorts after the user message
    const assistantMsgId = randomUUID();
    const assistantNow = new Date();
    repository.addChatMessage({
      id: assistantMsgId,
      conversationId,
      role: 'assistant',
      content: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
      createdAt: assistantNow.toISOString()
    });
    repository.touchConversation(conversationId, assistantNow);

    yield { event: 'done', data: { messageId: assistantMsgId, conversationId } };
  } catch (err) {
    clearTimeout(timeout);
    log?.warn({ err: err as Record<string, unknown> }, 'Chat stream failed');
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'I\'m taking longer than usual to think this through. Give me another moment, or try asking in a different way.'
      : 'Something unexpected happened on my end. Try sending your message again.';
    yield { event: 'error', data: { message } };
  }
}

// ─── Onboarding Chat Engine (OLI-119) ───────────────────────────────────────

export async function* streamOnboardingChat(
  client: Anthropic,
  repository: InboxRepository,
  config: AppConfig,
  conversationId: string,
  session: OnboardingSessionRow,
  now: Date,
  log?: { warn: (obj: Record<string, unknown>, msg: string) => void }
): AsyncGenerator<ChatStreamEvent> {
  const householdContext = assembleHouseholdContext(repository, config, now);
  const systemPrompt = buildOnboardingSystemPrompt(householdContext, session);

  const recentMessages = repository.getRecentChatMessages(conversationId, MAX_CONVERSATION_HISTORY);
  const messages: Anthropic.Messages.MessageParam[] = [];
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const stream = await client.messages.create(
      {
        model: CHAT_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools: ONBOARDING_TOOLS,
        stream: true
      },
      { signal: controller.signal }
    );

    let fullText = '';
    const toolCalls: ChatToolCall[] = [];
    let currentToolName = '';
    let currentToolInput = '';
    let currentToolUseId = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolName = event.content_block.name;
          currentToolUseId = event.content_block.id;
          currentToolInput = '';
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullText += event.delta.text;
          yield { event: 'text', data: { delta: event.delta.text } };
        } else if (event.delta.type === 'input_json_delta') {
          currentToolInput += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolName && currentToolUseId) {
          let parsedInput: Record<string, unknown> = {};
          try {
            parsedInput = JSON.parse(currentToolInput || '{}');
          } catch {
            log?.warn({ toolName: currentToolName, rawInput: currentToolInput?.slice(0, 500) }, 'Malformed JSON in onboarding AI tool call');
          }
          const toolCall: ChatToolCall = {
            id: randomUUID(),
            type: currentToolName,
            data: parsedInput,
            status: 'pending'
          };
          toolCalls.push(toolCall);
          yield { event: 'tool_call', data: { toolCall } };
          currentToolName = '';
          currentToolInput = '';
          currentToolUseId = '';
        }
      }
    }

    clearTimeout(timeout);

    const assistantMsgId = randomUUID();
    const assistantNow = new Date();
    repository.addChatMessage({
      id: assistantMsgId,
      conversationId,
      role: 'assistant',
      content: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : null,
      createdAt: assistantNow.toISOString()
    });
    repository.touchConversation(conversationId, assistantNow);

    yield { event: 'done', data: { messageId: assistantMsgId, conversationId } };
  } catch (err) {
    clearTimeout(timeout);
    log?.warn({ err: err as Record<string, unknown> }, 'Onboarding chat stream failed');
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'I\'m taking longer than usual to think this through. Give me another moment, or try asking in a different way.'
      : 'Something unexpected happened on my end. Try sending your message again.';
    yield { event: 'error', data: { message } };
  }
}
