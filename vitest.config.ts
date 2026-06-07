import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
		exclude: ['tests/e2e/**'],
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/helpers/parisTime.ts',
				'src/lib/helpers/adminForms.ts',
				'src/lib/helpers/adminTables.ts',
				'src/lib/services/training.ts',
				'src/lib/server/auth.ts',
				'src/lib/supabaseClient.ts',
				'src/lib/utils.ts',
				'src/lib/components/training/helpers/slotModal.ts',
				'src/lib/components/training/helpers/calendar.ts',
				'src/lib/components/training/stores/trainingCalendarFilters.ts'
			],
			reporter: ['text', 'html', 'lcov'],
			thresholds: {
				lines: 50,
				functions: 50,
				branches: 50,
				statements: 50
			}
		}
	}
});
