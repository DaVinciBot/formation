<script lang="ts">
	import { formatParisTimeRange } from '@davincibot/lib';
	import type { TrainingSlotListItem } from '@davincibot/lib';
	import { Clock, Hourglass, MapPin, UserRound } from '@lucide/svelte';
	import type { TrainingCardStatus } from '@davincibot/database-types';

	type TrainingSlotView = Omit<TrainingSlotListItem, 'start'> & {
		start: Date | string;
	};

	interface Props {
		slot: TrainingSlotView;
		status: TrainingCardStatus;
		className?: string;
		variant?: 'default' | 'compact';
	}

	let { slot, status, className = '', variant = 'default' }: Props = $props();

	function formatTimeRange(startValue: Date | string, durationHours: number) {
		return formatParisTimeRange(startValue, durationHours);
	}
	function getConfirmedRegistrations(slot: TrainingSlotView) {
		return (slot.on_site_registered ?? 0) + (slot.remote_registered ?? 0);
	}
</script>

<!-- eslint-disable @typescript-eslint/no-confusing-void-expression -- {@render} est vu comme une expression void imbriquée par la règle ; les snippets sont pourtant la bonne forme ici -->

{#if variant === 'compact'}
	<article
		class={`training-card--${status} border-light-blue/30 hover:border-light-blue/60 w-full cursor-pointer rounded-lg border border-l-8 border-l-(--card-color) bg-[rgba(1,1,50,0.96)] px-2 py-1 transition hover:brightness-125 ${className}`.trim()}
	>
		<div class="flex min-h-14 items-center justify-between gap-3">
			<div class="min-w-0 flex-1 shrink grow-2 basis-auto">
				<h3 class="line-clamp-2 text-[0.95rem] font-semibold">
					{slot.name}
				</h3>
				{#if status === 'complete'}
					{@render waitlistBadge()}
				{/if}
			</div>
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
		class={`training-card--${status} shadow-[0_10px_24px_rgba(0,0,0,0.35)]} border-light-blue/30 hover:border-light-blue/60 w-full cursor-pointer rounded-[8px] border-1 border-l-8 border-l-[var(--card-color)] bg-[rgba(1,1,50,0.96)] px-[12px] py-[8px] transition hover:brightness-125 ${className}`.trim()}
	>
		<h3
			class={`training-card__title m-0 mb-1 overflow-hidden text-start text-[1.0rem] font-bold text-ellipsis`.trim()}
		>
			{slot.name}
		</h3>
		{#if status === 'complete'}
			{@render waitlistBadge()}
		{/if}
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

<!-- #46 — une session pleine n'est pas fermée : sa liste d'attente est ouverte, et le
     dire invite à cliquer plutôt que de dissuader comme le faisait le rouge. -->
{#snippet waitlistBadge()}
	<span
		class="text-dark-light-blue mt-0.5 inline-flex items-center gap-1 text-[0.7rem] font-semibold tracking-wide"
	>
		<Hourglass class="size-3" />
		Complet · liste d'attente ouverte
	</span>
{/snippet}

<style>
	.training-card--complete {
		--card-color: var(--color-dark-light-blue);
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
