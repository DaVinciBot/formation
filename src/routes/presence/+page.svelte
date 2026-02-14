<script lang="ts">
	import { goto } from '$app/navigation';
	import Table from '$lib/components/admin/Table.svelte';
	import AttendanceHeader from '$lib/components/attendance/AttendanceHeader.svelte';
	import AttendanceStats from '$lib/components/attendance/AttendanceStats.svelte';
	import RegistrationMobileList from '$lib/components/attendance/RegistrationMobileList.svelte';
	import SlotList from '$lib/components/attendance/SlotList.svelte';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import PresenceActionsCell from '$lib/components/training/PresenceActionsCell.svelte';
	import Badge from '$lib/components/utils/Badge.svelte';
	import CtaButton from '$lib/components/utils/CTAButton.svelte';
	import {
		getSlotRegistrations,
		getTrainerSlotRegistrations,
		getTrainingSlots,
		updateTrainerPresence,
		type RegistrationListItem,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { triggerTableRefresh } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';

	let slots = $state<TrainingSlotListItem[]>([]);
	type SlotRegistration = RegistrationListItem;
	let registrations = $state<SlotRegistration[]>([]);
	let selectedSlotId = $state<number | null>(null);
	let loading = $state(false);
	let registrationsLoading = $state(false);
	let loadError = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let savingIds = $state(new Set<string>());
	let currentUserId: string | null = $state(null);
	let canManageTraining = $state(false);
	const presenceTableTopic = 'presence-table';
	const presenceDbInfo = {
		table: 'registration',
		key: 'slot_id,member_id,date_hour,remote,status,present,to_excuse,profiles!inner(username,avatar_url)',
		ordering: 'date_hour:asc'
	};
	let presenceFilters = $state([
		{
			category: 'hidden',
			value: 'slot_id',
			options: [{ name: 'selected_slot', value: '', active: false }]
		},
		{
			category: 'hidden',
			value: 'status',
			options: []
		}
	]);

	const slotRangeDays = 180;

	const selectedSlot = $derived(
		() => slots.find((slot) => slot.slot_id === selectedSlotId) ?? null
	);
	const registeredCount = $derived(
		() => registrations.filter((item) => item.status === 'registered').length
	);
	const waitlistedCount = $derived(
		() => registrations.filter((item) => item.status === 'waitlisted').length
	);
	const presentCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === true).length
	);
	const absentCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === false).length
	);
	const unknownCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === null).length
	);
	function parsePresenceItems(data: any[]) {
		return data.map((reg) => {
			const profile = reg.profiles || {};
			return [
				{
					value: profile.username ?? 'Membre',
					avatar: profile.avatar_url
				},
				{ value: reg.remote ? 'Distanciel' : 'Présentiel' },
				{
					component: Badge,
					props: {
						text: reg.status === 'registered' ? 'Inscrit·e' : 'En attente',
						className:
							reg.status === 'registered'
								? 'border-registered/40 text-registered'
								: 'border-waiting/40 text-waiting'
					}
				},
				{
					component: PresenceActionsCell,
					props: {
						memberId: reg.member_id,
						present: reg.present,
						status: reg.status,
						isSaving: isSaving(reg.member_id),
						onChange: handlePresenceChange,
						presenceButtonClass
					}
				}
			];
		});
	}

	$effect(() => {
		const slotValue = selectedSlotId ? String(selectedSlotId) : '';
		presenceFilters = [
			{
				category: 'hidden',
				value: 'slot_id',
				options: [{ name: 'selected_slot', value: slotValue, active: Boolean(selectedSlotId) }]
			},
			{
				category: 'hidden',
				value: 'status',
				options: canManageTraining
					? []
					: [{ name: 'registrations', value: 'registered","waitlisted', active: true }]
			}
		];
	});

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--/--/----';
		return format(date, 'dd/MM/yyyy');
	}

	function formatTime(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--h--';
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}h${minutes}`;
	}

	function formatTimeRange(startValue: string, durationHours: number) {
		const start = new Date(startValue);
		if (Number.isNaN(start.getTime())) return '--h-- - --h--';
		const safeDuration = Number.isFinite(durationHours) ? Math.max(0.25, durationHours) : 1;
		const end = new Date(start.getTime() + safeDuration * 60 * 60 * 1000);
		return `${formatTime(startValue)} - ${formatTime(end.toISOString())}`;
	}

	function pickDefaultSlot(list: TrainingSlotListItem[]) {
		if (list.length === 0) return null;
		const now = Date.now();
		const upcoming = list.find((slot) => new Date(slot.start).getTime() >= now);
		return upcoming ?? list[list.length - 1];
	}

	function presenceButtonClass(value: boolean | null, current: boolean | null) {
		const isActive = value === current;
		if (value === true) {
			return isActive
				? 'border-registered/40 bg-registered/15 text-registered'
				: 'border-light-blue/20 text-light-blue/70';
		}
		if (value === false) {
			return isActive
				? 'border-red-400/40 bg-red-500/15 text-red-300'
				: 'border-light-blue/20 text-light-blue/70';
		}
		return isActive
			? 'border-light-blue/40 bg-light-blue/10 text-light-blue'
			: 'border-light-blue/20 text-light-blue/70';
	}

	function isSaving(memberId: string) {
		return savingIds.has(memberId);
	}

	async function loadRegistrations(slotId: number) {
		registrationsLoading = true;
		loadError = null;
		actionError = null;
		try {
			const data = canManageTraining
				? await getSlotRegistrations(slotId)
				: await getTrainerSlotRegistrations(slotId);
			registrations = data;
		} catch (err) {
			console.error(err);
			loadError = 'Impossible de charger les inscriptions de ce slot.';
			registrations = [];
		} finally {
			registrationsLoading = false;
		}
	}

	async function handleSlotChange(slotId: number) {
		selectedSlotId = slotId;
		await loadRegistrations(slotId);
		triggerTableRefresh(presenceTableTopic);
	}

	async function handlePresenceChange(memberId: string, present: boolean | null) {
		if (!selectedSlotId) return;
		actionError = null;
		savingIds = new Set(savingIds).add(memberId);
		try {
			await updateTrainerPresence(selectedSlotId, memberId, present);
			registrations = registrations.map((item) =>
				item.member_id === memberId ? { ...item, present } : item
			);
			triggerTableRefresh(presenceTableTopic);
		} catch (err) {
			console.error(err);
			actionError = 'Impossible de mettre à jour la présence.';
		} finally {
			const next = new Set(savingIds);
			next.delete(memberId);
			savingIds = next;
		}
	}

	async function loadSlots() {
		loading = true;
		loadError = null;
		try {
			const { data: accessData, error: accessError } = await supabase.rpc('has_permission', {
				p_permission: 'access_training'
			});
			if (accessError || !accessData) {
				await goto('/unauthorized?redirect=/formation/presence');
				return;
			}
			const { data: manageData, error: manageError } = await supabase.rpc('has_permission', {
				p_permission: 'manage_training'
			});
			canManageTraining = !manageError && Boolean(manageData);
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser();
			if (userError || !user) {
				await goto('/unauthorized?redirect=/formation/presence');
				return;
			}
			currentUserId = user.id;

			const rawSlots = await getTrainingSlots(new Date(), slotRangeDays);
			slots = rawSlots
				.filter((slot) => canManageTraining || slot.trainer_id === user.id)
				.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

			const initialSlot = pickDefaultSlot(slots);
			selectedSlotId = initialSlot?.slot_id ?? null;
			if (selectedSlotId) {
				await loadRegistrations(selectedSlotId);
			} else {
				registrations = [];
			}
		} catch (err) {
			console.error(err);
			loadError = 'Impossible de charger vos slots de formation.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadSlots();
	});
</script>

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
		<AttendanceHeader
			selectedSlot={selectedSlot()}
			onRefresh={loadSlots}
			{currentUserId}
			{formatDate}
			{formatTimeRange}
		/>

		{#if loading}
			<Spinner divClass="h-full">Chargement des slots</Spinner>
		{:else if loadError}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-waiting"
			>
				<p class="text-center text-sm">{loadError}</p>
				<CtaButton type="button" variant="peps" size="sm" onclick={loadSlots}>Réessayer</CtaButton>
			</div>
		{:else if slots.length === 0}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/70"
			>
				<p class="text-center text-sm">Aucun slot ne vous est attribué pour le moment.</p>
			</div>
		{:else}
			<div class="grid gap-6 min-[1040px]:grid-cols-[minmax(0,0.38fr)_1fr]">
				<SlotList
					{slots}
					{selectedSlotId}
					onSelectSlot={handleSlotChange}
					{formatDate}
					{formatTimeRange}
				/>

				<section class="rounded-[26px] border border-light-blue/10 bg-dark-blue/80 p-4 sm:p-6">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold text-white">Présences</h2>
							<p class="text-xs text-light-blue/70">
								{selectedSlot()?.name ?? 'Sélectionnez un slot'}
							</p>
						</div>
						{#if selectedSlot()}
							<div class="flex flex-wrap">
								<CtaButton
									variant="secondary"
									size="sm"
									class="w-40"
									fullWidth={false}
									onclick={() => selectedSlotId && loadRegistrations(selectedSlotId)}
								>
									Rafraîchir
								</CtaButton>
							</div>
						{/if}
					</div>

					{#if actionError}
						<p class="mt-3 text-sm text-waiting">{actionError}</p>
					{/if}

					{#if !selectedSlot()}
						<div
							class="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
						>
							<p class="text-sm">Sélectionnez un slot pour démarrer.</p>
						</div>
					{:else if registrationsLoading}
						<Spinner
							divClass="mt-6 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
						>
							Chargement des inscriptions
						</Spinner>
					{:else}
						<AttendanceStats
							registeredCount={registeredCount()}
							presentCount={presentCount()}
							absentCount={absentCount()}
							unknownCount={unknownCount()}
						/>

						{#if registrations.length === 0}
							<div
								class="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
							>
								<p class="text-sm">Aucune inscription pour ce slot.</p>
							</div>
						{:else}
							<RegistrationMobileList
								{registrations}
								{isSaving}
								onPresenceChange={handlePresenceChange}
								{presenceButtonClass}
							/>
							<div class="mt-6 hidden min-[1040px]:block">
								<Table
									headers={['Membre', 'Format', 'Statut', 'Présence']}
									dbInfo={presenceDbInfo}
									parseItems={parsePresenceItems}
									filters={presenceFilters}
									refreshTopic={presenceTableTopic}
									searchable="profiles.username"
									emptyMessage="Aucune inscription"
									can_load={Boolean(selectedSlotId)}
									size={10}
								/>
							</div>
						{/if}
					{/if}
				</section>
			</div>
		{/if}
	</div>
</section>
