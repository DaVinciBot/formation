<script lang="ts">
	// Participants externes d'une session (formation#51). Le responsable externe
	// inscrit ses participants par lot et ne voit que les siens (RLS) ; le
	// responsable formations et le formateur voient tous les externes.
	import { CtaButton } from '@davincibot/components';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { Plus, Trash, UsersRound, X } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import {
		completeDrafts,
		listExternalParticipants,
		registerExternalParticipants,
		removeExternalParticipant,
		type ExternalParticipant,
		type ParticipantDraft
	} from '#lib/external-registrations.js';

	interface Props {
		slotId: number;
		/** Modalités proposées par la session. */
		modes: { key: 'on-site' | 'remote'; label: string }[];
		canRegister?: boolean;
		canManageAll?: boolean;
		currentUserId?: string | null;
		onChange?: () => void;
	}

	const noop = () => undefined;
	let {
		slotId,
		modes,
		canRegister = false,
		canManageAll = false,
		currentUserId = null,
		onChange = noop
	}: Props = $props();

	const getClient = () => getSupabaseBrowserClient();
	const emptyRow = (): ParticipantDraft => ({ first_name: '', last_name: '' });

	let participants = $state<ExternalParticipant[]>([]);
	let loadError = $state<string | null>(null);
	let formOpen = $state(false);
	let rows = $state<ParticipantDraft[]>([emptyRow()]);
	let mode = $state<'on-site' | 'remote'>('on-site');
	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let removingId = $state<number | null>(null);

	const ready = $derived(completeDrafts(rows));

	async function load(id = slotId) {
		try {
			participants = await listExternalParticipants(getClient(), id);
			loadError = null;
		} catch {
			loadError = 'Impossible de charger les participants externes.';
			participants = [];
		}
	}

	// Recharge à chaque session ; la modalité choisie n'est réinitialisée que si
	// la session ne la propose pas.
	$effect(() => {
		const id = slotId;
		untrack(() => {
			if (!modes.some((option) => option.key === mode)) {
				mode = modes[0]?.key ?? 'on-site';
			}
		});
		void load(id);
	});

	function openForm() {
		rows = [emptyRow()];
		formError = null;
		formOpen = true;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (ready.length === 0) {
			formError = 'Renseignez au moins un participant (prénom et nom).';
			return;
		}
		submitting = true;
		formError = await registerExternalParticipants(getClient(), slotId, mode === 'remote', ready);
		submitting = false;
		if (formError) {
			return;
		}
		formOpen = false;
		await load();
		onChange();
	}

	async function remove(participant: ExternalParticipant) {
		removingId = participant.id;
		try {
			await removeExternalParticipant(getClient(), participant.id);
			await load();
			onChange();
		} catch {
			loadError = "Ce participant n'a pas pu être retiré.";
		} finally {
			removingId = null;
		}
	}

	const canRemove = (participant: ExternalParticipant) =>
		canManageAll || (currentUserId !== null && participant.registered_by === currentUserId);

	const FIELD =
		'border-light-blue/30 bg-dark-blue/70 text-light-blue placeholder:text-light-blue/40 w-full rounded-lg border px-3 py-2 text-sm';
</script>

{#if canRegister || participants.length > 0 || loadError}
	<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
		<div class="flex items-center justify-between gap-3">
			<div class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase">
				<UsersRound class="size-4" />
				<span>{canManageAll ? 'Participants externes' : 'Mes participants'}</span>
			</div>
			{#if canRegister && !formOpen}
				<CtaButton fullWidth={false} onclick={openForm} size="xs" type="button" variant="secondary">
					Inscrire des participants
				</CtaButton>
			{/if}
		</div>

		{#if loadError}
			<p class="text-waiting mt-3 text-sm">{loadError}</p>
		{/if}

		{#if participants.length > 0}
			<ul class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each participants as participant (participant.id)}
					<li
						class="border-light-blue/20 bg-dark-blue/40 flex items-center gap-3 rounded-xl border px-3 py-2"
					>
						<div class="min-w-0 flex-1">
							<p class="text-light-blue m-0 truncate text-sm/4 font-semibold">
								{participant.first_name}
								{participant.last_name}
							</p>
							<p class="text-light-blue/70 m-0 text-[0.7rem]/3">
								{participant.association_name} · {participant.remote ? 'Distanciel' : 'Présentiel'}
							</p>
						</div>
						{#if canRemove(participant)}
							<button
								class="text-light-blue/70 hover:text-waiting rounded-lg p-1"
								aria-label={`Retirer ${participant.first_name} ${participant.last_name}`}
								disabled={removingId !== null}
								onclick={() => void remove(participant)}
								type="button"
							>
								<Trash class="size-4" />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else if canRegister && !formOpen && !loadError}
			<p class="text-light-blue/70 mt-3 text-sm">Aucun participant inscrit pour le moment.</p>
		{/if}

		{#if formOpen}
			<form class="mt-4 grid gap-3" onsubmit={submit}>
				{#if modes.length > 1}
					<label class="text-light-blue/80 grid gap-1 text-xs">
						Modalité
						<select class={FIELD} bind:value={mode}>
							{#each modes as option (option.key)}
								<option value={option.key}>{option.label}</option>
							{/each}
						</select>
					</label>
				{/if}
				{#each rows as row, index (index)}
					<div class="flex items-center gap-2">
						<input
							class={FIELD}
							aria-label="Prénom"
							placeholder="Prénom"
							type="text"
							bind:value={row.first_name}
						/>
						<input
							class={FIELD}
							aria-label="Nom"
							placeholder="Nom"
							type="text"
							bind:value={row.last_name}
						/>
						{#if rows.length > 1}
							<button
								class="text-light-blue/70 hover:text-waiting rounded-lg p-1"
								aria-label="Retirer cette ligne"
								onclick={() => (rows = rows.filter((_, other) => other !== index))}
								type="button"
							>
								<X class="size-4" />
							</button>
						{/if}
					</div>
				{/each}
				<button
					class="text-light-blue/80 hover:text-light-blue flex w-fit items-center gap-1 text-sm"
					onclick={() => (rows = [...rows, emptyRow()])}
					type="button"
				>
					<Plus class="size-4" /> Ajouter une ligne
				</button>
				{#if formError}
					<p class="text-waiting m-0 text-sm">{formError}</p>
				{/if}
				<div class="flex flex-wrap gap-2">
					<CtaButton
						disabled={submitting || ready.length === 0}
						fullWidth={false}
						size="xs"
						type="submit"
						variant="primary"
					>
						{submitting
							? 'Inscription...'
							: `Inscrire ${String(ready.length)} participant${ready.length > 1 ? 's' : ''}`}
					</CtaButton>
					<CtaButton
						fullWidth={false}
						onclick={() => (formOpen = false)}
						size="xs"
						type="button"
						variant="secondary"
					>
						Annuler
					</CtaButton>
				</div>
			</form>
		{/if}
	</div>
{/if}
