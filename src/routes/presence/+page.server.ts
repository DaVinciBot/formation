import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(302, 'unauthorized?redirect=/formation');
	}

	const { data: accessData, error: accessError } = await locals.supabase.rpc('has_permission', {
		p_permission: 'access_training'
	});

	if (accessError || !accessData) {
		redirect(302, 'unauthorized?redirect=/formation');
	}

	const { data: manageData, error: manageError } = await locals.supabase.rpc('has_permission', {
		p_permission: 'manage_training'
	});

	return {
		currentUserId: user.id,
		canManageTraining: !manageError && Boolean(manageData)
	};
};
