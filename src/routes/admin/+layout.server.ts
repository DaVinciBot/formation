import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(302, `/auth/login?redirect=${encodeURIComponent(url.href)}`);
	}

	const { data, error } = await locals.supabase.rpc('has_permission', {
		p_permission: 'manage_training'
	});

	if (error || !data) {
		redirect(302, `/unauthorized?redirect=${encodeURIComponent(url.href)}`);
	}

	return {
		isAdminAllowed: true
	};
};
