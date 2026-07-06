import { buildUserProfile, hasPermission } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { safeGetSession, supabase } = locals;
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		redirect(302, `/auth/login?redirect=${encodeURIComponent(url.href)}`);
	}

	const [canReadTraining, canManageTraining] = await Promise.all([
		hasPermission(supabase, 'training.slot.read'),
		hasPermission(supabase, 'training.slot.manage')
	]);
	const canAccessTraining = canReadTraining || canManageTraining;
	if (!canAccessTraining) {
		redirect(302, '/unauthorized');
	}

	const { userProfile, permissions } = await buildUserProfile(supabase, user);

	locals.permissions = permissions;

	return {
		session,
		user,
		userProfile,
		permissions,
		canManageTraining,
		canAccessTraining
	};
};
