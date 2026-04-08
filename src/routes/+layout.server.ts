import { buildUserProfile, hasPermission } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { safeGetSession, supabase } = locals as any;
	const { session, user } = await safeGetSession();

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
		buildUserProfile(supabase, user),
		hasPermission(supabase, 'access_training'),
		hasPermission(supabase, 'manage_training')
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
