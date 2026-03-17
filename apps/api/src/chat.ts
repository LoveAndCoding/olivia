import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import type { InboxRepository } from './repository';
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
        dueText: { type: 'string', description: 'Natural language due date (e.g., "Friday", "next week")' }
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
        owner: { type: 'string', enum: ['stakeholder', 'spouse', 'unassigned'], description: 'Who owns this reminder' }
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
        body: { type: 'string', description: 'The item to add' }
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
        dayOfWeek: { type: 'number', description: 'Day of week (0=Mon, 6=Sun)' }
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

// ─── Streaming Chat Engine ────────────────────────────────────────────────────

const CHAT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_CONVERSATION_HISTORY = 20;

export async function* streamChat(
  client: Anthropic,
  repository: InboxRepository,
  config: AppConfig,
  conversationId: string,
  _userContent: string,
  now: Date
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
            // leave empty
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
    const message = err instanceof Error && err.name === 'AbortError'
      ? 'I\'m taking longer than usual to think this through. Give me another moment, or try asking in a different way.'
      : 'Something unexpected happened on my end. Try sending your message again.';
    yield { event: 'error', data: { message } };
  }
}
