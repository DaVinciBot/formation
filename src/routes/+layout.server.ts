import { buildUserProfile, hasPermission } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { safeGetSession, supabase } = locals as any;
	const { session, user } = await safeGetSession();

	if ((!user || !session) && !import.meta.env?.DEV) {
		redirect(302, `/auth/login?redirect=${encodeURIComponent(url.href)}`);
	}

	const canAccessTraining = await hasPermission(supabase, 'view_trainings');
	if (!canAccessTraining) {
		redirect(302, `/unauthorized?redirect=${encodeURIComponent(url.href)}`);
	}

	const [{ userProfile, permissions }, canManageTraining] = await Promise.all([
		buildUserProfile(supabase, user),
		hasPermission(supabase, 'edit_trainings')
	]);

	(locals as any).permissions = permissions;

	return {
		session,
		user,
		userProfile,
		permissions,
		canManageTraining,
		canAccessTraining
	};
};
