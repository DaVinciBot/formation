import { categoryOptions, statusOptions } from '$lib/helpers/adminOptions';
import type { TrainingListItem, TrainingSlotListItem } from '$lib/services/training';

export type ProfileOption = {
	id: string;
	username: string | null;
	avatar_url: string | null;
	email: string | null;
};

export function toDatetimeLocal(dateString: string) {
	const date = new Date(dateString);
	const offset = date.getTimezoneOffset();
	const localDate = new Date(date.getTime() - offset * 60000);
	return localDate.toISOString().slice(0, 16);
}

export function buildTrainingFields(training: TrainingListItem | null) {
	return [
		{
			name: 'Nom',
			id: 'name',
			type: 'text',
			required: true,
			value: training?.name || ''
		},
		{
			name: 'Catégorie',
			id: 'category',
			type: 'select',
			required: true,
			options: categoryOptions,
			value: training?.category || ''
		},
		{
			name: 'Description',
			id: 'description',
			type: 'textarea',
			wide: true,
			value: training?.description || ''
		},
		{
			name: 'Prérequis',
			id: 'prerequisites',
			type: 'textarea',
			wide: true,
			value: training?.prerequisites || ''
		}
	];
}

export function buildSlotFields({
	slot,
	trainings,
	profiles,
	onTrainerChange
}: {
	slot: TrainingSlotListItem | null;
	trainings: TrainingListItem[];
	profiles: ProfileOption[];
	onTrainerChange?: (nextId: string | null) => void;
}) {
	const trainerOptions = profiles.map((profile) => {
		const label = profile.username || 'Membre';
		const suffix = profile.email ? ` - ${profile.email}` : '';
		return {
			value: profile.id,
			text: `${label}${suffix}`
		};
	});

	return [
		{
			name: 'Formation',
			id: 'training_id',
			type: 'select',
			required: true,
			options: trainings.map((training) => ({
				value: training.training_id,
				text: training.name
			})),
			value: slot?.training_id ?? ''
		},
		{
			name: 'Formateur·ice',
			id: 'trainer_id',
			type: 'select',
			required: true,
			options: trainerOptions,
			value: slot?.trainer_id || '',
			onChange: (event: Event) => {
				const target = event.target as HTMLSelectElement;
				onTrainerChange?.(target.value || null);
			}
		},
		{
			name: 'Début',
			id: 'start',
			type: 'datetime-local',
			required: true,
			value: slot ? toDatetimeLocal(slot.start) : ''
		},
		{
			name: 'Durée (h)',
			id: 'duration_hours',
			type: 'number',
			required: true,
			min: 0.5,
			step: 0.5,
			value: slot?.duration_hours ?? 2
		},
		{
			name: 'Places sur site',
			id: 'on_site_seats',
			type: 'number',
			min: 0,
			value: slot?.on_site_seats ?? ''
		},
		{
			name: 'Places distanciel',
			id: 'remote_seats',
			type: 'number',
			min: 0,
			value: slot?.remote_seats ?? ''
		},
		{
			name: 'Lieu',
			id: 'location',
			type: 'text',
			wide: true,
			value: slot?.location || ''
		},
		{
			name: 'Lien visio',
			id: 'video_conference_link',
			type: 'text',
			wide: true,
			value: slot?.video_conference_link || ''
		},
		{
			name: 'Excusable',
			id: 'excusable',
			type: 'checkbox',
			checked: slot?.excusable ?? true
		},
		{
			name: 'Statut',
			id: 'status',
			type: 'select',
			required: true,
			options: statusOptions,
			value: slot?.status || 'draft'
		}
	];
}
