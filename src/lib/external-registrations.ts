// Participants externes (formation#51) : un responsable formations d'une autre
// association inscrit ses participants par leur seul prénom et nom.
//
// Typage local : la table et les RPC arrivent avec la prochaine version de
// `@davincibot/database-types` (DaVinciBot/Supabased).
import type { TrainingSupabaseClient } from '@davincibot/lib';

export interface ExternalParticipant {
	id: number;
	slot_id: number;
	first_name: string;
	last_name: string;
	association_name: string;
	remote: boolean;
	registered_by: string | null;
	created_at: string;
}

export interface ParticipantDraft {
	first_name: string;
	last_name: string;
}

interface PostgrestError {
	code?: string;
	message: string;
	details?: string | null;
}

type Result<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;

interface Untyped {
	rpc: {
		(
			name: 'external_registration_list',
			args: { p_slot_id: number }
		): Result<ExternalParticipant[]>;
		(
			name: 'register_external_participants',
			args: { p_slot_id: number; p_remote: boolean; p_participants: ParticipantDraft[] }
		): Result<number>;
	};
	from: (name: 'external_registration') => {
		delete: () => { eq: (column: 'id', value: number) => Result<null> };
	};
}

const formation = (supabase: TrainingSupabaseClient) =>
	supabase.schema('formation') as unknown as Untyped;

/** Lignes complètes seulement : prénom et nom renseignés, espaces retirés. */
export function completeDrafts(drafts: ParticipantDraft[]): ParticipantDraft[] {
	return drafts
		.map((draft) => ({ first_name: draft.first_name.trim(), last_name: draft.last_name.trim() }))
		.filter((draft) => draft.first_name !== '' && draft.last_name !== '');
}

/** Message lisible pour une erreur de la RPC d'inscription. */
export function registrationErrorMessage(error: PostgrestError): string {
	switch (error.code) {
		case 'DVB23': {
			const remaining = Number(error.details);
			return Number.isInteger(remaining)
				? `Il ne reste que ${String(remaining)} place${remaining > 1 ? 's' : ''} sur cette session : retirez des lignes pour valider.`
				: 'Il ne reste pas assez de places sur cette session.';
		}
		case 'DVB22':
			return "Cette session est réservée à ses groupes prioritaires jusqu'à 24 h avant son début.";
		case 'DVB21':
			return "Votre compte n'est rattaché à aucune association : demandez au responsable formations de DaVinciBot de le faire.";
		case 'DVB20':
			return 'Cette session est fermée aux inscriptions.';
		case '42501':
			return "Vous n'avez pas le droit d'inscrire des participants.";
		default:
			return "Les participants n'ont pas pu être inscrits.";
	}
}

export async function listExternalParticipants(
	supabase: TrainingSupabaseClient,
	slotId: number
): Promise<ExternalParticipant[]> {
	const { data, error } = await formation(supabase).rpc('external_registration_list', {
		p_slot_id: slotId
	});
	if (error) {
		throw new Error(error.message);
	}
	return data ?? [];
}

/** Inscrit le lot ; renvoie le message d'erreur à afficher, ou `null`. */
export async function registerExternalParticipants(
	supabase: TrainingSupabaseClient,
	slotId: number,
	remote: boolean,
	participants: ParticipantDraft[]
): Promise<string | null> {
	const { error } = await formation(supabase).rpc('register_external_participants', {
		p_slot_id: slotId,
		p_remote: remote,
		p_participants: participants
	});
	return error ? registrationErrorMessage(error) : null;
}

export async function removeExternalParticipant(
	supabase: TrainingSupabaseClient,
	id: number
): Promise<void> {
	const { error } = await formation(supabase).from('external_registration').delete().eq('id', id);
	if (error) {
		throw new Error(error.message);
	}
}
