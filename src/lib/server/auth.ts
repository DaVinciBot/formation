import type { Permission } from '$lib/permissions';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface ProfileRow {
	username: string | null;
	avatar_url: string | null;
	role: string | null;
	permissions: string[] | null;
	member_of:
		| { role: string | null; project: { id: number; name: string; debut: string | null } | null }[]
		| null;
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
	permission: Permission
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
		.select('username, avatar_url, permissions, member_of(role, project(id, name, debut))')
		.eq('id', user.id)
		.single()) as SupabaseQueryResult<ProfileRow | null>;

	if (result.error || !result.data) {
		return {
			userProfile: null,
			permissions: [] as Permission[]
		};
	}

	const data = result.data;
	const permissions = (data.permissions ?? []) as Permission[];
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
		permissions.includes('projects.stats.read.all') ||
		permissions.includes('iam.permissions.read.all')
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
