import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import {
  historyEntrySchema,
  inboxItemSchema,
  notificationSubscriptionSchema,
  type HistoryEntry,
  type InboxItem,
  type NotificationSubscription
} from '@olivia/contracts';

const mapItemRow = (row: Record<string, unknown>): InboxItem =>
  inboxItemSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    owner: row.owner,
    status: row.status,
    dueAt: row.due_at ?? null,
    dueText: row.due_text ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    lastStatusChangedAt: row.last_status_changed_at,
    lastNoteAt: row.last_note_at ?? null,
    archivedAt: row.archived_at ?? null
  });

const mapHistoryRow = (row: Record<string, unknown>): HistoryEntry =>
  historyEntrySchema.parse({
    id: row.id,
    itemId: row.item_id,
    actorRole: row.actor_role,
    eventType: row.event_type,
    fromValue: row.from_value ? JSON.parse(String(row.from_value)) : null,
    toValue: row.to_value ? JSON.parse(String(row.to_value)) : null,
    createdAt: row.created_at
  });

export class InboxRepository {
  constructor(private readonly db: Database.Database) {}

  listItems(): InboxItem[] {
    const rows = this.db.prepare('SELECT * FROM inbox_items ORDER BY updated_at DESC').all() as Record<string, unknown>[];
    return rows.map(mapItemRow);
  }

  getItem(itemId: string): InboxItem | null {
    const row = this.db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(itemId) as Record<string, unknown> | undefined;
    return row ? mapItemRow(row) : null;
  }

  listHistory(itemId: string): HistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM inbox_item_history WHERE item_id = ? ORDER BY created_at DESC')
      .all(itemId) as Record<string, unknown>[];
    return rows.map(mapHistoryRow);
  }

  createItem(item: InboxItem, historyEntry: HistoryEntry): void {
    const insertItem = this.db.prepare(`
      INSERT INTO inbox_items (
        id, title, description, owner, status, due_at, due_text, created_at, updated_at, version, last_status_changed_at, last_note_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertItem.run(
        item.id,
        item.title,
        item.description,
        item.owner,
        item.status,
        item.dueAt,
        item.dueText,
        item.createdAt,
        item.updatedAt,
        item.version,
        item.lastStatusChangedAt,
        item.lastNoteAt,
        item.archivedAt
      );
      insertHistory.run(
        historyEntry.id,
        historyEntry.itemId,
        historyEntry.actorRole,
        historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
    });

    transaction();
  }

  updateItem(item: InboxItem, historyEntry: HistoryEntry, expectedVersion: number): boolean {
    const updateItem = this.db.prepare(`
      UPDATE inbox_items
      SET title = ?, description = ?, owner = ?, status = ?, due_at = ?, due_text = ?, updated_at = ?, version = ?, last_status_changed_at = ?, last_note_at = ?, archived_at = ?
      WHERE id = ? AND version = ?
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      const result = updateItem.run(
        item.title,
        item.description,
        item.owner,
        item.status,
        item.dueAt,
        item.dueText,
        item.updatedAt,
        item.version,
        item.lastStatusChangedAt,
        item.lastNoteAt,
        item.archivedAt,
        item.id,
        expectedVersion
      );
      if (result.changes === 0) {
        return false;
      }
      insertHistory.run(
        historyEntry.id,
        historyEntry.itemId,
        historyEntry.actorRole,
        historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return true;
    });

    return transaction();
  }

  saveNotificationSubscription(actorRole: NotificationSubscription['actorRole'], endpoint: string, payload: Record<string, unknown>): NotificationSubscription {
    const subscription = notificationSubscriptionSchema.parse({
      id: randomUUID(),
      actorRole,
      endpoint,
      payload,
      createdAt: new Date().toISOString()
    });

    this.db
      .prepare(`
        INSERT INTO notification_subscriptions (id, actor_role, endpoint, payload, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET actor_role = excluded.actor_role, payload = excluded.payload
      `)
      .run(subscription.id, subscription.actorRole, subscription.endpoint, JSON.stringify(subscription.payload), subscription.createdAt);

    return subscription;
  }

  listNotificationSubscriptions(actorRole: NotificationSubscription['actorRole']): NotificationSubscription[] {
    const rows = this.db
      .prepare('SELECT * FROM notification_subscriptions WHERE actor_role = ? ORDER BY created_at DESC')
      .all(actorRole) as Record<string, unknown>[];

    return rows.map((row) =>
      notificationSubscriptionSchema.parse({
        id: row.id,
        actorRole: row.actor_role,
        endpoint: row.endpoint,
        payload: JSON.parse(String(row.payload)),
        createdAt: row.created_at
      })
    );
  }

  exportSnapshot(): { items: InboxItem[]; history: HistoryEntry[] } {
    const historyRows = this.db.prepare('SELECT * FROM inbox_item_history ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return {
      items: this.listItems(),
      history: historyRows.map(mapHistoryRow)
    };
  }
}
