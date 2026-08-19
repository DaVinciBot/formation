<script lang="ts">
	import { dev } from '$app/environment';
	import { DevRbacPanel, Topbar } from '@davincibot/components';
	import { loadUserdata } from '@davincibot/lib';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import './layout.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	$effect(() => {
		loadUserdata(data.userProfile);
	});
</script>

<svelte:head>
	<link href="/favicon.png" rel="icon" type="image/png" />
	<link href="/favicon.png" rel="apple-touch-icon" />
	<link color="#000000" href="/favicon.png" rel="mask-icon" />
	<link href="/favicon.png" rel="shortcut icon" />

	<!-- font -->
	<link href="https://fonts.googleapis.com" rel="preconnect" />
	<link crossorigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
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

	{#if dev}
		<DevRbacPanel />
	{/if}
</div>
