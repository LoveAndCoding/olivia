import type { InboxItem, Reminder } from '@olivia/contracts';
import { createDraft, createReminderDraft } from '@olivia/domain';

export type ParseDraftResult = ReturnType<typeof createDraft>;
export type ParseReminderDraftResult = ReturnType<typeof createReminderDraft>;

export interface AiProvider {
  parseDraft(inputText: string): Promise<ParseDraftResult>;
  parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult>;
  summarize(items: InboxItem[]): Promise<string>;
  summarizeReminders(reminders: Reminder[]): Promise<string>;
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
}
