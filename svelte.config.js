import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	prerender: {
		entries: ['/formation/presence', '/formation/admin']
	},
	kit: {
		adapter: adapter(),
		paths: {
			base: '/formation',
			relative: false
		}
	}
};

export default config;
