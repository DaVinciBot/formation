<script lang="ts">
	import Table from '$lib/components/admin/Table.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import CTAButton from '$lib/components/utils/CTAButton.svelte';
	import {
		buildSlotFields,
		buildTrainingFields,
		type ProfileOption
	} from '$lib/helpers/adminForms';
	import { categoryOptions, statusOptions } from '$lib/helpers/adminOptions';
	import {
		createSlotTableItems,
		createTrainingTableItems,
		findTrainingName,
		formatSlotDate
	} from '$lib/helpers/adminTables';
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
	import { triggerTableRefresh } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let trainings: TrainingListItem[] = [];
	let slots: TrainingSlotListItem[] = [];
	let profiles: ProfileOption[] = [];
	let loading = false;
	let error: string | null = null;
	let formError: string | null = null;

	let showTrainingModal = false;
	let showSlotModal = false;
	let editingTraining: TrainingListItem | null = null;
	let editingSlot: TrainingSlotListItem | null = null;
	let trainingFields: any[] = [];
	let slotFields: any[] = [];
	let selectedTrainerId: string | null = null;

	const slotRangeDays = 120;
	const trainingTableTopic = 'admin-trainings';
	const slotTableTopic = 'admin-slots';
	const trainingDbInfo = {
		table: 'training',
		key: 'id,name,category,description,prerequisites',
		ordering: 'name:asc'
	};
	const slotDbInfo = {
		table: 'training_slot',
		key: 'id,training_id,custom_name,custom_description,custom_prerequisites,start,duration_hours,on_site_seats,remote_seats,location,video_conference_link,excusable,status,trainer_id,training!inner(name,description,prerequisites,category),profiles!slot_trainer_id_fkey(username,avatar_url)',
		ordering: 'start:desc'
	};
	let trainingIndex = new Map<number, TrainingListItem>();
	let slotIndex = new Map<number, TrainingSlotListItem>();

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
		slotFields = buildSlotFields({
			slot,
			trainings,
			profiles,
			onTrainerChange: (nextId) => {
				selectedTrainerId = nextId;
			}
		});
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
			triggerTableRefresh(trainingTableTopic);
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
			triggerTableRefresh(slotTableTopic);
			closeSlotModal();
		} catch (err) {
			console.error(err);
			formError = "Impossible d'enregistrer le slot.";
		}
	}

	function parseTrainingItems(data: any[]) {
		const { index, rows } = createTrainingTableItems(data);
		trainingIndex = index;
		return rows;
	}

	function parseSlotItems(data: any[]) {
		const { index, rows } = createSlotTableItems(data);
		slotIndex = index;
		return rows;
	}

	const trainingActions = [
		{
			title: 'Editer',
			type: 'view',
			handler: (event: Event) => {
				const id = Number(
					(event.target as HTMLElement | null)?.closest('tr')?.querySelector('th')?.dataset.utils
				);
				const training =
					trainingIndex.get(id) ?? trainings.find((item) => item.training_id === id) ?? null;
				if (training) openTrainingModal(training);
			}
		}
	];

	const slotActions = [
		{
			title: 'Editer',
			type: 'view',
			handler: (event: Event) => {
				const id = Number(
					(event.target as HTMLElement | null)?.closest('tr')?.querySelector('th')?.dataset.utils
				);
				const slot = slotIndex.get(id) ?? slots.find((item) => item.slot_id === id) ?? null;
				if (slot) openSlotModal(slot);
			}
		}
	];

	let trainingFilters = [
		{
			category: 'Catégorie',
			value: 'category',
			options: categoryOptions.map((opt) => ({ value: opt.value, name: opt.text }))
		}
	];

	let slotFilters = [
		{
			category: 'Statut',
			value: 'status',
			options: statusOptions.map((opt) => ({ value: opt.value, name: opt.text }))
		}
	];

	$: upcomingSlots = slots.filter((slot) => new Date(slot.start) >= new Date());
	$: draftSlots = slots.filter((slot) => slot.status === 'draft');

	onMount(() => {
		void loadData();
	});
