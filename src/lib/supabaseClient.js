import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createBrowserClient } from '@supabase/ssr';

const publicSupabaseUrl = env.PUBLIC_SUPABASE_URL ?? '';
const publicSupabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let browserClient = null;

export function getSupabaseBrowserClient() {
	if (!browser) {
		throw new Error('Supabase browser client can only be used in the browser.');
	}

	if (!publicSupabaseUrl || !publicSupabaseKey) {
		throw new Error(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	}

	if (!browserClient) {
		browserClient = createBrowserClient(publicSupabaseUrl, publicSupabaseKey);
	}

	return browserClient;
}

export const supabase = new Proxy(
	{},
	{
		get(_, property) {
			const client = /** @type {Record<string | symbol, unknown>} */ (
				/** @type {unknown} */ (getSupabaseBrowserClient())
			);
			return client[property];
		}
	}
);
