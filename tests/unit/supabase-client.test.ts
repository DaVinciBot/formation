import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
});

async function loadModule({
	browser,
	url,
	key,
	client
}: {
	browser: boolean;
	url: string;
	key: string;
	client: object;
}) {
	vi.resetModules();

	vi.doMock('$app/environment', () => ({ browser }));
	vi.doMock('$env/dynamic/public', () => ({
		env: {
			PUBLIC_SUPABASE_URL: url,
			PUBLIC_SUPABASE_PUBLISHABLE_KEY: key
		}
	}));

	const createClientCalls: unknown[][] = [];
	const createClient = vi.fn((...args: unknown[]) => {
		createClientCalls.push(args);
		return client;
	});
	vi.doMock('@supabase/supabase-js', () => ({ createClient }));

	const mod = await import('../../src/lib/supabaseClient');
	return { mod, createClient, createClientCalls };
}

describe('supabase browser client', () => {
	it('throws when client is requested outside browser', async () => {
		const { mod } = await loadModule({
			browser: false,
			url: 'https://example.supabase.co',
			key: 'pk-test',
			client: {}
		});

		expect(() => mod.getSupabaseBrowserClient()).toThrow(
			'Supabase browser client can only be used in the browser.'
		);
	});

	it('throws when public env variables are missing', async () => {
		const { mod } = await loadModule({ browser: true, url: '', key: '', client: {} });

		expect(() => mod.getSupabaseBrowserClient()).toThrow(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables.'
		);
	});

	it('creates a singleton client in accessToken mode and forwards proxy calls', async () => {
		const client = { from: vi.fn(() => 'from-result') };
		const { mod, createClient, createClientCalls } = await loadModule({
			browser: true,
			url: 'https://example.supabase.co',
			key: 'pk-test',
			client
		});

		const first = mod.getSupabaseBrowserClient();
		const second = mod.getSupabaseBrowserClient();

		expect(first).toBe(client);
		expect(second).toBe(client);
		expect(createClient).toHaveBeenCalledTimes(1);

		const options = createClientCalls[0]?.[2] as { accessToken?: unknown } | undefined;
		expect(typeof options?.accessToken).toBe('function');

		const legacySupabase = (mod as unknown as Record<string, unknown>).supabase as {
			from: (table: string) => string;
		};
		expect(legacySupabase.from('training')).toBe('from-result');
		expect(client.from).toHaveBeenCalledWith('training');
	});
});
