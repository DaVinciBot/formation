<script lang="ts">
	import {
		canGiveFeedback,
		createFeedback,
		getMyFeedback,
		type TrainingFeedback
	} from '#lib/training-feedback.js';
	import { getTrainingSlotDetail } from '#lib/training-registrations.js';
	import { CtaButton, Spinner } from '@davincibot/components';
	import { formatParisDate, type TrainingSlotListItem } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const userId = $derived(data.userId);
	const slotId = $derived(data.slotId);

	let client: ReturnType<typeof getSupabaseBrowserClient> | null = null;

	function getClient() {
		client ??= getSupabaseBrowserClient();
		return client;
	}

	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let slot = $state<TrainingSlotListItem | null>(null);
	let existing = $state<TrainingFeedback | null>(null);
	let allowed = $state(false);

	let feedback = $state('');
	let teamMessage = $state('');
	let submitting = $state(false);
	let formError = $state<string | null>(null);

	async function load() {
		if (slotId === null) {
			loading = false;
			return;
		}
		try {
			[slot, existing, allowed] = await Promise.all([
				getTrainingSlotDetail(getClient(), slotId),
				getMyFeedback(getClient(), slotId, userId),
				canGiveFeedback(getClient(), slotId)
			]);
		} catch {
			loadError = 'Impossible de charger cette formation.';
		} finally {
			loading = false;
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = null;

		const currentSlotId = slotId;
		if (currentSlotId === null) {
			return;
		}

		const trimmedFeedback = feedback.trim();
		const trimmedMessage = teamMessage.trim();
		if (trimmedFeedback === '' && trimmedMessage === '') {
			formError = 'Remplis au moins un des deux champs.';
			return;
		}

		submitting = true;
		try {
			await createFeedback(getClient(), {
				slot_id: currentSlotId,
				feedback: trimmedFeedback === '' ? null : trimmedFeedback,
				team_message: trimmedMessage === '' ? null : trimmedMessage
			});
			existing = await getMyFeedback(getClient(), currentSlotId, userId);
		} catch {
			formError = "Impossible d'envoyer ton avis.";
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<div class="mx-auto max-w-3xl px-6 pt-4 pb-16">
	<header class="mb-8">
		<h1 class="text-3xl font-bold tracking-wide">Ton avis sur la formation</h1>
		{#if slot}
			<p class="text-dark-blue-gray mt-2 text-sm">
				{slot.name} · {formatParisDate(slot.start)}
			</p>
		{/if}
	</header>

	{#if loading}
		<Spinner />
	{:else if slotId === null}
		<p class="text-dark-blue-gray text-sm">
			Ce lien est incomplet : ouvre-le depuis le mail que tu as reçu.
		</p>
	{:else if loadError}
		<p class="text-complete text-sm">{loadError}</p>
	{:else if existing}
		<section class="border-blue-gray/40 rounded-2xl border bg-white/5 p-5">
			<p class="text-registered mb-4 font-bold">Merci, ton avis a bien été envoyé.</p>
			{#if existing.feedback}
				<h2 class="text-dark-blue-gray mb-1 text-xs uppercase">Sur la formation</h2>
				<p class="text-light-blue/80 mb-4 text-sm whitespace-pre-line">{existing.feedback}</p>
			{/if}
			{#if existing.team_message}
				<h2 class="text-dark-blue-gray mb-1 text-xs uppercase">Pour le pôle formation</h2>
				<p class="text-light-blue/80 text-sm whitespace-pre-line">{existing.team_message}</p>
			{/if}
		</section>
	{:else if !allowed}
		<p class="text-dark-blue-gray text-sm">
			Tu ne peux pas donner d'avis sur cette formation : seules les personnes inscrites et non
			absentes le peuvent, une fois la formation terminée.
		</p>
	{:else}
		<form class="border-blue-gray/40 rounded-2xl border bg-white/5 p-5" onsubmit={submit}>
			<label class="mb-5 block">
				<span class="mb-1 block font-bold">
					Qu'avez-vous pensé de cette formation ? Quels sont les points positifs ou les axes
					d'amélioration ?
				</span>
				<span class="text-dark-blue-gray mb-2 block text-xs">
					À propos de la formation et de la personne qui l'a donnée.
				</span>
				<textarea
					class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2"
					maxlength="4000"
					rows="6"
					bind:value={feedback}></textarea>
			</label>
			<label class="mb-5 block">
				<span class="mb-1 block font-bold">
					Autre chose à nous dire pour améliorer les formations ou l'organisation ?
				</span>
				<span class="text-dark-blue-gray mb-2 block text-xs">
					Ce message est réservé au pôle formation.
				</span>
				<textarea
					class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2"
					maxlength="4000"
					rows="4"
					bind:value={teamMessage}></textarea>
			</label>
			<p class="text-dark-blue-gray mb-4 text-xs">
				Tes réponses ne sont pas anonymes. Une fois envoyées, elles ne sont plus modifiables.
			</p>
			{#if formError}
				<p class="text-complete mb-3 text-sm">{formError}</p>
			{/if}
			<CtaButton disabled={submitting} fullWidth={false} size="sm" type="submit">
				{submitting ? 'Envoi…' : 'Envoyer mon avis'}
			</CtaButton>
		</form>
	{/if}
</div>
