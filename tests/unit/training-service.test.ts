import { describe, expect, it, vi, type Mock } from 'vitest';

import {
	cancelRegistration,
	createTraining,
	createTrainingSlot,
	getMyRegistrationForSlot,
	getSlotRegistrations,
	getTrainerSlotRegistrations,
	getTrainingList,
	getTrainingSlotDetail,
	getTrainingSlots,
	registerToSlot,
	updateMyRegistrationExcuse,
	updateRegistration,
	updateTrainerPresence,
	updateTraining,
	updateTrainingSlot,
	type CreateTrainingPayload,
	type CreateTrainingSlotPayload,
	type TrainingSupabaseClient
} from '@davincibot/lib';

interface ThenableChain<T> extends PromiseLike<T> {
	select: Mock<() => ThenableChain<T>>;
	eq: Mock<() => ThenableChain<T>>;
	in: Mock<() => ThenableChain<T>>;
	order: Mock<() => ThenableChain<T>>;
	update: Mock<() => ThenableChain<T>>;
	insert: Mock<() => ThenableChain<T>>;
	single: Mock<() => Promise<T>>;
	maybeSingle: Mock<() => Promise<T>>;
}

function createThenableChain<T>(result: T): ThenableChain<T> {
	const chain = {
		select: vi.fn(() => chain),
		eq: vi.fn(() => chain),
		in: vi.fn(() => chain),
		order: vi.fn(() => chain),
		update: vi.fn(() => chain),
		insert: vi.fn(() => chain),
		single: vi.fn(() => Promise.resolve(result)),
		maybeSingle: vi.fn(() => Promise.resolve(result)),
		then<TResult1 = T, TResult2 = never>(
			onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
			onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
		) {
			return Promise.resolve(result).then(onfulfilled, onrejected);
		}
	};

	return chain;
}

function asTrainingClient(client: unknown): TrainingSupabaseClient {
	return client as TrainingSupabaseClient;
}

