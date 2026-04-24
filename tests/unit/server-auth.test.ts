import { describe, expect, it, vi } from 'vitest';

import { buildUserProfile, hasPermission } from '../../src/lib/server/auth';

function createSupabaseForProfile({
	hasPermissionResult = true,
	profileData,
	profileError = null,
	projectsData = [],
	projectsError = null
}: {
	hasPermissionResult?: boolean;
	profileData?: any;
	profileError?: any;
	projectsData?: any[];
	projectsError?: any;
}) {
	const profilesChain = {
		select: vi.fn(() => profilesChain),
		eq: vi.fn(() => profilesChain),
		single: vi.fn(async () => ({ data: profileData, error: profileError }))
	};

	const projectsChain = {
		select: vi.fn(async () => ({ data: projectsData, error: projectsError }))
	};

	return {
		rpc: vi.fn(async (name: string) => {
			if (name === 'has_permission') {
				return { data: hasPermissionResult, error: null };
			}
			return { data: null, error: null };
		}),
		from: vi.fn((table: string) => {
			if (table === 'profiles') return profilesChain;
			if (table === 'projects') return projectsChain;
			throw new Error(`Unexpected table: ${table}`);
		})
	};
}

describe('server auth helpers', () => {
	it('hasPermission returns true/false based on rpc response', async () => {
		const supabaseTrue = createSupabaseForProfile({ hasPermissionResult: true });
		const supabaseFalse = {
			rpc: vi.fn(async () => ({ data: null, error: new Error('rpc error') }))
		};

		expect(await hasPermission(supabaseTrue as any, 'training.slot.read')).toBe(true);
		expect(await hasPermission(supabaseFalse as any, 'training.slot.read')).toBe(false);
	});

	it('buildUserProfile returns null profile when profile query fails', async () => {
		const supabase = createSupabaseForProfile({ profileData: null, profileError: new Error('missing') });

		const result = await buildUserProfile(supabase as any, {
			id: 'u-1',
			email: 'u-1@example.com'
		} as any);

		expect(result).toEqual({ userProfile: null, permissions: [] });
	});

	it('buildUserProfile builds profile with association and all projects when allowed', async () => {
		const supabase = createSupabaseForProfile({
			profileData: {
				username: 'Alice',
				avatar_url: null,
				permissions: ['members.profile.read.all'],
				member_of: [{ project: { id: 7, name: 'Robot', debut: null } }]
			},
			projectsData: [{ id: 1, name: 'Project A', debut: '2025-01-01' }]
		});

		const result = await buildUserProfile(supabase as any, {
			id: 'u-1',
			email: 'alice@example.com'
		} as any);

		expect(result.permissions).toEqual(['members.profile.read.all']);
		expect(result.userProfile).toMatchObject({
			name: 'Alice',
			email: 'alice@example.com',
			projects: [
				{ id: 7, name: 'Robot', debut: '0000-00-00' },
				{ id: 0, name: 'Association', debut: '2014-09-01' }
			]
		});
		expect(result.userProfile?.allProjects).toEqual([
			{ value: 1, name: 'Project A', debut: '2025-01-01' }
		]);
	});
});
