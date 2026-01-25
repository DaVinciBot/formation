<script lang="ts">
	import { goto } from '$app/navigation';
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';
	import type { TrainingCardStatus } from '$lib/components/training/TrainingCard.svelte';
	import CtaButton from '$lib/components/utils/CTAButton.svelte';
	import {
		getTrainingSlots,
		type RegistrationStatus,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let slots: CalendarSlot[] = [];
	let loading = false;
	let error: string | null = null;

	function getWeekStart(date: Date) {
		const dayIndex = (date.getDay() + 6) % 7;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayIndex);
	}

	function resolveCardStatus(
		slot: TrainingSlotListItem,
		registrationStatus: RegistrationStatus | undefined,
		userId: string | null
	): TrainingCardStatus {
		if (userId && slot.trainer_id === userId) return 'my';
		if (slot.status === 'canceled' || slot.status === 'postponed') return 'canceled';
		if (registrationStatus === 'registered') return 'registered';
		if (slot.status === 'done') return 'complete';
		if (registrationStatus === 'waitlisted') return 'waiting';
		const hasCapacityInfo = slot.on_site_remaining !== null || slot.remote_remaining !== null;
		const isFull =
			hasCapacityInfo && (slot.on_site_remaining ?? 0) <= 0 && (slot.remote_remaining ?? 0) <= 0;
		return isFull ? 'complete' : 'free';
	}

	async function loadWeek(date: Date) {
		const weekStart = getWeekStart(date);
		loading = true;
		error = null;
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
					.select('slot_id,status')
					.eq('member_id', user.id)
					.in('slot_id', slotIds);
				if (registrationError) throw registrationError;
				for (const registration of registrationData ?? []) {
					if (registration.status === 'registered' || registration.status === 'waitlisted') {
						registrationStatuses.set(registration.slot_id, registration.status);
					}
				}
			}
			slots = rawSlots.map((slot) => ({
				...slot,
				cardStatus: resolveCardStatus(
					slot,
					registrationStatuses.get(slot.slot_id),
					user?.id ?? null
				)
			}));
		} catch (err) {
			console.error(err);
			slots = [];
			error = 'Impossible de charger le calendrier pour cette semaine.';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			const { data, error } = await supabase.rpc('has_permission', {
				p_permission: 'access_training'
			});
			if (error || !data) {
				await goto('unauthorized?redirect=/');
				return;
			}
			await loadWeek(new Date());
		} catch (err) {
			console.error(err);
			await goto('unauthorized?redirect=/');
		}
	});
</script>

<div class="px-6 py-6">
	<div class="h-[calc(100vh-8rem)]">
		{#if loading}
			<div
				class="flex h-full flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/40 bg-dark-blue/90 p-6 text-light-blue/80 shadow-[0_18px_60px_rgba(2,10,60,0.45)]"
			>
				<div class="flex items-center gap-3 text-xs tracking-[0.28em] uppercase">
					<span class="spinner" aria-hidden="true"></span>
					<span>Chargement du calendrier</span>
				</div>
			</div>
		{:else if error}
			<div
				class="flex h-full flex-col items-center justify-center rounded-[26px] border border-light-blue/40 bg-dark-blue/90 p-6 text-waiting shadow-[0_18px_60px_rgba(2,10,60,0.45)]"
			>
				<p class="text-sm tracking-wide">{error}</p>
				<div class="mt-3">
					<CtaButton type="button" variant="peps" size="sm" onclick={() => loadWeek(new Date())}>
						Réessayer
					</CtaButton>
				</div>
			</div>
		{:else}
			<Calendar {slots} onWeekChange={loadWeek} />
		{/if}
	</div>
</div>

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
