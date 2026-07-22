import { writable } from 'svelte/store';

export interface CalendarFilters {
	inPerson: boolean;
	online: boolean;
}

const FILTERS_KEY = 'training_calendar_filters';
const defaultFilters: CalendarFilters = { inPerson: false, online: false };

function loadFilters(): CalendarFilters {
	if (typeof localStorage === 'undefined') {
		return { ...defaultFilters };
	}
	try {
		const raw = localStorage.getItem(FILTERS_KEY);
		return raw
			? { ...defaultFilters, ...(JSON.parse(raw) as CalendarFilters) }
			: { ...defaultFilters };
	} catch {
		return { ...defaultFilters };
	}
}

function saveFilters(filters: CalendarFilters) {
	if (typeof localStorage === 'undefined') {
		return;
	}
	try {
		localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
	} catch {
		// ignore
	}
}

export const calendarFilters = writable<CalendarFilters>(loadFilters());

if (typeof localStorage !== 'undefined') {
	calendarFilters.subscribe((value) => {
		saveFilters(value);
	});
}
