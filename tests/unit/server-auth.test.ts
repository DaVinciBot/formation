import type { Database } from '@davincibot/database-types';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { GlobalPermission } from '@davincibot/lib';
import { buildUserProfile, hasPermission } from '../../src/lib/server/auth';

type Campus = 'nantes' | 'paris' | null;

interface ProfileFixture {
	username: string | null;
	avatar_url: string | null;
	campus: Campus;
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
				project: { id: number; name: string; campus: Campus } | null;
		  }[]
		| null;
}

interface ProjectFixture {
	id: number;
	name: string;
	campus: Campus;
}

function createSupabaseForProfile({
	hasPermissionResult = true,
	profileData,
	profileError = null,
	projectsData = [],
	projectsError = null
}: {
	hasPermissionResult?: boolean;
	profileData?: ProfileFixture | null;
	profileError?: Error | null;
	projectsData?: ProjectFixture[];
	projectsError?: Error | null;
}) {
	const profilesChain = {
		select: vi.fn(() => profilesChain),
		eq: vi.fn(() => profilesChain),
		single: vi.fn(() => Promise.resolve({ data: profileData, error: profileError }))
	};

	// Les projets archivés sont exclus côté requête : le mock doit donc exposer
	// `.is()` après `.select()`.
	const projectsChain = {
		select: vi.fn(() => projectsChain),
		is: vi.fn(() => Promise.resolve({ data: projectsData, error: projectsError }))
	};

	const supabase = {
		rpc: vi.fn((name: string) => {
			if (name === 'has_permission') {
				return Promise.resolve({ data: hasPermissionResult, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		}),
		from: vi.fn((table: string) => {
			if (table === 'profiles') {
				return profilesChain;
			}
			if (table === 'projects') {
				return projectsChain;
			}
			throw new Error(`Unexpected table: ${table}`);
		})
	};

	return { supabase, profilesChain, projectsChain };
}

describe('server auth helpers', () => {
	it('hasPermission returns true/false based on rpc response', async () => {
		const { supabase: supabaseTrue } = createSupabaseForProfile({ hasPermissionResult: true });
		const supabaseFalse = {
			rpc: vi.fn(() => Promise.resolve({ data: null, error: new Error('rpc error') }))
		};

		expect(
			await hasPermission(supabaseTrue as unknown as SupabaseClient<Database>, 'training.slot.read')
		).toBe(true);
		expect(
			await hasPermission(
				supabaseFalse as unknown as SupabaseClient<Database>,
				'training.slot.read'
			)
		).toBe(false);
	});

	it('buildUserProfile returns null profile when profile query fails', async () => {
		const { supabase } = createSupabaseForProfile({
			profileData: null,
			profileError: new Error('missing')
		});

		const result = await buildUserProfile(
			supabase as unknown as SupabaseClient<Database>,
			{
				id: 'u-1',
				email: 'u-1@example.com'
			} as User
		);

		expect(result).toEqual({ userProfile: null, permissions: [] });
	});

	it('buildUserProfile merges role permissions and skips revoked memberships', async () => {
		const { supabase, projectsChain } = createSupabaseForProfile({
			profileData: {
				username: 'Alice',
				avatar_url: null,
				campus: 'nantes',
				permissions: ['members.profile.read.all'],
				profile_global_roles: [
					{ role: 'tresorier', revoked_at: null, global_roles: { permissions: ['finance.read'] } },
					{
						role: 'ancien',
						revoked_at: '2025-01-01',
						global_roles: { permissions: ['iam.roles.manage'] }
					}
				],
				member_of: [
					{ role: 'membre', revoked_at: null, project: { id: 7, name: 'Robot', campus: 'nantes' } },
					{
						role: 'membre',
						revoked_at: '2025-01-01',
						project: { id: 8, name: 'Ancien projet', campus: 'nantes' }
					}
				]
			},
			projectsData: [{ id: 1, name: 'Project A', campus: 'paris' }]
		});

		const result = await buildUserProfile(
			supabase as unknown as SupabaseClient<Database>,
			{
				id: 'u-1',
				email: 'alice@example.com'
			} as User
		);

		expect(result.permissions).toEqual(['members.profile.read.all', 'finance.read']);
		expect(result.userProfile).toMatchObject({
			name: 'Alice',
			email: 'alice@example.com',
			campus: 'nantes',
			projects: [{ id: 7, name: 'Robot', campus: 'nantes', role: 'membre' }]
		});
		expect(result.userProfile?.allProjects).toEqual([
			{ value: 1, name: 'Project A', campus: 'paris' }
		]);
		expect(projectsChain.is).toHaveBeenCalledWith('archived_at', null);
	});
});
