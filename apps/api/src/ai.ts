import Anthropic from '@anthropic-ai/sdk';
import type { InboxItem, Reminder, ActivityHistoryItem, WeeklyDayView } from '@olivia/contracts';
import { createDraft, createReminderDraft } from '@olivia/domain';

export type ParseDraftResult = ReturnType<typeof createDraft>;
export type ParseReminderDraftResult = ReturnType<typeof createReminderDraft>;

// Input assembled from H4 API responses for ritual summary generation
export interface RitualSummaryInput {
  // Recap section — activity from the prior calendar week (from GET /api/activity-history window)
  recapItems: ActivityHistoryItem[];         // all items in the last-week window
  lastWeekWindowStart: string;               // YYYY-MM-DD, for prompt context
  lastWeekWindowEnd: string;                 // YYYY-MM-DD

  // Overview section — upcoming items for the current calendar week (from GET /api/weekly-view)
  overviewDays: WeeklyDayView[];             // all 7 days; includes all 4 workflow types
  currentWeekWindowStart: string;            // YYYY-MM-DD
  currentWeekWindowEnd: string;
}

export interface RitualSummaryOutput {
  recapDraft: string | null;      // null if AI could not generate for this section
  overviewDraft: string | null;   // null if AI could not generate for this section
}

export interface AiProvider {
  parseDraft(inputText: string): Promise<ParseDraftResult>;
  parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult>;
  summarize(items: InboxItem[]): Promise<string>;
  summarizeReminders(reminders: Reminder[]): Promise<string>;
  generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput>;
}

export class DisabledAiProvider implements AiProvider {
  async parseDraft(inputText: string): Promise<ParseDraftResult> {
    return createDraft({ inputText });
  }

  async parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult> {
    return createReminderDraft({ inputText });
  }

  async summarize(items: InboxItem[]): Promise<string> {
    return `AI disabled. ${items.length} items available.`;
  }

  async summarizeReminders(reminders: Reminder[]): Promise<string> {
    return `AI disabled. ${reminders.length} reminders available.`;
  }

  async generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput> {
    // Stub returns sample text for testability — not connected to a real model
    const recapCount = input.recapItems.length;
    const overviewCount = input.overviewDays.reduce(
      (sum, d) => sum + d.routines.length + d.reminders.length + d.meals.length + d.inboxItems.length,
      0
    );
    return {
      recapDraft: recapCount > 0
        ? `Last week, your household completed ${recapCount} item${recapCount !== 1 ? 's' : ''} across routines, reminders, and other workflows. ` +
          `The week ran smoothly overall, with most planned activities wrapped up by the end of the week. ` +
          `A few carry-forward opportunities may be worth noting as you look ahead.`
        : null,
      overviewDraft: overviewCount > 0
        ? `This week has ${overviewCount} item${overviewCount !== 1 ? 's' : ''} across your routines and schedule. ` +
          `The week looks moderately busy with a mix of recurring routines and upcoming reminders. ` +
          `A few meal plan entries are already in place for the week ahead.`
        : null
    };
  }
}

export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model = 'claude-haiku-4-5-20251001';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async parseDraft(inputText: string): Promise<ParseDraftResult> {
    return createDraft({ inputText });
  }

  async parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult> {
    return createReminderDraft({ inputText });
  }

  async summarize(items: InboxItem[]): Promise<string> {
    return `AI disabled. ${items.length} items available.`;
  }

  async summarizeReminders(reminders: Reminder[]): Promise<string> {
    return `AI disabled. ${reminders.length} reminders available.`;
  }

  async generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput> {
    const [recapResult, overviewResult] = await Promise.allSettled([
      this.generateSection(this.buildRecapPrompt(input)),
      this.generateSection(this.buildOverviewPrompt(input))
    ]);

    return {
      recapDraft: recapResult.status === 'fulfilled' ? recapResult.value : null,
      overviewDraft: overviewResult.status === 'fulfilled' ? overviewResult.value : null
    };
  }

  private async generateSection(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 300,
          system:
            'You are a helpful household assistant. Write concise, warm summaries based on the structured data provided. Do not present outputs as confirmed or completed — write in a helpful summary tone. Do not include any information not present in the provided data.',
          messages: [{ role: 'user', content: prompt }]
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const block = response.content[0];
      if (block?.type === 'text') {
        return block.text;
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  private buildRecapPrompt(input: RitualSummaryInput): string {
    const lines: string[] = [
      `Write a concise summary of approximately 100–150 words in warm, direct household language summarizing last week's household activity.`,
      `Last week period: ${input.lastWeekWindowStart} to ${input.lastWeekWindowEnd}.`,
      ``,
      `Completed items last week:`
    ];

    for (const item of input.recapItems) {
      switch (item.type) {
        case 'routine':
          lines.push(`- Routine completed: "${item.routineTitle}" (owner: ${item.owner}, due: ${item.dueDate})`);
          break;
        case 'reminder':
          lines.push(`- Reminder ${item.resolution}: "${item.title}" (owner: ${item.owner})`);
          break;
        case 'meal':
          lines.push(`- Meal entry: "${item.name}" from plan "${item.planTitle}" on ${item.date}`);
          break;
        case 'inbox':
          lines.push(`- Task completed: "${item.title}" (owner: ${item.owner})`);
          break;
        case 'listItem':
          lines.push(`- List item checked: "${item.body}" from list "${item.listName}"`);
          break;
      }
    }

    if (input.recapItems.length === 0) {
      lines.push('(No items recorded for last week)');
    }

    return lines.join('\n');
  }

  private buildOverviewPrompt(input: RitualSummaryInput): string {
    const lines: string[] = [
      `Write a concise summary of approximately 100–150 words in warm, direct household language previewing the coming week's household activity.`,
      `This week period: ${input.currentWeekWindowStart} to ${input.currentWeekWindowEnd}.`,
      ``,
      `Upcoming items this week (by day):`
    ];

    for (const day of input.overviewDays) {
      const dayItems: string[] = [];
      for (const r of day.routines) {
        dayItems.push(`routine "${r.routineTitle}" (owner: ${r.owner})`);
      }
      for (const r of day.reminders) {
        dayItems.push(`reminder "${r.title}" (owner: ${r.owner})`);
      }
      for (const m of day.meals) {
        dayItems.push(`meal "${m.name}"`);
      }
      for (const i of day.inboxItems) {
        dayItems.push(`task "${i.title}" (owner: ${i.owner})`);
      }
      if (dayItems.length > 0) {
        lines.push(`${day.date}: ${dayItems.join(', ')}`);
      }
    }

    const totalItems = input.overviewDays.reduce(
      (sum, d) => sum + d.routines.length + d.reminders.length + d.meals.length + d.inboxItems.length,
      0
    );
    if (totalItems === 0) {
      lines.push('(No items scheduled for this week)');
    }

    return lines.join('\n');
  }
}

export function createAiProvider(
  apiKey: string | undefined,
  log?: { warn: (msg: string) => void }
): AiProvider {
  if (apiKey && apiKey.trim().length > 0) {
    return new ClaudeAiProvider(apiKey.trim());
  }
  log?.warn(
    'ANTHROPIC_API_KEY is not set — falling back to DisabledAiProvider. AI-assisted summaries will return placeholder text.'
  );
  return new DisabledAiProvider();
}
