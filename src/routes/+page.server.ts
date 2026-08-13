import { buildLoginUrl } from '@davincibot/lib';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals, url }) => {
	depends('formation:home');

	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(302, buildLoginUrl(url.href));
	}

	return {
		userId: user.id
	};
};