</script>

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
		<header
			class="flex flex-col gap-6 rounded-[28px] border border-light-blue/15 bg-dark-blue/70 p-5 shadow-[0_20px_50px_rgba(1,7,32,0.35)] sm:p-6"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs tracking-[0.3em] text-light-blue/60 uppercase">Administration</p>
					<h1 class="mt-2 text-2xl font-bold text-white sm:text-3xl">Pilotage des formations</h1>
					<p class="mt-2 text-sm text-light-blue/70">
						Gérez le catalogue et les sessions planifiées en un coup d'oeil.
					</p>
				</div>
				<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
					<CTAButton type="button" variant="primary" size="sm" onclick={() => openTrainingModal()}>
						Nouvelle formation
					</CTAButton>
					<CTAButton type="button" variant="secondary" size="sm" onclick={() => openSlotModal()}>
						Nouveau slot
					</CTAButton>
				</div>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
			<Spinner
				divClass="rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/80"
			>
				Chargement des données
			</Spinner>
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
				<section class="rounded-[28px] border border-light-blue/10 bg-dark-blue/80 p-5 sm:p-6">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Formations types</h2>
							<p class="text-sm text-light-blue/70">
								Gérez les contenus de référence pour les sessions.
							</p>
						</div>
						<div class="flex flex-col sm:w-40 sm:flex-row sm:flex-wrap">
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

					<div class="mt-6 overflow-hidden rounded-xl border border-light-blue/10">
						<div class="hidden md:block">
							<Table
								headers={['Nom', 'Catégorie', 'Description', 'Actions']}
								dbInfo={trainingDbInfo}
								parseItems={parseTrainingItems}
								actions={trainingActions}
								refreshTopic={trainingTableTopic}
								filters={trainingFilters}
								searchable="name"
								emptyMessage="Aucune formation"
								size={5}
							/>
						</div>
						<div class="md:hidden">
							{#if trainings.length === 0}
								<p class="px-4 py-6 text-center text-sm text-light-blue/70">Aucune formation</p>
							{:else}
								<div class="grid gap-3 p-4">
									{#each trainings as training}
										<article class="rounded-2xl border border-light-blue/10 bg-dark-blue/90 p-4">
											<div class="flex items-start justify-between gap-4">
												<div>
													<p class="text-base font-semibold text-white">{training.name}</p>
													<p class="mt-1 text-xs tracking-[0.2em] text-light-blue/60 uppercase">
														{categoryOptions.find((opt) => opt.value === training.category)?.text ||
															'Autre'}
													</p>
												</div>
												<button
													class="text-xs tracking-[0.2em] text-light-blue/70 uppercase hover:text-white"
													onclick={() => openTrainingModal(training)}
												>
													Editer
												</button>
											</div>
											<p class="mt-3 text-sm text-light-blue/70">
												{training.description || 'Aucune description'}
											</p>
										</article>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</section>

				<section class="rounded-[28px] border border-light-blue/10 bg-dark-blue/80 p-5 sm:p-6">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-white">Slots de formation</h2>
							<p class="text-sm text-light-blue/70">Planifiez, suivez et ajustez les sessions.</p>
						</div>
						<div class="flex flex-col sm:w-40 sm:flex-row sm:flex-wrap">
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
						<div class="hidden md:block">
							<Table
								headers={['Début', 'Formation', 'Formateur·ice', 'Statut', 'Actions']}
								dbInfo={slotDbInfo}
								parseItems={parseSlotItems}
								actions={slotActions}
								refreshTopic={slotTableTopic}
								filters={slotFilters}
								searchable="training.name"
								emptyMessage="Aucun slot"
								size={10}
							/>
						</div>
						<div class="md:hidden">
							{#if slots.length === 0}
								<p class="px-4 py-6 text-center text-sm text-light-blue/70">Aucun slot</p>
							{:else}
								<div class="grid gap-3 p-4">
									{#each slots as slot}
										<article class="rounded-2xl border border-light-blue/10 bg-dark-blue/90 p-4">
											<div class="flex items-start justify-between gap-4">
												<div>
													<p class="text-base font-semibold text-white">
														{formatSlotDate(slot.start)}
													</p>
													<p class="mt-1 text-sm text-light-blue/70">
														{findTrainingName(slot.training_id, trainings)}
													</p>
												</div>
												<button
													class="text-xs tracking-[0.2em] text-light-blue/70 uppercase hover:text-white"
													onclick={() => openSlotModal(slot)}
												>
													Editer
												</button>
											</div>
											<div
												class="mt-3 flex flex-wrap items-center gap-3 text-sm text-light-blue/70"
											>
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
												<span
													class="rounded-full border border-light-blue/20 px-3 py-1 text-xs uppercase"
												>
													{statusOptions.find((opt) => opt.value === slot.status)?.text ||
														slot.status}
												</span>
											</div>
										</article>
									{/each}
								</div>
							{/if}
						</div>
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
