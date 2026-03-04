import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	console.info('[formation] load /admin session', {
		hasSession: Boolean(session),
		hasUser: Boolean(user),
		userId: user?.id ?? null
	});

	if (!session || !user) {
		console.warn('[formation] load /admin unauthorized: missing session or user', {
			hasSession: Boolean(session),
			hasUser: Boolean(user)
		});
		redirect(302, '/unauthorized?redirect=/admin');
	}

	const { data, error } = await locals.supabase.rpc('has_permission', {
		p_permission: 'manage_training'
	});
	console.info('[formation] load /admin manage_training result', {
		allowed: Boolean(data),
		errorMessage: error?.message ?? null,
		errorCode: error?.code ?? null
	});

	if (error || !data) {
		console.warn('[formation] load /admin unauthorized: manage_training denied', {
			allowed: Boolean(data),
			errorMessage: error?.message ?? null,
			errorCode: error?.code ?? null
		});
		redirect(302, '/unauthorized?redirect=/admin');
	}

	return {
		isAdminAllowed: true
	};
};
