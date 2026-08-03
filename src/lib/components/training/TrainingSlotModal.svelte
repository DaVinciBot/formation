<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		buildActionButtons,
		buildAvailability,
		formatDate,
		formatTimeRange,
		hasContent,
		isRegistrationMode,
		type ActionButton,
		type AvailabilityMode
	} from '$lib/components/training/helpers/slotModal';
	import { OverlayBackdrop } from '@davincibot/components';
	import TrainingRegistrationPopup from '$lib/components/training/TrainingRegistrationPopup.svelte';
	import { Badge } from '@davincibot/components';
	import { CTAButton as CtaButton } from '@davincibot/components';
	import {
		cancelRegistration,
		getMyRegistrationForSlot,
		getSlotRegistrations,
		getTrainerSlotRegistrations,
		registerToSlot,
		updateMyRegistrationExcuse,
		type RegistrationListItem,
		type RegistrationSummary,
		type TrainingSlotListItem,
		type TrainingSupabaseClient
	} from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import {
		Armchair,
		ArrowRight,
		Calendar,
		Clock,
		House,
		LaptopMinimal,
		MapPin,
		MessageSquare,
		MoveUpRight,
		TextAlignStart,
		UserRound,
		Users,
		Video,
		X
	} from '@lucide/svelte';

	type TrainingCardStatus = 'complete' | 'free' | 'hidden' | 'registered' | 'waiting' | 'my';

	type CalendarSlot = Omit<TrainingSlotListItem, 'start'> & {
		start: Date | string;
		cardStatus?: TrainingCardStatus;
	};

	interface Props {
		slot?: CalendarSlot | null;
		open?: boolean;
		onClose?: () => void;
		onRegistrationChange?: () => void;
		canManageTraining?: boolean;
		currentUserId?: string | null;
	}

	const noop = () => undefined;

	const {
		slot = null,
		open = false,
		onClose = noop,
		onRegistrationChange,
		canManageTraining = false,
		currentUserId = null
	}: Props = $props();

	let registration = $state<RegistrationSummary | null>(null);
	let registrationRequestId = 0;
	let participants = $state<RegistrationListItem[]>([]);
	let participantsLoading = $state(false);
	let participantsError = $state<string | null>(null);
	let participantsRequestId = 0;
	let confirmOpen = $state(false);
	let confirmMode = $state<AvailabilityMode['key'] | null>(null);
	let confirmLoading = $state(false);
	let excuseUpdating = $state(false);

	let supabaseClient: TrainingSupabaseClient | null = null;

	function getClient() {
		supabaseClient ??= getSupabaseBrowserClient();
		return supabaseClient;
	}

	const isOpen = $derived(() => open && slot !== null);
	const hasDescription = $derived(() => hasContent(slot?.description));
	const hasPrerequisites = $derived(() => hasContent(slot?.prerequisites));
	const hasVideoLink = $derived(
		() =>
			hasContent(slot?.video_conference_link) &&
			((registration?.status === 'registered' && registration.remote) || slot?.cardStatus === 'my')
	);
	const isWaitlisted = $derived(() => registration?.status === 'waitlisted');
	const isDone = $derived(() => slot?.status === 'done');
	const confirmLabel = $derived(() => (confirmLoading ? 'Inscription...' : "S'inscrire"));
	const badgeColor = $derived(() =>
		isWaitlisted() ? 'waiting' : registration ? 'registered' : ''
	);
	const badgeText = $derived(() =>
		isWaitlisted() ? "Liste d'attente" : registration ? 'Inscrit·e' : ''
	);
	const showExcuseToggle = $derived(() => slot?.excusable && registration?.status === 'registered');
	const excuseToggleLabel = $derived(() =>
		registration?.to_excuse ? "Je n'ai plus besoin d'excuse" : "J'ai besoin d'une excuse"
	);
	const canViewParticipants = $derived(() => slot?.cardStatus === 'my' || canManageTraining);

	const availability = $derived(() => buildAvailability(slot));

	const actionButtons = $derived((): ActionButton[] =>
		buildActionButtons({ slot, registration, availability: availability() })
	);

	const actionCount = $derived(() =>
		isDone() ? 0 : actionButtons().length + (showExcuseToggle() ? 1 : 0)
	);

	async function refreshRegistration() {
		if (!slot) {
			return;
		}
		const currentRequest = ++registrationRequestId;
		try {
			const data = await getMyRegistrationForSlot(getClient(), slot.slot_id, currentUserId);
			if (currentRequest !== registrationRequestId) {
				return;
			}
			registration = data;
		} catch {
			if (currentRequest !== registrationRequestId) {
				return;
			}
			registration = null;
		}
	}

	async function refreshParticipants() {
		if (!slot || !canViewParticipants()) {
			return;
		}
		const currentRequest = ++participantsRequestId;
		participantsLoading = true;
		participantsError = null;
		try {
			const data = canManageTraining
				? await getSlotRegistrations(getClient(), slot.slot_id)
				: await getTrainerSlotRegistrations(getClient(), slot.slot_id);
			if (currentRequest !== participantsRequestId) {
				return;
			}
			participants = data;
		} catch {
			if (currentRequest !== participantsRequestId) {
				return;
			}
			participantsError = 'Impossible de charger les inscriptions.';
			participants = [];
		} finally {
			if (currentRequest === participantsRequestId) {
				participantsLoading = false;
			}
		}
	}

	function openConfirmation(mode: AvailabilityMode['key']) {
		confirmMode = mode;
		confirmOpen = true;
	}

	function closeConfirmation() {
		confirmOpen = false;
		confirmMode = null;
	}

	async function handleConfirmRegistration(toExcuse: boolean) {
		if (!slot || !confirmMode) {
			return;
		}
		confirmLoading = true;
		try {
			await registerToSlot(getClient(), slot.slot_id, confirmMode === 'remote', toExcuse);
			await refreshRegistration();
			onRegistrationChange?.();
		} catch {
			participantsError = "Impossible de finaliser l'inscription.";
		} finally {
			confirmLoading = false;
			closeConfirmation();
		}
	}

	async function handleCancelRegistration() {
		if (!slot) {
			return;
		}
		try {
			await cancelRegistration(getClient(), slot.slot_id);
			await refreshRegistration();
			onRegistrationChange?.();
		} catch {
			participantsError = "Impossible d'annuler l'inscription.";
		}
	}

	async function handleExcuseToggle() {
		if (!slot || !registration) {
			return;
		}
		excuseUpdating = true;
		try {
			const nextValue = !registration.to_excuse;
			await updateMyRegistrationExcuse(getClient(), slot.slot_id, nextValue, currentUserId);
			await refreshRegistration();
			onRegistrationChange?.();
		} catch {
			participantsError = "Impossible de mettre à jour l'excuse.";
		} finally {
			excuseUpdating = false;
		}
	}

	function handleActionClick(action: ActionButton) {
		if (confirmLoading) {
			return;
		}
		if (action.isCancel) {
			void handleCancelRegistration();
			return;
		}
		openConfirmation(action.key);
	}

	function isExcuseUpdating() {
		return excuseUpdating;
	}

	function isRegistrationBusy() {
		return confirmLoading || isExcuseUpdating();
	}

	$effect(() => {
		if (!open || !slot) {
			registration = null;
			participants = [];
			participantsError = null;
			participantsLoading = false;
			closeConfirmation();
			return;
		}
		void refreshRegistration();
		void refreshParticipants();
	});
