import { buildLoginUrl, hasPermission } from '@davincibot/lib';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals, parent, url }) => {
	depends('formation:feedback-read');

	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(302, buildLoginUrl(url.href), { external: true });
	}

	const { permissions, isTrainer } = await parent();
	const canReadAll = hasPermission({ permissions }, 'training.feedback.read');

	if (!canReadAll && !isTrainer) {
		redirect(302, '/unauthorized');
	}

	return { canReadAll };
};
