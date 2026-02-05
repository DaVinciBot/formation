<script lang="ts">
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import {
		createTraining,
		createTrainingSlot,
		getTrainingList,
		getTrainingSlots,
		updateTraining,
		updateTrainingSlot,
		type SlotStatus,
		type TrainingListItem,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	type ProfileOption = {
		id: string;
		username: string | null;
		avatar_url: string | null;
		email: string | null;
	};

	const categoryOptions = [
		{ value: 'code', text: 'Code' },
		{ value: 'electronics', text: 'Électronique' },
		{ value: 'robotic', text: 'Robotique' },
		{ value: 'software', text: 'Logiciel' },
		{ value: 'other', text: 'Autre', selected: true }
	];

	const statusOptions: { value: SlotStatus; text: string }[] = [
		{ value: 'draft', text: 'Brouillon' },
		{ value: 'pending', text: 'Planifiée' },
		{ value: 'postponed', text: 'Reportée' },
		{ value: 'canceled', text: 'Annulée' }
	];

	let trainings: TrainingListItem[] = [];
	let slots: TrainingSlotListItem[] = [];
	let profiles: ProfileOption[] = [];
	let loading = false;
	let error: string | null = null;
	let formError: string | null = null;

	let trainingSearch = '';
	let slotSearch = '';
	let showTrainingModal = false;
	let showSlotModal = false;
	let editingTraining: TrainingListItem | null = null;
	let editingSlot: TrainingSlotListItem | null = null;
	let trainingFields: any[] = [];
	let slotFields: any[] = [];
	let selectedTrainerId: string | null = null;

	const slotRangeDays = 120;

	const formatDate = (dateString: string) =>
		new Intl.DateTimeFormat('fr-FR', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(dateString));

	const toDatetimeLocal = (dateString: string) => {
		const date = new Date(dateString);
		const offset = date.getTimezoneOffset();
		const localDate = new Date(date.getTime() - offset * 60000);
		return localDate.toISOString().slice(0, 16);
	};

	const normalize = (value: string | null) => (value || '').toLowerCase();

	const findTrainingName = (trainingId: number) =>
		trainings.find((training) => training.training_id === trainingId)?.name || 'Formation';

	function buildTrainingFields(training: TrainingListItem | null) {
		return [
			{
				name: 'Nom',
				id: 'name',
				type: 'text',
				required: true,
				value: training?.name || ''
			},
			{
				name: 'Catégorie',
				id: 'category',
				type: 'select',
				required: true,
				options: categoryOptions,
				value: training?.category || ''
			},
			{
				name: 'Description',
				id: 'description',
				type: 'textarea',
				wide: true,
				value: training?.description || ''
			},
			{
				name: 'Prérequis',
				id: 'prerequisites',
				type: 'textarea',
				wide: true,
				value: training?.prerequisites || ''
			}
		];
	}

	function buildSlotFields(slot: TrainingSlotListItem | null) {
		const trainerOptions = profiles.map((profile) => {
			const label = profile.username || 'Membre';
			const suffix = profile.email ? ` - ${profile.email}` : '';
			return {
				value: profile.id,
				text: `${label}${suffix}`
			};
		});
		return [
			{
				name: 'Formation',
				id: 'training_id',
				type: 'select',
				required: true,
				options: trainings.map((training) => ({
					value: training.training_id,
					text: training.name
				})),
				value: slot?.training_id ?? ''
			},
			{
				name: 'Formateur·ice',
				id: 'trainer_id',
				type: 'select',
				required: true,
				options: trainerOptions,
				value: slot?.trainer_id || '',
				onChange: (event: Event) => {
					const target = event.target as HTMLSelectElement;
					selectedTrainerId = target.value || null;
				}
			},
			{
				name: 'Debut',
				id: 'start',
				type: 'datetime-local',
				required: true,
				value: slot ? toDatetimeLocal(slot.start) : ''
			},
			{
				name: 'Durée (h)',
				id: 'duration_hours',
				type: 'number',
				required: true,
				min: 0.5,
				step: 0.5,
				value: slot?.duration_hours ?? 2
			},
			{
				name: 'Places sur site',
				id: 'on_site_seats',
				type: 'number',
				min: 0,
				value: slot?.on_site_seats ?? ''
			},
			{
				name: 'Places distanciel',
				id: 'remote_seats',
				type: 'number',
				min: 0,
				value: slot?.remote_seats ?? ''
			},
			{
				name: 'Lieu',
				id: 'location',
				type: 'text',
				wide: true,
				value: slot?.location || ''
			},
			{
				name: 'Lien visio',
				id: 'video_conference_link',
				type: 'text',
				wide: true,
				value: slot?.video_conference_link || ''
			},
			{
				name: 'Excusable',
				id: 'excusable',
				type: 'checkbox',
				checked: slot?.excusable ?? true
			},
			{
				name: 'Statut',
				id: 'status',
				type: 'select',
				required: true,
				options: statusOptions,
				value: slot?.status || 'draft'
			}
		];
	}

	async function loadProfiles() {
		const { data, error: profilesError } = await supabase.rpc('trainer_profile_list');
		if (profilesError) throw profilesError;
		profiles = data ?? [];
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const [trainingList, slotList] = await Promise.all([
				getTrainingList(),
				getTrainingSlots(new Date(), slotRangeDays)
			]);
			trainings = trainingList;
			slots = slotList;
			await loadProfiles();
		} catch (err) {
			console.error(err);
			error = "Impossible de charger l'espace admin.";
		} finally {
			loading = false;
		}
	}

	function openTrainingModal(training: TrainingListItem | null = null) {
		formError = null;
		editingTraining = training;
		trainingFields = buildTrainingFields(training);
		showTrainingModal = true;
	}

	function openSlotModal(slot: TrainingSlotListItem | null = null) {
		formError = null;
		editingSlot = slot;
		selectedTrainerId = slot?.trainer_id ?? null;
		slotFields = buildSlotFields(slot);
		showSlotModal = true;
	}

	function closeTrainingModal() {
		showTrainingModal = false;
		editingTraining = null;
		trainingFields = [];
	}

	function closeSlotModal() {
		showSlotModal = false;
		editingSlot = null;
		selectedTrainerId = null;
		slotFields = [];
	}

	async function handleTrainingSubmit(event: Event) {
		event.preventDefault();
		const form = document.querySelector('#TrainingModal form') as HTMLFormElement | null;
		if (!form) return;
		const formData = new FormData(form);
		const name = (formData.get('name') || '').toString().trim();
		const category = (formData.get('category') || '').toString();
		const description = (formData.get('description') || '').toString().trim() || null;
		const prerequisites = (formData.get('prerequisites') || '').toString().trim() || null;

		if (!name || !category) {
			formError = 'Nom et catégorie obligatoires.';
			return;
		}

		try {
			if (editingTraining) {
				await updateTraining(editingTraining.training_id, {
					name,
					category: category as any,
					description,
					prerequisites
				});
			} else {
				await createTraining({
					name,
					category: category as any,
					description,
					prerequisites
				});
			}
			await loadData();
			closeTrainingModal();
		} catch (err) {
			console.error(err);
			formError = "Impossible d'enregistrer la formation.";
		}
	}

	async function handleSlotSubmit(event: Event) {
		event.preventDefault();
		const form = document.querySelector('#SlotModal form') as HTMLFormElement | null;
		if (!form) return;
		const formData = new FormData(form);
		const trainingId = Number(formData.get('training_id'));
		const startInput = (formData.get('start') || '').toString();
		const duration = Number(formData.get('duration_hours'));
		const status = (formData.get('status') || 'draft') as SlotStatus;
		const onSiteSeatsRaw = (formData.get('on_site_seats') || '').toString();
		const remoteSeatsRaw = (formData.get('remote_seats') || '').toString();
		const location = (formData.get('location') || '').toString().trim() || null;
		const videoLink = (formData.get('video_conference_link') || '').toString().trim() || null;
		const excusable = formData.has('excusable');
		const startIso = startInput ? new Date(startInput).toISOString() : '';
		const onSiteSeats = onSiteSeatsRaw === '' ? null : Number(onSiteSeatsRaw);
		const remoteSeats = remoteSeatsRaw === '' ? null : Number(remoteSeatsRaw);
		const trainerId = (formData.get('trainer_id') || '').toString();

		if (!trainingId || !startIso || !duration || !trainerId) {
			formError = 'Formation, formateur·ice, date et durée sont obligatoires.';
			return;
		}

		try {
			if (editingSlot) {
				await updateTrainingSlot(editingSlot.slot_id, {
					training_id: trainingId,
					trainer_id: trainerId,
					start: startIso,
					duration_hours: duration,
					on_site_seats: onSiteSeats,
					remote_seats: remoteSeats,
					location,
					video_conference_link: videoLink,
					excusable,
					status
				});
			} else {
				await createTrainingSlot({
					training_id: trainingId,
					trainer_id: trainerId,
					start: startIso,
					duration_hours: duration,
					on_site_seats: onSiteSeats,
					remote_seats: remoteSeats,
					location,
					video_conference_link: videoLink,
					excusable,
					status
				});
			}
			await loadData();
			closeSlotModal();
		} catch (err) {
			console.error(err);
			formError = "Impossible d'enregistrer le slot.";
		}
	}

	$: filteredTrainings = trainings.filter((training) => {
		const query = normalize(trainingSearch);
		if (!query) return true;
		return (
			normalize(training.name).includes(query) ||
			normalize(training.description).includes(query) ||
			normalize(training.prerequisites).includes(query)
		);
	});

	$: filteredSlots = slots.filter((slot) => {
		const query = normalize(slotSearch);
		if (!query) return true;
		return (
			normalize(slot.name).includes(query) ||
			normalize(slot.trainer_username).includes(query) ||
			normalize(findTrainingName(slot.training_id)).includes(query) ||
			normalize(slot.status).includes(query)
		);
	});

	$: upcomingSlots = slots.filter((slot) => new Date(slot.start) >= new Date());
	$: draftSlots = slots.filter((slot) => slot.status === 'draft');

	onMount(() => {
		void loadData();
	});
