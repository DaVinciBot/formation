<script lang="ts">
	import {
		createRequest,
		deleteRequest,
		getMyRequests,
		getRequests,
		setRequestStatus,
		type TrainingRequest,
		type TrainingRequestStatus
	} from '$lib/training-requests';
	import { Badge, CTAButton, Spinner } from '@davincibot/components';
	import { formatParisDate, getTrainingList, type TrainingListItem } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const userId = $derived(data.userId);
	const canRequest = $derived(data.canRequest);
	const canResolve = $derived(data.canResolve);

	const STATUS: Record<TrainingRequestStatus, { label: string; color: string }> = {
		pending: { label: 'En attente', color: 'waiting' },
		done: { label: 'Accomplie', color: 'registered' },
		refused: { label: 'Refusée', color: 'complete' }
	};

	const FILTERS: { value: TrainingRequestStatus | 'all'; label: string }[] = [
		{ value: 'pending', label: 'En attente' },
		{ value: 'done', label: 'Accomplies' },
		{ value: 'refused', label: 'Refusées' },
		{ value: 'all', label: 'Toutes' }
	];

	let client: ReturnType<typeof getSupabaseBrowserClient> | null = null;

	function getClient() {
		client ??= getSupabaseBrowserClient();
		return client;
	}

	let catalog = $state<TrainingListItem[]>([]);
	let mode = $state<'catalog' | 'subject'>('catalog');
	let selectedTrainingId = $state<number | null>(null);
	let subject = $state('');
	let details = $state('');
	let submitting = $state(false);
	let formError = $state<string | null>(null);
	let formNotice = $state<string | null>(null);

	let myRequests = $state<TrainingRequest[]>([]);
	let myLoading = $state(false);
	let myError = $state<string | null>(null);

	let allRequests = $state<TrainingRequest[]>([]);
	let allLoading = $state(false);
	let allError = $state<string | null>(null);
	let statusFilter = $state<TrainingRequestStatus | 'all'>('pending');

	let busyId = $state<number | null>(null);

	async function loadCatalog() {
		try {
			catalog = await getTrainingList(getClient());
		} catch {
			catalog = [];
		}
		if (catalog.length === 0) {
			mode = 'subject';
		}
	}

	async function loadMine() {
		myLoading = true;
		myError = null;
		try {
			myRequests = await getMyRequests(getClient(), userId);
		} catch {
			myError = 'Impossible de charger tes demandes.';
		} finally {
			myLoading = false;
		}
	}

	async function loadAll() {
		allLoading = true;
		allError = null;
		try {
			allRequests = await getRequests(
				getClient(),
				statusFilter === 'all' ? undefined : statusFilter
			);
		} catch {
			allError = 'Impossible de charger les demandes des membres.';
		} finally {
			allLoading = false;
		}
	}

	async function refreshLists() {
		await Promise.all([
			canRequest ? loadMine() : Promise.resolve(),
			canResolve ? loadAll() : Promise.resolve()
		]);
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = null;
		formNotice = null;

		const trimmedSubject = subject.trim();
		if (mode === 'catalog' && selectedTrainingId === null) {
			formError = 'Choisis une formation du catalogue.';
			return;
		}
		if (mode === 'subject' && trimmedSubject === '') {
			formError = 'Décris le sujet que tu souhaites voir enseigné.';
			return;
		}

		submitting = true;
		try {
			await createRequest(getClient(), {
				training_id: mode === 'catalog' ? selectedTrainingId : null,
				subject: mode === 'subject' ? trimmedSubject : null,
				details: details.trim() === '' ? null : details.trim()
			});
			subject = '';
			details = '';
			selectedTrainingId = null;
			formNotice = 'Demande envoyée au responsable formation.';
			await refreshLists();
		} catch {
			formError = "Impossible d'envoyer la demande.";
		} finally {
			submitting = false;
		}
	}

	async function remove(request: TrainingRequest) {
		busyId = request.id;
		myError = null;
		try {
			await deleteRequest(getClient(), request.id);
			await refreshLists();
		} catch {
			myError = 'Impossible de retirer cette demande.';
		} finally {
			busyId = null;
		}
	}

	async function resolve(request: TrainingRequest, status: TrainingRequestStatus) {
		busyId = request.id;
		allError = null;
		try {
			await setRequestStatus(getClient(), request.id, status);
			await refreshLists();
		} catch {
			allError = 'Impossible de mettre à jour cette demande.';
		} finally {
			busyId = null;
		}
	}

	async function applyFilter(value: TrainingRequestStatus | 'all') {
		statusFilter = value;
		await loadAll();
	}

	onMount(() => {
		if (canRequest) {
			void loadCatalog();
		}
		void refreshLists();
	});
