import {
  getMondayOfWeek,
  formatWeekRange,
  createMealPlan,
  updateMealPlanTitle,
  archiveMealPlan,
  restoreMealPlan,
  addGeneratedListRef,
  addMealEntry,
  updateMealEntryName,
  updateMealEntryItems,
  parseMealEntryItemsFromText,
  collectGroceryItems,
  deriveMealPlanSummary
} from '../src/index';

const NOW = new Date('2026-03-16T10:00:00.000Z'); // Monday
const MONDAY_DATE = '2026-03-16';

describe('meal planning domain', () => {
  describe('getMondayOfWeek', () => {
    it('returns the same Monday when input is already Monday', () => {
      const monday = new Date('2026-03-16T00:00:00');
      const result = getMondayOfWeek(monday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it('returns Monday when given a Sunday', () => {
      const sunday = new Date('2026-03-22T00:00:00');
      const result = getMondayOfWeek(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });

    it('returns Monday when given a Friday', () => {
      const friday = new Date('2026-03-20T00:00:00');
      const result = getMondayOfWeek(friday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(16);
    });
  });

  describe('formatWeekRange', () => {
    it('formats a week range from Monday to Sunday', () => {
      const range = formatWeekRange('2026-03-16');
      expect(range).toBe('Mar 16 – Mar 22');
    });

    it('handles month boundary', () => {
      const range = formatWeekRange('2026-03-30');
      expect(range).toBe('Mar 30 – Apr 5');
    });
  });

  describe('createMealPlan', () => {
    it('creates a new plan with default fields', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      expect(plan.title).toBe('Week of Mar 16');
      expect(plan.weekStartDate).toBe(MONDAY_DATE);
      expect(plan.status).toBe('active');
      expect(plan.version).toBe(1);
      expect(plan.mealCount).toBe(0);
      expect(plan.shoppingItemCount).toBe(0);
      expect(plan.generatedListRefs).toEqual([]);
      expect(plan.archivedAt).toBeNull();
    });

    it('throws if weekStartDate is not a Monday', () => {
      expect(() => createMealPlan('Test', '2026-03-17', NOW)).toThrow('Monday');
    });

    it('trims whitespace from title', () => {
      const plan = createMealPlan('  Grocery Week  ', MONDAY_DATE, NOW);
      expect(plan.title).toBe('Grocery Week');
    });
  });

  describe('updateMealPlanTitle', () => {
    it('updates title and increments version', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const updated = updateMealPlanTitle(plan, 'Renamed Plan', NOW);
      expect(updated.title).toBe('Renamed Plan');
      expect(updated.version).toBe(2);
    });
  });

  describe('archiveMealPlan', () => {
    it('archives an active plan', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const archived = archiveMealPlan(plan, NOW);
      expect(archived.status).toBe('archived');
      expect(archived.archivedAt).toBe(NOW.toISOString());
      expect(archived.version).toBe(2);
    });

    it('throws when archiving already-archived plan', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const archived = archiveMealPlan(plan, NOW);
      expect(() => archiveMealPlan(archived, NOW)).toThrow('already archived');
    });
  });

  describe('restoreMealPlan', () => {
    it('restores an archived plan', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const archived = archiveMealPlan(plan, NOW);
      const restored = restoreMealPlan(archived, NOW);
      expect(restored.status).toBe('active');
      expect(restored.archivedAt).toBeNull();
      expect(restored.version).toBe(3);
    });

    it('throws when restoring a non-archived plan', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      expect(() => restoreMealPlan(plan, NOW)).toThrow('not archived');
    });
  });

  describe('addGeneratedListRef', () => {
    it('appends a ref and increments version', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const ref = { listId: crypto.randomUUID(), generatedAt: NOW.toISOString() };
      const updated = addGeneratedListRef(plan, ref, NOW);
      expect(updated.generatedListRefs).toHaveLength(1);
      expect(updated.generatedListRefs[0].listId).toBe(ref.listId);
      expect(updated.version).toBe(2);
    });
  });

  describe('addMealEntry', () => {
    it('creates a new entry with correct fields', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      expect(entry.planId).toBe(plan.id);
      expect(entry.dayOfWeek).toBe(0);
      expect(entry.name).toBe('Pasta');
      expect(entry.position).toBe(0);
      expect(entry.shoppingItems).toEqual([]);
      expect(entry.version).toBe(1);
    });

    it('trims whitespace from name', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, '  Tacos  ', 0, NOW);
      expect(entry.name).toBe('Tacos');
    });
  });

  describe('updateMealEntryName', () => {
    it('updates name and increments version', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      const updated = updateMealEntryName(entry, 'Spaghetti', NOW);
      expect(updated.name).toBe('Spaghetti');
      expect(updated.version).toBe(2);
    });
  });

  describe('updateMealEntryItems', () => {
    it('sets shopping items and increments version', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      const updated = updateMealEntryItems(entry, ['Pasta', 'Sauce', 'Cheese'], NOW);
      expect(updated.shoppingItems).toEqual(['Pasta', 'Sauce', 'Cheese']);
      expect(updated.version).toBe(2);
    });

    it('trims and filters empty strings', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      const updated = updateMealEntryItems(entry, ['  Pasta  ', '', '  ', 'Sauce'], NOW);
      expect(updated.shoppingItems).toEqual(['Pasta', 'Sauce']);
    });
  });

  describe('parseMealEntryItemsFromText', () => {
    it('splits on newlines', () => {
      const result = parseMealEntryItemsFromText('Milk\nEggs\nBread');
      expect(result).toEqual(['Milk', 'Eggs', 'Bread']);
    });

    it('splits on commas', () => {
      const result = parseMealEntryItemsFromText('Milk, Eggs, Bread');
      expect(result).toEqual(['Milk', 'Eggs', 'Bread']);
    });

    it('filters empty entries', () => {
      const result = parseMealEntryItemsFromText('Milk\n\nEggs\n\nBread');
      expect(result).toEqual(['Milk', 'Eggs', 'Bread']);
    });

    it('trims each item', () => {
      const result = parseMealEntryItemsFromText('  Milk  \n  Eggs  ');
      expect(result).toEqual(['Milk', 'Eggs']);
    });
  });

  describe('collectGroceryItems', () => {
    it('collects items in day then position order', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const mon = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      const monWithItems = updateMealEntryItems(mon, ['Pasta', 'Sauce'], NOW);
      const tue = addMealEntry(plan.id, 1, 'Tacos', 0, NOW);
      const tueWithItems = updateMealEntryItems(tue, ['Tortillas', 'Beef'], NOW);
      const result = collectGroceryItems([tueWithItems, monWithItems]);
      expect(result).toEqual(['Pasta', 'Sauce', 'Tortillas', 'Beef']);
    });

    it('returns empty array for entries with no items', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const entry = addMealEntry(plan.id, 0, 'Pasta', 0, NOW);
      expect(collectGroceryItems([entry])).toEqual([]);
    });
  });

  describe('deriveMealPlanSummary', () => {
    it('returns zero counts for empty entries', () => {
      const summary = deriveMealPlanSummary([]);
      expect(summary.mealCount).toBe(0);
      expect(summary.shoppingItemCount).toBe(0);
    });

    it('counts meals and shopping items', () => {
      const plan = createMealPlan('Week of Mar 16', MONDAY_DATE, NOW);
      const e1 = updateMealEntryItems(addMealEntry(plan.id, 0, 'Pasta', 0, NOW), ['Pasta', 'Sauce'], NOW);
      const e2 = updateMealEntryItems(addMealEntry(plan.id, 1, 'Tacos', 0, NOW), ['Tortillas'], NOW);
      const summary = deriveMealPlanSummary([e1, e2]);
      expect(summary.mealCount).toBe(2);
      expect(summary.shoppingItemCount).toBe(3);
    });
  });
});
