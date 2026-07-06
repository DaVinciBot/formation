import type { EffectivePermission, GlobalPermission } from '$lib/permissions';
import type { SupabaseClient, User } from '@supabase/supabase-js';

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
		if (p) {
			set.add(p);
		}
	}
	for (const assignment of data.profile_global_roles ?? []) {
		if (assignment.revoked_at) {
			continue;
		}
		for (const p of assignment.global_roles?.permissions ?? []) {
			if (p) {
				set.add(p);
			}
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
	supabase: SupabaseClient,
	permission: EffectivePermission
): Promise<boolean> {
	const result = (await supabase.rpc('has_permission', {
		p_permission: permission
	})) as SupabaseQueryResult<boolean>;

	if (result.error) {
		return false;
	}
	return result.data;
}

export async function buildUserProfile(supabase: SupabaseClient, user: User) {
	const result = (await supabase
		.from('profiles')
		.select(
			'username, avatar_url, permissions, profile_global_roles(role, revoked_at, global_roles(permissions)), member_of(role, project(id, name, debut))'
		)
		.eq('id', user.id)
		.single()) as SupabaseQueryResult<ProfileRow | null>;

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
		permissions.includes('orders.read.all') ||
		permissions.includes('finance.read') ||
		permissions.includes('members.profile.read.all') ||
		permissions.includes('finance.write') ||
		permissions.includes('members.profile.update.all') ||
		permissions.includes('stats.read.all') ||
		permissions.includes('iam.roles.manage')
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