</script>

<div class="mx-auto max-w-5xl px-6 pt-4 pb-16">
	<header class="mb-8">
		<h1 class="text-3xl font-bold tracking-wide">Demandes de formation</h1>
		<p class="text-dark-blue-gray mt-2 text-sm">
			Réclame une session d'une formation du catalogue, ou propose un sujet qui n'y figure pas
			encore. Le responsable formation marque ensuite chaque demande comme accomplie ou refusée.
		</p>
	</header>

	{#if canRequest}
		<section class="border-blue-gray/40 mb-10 rounded-2xl border bg-white/5 p-5">
			<h2 class="mb-4 text-xl font-bold">Nouvelle demande</h2>

			<form onsubmit={submit}>
				<div class="mb-4 flex flex-wrap gap-2">
					<CTAButton
						disabled={catalog.length === 0}
						fullWidth={false}
						onclick={() => (mode = 'catalog')}
						size="sm"
						variant={mode === 'catalog' ? 'primary' : 'secondary'}
					>
						Formation du catalogue
					</CTAButton>
					<CTAButton
						fullWidth={false}
						onclick={() => (mode = 'subject')}
						size="sm"
						variant={mode === 'subject' ? 'primary' : 'secondary'}
					>
						Sujet libre
					</CTAButton>
				</div>

				{#if mode === 'catalog'}
					<label class="mb-4 block">
						<span class="text-dark-blue-gray mb-1 block text-xs uppercase">Formation</span>
						<select
							class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2"
							bind:value={selectedTrainingId}
						>
							<option value={null}>Choisir une formation…</option>
							{#each catalog as training (training.training_id)}
								<option value={training.training_id}>{training.name}</option>
							{/each}
						</select>
					</label>
				{:else}
					<label class="mb-4 block">
						<span class="text-dark-blue-gray mb-1 block text-xs uppercase">Sujet</span>
						<input
							class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2"
							maxlength="150"
							placeholder="Soudure CMS, ROS 2, impression 3D…"
							type="text"
							bind:value={subject}
						/>
					</label>
					{#if catalog.length === 0}
						<p class="text-dark-blue-gray mb-4 text-xs">
							Le catalogue n'est pas disponible : seule la demande d'un sujet libre est possible.
						</p>
					{/if}
				{/if}

				<label class="mb-4 block">
					<span class="text-dark-blue-gray mb-1 block text-xs uppercase">
						Précisions (facultatif)
					</span>
					<textarea
						class="border-blue-gray/60 bg-dark-blue text-light-blue w-full rounded-xl border px-3 py-2"
						maxlength="1000"
						placeholder="Ce que tu attends de cette formation, ton niveau actuel, tes disponibilités…"
						rows="3"
						bind:value={details}></textarea>
				</label>

				{#if formError}
					<p class="text-complete mb-3 text-sm">{formError}</p>
				{/if}
				{#if formNotice}
					<p class="text-registered mb-3 text-sm">{formNotice}</p>
				{/if}

				<CTAButton disabled={submitting} fullWidth={false} size="sm" type="submit">
					{submitting ? 'Envoi…' : 'Envoyer la demande'}
				</CTAButton>
			</form>
		</section>

		<section class="mb-10">
			<h2 class="mb-4 text-xl font-bold">Mes demandes</h2>

			{#if myLoading}
				<Spinner />
			{:else if myError}
				<p class="text-complete text-sm">{myError}</p>
			{:else if myRequests.length === 0}
				<p class="text-dark-blue-gray text-sm">Tu n'as encore rien demandé.</p>
			{:else}
				<ul class="flex flex-col gap-3">
					{#each myRequests as request (request.id)}
						<li class="border-blue-gray/40 rounded-2xl border bg-white/5 p-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p class="font-bold">{request.label}</p>
									<p class="text-dark-blue-gray text-xs">
										Demandée le {formatParisDate(request.created_at)}
										{#if request.training_id === null}
											· sujet libre
										{/if}
									</p>
								</div>
								<div class="flex items-center gap-3">
									<Badge color={STATUS[request.status].color} text={STATUS[request.status].label} />
									{#if request.status === 'pending'}
										<CTAButton
											disabled={busyId === request.id}
											fullWidth={false}
											onclick={() => remove(request)}
											size="xs"
											variant="secondary"
										>
											Retirer
										</CTAButton>
									{/if}
								</div>
							</div>
							{#if request.details}
								<p class="text-light-blue/80 mt-3 text-sm whitespace-pre-line">{request.details}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if canResolve}
		<section>
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-xl font-bold">Demandes des membres</h2>
				<div class="flex flex-wrap gap-2">
					{#each FILTERS as filter (filter.value)}
						<CTAButton
							fullWidth={false}
							onclick={() => applyFilter(filter.value)}
							size="xs"
							variant={statusFilter === filter.value ? 'primary' : 'secondary'}
						>
							{filter.label}
						</CTAButton>
					{/each}
				</div>
			</div>

			{#if allLoading}
				<Spinner />
			{:else if allError}
				<p class="text-complete text-sm">{allError}</p>
			{:else if allRequests.length === 0}
				<p class="text-dark-blue-gray text-sm">Aucune demande dans cette sélection.</p>
			{:else}
				<ul class="flex flex-col gap-3">
					{#each allRequests as request (request.id)}
						<li class="border-blue-gray/40 rounded-2xl border bg-white/5 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="flex items-center gap-3">
									{#if request.requester_avatar_url}
										<img
											class="h-9 w-9 rounded-full object-cover"
											alt=""
											src={request.requester_avatar_url}
										/>
									{/if}
									<div>
										<p class="font-bold">{request.label}</p>
										<p class="text-dark-blue-gray text-xs">
											{request.requester_username ?? 'Membre inconnu'} · {formatParisDate(
												request.created_at
											)}
											{#if request.training_id === null}
												· sujet libre
											{/if}
										</p>
									</div>
								</div>
								<Badge color={STATUS[request.status].color} text={STATUS[request.status].label} />
							</div>

							{#if request.details}
								<p class="text-light-blue/80 mt-3 text-sm whitespace-pre-line">{request.details}</p>
							{/if}

							{#if request.status !== 'pending' && request.resolved_at}
								<p class="text-dark-blue-gray mt-3 text-xs">
									Tranchée le {formatParisDate(request.resolved_at)}
									{#if request.resolved_by_username}
										par {request.resolved_by_username}
									{/if}
								</p>
							{/if}

							<div class="mt-4 flex flex-wrap gap-2">
								{#if request.status === 'pending'}
									<CTAButton
										disabled={busyId === request.id}
										fullWidth={false}
										onclick={() => resolve(request, 'done')}
										size="xs"
									>
										Marquer accomplie
									</CTAButton>
									<CTAButton
										disabled={busyId === request.id}
										fullWidth={false}
										onclick={() => resolve(request, 'refused')}
										size="xs"
										variant="secondary"
									>
										Refuser
									</CTAButton>
								{:else}
									<CTAButton
										disabled={busyId === request.id}
										fullWidth={false}
										onclick={() => resolve(request, 'pending')}
										size="xs"
										variant="secondary"
									>
										Rouvrir
									</CTAButton>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
