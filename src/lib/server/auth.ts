import type { EffectivePermission, GlobalPermission } from '@davincibot/lib';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@davincibot/database-types';

interface ProfileRow {
	username: string | null;
	avatar_url: string | null;
	role: string | null;
	permissions: GlobalPermission[] | null;
	profile_global_roles:
		| {
				role: string;
				revoked_at: string | null;
				global_roles: { permissions: GlobalPermission[] | null } | null;
		  }[]
		| null;
	member_of:
		| { role: string | null; project: { id: number; name: string; debut: string | null } | null }[]
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
	debut: string;
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
				'username, avatar_url, permissions, profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at, global_roles(permissions)), member_of!membre_projet_profile_fkey(role, project(id, name, debut))'
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
		projects: (data.member_of ?? [])
			.filter(
				(
					member
				): member is {
					role: string | null;
					project: { id: number; name: string; debut: string | null };
				} => member.project !== null
			)
			.map((member) => ({
				id: member.project.id,
				name: member.project.name,
				debut: member.project.debut ?? '0000-00-00',
				role: member.role ?? ''
			})),
		permissions,
		allProjects: null as { value: number; name: string; debut: string }[] | null
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
		//TODO: review
		userProfile.projects.push({ id: 0, name: 'Association', debut: '2014-09-01', role: '' });

		const projectsResult = (await supabase
			.from('projects')
			.select('id, name, debut')) as SupabaseQueryResult<ProjectRow[]>;

		if (!projectsResult.error) {
			userProfile.allProjects = projectsResult.data.map((project) => ({
				value: project.id,
				name: project.name,
				debut: project.debut
			}));
		}
	}

	return { userProfile, permissions };
}
