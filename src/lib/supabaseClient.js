import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient } from '@supabase/ssr';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let browserClient = null;

export function getSupabaseBrowserClient() {
	if (!browser) {
		throw new Error('Supabase browser client can only be used in the browser.');
	}

	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	}

	if (!browserClient) {
		browserClient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
	}

	return browserClient;
}

export const supabase = new Proxy(
	{},
	{
		get(_, property) {
			const client = getSupabaseBrowserClient();
			return client[property];
		}
	}
);
