<script lang="ts">
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';
	import { getTrainingSlots } from '$lib/services/training';
	import { onMount } from 'svelte';

	let slots: CalendarSlot[] = [];
	let loading = false;
	let error: string | null = null;

	function getWeekStart(date: Date) {
		const dayIndex = (date.getDay() + 6) % 7;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayIndex);
	}

	async function loadWeek(date: Date) {
		const weekStart = getWeekStart(date);
		loading = true;
		error = null;
		try {
			slots = await getTrainingSlots(weekStart, 7);
		} catch (err) {
			console.error(err);
			slots = [];
			error = 'Impossible de charger le calendrier pour cette semaine.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadWeek(new Date());
	});
</script>

<div class="space-y-4 px-6 py-6">
	{#if loading}
		<p class="text-sm text-light-blue/80">Chargement du calendrier...</p>
	{/if}
	{#if error}
		<p class="text-sm text-waiting">{error}</p>
	{/if}
	<div class="h-[calc(100vh-8rem)]">
		<Calendar {slots} onWeekChange={loadWeek} />
	</div>
</div>
