<script lang="ts">
	import { CircleCheck, CircleX, Users } from '@lucide/svelte';

	interface PresenceActionsCellProps {
		memberId: string;
		present: boolean | null;
		status: string;
		isSaving?: boolean;
		onChange: (memberId: string, present: boolean | null) => void;
		presenceButtonClass: (value: boolean | null, current: boolean | null) => string;
	}

	const {
		memberId,
		present,
		status,
		isSaving = false,
		onChange,
		presenceButtonClass
	}: PresenceActionsCellProps = $props();
</script>

{#if status === 'registered'}
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
				null,
				present
			)}`}
			disabled={isSaving}
			onclick={() => {
				onChange(memberId, null);
			}}
		>
			<Users class="size-3" />
			NSP
		</button>
		<button
			type="button"
			class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
				true,
				present
			)}`}
			disabled={isSaving}
			onclick={() => {
				onChange(memberId, true);
			}}
		>
			<CircleCheck class="size-3" />
			Présent
		</button>
		<button
			type="button"
			class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
				false,
				present
			)}`}
			disabled={isSaving}
			onclick={() => {
				onChange(memberId, false);
			}}
		>
			<CircleX class="size-3" />
			Absent
		</button>
	</div>
{:else}
	<span class="text-light-blue/60 text-xs">--</span>
{/if}
