<script lang="ts">
	import { page } from '$app/state';
	import AttendanceHeader from '#lib/components/attendance/AttendanceHeader.svelte';
	import AttendanceMainInfo from '#lib/components/attendance/AttendanceMainInfo.svelte';
	import AttendanceStats from '#lib/components/attendance/AttendanceStats.svelte';
	import RegistrationMobileList from '#lib/components/attendance/RegistrationMobileList.svelte';
	import SlotList from '#lib/components/attendance/SlotList.svelte';
	import PresenceActionsCell from '#lib/components/training/PresenceActionsCell.svelte';
	import {
		Badge,
		CtaButton,
		Spinner,
		Table,
		type DBInfo,
		type Filter,
		type TableCell,
		type TableColumn,
		type TableRow
	} from '@davincibot/components';
	import {
		formatParisDate,
		formatParisTimeRange,
		getTrainingSlots,
		triggerTableRefresh,
		type TrainingSlotListItem
	} from '@davincibot/lib';
	import {
		attendanceWindowStart,
		getSlotRegistrations,
		getTrainerSlotRegistrations,
		pickAttendanceSlot,
		REGISTRATION_STATUS_BADGES,
		updateTrainerPresence,
		type RegistrationListItem,
		type RegistrationStatus
	} from '#lib/training-registrations.js';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { FileText, RefreshCw } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onMount, tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let slots = $state<TrainingSlotListItem[]>([]);
	type SlotRegistration = RegistrationListItem;
	let registrations = $state<SlotRegistration[]>([]);
	let selectedSlotId = $state<number | null>(null);
	let loading = $state(false);
	let registrationsLoading = $state(false);
	let loadError = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	const savingIds = new SvelteSet<string>();
	const currentUserId: string = $derived(data.currentUserId);
	const canManageTraining = $derived(data.canManageTraining);

	const presenceTableTopic = 'presence-table';
	const presenceDbInfo: DBInfo = {
		schema: 'formation',
		table: 'trainer_registration_view',
		key: 'slot_id,member_id,date_hour,remote,status,present,to_excuse,member_username,member_avatar_url',
		ordering: 'date_hour:asc'
	};
	// Filtres cachés : la table n'affiche que la session choisie et, pour un formateur, que
	// les inscrits et la liste d'attente.
	const presenceFilters: Filter[] = $derived([
		{
			category: 'hidden',
			value: 'slot_id',
			options: [
				{
					name: 'selected_slot',
					value: selectedSlotId ? String(selectedSlotId) : '',
					active: Boolean(selectedSlotId)
				}
			]
		},
		{
			category: 'hidden',
			value: 'status',
			options: canManageTraining
				? []
				: [
						{ name: 'registered', value: 'registered', active: true },
						{ name: 'waitlisted', value: 'waitlisted', active: true }
					]
		},
		{
			// #49 — isoler d'un clic les membres qui ont besoin d'un justificatif.
			category: 'Excuse de cours',
			value: 'to_excuse',
			options: [{ name: 'Excuse demandée', value: 'true' }]
		}
	]);
	const presenceColumns: TableColumn[] = [
		{ key: 'member_username', label: 'Membre', sortable: true },
		{ key: 'remote', label: 'Format', sortable: true },
		{ key: 'status', label: 'Statut', sortable: true },
		{
			key: 'to_excuse',
			label: 'Excuse',
			sortable: true,
			csv: (row) => (row[3]?.value === true ? 'Excuse demandée' : '')
		},
		{ key: 'present', label: 'Présence', csv: (row) => presenceLabel(row[4]) }
	];

	const slotRangeDays = 180;
	const selectedSlotParam = $derived(() => {
		const value = page.url.searchParams.get('slot');
		if (!value) {
			return null;
		}
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	});

	const selectedSlot = $derived(
		() => slots.find((slot) => slot.slot_id === selectedSlotId) ?? null
	);
	const registeredCount = $derived(
		() => registrations.filter((item) => item.status === 'registered').length
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
	type PresenceTableRegistration = Pick<
		RegistrationListItem,
		| 'member_id'
		| 'remote'
		| 'status'
		| 'present'
		| 'to_excuse'
		| 'member_username'
		| 'member_avatar_url'
	>;

	function parsePresenceItems(data: unknown[]): TableRow[] {
		return (data as PresenceTableRegistration[]).map((reg): TableRow => {
			return [
				{
					value: reg.member_username ?? 'Membre',
					avatar: reg.member_avatar_url
				},
				{ value: reg.remote ? 'Distanciel' : 'Présentiel' },
				{
					value: REGISTRATION_STATUS_BADGES[reg.status].label,
					data: reg.status,
					cell: statusCell
				},
				{ value: reg.to_excuse, cell: excuseCell },
				{ value: reg, cell: presenceCell }
			];
		});
	}

	function presenceLabel(cell: TableCell | undefined) {
		const reg = cell?.value as PresenceTableRegistration | undefined;
		if (reg?.status !== 'registered') {
			return '';
		}
		return reg.present === null ? 'NSP' : reg.present ? 'Présent' : 'Absent';
	}

	function formatDate(value: string) {
		return formatParisDate(value);
	}

	function formatTimeRange(startValue: string, durationHours: number) {
		return formatParisTimeRange(startValue, durationHours);
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
			const supabaseClient = getSupabaseBrowserClient() as SupabaseClient;
			const data = canManageTraining
				? await getSlotRegistrations(supabaseClient, slotId)
				: await getTrainerSlotRegistrations(supabaseClient, slotId);
			registrations = data;
		} catch {
			loadError = 'Impossible de charger les inscriptions de cette session.';
			registrations = [];
		} finally {
			registrationsLoading = false;
		}
	}

	async function handleSlotChange(slotId: number) {
		selectedSlotId = slotId;
		await loadRegistrations(slotId);
		// La table vient d'être remontée : la page lue dans l'URL était celle de l'ancienne session.
		await tick();
		triggerTableRefresh(presenceTableTopic, { resetPage: true });
	}

	async function handlePresenceChange(memberId: string, present: boolean | null) {
		if (!selectedSlotId) {
			return;
		}
		actionError = null;
		savingIds.add(memberId);
		try {
			const supabaseClient = getSupabaseBrowserClient() as SupabaseClient;
			await updateTrainerPresence(supabaseClient, selectedSlotId, memberId, present);
			registrations = registrations.map((item) =>
				item.member_id === memberId ? { ...item, present } : item
			);
			triggerTableRefresh(presenceTableTopic);
		} catch {
			actionError = 'Impossible de mettre à jour la présence.';
		} finally {
			savingIds.delete(memberId);
		}
	}

	async function loadSlots() {
		loading = true;
		loadError = null;
		try {
			const supabaseClient = getSupabaseBrowserClient() as SupabaseClient;
			// #48 — une session qui a commencé reste à l'appel : charger à partir de
			// maintenant la retirait de l'écran dès sa première minute.
			const now = new Date();
			const rawSlots = await getTrainingSlots(
				supabaseClient,
				attendanceWindowStart(now),
				slotRangeDays
			);
			slots = rawSlots
				.filter((slot) => canManageTraining || slot.trainer_id === currentUserId)
				.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

			const slotParam = selectedSlotParam();
			const selectedFromParam = slotParam
				? (slots.find((slot) => slot.slot_id === slotParam) ?? null)
				: null;
			const initialSlot = selectedFromParam ?? pickAttendanceSlot(slots, now);
			selectedSlotId = initialSlot?.slot_id ?? null;
			if (selectedSlotId) {
				await loadRegistrations(selectedSlotId);
			} else {
				registrations = [];
			}
		} catch {
			loadError = 'Impossible de charger vos sessions de formation.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadSlots();
	});
