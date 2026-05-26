<script lang="ts">
	import Topbar from '$lib/components/share/Topbar.svelte';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import { loadUserdata } from '$lib/utils';
	import { onMount } from 'svelte';
	import './layout.css';

	let { data, children } = $props();

	$effect(() => {
		void loadUserdata(data.userProfile);
	});

	onMount(async () => {
		try {
			const supabaseClient = getSupabaseBrowserClient();
			const serverSession = data?.session;
			if (serverSession?.access_token && serverSession?.refresh_token) {
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
			if (current?.session?.access_token) return;
			const response = await fetch('/auth/session');
			if (!response.ok) return;
			const payload = await response.json();
			const session = payload?.session;
			if (session?.access_token && session?.refresh_token) {
				await supabaseClient.auth.setSession({
					access_token: session.access_token,
					refresh_token: session.refresh_token
				});
			} else {
				await supabaseClient.auth.signOut({ scope: 'local' });
			}
		} catch (error) {
			console.error('[auth] unable to sync session', error);
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

<div class="min-h-screen min-w-screen bg-dark-blue font-['Almarai'] text-white antialiased">
	<Topbar loginRedirect="/formation" />
	<div class="pt-20">
		{@render children()}
	</div>
</div>
