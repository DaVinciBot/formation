<script lang="ts">
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/share/Spinner.svelte';
	import CtaButton from '$lib/components/utils/CTAButton.svelte';
	import {
		getTrainerSlotRegistrations,
		getTrainingSlots,
		updateTrainerPresence,
		type TrainerRegistrationListItem,
		type TrainingSlotListItem
	} from '$lib/services/training';
	import { supabase } from '$lib/supabaseClient';
	import { Calendar, CircleCheck, CircleX, Clock, MapPin, Users } from '@lucide/svelte';
	import { format } from 'date-fns';
	import { onMount } from 'svelte';

	let slots = $state<TrainingSlotListItem[]>([]);
	let registrations = $state<TrainerRegistrationListItem[]>([]);
	let selectedSlotId = $state<number | null>(null);
	let loading = $state(false);
	let registrationsLoading = $state(false);
	let loadError = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let savingIds = $state(new Set<string>());
	let currentUserId: string | null = $state(null);

	const slotRangeDays = 180;

	const selectedSlot = $derived(
		() => slots.find((slot) => slot.slot_id === selectedSlotId) ?? null
	);
	const registeredCount = $derived(
		() => registrations.filter((item) => item.status === 'registered').length
	);
	const waitlistedCount = $derived(
		() => registrations.filter((item) => item.status === 'waitlisted').length
	);
	const presentCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === true).length
	);
	const absentCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === false).length
	);
	const unknownCount = $derived(
		() =>
			registrations.filter((item) => item.status === 'registered' && item.present === null).length
	);

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--/--/----';
		return format(date, 'dd/MM/yyyy');
	}

	function formatTime(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--h--';
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}h${minutes}`;
	}

	function formatTimeRange(startValue: string, durationHours: number) {
		const start = new Date(startValue);
		if (Number.isNaN(start.getTime())) return '--h-- - --h--';
		const safeDuration = Number.isFinite(durationHours) ? Math.max(0.25, durationHours) : 1;
		const end = new Date(start.getTime() + safeDuration * 60 * 60 * 1000);
		return `${formatTime(startValue)} - ${formatTime(end.toISOString())}`;
	}

	function pickDefaultSlot(list: TrainingSlotListItem[]) {
		if (list.length === 0) return null;
		const now = Date.now();
		const upcoming = list.find((slot) => new Date(slot.start).getTime() >= now);
		return upcoming ?? list[list.length - 1];
	}

	function presenceButtonClass(value: boolean | null, current: boolean | null) {
		const isActive = value === current;
		if (value === true) {
			return isActive
				? 'border-registered/40 bg-registered/15 text-registered'
				: 'border-light-blue/20 text-light-blue/70';
		}
		if (value === false) {
			return isActive
				? 'border-red-400/40 bg-red-500/15 text-red-300'
				: 'border-light-blue/20 text-light-blue/70';
		}
		return isActive
			? 'border-light-blue/40 bg-light-blue/10 text-light-blue'
			: 'border-light-blue/20 text-light-blue/70';
	}

	function isSaving(memberId: string) {
		return savingIds.has(memberId);
	}

	async function loadRegistrations(slotId: number) {
		registrationsLoading = true;
		loadError = null;
		actionError = null;
		try {
			const data = await getTrainerSlotRegistrations(slotId);
			registrations = data;
		} catch (err) {
			console.error(err);
			loadError = 'Impossible de charger les inscriptions de ce slot.';
			registrations = [];
		} finally {
			registrationsLoading = false;
		}
	}

	async function handleSlotChange(slotId: number) {
		selectedSlotId = slotId;
		await loadRegistrations(slotId);
	}

	async function handlePresenceChange(memberId: string, present: boolean | null) {
		if (!selectedSlotId) return;
		actionError = null;
		savingIds = new Set(savingIds).add(memberId);
		try {
			await updateTrainerPresence(selectedSlotId, memberId, present);
			registrations = registrations.map((item) =>
				item.member_id === memberId ? { ...item, present } : item
			);
		} catch (err) {
			console.error(err);
			actionError = 'Impossible de mettre à jour la présence.';
		} finally {
			const next = new Set(savingIds);
			next.delete(memberId);
			savingIds = next;
		}
	}

	async function loadSlots() {
		loading = true;
		loadError = null;
		try {
			const { data: accessData, error: accessError } = await supabase.rpc('has_permission', {
				p_permission: 'access_training'
			});
			if (accessError || !accessData) {
				await goto('/unauthorized?redirect=/presences');
				return;
			}
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser();
			if (userError || !user) {
				await goto('/unauthorized?redirect=/presences');
				return;
			}
			currentUserId = user.id;

			const rawSlots = await getTrainingSlots(new Date(), slotRangeDays);
			slots = rawSlots
				.filter((slot) => slot.trainer_id === user.id)
				.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

			const initialSlot = pickDefaultSlot(slots);
			selectedSlotId = initialSlot?.slot_id ?? null;
			if (selectedSlotId) {
				await loadRegistrations(selectedSlotId);
			} else {
				registrations = [];
			}
		} catch (err) {
			console.error(err);
			loadError = 'Impossible de charger vos slots de formation.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadSlots();
	});
</script>

<section class="px-4 py-6 sm:px-6 sm:py-8">
	<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
		<header
			class="flex flex-col gap-6 rounded-[28px] border border-light-blue/15 bg-dark-blue/70 p-4 shadow-[0_20px_50px_rgba(1,7,32,0.35)] sm:p-6"
		>
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p class="text-xs tracking-[0.3em] text-light-blue/60 uppercase">Formateur·ice·s</p>
					<h1 class="mt-2 text-2xl font-bold text-white sm:text-3xl">Présences des formations</h1>
					<p class="mt-2 text-sm text-light-blue/70">
						Indiquez les présences des membres sur vos slots de formation.
					</p>
				</div>
				<div class="flex flex-wrap gap-3 sm:justify-end">
					<CtaButton type="button" variant="primary" size="sm" onclick={loadSlots}>
						Actualiser
					</CtaButton>
					{#if currentUserId}
						<CtaButton href="/" variant="secondary" size="sm">Retour au calendrier</CtaButton>
					{/if}
				</div>
			</div>
			{#if selectedSlot()}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-xl border border-light-blue/30 bg-dark-blue/70"
							>
								<Calendar class="size-5.5" />
							</div>
							<div>
								<p class="m-0 text-[0.6rem] tracking-[0.32em] text-dark-light-blue uppercase">
									Date
								</p>
								<p class="m-0 text-sm font-semibold text-light-blue">
									{formatDate(selectedSlot()?.start ?? '')}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-xl border border-light-blue/30 bg-dark-blue/70"
							>
								<Clock class="size-5.5" />
							</div>
							<div>
								<p class="m-0 text-[0.6rem] tracking-[0.32em] text-dark-light-blue uppercase">
									Horaire
								</p>
								<p class="m-0 text-sm font-semibold text-light-blue">
									{formatTimeRange(
										selectedSlot()?.start ?? '',
										selectedSlot()?.duration_hours ?? 1
									)}
								</p>
							</div>
						</div>
					</div>
					<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/80 p-4">
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-xl border border-light-blue/30 bg-dark-blue/70"
							>
								<MapPin class="size-5.5" />
							</div>
							<div>
								<p class="m-0 text-[0.6rem] tracking-[0.32em] text-dark-light-blue uppercase">
									Lieu
								</p>
								<p class="m-0 text-sm font-semibold text-light-blue">
									{selectedSlot()?.location ?? 'À définir'}
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</header>

		{#if loading}
			<div class="flex h-full flex-col items-center justify-center gap-3">
				<div
					class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-xs tracking-[0.28em] uppercase"
				>
					<span class="spinner" aria-hidden="true"></span>
					<span class="text-center">Chargement du calendrier</span>
				</div>
			</div>
			<Spinner
				divClass="h-full rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/80"
				text="Chargement des slots"
			/>
		{:else if loadError}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-waiting"
			>
				<p class="text-center text-sm">{loadError}</p>
				<CtaButton type="button" variant="peps" size="sm" onclick={loadSlots}>Réessayer</CtaButton>
			</div>
		{:else if slots.length === 0}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-[26px] border border-light-blue/20 bg-dark-blue/80 p-10 text-light-blue/70"
			>
				<p class="text-center text-sm">Aucun slot ne vous est attribué pour le moment.</p>
			</div>
		{:else}
			<div class="grid gap-6 lg:grid-cols-[minmax(0,0.38fr)_1fr]">
				<section class="rounded-[26px] border border-light-blue/10 bg-dark-blue/80 p-4 sm:p-6">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold text-white">Mes slots</h2>
							<p class="text-xs text-light-blue/70">{slots.length} session(s)</p>
						</div>
					</div>
					<div class="mt-5 grid gap-3">
						{#each slots as slot}
							<button
								type="button"
								class={`flex w-full flex-col gap-2 rounded-2xl border p-3 text-left transition sm:p-4 ${
									slot.slot_id === selectedSlotId
										? 'border-blue-peps/50 bg-blue-peps/10 text-light-blue'
										: 'border-light-blue/15 bg-dark-blue/60 text-light-blue/70 hover:border-light-blue/40'
								}`}
								onclick={() => handleSlotChange(slot.slot_id)}
							>
								<p class="text-sm font-semibold text-white">{slot.name}</p>
								<p class="text-xs tracking-[0.2em] text-dark-light-blue uppercase">
									{formatDate(slot.start)} · {formatTimeRange(slot.start, slot.duration_hours)}
								</p>
								<p class="text-xs text-light-blue/70">{slot.location ?? 'Lieu à définir'}</p>
							</button>
						{/each}
					</div>
				</section>

				<section class="rounded-[26px] border border-light-blue/10 bg-dark-blue/80 p-4 sm:p-6">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold text-white">Présences</h2>
							<p class="text-xs text-light-blue/70">
								{selectedSlot()?.name ?? 'Sélectionnez un slot'}
							</p>
						</div>
						{#if selectedSlot()}
							<CtaButton
								type="button"
								variant="secondary"
								size="sm"
								onclick={() => selectedSlotId && loadRegistrations(selectedSlotId)}
							>
								Rafraîchir
							</CtaButton>
						{/if}
					</div>

					{#if actionError}
						<p class="mt-3 text-sm text-waiting">{actionError}</p>
					{/if}

					{#if !selectedSlot()}
						<div
							class="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
						>
							<p class="text-sm">Sélectionnez un slot pour démarrer.</p>
						</div>
					{:else if registrationsLoading}
						<div
							class="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
						>
							<span class="spinner" aria-hidden="true"></span>
							<p class="text-sm">Chargement des inscriptions</p>
						</div>
					{:else}
						<div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							<div class="rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-4">
								<p class="text-xs tracking-[0.25em] text-light-blue/60 uppercase">Inscrits</p>
								<p class="mt-2 text-2xl font-semibold text-white">{registeredCount()}</p>
								<p class="mt-1 text-xs text-light-blue/70">{waitlistedCount()} en attente</p>
							</div>
							<div class="rounded-2xl border border-registered/25 bg-dark-blue/70 p-4">
								<p class="text-xs tracking-[0.25em] text-registered uppercase">Présents</p>
								<p class="mt-2 text-2xl font-semibold text-registered">{presentCount()}</p>
							</div>
							<div class="rounded-2xl border border-red-400/25 bg-dark-blue/70 p-4">
								<p class="text-xs tracking-[0.25em] text-red-300 uppercase">Absents</p>
								<p class="mt-2 text-2xl font-semibold text-red-300">{absentCount()}</p>
							</div>
							<div class="rounded-2xl border border-light-blue/20 bg-dark-blue/70 p-4">
								<p class="text-xs tracking-[0.25em] text-light-blue/60 uppercase">Non renseigné</p>
								<p class="mt-2 text-2xl font-semibold text-light-blue">{unknownCount()}</p>
							</div>
						</div>

						{#if registrations.length === 0}
							<div
								class="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-light-blue/15 bg-dark-blue/70 p-8 text-light-blue/70"
							>
								<p class="text-sm">Aucune inscription pour ce slot.</p>
							</div>
						{:else}
							<div class="mt-6 grid gap-4 lg:hidden">
								{#each registrations as reg}
									<div class="rounded-2xl border border-light-blue/10 bg-dark-blue/70 p-4">
										<div class="flex items-start justify-between gap-3">
											<div class="flex items-center gap-3">
												{#if reg.member_avatar_url}
													<img
														src={reg.member_avatar_url}
														alt={reg.member_username ?? 'Membre'}
														class="h-8 w-8 rounded-full"
													/>
												{/if}
												<div>
													<p class="m-0 text-sm font-semibold text-white">
														{reg.member_username ?? 'Membre'}
													</p>
													{#if reg.to_excuse}
														<span
															class="mt-1 inline-flex rounded-full border border-waiting/40 px-2 py-0.5 text-[0.6rem] tracking-[0.25em] text-waiting uppercase"
														>
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
												{reg.status === 'registered' ? 'Inscrit·e' : "Liste d'attente"}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs text-light-blue/70">
											<span>{reg.remote ? 'Distanciel' : 'Présentiel'}</span>
										</div>
										{#if reg.status === 'registered'}
											<div class="mt-4 flex flex-wrap items-center gap-2">
												<button
													type="button"
													class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
														null,
														reg.present
													)}`}
													disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
													onclick={() => handlePresenceChange(reg.member_id, null)}
												>
													<Users class="size-3" />
													Non renseigné
												</button>
												<button
													type="button"
													class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
														true,
														reg.present
													)}`}
													disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
													onclick={() => handlePresenceChange(reg.member_id, true)}
												>
													<CircleCheck class="size-3" />
													Présent
												</button>
												<button
													type="button"
													class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
														false,
														reg.present
													)}`}
													disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
													onclick={() => handlePresenceChange(reg.member_id, false)}
												>
													<CircleX class="size-3" />
													Absent
												</button>
											</div>
										{/if}
									</div>
								{/each}
							</div>
							<div
								class="mt-6 hidden overflow-x-auto rounded-2xl border border-light-blue/10 lg:block"
							>
								<table class="w-full min-w-180 text-left text-sm text-light-blue/70">
									<thead class="bg-dark-blue text-xs tracking-[0.2em] text-light-blue/60 uppercase">
										<tr>
											<th class="px-4 py-3">Membre</th>
											<th class="px-4 py-3">Format</th>
											<th class="px-4 py-3">Statut</th>
											<th class="px-4 py-3 text-right">Présence</th>
										</tr>
									</thead>
									<tbody>
										{#each registrations as reg}
											<tr class="border-t border-light-blue/10">
												<td class="px-4 py-4">
													<div class="flex items-center gap-3">
														{#if reg.member_avatar_url}
															<img
																src={reg.member_avatar_url}
																alt={reg.member_username ?? 'Membre'}
																class="h-8 w-8 rounded-full"
															/>
														{/if}
														<div>
															<p class="m-0 text-sm font-semibold text-white">
																{reg.member_username ?? 'Membre'}
															</p>
															{#if reg.to_excuse}
																<span
																	class="mt-1 inline-flex rounded-full border border-waiting/40 px-2 py-0.5 text-[0.6rem] tracking-[0.25em] text-waiting uppercase"
																>
																	Excuse demandée
																</span>
															{/if}
														</div>
													</div>
												</td>
												<td class="px-4 py-4">
													{reg.remote ? 'Distanciel' : 'Présentiel'}
												</td>
												<td class="px-4 py-4">
													<span
														class={`inline-flex rounded-full border px-2.5 py-1 text-[0.6rem] tracking-[0.25em] uppercase ${
															reg.status === 'registered'
																? 'border-registered/40 text-registered'
																: 'border-waiting/40 text-waiting'
														}`}
													>
														{reg.status === 'registered' ? 'Inscrit·e' : "Liste d'attente"}
													</span>
												</td>
												{#if reg.status === 'registered'}
													<td class="px-4 py-4">
														<div class="flex flex-wrap items-center justify-end gap-2">
															<button
																type="button"
																class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
																	null,
																	reg.present
																)}`}
																disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
																onclick={() => handlePresenceChange(reg.member_id, null)}
															>
																<Users class="size-3" />
																Non renseigné
															</button>
															<button
																type="button"
																class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
																	true,
																	reg.present
																)}`}
																disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
																onclick={() => handlePresenceChange(reg.member_id, true)}
															>
																<CircleCheck class="size-3" />
																Présent
															</button>
															<button
																type="button"
																class={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase ${presenceButtonClass(
																	false,
																	reg.present
																)}`}
																disabled={reg.status !== 'registered' || isSaving(reg.member_id)}
																onclick={() => handlePresenceChange(reg.member_id, false)}
															>
																<CircleX class="size-3" />
																Absent
															</button>
														</div>
													</td>
												{/if}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					{/if}
				</section>
			</div>
		{/if}
	</div>
</section>

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
