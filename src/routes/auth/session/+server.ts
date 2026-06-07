import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const session = event.locals.session;
	const user = event.locals.user;

	return json({
		session: session
			? {
					id: session.id,
					access_token: session.access_token,
					refresh_token: session.refresh_token,
					expires_at: session.expires_at,
					user_id: session.user_id
				}
			: null,
		user: user
			? {
					id: user.id,
					email: user.email ?? null,
					app_metadata: user.app_metadata,
					user_metadata: user.user_metadata
				}
			: null
	});
};