</script>

{#snippet statusCell(cell: TableCell)}
	{@const status = cell.data as RegistrationStatus}
	<Badge color={REGISTRATION_STATUS_BADGES[status].color} text={String(cell.value)} />
{/snippet}

{#snippet excuseCell(cell: TableCell)}
	{#if cell.value === true}
		<!-- #49 — ce membre attend un justificatif pour excuser son absence en cours. -->
		<span
			class="text-waiting inline-flex items-center gap-1 text-[0.7rem] tracking-[0.15em] uppercase"
			title="Ce membre a demandé une excuse de cours pour cette session"
		>
			<FileText class="size-3.5" />
			À excuser
		</span>
	{/if}
{/snippet}

{#snippet presenceCell(cell: TableCell)}
	{@const reg = cell.value as PresenceTableRegistration}
	<PresenceActionsCell
		isSaving={isSaving(reg.member_id)}
		memberId={reg.member_id}
		onChange={handlePresenceChange}
		{presenceButtonClass}
		present={reg.present}
		status={reg.status}
	/>
{/snippet}

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
		<AttendanceHeader {currentUserId} onRefresh={loadSlots} />

		{#if loading}
			<Spinner divClass="h-full">Chargement des slots</Spinner>
		{:else if loadError}
			<div
				class="border-light-blue/20 bg-dark-blue/80 text-waiting flex flex-col items-center justify-center gap-3 rounded-[26px] border p-10"
			>
				<p class="text-center text-sm">{loadError}</p>
				<CtaButton onclick={loadSlots} size="sm" type="button" variant="peps">Réessayer</CtaButton>
			</div>
		{:else if slots.length === 0}
			<div
				class="border-light-blue/20 bg-dark-blue/80 text-light-blue/70 flex flex-col items-center justify-center gap-3 rounded-[26px] border p-10"
			>
				<p class="text-center text-sm">Aucune session ne vous est attribuée pour le moment.</p>
			</div>
		{:else}
			<div class="grid gap-6 min-[1040px]:grid-cols-[minmax(0,0.38fr)_1fr]">
				<SlotList
					{formatDate}
					{formatTimeRange}
					onSelectSlot={handleSlotChange}
					{selectedSlotId}
					{slots}
				/>

				<section class="border-light-blue/10 bg-blue-gray/15 rounded-[26px] border p-4 sm:p-6">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-lg font-semibold text-white">Présences</h2>
							<p class="text-light-blue/70 text-xs">
								{selectedSlot()?.name ?? 'Sélectionnez une session'}
							</p>
						</div>
						{#if selectedSlot()}
							<div class="flex flex-wrap">
								<CtaButton
									fullWidth={false}
									onclick={() => selectedSlotId && loadRegistrations(selectedSlotId)}
									size="sm"
									variant="secondary"
								>
									<RefreshCw class="str size-5" strokeWidth={3} />
								</CtaButton>
							</div>
						{/if}
					</div>

					<AttendanceMainInfo {formatDate} {formatTimeRange} selectedSlot={selectedSlot()} />

					{#if actionError}
						<p class="text-waiting mt-3 text-sm">{actionError}</p>
					{/if}

					{#if !selectedSlot()}
						<div
							class="border-light-blue/15 bg-blue-gray/15 text-light-blue/70 mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border p-8"
						>
							<p class="text-sm">Sélectionnez une session pour démarrer.</p>
						</div>
					{:else if registrationsLoading}
						<Spinner
							divClass="mt-6 rounded-2xl border border-light-blue/15 bg-blue-gray/15 p-8 text-light-blue/70"
						>
							Chargement des inscriptions
						</Spinner>
					{:else}
						<AttendanceStats
							absentCount={absentCount()}
							excuseCount={registrations.filter(
								(item) => item.status === 'registered' && item.to_excuse
							).length}
							presentCount={presentCount()}
							registeredCount={registeredCount()}
							unknownCount={unknownCount()}
						/>

						{#if registrations.length === 0}
							<div
								class="border-light-blue/15 bg-blue-gray/15 text-light-blue/70 mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border p-8"
							>
								<p class="text-sm">Aucune inscription pour cette session.</p>
							</div>
						{:else}
							<RegistrationMobileList
								{isSaving}
								onPresenceChange={handlePresenceChange}
								{presenceButtonClass}
								{registrations}
							/>
							<div
								class="presence-table-container border-light-blue/15 bg-blue-gray/15 mt-6 hidden overflow-hidden rounded-2xl border min-[1040px]:block"
							>
								<Table
									columns={presenceColumns}
									dbInfo={presenceDbInfo}
									filters={presenceFilters}
									pageSize={10}
									parseItems={parsePresenceItems}
									refreshTopic={presenceTableTopic}
									searchable="member_username"
								/>
							</div>
						{/if}
					{/if}
				</section>
			</div>
		{/if}
	</div>
</section>

<style>
	/* La table partagée garde ses couleurs d'admin : ici elle se fond dans la carte qui la contient
	   et reprend les libellés espacés en capitales du reste de la page. */
	.presence-table-container :global(section[aria-busy]) {
		border: 0;
		border-radius: 0;
		background-color: transparent;
	}
	.presence-table-container :global(thead) {
		background-color: color-mix(in oklab, var(--color-blue-gray) 15%, transparent);
		border-bottom: 1px solid color-mix(in oklab, var(--color-blue-gray) 50%, transparent);
	}
	.presence-table-container :global(thead th),
	.presence-table-container :global(thead th button) {
		letter-spacing: 0.32em;
		font-size: 0.625rem;
		font-weight: 400;
		color: var(--color-dark-light-blue);
		text-transform: uppercase;
	}
</style>
