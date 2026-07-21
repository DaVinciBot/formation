<script lang="ts">
	import { formatParisTimeRange } from '@davincibot/lib';
	import type { TrainingSlotListItem } from '@davincibot/lib';
	import { Clock, MapPin, UserRound } from '@lucide/svelte';
	import type { TrainingCardStatus } from '@davincibot/database-types';

	type TrainingSlotView = Omit<TrainingSlotListItem, 'start'> & {
		start: Date | string;
	};

	interface TrainingCardProps {
		slot: TrainingSlotView;
		status: TrainingCardStatus;
		className?: string;
		variant?: 'default' | 'compact';
	}

	const { slot, status, className = '', variant = 'default' }: TrainingCardProps = $props();

	function formatTimeRange(startValue: Date | string, durationHours: number) {
		return formatParisTimeRange(startValue, durationHours);
	}
	function getConfirmedRegistrations(slot: TrainingSlotView) {
		return (slot.on_site_registered ?? 0) + (slot.remote_registered ?? 0);
	}
</script>

{#if variant === 'compact'}
	<article
		class={`training-card--${status} border-light-blue/30 w-full cursor-pointer rounded-lg border border-l-8 border-l-(--card-color) bg-[rgba(1,1,50,0.96)] px-2 py-1 ${className}`.trim()}
	>
		<div class="flex min-h-14 items-center justify-between gap-3">
			<h3 class="line-clamp-2 min-w-0 flex-1 shrink grow-2 basis-auto text-[0.95rem] font-semibold">
				{slot.name}
			</h3>
			<div class="flex shrink-2 grow basis-auto flex-col items-end text-right">
				<span class="text-dark-light-blue text-[0.8rem] whitespace-nowrap">
					{formatTimeRange(slot.start, slot.duration_hours)}
				</span>
				{#if status === 'my'}
					<span class="text-dark-light-blue line-clamp-1 text-[0.8rem]">
						{getConfirmedRegistrations(slot)} inscrit·e{getConfirmedRegistrations(slot) > 1
							? '·s'
							: ''}
					</span>
				{:else}
					<span class="text-dark-light-blue line-clamp-1 text-[0.8rem]">
						{slot.location ?? '-'}
					</span>
				{/if}
			</div>
		</div>
	</article>
{:else}
	<article
		class={`training-card--${status} shadow-[0_10px_24px_rgba(0,0,0,0.35)]} border-light-blue/30 w-full cursor-pointer rounded-[8px] border-1 border-l-8 border-l-[var(--card-color)] bg-[rgba(1,1,50,0.96)] px-[12px] py-[8px] ${className}`.trim()}
	>
		<h3
			class={`training-card__title m-0 mb-1 overflow-hidden text-start text-[1.0rem] font-bold text-ellipsis`.trim()}
		>
			{slot.name}
		</h3>
		<div class="flex flex-col gap-1 text-left font-semibold">
			<div class="flex flex-wrap items-center gap-x-2">
				<span class="text-dark-light-blue text-[0.85rem]"><Clock class="size-4" /></span>
				<span class="text-dark-light-blue text-[0.8rem]">
					{formatTimeRange(slot.start, slot.duration_hours)}
				</span>
			</div>
			{#if status === 'my'}
				<div class="flex flex-wrap items-center gap-x-2">
					<span class="text-dark-light-blue text-[0.85rem]"><UserRound class="size-4" /></span>
					<span class="text-dark-light-blue text-[0.8rem]">
						{getConfirmedRegistrations(slot)} inscrit·e{getConfirmedRegistrations(slot) > 1
							? '·s'
							: ''}
					</span>
				</div>
			{:else}
				<div class="flex flex-wrap items-center gap-x-2">
					<span class="text-dark-light-blue text-[0.85rem]"><MapPin class="size-4" /></span>
					<span class="text-dark-light-blue text-[0.8rem]">
						{slot.location ?? '-'}
					</span>
				</div>
			{/if}
		</div>
	</article>
{/if}

<style>
	.training-card--complete {
		--card-color: var(--color-complete);
	}

	.training-card--free {
		--card-color: var(--color-light-blue);
	}

	.training-card--hidden {
		--card-color: var(--color-dark-blue-gray);
		opacity: 0.55;
	}

	.training-card--registered {
		--card-color: var(--color-registered);
	}

	.training-card--waiting {
		--card-color: var(--color-waiting);
	}

	.training-card--my {
		--card-color: var(--color-primary-500);
	}
</style>
