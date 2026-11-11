import { describe, expect, it } from 'vitest';

import { completeDrafts, registrationErrorMessage } from '#lib/external-registrations.js';

describe('participants externes (formation#51)', () => {
	it('ne garde que les lignes complètes, sans espaces', () => {
		expect(
			completeDrafts([
				{ first_name: ' Ada ', last_name: 'Lovelace ' },
				{ first_name: 'Alan', last_name: ' ' },
				{ first_name: '', last_name: '' }
			])
		).toEqual([{ first_name: 'Ada', last_name: 'Lovelace' }]);
	});

	it('annonce le nombre de places restantes', () => {
		expect(registrationErrorMessage({ code: 'DVB23', message: '', details: '1' })).toBe(
			'Il ne reste que 1 place sur cette session : retirez des lignes pour valider.'
		);
		expect(registrationErrorMessage({ code: 'DVB23', message: '', details: '3' })).toContain(
			'3 places'
		);
	});

	it("explique l'absence d'association et les autres refus", () => {
		expect(registrationErrorMessage({ code: 'DVB21', message: '' })).toContain('association');
		expect(registrationErrorMessage({ code: 'DVB22', message: '' })).toContain('prioritaires');
		expect(registrationErrorMessage({ code: 'XX000', message: '' })).toBe(
			"Les participants n'ont pas pu être inscrits."
		);
	});
});
