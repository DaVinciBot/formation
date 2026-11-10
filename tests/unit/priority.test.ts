import { describe, expect, it } from 'vitest';

import {
	priorityNotice,
	waitlistLabel,
	type SlotPriority
} from '#lib/components/training/helpers/priority.js';

const base: SlotPriority = {
	slot_id: 1,
	priority_groups: ['COhoma', 'DaVinciBot'],
	release_at: '2026-11-19T13:00:00Z',
	released: false,
	my_group: null,
	waitlist_position: null
};

describe('groupes prioritaires (formation#52)', () => {
	it("annonce la liste d'attente et la date de libération hors groupe", () => {
		const notice = priorityNotice(base);
		expect(notice?.groups).toBe('COhoma, DaVinciBot');
		expect(notice?.message).toContain("liste d'attente");
		expect(notice?.message).toContain('jeudi 19 novembre');
		expect(notice?.message).toContain('14:00');
	});

	it('rassure un membre prioritaire', () => {
		expect(priorityNotice({ ...base, my_group: 'COhoma' })?.message).toContain(
			'groupe prioritaire COhoma'
		);
	});

	it('se tait sans groupe ou après la libération', () => {
		expect(priorityNotice(null)).toBeNull();
		expect(priorityNotice({ ...base, priority_groups: [] })).toBeNull();
		expect(priorityNotice({ ...base, released: true })).toBeNull();
	});

	it("donne la position en liste d'attente quand elle est connue", () => {
		expect(waitlistLabel(3)).toBe("Sur liste d'attente (position 3)");
		expect(waitlistLabel(null)).toBe("Sur liste d'attente");
	});
});
