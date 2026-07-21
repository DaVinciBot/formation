<script lang="ts">
	interface AttendanceStatsProps {
		registeredCount?: number;
		presentCount?: number;
		absentCount?: number;
		unknownCount?: number;
	}

	const {
		registeredCount = 0,
		presentCount = 0,
		absentCount = 0,
		unknownCount = 0
	}: AttendanceStatsProps = $props();
</script>

<div class="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
	<div class="border-light-blue/15 bg-blue-gray/10 rounded-2xl border p-4">
		<p class="text-light-blue/60 text-xs tracking-[0.25em] uppercase">Inscrits</p>
		<p class="mt-1 text-2xl/6 font-semibold text-white">{registeredCount}</p>
	</div>
	<div class="rounded-2xl border border-green-400/25 bg-green-400/10 p-4">
		<p class="text-xs tracking-[0.25em] text-green-300 uppercase">Présents</p>
		<p class="mt-1 text-2xl/6 font-semibold text-green-300">{presentCount}</p>
	</div>
	<div class="rounded-2xl border border-red-400/25 bg-red-400/10 p-4">
		<p class="text-xs tracking-[0.25em] text-red-300 uppercase">Absents</p>
		<p class="mt-1 text-2xl/6 font-semibold text-red-300">{absentCount}</p>
	</div>
	<div class="border-light-blue/20 rounded-2xl border bg-blue-400/5 p-4">
		<p class="text-light-blue/60 text-xs tracking-[0.25em] uppercase">Non renseigné</p>
		<p class="text-light-blue mt-1 text-2xl/6 font-semibold">{unknownCount}</p>
	</div>
</div>
