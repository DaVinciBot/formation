<script lang="ts">
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import AdminHeader from '$lib/components/training/admin/AdminHeader.svelte';
	import AdminSlotSection from '$lib/components/training/admin/AdminSlotSection.svelte';
	import AdminTrainingSection from '$lib/components/training/admin/AdminTrainingSection.svelte';
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
		<AdminHeader
			trainingsCount={trainings.length}
			upcomingCount={upcomingSlots.length}
			draftCount={draftSlots.length}
			{slotRangeDays}
			onAddTraining={() => openTrainingModal()}
			onAddSlot={() => openSlotModal()}
		/>

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
				<AdminTrainingSection
					{trainings}
					{categoryOptions}
					{trainingDbInfo}
					{trainingActions}
					{trainingFilters}
					{trainingTableTopic}
					{parseTrainingItems}
					onAddTraining={() => openTrainingModal()}
					onEditTraining={(training) => openTrainingModal(training)}
				/>
				<AdminSlotSection
					{slots}
					{statusOptions}
					{slotDbInfo}
					{slotActions}
					{slotFilters}
					{slotTableTopic}
					{parseSlotItems}
					{formatSlotDate}
					{findTrainingName}
					{trainings}
					onAddSlot={() => openSlotModal()}
					onEditSlot={(slot) => openSlotModal(slot)}
				/>
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
