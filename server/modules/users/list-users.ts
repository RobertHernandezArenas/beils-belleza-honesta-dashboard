import type { UsersRepository, UserSummaryRecord } from './ports'

export interface ListUsersDeps {
	users: UsersRepository
}

export async function listUsers(
	deps: ListUsersDeps,
	{ roles }: { roles?: string[] } = {},
): Promise<UserSummaryRecord[]> {
	return await deps.users.findMany(roles)
}

