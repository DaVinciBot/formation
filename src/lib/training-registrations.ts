import type { TrainingSlotListItem, TrainingSupabaseClient } from '@davincibot/lib';

/** Le domaine formation vit dans le schéma `formation`, pas dans `public`. */
const formation = (supabase: TrainingSupabaseClient) => supabase.schema('formation');

interface RpcResult<T> {
	data: T | null;
	error: Error | null;
}

export type RegistrationStatus =
	'waitlisted' | 'registered' | 'canceled_by_user' | 'canceled_by_admin';

export interface RegistrationListItem {
	slot_id: number;
	member_id: string;
	date_hour: string;
	remote: boolean;
	status: RegistrationStatus;
	present: boolean | null;
	to_excuse: boolean | null;
	feedback: string | null;
	member_username: string | null;
	member_avatar_url: string | null;
}

export interface RegistrationSummary {
	remote: boolean;
	status: RegistrationStatus;
	to_excuse: boolean | null;
}

interface UpdateRegistrationPayload {
	status?: RegistrationStatus;
	present?: boolean | null;
	to_excuse?: boolean | null;
	feedback?: string | null;
}

export async function getTrainingSlotDetail(
	supabase: TrainingSupabaseClient,
	slotId: number
): Promise<TrainingSlotListItem | null> {
	const { data, error } = (await formation(supabase).rpc('training_slot_detail', {
		p_slot_id: slotId
	})) as RpcResult<TrainingSlotListItem[]>;
	if (error) {
		throw error;
	}
	return data?.[0] ?? null;
}

export async function getSlotRegistrations(
	supabase: TrainingSupabaseClient,
	slotId: number
): Promise<RegistrationListItem[]> {
	const { data, error } = (await formation(supabase)
		.rpc('registration_list', {
			p_slot_id: slotId
		})
		.in('status', ['registered', 'waitlisted'])) as RpcResult<RegistrationListItem[]>;
	if (error) {
		throw error;
	}
	return data ?? [];
}

export async function getTrainerSlotRegistrations(
	supabase: TrainingSupabaseClient,
	slotId: number
): Promise<RegistrationListItem[]> {
	const { data, error } = (await formation(supabase)
		.from('trainer_registration_view')
		.select(
			'slot_id,member_id,date_hour,remote,status,present,to_excuse,feedback,member_username,member_avatar_url'
		)
		.eq('slot_id', slotId)
		.in('status', ['registered', 'waitlisted'])
		.order('date_hour', { ascending: true })) as RpcResult<RegistrationListItem[]>;
	if (error) {
		throw error;
	}
	return data ?? [];
}

export async function getMyRegistrationForSlot(
	supabase: TrainingSupabaseClient,
	slotId: number,
	userId: string | null
): Promise<RegistrationSummary | null> {
	if (!userId) {
		return null;
	}

	const { data, error } = (await formation(supabase)
		.from('registration')
		.select('remote,status,to_excuse')
		.eq('slot_id', slotId)
		.eq('member_id', userId)
		.maybeSingle()) as RpcResult<{ remote: boolean; status: string; to_excuse: boolean | null }>;
	if (error) {
		throw error;
	}
	if (!data) {
		return null;
	}
	if (data.status !== 'registered' && data.status !== 'waitlisted') {
		return null;
	}
	return {
		remote: data.remote,
		status: data.status as RegistrationStatus,
		to_excuse: data.to_excuse
	};
}

export async function registerToSlot(
	supabase: TrainingSupabaseClient,
	slotId: number,
	remote: boolean,
	toExcuse = false
): Promise<RegistrationStatus> {
	const { data, error } = (await formation(supabase).rpc('register_to_slot', {
		p_slot_id: slotId,
		p_remote: remote,
		p_to_excuse: toExcuse
	})) as RpcResult<RegistrationStatus>;
	if (error) {
		throw error;
	}
	return data ?? 'waitlisted';
}

export async function cancelRegistration(
	supabase: TrainingSupabaseClient,
	slotId: number
): Promise<unknown> {
	const { data, error } = (await formation(supabase).rpc('cancel_my_registration', {
		p_slot_id: slotId
	})) as RpcResult<unknown>;
	if (error) {
		throw error;
	}
	return data;
}

export async function updateMyRegistrationExcuse(
	supabase: TrainingSupabaseClient,
	slotId: number,
	toExcuse: boolean,
	userId: string | null
): Promise<unknown> {
	if (!userId) {
		throw new Error('User not authenticated');
	}

	const { data, error } = (await formation(supabase)
		.from('registration')
		.update({ to_excuse: toExcuse })
		.eq('slot_id', slotId)
		.eq('member_id', userId)) as RpcResult<unknown>;
	if (error) {
		throw error;
	}
	return data;
}

export async function updateRegistration(
	supabase: TrainingSupabaseClient,
	slotId: number,
	memberId: string,
	updates: UpdateRegistrationPayload
): Promise<unknown> {
	const { data, error } = (await formation(supabase)
		.from('registration')
		.update(updates)
		.eq('slot_id', slotId)
		.eq('member_id', memberId)) as RpcResult<unknown>;
	if (error) {
		throw error;
	}
	return data;
}

export async function updateTrainerPresence(
	supabase: TrainingSupabaseClient,
	slotId: number,
	memberId: string,
	present: boolean | null
): Promise<unknown> {
	const { data, error } = (await formation(supabase).rpc('trainer_update_presence', {
		p_slot_id: slotId,
		p_member_id: memberId,
		p_present: present ?? undefined
	})) as RpcResult<unknown>;
	if (error) {
		throw error;
	}
	return data;
}
