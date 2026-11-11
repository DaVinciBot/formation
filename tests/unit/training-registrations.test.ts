import { describe, expect, it } from 'vitest';

import {
	attendanceWindowStart,
	pickAttendanceSlot,
	REGISTRATION_STATUS_BADGES
} from '../../src/lib/training-registrations';

describe("statut d'une inscription (#41)", () => {
	it('ne confond pas une désinscription avec une attente', () => {
		expect(REGISTRATION_STATUS_BADGES.canceled_by_user.label).toBe('Désinscrit·e');
		expect(REGISTRATION_STATUS_BADGES.canceled_by_admin.label).toMatch(/Désinscrit/);
		expect(REGISTRATION_STATUS_BADGES.waitlisted.label).toBe("Liste d'attente");
		expect(REGISTRATION_STATUS_BADGES.canceled_by_user.color).not.toBe(
			REGISTRATION_STATUS_BADGES.waitlisted.color
		);
	});
});

describe("fenêtre de l'appel (#48)", () => {
	const now = new Date('2026-11-10T14:30:00Z');

	it('charge les sessions commencées jusqu’à deux jours après leur fin', () => {
		expect(attendanceWindowStart(now, 24).toISOString()).toBe('2026-11-07T14:30:00.000Z');
	});

	it('présélectionne la session en cours, sinon la prochaine, sinon la dernière', () => {
		const past = { start: '2026-11-09T14:00:00Z', duration_hours: 2 };
		const ongoing = { start: '2026-11-10T14:00:00Z', duration_hours: 2 };
		const next = { start: '2026-11-12T14:00:00Z', duration_hours: 2 };

		expect(pickAttendanceSlot([past, ongoing, next], now)).toBe(ongoing);
		expect(pickAttendanceSlot([past, next], now)).toBe(next);
		expect(pickAttendanceSlot([past], now)).toBe(past);
		expect(pickAttendanceSlot([], now)).toBeNull();
	});
});
