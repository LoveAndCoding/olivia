import { describe, expect, it } from 'vitest';
import { formatSnoozeUntil, getDateChipOptions, getSnoozeOptions } from './reminder-helpers';

describe('formatSnoozeUntil', () => {
  it('formats a date string with time', () => {
    const tomorrow9am = new Date('2026-03-23T09:00:00.000Z');
    const result = formatSnoozeUntil(tomorrow9am.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats absolute date for distant dates', () => {
    const distantDate = new Date('2026-04-15T15:00:00.000Z');
    const result = formatSnoozeUntil(distantDate.toISOString());
    expect(result).toContain('Apr 15');
    expect(result).toContain(':00');
  });
});

describe('getDateChipOptions', () => {
  it('returns Today, Tonight, Tomorrow chips', () => {
    const now = new Date('2026-03-22T10:00:00.000Z');
    const chips = getDateChipOptions(now);
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.label)).toEqual(['Today', 'Tonight', 'Tomorrow']);
  });

  it('Today chip defaults to next hour', () => {
    const now = new Date('2026-03-22T10:00:00.000Z');
    const chips = getDateChipOptions(now);
    const todayChip = chips.find((c) => c.label === 'Today')!;
    expect(todayChip.value.getHours()).toBe(11);
    expect(todayChip.value.getMinutes()).toBe(0);
  });

  it('Tomorrow chip defaults to 9 AM', () => {
    const now = new Date('2026-03-22T10:00:00.000Z');
    const chips = getDateChipOptions(now);
    const tomorrowChip = chips.find((c) => c.label === 'Tomorrow')!;
    expect(tomorrowChip.value.getHours()).toBe(9);
    expect(tomorrowChip.value.getMinutes()).toBe(0);
  });
});

describe('getSnoozeOptions', () => {
  it('hides "This afternoon" when past 2 PM, replaces with "In 3 hours"', () => {
    const afternoon = new Date('2026-03-22T15:00:00.000Z');
    const options = getSnoozeOptions(afternoon);
    const labels = options.map((o) => o.label);
    expect(labels).not.toContain('This afternoon');
    expect(labels).toContain('In 3 hours');
  });

  it('hides "Tonight" when past 6 PM', () => {
    const evening = new Date('2026-03-22T20:00:00.000Z');
    const options = getSnoozeOptions(evening);
    const labels = options.map((o) => o.label);
    expect(labels).not.toContain('Tonight');
  });

  it('always includes "In 1 hour" and "Tomorrow morning"', () => {
    const now = new Date('2026-03-22T23:45:00.000Z');
    const options = getSnoozeOptions(now);
    const labels = options.map((o) => o.label);
    expect(labels).toContain('In 1 hour');
    expect(labels).toContain('Tomorrow morning');
  });
});
