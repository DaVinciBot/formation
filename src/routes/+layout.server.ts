import { buildLoginUrl } from '@davincibot/lib';
import { buildUserProfile, hasPermission } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { safeGetSession, supabase } = locals;
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		redirect(302, buildLoginUrl(url.href));
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
		// Jamais de token dans les données de page : le navigateur passe par /api/session/token.
		session: { id: session.id, expires_at: session.expires_at, user_id: session.user_id },
		user,
		userProfile,
		permissions,
		canManageTraining,
		canAccessTraining
	};
};
