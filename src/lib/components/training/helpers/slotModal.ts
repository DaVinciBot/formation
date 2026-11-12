import type { RegistrationSummary } from '#lib/training-registrations.js';
import { formatParisDate, formatParisTime, formatParisTimeRange } from '@davincibot/lib';

export interface AvailabilityMode {
	key: 'on-site' | 'remote';
	label: string;
	remaining: number;
	isFull: boolean;
	/** formation#47 — le reste est commun aux deux modalités. */
	shared: boolean;
}

export interface ActionButton {
	key: AvailabilityMode['key'];
	label: string;
	variant: 'primary' | 'secondary';
	isCancel?: boolean;
}

export interface SlotLike {
	start: Date | string;
	duration_hours: number;
	on_site_seats?: number | null;
	on_site_remaining?: number | null;
	remote_seats?: number | null;
	remote_remaining?: number | null;
	/** formation#47 — places communes aux deux modalités, et leur reste. */
	shared_seats?: number | null;
	shared_remaining?: number | null;
	cardStatus?: string | null;
}

export function hasContent(value?: string | null) {
	if (!value) {
		return false;
	}
	return value.trim().length > 0;
}

export function formatDate(value: Date | string) {
	return formatParisDate(value);
}

export function formatTime(value: Date | string) {
	return formatParisTime(value);
}

export function formatTimeRange(startValue: Date | string, durationHours: number) {
	return formatParisTimeRange(startValue, durationHours);
}

export function resolveRemaining(seats?: number | null, remaining?: number | null) {
	if (seats === null || seats === undefined) {
		return null;
	}
	if (remaining === null || remaining === undefined) {
		return Math.max(seats, 0);
	}
	return Math.max(remaining, 0);
}

export function buildAvailability(slot: SlotLike | null): AvailabilityMode[] {
	if (!slot) {
		return [];
	}
	const modes: AvailabilityMode[] = [];
	// En places communes, la base rapporte le reste commun sur les deux modalités.
	const shared = slot.shared_seats !== null && slot.shared_seats !== undefined;

	const onSiteRemaining = resolveRemaining(slot.on_site_seats, slot.on_site_remaining);
	if (onSiteRemaining !== null) {
		modes.push({
			key: 'on-site',
			label: 'Présentiel',
			remaining: onSiteRemaining,
			isFull: onSiteRemaining <= 0,
			shared
		});
	}

	const remoteRemaining = resolveRemaining(slot.remote_seats, slot.remote_remaining);
	if (remoteRemaining !== null) {
		modes.push({
			key: 'remote',
			label: 'Distanciel',
			remaining: remoteRemaining,
			isFull: remoteRemaining <= 0,
			shared
		});
	}

	return modes;
}

/**
 * Libellé du reste disponible : « 3 places restantes », ou, en places communes,
 * « 3 places restantes, sur site ou à distance » (formation#47).
 */
export function remainingLabel(mode: AvailabilityMode): string {
	const base = `${String(mode.remaining)} ${mode.remaining > 1 ? 'places restantes' : 'place restante'}`;
	return mode.shared ? `${base}, sur site ou à distance` : base;
}

export function isRegistrationMode(
	registration: RegistrationSummary | null,
	modeKey: AvailabilityMode['key']
) {
	if (!registration) {
		return false;
	}
	return registration.remote ? modeKey === 'remote' : modeKey === 'on-site';
}

export function buildActionButtons({
	slot,
	registration,
	availability
}: {
	slot: SlotLike | null;
	registration: RegistrationSummary | null;
	availability: AvailabilityMode[];
}): ActionButton[] {
	if (slot?.cardStatus === 'hidden' || slot?.cardStatus === 'my') {
		return [];
	}
	if (registration) {
		return [
			{
				key: registration.remote ? 'remote' : 'on-site',
				label:
					registration.status === 'waitlisted'
						? "Se retirer de la liste d'attente"
						: 'Se désinscrire',
				variant: 'primary',
				isCancel: true
			}
		];
	}

	return availability.map((mode) => ({
		key: mode.key,
		label: mode.isFull
			? `Sur liste d'attente (${mode.label.toLowerCase()})`
			: `S'inscrire (${mode.label.toLowerCase()})`,
		variant: mode.isFull ? 'secondary' : 'primary'
	}));
}
