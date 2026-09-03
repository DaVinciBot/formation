<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { Checkbox } from '@davincibot/components';
	import { CtaButton } from '@davincibot/components';

	interface Props {
		open?: boolean;
		trainingName?: string;
		showExcuse?: boolean;
		confirmLabel?: string;
		confirmDisabled?: boolean;
		onConfirm?: (toExcuse: boolean) => void;
		onCancel?: () => void;
	}

	const noop = () => undefined;
	const noopConfirm: (toExcuse: boolean) => void = () => undefined;

	let {
		open = false,
		trainingName = 'Titre',
		showExcuse = true,
		confirmLabel = "S'inscrire",
		confirmDisabled = false,
		onConfirm = noopConfirm,
		onCancel = noop
	}: Props = $props();

	let toExcuse = $state(false);

	$effect(() => {
		if (!open) {
			toExcuse = false;
		}
	});

	function handleConfirm() {
		onConfirm(toExcuse);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
		aria-modal="true"
		role="dialog"
	>
		<OverlayBackdrop onClose={onCancel} />
		<section
			class="border-light-blue/30 text-light-blue relative max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-160 overflow-y-auto rounded-[10px] border bg-linear-to-b from-[rgba(20,22,52,0.98)] to-[rgba(16,18,44,0.96)] px-5 py-5 shadow-[0_26px_60px_rgba(3,5,20,0.55)]"
		>
			<h2 class="text-light-blue m-0 overflow-hidden text-sm font-semibold text-ellipsis">
				Confirmation de l'inscription à la formation {trainingName}
			</h2>
			{#if showExcuse}
				<label class="text-light-blue mt-5 flex items-center gap-2.5 text-sm sm:gap-3">
					<Checkbox className="size-4" bind:checked={toExcuse} />
					<span class="cursor-pointer">J'ai besoin de me faire excuser</span>
				</label>
			{/if}
			<div class="mt-5 flex flex-row justify-end gap-3">
				<CtaButton
					disabled={confirmDisabled}
					fullWidth={false}
					onclick={onCancel}
					size="sm"
					variant="secondary">Annuler</CtaButton
				>
				<CtaButton
					disabled={confirmDisabled}
					fullWidth={false}
					onclick={handleConfirm}
					size="sm"
					variant="primary">{confirmLabel}</CtaButton
				>
			</div>
		</section>
	</div>
{/if}
