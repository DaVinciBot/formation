import { env } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

type CachedSession = {
	session: any;
	user: any;
	timestamp: number;
};

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const sessionCache = new Map<string, CachedSession>();

const getCachedSession = (cacheKey: string) => {
	const cached = sessionCache.get(cacheKey);
	if (!cached) return null;
	if (Date.now() - cached.timestamp > SESSION_CACHE_TTL_MS) {
		sessionCache.delete(cacheKey);
		return null;
	}
	return cached;
};

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	const supabasePublishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	}

	event.locals.supabase = createServerClient(
		supabaseUrl,
		supabasePublishableKey,
		{
			cookies: {
				getAll() {
					return event.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const cacheKey = session.access_token;
		if (cacheKey) {
			const cached = getCachedSession(cacheKey);
			if (cached) {
				return { session: cached.session, user: cached.user };
			}
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			if (error?.message?.includes('session id') || error?.message?.includes("doesn't exist")) {
				try {
					await event.locals.supabase.auth.signOut();
				} catch {
					// ignore
				}
			}
			return { session: null, user: null };
		}

		if (cacheKey) {
			sessionCache.set(cacheKey, { session, user, timestamp: Date.now() });
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
