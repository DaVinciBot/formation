import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

interface DecodedJwt {
	sub: string;
	email?: string;
	app_metadata?: Record<string, unknown>;
	user_metadata?: Record<string, unknown>;
}

const assertEnv = () => {
	if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}
};

export const createAnonClient = () => {
	assertEnv();
	return createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const createUserClient = (accessToken: string) => {
	assertEnv();
	return createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		global: {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		},
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const decodeJwt = (token: string): DecodedJwt | null => {
	try {
		const payload = token.split('.')[1];
		if (!payload) {
			return null;
		}
		const decoded = Buffer.from(payload, 'base64').toString('utf8');
		const parsed: unknown = JSON.parse(decoded);
		if (typeof parsed !== 'object' || parsed === null || !('sub' in parsed)) {
			return null;
		}
		return parsed as DecodedJwt;
	} catch {
		return null;
	}
};
