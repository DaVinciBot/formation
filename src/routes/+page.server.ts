import { getWeekStart } from '$lib/components/training/helpers/calendar';
import { getTrainingSlots, type RegistrationStatus } from '$lib/services/training';
import type { PageServerLoad } from './$types';

type RegistrationStatusRow = {
	slot_id: number;
	status: RegistrationStatus;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase, user } = locals as any;
	const weekParam = url.searchParams.get('week');
	const baseDate = weekParam ? new Date(weekParam) : new Date();
	const resolvedDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

	let weekStart = getWeekStart(resolvedDate);
	if (Number.isNaN(weekStart.getTime())) {
		weekStart = getWeekStart(new Date());
	}

	const userId = user?.id ?? null;
	let errorMessage: string | null = null;
	let slots = [];
	let registrationStatuses: RegistrationStatusRow[] = [];

	try {
		slots = await getTrainingSlots(supabase, weekStart, 7);
		if (userId && slots.length > 0) {
			const slotIds = slots.map((slot) => slot.slot_id);
			const { data, error } = await supabase
				.from('registration')
				.select('slot_id,status')
				.eq('member_id', userId)
				.in('slot_id', slotIds);
			if (error) throw error;
			registrationStatuses = (data ?? []).filter(
				(item: RegistrationStatusRow) =>
					item.status === 'registered' || item.status === 'waitlisted'
			);
		}
	} catch (err) {
		console.error(err);
		slots = [];
		registrationStatuses = [];
		errorMessage = 'Impossible de charger le calendrier pour cette semaine.';
	}

	return {
		slots,
		registrationStatuses,
		weekStart: weekStart.toISOString(),
		userId,
		errorMessage
	};
};
