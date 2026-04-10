<script lang="ts">
	import Topbar from '$lib/components/share/Topbar.svelte';
	import { loadUserdata } from '$lib/utils';
	import './layout.css';

	let { data, children } = $props();

	$effect(() => {
		void loadUserdata(data.userProfile);
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
