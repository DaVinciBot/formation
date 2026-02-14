import type { SlotStatus } from '$lib/services/training';

export const categoryOptions = [
	{ value: 'code', text: 'Code' },
	{ value: 'electronics', text: 'Électronique' },
	{ value: 'robotic', text: 'Robotique' },
	{ value: 'software', text: 'Logiciel' },
	{ value: 'other', text: 'Autre', selected: true }
];

export const statusOptions: { value: SlotStatus; text: string; style: string }[] = [
	{ value: 'draft', text: 'Brouillon', style: 'border-gray-100 text-gray-800 bg-gray-50' },
	{ value: 'pending', text: 'Planifiée', style: 'border-blue-100 text-blue-800 bg-blue-50' },
	{ value: 'done', text: 'Terminée', style: 'border-green-100 text-green-800 bg-green-50' },
	{
		value: 'postponed',
		text: 'Reportée',
		style: 'border-light-blue/20 text-light-blue/80 bg-light-blue/5'
	},
	{
		value: 'canceled',
		text: 'Annulée',
		style: 'border-light-blue/20 text-light-blue/80 bg-light-blue/5'
	}
];
