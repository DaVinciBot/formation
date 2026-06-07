import { describe, expect, it, vi } from 'vitest';

import {
	filterSlotsByFormat,
	getCalendarDays,
	getWeekNumber,
	getWeekStart,
	groupSlotsByDay,
	isInPersonSlot,
	isOnlineSlot,
	toDateKey
} from '../../src/lib/components/training/helpers/calendar';

describe('training calendar helpers', () => {
	it('toDateKey returns paris date key', () => {
		expect(toDateKey(new Date('2025-01-10T12:00:00.000Z'))).toBe('2025-01-10');
	});

	it('getWeekStart returns monday date for a mid-week date', () => {
		const weekStart = getWeekStart(new Date('2025-01-15T12:00:00.000Z'));
		expect(toDateKey(weekStart)).toBe('2025-01-13');
	});

	it('getWeekNumber computes ISO week number', () => {
		expect(getWeekNumber(new Date('2025-01-02T12:00:00.000Z'))).toBe(1);
		expect(Number.isNaN(getWeekNumber(new Date('invalid')))).toBe(true);
	});

	it('getCalendarDays returns 6 days and marks today', () => {
		const today = new Date('2025-01-13T12:00:00.000Z');
		vi.useFakeTimers();
		vi.setSystemTime(today);

		const days = getCalendarDays(new Date('2025-01-13T00:00:00.000Z'));
		expect(days).toHaveLength(6);
		expect(days[0]?.key).toBe('2025-01-13');
		expect(days[0]?.isToday).toBe(true);

		vi.useRealTimers();
	});

	it('format filters identify in-person and online slots', () => {
		const inPersonSlot = { start: '2025-01-10T10:00:00.000Z', on_site_seats: 5, remote_seats: 0 };
		const onlineSlot = { start: '2025-01-10T10:00:00.000Z', on_site_seats: 0, remote_remaining: 2 };

		expect(isInPersonSlot(inPersonSlot)).toBe(true);
		expect(isOnlineSlot(inPersonSlot)).toBe(false);
		expect(isInPersonSlot(onlineSlot)).toBe(false);
		expect(isOnlineSlot(onlineSlot)).toBe(true);

		expect(
			filterSlotsByFormat([inPersonSlot, onlineSlot], { inPerson: true, online: false })
		).toEqual([inPersonSlot]);
		expect(
			filterSlotsByFormat([inPersonSlot, onlineSlot], { inPerson: false, online: true })
		).toEqual([onlineSlot]);
	});

	it('groupSlotsByDay buckets slots and ignores invalid dates', () => {
		const grouped = groupSlotsByDay([
			{ id: 1, start: '2025-01-13T10:00:00.000Z' },
			{ id: 2, start: '2025-01-13T18:00:00.000Z' },
			{ id: 3, start: '2025-01-14T10:00:00.000Z' },
			{ id: 4, start: 'invalid-date' }
		] as any);

		expect(grouped.get('2025-01-13')).toHaveLength(2);
		expect(grouped.get('2025-01-14')).toHaveLength(1);
		expect(grouped.has('')).toBe(false);
	});
});
