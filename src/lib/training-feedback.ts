/**
 * Accès aux avis de fin de formation.
 *
 * Deux chemins de lecture, pour deux publics :
 * - le pôle formation lit `formation.training_feedback_view`, avec le message
 *   qui lui est adressé ;
 * - le formateur passe par `trainer_feedback_list`, qui ne renvoie jamais ce
 *   message. La table ne lui est pas ouverte.
 *
 * L'écriture vise la table : un avis ne se corrige ni ne se retire.
 */
import type { Database } from '@davincibot/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type TrainingFeedbackClient = SupabaseClient<Database>;

type FeedbackViewRow = Database['formation']['Views']['training_feedback_view']['Row'];

/**
 * Une vue perd les `NOT NULL` de ses tables à la génération des types. Ces cinq
 * colonnes viennent de `training_feedback` ou d'un INNER JOIN : jamais nulles.
 * Le profil de l'auteur, atteint par LEFT JOIN, reste nullable à raison.
 */
export type TrainingFeedback = Omit<
	FeedbackViewRow,
	'id' | 'slot_id' | 'slot_name' | 'slot_start' | 'created_at'
> & {
	id: number;
	slot_id: number;
	slot_name: string;
	slot_start: string;
	created_at: string;
};

/** Ce que voit un formateur : l'avis seul, sans le message au pôle. */
export type TrainerFeedback = Omit<
	TrainingFeedback,
	'team_message' | 'trainer_id' | 'trainer_username'
>;

export interface NewTrainingFeedback {
	slot_id: number;
	feedback: string | null;
	team_message: string | null;
}

const formation = (supabase: TrainingFeedbackClient) => supabase.schema('formation');

const VIEW_COLUMNS =
	'id,slot_id,slot_name,slot_start,trainer_id,trainer_username,author_id,author_username,author_avatar_url,feedback,team_message,created_at';

/** Inscrit, présent ou présence non renseignée, et créneau terminé. */
export async function canGiveFeedback(
	supabase: TrainingFeedbackClient,
	slotId: number
): Promise<boolean> {
	const { data, error } = await formation(supabase).rpc('can_give_feedback', {
		p_slot_id: slotId
	});
	if (error) {
		throw error;
	}
	return data;
}

/** L'avis déjà déposé par `userId` sur ce créneau, s'il existe. */
export async function getMyFeedback(
	supabase: TrainingFeedbackClient,
	slotId: number,
	userId: string
): Promise<TrainingFeedback | null> {
	const { data, error } = await formation(supabase)
		.from('training_feedback_view')
		.select(VIEW_COLUMNS)
		.eq('slot_id', slotId)
		.eq('author_id', userId)
		.maybeSingle();
	if (error) {
		throw error;
	}
	return data as TrainingFeedback | null;
}

export async function createFeedback(
	supabase: TrainingFeedbackClient,
	payload: NewTrainingFeedback
): Promise<void> {
	const { error } = await formation(supabase).from('training_feedback').insert(payload);
	if (error) {
		throw error;
	}
}

/**
 * Tous les avis lisibles par l'appelant. La policy `training_feedback_read`
 * tranche : `training.feedback.read` voit tout, les autres ne voient que les leurs.
 */
export async function getAllFeedback(
	supabase: TrainingFeedbackClient
): Promise<TrainingFeedback[]> {
	const { data, error } = await formation(supabase)
		.from('training_feedback_view')
		.select(VIEW_COLUMNS)
		.order('slot_start', { ascending: false })
		.order('created_at', { ascending: false });
	if (error) {
		throw error;
	}
	return data as TrainingFeedback[];
}

export async function getTrainerFeedback(
	supabase: TrainingFeedbackClient
): Promise<TrainerFeedback[]> {
	const { data, error } = await formation(supabase).rpc('trainer_feedback_list');
	if (error) {
		throw error;
	}
	return data.map((row) => ({
		id: row.id,
		slot_id: row.slot_id,
		slot_name: row.slot_name,
		slot_start: row.slot_start,
		author_id: row.author_id,
		author_username: row.author_username,
		author_avatar_url: row.author_avatar_url,
		feedback: row.feedback,
		created_at: row.created_at
	}));
}
