import type { SupabaseClient, User } from '@supabase/supabase-js';

type ProfileRow = {
	username: string | null;
	avatar_url: string | null;
	role: string | null;
	permissions: string[] | null;
	member_of: { project: { id: number; name: string; debut: string | null } | null }[] | null;
};

export async function hasPermission(
	supabase: SupabaseClient,
	permission: string
): Promise<boolean> {
	const { data, error } = await supabase.rpc('has_permission', {
		p_permission: permission
	});

	if (error) return false;
	return Boolean(data);
}

export async function buildUserProfile(supabase: SupabaseClient, user: User) {
	const { data, error } = await supabase
		.from('profiles')
		.select('username, avatar_url, permissions, member_of(project(id, name, debut))')
		.eq('id', user.id)
		.single<ProfileRow>();

	if (error || !data) {
		return {
			userProfile: null,
			permissions: [] as string[]
		};
	}

	const permissions = data.permissions ?? [];
	const avatar = data.avatar_url || `https://avatar.iran.liara.run/public?username=${user.id}`;

	const userProfile = {
		email: user.email ?? '',
		name: data.username || (user.email ? (user.email.split('@')[0] ?? '') : ''),
		avatar,
		id: user.id,
		projects: (
			(data.member_of ?? []).map((member) => member.project).filter(Boolean) as {
				id: number;
				name: string;
				debut: string | null;
			}[]
		).map((project) => ({
			id: project.id,
			name: project.name,
			debut: project.debut ?? '0000-00-00'
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
		userProfile.projects.push({ id: 0, name: 'Association', debut: '2014-09-01' });

		const { data: projects, error: projectsError } = await supabase
			.from('projects')
			.select('id, name, debut');

		if (!projectsError) {
			userProfile.allProjects = (projects ?? []).map((project) => ({
				value: project.id,
				name: project.name,
				debut: project.debut
			}));
		}
	}

	return { userProfile, permissions };
}
