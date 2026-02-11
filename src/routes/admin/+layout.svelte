<script lang="ts">
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let { children } = $props();
	let checkingAccess = $state(true);
	let accessError: string | null = $state(null);

	onMount(async () => {
		try {
			const { data, error } = await supabase.rpc('has_permission', {
				p_permission: 'manage_training'
			});
			if (error || !data) {
				await goto('/unauthorized?redirect=/admin');
				return;
			}
			checkingAccess = false;
		} catch (err) {
			console.error(err);
			accessError = "Impossible de verifier l'acces.";
			checkingAccess = false;
		}
	});
</script>

{#if checkingAccess}
	<div class="px-6 py-6">
		<Spinner
			divClass="h-[calc(100vh-10rem)] rounded-[26px] border border-light-blue/40 bg-dark-blue/90 p-6 text-light-blue/80 shadow-[0_18px_60px_rgba(2,10,60,0.45)]"
		>
			Chargement de l'espace admin
		</Spinner>
	</div>
{:else if accessError}
	<div class="px-6 py-6">
		<div
			class="flex h-[calc(100vh-10rem)] flex-col items-center justify-center rounded-[26px] border border-light-blue/40 bg-dark-blue/90 p-6 text-waiting shadow-[0_18px_60px_rgba(2,10,60,0.45)]"
		>
			<p class="text-sm tracking-wide">{accessError}</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
