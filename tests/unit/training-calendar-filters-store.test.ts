import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.resetModules();
	window.localStorage.clear();
});

describe('training calendar filters store', () => {
	it('loads persisted values from localStorage', async () => {
		window.localStorage.setItem(
			'training_calendar_filters',
			JSON.stringify({ inPerson: true, online: false })
		);

		const { calendarFilters } = await import(
			'../../src/lib/components/training/stores/trainingCalendarFilters'
		);

		let current;
		const unsubscribe = calendarFilters.subscribe((value) => {
			current = value;
		});

		expect(current).toEqual({ inPerson: true, online: false });
		unsubscribe();
	});

	it('falls back to defaults for invalid persisted payload', async () => {
		window.localStorage.setItem('training_calendar_filters', '{broken');

		const { calendarFilters } = await import(
			'../../src/lib/components/training/stores/trainingCalendarFilters'
		);

		let current;
		const unsubscribe = calendarFilters.subscribe((value) => {
			current = value;
		});

		expect(current).toEqual({ inPerson: false, online: false });
		unsubscribe();
	});

	it('persists updates back to localStorage', async () => {
		const { calendarFilters } = await import(
			'../../src/lib/components/training/stores/trainingCalendarFilters'
		);

		calendarFilters.set({ inPerson: false, online: true });

		expect(JSON.parse(window.localStorage.getItem('training_calendar_filters') ?? '{}')).toEqual({
			inPerson: false,
			online: true
		});
	});
});
