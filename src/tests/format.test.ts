import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addDays,
  clampPercent,
  daysBetween,
  formatAge,
  formatDate,
  formatMonth,
  formatRelativeDays,
  localiseNumber,
  monthKey,
  parseISODate,
  startOfToday,
  toISODate,
  todayISO,
} from '../lib/format';

describe('format', () => {
  describe('parseISODate', () => {
    it('parses YYYY-MM-DD as a local date (no UTC off-by-one)', () => {
      const date = parseISODate('2024-03-05');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(2); // March
      expect(date!.getDate()).toBe(5);
    });

    it('returns null for empty or unparseable input', () => {
      expect(parseISODate('')).toBeNull();
      expect(parseISODate('not-a-date')).toBeNull();
    });
  });

  describe('daysBetween / addDays / toISODate', () => {
    it('counts whole days ignoring the time component', () => {
      const from = new Date(2024, 0, 1, 23, 0, 0);
      const to = new Date(2024, 0, 11, 1, 0, 0);
      expect(daysBetween(from, to)).toBe(10);
      expect(daysBetween(to, from)).toBe(-10);
    });

    it('rolls over month boundaries', () => {
      expect(toISODate(addDays(new Date(2024, 0, 31), 1))).toBe('2024-02-01');
      expect(toISODate(addDays(new Date(2024, 1, 29), 1))).toBe('2024-03-01'); // leap year
    });

    it('zero-pads month and day', () => {
      expect(toISODate(new Date(2024, 2, 5))).toBe('2024-03-05');
    });

    it('startOfToday strips the time and todayISO matches it', () => {
      const today = startOfToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(todayISO()).toBe(toISODate(today));
    });
  });

  describe('localiseNumber', () => {
    it('leaves digits alone for English', () => {
      expect(localiseNumber(1234, 'en')).toBe('1234');
    });

    it('converts to Bangla numerals', () => {
      expect(localiseNumber(1234, 'bn')).toBe('১২৩৪');
      expect(localiseNumber(0, 'bn')).toBe('০');
    });
  });

  describe('formatDate', () => {
    it('renders day month year in both languages', () => {
      expect(formatDate('2024-03-05', 'en')).toBe('5 March 2024');
      expect(formatDate('2024-03-05', 'bn')).toBe('৫ মার্চ ২০২৪');
    });

    it('accepts a Date as well as a string', () => {
      expect(formatDate(new Date(2024, 2, 5), 'en')).toBe('5 March 2024');
    });

    it('falls back to an em dash for invalid input', () => {
      expect(formatDate('garbage', 'en')).toBe('—');
    });
  });

  describe('formatMonth', () => {
    it('expands a YYYY-MM key', () => {
      expect(formatMonth('2024-03', 'en')).toBe('March 2024');
      expect(formatMonth('2024-03', 'bn')).toBe('মার্চ ২০২৪');
    });

    it('echoes the input when it is not a month key', () => {
      expect(formatMonth('nonsense', 'en')).toBe('nonsense');
    });
  });

  describe('monthKey', () => {
    it('groups by zero-padded year-month', () => {
      expect(monthKey(new Date(2024, 2, 5))).toBe('2024-03');
      expect(monthKey(new Date(2024, 11, 31))).toBe('2024-12');
    });
  });

  describe('clampPercent', () => {
    it('clamps to 0..100 and rounds', () => {
      expect(clampPercent(150)).toBe(100);
      expect(clampPercent(-5)).toBe(0);
      expect(clampPercent(42.6)).toBe(43);
      expect(clampPercent(Number.NaN)).toBe(0);
    });
  });

  describe('formatRelativeDays', () => {
    it('labels today, singular, plural and past', () => {
      expect(formatRelativeDays(0, 'en')).toBe('today');
      expect(formatRelativeDays(1, 'en')).toBe('1 day');
      expect(formatRelativeDays(5, 'en')).toBe('5 days');
      expect(formatRelativeDays(-3, 'en')).toBe('-3 days');
      expect(formatRelativeDays(0, 'bn')).toBe('আজ');
    });
  });

  describe('formatAge', () => {
    // Age is relative to "now", so pin the clock for deterministic assertions.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // 15 June 2024
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows days for a young infant', () => {
      expect(formatAge('2024-06-01', 'en')).toBe('14 d');
    });

    it('shows years for an older child', () => {
      expect(formatAge('2000-01-01', 'en')).toBe('24 years');
    });

    it('localises to Bangla', () => {
      expect(formatAge('2000-01-01', 'bn')).toBe('২৪ বছর');
    });

    it('returns an em dash for invalid or future dates', () => {
      expect(formatAge('nope', 'en')).toBe('—');
      expect(formatAge('2030-01-01', 'en')).toBe('—');
    });
  });
});
