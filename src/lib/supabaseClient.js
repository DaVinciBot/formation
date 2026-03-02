import { env } from '$env/dynamic/public';
import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let browserClient = null;

export function getSupabaseBrowserClient() {
	if (!browser) {
		throw new Error('Supabase browser client can only be used in the browser.');
	}

	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	const supabasePublishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	}

	if (!browserClient) {
		browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
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
