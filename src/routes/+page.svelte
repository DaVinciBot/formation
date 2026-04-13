<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';
	import type { TrainingCardStatus } from '$lib/components/training/TrainingCard.svelte';
	import { getWeekStart } from '$lib/components/training/helpers/calendar';
	import { type RegistrationStatus, type TrainingSlotListItem } from '$lib/services/training';
	import { SvelteMap } from 'svelte/reactivity';

	let { data } = $props<{ data: import('./$types').PageData }>();
	const currentUserId: string | null = $derived(data.userId ?? null);
	let canManageTraining = $derived(Boolean(data.canManageTraining));

	let slots: CalendarSlot[] = $state([]);
	let loading = $state(false);
	let error: string | null = $state(null);
	let currentDate = $state(new Date());
	const WEEK_STORAGE_KEY = 'training_calendar_week_start';

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

	function storeWeekStart(date: Date) {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(WEEK_STORAGE_KEY, date.toISOString());
		} catch {
			// ignore storage issues
		}
	}

	async function loadWeek(date: Date) {
		if (!browser) return;
		currentDate = date;
		const weekStart = getWeekStart(date);
		if (Number.isNaN(weekStart.getTime())) return;
		loading = true;
		error = null;
		storeWeekStart(weekStart);
		const targetWeek = weekStart.toISOString();
		const currentWeek = data.weekStart ?? '';
		if (currentWeek === targetWeek) {
			await invalidateAll();
		} else {
			await goto(`/?week=${encodeURIComponent(targetWeek)}`, {
				keepFocus: true,
				replaceState: true,
				noScroll: true
			});
		}
	}

	$effect(() => {
		if (data.weekStart) {
			const parsed = new Date(data.weekStart);
			if (!Number.isNaN(parsed.getTime())) currentDate = parsed;
		}
		error = data.errorMessage ?? null;
	});

	$effect(() => {
		const registrationStatuses = new SvelteMap<number, RegistrationStatus>();
		for (const registration of data.registrationStatuses ?? []) {
			if (registration.status === 'registered' || registration.status === 'waitlisted') {
				registrationStatuses.set(registration.slot_id, registration.status);
			}
		}
		const rawSlots = data.slots ?? [];
		const visibleSlots = rawSlots.filter((slot: TrainingSlotListItem) => {
			if (slot.status !== 'canceled' && slot.status !== 'postponed' && slot.status !== 'draft')
				return true;
			if (canManageTraining) return true;
			const registrationStatus = registrationStatuses.get(slot.slot_id);
			return registrationStatus === 'registered' || registrationStatus === 'waitlisted';
		});
		slots = visibleSlots.map((slot: TrainingSlotListItem) => ({
			...slot,
			cardStatus: resolveCardStatus(slot, registrationStatuses.get(slot.slot_id), currentUserId)
		}));
		loading = false;
	});
</script>

<div class="px-6 pt-4 pb-6">
	<div class="h-[calc(100vh-8rem)]">
		<Calendar
			{slots}
			initialDate={currentDate}
			onWeekChange={loadWeek}
			onRegistrationChange={() => loadWeek(currentDate)}
			{canManageTraining}
			{currentUserId}
			isLoading={loading}
			errorMessage={error}
			onRetry={() => loadWeek(currentDate)}
		/>
	</div>
</div>
