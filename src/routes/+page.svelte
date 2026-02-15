<script lang="ts">
	import { goto } from '$app/navigation';
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';
	import type { TrainingCardStatus } from '$lib/components/training/TrainingCard.svelte';
	import { getWeekStart } from '$lib/components/training/helpers/calendar';
	import {
		getTrainingSlots,
		type RegistrationStatus,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { supabase } from '$lib/supabaseClient';
	import { onDestroy, onMount } from 'svelte';

	let slots: CalendarSlot[] = [];
	let loading = false;
	let error: string | null = null;
	let currentDate = new Date();
	const WEEK_STORAGE_KEY = 'training_calendar_week_start';
	let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
	let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
	let canManageTraining = false;

	function resolveCardStatus(
		slot: TrainingSlotListItem,
		registrationStatus: RegistrationStatus | undefined,
		userId: string | null
	): TrainingCardStatus {
		if (userId && slot.trainer_id === userId) return 'my';
		if (slot.status === 'canceled' || slot.status === 'postponed' || slot.status === 'draft')
			return 'hidden';
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
		} catch (err) {
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
			const rawSlots = await getTrainingSlots(weekStart, 7);
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser();
			if (userError) throw userError;
			const registrationStatuses = new Map<number, RegistrationStatus>();
			if (user && rawSlots.length > 0) {
				const slotIds = rawSlots.map((slot) => slot.slot_id);
				const { data: registrationData, error: registrationError } = await supabase
					.from('registration')
					.select('slot_id,status,remote')
					.eq('member_id', user.id)
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
				cardStatus: resolveCardStatus(
					slot,
					registrationStatuses.get(slot.slot_id),
					user?.id ?? null
				)
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
		realtimeChannel = supabase
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
		try {
			const { data, error } = await supabase.rpc('has_permission', {
				p_permission: 'access_training'
			});
			if (error || !data) {
				await goto('unauthorized?redirect=/formation');
				return;
			}
			const { data: manageData, error: manageError } = await supabase.rpc('has_permission', {
				p_permission: 'manage_training'
			});
			canManageTraining = !manageError && Boolean(manageData);
			const savedWeek = readStoredWeekStart();
			await loadWeek(savedWeek ?? new Date());
			setupRealtime();
		} catch (err) {
			console.error(err);
			await goto('unauthorized?redirect=/formation');
		}
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
			isLoading={loading}
			errorMessage={error}
			onRetry={() => loadWeek(currentDate)}
		/>
	</div>
</div>
