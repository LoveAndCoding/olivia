import type { InboxItem } from '@olivia/contracts';
import { createDraft } from '@olivia/domain';

export type ParseDraftResult = ReturnType<typeof createDraft>;

export interface AiProvider {
  parseDraft(inputText: string): Promise<ParseDraftResult>;
  summarize(items: InboxItem[]): Promise<string>;
}

export class DisabledAiProvider implements AiProvider {
  async parseDraft(inputText: string): Promise<ParseDraftResult> {
    return createDraft({ inputText });
  }

  async summarize(items: InboxItem[]): Promise<string> {
    return `AI disabled. ${items.length} items available.`;
  }
}
