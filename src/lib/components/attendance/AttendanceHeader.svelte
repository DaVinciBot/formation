<script lang="ts">
	import { CTAButton } from '@davincibot/components';

	const noop = () => undefined;

	interface AttendanceHeaderProps {
		onRefresh?: () => void;
		currentUserId?: string | null;
	}

	const { onRefresh = noop, currentUserId = null }: AttendanceHeaderProps = $props();
</script>

<header
	class="border-light-blue/15 bg-blue-gray/15 flex flex-col gap-6 rounded-[28px] border p-4 shadow-[0_20px_50px_rgba(1,7,32,0.35)] sm:p-6"
>
	<div
		class="flex flex-col gap-4 min-[1040px]:flex-row min-[1040px]:items-center min-[1040px]:justify-between"
	>
		<div>
			<p class="text-light-blue/60 text-xs tracking-[0.3em] uppercase">Formateur·ice·s</p>
			<h1 class="mt-2 text-2xl font-bold text-white sm:text-3xl">Présences aux formations</h1>
			<p class="text-light-blue/70 mt-2 text-sm">
				Indiquez les présences des membres sur vos sessions de formation.
			</p>
		</div>
		<div class="flex flex-wrap gap-3 sm:justify-end">
			<CTAButton onclick={onRefresh} size="sm" type="button" variant="secondary">
				Actualiser
			</CTAButton>
			{#if currentUserId}
				<CTAButton href="/" size="sm" variant="secondary">Retour au calendrier</CTAButton>
			{/if}
		</div>
	</div>
</header>
