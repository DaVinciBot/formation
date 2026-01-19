<script lang="ts">
	import Calendar, { type CalendarSlot } from '$lib/components/training/Calendar.svelte';

	function makeDate(dayOffset: number, hour: number, minute: number = 0): Date {
		const date = new Date();
		date.setDate(date.getDate() + dayOffset);
		date.setHours(hour, minute, 0, 0);
		return date;
	}

	const demoSlots: CalendarSlot[] = [
		{
			id: 1,
			title: 'Formation',
			start: makeDate(0, 9),
			duration_hours: 2,
			status: 'complete',
			location: 'Local'
		},
		{
			id: 55,
			title: 'Formation',
			start: makeDate(0, 9, 30),
			duration_hours: 1.5,
			status: 'complete',
			location: 'Local'
		},
		{
			id: 2,
			title: 'Test',
			start: makeDate(1, 11),
			duration_hours: 3 / 4,
			status: 'free',
			location: 'Local'
		},
		{
			id: 3,
			title: 'Svelte',
			start: makeDate(3, 14),
			duration_hours: 1.5,
			status: 'waiting',
			location: 'Local'
		},
		{
			id: 4,
			title: 'Formation',
			start: makeDate(4, 16),
			duration_hours: 1,
			status: 'registered',
			location: 'Local'
		},
		{
			id: 5,
			title: 'Formation',
			start: makeDate(5, 18),
			duration_hours: 2,
			status: 'canceled',
			location: 'Local'
		},
		{
			id: 6,
			title: 'Formation',
			start: makeDate(5, 18),
			duration_hours: 2,
			status: 'my',
			location: 'Local',
			registrations: 5
		}
	];
</script>

<div class="space-y-10 px-6 py-6">
	<div class="h-[calc(100vh-8rem)]">
		<Calendar slots={demoSlots} />
	</div>
</div>