describe('training service', () => {
	it('loads training list and slots through rpc', async () => {
		const supabase = {
			rpc: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ training_id: 1, name: 'Svelte' }], error: null })
				.mockResolvedValueOnce({ data: [{ slot_id: 2 }], error: null })
		};

		const list = await getTrainingList(asTrainingClient(supabase));
		const slots = await getTrainingSlots(
			asTrainingClient(supabase),
			new Date('2025-01-01T00:00:00.000Z'),
			7
		);

		expect(list).toEqual([{ training_id: 1, name: 'Svelte' }]);
		expect(slots).toEqual([{ slot_id: 2 }]);
		expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'training_list');
		expect(supabase.rpc).toHaveBeenNthCalledWith(
			2,
			'training_slot_list',
			expect.objectContaining({
				p_from: '2025-01-01T00:00:00.000Z',
				p_to: '2025-01-08T00:00:00.000Z'
			})
		);
	});

	it('loads training slot detail and returns null when empty', async () => {
		const supabase = {
			rpc: vi
				.fn()
				.mockResolvedValueOnce({ data: [{ slot_id: 10 }], error: null })
				.mockResolvedValueOnce({ data: [], error: null })
		};

		expect(await getTrainingSlotDetail(asTrainingClient(supabase), 10)).toEqual({ slot_id: 10 });
		expect(await getTrainingSlotDetail(asTrainingClient(supabase), 11)).toBeNull();
	});

	it('loads registrations and trainer registrations through chained filters', async () => {
		const rpcChain = createThenableChain({
			data: [{ member_id: 'u-1' }],
			error: null
		});
		const trainerChain = createThenableChain({ data: [{ member_id: 'u-2' }], error: null });

		const supabase = {
			rpc: vi.fn(() => rpcChain),
			from: vi.fn(() => trainerChain)
		};

		expect(await getSlotRegistrations(asTrainingClient(supabase), 99)).toEqual([
			{ member_id: 'u-1' }
		]);
		expect(rpcChain.in).toHaveBeenCalledWith('status', ['registered', 'waitlisted']);

		expect(await getTrainerSlotRegistrations(asTrainingClient(supabase), 99)).toEqual([
			{ member_id: 'u-2' }
		]);
		expect(trainerChain.eq).toHaveBeenCalledWith('slot_id', 99);
		expect(trainerChain.in).toHaveBeenCalledWith('status', ['registered', 'waitlisted']);
		expect(trainerChain.order).toHaveBeenCalledWith('date_hour', { ascending: true });
	});

	it('resolves current user registration state from maybeSingle query', async () => {
		const activeRegistrationChain = createThenableChain({
			data: { remote: true, status: 'registered', to_excuse: false },
			error: null
		});
		const inactiveRegistrationChain = createThenableChain({
			data: { remote: false, status: 'canceled_by_user', to_excuse: null },
			error: null
		});

		const supabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(activeRegistrationChain)
				.mockReturnValueOnce(inactiveRegistrationChain)
		};

		expect(await getMyRegistrationForSlot(asTrainingClient(supabase), 1, null)).toBeNull();
		expect(await getMyRegistrationForSlot(asTrainingClient(supabase), 1, 'u-1')).toEqual({
			remote: true,
			status: 'registered',
			to_excuse: false
		});
		expect(await getMyRegistrationForSlot(asTrainingClient(supabase), 1, 'u-1')).toBeNull();
	});

	it('registers and updates registration states', async () => {
		const registerSupabase = {
			rpc: vi.fn(() => Promise.resolve({ data: 'waitlisted', error: null }))
		};
		expect(await registerToSlot(asTrainingClient(registerSupabase), 3, true, true)).toBe(
			'waitlisted'
		);
		expect(registerSupabase.rpc).toHaveBeenCalledWith('register_to_slot', {
			p_slot_id: 3,
			p_remote: true,
			p_to_excuse: true
		});

		const updateChain = createThenableChain({ data: [{ ok: true }], error: null });
		const updateSupabase = {
			from: vi.fn(() => updateChain),
			rpc: vi.fn(() => Promise.resolve({ data: { ok: true }, error: null }))
		};

		expect(await cancelRegistration(asTrainingClient(updateSupabase), 3)).toEqual({ ok: true });
		expect(updateSupabase.rpc).toHaveBeenCalledWith('cancel_my_registration', {
			p_slot_id: 3
		});
		expect(
			await updateRegistration(asTrainingClient(updateSupabase), 3, 'u-1', { status: 'registered' })
		).toEqual([{ ok: true }]);
		expect(
			await updateMyRegistrationExcuse(asTrainingClient(updateSupabase), 3, true, 'u-1')
		).toEqual([{ ok: true }]);
		expect(await updateTrainerPresence(asTrainingClient(updateSupabase), 3, 'u-1', true)).toEqual({
			ok: true
		});

		await expect(
			updateMyRegistrationExcuse(asTrainingClient(updateSupabase), 3, true, null)
		).rejects.toThrow('User not authenticated');
	});

	it('creates and updates trainings and slots via insert/update chains', async () => {
		const chain = createThenableChain({ data: { id: 1 }, error: null });
		const supabase = {
			from: vi.fn(() => chain)
		};

		expect(
			await createTraining(asTrainingClient(supabase), {
				name: 'Svelte',
				category: 'software'
			} satisfies CreateTrainingPayload)
		).toEqual({ id: 1 });
		expect(await updateTraining(asTrainingClient(supabase), 1, { name: 'Svelte 2' })).toEqual({
			id: 1
		});
		expect(
			await createTrainingSlot(asTrainingClient(supabase), {
				training_id: 1,
				trainer_id: 'u-1',
				start: '2025-01-10T10:00:00.000Z',
				duration_hours: 2,
				excusable: true,
				status: 'draft'
			} satisfies CreateTrainingSlotPayload)
		).toEqual({ id: 1 });
		expect(await updateTrainingSlot(asTrainingClient(supabase), 1, { status: 'pending' })).toEqual({
			id: 1
		});
	});

	it('throws when rpc and query calls return errors', async () => {
		const rpcFailSupabase = {
			rpc: vi.fn(() => Promise.resolve({ data: null, error: new Error('rpc failed') }))
		};

		await expect(getTrainingList(asTrainingClient(rpcFailSupabase))).rejects.toThrow('rpc failed');

		const cancelFailSupabase = {
			rpc: vi.fn(() => Promise.resolve({ data: null, error: new Error('rpc failed') }))
		};

		await expect(cancelRegistration(asTrainingClient(cancelFailSupabase), 1)).rejects.toThrow(
			'rpc failed'
		);

		const queryFailChain = createThenableChain({ data: null, error: new Error('query failed') });
		const queryFailSupabase = {
			from: vi.fn(() => queryFailChain)
		};

		await expect(
			updateRegistration(asTrainingClient(queryFailSupabase), 1, 'u-1', { status: 'registered' })
		).rejects.toThrow('query failed');
	});
});
