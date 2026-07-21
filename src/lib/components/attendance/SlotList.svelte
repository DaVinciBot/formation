<script lang="ts">
	import type { TrainingSlotListItem } from '@davincibot/lib';
	import { Clock, MapPin } from '@lucide/svelte';

	interface SlotListProps {
		slots?: TrainingSlotListItem[];
		selectedSlotId?: number | null;
		onSelectSlot: (slotId: number) => void;
		formatDate: (value: string) => string;
		formatTimeRange: (startValue: string, durationHours: number) => string;
	}

	const {
		slots = [],
		selectedSlotId = null,
		onSelectSlot,
		formatDate,
		formatTimeRange
	}: SlotListProps = $props();
</script>

<section
	class="border-light-blue/10 bg-blue-gray/15 h-fit max-h-full min-h-fit rounded-[26px] border p-4 sm:p-6"
>
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold text-white">Mes sessions</h2>
			<p class="text-light-blue/70 text-xs">{slots.length} session(s)</p>
		</div>
	</div>
	<div class="mt-5 grid gap-3">
		{#each slots as slot (slot.slot_id)}
			<button
				type="button"
				class={`flex w-full cursor-pointer flex-col gap-2 rounded-2xl border p-3 text-left transition sm:p-4 ${
					slot.slot_id === selectedSlotId
						? 'border-light-blue/20 bg-blue-gray/25 text-light-blue'
						: 'border-light-blue/15 bg-blue-gray/10 text-light-blue/70 hover:border-light-blue/40'
				}`}
				onclick={() => {
					onSelectSlot(slot.slot_id);
				}}
			>
				<p class="text-sm font-semibold text-white">{slot.name}</p>
				<p class="text-dark-light-blue text-xs tracking-[0.2em] uppercase">
					<Clock class="mb-0.5 inline-block size-3" />
					{formatDate(slot.start)} · {formatTimeRange(slot.start, slot.duration_hours)}
				</p>
				<p class="text-light-blue/70 text-xs">
					<MapPin class="mr-0.75 mb-0.5 inline-block size-3" />
					{slot.location ?? 'Lieu à définir'}
				</p>
			</button>
		{/each}
	</div>
</section>
