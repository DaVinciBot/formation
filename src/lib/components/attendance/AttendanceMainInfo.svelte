<script lang="ts">
	import type { TrainingSlotListItem } from '@davincibot/lib';
	import { Calendar, Clock, MapPin } from '@lucide/svelte';

	interface AttendanceMainInfoProps {
		selectedSlot?: TrainingSlotListItem | null;
		formatDate: (value: string) => string;
		formatTimeRange: (startValue: string, durationHours: number) => string;
	}

	const { selectedSlot = null, formatDate, formatTimeRange }: AttendanceMainInfoProps = $props();
</script>

{#if selectedSlot}
	<div class="mt-3 grid gap-4 min-[1040px]:grid-cols-3 md:grid-cols-3">
		<div class="border-light-blue/20 bg-blue-gray/10 rounded-2xl border p-4">
			<div class="flex items-center gap-3">
				<div
					class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
				>
					<Calendar class="size-5.5" />
				</div>
				<div>
					<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">Date</p>
					<p class="text-light-blue m-0 text-sm font-semibold">
						{formatDate(selectedSlot.start)}
					</p>
				</div>
			</div>
		</div>
		<div class="border-light-blue/20 bg-blue-gray/10 rounded-2xl border p-4">
			<div class="flex items-center gap-3">
				<div
					class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
				>
					<Clock class="size-5.5" />
				</div>
				<div>
					<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">Horaire</p>
					<p class="text-light-blue m-0 text-sm font-semibold">
						{formatTimeRange(selectedSlot.start, selectedSlot.duration_hours)}
					</p>
				</div>
			</div>
		</div>
		<div class="border-light-blue/20 bg-blue-gray/10 rounded-2xl border p-4">
			<div class="flex items-center gap-3">
				<div
					class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
				>
					<MapPin class="size-5.5" />
				</div>
				<div>
					<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">Lieu</p>
					<p class="text-light-blue m-0 text-sm font-semibold">
						{selectedSlot.location ?? 'À définir'}
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}
