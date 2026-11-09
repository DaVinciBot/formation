import { describe, expect, it } from 'vitest';

import {
	buildActionButtons,
	buildAvailability,
	hasContent,
	isRegistrationMode,
	remainingLabel,
	resolveRemaining
} from '#lib/components/training/helpers/slotModal.js';

describe('slot modal helpers', () => {
	it('hasContent checks trimmed content', () => {
		expect(hasContent('  hello  ')).toBe(true);
		expect(hasContent('   ')).toBe(false);
		expect(hasContent(null)).toBe(false);
	});

	it('resolveRemaining handles null and negative values', () => {
		expect(resolveRemaining(undefined, 4)).toBeNull();
		expect(resolveRemaining(10, null)).toBe(10);
		expect(resolveRemaining(10, -2)).toBe(0);
	});

	it('buildAvailability builds on-site and remote availability modes', () => {
		const availability = buildAvailability({
			start: '2025-01-10T10:00:00.000Z',
			duration_hours: 2,
			on_site_seats: 10,
			on_site_remaining: 0,
			remote_seats: 5,
			remote_remaining: 2
		});

		expect(availability).toEqual([
			{ key: 'on-site', label: 'Présentiel', remaining: 0, isFull: true, shared: false },
			{ key: 'remote', label: 'Distanciel', remaining: 2, isFull: false, shared: false }
		]);
	});

	it('isRegistrationMode matches registration remote flag', () => {
		expect(
			isRegistrationMode({ remote: true, status: 'registered', to_excuse: null }, 'remote')
		).toBe(true);
		expect(
			isRegistrationMode({ remote: false, status: 'registered', to_excuse: null }, 'remote')
		).toBe(false);
		expect(isRegistrationMode(null, 'on-site')).toBe(false);
	});

	it('buildActionButtons returns empty list for hidden cards', () => {
		expect(
			buildActionButtons({
				slot: {
					start: '2025-01-10T10:00:00.000Z',
					duration_hours: 2,
					cardStatus: 'hidden'
				},
				registration: null,
				availability: []
			})
		).toEqual([]);
	});

	it('buildActionButtons returns cancel action for registered user', () => {
		const actions = buildActionButtons({
			slot: { start: '2025-01-10T10:00:00.000Z', duration_hours: 2 },
			registration: { remote: true, status: 'waitlisted', to_excuse: null },
			availability: []
		});

		expect(actions).toEqual([
			{
				key: 'remote',
				label: "Se retirer de la liste d'attente",
				variant: 'primary',
				isCancel: true
			}
		]);
	});

	it('buildActionButtons returns registration options for each mode', () => {
		const actions = buildActionButtons({
			slot: { start: '2025-01-10T10:00:00.000Z', duration_hours: 2 },
			registration: null,
			availability: [
				{ key: 'on-site', label: 'Présentiel', remaining: 3, isFull: false, shared: false },
				{ key: 'remote', label: 'Distanciel', remaining: 0, isFull: true, shared: false }
			]
		});

		expect(actions).toEqual([
			{ key: 'on-site', label: "S'inscrire (présentiel)", variant: 'primary' },
			{
				key: 'remote',
				label: "Sur liste d'attente (distanciel)",
				variant: 'secondary'
			}
		]);
	});
});

describe('places communes (formation#47)', () => {
	it('annonce un reste commun aux deux modalités', () => {
		const availability = buildAvailability({
			start: '2026-11-20T14:00:00Z',
			duration_hours: 2,
			on_site_seats: 5,
			remote_seats: 5,
			on_site_remaining: 3,
			remote_remaining: 3,
			shared_seats: 5,
			shared_remaining: 3
		});
		expect(availability.every((mode) => mode.shared)).toBe(true);
		expect(availability.map(remainingLabel)).toEqual([
			'3 places restantes, sur site ou à distance',
			'3 places restantes, sur site ou à distance'
		]);
	});

	it('garde le libellé habituel en places séparées', () => {
		expect(
			remainingLabel({
				key: 'remote',
				label: 'Distanciel',
				remaining: 1,
				isFull: false,
				shared: false
			})
		).toBe('1 place restante');
	});
});
