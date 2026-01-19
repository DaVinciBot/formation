<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/share/Topbar.svelte';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<!-- font -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="bg-dark-blue min-h-screen min-w-screen font-['Almarai'] text-white antialiased ">
	<Topbar />
	<div class="pt-20">
		{@render children()}
	</div>
</div>
