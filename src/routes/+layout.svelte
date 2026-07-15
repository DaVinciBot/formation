<script lang="ts">
	import { resolve } from '$app/paths';
	import Topbar from '$lib/components/share/Topbar.svelte';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import { loadUserdata } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import './layout.css';

	interface SessionPayload {
		session: {
			access_token: string;
			refresh_token: string;
		} | null;
	}

	function isSessionPayload(value: unknown): value is SessionPayload {
		return (
			typeof value === 'object' &&
			value !== null &&
			'session' in value &&
			(value.session === null ||
				(typeof value.session === 'object' &&
					'access_token' in value.session &&
					'refresh_token' in value.session &&
					typeof value.session.access_token === 'string' &&
					typeof value.session.refresh_token === 'string'))
		);
	}

	const { data, children }: { data: LayoutData; children: Snippet } = $props();

	$effect(() => {
		loadUserdata(data.userProfile);
	});

	onMount(async () => {
		try {
			const supabaseClient = getSupabaseBrowserClient();
			const serverSession = data.session;
			if (serverSession.access_token && serverSession.refresh_token) {
				await supabaseClient.auth.setSession({
					access_token: serverSession.access_token,
					refresh_token: serverSession.refresh_token
				});
				return;
			}

			const { data: current, error } = await supabaseClient.auth.getSession();
			if (error) {
				await supabaseClient.auth.signOut({ scope: 'local' });
			}
			if (current.session?.access_token) {
				return;
			}
			const response = await fetch(resolve('/auth/session'));
			if (!response.ok) {
				return;
			}
			const payload: unknown = await response.json();
			const session = isSessionPayload(payload) ? payload.session : null;
			if (session?.access_token && session.refresh_token) {
				await supabaseClient.auth.setSession({
					access_token: session.access_token,
					refresh_token: session.refresh_token
				});
			} else {
				await supabaseClient.auth.signOut({ scope: 'local' });
			}
		} catch {
			// Keep rendering even if browser session sync fails.
		}
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<link rel="apple-touch-icon" href="/favicon.png" />
	<link rel="mask-icon" href="/favicon.png" color="#000000" />
	<link rel="shortcut icon" href="/favicon.png" />

	<!-- font -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="bg-dark-blue min-h-screen min-w-screen font-['Almarai'] text-white antialiased">
	<Topbar loginRedirect="/formation" />
	<div class="pt-20">
		{@render children()}
	</div>
</div>
