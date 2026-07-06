// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { EffectivePermission } from '$lib/permissions';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

interface UserProject {
	id: number;
	name: string;
	debut: string;
}

interface UserProfile {
	email: string;
	name: string;
	avatar: string;
	id: string;
	projects: UserProject[];
	permissions: EffectivePermission[];
	allProjects: { value: number; name: string; debut: string }[] | null;
}

interface ServerSession {
	id: string;
	access_token: string;
	refresh_token: string;
	expires_at: number;
	user_id: string;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			session: ServerSession | null;
			user: User | null;
			permissions: EffectivePermission[];
			safeGetSession: () => Promise<{ session: ServerSession | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
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
