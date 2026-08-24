/**
 * Accès aux demandes de formation.
 *
 * Les lectures passent TOUTES par `formation.training_request_view` : elle
 * aplatit le demandeur, qui vit dans `public.profiles`, et PostgREST ne résout
 * pas un embed qui traverse un schéma. Les écritures visent la table.
 */
import type { Database } from '@davincibot/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type TrainingRequestClient = SupabaseClient<Database>;

export type TrainingRequestStatus = Database['formation']['Enums']['training_request_status'];

type TrainingRequestViewRow = Database['formation']['Views']['training_request_view']['Row'];

/**
 * Une vue perd les `NOT NULL` de ses tables à la génération des types : tout y
 * ressort nullable. Ces quatre colonnes viennent pourtant de
 * `formation.training_request` elle-même, sans jointure pour les effacer.
 *
 * Les autres restent nullables à raison : la vue atteint les profils et le
 * catalogue par LEFT JOIN, précisément pour qu'une formation supprimée ou un
 * profil illisible ne fasse pas disparaître la demande.
 */
export type TrainingRequest = Omit<
	TrainingRequestViewRow,
	'id' | 'requester_id' | 'status' | 'created_at'
> & {
	id: number;
	requester_id: string;
	status: TrainingRequestStatus;
	created_at: string;
};

export interface NewTrainingRequest {
	/** Exclusif avec `subject` : la base refuse une demande qui porterait les deux. */
	training_id?: number | null;
	subject?: string | null;
	details?: string | null;
}

const formation = (supabase: TrainingRequestClient) => supabase.schema('formation');

const VIEW_COLUMNS =
	'id,requester_id,requester_username,requester_avatar_url,training_id,training_name,subject,label,details,status,created_at,resolved_at,resolved_by,resolved_by_username';

export async function getMyRequests(
	supabase: TrainingRequestClient,
	userId: string
): Promise<TrainingRequest[]> {
	const { data, error } = await formation(supabase)
		.from('training_request_view')
		.select(VIEW_COLUMNS)
		.eq('requester_id', userId)
		.order('created_at', { ascending: false });
	if (error) {
		throw error;
	}
	return data as TrainingRequest[];
}

/**
 * Toutes les demandes lisibles par l'appelant. La policy `training_request_read`
 * tranche le périmètre : `training.request.manage.all` voit tout, les autres ne
 * voient que les leurs.
 */
export async function getRequests(
	supabase: TrainingRequestClient,
	status?: TrainingRequestStatus
): Promise<TrainingRequest[]> {
	let query = formation(supabase)
		.from('training_request_view')
		.select(VIEW_COLUMNS)
		.order('created_at', { ascending: false });
	if (status) {
		query = query.eq('status', status);
	}
	const { data, error } = await query;
	if (error) {
		throw error;
	}
	return data as TrainingRequest[];
}

/**
 * `requester_id` prend `auth.uid()` par défaut et `status` vaut `pending` : les
 * envoyer depuis le navigateur n'ajouterait qu'une valeur que la base contredit.
 */
export async function createRequest(
	supabase: TrainingRequestClient,
	payload: NewTrainingRequest
): Promise<void> {
	const { error } = await formation(supabase)
		.from('training_request')
		.insert({
			training_id: payload.training_id ?? null,
			subject: payload.subject ?? null,
			details: payload.details ?? null
		});
	if (error) {
		throw error;
	}
}

export async function deleteRequest(
	supabase: TrainingRequestClient,
	requestId: number
): Promise<void> {
	const { error } = await formation(supabase).from('training_request').delete().eq('id', requestId);
	if (error) {
		throw error;
	}
}

/**
 * `resolved_at` et `resolved_by` ne sont pas transmis : un trigger les pose
 * quand le statut quitte `pending` et les efface au retour.
 */
export async function setRequestStatus(
	supabase: TrainingRequestClient,
	requestId: number,
	status: TrainingRequestStatus
): Promise<void> {
	const { error } = await formation(supabase)
		.from('training_request')
		.update({ status })
		.eq('id', requestId);
	if (error) {
		throw error;
	}
}
