import { expect, test } from '@playwright/test';

test('application responds on formation base path', async ({ request }) => {
	const response = await request.get('/formation');
	expect(response.status()).toBeLessThan(500);
});
