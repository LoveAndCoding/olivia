import { describe, it, expect } from 'vitest';
import { getReviewWindowsForOccurrence, formatReviewWindowAsDateStrings } from '../src/index';

describe('getReviewWindowsForOccurrence', () => {
  it('Sunday March 8: lastWeek = Mar 2–8, currentWeek = Mar 9–15', () => {
    const anchor = new Date('2026-03-08T18:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2026-03-02', end: '2026-03-08' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-03-09', end: '2026-03-15' });
  });

  it('Sunday March 15: lastWeek = Mar 9–15, currentWeek = Mar 16–22', () => {
    const anchor = new Date('2026-03-15T18:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2026-03-09', end: '2026-03-15' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-03-16', end: '2026-03-22' });
  });

  it('Wednesday March 11: same lastWeek/currentWeek as Sunday March 8 anchor week', () => {
    const anchor = new Date('2026-03-11T12:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2026-03-02', end: '2026-03-08' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-03-09', end: '2026-03-15' });
  });

  it('Month boundary: Sunday March 1: lastWeek = Feb 23–Mar 1, currentWeek = Mar 2–Mar 8', () => {
    const anchor = new Date('2026-03-01T18:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2026-02-23', end: '2026-03-01' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-03-02', end: '2026-03-08' });
  });

  it('Year boundary: Sunday January 4, 2026: lastWeek = Dec 29–Jan 4, currentWeek = Jan 5–Jan 11', () => {
    const anchor = new Date('2026-01-04T18:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2025-12-29', end: '2026-01-04' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-01-05', end: '2026-01-11' });
  });

  it('Monday March 9: lastWeek = Mar 2–8, currentWeek = Mar 9–15', () => {
    const anchor = new Date('2026-03-09T10:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(formatReviewWindowAsDateStrings({ start: w.lastWeekStart, end: w.lastWeekEnd }))
      .toEqual({ start: '2026-03-02', end: '2026-03-08' });
    expect(formatReviewWindowAsDateStrings({ start: w.currentWeekStart, end: w.currentWeekEnd }))
      .toEqual({ start: '2026-03-09', end: '2026-03-15' });
  });

  it('lastWeekEnd is always Sunday at end-of-day', () => {
    const anchor = new Date('2026-03-08T18:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(w.lastWeekEnd.getHours()).toBe(23);
    expect(w.lastWeekEnd.getMinutes()).toBe(59);
    expect(w.lastWeekEnd.getSeconds()).toBe(59);
  });

  it('currentWeekEnd is always Sunday at end-of-day', () => {
    const anchor = new Date('2026-03-11T12:00:00Z');
    const w = getReviewWindowsForOccurrence(anchor);
    expect(w.currentWeekEnd.getHours()).toBe(23);
    expect(w.currentWeekEnd.getMinutes()).toBe(59);
    expect(w.currentWeekEnd.getSeconds()).toBe(59);
  });
});
