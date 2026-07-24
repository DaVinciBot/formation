import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Ce module lit `browser` ($app/environment) et `env` ($env/dynamic/public) au
// niveau du module. On pilote ces valeurs via un état mutable et un vi.mock de
// fichier (qui prend le pas sur le stub global de tests/vitest-setup.ts), puis
// on réimporte le module après vi.resetModules() pour chaque scénario.
const state = vi.hoisted(() => {
	const env: Record<string, string | undefined> = {};
	const createClient: (...args: unknown[]) => unknown = vi.fn();
	return {
		browser: true,
		env,
		createClient,
		createClientCalls: [] as unknown[][]
	};
});

vi.mock('$app/environment', () => ({
	get browser() {
		return state.browser;
	}
}));
vi.mock('$env/dynamic/public', () => ({
	get env() {
		return state.env;
	}
}));
vi.mock('@supabase/supabase-js', () => ({
	createClient: (...args: unknown[]): unknown => state.createClient(...args)
}));

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
	state.browser = browser;
	state.env = { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
	state.createClientCalls = [];
	state.createClient = vi.fn((...args: unknown[]) => {
		state.createClientCalls.push(args);
		return client;
	});

	const mod = await import('@davincibot/lib/supabase');
	return { mod, createClient: state.createClient, createClientCalls: state.createClientCalls };
}

beforeEach(() => {
	state.browser = true;
	state.env = {};
});

afterEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
});

// Chaque cas fait un vi.resetModules() + import dynamique du vrai module
// @davincibot/lib/supabase (qui tire @supabase/ssr et @supabase/supabase-js) :
// la première transformation à froid dépasse le timeout par défaut de 5 s sur
// une machine lente. On élargit donc le timeout de ce fichier.
describe('supabase browser client', () => {
	it('throws when client is requested outside browser', async () => {
		const { mod } = await loadModule({
			browser: false,
			url: 'https://example.supabase.co',
			key: 'pk-test',
			client: {}
		});

		expect(() => mod.getSupabaseBrowserClient()).toThrow(
			'Use event.locals.supabase on the server.'
		);
	}, 30000);

	it('throws when public env variables are missing', async () => {
		const { mod } = await loadModule({ browser: true, url: '', key: '', client: {} });

		expect(() => mod.getSupabaseBrowserClient()).toThrow(
			'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY'
		);
	}, 30000);

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
	}, 30000);
});
