import type { DraftItem, DraftReminder, InboxItem, Reminder, ReminderUpdateChange, UpdateChange } from '@olivia/contracts';

type CreateDraftRecord = {
  kind: 'create';
  finalItem: DraftItem;
};

type UpdateDraftRecord = {
  kind: 'update';
  itemId: string;
  expectedVersion: number;
  proposedChange: UpdateChange;
  proposedItem: InboxItem;
};

type CreateReminderDraftRecord = {
  kind: 'reminder_create';
  finalReminder: DraftReminder;
};

type UpdateReminderDraftRecord = {
  kind: 'reminder_update';
  reminderId: string;
  expectedVersion: number;
  proposedChange: ReminderUpdateChange;
  proposedReminder: Reminder;
};

export type DraftRecord = CreateDraftRecord | UpdateDraftRecord | CreateReminderDraftRecord | UpdateReminderDraftRecord;

export class DraftStore {
  private readonly drafts = new Map<string, DraftRecord>();

  save(draftId: string, record: DraftRecord): void {
    this.drafts.set(draftId, record);
  }

  take(draftId?: string): DraftRecord | undefined {
    if (!draftId) {
      return undefined;
    }
    const record = this.drafts.get(draftId);
    this.drafts.delete(draftId);
    return record;
  }

  peek(draftId?: string): DraftRecord | undefined {
    return draftId ? this.drafts.get(draftId) : undefined;
  }
}
