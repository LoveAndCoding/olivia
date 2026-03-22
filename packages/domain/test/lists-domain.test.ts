import {
  addListItem,
  archiveList,
  assertStakeholderWrite,
  checkItem,
  createItemAddedHistoryEntry,
  createItemsClearedHistoryEntry,
  createItemsUncheckedAllHistoryEntry,
  createListCreatedHistoryEntry,
  createSharedList,
  deriveListSummary,
  restoreList,
  uncheckItem,
  updateItemBody,
  updateListTitle
} from '../src/index';

const NOW = new Date('2026-03-15T10:00:00.000Z');

describe('list domain', () => {
  describe('createSharedList', () => {
    it('creates a new list with default fields', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      expect(list.title).toBe('Grocery Run');
      expect(list.owner).toBe('stakeholder');
      expect(list.status).toBe('active');
      expect(list.version).toBe(1);
      expect(list.activeItemCount).toBe(0);
      expect(list.checkedItemCount).toBe(0);
      expect(list.allChecked).toBe(false);
      expect(list.archivedAt).toBeNull();
      expect(list.createdAt).toBe(NOW.toISOString());
    });

    it('trims whitespace from title', () => {
      const list = createSharedList('  Packing List  ', 'stakeholder', NOW);
      expect(list.title).toBe('Packing List');
    });
  });

  describe('updateListTitle', () => {
    it('updates title and increments version', () => {
      const list = createSharedList('Grocery', 'stakeholder', NOW);
      const updated = updateListTitle(list, 'Weekly Groceries', NOW);
      expect(updated.title).toBe('Weekly Groceries');
      expect(updated.version).toBe(2);
    });

    it('trims whitespace from new title', () => {
      const list = createSharedList('Old Title', 'stakeholder', NOW);
      const updated = updateListTitle(list, '  New Title  ', NOW);
      expect(updated.title).toBe('New Title');
    });
  });

  describe('archiveList', () => {
    it('archives an active list', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const archived = archiveList(list, NOW);
      expect(archived.status).toBe('archived');
      expect(archived.archivedAt).toBe(NOW.toISOString());
      expect(archived.version).toBe(2);
    });

    it('throws when archiving an already-archived list', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const archived = archiveList(list, NOW);
      expect(() => archiveList(archived, NOW)).toThrow('already archived');
    });
  });

  describe('restoreList', () => {
    it('restores an archived list', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const archived = archiveList(list, NOW);
      const restored = restoreList(archived, NOW);
      expect(restored.status).toBe('active');
      expect(restored.archivedAt).toBeNull();
      expect(restored.version).toBe(3);
    });

    it('throws when restoring an active list', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      expect(() => restoreList(list, NOW)).toThrow('not archived');
    });
  });

  describe('addListItem', () => {
    it('creates a new item with correct fields', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, 'Oat milk', 0, NOW);
      expect(item.body).toBe('Oat milk');
      expect(item.listId).toBe(list.id);
      expect(item.checked).toBe(false);
      expect(item.checkedAt).toBeNull();
      expect(item.position).toBe(0);
      expect(item.version).toBe(1);
    });

    it('uses append-order position', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = addListItem(list.id, 'Item A', 0, NOW);
      const item1 = addListItem(list.id, 'Item B', 1, NOW);
      expect(item0.position).toBe(0);
      expect(item1.position).toBe(1);
    });

    it('trims whitespace from body', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, '  Eggs  ', 0, NOW);
      expect(item.body).toBe('Eggs');
    });
  });

  describe('updateItemBody', () => {
    it('updates body and increments version', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, 'Oat milk', 0, NOW);
      const updated = updateItemBody(item, 'Almond milk', NOW);
      expect(updated.body).toBe('Almond milk');
      expect(updated.version).toBe(2);
    });
  });

  describe('checkItem', () => {
    it('sets checked and checkedAt', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, 'Oat milk', 0, NOW);
      const checked = checkItem(item, NOW);
      expect(checked.checked).toBe(true);
      expect(checked.checkedAt).toBe(NOW.toISOString());
      expect(checked.version).toBe(2);
    });
  });

  describe('uncheckItem', () => {
    it('clears checked and checkedAt', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, 'Oat milk', 0, NOW);
      const checked = checkItem(item, NOW);
      const unchecked = uncheckItem(checked, NOW);
      expect(unchecked.checked).toBe(false);
      expect(unchecked.checkedAt).toBeNull();
      expect(unchecked.version).toBe(3);
    });
  });

  describe('deriveListSummary', () => {
    it('returns zero counts for empty item list', () => {
      const summary = deriveListSummary([]);
      expect(summary.activeItemCount).toBe(0);
      expect(summary.checkedItemCount).toBe(0);
      expect(summary.allChecked).toBe(false);
    });

    it('counts active and checked items correctly', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = addListItem(list.id, 'Item A', 0, NOW);
      const item1 = checkItem(addListItem(list.id, 'Item B', 1, NOW), NOW);
      const item2 = addListItem(list.id, 'Item C', 2, NOW);
      const summary = deriveListSummary([item0, item1, item2]);
      expect(summary.activeItemCount).toBe(3);
      expect(summary.checkedItemCount).toBe(1);
      expect(summary.allChecked).toBe(false);
    });

    it('reports allChecked when every item is checked', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = checkItem(addListItem(list.id, 'Item A', 0, NOW), NOW);
      const item1 = checkItem(addListItem(list.id, 'Item B', 1, NOW), NOW);
      const summary = deriveListSummary([item0, item1]);
      expect(summary.allChecked).toBe(true);
      expect(summary.checkedItemCount).toBe(2);
    });
  });

  describe('assertStakeholderWrite', () => {
    it('does not throw for stakeholder', () => {
      expect(() => assertStakeholderWrite('stakeholder')).not.toThrow();
    });

    it('throws a 403 read-only error for spouse', () => {
      expect(() => assertStakeholderWrite('spouse')).toThrow();
      try {
        assertStakeholderWrite('spouse');
      } catch (error) {
        expect((error as Error & { statusCode?: number; code?: string }).statusCode).toBe(403);
        expect((error as Error & { statusCode?: number; code?: string }).code).toBe('ROLE_READ_ONLY');
      }
    });
  });

  describe('history entry helpers', () => {
    it('createSharedList produces list_created history', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const entry = createListCreatedHistoryEntry(list, 'stakeholder');
      expect(entry.eventType).toBe('list_created');
      expect(entry.listId).toBe(list.id);
      expect(entry.itemId).toBeNull();
      expect((entry.toValue as Record<string, unknown>).title).toBe('Grocery Run');
    });

    it('createItemAddedHistoryEntry produces item_added history', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item = addListItem(list.id, 'Oat milk', 0, NOW);
      const entry = createItemAddedHistoryEntry(item, 'stakeholder');
      expect(entry.eventType).toBe('item_added');
      expect(entry.listId).toBe(list.id);
      expect(entry.itemId).toBe(item.id);
    });

    it('createItemsClearedHistoryEntry produces items_cleared history with count', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const entry = createItemsClearedHistoryEntry(list.id, 5, 'stakeholder', NOW);
      expect(entry.eventType).toBe('items_cleared');
      expect(entry.listId).toBe(list.id);
      expect(entry.itemId).toBeNull();
      expect((entry.fromValue as Record<string, unknown>).count).toBe(5);
      expect(entry.toValue).toBeNull();
      expect(entry.actorRole).toBe('stakeholder');
    });

    it('createItemsUncheckedAllHistoryEntry produces items_unchecked_all history with count', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const entry = createItemsUncheckedAllHistoryEntry(list.id, 3, 'stakeholder', NOW);
      expect(entry.eventType).toBe('items_unchecked_all');
      expect(entry.listId).toBe(list.id);
      expect(entry.itemId).toBeNull();
      expect((entry.fromValue as Record<string, unknown>).count).toBe(3);
      expect(entry.toValue).toBeNull();
      expect(entry.actorRole).toBe('stakeholder');
    });
  });

  describe('deriveListSummary — completed-item scenarios', () => {
    it('returns correct counts after clearing completed items (simulated)', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = addListItem(list.id, 'Milk', 0, NOW);
      const item1 = checkItem(addListItem(list.id, 'Bread', 1, NOW), NOW);
      const item2 = addListItem(list.id, 'Eggs', 2, NOW);
      // Simulate "clear completed" by filtering out checked items
      const remainingItems = [item0, item1, item2].filter(i => !i.checked);
      const summary = deriveListSummary(remainingItems);
      expect(summary.activeItemCount).toBe(2);
      expect(summary.checkedItemCount).toBe(0);
      expect(summary.allChecked).toBe(false);
    });

    it('returns correct counts after unchecking all items (simulated)', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = checkItem(addListItem(list.id, 'Milk', 0, NOW), NOW);
      const item1 = checkItem(addListItem(list.id, 'Bread', 1, NOW), NOW);
      const item2 = checkItem(addListItem(list.id, 'Eggs', 2, NOW), NOW);
      // Simulate "uncheck all" by unchecking every item
      const uncheckedItems = [item0, item1, item2].map(i => uncheckItem(i, NOW));
      const summary = deriveListSummary(uncheckedItems);
      expect(summary.activeItemCount).toBe(3);
      expect(summary.checkedItemCount).toBe(0);
      expect(summary.allChecked).toBe(false);
    });

    it('allChecked is false after clearing when unchecked items remain', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = addListItem(list.id, 'Milk', 0, NOW);
      const item1 = checkItem(addListItem(list.id, 'Bread', 1, NOW), NOW);
      // Clear completed → only unchecked remain
      const remaining = [item0, item1].filter(i => !i.checked);
      const summary = deriveListSummary(remaining);
      expect(summary.allChecked).toBe(false);
    });

    it('summary is empty after clearing all items from a fully-checked list', () => {
      const list = createSharedList('Grocery Run', 'stakeholder', NOW);
      const item0 = checkItem(addListItem(list.id, 'Milk', 0, NOW), NOW);
      const item1 = checkItem(addListItem(list.id, 'Bread', 1, NOW), NOW);
      // Clear completed on a fully-checked list → empty
      const remaining = [item0, item1].filter(i => !i.checked);
      const summary = deriveListSummary(remaining);
      expect(summary.activeItemCount).toBe(0);
      expect(summary.checkedItemCount).toBe(0);
      expect(summary.allChecked).toBe(false);
    });
  });
});