</script>

{#if isOpen()}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center px-6 py-8"
		aria-modal="true"
		role="dialog"
	>
		<OverlayBackdrop {onClose} />
		<section
			class="border-light-blue/30 text-light-blue relative max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-140 overflow-hidden rounded-[22px] border bg-linear-to-b from-[rgba(6,10,44,0.98)] to-[rgba(4,6,26,0.96)] shadow-[0_26px_70px_rgba(2,6,30,0.6)]"
		>
			<div class="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
				<header class="border-light-blue/20 flex items-start justify-between gap-4 border-b pb-4">
					<div class="max-w-[calc(100%-60px)]">
						<p class="text-dark-light-blue m-0 text-xs tracking-[0.38em] uppercase">
							{slot ? formatDate(slot.start) : ''}
						</p>
						<div class="m-0 mt-2 flex items-center gap-2">
							<h2 class="text-light-blue overflow-hidden text-2xl font-semibold text-ellipsis">
								{slot?.name}
							</h2>
							{#if badgeText()}
								<Badge className="h-min" color={badgeColor()} text={badgeText()} />
							{/if}
						</div>
						{#if slot?.cardStatus === 'hidden'}
							<p class="text-waiting m-0 mt-1 text-sm">
								Cette session est {slot.status === 'canceled'
									? 'annulée'
									: slot.status === 'postponed'
										? 'reportée'
										: 'en cours de planification'}
							</p>
						{/if}
					</div>
					<button
						class="border-light-blue/30 text-light-blue hover:border-light-blue/60 flex size-9 cursor-pointer items-center justify-center rounded-full border transition"
						aria-label="Fermer"
						onclick={onClose}
						type="button"
					>
						<X class="size-5.5" />
					</button>
				</header>
				<div class="mt-5 grid gap-3">
					<div class="border-light-blue/20 bg-blue-gray/15 grid gap-3 rounded-2xl border p-4">
						<div class="grid gap-3 md:grid-cols-2">
							<div class="flex items-center gap-3">
								<div
									class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
								>
									<Calendar class="size-5.5" />
								</div>
								<div>
									<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">
										Date
									</p>
									<p class="text-light-blue m-0 text-sm font-semibold">
										{slot ? formatDate(slot.start) : ''}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
								>
									<Clock class="size-5.5" />
								</div>
								<div>
									<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">
										Heure
									</p>
									<p class="text-light-blue m-0 text-sm font-semibold">
										{slot ? formatTimeRange(slot.start, slot.duration_hours) : ''}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
								>
									<MapPin class="size-5.5" />
								</div>
								<div>
									<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">
										Lieu
									</p>
									<p class="text-light-blue m-0 text-sm font-semibold">
										{slot?.location ?? '-'}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div
									class="border-light-blue/30 bg-dark-blue/70 flex size-10 items-center justify-center rounded-xl border"
								>
									<UserRound class="size-5.5" />
								</div>
								<div>
									<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">
										Formateur·ice
									</p>
									<p class="text-light-blue m-0 text-sm font-semibold">
										{slot?.trainer_username ?? '-'}
									</p>
								</div>
							</div>
						</div>
					</div>

					{#if availability().length > 0}
						<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
							<div
								class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase"
							>
								<Armchair class="size-4" />
								<span>Places</span>
							</div>
							<div class="mt-4 grid gap-3 md:grid-cols-2">
								{#each availability() as mode (mode.key)}
									<div class="flex items-center gap-3 rounded-xl border-0">
										<div
											class="border-light-blue/30 bg-dark-blue/70 text-light-blue flex size-10 items-center justify-center rounded-xl border"
										>
											{#if mode.key === 'on-site'}
												<House class="size-5.5" />
											{:else}
												<LaptopMinimal class="size-5.5" />
											{/if}
										</div>
										<div>
											<p class="text-dark-light-blue m-0 text-[0.6rem] tracking-[0.32em] uppercase">
												{mode.label}
											</p>
											{#if isRegistrationMode(registration, mode.key)}
												<p class="m-0 font-semibold">
													{isWaitlisted() ? "Sur liste d'attente" : 'Inscrit·e'}
												</p>
											{:else if mode.isFull}
												<p class="text-waiting m-0 text-sm font-semibold">
													Liste d'attente ouverte
												</p>
											{:else}
												<p class="text-light-blue m-0 text-sm font-semibold">
													{mode.remaining}
													{mode.remaining > 1 ? 'places restantes' : 'place restante'}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if canViewParticipants()}
						<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
							<div class="flex items-center justify-between gap-3">
								<div
									class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase"
								>
									<Users class="size-4" />
									<span>Participant·e·s</span>
								</div>
								<CtaButton
									class="manage_button hidden items-center gap-2 whitespace-nowrap min-[430px]:inline-flex"
									fullWidth={false}
									onclick={() => {
										if (slot) {
											void goto(resolve(`/presence?slot=${String(slot.slot_id)}` as '/'));
										}
									}}
									size="xs"
									type="button"
									variant="secondary"
								>
									<span>Gérer</span>
									<ArrowRight size={16} />
								</CtaButton>
							</div>
							{#if participantsLoading}
								<p class="text-light-blue/70 mt-3 text-sm">Chargement des inscrit·e·s...</p>
							{:else if participantsError}
								<p class="text-waiting mt-3 text-sm">{participantsError}</p>
							{:else if participants.length === 0}
								<p class="text-light-blue/70 mt-3 text-sm">Aucun·e inscrit·e pour le moment.</p>
							{:else}
								<div class="mt-3 grid gap-2 sm:grid-cols-2">
									{#each participants as reg (reg.member_id)}
										<div
											class={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
												reg.status === 'waitlisted'
													? 'border-waiting/40 bg-waiting/10 text-waiting'
													: reg.remote
														? 'border-blue-peps/40 bg-blue-peps/10'
														: 'border-registered/30 bg-registered/10'
											}`}
										>
											{#if reg.member_avatar_url}
												<img
													class="border-light-blue/20 size-9 rounded-full border object-cover"
													alt={reg.member_username ?? 'Membre'}
													src={reg.member_avatar_url}
												/>
											{:else}
												<div
													class="border-light-blue/20 bg-dark-blue/70 text-light-blue/80 flex size-9 items-center justify-center rounded-full border text-xs font-semibold"
												>
													{(reg.member_username ?? '?').charAt(0).toUpperCase()}
												</div>
											{/if}
											<div class="min-w-0 flex-1">
												<p class="text-light-blue m-0 truncate text-sm/4 font-semibold">
													{reg.member_username ?? 'Membre'}
												</p>
												<p class="text-light-blue/70 m-0 text-[0.7rem]/3">
													{reg.remote ? 'Distanciel' : 'Présentiel'}
												</p>
											</div>
										</div>
									{/each}
								</div>
							{/if}
							<div class="mt-3 flex justify-end min-[430px]:hidden">
								<CtaButton
									class="manage_button inline-flex items-center gap-2 whitespace-nowrap"
									fullWidth={false}
									onclick={() => {
										if (slot) {
											void goto(resolve(`/presence?slot=${String(slot.slot_id)}` as '/'));
										}
									}}
									size="xs"
									type="button"
									variant="secondary"
								>
									<span>Gérer</span>
									<ArrowRight size={16} />
								</CtaButton>
							</div>
						</div>
					{/if}

					{#if hasDescription()}
						<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
							<div
								class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase"
							>
								<MessageSquare class="size-4" />
								<span>Description</span>
							</div>
							<p class="text-light-blue/90 mt-3 text-sm/5">
								<!-- eslint-disable svelte/no-at-html-tags -->
								{@html slot?.description ?? ''}
								<!-- eslint-enable svelte/no-at-html-tags -->
							</p>
						</div>
					{/if}

					{#if hasPrerequisites()}
						<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
							<div
								class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase"
							>
								<TextAlignStart class="size-4" />
								<span>Prérequis</span>
							</div>
							<p class="text-light-blue/90 mt-3 text-sm/5">
								<!-- eslint-disable svelte/no-at-html-tags -->
								{@html slot?.prerequisites ?? ''}
								<!-- eslint-enable svelte/no-at-html-tags -->
							</p>
						</div>
					{/if}

					{#if hasVideoLink()}
						<div class="border-light-blue/20 bg-blue-gray/15 rounded-2xl border p-4">
							<div
								class="text-dark-light-blue flex items-center gap-2 text-xs tracking-[0.32em] uppercase"
							>
								<Video class="size-4" />
								<span>Lien distanciel</span>
							</div>
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								class="text-light-blue hover:text-blue-peps mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold transition"
								href={slot?.video_conference_link ?? ''}
								rel="noopener noreferrer"
								target="_blank"
							>
								<span>Rejoindre la session en ligne</span>
								<MoveUpRight class="size-4" />
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</div>
					{/if}
				</div>

				{#if !isDone() && actionCount() > 0 && slot?.cardStatus !== 'hidden'}
					<div class="mt-4 grid gap-3 md:grid-cols-2">
						{#if showExcuseToggle()}
							<CtaButton
								disabled={isRegistrationBusy()}
								onclick={handleExcuseToggle}
								size="sm"
								type="button"
								variant="secondary"
							>
								{isExcuseUpdating() ? 'Mise à jour...' : excuseToggleLabel()}
							</CtaButton>
						{/if}
						{#each actionButtons() as action (action.key)}
							<CtaButton
								class={actionCount() === 1 ? 'w-auto justify-self-end md:col-start-2' : ''}
								disabled={confirmLoading || excuseUpdating}
								onclick={() => {
									handleActionClick(action);
								}}
								size="sm"
								type="button"
								variant={action.variant}
								>{action.label}
							</CtaButton>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	</div>
{/if}

<TrainingRegistrationPopup
	confirmDisabled={confirmLoading}
	confirmLabel={confirmLabel()}
	onCancel={closeConfirmation}
	onConfirm={handleConfirmRegistration}
	open={confirmOpen}
	showExcuse={slot?.excusable ?? true}
	trainingName={slot?.name ?? 'Titre'}
/>

<style>
	:global(.manage_button) {
		padding-block: 1 !important;
		padding-inline: 3 !important;
		border-width: 2px !important;
		border-radius: 0.5rem !important;
	}
</style>
