import { getParisDateKey, getParisDateParts, getParisMidnightUtcFromParts } from '@davincibot/lib';

export const weekdays: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export interface CalendarSlotLike {
	start: Date | string;
	on_site_seats?: number | null;
	on_site_remaining?: number | null;
	remote_seats?: number | null;
	remote_remaining?: number | null;
}

export function toDateKey(date: Date) {
	return getParisDateKey(date);
}

export function getWeekStart(date: Date) {
	const parts = getParisDateParts(date);
	if (!parts) {
		return new Date(NaN);
	}
	const baseUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
	const dayIndex = (new Date(baseUtc).getUTCDay() + 6) % 7;
	const weekStartUtc = new Date(baseUtc - dayIndex * 24 * 60 * 60 * 1000);
	return (
		getParisMidnightUtcFromParts({
			year: weekStartUtc.getUTCFullYear(),
			month: weekStartUtc.getUTCMonth() + 1,
			day: weekStartUtc.getUTCDate()
		}) ?? new Date(NaN)
	);
}

export function getWeekNumber(date: Date) {
	const parts = getParisDateParts(date);
	if (!parts) {
		return NaN;
	}
	const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
	const dayNr = (target.getUTCDay() + 6) % 7;
	target.setUTCDate(target.getUTCDate() - dayNr + 3);
	const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
	const diff = target.getTime() - firstThursday.getTime();
	return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

export function getCalendarDays(weekStart: Date) {
	return Array.from({ length: 6 }, (_, index) => {
		const date = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
		const key = toDateKey(date);
		return {
			date,
			key,
			isToday: key === toDateKey(new Date())
		};
	});
}

export function isInPersonSlot(slot: CalendarSlotLike) {
	return (slot.on_site_seats ?? 0) > 0 || (slot.on_site_remaining ?? 0) > 0;
}

export function isOnlineSlot(slot: CalendarSlotLike) {
	return (slot.remote_seats ?? 0) > 0 || (slot.remote_remaining ?? 0) > 0;
}

export function filterSlotsByFormat<T extends CalendarSlotLike>(
	slots: T[],
	filters: { inPerson: boolean; online: boolean }
) {
	const filterByFormat = filters.inPerson || filters.online;
	return slots.filter((slot) => {
		const matchesFormat =
			!filterByFormat ||
			(filters.inPerson && isInPersonSlot(slot)) ||
			(filters.online && isOnlineSlot(slot));
		return matchesFormat;
	});
}

export function groupSlotsByDay<T extends CalendarSlotLike>(slots: T[]) {
	const map = new Map<string, T[]>();
	for (const slot of slots) {
		const date = new Date(slot.start);
		if (Number.isNaN(date.getTime())) {
			continue;
		}
		const key = toDateKey(date);
		const existing = map.get(key) ?? [];
		existing.push(slot);
		map.set(key, existing);
	}
	return map;
}
