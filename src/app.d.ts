// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Database } from '@davincibot/database-types';
import type { EffectivePermission } from '@davincibot/lib';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type Campus = 'nantes' | 'paris';

interface UserProject {
	id: number;
	name: string;
	campus: Campus | null;
}

interface UserProfile {
	email: string;
	name: string;
	avatar: string;
	id: string;
	projects: UserProject[];
	permissions: EffectivePermission[];
	allProjects: { value: number; name: string; campus: Campus | null }[] | null;
}

// Le refresh token ne quitte jamais le service auth : les sites ne voient
// passer que l'access token.
interface ServerSession {
	id: string;
	access_token: string;
	expires_at: number;
	user_id: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			session: ServerSession | null;
			user: User | null;
			permissions: EffectivePermission[];
			safeGetSession: () => Promise<{ session: ServerSession | null; user: User | null }>;
		}
		interface PageData {
			session: Pick<ServerSession, 'id' | 'expires_at' | 'user_id'> | null;
			user: User | null;
			userProfile: UserProfile | null;
			permissions: EffectivePermission[];
			canManageTraining: boolean;
			canAccessTraining: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
