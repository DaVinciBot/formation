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
	selectedTrainingId,
	onTrainerChange,
	onTrainingChange
}: {
	slot: TrainingSlotListItem | null;
	trainings: TrainingListItem[];
	profiles: ProfileOption[];
	selectedTrainingId?: number | null;
	onTrainerChange?: (nextId: string | null) => void;
	onTrainingChange?: (nextId: number | null) => void;
}) {
	const trainerOptions = profiles.map((profile) => {
		const label = profile.username || 'Membre';
		return {
			value: profile.id,
			text: label,
			image: profile.avatar_url || undefined,
			subtext: profile.email || undefined
		};
	});

	const baseTrainingId = slot?.training_id ?? selectedTrainingId ?? null;
	const baseTraining = baseTrainingId
		? (trainings.find((training) => training.training_id === baseTrainingId) ?? null)
		: null;

	const selectedTrainer = slot?.trainer_id
		? profiles.find((profile) => profile.id === slot.trainer_id)
		: null;

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
			value: slot?.training_id ?? selectedTrainingId ?? '',
			onChange: (event: Event) => {
				const target = event.target as HTMLSelectElement | null;
				const nextId = target?.value ? Number(target.value) : null;
				onTrainingChange?.(Number.isNaN(nextId as number) ? null : nextId);
			}
		},
		{
			name: 'Nom',
			id: 'custom_name',
			type: 'text',
			placeholder: baseTraining?.name || '',
			value: slot ? (slot.name ?? '') : baseTraining?.name || ''
		},
		{
			name: 'Description',
			id: 'custom_description',
			type: 'textarea',
			placeholder: baseTraining?.description || '',
			value: slot ? (slot.description ?? '') : baseTraining?.description || ''
		},
		{
			name: 'Prérequis',
			id: 'custom_prerequisites',
			type: 'textarea',
			placeholder: baseTraining?.prerequisites || '',
			value: slot ? (slot.prerequisites ?? '') : baseTraining?.prerequisites || ''
		},
		{
			name: 'Formateur·ice',
			id: 'trainer_id',
			type: 'autocomplete',
			required: true,
			value: selectedTrainer?.username || slot?.trainer_username || '',
			image: selectedTrainer?.avatar_url || slot?.trainer_avatar_url || null,
			data: selectedTrainer?.id || slot?.trainer_id || '',
			onChange: (event: Event) => {
				const target = event.target as HTMLInputElement | null;
				onTrainerChange?.(null);
				const search = target?.value?.toLowerCase().trim() || '';
				if (!search) return trainerOptions.slice(0, 5);
				return trainerOptions
					.filter((option) => {
						const textMatch = option.text.toLowerCase().includes(search);
						const subtextMatch = option.subtext?.toLowerCase().includes(search) ?? false;
						return textMatch || subtextMatch;
					})
					.slice(0, 5);
			},
			onSelect: (nextId: string) => {
				onTrainerChange?.(nextId);
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
			name: 'Lieu',
			id: 'location',
			type: 'text',
			value: slot?.location || ''
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
