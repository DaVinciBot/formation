<script lang="ts">
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';
	import type { TrainingCardStatus } from '$lib/components/training/TrainingCard.svelte';
	import { getWeekStart } from '$lib/components/training/helpers/calendar';
	import {
		getTrainingSlots,
		type RegistrationStatus,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { getSupabaseBrowserClient } from '$lib/supabaseClient';
	import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let { data } = $props();
	const currentUserId: string | null = $derived(data.userId ?? null);
	let canManageTraining = $derived(Boolean(data.canManageTraining));

	let slots: CalendarSlot[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let currentDate = $state(new Date());
	const WEEK_STORAGE_KEY = 'training_calendar_week_start';
	let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
	let realtimeChannel: RealtimeChannel | null = null;

	let supabaseClient: SupabaseClient | null = null;

	function getClient() {
		supabaseClient ??= getSupabaseBrowserClient() as SupabaseClient;
		return supabaseClient;
	}

	function resolveCardStatus(
		slot: TrainingSlotListItem,
		registrationStatus: RegistrationStatus | undefined,
		userId: string | null
	): TrainingCardStatus {
		if (slot.status === 'canceled' || slot.status === 'postponed' || slot.status === 'draft')
			return 'hidden';
		if (userId && slot.trainer_id === userId) return 'my';
		if (registrationStatus === 'registered') return 'registered';
		if (registrationStatus === 'waitlisted') return 'waiting';
		const hasCapacityInfo = slot.on_site_remaining !== null || slot.remote_remaining !== null;
		const isFull =
			hasCapacityInfo && (slot.on_site_remaining ?? 0) <= 0 && (slot.remote_remaining ?? 0) <= 0;
		return isFull && canManageTraining ? 'complete' : 'free';
	}

	function readStoredWeekStart(): Date | null {
		if (typeof localStorage === 'undefined') return null;
		const raw = localStorage.getItem(WEEK_STORAGE_KEY);
		if (!raw) return null;
		const parsed = new Date(raw);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function storeWeekStart(date: Date) {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(WEEK_STORAGE_KEY, date.toISOString());
		} catch {
			// ignore storage issues
		}
	}

	function scheduleSilentRefresh() {
		if (refreshTimeout) clearTimeout(refreshTimeout);
		refreshTimeout = setTimeout(() => {
			void loadWeek(currentDate, { silent: true });
		}, 250);
	}

	async function loadWeek(date: Date, options: { silent?: boolean } = {}) {
		currentDate = date;
		const weekStart = getWeekStart(date);
		if (!options.silent) {
			loading = true;
			error = null;
		}
		storeWeekStart(weekStart);
		try {
			const client = getClient();
			const rawSlots = await getTrainingSlots(client, weekStart, 7);
			const registrationStatuses = new SvelteMap<number, RegistrationStatus>();
			if (currentUserId && rawSlots.length > 0) {
				const slotIds = rawSlots.map((slot) => slot.slot_id);
				const { data: registrationData, error: registrationError } = await client
					.from('registration')
					.select('slot_id,status,remote')
					.eq('member_id', currentUserId)
					.in('slot_id', slotIds);
				if (registrationError) throw registrationError;
				for (const registration of registrationData ?? []) {
					if (registration.status === 'registered' || registration.status === 'waitlisted') {
						registrationStatuses.set(registration.slot_id, registration.status);
					}
				}
			}
			const visibleSlots = rawSlots.filter((slot) => {
				if (slot.status !== 'canceled' && slot.status !== 'postponed' && slot.status !== 'draft')
					return true;
				if (canManageTraining) return true;
				const registrationStatus = registrationStatuses.get(slot.slot_id);
				return registrationStatus === 'registered' || registrationStatus === 'waitlisted';
			});
			slots = visibleSlots.map((slot) => ({
				...slot,
				cardStatus: resolveCardStatus(slot, registrationStatuses.get(slot.slot_id), currentUserId)
			}));
		} catch (err) {
			console.error(err);
			if (!options.silent) {
				slots = [];
				error = 'Impossible de charger le calendrier pour cette semaine.';
			}
		} finally {
			if (!options.silent) {
				loading = false;
			}
		}
	}

	function setupRealtime() {
		realtimeChannel = getClient()
			.channel('training_calendar')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'registration' }, () =>
				scheduleSilentRefresh()
			)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'training_slot' }, () =>
				scheduleSilentRefresh()
			)
			.subscribe();
	}

	onMount(async () => {
		const savedWeek = readStoredWeekStart();
		void loadWeek(savedWeek ?? new Date());
		setupRealtime();
	});

	onDestroy(() => {
		if (refreshTimeout) clearTimeout(refreshTimeout);
		if (realtimeChannel) {
			realtimeChannel.unsubscribe();
			realtimeChannel = null;
		}
	});
</script>

<div class="px-6 pt-4 pb-6">
	<div class="h-[calc(100vh-8rem)]">
		<Calendar
			{slots}
			initialDate={currentDate}
			onWeekChange={loadWeek}
			onRegistrationChange={scheduleSilentRefresh}
			{canManageTraining}
			{currentUserId}
			isLoading={loading}
			errorMessage={error}
			onRetry={() => loadWeek(currentDate)}
		/>
	</div>
</div>
