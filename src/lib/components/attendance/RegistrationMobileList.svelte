<script lang="ts">
	import type { RegistrationListItem } from '@davincibot/lib';
	import { CircleCheck, CircleX, Users } from '@lucide/svelte';

	interface Props {
		registrations?: RegistrationListItem[];
		isSaving: (memberId: string) => boolean;
		onPresenceChange: (memberId: string, present: boolean | null) => void;
		presenceButtonClass: (value: boolean | null, current: boolean | null) => string;
	}

	let { registrations = [], isSaving, onPresenceChange, presenceButtonClass }: Props = $props();
</script>

<div class="mt-4 grid gap-4 min-[1040px]:hidden">
	{#each registrations as reg (reg.member_id)}
		<div class="border-light-blue/20 bg-blue-gray/10 rounded-2xl border p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					{#if reg.member_avatar_url}
						<img
							class="h-8 w-8 rounded-full"
							alt={reg.member_username ?? 'Membre'}
							src={reg.member_avatar_url}
						/>
					{/if}
					<div class="flex flex-col gap-0">
						<p class="m-0 text-sm font-semibold text-white">
							{reg.member_username ?? 'Membre'}
						</p>
						{#if reg.to_excuse}
							<span class="text-waiting inline-flex text-[0.6rem] tracking-[0.25em] uppercase">
								Excuse demandée
							</span>
						{/if}
					</div>
				</div>
				<span
					class={`inline-flex rounded-full border px-2.5 py-1 text-[0.6rem] tracking-[0.25em] uppercase ${
						reg.status === 'registered'
							? 'border-registered/40 text-registered'
							: 'border-waiting/40 text-waiting'
					}`}
				>
					{reg.status === 'registered' ? 'Inscrit·e' : 'En attente'}
				</span>
			</div>
			<div class="text-light-blue/70 mt-3 flex items-center justify-between text-xs">
				<span>{reg.remote ? 'Distanciel' : 'Présentiel'}</span>
			</div>
			{#if reg.status === 'registered'}
				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button
						class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
							null,
							reg.present
						)}`}
						disabled={isSaving(reg.member_id)}
						onclick={() => {
							onPresenceChange(reg.member_id, null);
						}}
						type="button"
					>
						<Users class="size-3" />
						Non renseigné
					</button>
					<button
						class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
							true,
							reg.present
						)}`}
						disabled={isSaving(reg.member_id)}
						onclick={() => {
							onPresenceChange(reg.member_id, true);
						}}
						type="button"
					>
						<CircleCheck class="size-3" />
						Présent
					</button>
					<button
						class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
							false,
							reg.present
						)}`}
						disabled={isSaving(reg.member_id)}
						onclick={() => {
							onPresenceChange(reg.member_id, false);
						}}
						type="button"
					>
						<CircleX class="size-3" />
						Absent
					</button>
				</div>
			{/if}
		</div>
	{/each}
</div>
