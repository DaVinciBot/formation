<script lang="ts" module>
	import type { TrainingSlotListItem } from '@davincibot/lib';
	import type { TrainingCardStatus } from '@davincibot/database-types';

	export type CalendarSlot = Omit<TrainingSlotListItem, 'start'> & {
		start: Date | string;
		cardStatus?: TrainingCardStatus;
	};
</script>

<script lang="ts">
	import { Checkbox } from '@davincibot/components';
	import { Spinner } from '@davincibot/components';
	import {
		filterSlotsByFormat,
		getCalendarDays,
		getWeekNumber,
		getWeekStart,
		groupSlotsByDay,
		toDateKey,
		weekdays
	} from '$lib/components/training/helpers/calendar';
	import { calendarFilters } from '$lib/components/training/stores/trainingCalendarFilters';
	import TrainingCard from '$lib/components/training/TrainingCard.svelte';
	import TrainingSlotModal from '$lib/components/training/TrainingSlotModal.svelte';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import { formatParisDayShort, getParisDateUtc } from '@davincibot/lib';
	import { CalendarSync } from '@lucide/svelte';
	import { onMount, tick } from 'svelte';

	interface Props {
		slots?: CalendarSlot[];
		initialDate?: Date;
		onSelectSlot?: (slot: CalendarSlot) => void;
		onSelectDay?: (date: Date) => void;
		onWeekChange?: (weekStart: Date) => void;
		onRegistrationChange?: () => void;
		canManageTraining?: boolean;
		currentUserId?: string | null;
		isLoading?: boolean;
		errorMessage?: string | null;
		onRetry?: () => void;
	}

	let {
		slots = [],
		initialDate = new Date(),
		onSelectSlot,
		onSelectDay,
		onWeekChange,
		onRegistrationChange,
		canManageTraining = false,
		currentUserId = null,
		isLoading = false,
		errorMessage = null,
		onRetry
	}: Props = $props();

	let isInPerson = $state(false);
	let isOnline = $state(false);
	let selectedSlot = $state<CalendarSlot | null>(null);
	let isModalOpen = $state(false);
	let filtersReady = $state(false);
	let todayRow: HTMLDivElement | null = $state(null);
	let autoAdvanceToNextWeek = $state<'initial' | 'today' | null>('initial');
	let hasSeenCalendarLoading = $state(false);

	let viewDate = $derived(getParisDateUtc(new Date()) ?? new Date());
	const ONE_DAY_MS = 24 * 60 * 60 * 1000;

	$effect(() => {
		viewDate = getParisDateUtc(initialDate) ?? new Date();
	});

	$effect(() => {
		if (!filtersReady) {
			return;
		}
		calendarFilters.update((current) => {
			if (current.inPerson === isInPerson && current.online === isOnline) {
				return current;
			}
			return { inPerson: isInPerson, online: isOnline };
		});
	});

	$effect(() => {
		if (isLoading) {
			hasSeenCalendarLoading = true;
			return;
		}
		if (!hasSeenCalendarLoading) {
			return;
		}
		if (!autoAdvanceToNextWeek) {
			return;
		}
		if (errorMessage) {
			autoAdvanceToNextWeek = null;
			return;
		}

		if (!shouldAutoAdvanceWeek(viewDate)) {
			autoAdvanceToNextWeek = null;
			return;
		}

		autoAdvanceToNextWeek = null;
		setViewDate(new Date(getWeekStart(viewDate).getTime() + 7 * ONE_DAY_MS));
	});

	onMount(() => {
		const unsubscribe = calendarFilters.subscribe((value) => {
			isInPerson = value.inPerson;
			isOnline = value.online;
		});
		filtersReady = true;
		return () => {
			unsubscribe();
		};
	});

	onMount(async () => {
		if (typeof window === 'undefined') {
			return;
		}
		if (!window.matchMedia('(max-width: 1023px)').matches) {
			return;
		}
		await tick();
		scrollTodayRowIntoView();
	});

	const weekStart = $derived(() => getWeekStart(viewDate));
	const weekLabel = $derived(() => `Semaine ${String(getWeekNumber(viewDate))}`);

	const allSlotsByDay = $derived(() => groupSlotsByDay(slots));
	const saturdayKey = $derived(() =>
		toDateKey(new Date(weekStart().getTime() + 5 * 24 * 60 * 60 * 1000))
	);
	const showSaturday = $derived(() => (allSlotsByDay().get(saturdayKey()) ?? []).length > 0);
	const calendarDays = $derived(() => {
		const days = getCalendarDays(weekStart());
		return showSaturday() ? days : days.slice(0, 5);
	});
	const calendarDaysCount = $derived(() => calendarDays().length);
	const calendarGridTemplate = $derived(
		() => `grid-template-columns: repeat(${String(calendarDaysCount())}, minmax(0, 1fr));`
	);

	const filteredSlots = $derived(() =>
		filterSlotsByFormat(slots, { inPerson: isInPerson, online: isOnline })
	);

	const slotsByDay = $derived(() => groupSlotsByDay(filteredSlots()));

	function setViewDate(date: Date) {
		viewDate = date;
		onWeekChange?.(getWeekStart(date));
	}

	function shouldAutoAdvanceWeek(date: Date) {
		const today = getParisDateUtc(new Date()) ?? new Date();
		const todayWeekStart = getWeekStart(today);
		const viewedWeekStart = getWeekStart(date);
		if (todayWeekStart.getTime() !== viewedWeekStart.getTime()) {
			return false;
		}

		const todayKey = toDateKey(today);
		for (const slot of slots) {
			const slotDate = new Date(slot.start);
			if (Number.isNaN(slotDate.getTime())) {
				continue;
			}
			if (toDateKey(slotDate) >= todayKey) {
				return false;
			}
		}

		return true;
	}

	function goPrev() {
		autoAdvanceToNextWeek = null;
		setViewDate(new Date(viewDate.getTime() - 7 * ONE_DAY_MS));
	}

	function goNext() {
		autoAdvanceToNextWeek = null;
		setViewDate(new Date(viewDate.getTime() + 7 * ONE_DAY_MS));
	}

	function goToday() {
		autoAdvanceToNextWeek = 'today';
		setViewDate(getParisDateUtc(new Date()) ?? new Date());
		void scrollToToday();
	}

	async function scrollToToday() {
		if (typeof window === 'undefined') {
			return;
		}
		if (!window.matchMedia('(max-width: 1023px)').matches) {
			return;
		}
		await tick();
		scrollTodayRowIntoView();
	}

	function scrollTodayRowIntoView() {
		const row = todayRow;
		if (!row) {
			return;
		}
		row.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	function handleSlotSelect(slot: CalendarSlot) {
		selectedSlot = slot;
		isModalOpen = true;
		onSelectSlot?.(slot);
	}

	function handleModalClose() {
		isModalOpen = false;
	}

	function handleDaySelect(date: Date) {
		onSelectDay?.(date);
	}

	function weekdayLabel(index: number) {
		return weekdays[index] ?? '';
	}

	// TODO: order by date and time
</script>

<section
	class="border-light-blue/15 bg-blue-gray/15 flex h-full flex-col rounded-[26px] border p-4 shadow-[0_18px_60px_rgba(2,10,60,0.45)] sm:p-6"
>
	<header
		class="border-light-blue/30 bg-blue-gray/10 text-light-blue flex flex-col gap-2 rounded-[22px] border px-3 py-3 text-sm shadow-[0_14px_40px_rgba(1,4,30,0.55)] lg:hidden"
	>
		<div class="grid grid-cols-3 gap-1">
			<div class="wrap left-center inset-y-0 col-span-2 flex flex-row items-center gap-2">
				<CtaButton
					class="border-light-blue/0 text-dark-light-blue flex items-center justify-center rounded-full"
					aria-label="Semaine précédente"
					fullWidth={false}
					onclick={goPrev}
					size="xs"
					type="button"
					variant="secondary"
				>
					<svg
						class="size-4"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.6"
						viewBox="0 0 12 12"
					>
						<path d="M7.5 2.5 4 6l3.5 3.5" />
					</svg>
				</CtaButton>
				<span class="text-dark-light-blue text-center text-[0.75rem] tracking-[0.3em] uppercase">
					{weekLabel()}
				</span>
				<CtaButton
					class="border-light-blue/0 text-dark-light-blue flex items-center justify-center rounded-full"
					aria-label="Semaine suivante"
					fullWidth={false}
					onclick={goNext}
					size="xs"
					type="button"
					variant="secondary"
				>
					<svg
						class="size-4"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.6"
						viewBox="0 0 12 12"
					>
						<path d="M4.5 2.5 8 6l-3.5 3.5" />
					</svg>
				</CtaButton>
			</div>
			<CtaButton
				class="border-light-blue/0 col-span-1 flex items-center justify-end rounded-full text-[0.7rem] uppercase"
				fullWidth={false}
				onclick={goToday}
				size="sm"
				type="button"
				variant="secondary"
				><CalendarSync class="size-4.5" />
			</CtaButton>
		</div>
		<div class="flex flex-row gap-3 pb-2">
			<label
				class="text-dark-light-blue flex cursor-pointer items-center gap-1.5 px-1 text-[0.62rem] tracking-widest uppercase"
			>
				<Checkbox name="filter_in_person" required value="in-person" bind:checked={isInPerson} />
				Présentiel
			</label>
			<label
				class="text-dark-light-blue flex cursor-pointer items-center gap-1.5 px-1 text-[0.62rem] tracking-widest uppercase"
			>
				<Checkbox name="filter_online" value="online" bind:checked={isOnline} />
				En ligne
			</label>
		</div>
	</header>
	<header
		class="border-light-blue/30 bg-blue-gray/10 text-light-blue hidden flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm lg:flex"
	>
		<div class="flex flex-wrap items-center gap-6">
			<label
				class="text-dark-light-blue flex cursor-pointer items-center gap-2 text-xs tracking-[0.28em] uppercase"
			>
				<Checkbox
					name="filter_in_person"
					className="size-4"
					required
					value="in-person"
					bind:checked={isInPerson}
				/>
				Présentiel
			</label>
			<label
				class="text-dark-light-blue flex cursor-pointer items-center gap-2 text-xs tracking-[0.28em] uppercase"
			>
				<Checkbox name="filter_online" className="size-4" value="online" bind:checked={isOnline} />
				En ligne
			</label>
		</div>
		<div
			class="grid {canManageTraining
				? 'grid-cols-[min-content_auto_min-content_min-content_auto]'
				: 'grid-cols-[min-content_auto_min-content_min-content]'} text-dark-light-blue items-center gap-3 text-xs tracking-[0.3em] uppercase"
		>
			<CtaButton
				class="border-light-blue/0 flex size-7 items-center justify-center pr-1 pl-1"
				aria-label="Semaine précédente"
				onclick={goPrev}
				size="sm"
				type="button"
				variant="secondary"
			>
				<svg
					class="size-4.5"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.6"
					viewBox="0 0 12 12"
				>
					<path d="M7.5 2.5 4 6l3.5 3.5" />
				</svg>
			</CtaButton>
			<span class="text-dark-light-blue text-[0.8rem] uppercase">{weekLabel()}</span>
			<CtaButton
				class="border-light-blue/0 flex size-7 items-center justify-center pr-1 pl-1"
				aria-label="Semaine suivante"
				onclick={goNext}
				size="sm"
				type="button"
				variant="secondary"
			>
				<svg
					class="size-4.5"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.6"
					viewBox="0 0 12 12"
				>
					<path d="M4.5 2.5 8 6l-3.5 3.5" />
				</svg>
			</CtaButton>
			<CtaButton
				class="border-light-blue/0 flex size-7 items-center pr-1 pl-1 uppercase"
				onclick={goToday}
				size="sm"
				type="button"
				variant="secondary"
				><CalendarSync class="size-4.5" />
			</CtaButton>
		</div>
	</header>

	<div class="mt-4 hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
		<div
			style={calendarGridTemplate()}
			class="border-light-blue/30 bg-blue-gray/25 text-light-blue grid rounded-t-xl border text-sm tracking-[0.2em] uppercase"
		>
			{#each calendarDays() as day, index (index)}
				<button
					class={`border-light-blue/30 flex items-center justify-center gap-2 px-3 py-3 ${
						index !== calendarDaysCount() - 1 ? 'border-r' : ''
					} ${day.isToday ? 'text-primary-400' : ''}`}
					onclick={() => {
						handleDaySelect(day.date);
					}}
					type="button"
				>
					<span>{weekdayLabel(index).substring(0, 3)}</span>
					<span>{formatParisDayShort(day.date)}</span>
				</button>
			{/each}
		</div>
		<div
			class="no-scrollbar border-light-blue/30 bg-blue-gray/10 relative min-h-0 flex-1 overflow-y-auto rounded-b-xl border-x border-b"
		>
			{#if errorMessage}
				<div class="flex min-h-full items-center justify-center p-6">
					<div class="text-waiting flex flex-col items-center gap-3">
						<p class="text-sm tracking-wide">{errorMessage}</p>
						{#if onRetry}
							<CtaButton onclick={onRetry} size="sm" type="button" variant="peps">
								Réessayer
							</CtaButton>
						{/if}
					</div>
				</div>
			{:else}
				<div style={calendarGridTemplate()} class="grid min-h-full">
					{#each calendarDays() as day, index (index)}
						<div
							class={`border-light-blue/30 h-full overflow-hidden ${
								index !== calendarDaysCount() - 1 ? 'border-r' : ''
							}`}
						>
							<div class="flex h-full flex-col gap-3 p-3">
								{#each slotsByDay().get(day.key) ?? [] as slot (slot.slot_id)}
									<button
										onclick={() => {
											handleSlotSelect(slot);
										}}
										tabindex="0"
										type="button"
									>
										<TrainingCard {slot} status={slot.cardStatus ?? 'free'} />
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
			{#if isLoading}
				<div class="bg-dark-blue/70 absolute inset-0 flex items-center justify-center">
					<Spinner
						divClass="rounded-[22px] border border-light-blue/30 bg-dark-blue/80 px-5 py-4 text-light-blue/80"
					>
						Chargement du calendrier
					</Spinner>
				</div>
			{/if}
		</div>
	</div>

	<div
		class="no-scrollbar border-light-blue/30 bg-blue-gray/20 relative mt-4 flex-1 overflow-y-auto rounded-2xl border p-3 lg:hidden"
	>
		{#if errorMessage}
			<div class="flex min-h-48 items-center justify-center px-3 py-8">
				<div class="text-waiting flex flex-col items-center gap-3">
					<p class="text-sm tracking-wide">{errorMessage}</p>
					{#if onRetry}
						<CtaButton onclick={onRetry} size="sm" type="button" variant="peps">
							Réessayer
						</CtaButton>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each calendarDays() as day, index (index)}
					{#if day.isToday}
						<div bind:this={todayRow} class="flex scroll-mt-4 flex-col gap-2">
							<button
								class="border-primary-400/60 text-primary-400 flex h-14 w-full flex-col items-center justify-center rounded-[14px] text-center tracking-[0.32em]
								"
								onclick={() => {
									handleDaySelect(day.date);
								}}
								type="button"
							>
								<span class="text-[0.72rem] uppercase">
									{weekdayLabel(index)}
								</span>
								<span class="font-semibold">{formatParisDayShort(day.date)}</span>
							</button>
							<div class="mb-5 flex flex-1 flex-col gap-2">
								{#if (slotsByDay().get(day.key) ?? []).length === 0}
									<div
										class="border-light-blue/30 text-dark-light-blue flex h-14 w-full items-center justify-center rounded-lg border bg-[rgba(1,1,50,0.96)] px-2 text-[0.7rem] tracking-[0.24em] uppercase"
									>
										Aucune formation
									</div>
								{:else}
									{#each slotsByDay().get(day.key) ?? [] as slot (slot.slot_id)}
										<button
											onclick={() => {
												handleSlotSelect(slot);
											}}
											tabindex="0"
											type="button"
										>
											<TrainingCard
												{slot}
												className="text-left"
												status={slot.cardStatus ?? 'free'}
												variant="compact"
											/>
										</button>
									{/each}
								{/if}
							</div>
						</div>
					{:else}
						<div class="flex flex-col gap-2">
							<button
								class="border-light-blue/30 text-light-blue h-14 w-full flex-col items-center justify-center rounded-[14px] text-center tracking-[0.32em] not-last:flex"
								onclick={() => {
									handleDaySelect(day.date);
								}}
								type="button"
							>
								<span class="text-[0.72rem] uppercase">
									{weekdayLabel(index)}
								</span>
								<span class="font-semibold">{formatParisDayShort(day.date)}</span>
							</button>
							<div class="mb-4 flex flex-1 flex-col gap-2">
								{#if (slotsByDay().get(day.key) ?? []).length === 0}
									<div
										class="border-light-blue/30 text-dark-light-blue flex h-14 w-full items-center justify-center rounded-lg border bg-[rgba(1,1,50,0.96)] px-2 text-[0.7rem] tracking-[0.24em] uppercase"
									>
										Aucune formation
									</div>
								{:else}
									{#each slotsByDay().get(day.key) ?? [] as slot (slot.slot_id)}
										<button
											onclick={() => {
												handleSlotSelect(slot);
											}}
											tabindex="0"
											type="button"
										>
											<TrainingCard
												{slot}
												className="text-left"
												status={slot.cardStatus ?? 'free'}
												variant="compact"
											/>
										</button>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		{#if isLoading}
			<div class="bg-dark-blue/70 absolute inset-0 flex items-center justify-center">
				<Spinner
					divClass="rounded-[22px] border border-light-blue/30 bg-dark-blue/80 px-5 py-4 text-light-blue/80"
				>
					Chargement du calendrier
				</Spinner>
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2 pt-2 pl-0.5 text-xs tracking-wide sm:gap-3 sm:pt-4 sm:text-sm">
		<div class="border-light-blue text-light-blue rounded-2xl border px-2 py-0">Libre</div>
		<div class="border-registered text-registered rounded-2xl border px-2 py-0">Inscrit·e</div>
		<div class="border-waiting text-waiting rounded-2xl border px-2 py-0">Sur liste d'attente</div>
		<div class="border-primary-500 text-primary-500 rounded-2xl border px-2 py-0">Ma formation</div>
		{#if canManageTraining}
			<div class="border-complete text-complete rounded-2xl border px-2 py-0">Complète</div>
			<div
				class="border-dark-blue-gray text-dark-blue-gray rounded-2xl border px-2 py-0 opacity-55"
			>
				Masquée
			</div>
		{/if}
	</div>
</section>

<TrainingSlotModal
	slot={selectedSlot}
	{canManageTraining}
	{currentUserId}
	onClose={handleModalClose}
	{onRegistrationChange}
	open={isModalOpen}
/>

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
