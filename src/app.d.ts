// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

type UserProject = {
	id: number;
	name: string;
	debut: string;
};

type UserProfile = {
	email: string;
	name: string;
	avatar: string;
	id: string;
	projects: UserProject[];
	role: string | null;
	permissions: string[];
	allProjects: { value: number; name: string; debut: string }[] | null;
};

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			userProfile: UserProfile | null;
			permissions: string[];
			canManageTraining: boolean;
			canAccessTraining: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
