import { describe, expect, it } from 'vitest';
import {
  formatMessageDateLabel,
  formatMessageTime,
  getCalendarDateKey,
  groupMessagesByDate,
} from '../chatMessageDates';

describe('chatMessageDates', () => {
  const referenceDate = new Date('2026-06-10T12:00:00');

  describe('getCalendarDateKey', () => {
    it('returns YYYY-MM-DD for a message timestamp', () => {
      expect(getCalendarDateKey('2026-06-10T09:30:00.000Z')).toBe('2026-06-10');
    });
  });

  describe('formatMessageDateLabel', () => {
    it('returns Today for messages on the reference date', () => {
      expect(formatMessageDateLabel('2026-06-10T08:00:00', referenceDate)).toBe('Today');
    });

    it('returns Yesterday for messages one day earlier', () => {
      expect(formatMessageDateLabel('2026-06-09T08:00:00', referenceDate)).toBe('Yesterday');
    });

    it('returns weekday name for messages within the past week', () => {
      expect(formatMessageDateLabel('2026-06-06T08:00:00', referenceDate)).toBe('Saturday');
    });

    it('returns month and day for older messages in the same year', () => {
      expect(formatMessageDateLabel('2026-05-01T08:00:00', referenceDate)).toBe('May 1');
    });
  });

  describe('formatMessageTime', () => {
    it('returns a localized time string', () => {
      const time = formatMessageTime('2026-06-10T14:30:00');
      expect(time).toMatch(/\d/);
    });
  });

  describe('groupMessagesByDate', () => {
    it('groups consecutive messages on the same day', () => {
      const groups = groupMessagesByDate(
        [
          { _id: '1', createdAt: '2026-06-09T10:00:00' },
          { _id: '2', createdAt: '2026-06-09T11:00:00' },
          { _id: '3', createdAt: '2026-06-10T09:00:00' },
        ],
        referenceDate,
      );

      expect(groups).toHaveLength(2);
      expect(groups[0].dateLabel).toBe('Yesterday');
      expect(groups[0].messages).toHaveLength(2);
      expect(groups[1].dateLabel).toBe('Today');
      expect(groups[1].messages).toHaveLength(1);
    });
  });
});
