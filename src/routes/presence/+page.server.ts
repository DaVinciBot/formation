import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	console.info('[formation] load /presence session', {
		hasSession: Boolean(session),
		hasUser: Boolean(user),
		userId: user?.id ?? null
	});

	if (!session || !user) {
		console.warn('[formation] load /presence unauthorized: missing session or user', {
			hasSession: Boolean(session),
			hasUser: Boolean(user)
		});
		redirect(302, '/unauthorized?redirect=/formation');
	}

	const { data: accessData, error: accessError } = await locals.supabase.rpc('has_permission', {
		p_permission: 'access_training'
	});
	console.info('[formation] load /presence access_training result', {
		allowed: Boolean(accessData),
		errorMessage: accessError?.message ?? null,
		errorCode: accessError?.code ?? null
	});

	if (accessError || !accessData) {
		console.warn('[formation] load /presence unauthorized: access_training denied', {
			allowed: Boolean(accessData),
			errorMessage: accessError?.message ?? null,
			errorCode: accessError?.code ?? null
		});
		redirect(302, '/unauthorized?redirect=/formation');
	}

	const { data: manageData, error: manageError } = await locals.supabase.rpc('has_permission', {
		p_permission: 'manage_training'
	});
	console.info('[formation] load /presence manage_training result', {
		allowed: Boolean(manageData),
		errorMessage: manageError?.message ?? null,
		errorCode: manageError?.code ?? null
	});

	return {
		currentUserId: user.id,
		canManageTraining: !manageError && Boolean(manageData)
	};
};
