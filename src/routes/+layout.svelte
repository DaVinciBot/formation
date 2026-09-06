<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { DevRbacPanel, Topbar } from '@davincibot/components';
	import { hasAnyPermission, loadUserdata } from '@davincibot/lib';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import './layout.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const canSeeRequests = $derived(
		hasAnyPermission(data.permissions, [
			'training.request.manage.self',
			'training.request.manage.all'
		])
	);

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
	<nav class="border-blue-gray/30 flex gap-4 border-b px-6 pt-20 pb-3 text-sm">
		<a
			class={page.url.pathname === resolve('/')
				? 'text-dark-light-blue font-bold'
				: 'text-dark-blue-gray'}
			href={resolve('/')}
		>
			Calendrier
		</a>
		{#if canSeeRequests}
			<a
				class={page.url.pathname === resolve('/requests')
					? 'text-dark-light-blue font-bold'
					: 'text-dark-blue-gray'}
				href={resolve('/requests')}
			>
				Demandes de formation
			</a>
		{/if}
	</nav>
	{@render children()}

	<DevRbacPanel />
</div>
