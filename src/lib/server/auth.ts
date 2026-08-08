import type { Database } from '@davincibot/database-types';
import type { EffectivePermission, GlobalPermission } from '@davincibot/lib';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface ProfileRow {
	username: string | null;
	avatar_url: string | null;
	role: string | null;
	campus: 'nantes' | 'paris' | null;
	permissions: GlobalPermission[] | null;
	profile_global_roles:
		| {
				role: string;
				revoked_at: string | null;
				global_roles: { permissions: GlobalPermission[] | null } | null;
		  }[]
		| null;
	member_of:
		| {
				role: string | null;
				revoked_at: string | null;
				project: { id: number; name: string; campus: 'nantes' | 'paris' | null } | null;
		  }[]
		| null;
}

function resolveEffectivePermissions(data: ProfileRow): EffectivePermission[] {
	const set = new Set<EffectivePermission>();
	for (const p of data.permissions ?? []) {
		set.add(p);
	}
	for (const assignment of data.profile_global_roles ?? []) {
		if (assignment.revoked_at) {
			continue;
		}
		for (const p of assignment.global_roles?.permissions ?? []) {
			set.add(p);
		}
	}
	return [...set];
}

interface ProjectRow {
	id: number;
	name: string;
	campus: 'nantes' | 'paris' | null;
}

interface SupabaseQueryResult<T> {
	data: T;
	error: unknown;
}

export async function hasPermission(
	supabase: SupabaseClient<Database>,
	permission: GlobalPermission
): Promise<boolean> {
	const result = (await supabase.rpc('has_permission', {
		p_permission: permission
	})) as SupabaseQueryResult<boolean>;

	if (result.error) {
		return false;
	}
	return result.data;
}

export async function buildUserProfile(supabase: SupabaseClient<Database>, user: User) {
	const [
		result,
		{ data: canReadOrders },
		{ data: canReadFinance },
		{ data: canReadProfiles },
		{ data: canWriteFinance },
		{ data: canUpdateProfiles },
		{ data: canReadStats },
		{ data: canManageRoles }
	] = await Promise.all([
		supabase
			.from('profiles')
			.select(
				'username, avatar_url, campus, permissions, profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at, global_roles(permissions)), member_of!membre_projet_profile_fkey(role, revoked_at, project(id, name, campus))'
			)
			.eq('id', user.id)
			.single() as unknown as Promise<SupabaseQueryResult<ProfileRow | null>>,
		supabase.rpc('has_permission', { p_permission: 'orders.read.all' }),
		supabase.rpc('has_permission', { p_permission: 'finance.read' }),
		supabase.rpc('has_permission', { p_permission: 'members.profile.read.all' }),
		supabase.rpc('has_permission', { p_permission: 'finance.write' }),
		supabase.rpc('has_permission', { p_permission: 'members.profile.update.all' }),
		supabase.rpc('has_permission', { p_permission: 'stats.read.all' }),
		supabase.rpc('has_permission', { p_permission: 'iam.roles.manage' })
	]);

	if (result.error || !result.data) {
		return {
			userProfile: null,
			permissions: [] as EffectivePermission[]
		};
	}

	const data = result.data;
	const permissions = resolveEffectivePermissions(data);
	const avatar = data.avatar_url ?? `https://avatar.iran.liara.run/public?username=${user.id}`;

	const userProfile = {
		email: user.email ?? '',
		name: data.username ?? (user.email ? (user.email.split('@')[0] ?? '') : ''),
		avatar,
		id: user.id,
		campus: data.campus,
		projects: (data.member_of ?? [])
			// Un rattachement se révoque, il ne se supprime pas : sans ce filtre un
			// ancien membre resterait rattaché à un projet qu'il a quitté.
			.filter(
				(
					member
				): member is {
					role: string | null;
					revoked_at: string | null;
					project: { id: number; name: string; campus: 'nantes' | 'paris' | null };
				} => member.project !== null && !member.revoked_at
			)
			.map((member) => ({
				id: member.project.id,
				name: member.project.name,
				campus: member.project.campus,
				role: member.role ?? ''
			})),
		permissions,
		allProjects: null as { value: number; name: string; campus: 'nantes' | 'paris' | null }[] | null
	};

	if (
		canReadOrders ||
		canReadFinance ||
		canReadProfiles ||
		canWriteFinance ||
		canUpdateProfiles ||
		canReadStats ||
		canManageRoles
	) {
		const projectsResult = (await supabase
			.from('projects')
			.select('id, name, campus')
			.is('archived_at', null)) as SupabaseQueryResult<ProjectRow[]>;

		if (!projectsResult.error) {
			userProfile.allProjects = projectsResult.data.map((project) => ({
				value: project.id,
				name: project.name,
				campus: project.campus
			}));
		}
	}

	return { userProfile, permissions };
}
