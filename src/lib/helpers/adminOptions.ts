import type { SlotStatus } from '$lib/services/training';

export const categoryOptions = [
	{ value: 'code', text: 'Code' },
	{ value: 'electronics', text: 'Électronique' },
	{ value: 'robotic', text: 'Robotique' },
	{ value: 'software', text: 'Logiciel' },
	{ value: 'other', text: 'Autre', selected: true }
];

export const statusOptions: { value: SlotStatus; text: string; style: string }[] = [
	{ value: 'draft', text: 'Brouillon', style: 'border-gray-100/40 bg-gray-100/15 text-gray-100' },
	{
		value: 'pending',
		text: 'Planifiée',
		style: 'border-primary-200/40 bg-primary-200/15 text-primary-200'
	},
	{
		value: 'done',
		text: 'Terminée',
		style: 'border-registered/40 bg-registered/15 text-registered'
	},
	{
		value: 'postponed',
		text: 'Reportée',
		style: 'border-dark-blue-gray/40 bg-dark-blue-gray/15 text-dark-blue-gray'
	},
	{
		value: 'canceled',
		text: 'Annulée',
		style: 'border-dark-blue-gray/40 bg-dark-blue-gray/15 text-dark-blue-gray'
	}
];
