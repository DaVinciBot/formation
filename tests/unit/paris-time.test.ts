import { describe, expect, it } from 'vitest';

import {
	formatParisDate,
	formatParisDatetimeLocal,
	formatParisTimeRange,
	getParisDateParts,
	parseParisDatetimeLocal
} from '@davincibot/lib';

describe('paris time helpers', () => {
	it('formats a valid ISO date in dd/mm/yyyy', () => {
		expect(formatParisDate('2025-01-10T12:00:00.000Z')).toBe('10/01/2025');
	});

	it('returns placeholder for invalid dates', () => {
		expect(formatParisDate('invalid-date')).toBe('--/--/----');
	});

	it('formats a time range', () => {
		const formatted = formatParisTimeRange('2025-01-10T12:00:00.000Z', 1.5);
		expect(formatted).toContain(' - ');
	});

	it('parses local paris datetime to ISO string', () => {
		const parsed = parseParisDatetimeLocal('2025-01-10T10:30');
		expect(parsed).toMatch(/2025-01-10T/);
	});

	it('returns empty string for invalid local datetime', () => {
		expect(parseParisDatetimeLocal('')).toBe('');
		expect(formatParisDatetimeLocal('invalid-date')).toBe('');
	});

	it('returns placeholders when range input is invalid', () => {
		expect(formatParisTimeRange('invalid-date', 2)).toBe('--h-- - --h--');
	});

	it('returns null date parts for invalid input', () => {
		expect(getParisDateParts('invalid-date')).toBeNull();
	});
});
