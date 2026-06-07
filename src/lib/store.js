import { writable } from 'svelte/store';

/** @type {import('svelte/store').Writable<Record<string, unknown> | null>} */
export const userdata = writable(null);

// Lightweight cross-page event bus for UI refreshes
// Usage:
//  - triggerTableRefresh('spending') from anywhere
//  - components can subscribe or use Table.svelte's refreshTopic prop
/** @type {import('svelte/store').Writable<{ topic: string | null; at: number; payload: unknown }>} */
export const tableRefresh = writable({ topic: null, at: 0, payload: null });

/**
 * @param {string} topic
 * @param {unknown} [payload]
 */
export function triggerTableRefresh(topic, payload = null) {
	tableRefresh.set({ topic, at: Date.now(), payload });
}
