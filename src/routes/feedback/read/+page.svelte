<script lang="ts">
	import {
		getAllFeedback,
		getTrainerFeedback,
		type TrainerFeedback,
		type TrainingFeedback
	} from '$lib/training-feedback';
	import { Spinner } from '@davincibot/components';
	import { formatParisDate } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const canReadAll = $derived(data.canReadAll);

	/** Le formateur n'a pas de `team_message` : le champ est simplement absent. */
	type Item = TrainerFeedback & Partial<Pick<TrainingFeedback, 'team_message'>>;

	interface SlotGroup {
		slot_id: number;
		slot_name: string;
		slot_start: string;
		items: Item[];
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let items = $state<Item[]>([]);
	let slotFilter = $state<number | 'all'>('all');

	const slots = $derived.by(() => {
		const groups: SlotGroup[] = [];
		for (const item of items) {
			let group = groups.find((candidate) => candidate.slot_id === item.slot_id);
			if (!group) {
				group = {
					slot_id: item.slot_id,
					slot_name: item.slot_name,
					slot_start: item.slot_start,
					items: []
				};
				groups.push(group);
			}
			group.items.push(item);
		}
		return groups;
	});

	const visibleSlots = $derived(
		slotFilter === 'all' ? slots : slots.filter((group) => group.slot_id === slotFilter)
	);

	onMount(async () => {
		try {
			const client = getSupabaseBrowserClient();
			items = canReadAll ? await getAllFeedback(client) : await getTrainerFeedback(client);
		} catch {
			error = 'Impossible de charger les avis.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="mx-auto max-w-5xl px-6 pt-4 pb-16">
	<header class="mb-8">
		<h1 class="text-3xl font-bold tracking-wide">Avis de formation</h1>
		<p class="text-dark-blue-gray mt-2 text-sm">
			{#if canReadAll}
				Les retours des participant·es, créneau par créneau, avec le message adressé au pôle
				formation. Ils ne sont pas anonymes.
			{:else}
				Les avis laissés sur les formations que tu as données. Ils ne sont pas anonymes.
			{/if}
		</p>
	</header>

	{#if loading}
		<Spinner />
	{:else if error}
		<p class="text-complete text-sm">{error}</p>
	{:else if slots.length === 0}
		<p class="text-dark-blue-gray text-sm">Aucun avis pour le moment.</p>
	{:else}
		<label class="mb-6 block">
			<span class="text-dark-blue-gray mb-1 block text-xs uppercase">Formation</span>
			<select
				class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2 sm:w-auto"
				bind:value={slotFilter}
			>
				<option value="all">Toutes</option>
				{#each slots as group (group.slot_id)}
					<option value={group.slot_id}>
						{group.slot_name} · {formatParisDate(group.slot_start)}
					</option>
				{/each}
			</select>
		</label>

		<div class="flex flex-col gap-8">
			{#each visibleSlots as group (group.slot_id)}
				<section>
					<h2 class="mb-3 text-xl font-bold">
						{group.slot_name}
						<span class="text-dark-blue-gray text-sm font-normal">
							· {formatParisDate(group.slot_start)}
						</span>
					</h2>
					<ul class="flex flex-col gap-3">
						{#each group.items as item (item.id)}
							<li class="border-blue-gray/40 rounded-2xl border bg-white/5 p-4">
								<div class="mb-3 flex items-center gap-3">
									{#if item.author_avatar_url}
										<img
											class="h-9 w-9 rounded-full object-cover"
											alt=""
											src={item.author_avatar_url}
										/>
									{/if}
									<p class="text-dark-blue-gray text-xs">
										<span class="text-light-blue text-sm font-bold">
											{item.author_username ?? 'Membre inconnu'}
										</span>
										· {formatParisDate(item.created_at)}
									</p>
								</div>
								{#if item.feedback}
									<h3 class="text-dark-blue-gray mb-1 text-xs uppercase">Sur la formation</h3>
									<p class="text-light-blue/80 text-sm whitespace-pre-line">{item.feedback}</p>
								{/if}
								{#if item.team_message}
									<h3 class="text-dark-blue-gray mt-4 mb-1 text-xs uppercase">
										Pour le pôle formation
									</h3>
									<p class="text-light-blue/80 text-sm whitespace-pre-line">{item.team_message}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
