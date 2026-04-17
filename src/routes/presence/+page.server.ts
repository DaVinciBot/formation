import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		if (!import.meta.env?.DEV) {
			redirect(302, `/auth/login?redirect=${encodeURIComponent(url.href)}`);
		}

		return {
			currentUserId: null
		};
	}

	return {
		currentUserId: user.id
	};
};
