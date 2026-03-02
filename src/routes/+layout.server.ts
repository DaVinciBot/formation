import { buildUserProfile, hasPermission } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!user || !session) {
		return {
			session: null,
			user: null,
			userProfile: null,
			permissions: [],
			canManageTraining: false,
			canAccessTraining: false
		};
	}

	const [{ userProfile, permissions }, canAccessTraining, canManageTraining] = await Promise.all([
		buildUserProfile(locals.supabase, user),
		hasPermission(locals.supabase, 'access_training'),
		hasPermission(locals.supabase, 'manage_training')
	]);

	return {
		session,
		user,
		userProfile,
		permissions,
		canManageTraining,
		canAccessTraining
	};
};