</script>

<section class="px-6 py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
		<header
			class="flex flex-col gap-6 rounded-[28px] border border-light-blue/15 bg-dark-blue/70 p-6 shadow-[0_20px_50px_rgba(1,7,32,0.35)]"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs tracking-[0.3em] text-light-blue/60 uppercase">Administration</p>
					<h1 class="mt-2 text-3xl font-bold text-white">Pilotage des formations</h1>
					<p class="mt-2 text-sm text-light-blue/70">
						Gérez le catalogue et les sessions planifiées en un coup d'oeil.
					</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<CTAButton type="button" variant="primary" size="sm" onclick={() => openTrainingModal()}>
						Nouvelle formation
					</CTAButton>
					<CTAButton type="button" variant="secondary" size="sm" onclick={() => openSlotModal()}>
						Nouveau slot
					</CTAButton>
				</div>
			</div>
			<div class="grid gap-4 md:grid-cols-3">
				<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
					<p class="text-xs tracking-[0.25em] text-light-blue/60 uppercase">Formations</p>
					<p class="mt-2 text-3xl font-bold text-white">{trainings.length}</p>
					<p class="mt-1 text-xs text-light-blue/70">catalogue actif</p>
				</div>
				<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
					<p class="text-xs tracking-[0.25em] text-light-blue/60 uppercase">Slots à venir</p>
					<p class="mt-2 text-3xl font-bold text-white">{upcomingSlots.length}</p>
					<p class="mt-1 text-xs text-light-blue/70">dans les {slotRangeDays} prochains jours</p>
				</div>
				<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
					<p class="text-xs tracking-[0.25em] text-light-blue/60 uppercase">Brouillons</p>
					<p class="mt-2 text-3xl font-bold text-white">{draftSlots.length}</p>
					<p class="mt-1 text-xs text-light-blue/70">à finaliser</p>
				</div>
			</div>
		</header>

		{#if loading}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/80"
			>
				<div class="flex items-center gap-3 text-xs tracking-[0.28em] uppercase">
					<span class="spinner" aria-hidden="true"></span>
					<span>Chargement des donnees</span>
				</div>
			</div>
		{:else if error}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-waiting"
			>
				<p class="text-sm">{error}</p>
				<CTAButton type="button" variant="peps" size="sm" onclick={loadData}>Reessayer</CTAButton>
			</div>
		{:else}
			{#if formError}
				<p class="text-sm text-waiting">{formError}</p>
			{/if}

			<div class="grid gap-8">
				<section class="rounded-[28px] border border-light-blue/10 bg-dark-blue/80 p-6">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Formations types</h2>
							<p class="text-sm text-light-blue/70">
								Gérez les contenus de référence pour les sessions.
							</p>
						</div>
						<div class="flex flex-wrap gap-3">
							<input
								type="text"
								class="w-full rounded-lg border border-light-blue/20 bg-dark-blue/90 px-4 py-2 text-sm text-white placeholder-light-blue/50 md:w-64"
								placeholder="Rechercher une formation"
								bind:value={trainingSearch}
							/>
							<CTAButton
								type="button"
								variant="secondary"
								size="sm"
								onclick={() => openTrainingModal()}
							>
								Ajouter
							</CTAButton>
						</div>
					</div>

					<div class="mt-6 overflow-hidden rounded-2xl border border-light-blue/10">
						<table class="w-full text-left text-sm text-light-blue/70">
							<thead class="bg-dark-blue text-xs tracking-[0.2em] text-light-blue/60 uppercase">
								<tr>
									<th class="px-4 py-3">Nom</th>
									<th class="px-4 py-3">Catégorie</th>
									<th class="px-4 py-3">Description</th>
									<th class="px-4 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#if filteredTrainings.length === 0}
									<tr>
										<td class="px-4 py-6 text-center" colspan="4">Aucune formation</td>
									</tr>
								{:else}
									{#each filteredTrainings as training}
										<tr class="border-t border-light-blue/10">
											<td class="px-4 py-4 text-white">{training.name}</td>
											<td class="px-4 py-4">
												<span
													class="rounded-full border border-light-blue/20 px-3 py-1 text-xs uppercase"
												>
													{categoryOptions.find((opt) => opt.value === training.category)?.text ||
														'Autre'}
												</span>
											</td>
											<td class="px-4 py-4 text-light-blue/60">
												{training.description || 'Aucune description'}
											</td>
											<td class="px-4 py-4 text-right">
												<button
													class="text-xs tracking-[0.2em] text-light-blue/70 uppercase hover:text-white"
													onclick={() => openTrainingModal(training)}
												>
													Editer
												</button>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</section>

				<section class="rounded-[28px] border border-light-blue/10 bg-dark-blue/80 p-6">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Slots de formation</h2>
							<p class="text-sm text-light-blue/70">Planifiez, suivez et ajustez les sessions.</p>
						</div>
						<div class="flex flex-wrap gap-3">
							<input
								type="text"
								class="w-full rounded-lg border border-light-blue/20 bg-dark-blue/90 px-4 py-2 text-sm text-white placeholder-light-blue/50 md:w-64"
								placeholder="Rechercher un slot"
								bind:value={slotSearch}
							/>
							<CTAButton
								type="button"
								variant="secondary"
								size="sm"
								onclick={() => openSlotModal()}
							>
								Ajouter
							</CTAButton>
						</div>
					</div>

					<div class="mt-6 overflow-hidden rounded-2xl border border-light-blue/10">
						<table class="w-full text-left text-sm text-light-blue/70">
							<thead class="bg-dark-blue text-xs tracking-[0.2em] text-light-blue/60 uppercase">
								<tr>
									<th class="px-4 py-3">Debut</th>
									<th class="px-4 py-3">Formation</th>
									<th class="px-4 py-3">Formateur·ice</th>
									<th class="px-4 py-3">Statut</th>
									<th class="px-4 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#if filteredSlots.length === 0}
									<tr>
										<td class="px-4 py-6 text-center" colspan="5">Aucun slot</td>
									</tr>
								{:else}
									{#each filteredSlots as slot}
										<tr class="border-t border-light-blue/10">
											<td class="px-4 py-4 text-white">{formatDate(slot.start)}</td>
											<td class="px-4 py-4">{findTrainingName(slot.training_id)}</td>
											<td class="px-4 py-4">
												<div class="flex items-center gap-2">
													{#if slot.trainer_avatar_url}
														<img
															src={slot.trainer_avatar_url}
															alt={slot.trainer_username || 'Formateur·ice'}
															class="h-6 w-6 rounded-full"
														/>
													{/if}
													<span>{slot.trainer_username || 'A definir'}</span>
												</div>
											</td>
											<td class="px-4 py-4">
												<span
													class="rounded-full border border-light-blue/20 px-3 py-1 text-xs uppercase"
												>
													{statusOptions.find((opt) => opt.value === slot.status)?.text ||
														slot.status}
												</span>
											</td>
											<td class="px-4 py-4 text-right">
												<button
													class="text-xs tracking-[0.2em] text-light-blue/70 uppercase hover:text-white"
													onclick={() => openSlotModal(slot)}
												>
													Editer
												</button>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		{/if}
	</div>
</section>

{#if showTrainingModal}
	<CrudForm
		id="TrainingModal"
		type="formation"
		type_accord="une"
		action={editingTraining ? 'Modifier' : 'Ajouter'}
		fields={trainingFields}
		onClose={closeTrainingModal}
		onSubmit={handleTrainingSubmit}
	/>
{/if}

{#if showSlotModal}
	<CrudForm
		id="SlotModal"
		type="slot"
		type_accord="un"
		action={editingSlot ? 'Modifier' : 'Ajouter'}
		fields={slotFields}
		onClose={closeSlotModal}
		onSubmit={handleSlotSubmit}
	/>
{/if}

<style>
	.spinner {
		width: 22px;
		height: 22px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 9999px;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
