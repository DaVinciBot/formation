import { buildLoginUrl, hasPermission } from '@davincibot/lib';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals, parent, url }) => {
	depends('formation:requests');

	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(302, buildLoginUrl(url.href));
	}

	const { permissions } = await parent();
	const canRequest = hasPermission({ permissions }, 'training.request.manage.self');
	const canResolve = hasPermission({ permissions }, 'training.request.manage.all');

	if (!canRequest && !canResolve) {
		redirect(302, '/unauthorized');
	}

	return {
		userId: user.id,
		canRequest,
		canResolve
	};
};
