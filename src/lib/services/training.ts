import { supabase } from '$lib/supabaseClient';

type TrainingCategory = 'code' | 'electronics' | 'robotic' | 'other' | 'software';

export type RegistrationStatus =
	| 'waitlisted'
	| 'registered'
	| 'canceled_by_user'
	| 'canceled_by_admin';

export type SlotStatus = 'draft' | 'pending' | 'done' | 'postponed' | 'canceled';

export type TrainingListItem = {
	training_id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: TrainingCategory;
};

export type TrainingSlotListItem = {
	slot_id: number;
	training_id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: TrainingCategory;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	on_site_registered: number | null;
	remote_registered: number | null;
	on_site_waitlisted: number | null;
	remote_waitlisted: number | null;
	on_site_remaining: number | null;
	remote_remaining: number | null;
	location: string | null;
	video_conference_link: string | null;
	excusable: boolean;
	status: SlotStatus;
	trainer_id: string;
	trainer_username: string | null;
	trainer_avatar_url: string | null;
};

export type RegistrationListItem = {
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
};

export type RegistrationSummary = {
	remote: boolean;
	status: RegistrationStatus;
};

export type CreateTrainingPayload = {
	name: string;
	description?: string | null;
	prerequisites?: string | null;
	category: TrainingCategory;
};

export type CreateTrainingSlotPayload = {
	training_id: number;
	custom_name?: string | null;
	custom_description?: string | null;
	custom_prerequisites?: string | null;
	trainer_id: string;
	start: string;
	duration_hours: number;
	on_site_seats?: number | null;
	remote_seats?: number | null;
	location?: string | null;
	video_conference_link?: string | null;
	excusable: boolean;
	status: SlotStatus;
};

export type UpdateTrainingPayload = Partial<CreateTrainingPayload>;

export type UpdateTrainingSlotPayload = Partial<CreateTrainingSlotPayload>;

export type UpdateRegistrationPayload = {
	status?: RegistrationStatus;
	present?: boolean | null;
	to_excuse?: boolean | null;
	feedback?: string | null;
};

export async function getTrainingList(): Promise<TrainingListItem[]> {
	const { data, error } = await supabase.rpc('training_list');
	if (error) throw error;
	return data;
}

export async function getTrainingSlots(
	fromDate = new Date(),
	number_of_days: number | null = null
): Promise<TrainingSlotListItem[]> {
	const { data, error } = await supabase.rpc('training_slot_list', {
		p_from: fromDate.toISOString(),
		p_to:
			number_of_days === null
				? null
				: new Date(fromDate.getTime() + number_of_days * 24 * 60 * 60 * 1000).toISOString()
	});
	if (error) throw error;
	return data;
}

export async function getTrainingSlotDetail(slotId: number): Promise<TrainingSlotListItem | null> {
	const { data, error } = await supabase.rpc('training_slot_detail', {
		p_slot_id: slotId
	});
	if (error) throw error;
	return data?.[0] ?? null;
}

export async function getSlotRegistrations(slotId: number): Promise<RegistrationListItem[]> {
	const { data, error } = await supabase.rpc('registration_list', {
		p_slot_id: slotId
	});
	if (error) throw error;
	return data;
}

export async function getMyRegistrationForSlot(
	slotId: number
): Promise<RegistrationSummary | null> {
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();
	if (userError) throw userError;
	if (!user) return null;

	const { data, error } = await supabase
		.from('registration')
		.select('remote,status')
		.eq('slot_id', slotId)
		.eq('member_id', user.id)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;
	if (data.status !== 'registered' && data.status !== 'waitlisted') return null;
	return {
		remote: data.remote,
		status: data.status
	};
}

export async function registerToSlot(
	slotId: number,
	remote: boolean,
	toExcuse = false
): Promise<RegistrationStatus> {
	const { data, error } = await supabase.rpc('register_to_slot', {
		p_slot_id: slotId,
		p_remote: remote,
		p_to_excuse: toExcuse
	});
	if (error) throw error;
	return data;
}

export async function cancelRegistration(slotId: number): Promise<unknown> {
	const { data, error } = await supabase
		.from('registration')
		.update({ status: 'canceled_by_user' })
		.eq('slot_id', slotId);
	if (error) throw error;
	return data;
}

export async function updateRegistration(
	slotId: number,
	memberId: string,
	updates: UpdateRegistrationPayload
): Promise<unknown> {
	const { data, error } = await supabase
		.from('registration')
		.update(updates)
		.eq('slot_id', slotId)
		.eq('member_id', memberId);
	if (error) throw error;
	return data;
}

export async function createTraining(payload: CreateTrainingPayload): Promise<unknown> {
	const { data, error } = await supabase.from('training').insert(payload).select().single();
	if (error) throw error;
	return data;
}

export async function updateTraining(
	trainingId: number,
	updates: UpdateTrainingPayload
): Promise<unknown> {
	const { data, error } = await supabase
		.from('training')
		.update(updates)
		.eq('id', trainingId)
		.select()
		.single();
	if (error) throw error;
	return data;
}

export async function createTrainingSlot(payload: CreateTrainingSlotPayload): Promise<unknown> {
	const { data, error } = await supabase.from('training_slot').insert(payload).select().single();
	if (error) throw error;
	return data;
}

export async function updateTrainingSlot(
	slotId: number,
	updates: UpdateTrainingSlotPayload
): Promise<unknown> {
	const { data, error } = await supabase
		.from('training_slot')
		.update(updates)
		.eq('id', slotId)
		.select()
		.single();
	if (error) throw error;
	return data;
}
